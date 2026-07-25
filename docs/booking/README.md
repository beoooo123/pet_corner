# Đặt lịch spa (Booking) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Đây là 1 trong những luồng phức tạp nhất của hệ thống — vì 1 lượt đặt lịch liên quan tới 3 "món" cùng lúc: đơn hàng (Order), chi tiết đặt lịch (OrderDetail), và dịch vụ (Service). Đọc chậm, đọc hết Phần 1-2 trước khi vào chi tiết. Nếu chưa đọc `docs/banner/README.md`, nên đọc Phần 1 của file đó trước (giải thích controller/router/model là gì).

## Phần 1 — Vài khái niệm riêng của booking

| Khái niệm | Giải thích đơn giản |
|---|---|
| **Booking / lịch hẹn** | 1 lượt khách mang thú cưng tới dùng dịch vụ (tắm, spa...) vào 1 ngày giờ cụ thể |
| **Order (đơn hàng)** | "Cái vỏ" chung — hệ thống dùng CHUNG 1 model Order cho cả đơn mua sản phẩm và đơn đặt lịch. Đặt lịch cũng tạo ra 1 Order, chỉ khác là nó có thêm trạng thái `bookingStatus` |
| **OrderDetail (chi tiết đơn)** | "Cái ruột" — với booking, mỗi con vật là 1 OrderDetail riêng (đặt lịch cho 2 con mèo trong 1 lần = 1 Order + 2 OrderDetail) |
| **Service (dịch vụ)** | Loại dịch vụ khách chọn (tắm, cắt tỉa lông...), có tên, giá, thời lượng |
| **Slot (khung giờ)** | 1 khoảng giờ cố định trong ngày (8h, 9h, 10h...) mà khách có thể chọn đặt |

## Phần 2 — Sơ đồ tổng thể

```
Khách điền form đặt lịch → tạo 1 Order + N OrderDetail (N = số con vật)
                                        │
                            Admin xem danh sách, đổi trạng thái tay
                     PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
                                        │              (hoặc CANCELLED bất kỳ lúc nào trước COMPLETED)
                     Có 1 "người dọn dẹp" tự động (chạy mỗi 1 phút):
                     lịch nào quá giờ hẹn 15 phút mà chưa xử lý → tự CANCELLED
```

## Phần 3 — Đi từng bước thật

### Bước 1 — Khách đặt lịch

File: `frontend_react/src/pages/services/services.tsx`. Khách nhập thông tin liên hệ, chọn dịch vụ + ngày + giờ cho từng con vật (có thể đặt nhiều con 1 lần), hệ thống gọi `GET /orders/check/available-slots` trước để biết giờ nào còn chỗ (mỗi giờ tối đa 5 lượt, tính theo `getAvailableSlots` trong `backend/src/controllers/order.controllers.ts`), rồi gửi `POST /v1/orders` (`orderApi.create()`).

### Bước 2 — Backend tạo Order + OrderDetail

Controller: `createOrderAfterPayment` trong `backend/src/controllers/order.controllers.ts`. Tạo 1 `Order` với `bookingStatus: CONFIRMED` (mặc định, vì không cần thanh toán trước — xem Phần 5), và với MỖI con vật trong danh sách, tạo 1 `OrderDetail` (model `backend/src/models/orderdetail.model.ts`):

```ts
orderId, serviceId, quantity, booking_date, petName, petType   // các field chính cho booking
```

Giải thích field:
- `booking_date`: ngày + giờ hẹn (lưu theo giờ UTC, được đổi từ giờ Việt Nam lúc ghi vào).
- `petName`/`petType`: tên và loại con vật (chó/mèo...).
- `petWeight`: cân nặng thật, chỉ được điền lúc BẮT ĐẦU dịch vụ (Bước 4), không phải lúc đặt lịch.
- `realPrice`: giá THẬT tính theo cân nặng thật (tra theo bảng giá cố định), khác với giá ước tính hiển thị lúc đặt lịch.

### Bước 3 — Admin xử lý lịch hẹn

File: `frontend_react/src/admin/booking/booking.tsx`. Admin thấy danh sách tất cả booking (`GET /ordersDetail/allBookings`), với các nút hành động theo đúng trạng thái hiện tại — không thể nhảy cóc trạng thái (áp dụng ở backend, hàm `changeBookingStatus`, `backend/src/controllers/orderDetail.controllers.ts:325`):

```
PENDING → CONFIRMED hoặc CANCELLED
CONFIRMED → IN_PROGRESS hoặc CANCELLED
IN_PROGRESS → COMPLETED
COMPLETED / CANCELLED → không đổi được nữa (trạng thái cuối)
```

### Bước 4 — Bắt đầu dịch vụ (cân thật, tính giá thật)

Khi tới giờ hẹn, admin bấm "Bắt đầu" (chỉ hiện khi `CONFIRMED` và đã tới giờ) → nhập cân nặng thật con vật → gọi `PATCH /v1/realPrice` để tính `realPrice` theo bảng giá cân nặng, rồi gọi `changeBookingStatus` chuyển sang `IN_PROGRESS`. Xong dịch vụ, admin bấm "Hoàn thành" → chuyển `COMPLETED`, hệ thống tự gửi email báo hoàn thành cho khách (`sendBookingEmail.ts`).

### Bước 5 — Tự động huỷ lịch quá giờ

File: `backend/src/controllers/orderDetail.controllers.ts`, hàm `cancelOverdueBookings`, được khởi động 1 lần lúc server chạy (`backend/src/index.ts`, gọi `cancelOverdueBookings()` ngay sau khi kết nối DB thành công). Đây không phải chạy theo request của ai — nó tự chạy lặp lại mãi, mỗi 1 phút 1 lần:

```ts
schedule.scheduleJob('*/1 * * * *', async () => {
  const overdueBookings = await orderDetailModel
    .find({ serviceId: { $ne: null }, booking_date: { $ne: null } })
    .populate('orderId');

  for (const booking of overdueBookings) {
    // bỏ qua nếu đã CANCELLED/IN_PROGRESS/COMPLETED
    // còn lại: nếu giờ hiện tại đã qua giờ hẹn + 15 phút → tự chuyển CANCELLED
  }
});
```
Ví như 1 nhân viên đi kiểm tra sổ đặt lịch mỗi phút 1 lần, thấy lịch nào trễ quá 15 phút mà chưa ai xử lý thì tự gạch huỷ.

## Phần 4 — Booking KHÔNG liên quan tới thanh toán VNPay

Khác với đơn mua sản phẩm, luồng đặt lịch hiện tại **không có bước thanh toán** — `payment_typeID` luôn được gửi là `null` lúc tạo booking, và không có controller nào của booking đụng tới `payment.controllers.ts`/VNPay. Đặt lịch xong là xác nhận ngay, tiền trả trực tiếp (mặt) khi tới nơi dùng dịch vụ.

## Phần 5 — Các vấn đề đã biết, CHƯA xử lý (ghi lại để biết, không phải đã sửa)

- Vài route dùng để admin thay đổi dữ liệu (`PATCH /bookings/status`, `PATCH /realPrice`, `PATCH /updateBooking`) hiện **không yêu cầu đăng nhập** ở backend (`backend/src/routes/orderDetail.routes.ts`) — về lý thuyết, ai biết đúng địa chỉ API đều gọi được trực tiếp, không cần là admin. Chưa gây sự cố nào được ghi nhận, nhưng nên thêm `verifyToken`/`requireAdmin` khi có thời gian.
- Việc kiểm tra "còn chỗ trống giờ này không" (`getAvailableSlots`) chỉ được gọi để HIỂN THỊ cho khách biết, chưa được kiểm tra lại 1 lần nữa ngay trước khi lưu booking ở backend — nếu 2 khách bấm đặt cùng lúc 1 giờ đã gần đầy chỗ, có thể xảy ra đặt vượt quá 5 lượt/giờ.
- Có 1 route đặt tên nhầm: `GET /cancelled-bookings` bị gắn với hàm `cancelBooking` (hàm này cần dữ liệu gửi kèm theo kiểu POST, không hợp với GET) — route này không được frontend gọi tới, coi như code chưa dùng.
- Có 1 model riêng tên `booking.model.ts` (`Booking`) không còn được dùng thật — trạng thái booking thật nằm ở field `bookingStatus` trên model `Order`, không phải model này. Có thể xoá sau khi xác nhận chắc không còn chỗ nào cần.

## Phần 6 — Bảng tra cứu nhanh

| Muốn làm gì | Mở file |
|---|---|
| Đổi field lưu trong 1 lượt đặt lịch | `backend/src/models/orderdetail.model.ts` |
| Đổi logic tạo booking khi khách đặt | `backend/src/controllers/order.controllers.ts` (hàm `createOrderAfterPayment`) |
| Đổi quy tắc chuyển trạng thái booking | `backend/src/controllers/orderDetail.controllers.ts` (hàm `changeBookingStatus`) |
| Đổi thời gian/quy tắc tự huỷ lịch quá giờ | `backend/src/controllers/orderDetail.controllers.ts` (hàm `cancelOverdueBookings`) |
| Đổi cách tính giá theo cân nặng thật | `backend/src/controllers/orderDetail.controllers.ts` (hàm `updateRealPrice`) + bảng giá `frontend_react/src/.../priceData.ts` |
| Đổi form đặt lịch cho khách | `frontend_react/src/pages/services/services.tsx` |
| Đổi trang quản lý booking cho admin | `frontend_react/src/admin/booking/booking.tsx` |
| Đổi số lượt tối đa/giờ, giờ nào mở đặt | `backend/src/controllers/order.controllers.ts` (hàm `getAvailableSlots`) |

## Phần 7 — Tóm tắt nhanh

```
services.tsx (khách chọn dịch vụ+giờ) → orderApi.create() → POST /orders
  → createOrderAfterPayment → tạo Order (bookingStatus=CONFIRMED) + OrderDetail mỗi con vật
                                                │
booking.tsx (admin) → changeBookingStatus → CONFIRMED → IN_PROGRESS → COMPLETED
                                                │
        (chạy ngầm mỗi 1 phút, độc lập, không cần ai bấm gì)
        cancelOverdueBookings → quá giờ hẹn 15 phút mà chưa xử lý → CANCELLED
```

1. **services.tsx** — khách điền form, chọn dịch vụ/ngày/giờ cho từng con vật.
2. **createOrderAfterPayment** — tạo 1 Order (vỏ chung) + 1 OrderDetail cho mỗi con vật (ruột chi tiết).
3. **booking.tsx (admin)** — thấy danh sách, đổi trạng thái theo đúng thứ tự cho phép.
4. **cancelOverdueBookings** — chạy nền mỗi phút, tự huỷ lịch bị bỏ quên quá 15 phút.
5. Booking không đụng tới VNPay — trả tiền mặt trực tiếp khi tới nơi.
