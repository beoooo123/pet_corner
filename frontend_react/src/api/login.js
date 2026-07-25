import api from "./axios";

const loginApi = {
  login: async (credentials) => {
    try {
      const response = await api.post("/v1/auth/login", credentials); 
      return {
        data: response.data, 
      };
    } catch (error) {
      throw error.response?.data || { message: "Đăng nhập thất bại" };
    }
  },

  logout: async () => {
    try {
      const response = await api.post("/v1/auth/logout");
      return {
        data: response.data, 
      };
      
    } catch (error) {
      throw error.response?.data || { message: "Đăng xuất thất bại" };
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post("/v1/auth/refreshtoken");
      return {
        data: response.data, 
      };
    } catch (error) {
      throw error.response?.data || { message: "Làm mới token thất bại" };
    }
  },
  authCheck: async (token) => {
    try {
      const response = await api.get("/v1/auth/authCheck", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { data: response.data };
    } catch (error) {
      throw error.response?.data || { message: "Xác thực thất bại" };
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post("/v1/auth/forgotPassword", { email });
      return {
        data: response.data, 
      };
    } catch (error) {
      throw error.response?.data || { message: "Không thể gửi yêu cầu quên mật khẩu" };
    }
  },

  resetPassword: async (resetData) => {
    try {
      const response = await api.post("/v1/auth/resetPassword", resetData); 
      return {
        data: response.data, 
      };
    } catch (error) {
      throw error.response?.data || { message: "Không thể đặt lại mật khẩu" };
    }
  },

  googleLogin: async (idToken) => {
    try {
      const response = await api.post("/v1/auth/google", { idToken });
      return {
        data: response.data, 
      };
    } catch (error) {
      throw error.response?.data || { message: "Đăng nhập Google thất bại" };
    }
  },
};

export default loginApi;