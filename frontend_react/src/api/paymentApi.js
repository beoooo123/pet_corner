import api from "./axios";

const paymentApi = {
  create: async (data) => {
    const response = await api.post("/v1/create_payment", data);
    return response.data;
  },
  verifyPayment: async (queryParams) => {
    const response = await api.get("/v1/verify_payment", {
      params: queryParams,
    });
    return response.data;
  },
  updateOrder: async (orderId, updateData) => {
    const response = await api.patch(
      `/api/orders/status/${orderId}`,
      updateData
    );
    return response.data;
  },
};

export default paymentApi;
