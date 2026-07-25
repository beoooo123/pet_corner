import { configureStore } from "@reduxjs/toolkit";
import cartSlice from "./slices/cartslice";

export const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
  },
});

// Định nghĩa type cho RootState và AppDispatch để dùng trong TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;