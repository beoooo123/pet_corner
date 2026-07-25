import api from "./axios";

const paymentTypeApi = {
  getAllPayment: async () => {
    const response = await api.get("/v1/payments");
    return { data: response.data };
  },
  create: async (data) => {
    const response = await api.post("/v1/payments", data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/v1/payments/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/v1/payments/${id}`);
    return response.data;
  },
};

export default paymentTypeApi;