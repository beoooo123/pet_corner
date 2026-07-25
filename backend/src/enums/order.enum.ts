export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY'
}
export enum OrderStatus {
  PENDING = 'PENDING', // Đơn hàng đang chờ xử lý
  PROCESSING = 'PROCESSING', // Đang xử lý
  SHIPPING = 'SHIPPING', // Đang giao hàng
  DELIVERED = 'DELIVERED', // Đã nhận hàng
  CANCELLED = 'CANCELLED' // Đã hủy
}
