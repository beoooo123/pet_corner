const clearLocalStorageExceptCarts = () => {
  // Lấy dữ liệu carts trước khi xóa
  const carts = localStorage.getItem("carts");

  // Xóa toàn bộ localStorage
  localStorage.clear();

  // Lưu lại carts nếu có
  if (carts) {
    localStorage.setItem("carts", carts);
  }
};

export default clearLocalStorageExceptCarts;
