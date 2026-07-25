import api from "./axios";
const categoryApi = {
  getCategoriesActive: async () => {
    const response = await api.get("/v1/categories/status/active");
    return {
      data: response.data,
    };
  },
  getAll: async () => {
    const response = await api.get("/v1/categories");
    return {
      data: response.data,
    };
  },
  create: async (data) => {
    const response = await api.post("/v1/categories", data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/v1/categories/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/v1/categories/${id}`);
    return response.data;
  },
};
export default categoryApi;
