import { createSlice } from "@reduxjs/toolkit";

// Lấy userId từ localStorage, đảm bảo trả về chuỗi hoặc null
const getUserIdFromLocal = () => {
  const userId = localStorage.getItem("accountID");
  if (!userId) return null;

  try {
    const parsed = JSON.parse(userId);
    if (Array.isArray(parsed)) {
      return parsed[0];
    }
    return parsed;
  } catch (e) {
    return userId;
  }
};

// Lấy toàn bộ cart từ localStorage
const getAllCartsFromLocal = (): Record<
  string,
  { id: string; quantity: number }[]
> => {
  const savedCarts = localStorage.getItem("carts");
  return savedCarts ? JSON.parse(savedCarts) : {};
};

// Lấy cart của userId hoặc guest
const getCartForUser = (userId: string | null) => {
  const allCarts = getAllCartsFromLocal();
  return allCarts[userId || "guest"] || [];
};

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: getCartForUser(getUserIdFromLocal()),
    userId: getUserIdFromLocal(),
  },
  reducers: {
    setUserId: (state, action) => {
      const newUserId = action.payload;
      state.userId = newUserId;
      if (newUserId) {
        localStorage.setItem("accountID", newUserId);
        // Khi đăng nhập, chuyển cart của guest sang user nếu có
        const guestCart = getCartForUser("guest");
        if (guestCart.length > 0) {
          state.items = [...guestCart];
          saveCartsToLocal(newUserId, state.items);
          // Xóa cart của guest sau khi chuyển
          const allCarts = getAllCartsFromLocal();
          delete allCarts["guest"];
          localStorage.setItem("carts", JSON.stringify(allCarts));
        } else {
          state.items = getCartForUser(newUserId);
        }
      } else {
        localStorage.removeItem("accountID");
        state.userId = null;
        state.items = getCartForUser("guest");
      }
    },
    addToCart: (state, action) => {
      const userId = state.userId || "guest";
      const { item, quantity } = action.payload;
      const existingItem = state.items.find(
        (cartItem) => cartItem.id === item.id
      );
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          ...item,
          quantity: Number(quantity),
          stockQuantity: Number(item.stockQuantity),
        });
      }
      saveCartsToLocal(userId, state.items);
    },
    increaseQuantity: (state, action) => {
      const userId = state.userId || "guest";
      const item = state.items.find(
        (cartItem) => cartItem.id === action.payload.id
      );
      if (item) {
        item.quantity += 1;
        saveCartsToLocal(userId, state.items);
      }
    },
    decreaseQuantity: (state, action) => {
      const userId = state.userId || "guest";
      const item = state.items.find(
        (cartItem) => cartItem.id === action.payload.id
      );
      if (item && item.quantity > 1) {
        item.quantity -= 1;
        saveCartsToLocal(userId, state.items);
      }
    },
    removeProduct: (state, action) => {
      const userId = state.userId || "guest";
      state.items = state.items.filter(
        (cartItem) => cartItem.id !== action.payload.id
      );
      saveCartsToLocal(userId, state.items);
    },
    clearProduct: (state) => {
      const userId = state.userId || "guest";
      state.items = [];
      const allCarts = getAllCartsFromLocal();
      delete allCarts[userId];
      if (Object.keys(allCarts).length === 0) {
        localStorage.removeItem("carts");
      } else {
        localStorage.setItem("carts", JSON.stringify(allCarts));
      }
    },
  },
});

const saveCartsToLocal = (userId: string, items: any[]) => {
  const allCarts = getAllCartsFromLocal();
  allCarts[userId] = items;

  const hasItems = Object.values(allCarts).some(
    (cart: { id: string; quantity: number }[]) => cart.length > 0
  );
  if (!hasItems) {
    localStorage.removeItem("carts");
  } else {
    localStorage.setItem("carts", JSON.stringify(allCarts));
  }
};

export const {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  removeProduct,
  clearProduct,
  setUserId,
} = cartSlice.actions;
export default cartSlice;
