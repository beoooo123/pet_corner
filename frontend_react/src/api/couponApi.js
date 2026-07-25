import api from "./axios";

const couponApi = {
  getAllCoupons: async () => {
    const response = await api.get("/v1/coupons");
    return { data: response.data };
  },
  createCoupon: async (data) => {
    const response = await api.post("/v1/coupons", data);
    return response.data;
  },
  updateCoupon: async (id, data) => {
    const response = await api.patch(`/v1/coupons/${id}`, data);
    return response.data;
  },
  deleteCoupon: async (id) => {
    const response = await api.delete(`/v1/coupons/${id}`);
    return response.data;
  },
};

export default couponApi;
