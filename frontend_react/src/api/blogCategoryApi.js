import api from "./axios";
const blogCategoryApi = {
  getCategoriesActive: async () => {
    const response = await api.get("/v1/blogcategories/status/active");
    return {
      data: response.data,
    };
  },
  getAll: async () => {
    const response = await api.get("/v1/blogcategories");
    return {
      data: response.data,
    };
  },
  create: async (data) => {
    const response = await api.post("/v1/blogcategories", data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/v1/blogcategories/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/v1/blogcategories/${id}`);
    return response.data;
  },
};
export default blogCategoryApi;
