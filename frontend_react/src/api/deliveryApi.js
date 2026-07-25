import api from "./axios";

const deliveryApi = {
  getAllDelivery: async () => {
    const response = await api.get("/v1/delivery");
    return { data: response.data };
  },
  create: async (data) => {
    const response = await api.post("/v1/delivery", data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/v1/delivery/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/v1/delivery/${id}`);
    return response.data;
  },
};

export default deliveryApi;