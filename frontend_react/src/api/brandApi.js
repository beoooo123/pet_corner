import api from "./axios";
const brandApi = {
  getAll: async () => {
    const response = await api.get("/v1/brands");
    return {
      data: response.data,
    };
  },
  create: async (data) => {
    const response = await api.post("/v1/brands", data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/v1/brands/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/v1/brands/${id}`);
    return response.data;
  },
};
export default brandApi;
