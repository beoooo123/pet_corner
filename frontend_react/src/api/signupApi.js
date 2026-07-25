import api from "./axios";

const signupApi = {
  signup: async (userData) => {
    try {
      const response = await api.post("/v1/auth/signup", userData); 
      return {
        data: response.data, 
      };
    } catch (error) {
      throw error.response?.data || { message: "Đăng ký thất bại" };
    }
  },

  googleSignup: async (idToken) => {
    try {
      const response = await api.post("/v1/auth/google", { idToken });
      return {
        data: response.data, 
      };
    } catch (error) {
      throw error.response?.data || { message: "Đăng ký Google thất bại" };
    }
  },
  verifyOtp: async (email, otp) => {
    try {
      const response = await api.post("/v1/auth/verify-otp", { email, otp });
      return {
        data: response.data, 
      };
    } catch (error) {
      throw error.response?.data || { message: "Xác thực OTP thất bại" };
    }
  },
};

export default signupApi;