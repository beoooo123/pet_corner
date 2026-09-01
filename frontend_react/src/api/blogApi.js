import api from "./axios";

const blogApi = {
  getAllBlogs: async () => {
    const response = await api.get("/v1/blogs");
    return {
      data: response.data,
    };
  },
  getBlogActive: async () => {
    const response = await api.get("/v1/blogs/status/active");
    return {
      data: response.data,
    };
  },
  getBlogById: async (id) => {
    const response = await api.get(`/v1/blogs/${id}`);
    return {
      data: response.data,
    };
  },
  create: async (formData) => {
    const response = await api.post("/v1/blogs", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  update: async (id, formData) => {
    const response = await api.patch(`/v1/blogs/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  toggleStatus: async (id, status) => {
    const response = await api.patch(`/v1/blogs/status/${id}?status=${status}`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/v1/blogs/${id}`);
    return response.data;
  },
};

export default blogApi;
