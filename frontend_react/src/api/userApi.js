import api from "./axios";

const userApi = {
  getAllUsers: async () => {
    const response = await api.get("/v1/users");
    return {
      data: response.data,
    };
  },
  getNewUsers: async () => {
    const response = await api.get("/v1/users/new");
    console.log(response);

    return {
      data: response.data,
    };
  },
  getLoyalUsers: async () => {
    const response = await api.get("/v1/users/loyal");
    console.log(response);

    return {
      data: response.data,
    };
  },

  getUserById: async (id) => {
    const response = await api.get(`/v1/users/${id}`);
    return {
      data: response.data,
    };
  },
  update: async (id, data) => {
    console.log("Data being sent to update:", data);
    const response = await api.patch(`/v1/users/${id}`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log("Update response:", response.data);
    return {
      data: response.data,
    };
  },
  create: async (data) => {
    const response = await api.patch("/v1/users", data);
    return {
      data: response.data,
    };
  },
  addAddress: async (id, address) => {
    const response = await api.post(`/v1/users/${id}/address`, address);
    return {
      data: response.data,
    };
  },
  updateAddress: async (id, index, address) => {
    const response = await api.patch(
      `/v1/users/${id}/address/${index}`,
      address
    );
    return {
      data: response.data,
    };
  },
  deleteAddress: async (id, index) => {
    const response = await api.delete(`/v1/users/${id}/address/${index}`);
    return {
      data: response.data,
    };
  },
  changePassword: async (id, currentPassword, newPassword) => {
    const response = await api.patch(`/v1/users/${id}/change-password`, {
      currentPassword,
      newPassword,
    });
    return {
      data: response.data,
    };
  },
  setDefaultAddress: async (id, index) => {
    const response = await api.patch(`/v1/users/${id}/set-default/${index}`);
    return {
      data: response.data,
    };
  },
};

export default userApi;
