import api from "./axios";

const bannerApi = {
  getAll: async () => {
    const response = await api.get("/v1/banners");
    return {
      data: response.data,
    };
  },
  getActive: async () => {
    const response = await api.get("/v1/banners/status/active");
    return {
      data: response.data,
    };
  },
  getById: async (id) => {
    const response = await api.get(`/v1/banners/${id}`);
    return {
      data: response.data,
    };
  },
  create: async (formData) => {
    const response = await api.post("/v1/banners", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  update: async (id, formData) => {
    const response = await api.patch(`/v1/banners/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  toggleStatus: async (id, status) => {
    const response = await api.patch(`/v1/banners/status/${id}?status=${status}`);
    return response.data;
  },
  reorder: async (orders) => {
    const response = await api.patch("/v1/banners/reorder", { orders });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/v1/banners/${id}`);
    return response.data;
  },
};

export default bannerApi;
