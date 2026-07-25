# Thanh toán VNPay — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích luồng thanh toán VNPay hiện tại, SAU khi đã vá 1 lỗ hổng bảo mật thật (xem Phần 4). Cách đọc giống `docs/banner/README.md` — nếu chưa đọc file đó, nên đọc Phần 1 của nó trước để hiểu các từ như "controller", "router", "model".

## Phần 1 — Tóm tắt VNPay là gì

VNPay là 1 dịch vụ bên ngoài (không phải code của mình) đứng ra thu tiền hộ — giống việc thuê 1 quầy thu ngân ở ngoài, khách đưa tiền cho quầy đó, quầy đó xong việc thì báo lại cho mình "khách đã trả tiền rồi". Vì tiền không đi qua tay mình trực tiếp, mình phải TIN vào lời báo lại đó — và đây chính là điểm phải cẩn thận: phải có cách xác minh lời báo đó có phải thật từ VNPay hay không, không thể tin mù.

## Phần 2 — Sơ đồ tổng thể

```
Khách bấm "Thanh toán" → web mình tạo 1 đường link đặc biệt (có "chữ ký" riêng)
→ đưa khách qua trang VNPay → khách trả tiền thật trên trang VNPay
→ VNPay đưa khách quay lại web mình (kèm "chữ ký" xác nhận)
→ web mình PHẢI tự kiểm tra lại chữ ký đó trước khi tin là đã trả tiền
```

## Phần 3 — Đi từng bước thật

### Bước 1 — Tạo đường link thanh toán

File: `frontend_react/src/pages/payment/payment.tsx` → gọi `paymentApi.create(...)` → `POST /v1/create_payment` → `backend/src/controllers/payment.controllers.ts`, hàm `createPayment`.

Hàm này gom các thông tin (mã đơn hàng, số tiền, ngày giờ...) thành 1 object `vnp_Params`, sắp xếp key theo thứ tự chữ cái (`sortObject`), rồi tính ra 1 "chữ ký" (gọi là `vnp_SecureHash`) bằng công thức HMAC-SHA512 + 1 chuỗi bí mật (`secretKey`, lưu trong `.env`, KHÔNG BAO GIỜ gửi ra ngoài):

```ts
const signData = qs.stringify(vnp_Params, { encode: false });
const hmac = crypto.createHmac('sha512', secretKey);
const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
vnp_Params['vnp_SecureHash'] = signed;
vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });
```

Ví như: mình niêm phong lá thư bằng 1 con dấu riêng chỉ mình có — ai nhận thư thấy đúng dấu thì biết chắc thư từ mình gửi, không phải giả.

Trình duyệt của khách được đưa (`window.location.href = checkoutUrl`) sang thẳng trang VNPay — từ đây khách trả tiền trên hệ thống VNPay, web mình không tham gia vào bước trả tiền.

### Bước 2 — VNPay trả khách về web mình

VNPay redirect trình duyệt khách về đúng `vnp_ReturnUrl` đã gửi ở bước 1 (ví dụ `http://localhost:3000/success`), kèm theo 1 loạt query param trên URL: `vnp_ResponseCode` (mã kết quả, `"00"` = thành công), `vnp_TxnRef` (chính là mã đơn hàng), `vnp_Amount`, và quan trọng nhất — `vnp_SecureHash` (con dấu niêm phong mà GIỜ LÀ VNPAY TỰ ĐÓNG, xác nhận đây đúng là thông tin do VNPay gửi, không phải ai tự chế URL giả).

### Bước 3 — Web mình PHẢI tự kiểm tra lại con dấu đó

File: `frontend_react/src/pages/orders/success.tsx`. Trang này đọc toàn bộ query param trên URL, rồi gửi NGUYÊN VẸN cho backend kiểm tra — không tự mình đọc `vnp_ResponseCode` để quyết định gì cả:

```ts
paymentApi
  .verifyPayment(Object.fromEntries(queryParams.entries()))
  .then((res) => {
    if (res.verified && res.payment_status === "PAID") { ... }
    else if (res.verified) { ... }
    else { ... }
  });
```

Backend: `backend/src/controllers/payment.controllers.ts`, hàm `verifyPaymentReturn` — làm ĐÚNG lại y hệt phép tính ở Bước 1 (sắp xếp key, tính HMAC-SHA512 bằng secretKey), nhưng lần này để SO SÁNH với `vnp_SecureHash` nhận được, không phải để tạo mới:

```ts
const sortedParams = sortObject(vnp_Params);
const signData = qs.stringify(sortedParams, { encode: false });
const hmac = crypto.createHmac('sha512', secretKey);
const computedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

if (!receivedHash || computedHash !== receivedHash) {
  res.status(200).json({ success: true, verified: false, payment_status: PaymentStatus.PENDING });
  return;
}
```

Chỉ khi 2 con dấu (tự tính vs nhận được) khớp NHAU TUYỆT ĐỐI, backend mới tin `vnp_ResponseCode` và cập nhật đơn hàng:

```ts
const payment_status = responseCode === '00' ? PaymentStatus.PAID : PaymentStatus.PENDING;
if (orderId && mongoose.isValidObjectId(orderId)) {
  await orderModel.findByIdAndUpdate(orderId, { payment_status });
}
```

Vì `secretKey` chỉ nằm trên server (không gửi ra trình duyệt bao giờ), không ai ngoài VNPay và server mình có thể tính RA đúng con dấu đó — nên nếu con dấu khớp, chắc chắn thông tin thật sự đến từ VNPay.

## Phần 4 — Vì sao trước đây không an toàn, đã sửa gì

**Trước đây**: `success.tsx` tự đọc `vnp_ResponseCode` ngay trên URL, thấy `"00"` thì tự gọi `updatePaymentStatus(orderId, {payment_status: "PAID"})` — không có bước kiểm tra `vnp_SecureHash` ở đâu cả. Bug ở đây là: URL là thứ AI CŨNG SỬA ĐƯỢC (gõ thẳng vào ô địa chỉ trình duyệt). Nghĩa là bất kỳ ai biết mã đơn hàng đều có thể tự gõ:
```
http://localhost:3000/success?vnp_ResponseCode=00&vnp_TxnRef=<orderId>
```
và hệ thống cũ sẽ tin ngay là đã thanh toán — không cần trả tiền thật.

**Đã sửa**: chuyển toàn bộ việc "quyết định đã thanh toán hay chưa" về cho backend, và backend chỉ quyết định SAU KHI tự tính lại con dấu và so khớp (Phần 3, Bước 3). Route cũ `PATCH /orders/payment-status/:id` (`updatePaymentStatus`) vẫn còn trong code cho các luồng khác (ví dụ admin đánh dấu đơn thu tiền mặt COD), chỉ riêng luồng VNPay không dùng đường đó để tự quyết định nữa.

Tiện sửa luôn 1 lỗi nhỏ khác: code cũ có 3 dòng `console.log` in thẳng `secretKey` (chuỗi bí mật) ra log server mỗi lần tạo thanh toán — đã xoá, vì ai đọc được log server sẽ đọc được luôn "chìa khoá" để tự tạo con dấu giả.

## Phần 5 — Sandbox vs Production (môi trường test vs thật)

`.env` hiện tại đang trỏ về **sandbox** (môi trường test của VNPay, không phải tiền thật): `VNP_URL`/`VNP_API` chứa `sandbox.vnpayment.vn`, và `VNP_RETURN_URL=http://localhost:3000/success` (chỉ chạy được khi test trên máy local). Đây là lựa chọn CHỦ ĐỘNG hiện tại (đang trong giai đoạn phát triển/test) — không phải lỗi.

Khi nào cần nhận tiền thật, cần đổi các biến sau trong `.env` sang giá trị thật do VNPay cấp khi đăng ký merchant chính thức: `VNP_TMNCODE`, `VNP_HASHSECRET` (đổi sang mã/khoá thật), `VNP_URL`/`VNP_API` (đổi sang domain production `pay.vnpayment.vn` thay vì `sandbox.vnpayment.vn`), `VNP_RETURN_URL` (đổi sang domain thật của web, không còn `localhost`).

## Phần 6 — Bảng tra cứu nhanh

| Muốn làm gì | Mở file |
|---|---|
| Đổi cách tạo link thanh toán | `backend/src/controllers/payment.controllers.ts` (hàm `createPayment`) |
| Đổi cách xác thực khi VNPay trả về | `backend/src/controllers/payment.controllers.ts` (hàm `verifyPaymentReturn`) |
| Đổi route API thanh toán | `backend/src/routes/payment.routes.ts` |
| Đổi giao diện trang xác nhận thanh toán | `frontend_react/src/pages/orders/success.tsx` |
| Đổi cách gọi API thanh toán từ frontend | `frontend_react/src/api/paymentApi.js` |
| Đổi môi trường sandbox/production | `backend/.env` (các biến `VNP_*`) |

## Phần 7 — Tóm tắt nhanh

```
payment.tsx → paymentApi.create() → POST /create_payment → createPayment
  → tạo vnp_Params, tính vnp_SecureHash bằng secretKey → trả URL VNPay
                                                              │
                                                    khách trả tiền trên VNPay
                                                              │
success.tsx ← VNPay redirect về, kèm query vnp_* + vnp_SecureHash mới
  → paymentApi.verifyPayment() → GET /verify_payment → verifyPaymentReturn
  → BACKEND tự tính lại hash, so khớp → chỉ tin khi khớp → cập nhật payment_status
  → trả kết quả đã-xác-thực về, success.tsx CHỈ hiển thị theo kết quả đó
```

1. **payment.tsx** — khách bấm thanh toán, gọi tạo link.
2. **createPayment** — đóng dấu (ký) thông tin đơn hàng, trả link VNPay.
3. Khách trả tiền trên VNPay (ngoài hệ thống mình).
4. **success.tsx** — nhận query VNPay trả về, gửi nguyên vẹn cho backend, KHÔNG tự quyết định gì.
5. **verifyPaymentReturn** — tự tính lại dấu, so khớp, chỉ khi khớp mới cập nhật `payment_status` trong DB.
6. Frontend chỉ hiển thị đúng theo kết quả backend đã xác thực — không còn chỗ nào tin theo lời client tự nói nữa.
