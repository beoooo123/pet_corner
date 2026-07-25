import api from "./axios";
const orderApi = {
  getAll: async () => {
    const response = await api.get("/v1/orders");
    return {
      data: response.data,
    };
  },
  getPendingOrders: async () => {
    const response = await api.get("/v1/pendingOrders");
    return {
      data: response.data,
    };
  },
  getAvailableSlots: async (date) => {
    try {
      const response = await api.get(
        `/v1/orders/check/available-slots?date=${date}`
      );
      console.log("API getAvailableSlots response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "API getAvailableSlots error:",
        error.response?.data || error
      );
      throw error;
    }
  },
  create: async (data) => {
    const response = await api.post("/v1/orders", data);
    return response.data;
  },
  updateStatus: async (id, data) => {
    const response = await api.patch(`/v1/orders/${id}`, data);
    return response.data;
  },
  updatePaymentStatus: async (id, data) => {
    const response = await api.patch(`/v1/orders/payment-status/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/v1/orders/${id}`);
    return response.data;
  },
  updateOrderStatus: async (id, status) => {
    const response = await api.patch(`/v1/orders/status/${id}`, {status} );
    return response.data;
  },
  cancelBooking: async (orderId, orderDetailId) => {
      const response = await api.post("/v1/orders/cancel-booking", {
        orderId,
        orderDetailId,
      });
      return response.data;
  },
};
export default orderApi;
