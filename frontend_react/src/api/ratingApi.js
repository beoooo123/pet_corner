import api from "./axios";

const ratingApi = {
  createRating: async (data) => {
    try {
      const response = await api.post("/v1/ratings", data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error creating product:", error.response?.data || error);
      throw error;
    }
  },
  getRatingsByProductId: async (productId) => {
    try {
      const response = await api.get(`/v1/ratings/${productId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching ratings:", error.response?.data || error);
      throw error;
    }
  },
  getRatingsByUserId: async (userId) => {
    try {
      const response = await api.get(`/v1/ratings/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching ratings:", error.response?.data || error);
      throw error;
    }
  },
  likeRating: async (ratingId) => {
    try {
      const response = await api.patch(`/v1/ratings/likes/${ratingId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching ratings:", error.response?.data || error);
      throw error;
    }
  },
};

export default ratingApi;
