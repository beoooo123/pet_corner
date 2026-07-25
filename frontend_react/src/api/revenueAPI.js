import api from './axios';

const revenueApi = {
  getDetails: async (params) => {
    try {
      const response = await api.get('/v1/revenue', { params }); 
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy chi tiết doanh thu');
    }
  },
};

export default revenueApi;
