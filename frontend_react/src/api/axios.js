import axios from "axios";
import ENV_VARS from "../../config";
import loginApi from "./login"; // Import API login để gọi refreshToken

const api = axios.create({
  baseURL: ENV_VARS.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Kiểm tra mã lỗi từ server
    const errorCode = error.response?.data?.message;
    console.log(errorCode, "errorCode");
    const isTokenExpired = errorCode === "Token expired"; // Giả sử server trả về code này

    // Chỉ refresh token nếu lỗi là do token hết hạn
    if (
      error.response?.status === 401 &&
      isTokenExpired &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const response = await loginApi.refreshToken();
        const newAccessToken = response.data.newAccessToken;

        localStorage.setItem("accessToken", newAccessToken);
        api.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${newAccessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
