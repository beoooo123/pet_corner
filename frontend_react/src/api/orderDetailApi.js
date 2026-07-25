import api from "./axios";

const orderDetailApi = {
  getBookingsByUserId: async (userId) => {
    const response = await api.get(
      `/v1/ordersDetail/bookings?userId=${userId}`
    );
    return response.data;
  },
  
  getAllBookings: async () => {
    const response = await api.get("/v1/ordersDetail/allBookings");
    return response.data;
  },
  getOrderByUserId: async (userId) => {
    const response = await api.get(`/v1/getOrderByUserId?userId=${userId}`);
    return { data: response.data };
  },

  getDetailBooking: async (userId) => {
    const response = await api.get(`/v1/getDetailBooking?userId=${userId}`);
    return { data: response.data };
  },


  changeBookingStatus: async (data) => {
    try {
      console.log("Actual body sent to /v1/bookings/status:", {
        orderId: data.orderId,
        bookingStatus: data.bookingStatus,
      });
      const response = await api.patch("/v1/bookings/status", {
        orderId: data.orderId,
        bookingStatus: data.bookingStatus,
      }, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Lỗi khi gọi API changeBookingStatus:", error.response?.data || error.message);
      throw error;
    }
  },
  cancelBooking: async (orderId, orderDetailId) => {
    const response = await api.post('/v1/orders/cancel-booking', {
      orderId,
      orderDetailId,
    });
    return response.data;
  },
  getCancelled: async (orderId, orderDetailId) => {
    const response = await api.get('/v1/getCancelled', {
      orderId,
      orderDetailId,
    });
    return response.data;
  },
  realPrice: async (orderId, petWeight, petType, serviceName) => {
    try {
      const response = await api.patch("/v1/realPrice", {
        orderId,
        petWeight,
        petType,
        serviceName,
      });
      return response.data;
    } catch (error) {
      console.error("Lỗi khi gọi API realPrice:", error);
      throw error; 
    }
  },
  updateBooking: async (data) => {
    try {
      const response = await api.patch('/v1/updateBooking', data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi gọi API chỉnh sửa booking:', error);
      throw error;
    }
  },
  getOrderByOrderId: async (orderId) => {
    try {
      const response = await api.get(`/v1/order-details/${orderId}`);
      return response.data; 
    } catch (error) {
      console.error('Error fetching order details:', error.response?.data || error.message);
      throw error; 
    }
  },
};

export default orderDetailApi;
