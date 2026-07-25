# Quản lý đơn hàng (Order) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin (hoặc nhân viên) mở trang "Quản lý đơn hàng" trong khu quản trị, xem danh sách đơn, mở chi tiết 1 đơn và đổi trạng thái đơn hàng (ví dụ từ "Chờ xử lý" sang "Đang xử lý"). Đây là 1 trong những phần phức tạp nhất của cả dự án vì nó đụng tới rất nhiều bảng liên quan (khách hàng, sản phẩm, dịch vụ, giao hàng, mã giảm giá, thanh toán) và có nhiều logic nghiệp vụ (trừ kho, hoàn kho, gửi email...).

Viết cho người **chưa biết gì về lập trình**. Nếu bạn đã đọc `docs/banner/README.md`, Phần 1 dưới đây sẽ quen thuộc — nó dùng lại đúng ví dụ "nhà hàng", chỉ mở rộng thêm để giải thích riêng khái niệm Order/OrderDetail.

---

## Phần 1 — Vài khái niệm cần biết trước

Vẫn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách/nhân viên ngồi trước máy tính, nhìn màn hình | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên máy chủ ở xa, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Địa chỉ cố định mà frontend gọi tới để xin/gửi dữ liệu, ví dụ `/api/v1/orders/status/68abc...` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi 1 "đơn xin/đơn báo" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết đưa cho đúng đầu bếp nào | Đoạn code quyết định: request đi tới URL nào thì giao cho hàm nào xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, lấy nguyên liệu, xử lý, trả kết quả |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "1 đơn hàng/1 dòng chi tiết trông như thế nào" và là thứ duy nhất được nói chuyện trực tiếp với database |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu lưu trữ lâu dài |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Cách viết dữ liệu bằng chữ/số theo khuôn `{ "tên": "giá trị" }` |
| **Order (đơn hàng)** | **Tờ hoá đơn tổng** dán ở đầu bàn: hoá đơn số mấy, khách nào, tổng tiền bao nhiêu, đã trả tiền chưa, đang ở công đoạn nào (mới gọi món/đang nấu/đang bưng ra/đã xong) | 1 document trong collection `orders` — chỉ chứa thông tin CHUNG của cả đơn, không liệt kê từng món |
| **OrderDetail (chi tiết đơn hàng)** | **Từng dòng món ăn viết trong hoá đơn đó**: "Cơm gà x2 — 90.000đ", "Trà đá x1 — 5.000đ"... | 1 document trong collection `orderDetail` — mỗi dòng là 1 sản phẩm/dịch vụ + số lượng, và có 1 "số hoá đơn" (`orderId`) để biết nó thuộc đơn nào |

**Vì sao lại tách ra 2 bảng riêng thay vì nhét hết vào 1 bảng `Order`?**

Vì 1 đơn hàng có thể có rất nhiều dòng sản phẩm khác nhau (khách mua 3 loại thức ăn cho chó, mỗi loại 1 số lượng khác nhau) — nếu nhét tất cả vào 1 document `Order` thì phải dùng 1 danh sách lồng bên trong, rất khó:
- Khó tính lại kho cho **từng dòng** riêng (trừ kho sản phẩm A khác với trừ kho sản phẩm B).
- Khó khi 1 đơn vừa có sản phẩm vừa có dịch vụ đặt lịch (spa cho thú cưng) — mỗi dòng cần các field khác nhau (`petName`, `booking_date`... chỉ dịch vụ mới cần).
- Khó hủy/sửa riêng 1 dòng (ví dụ hủy 1 lịch hẹn dịch vụ) mà không đụng tới các dòng khác trong cùng đơn.

Nên thiết kế tách: **`Order`** = thông tin chung 1 lần (ai mua, tổng tiền, trạng thái, thanh toán, giao hàng, mã giảm giá...); **`OrderDetail`** = nhiều dòng, mỗi dòng tự đứng riêng, chỉ giữ 1 sợi dây `orderId` trỏ ngược về đúng `Order` của nó — giống hệt việc 1 hoá đơn giấy có phần đầu ghi thông tin chung, và phần thân là bảng liệt kê từng món.

Điểm quan trọng nhất cần nhớ (nhắc lại từ tài liệu banner): **Frontend không bao giờ đọc trực tiếp database**, luôn phải đi qua API.

---

## Phần 2 — Bức tranh tổng thể (chỉ vài dòng)

```
Admin mở trang "Quản lý đơn hàng" (order.tsx)
  → gọi API xin danh sách  → Backend (app→router→controller→model)  → Database (2 collection: orders + orderDetail)
  → dữ liệu trả về, FE tự gộp các dòng orderDetail lại theo orderId thành từng "đơn hàng" hiển thị trên bảng

Admin bấm xem 1 đơn → mở modal (KHÔNG gọi thêm API, dùng lại dữ liệu đã có)
  → admin chọn trạng thái mới, bấm "Lưu thay đổi"
  → gọi API đổi trạng thái  → Backend kiểm tra, trừ/hoàn kho sản phẩm nếu cần, lưu trạng thái mới vào Order
  → FE tải lại danh sách, bảng cập nhật trạng thái mới
```

Bây giờ đi từng bước thật, đúng thứ tự.

---

## Phần 3 — Từng bước thật: xem danh sách đơn hàng và đổi trạng thái

### Bước 1 — Admin mở trang, trang tự xin danh sách đơn hàng

File: `frontend_react/src/admin/order/order.tsx`

Ngay khi trang vừa hiện ra, `useEffect` tự gọi `fetchOrders()` một lần:

```tsx
useEffect(() => {
  fetchOrders();
}, [filters]);

const fetchOrders = async () => {
  const response = await orderApi.getAll();
  const orderDetails = response.data.result;
  ...
```

Chú ý ngay từ đây: biến được đặt tên `orderDetails` — vì API `getAll()` **không trả về danh sách `Order`, mà trả về danh sách `OrderDetail`** (từng dòng sản phẩm), rồi chính trang admin này mới tự gộp lại. Lý do và cách gộp sẽ giải thích ở Bước 7.

### Bước 2 — `orderApi.js` gói yêu cầu gửi đi

File: `frontend_react/src/api/orderApi.js`

```js
getAll: async () => {
  const response = await api.get("/v1/orders");
  return { data: response.data };
},
```

Một request `GET` (chỉ xin xem, không đổi gì) gửi tới `/v1/orders`.

### Bước 3 — Request vào cửa chính backend

File: `backend/src/index.ts`

```ts
app.use(cors(corsOptions));
app.use(express.json());
...
app.use('/api/v1', orderRouter);
app.use('/api/v1', orderDetailRouter);
```

Request `/api/v1/orders` được giao cho `orderRouter` xem có phải việc của nó không (có riêng 1 router khác nữa là `orderDetailRouter`, phụ trách các API liên quan tới từng dòng chi tiết/lịch hẹn — sẽ nhắc ở Phần 4).

### Bước 4 — Router khớp địa chỉ, chọn hàm xử lý

File: `backend/src/routes/order.routes.ts`

```ts
orderRouter.get('/orders', verifyToken, getAllOrders);
orderRouter.get('/pendingOrders', verifyToken, getPendingOrders);
orderRouter.post('/orders', createOrderAfterPayment);
orderRouter.get('/orders/:id', verifyToken, getOrderById);
orderRouter.patch('/orders/status/:id', verifyToken, updateOrderStatus);
orderRouter.patch('/orders/payment-status/:id', updatePaymentStatus);
orderRouter.post('/orders/cancel-booking', verifyToken, cancelServiceBooking);
```

`GET /orders` khớp dòng đầu → giao cho hàm `getAllOrders`.

Điểm đáng chú ý: mọi route ở đây chỉ có `verifyToken` (nghĩa là "phải đăng nhập"), **không có `requireAdmin`** (khác với banner, nơi các route quản trị luôn có cả `verifyToken, requireAdmin`). Nghĩa là về phía backend, hễ đăng nhập được (kể cả role thường, không riêng admin) là gọi được các API đổi trạng thái đơn hàng — phía frontend, menu "Quản lý đơn hàng" cũng được hiển thị cho cả role admin lẫn "nhân viên" (`employeeMenuItems` trong `frontend_react/src/components/layout/AdminLayout.tsx` có chứa key của trang orders), nên đây là chủ đích: trang này dành cho cả quản lý lẫn nhân viên, không riêng admin — chỉ cần đã đăng nhập.

### Bước 5 — Controller `getAllOrders` lấy dữ liệu

File: `backend/src/controllers/order.controllers.ts`

```ts
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await orderDetailModel
      .find({ productId: { $ne: null }, serviceId: null })
      .populate({
        path: 'orderId',
        populate: {
          path: 'userID',
          select: 'fullname email phone avatar'
        }
      })
      .populate('productId', 'name price')
      .lean();

    res.status(200).json({ success: true, result: orders });
  } catch (error) { ... }
};
```

Giải thích:
- Nó hỏi **Model `orderDetailModel`** (không phải `orderModel`): "tìm tất cả dòng chi tiết nào có `productId` khác rỗng VÀ `serviceId` là rỗng" — tức là **chỉ lấy các dòng thuộc đơn hàng SẢN PHẨM**, cố tình loại bỏ các dòng đặt lịch dịch vụ (spa, tắm...) ra khỏi trang "Quản lý đơn hàng" này (dịch vụ có trang riêng "Quản lý lịch hẹn").
- `.populate({ path: 'orderId', populate: { path: 'userID', ... } })` — đây gọi là **populate lồng nhau**: bình thường field `orderId` trong 1 `orderDetail` chỉ là 1 chuỗi ID (giống 1 "số hoá đơn" viết tay); `populate` là lệnh nhờ Model "đi lấy hộ toàn bộ nội dung Order thật ứng với ID đó, nhét luôn vào chỗ `orderId`" — và lồng thêm 1 lớp nữa để lấy luôn thông tin `userID` (tên/email/sđt khách) nằm bên trong Order đó.
- `.populate('productId', 'name price')` — tương tự, lấy hộ tên và giá của sản phẩm.
- Kết quả trả ra: `{ success: true, result: [...] }` — mỗi phần tử là 1 **OrderDetail đã được "làm giàu"** (đã có sẵn cả Order lẫn User lẫn Product bên trong, không cần gọi thêm API nào khác).

### Bước 6 — Model: 2 bảng thật đứng sau `getAllOrders`

#### Model `Order` — file `backend/src/models/order.model.ts`

```ts
const orderSchema: Schema<IOrder> = new Schema<IOrder>(
  {
    userID: { type: Schema.Types.ObjectId, ref: user, required: false },
    fullname: { type: String, required: false },
    phone: { type: String, required: false },
    email: { type: String, required: false },
    paymentOrderCode: { type: Number, required: false },
    payment_typeID: { type: Schema.Types.ObjectId, ref: paymentType, default: null },
    deliveryID: { type: Schema.Types.ObjectId, ref: delivery, default: null },
    couponID: { type: Schema.Types.ObjectId, ref: coupon, default: null },
    order_date: { type: Date, default: Date.now },
    total_price: { type: Number, required: false },
    shipping_address: { type: String, required: false },
    payment_status: { type: String, enum: PaymentStatus, default: PaymentStatus.PENDING, required: false },
    status: { type: String, enum: [...Object.values(OrderStatus), null], default: null },
    bookingStatus: { type: String, enum: [...Object.values(BookingStatus), null], default: null }
  },
  { timestamps: true }
);
```

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | ObjectId (tự sinh) | "Số hoá đơn", căn cước duy nhất của đơn hàng | `"66f1a2b3c4d5e6f708090a0b"` |
| `userID` | Tham chiếu tới bảng `User` | Khách đặt hàng nếu đã đăng nhập — có tài liệu riêng cho User, ở đây chỉ dùng để "nối" ra tên/email/sđt | trỏ tới 1 document trong collection `users` |
| `fullname`, `phone`, `email` | Chữ | Thông tin liên hệ — dùng khi khách đặt hàng **không đăng nhập** (khách vãng lai, `userID = null`) | `"Nguyễn Văn A"`, `"0912345678"` |
| `paymentOrderCode` | Số | Mã giao dịch dùng khi làm việc với cổng thanh toán (xem `docs/payment/README.md`) | `1234567` |
| `payment_typeID` | Tham chiếu tới bảng `PaymentType` | Đơn này thanh toán bằng hình thức nào (COD, VNPay...) — có tài liệu riêng | trỏ tới 1 document `paymentType` |
| `deliveryID` | Tham chiếu tới bảng `Delivery` | Đơn này chọn phương thức giao hàng nào, phí ra sao — có tài liệu riêng | trỏ tới 1 document `delivery` |
| `couponID` | Tham chiếu tới bảng `Coupon` | Đơn có áp mã giảm giá nào không, `null` nếu không dùng — có tài liệu riêng | trỏ tới 1 document `coupon` hoặc `null` |
| `order_date` | Ngày giờ | Thời điểm đặt hàng (đã quy đổi theo giờ Việt Nam trước khi lưu) | `"2026-07-16T03:00:00.000Z"` |
| `total_price` | Số | Tổng tiền cuối cùng (đã trừ giảm giá, cộng phí ship) — `null` nếu đây là đơn đặt dịch vụ chứ không phải mua sản phẩm | `250000` |
| `shipping_address` | Chữ | Địa chỉ giao hàng | `"123 Nguyễn Văn Cừ, Q1, TP.HCM"` |
| `payment_status` | Chữ, giới hạn (`enum PaymentStatus`) | Đã trả tiền chưa: `PENDING` (chưa), `PAID` (đã trả), `CASH_ON_DELIVERY` (trả khi nhận hàng) | `"PAID"` |
| `status` | Chữ, giới hạn (`enum OrderStatus`) hoặc `null` | Trạng thái xử lý đơn hàng SẢN PHẨM — xem bảng trạng thái ở dưới. `null` nếu đây là đơn thuần đặt dịch vụ | `"PROCESSING"` |
| `bookingStatus` | Chữ, giới hạn (`enum BookingStatus`) hoặc `null` | Trạng thái riêng cho đơn ĐẶT LỊCH DỊCH VỤ (khác `status`, xem Phần 4) | `"CONFIRMED"` hoặc `null` |
| `createdAt` / `updatedAt` | Ngày giờ (tự động) | Đơn được tạo/sửa lúc nào | — |

**Ý nghĩa từng trạng thái `OrderStatus`** — định nghĩa tại `backend/src/enums/order.enum.ts`:

```ts
export enum OrderStatus {
  PENDING = 'PENDING',       // Đơn hàng đang chờ xử lý
  PROCESSING = 'PROCESSING', // Đang xử lý
  SHIPPING = 'SHIPPING',     // Đang giao hàng
  DELIVERED = 'DELIVERED',   // Đã nhận hàng
  CANCELLED = 'CANCELLED'    // Đã hủy
}
```

| Trạng thái | Ý nghĩa thực tế | Khi nào đơn ở trạng thái này |
|---|---|---|
| `PENDING` | Chờ xử lý | Vừa được tạo xong (khách vừa đặt/thanh toán xong), shop chưa xác nhận |
| `PROCESSING` | Đang xử lý | Shop đã xác nhận đơn, **kho bắt đầu bị trừ thật** (xem Bước 8) |
| `SHIPPING` | Đang giao hàng | Đơn vị vận chuyển đang cầm hàng đi giao |
| `DELIVERED` | Đã nhận hàng | Khách đã nhận được hàng, coi như hoàn tất |
| `CANCELLED` | Đã hủy | Đơn bị huỷ — nếu huỷ từ `PROCESSING`, kho được hoàn lại (xem Bước 8) |

#### Model `OrderDetail` — file `backend/src/models/orderdetail.model.ts`

```ts
const orderDetailSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: order, required: true },
    productId: { type: Schema.Types.ObjectId, ref: product, required: false, default: '' },
    serviceId: { type: Schema.Types.ObjectId, ref: service, required: false, default: '' },
    quantity: { type: Number, required: true },
    product_price: { type: Number, required: false },
    total_price: { type: Number, required: false },
    booking_date: { type: Date, required: false, default: '' },
    petName: { type: String, required: false, default: '' },
    petType: { type: String, required: false, default: '' },
    isRated: { type: Boolean, default: false },
    petWeight: { type: Number, require: false, default: '' },
    realPrice: { type: Number, require: false, default: '' }
  },
  { timestamps: true }
);
```

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | ObjectId | Căn cước riêng của dòng chi tiết này | `"66f1a2b3c4d5e6f708090a0c"` |
| `orderId` | Tham chiếu tới `Order` | "Số hoá đơn" — dòng này thuộc đơn hàng nào | trỏ tới `_id` của 1 `Order` |
| `productId` | Tham chiếu tới `Product` | Dòng này bán sản phẩm nào — `null` nếu dòng này là đặt dịch vụ | trỏ tới 1 `product`, hoặc `null` |
| `serviceId` | Tham chiếu tới `Service` | Dòng này là đặt dịch vụ nào — `null` nếu dòng này là mua sản phẩm | trỏ tới 1 `service`, hoặc `null` |
| `quantity` | Số | Số lượng — với sản phẩm là "mua mấy cái"; với dịch vụ thường là `1` | `2` |
| `product_price` | Số | Đơn giá sản phẩm tại thời điểm mua (lưu lại để giá sau này thay đổi cũng không ảnh hưởng đơn cũ) | `45000` |
| `total_price` | Số | `quantity × product_price` của riêng dòng này | `90000` |
| `booking_date` | Ngày giờ | Chỉ dùng khi là dịch vụ — giờ hẹn (đã quy đổi UTC) | `"2026-07-20T02:00:00.000Z"` |
| `petName`, `petType`, `petWeight` | Chữ/Số | Chỉ dùng khi là dịch vụ — tên/loài/cân nặng thú cưng đi kèm lịch hẹn | `"Bông"`, `"Chó"`, `4.5` |
| `isRated` | Đúng/Sai (Boolean) | Khách đã đánh giá dòng sản phẩm/dịch vụ này chưa | `false` |
| `realPrice` | Số | Giá thực tế tính lại sau khi cân thú cưng tại chỗ (dịch vụ spa tính theo cân nặng) | `250000` |

Một `Order` có thể có **nhiều** `OrderDetail` (`1 order — N orderDetail`), mỗi `OrderDetail` chỉ thuộc về đúng **1** `Order` — quan hệ này gọi là "một-nhiều" (one-to-many), y hệt 1 hoá đơn có nhiều dòng món ăn nhưng mỗi dòng chỉ nằm trên 1 hoá đơn.

### Bước 7 — Kết quả đi ngược lại, frontend tự gộp dữ liệu

Response `{ success: true, result: [...] }` đi ngược qua router, ra khỏi backend, `orderApi.js` nhận được, rồi `order.tsx` xử lý tiếp — đây là bước **quan trọng và dễ gây nhầm lẫn nhất** của trang này:

```tsx
const orderDetails = response.data.result;
const groupedOrders: { [key: string]: any } = {};

orderDetails.forEach((detail: any) => {
  const orderId = detail.orderId._id;
  if (!groupedOrders[orderId]) {
    groupedOrders[orderId] = {
      orderId: orderId,
      orderDate: detail.orderId.order_date,
      status: detail.orderId.status,
      paymentStatus: detail.orderId.payment_status || 'UNPAID',
      fullname: detail.orderId.userID?.fullname || 'Không xác định',
      phone: detail.orderId.userID?.phone || 'Chưa nhập số điện thoại',
      total_price: detail.orderId.total_price,
      products: [],
    };
  }
  groupedOrders[orderId].products.push({
    orderDetailId: detail._id,
    productId: detail.productId?._id || null,
    productName: detail.productId?.name || 'Không xác định',
    productPrice: detail.product_price || 0,
    quantity: detail.quantity || 0,
    totalPrice: detail.total_price || 0,
  });
});
```

Vì API trả về theo **từng dòng chi tiết** (giống việc nhận về từng dòng món ăn rời rạc), trang admin phải tự "xếp lại thành từng hoá đơn": duyệt qua tất cả các dòng, dòng nào có cùng `orderId._id` thì gom vào chung 1 object `groupedOrders[orderId]`, các dòng sản phẩm được đẩy vào mảng `products` bên trong object đó. Sau đó `Object.values(groupedOrders)` biến nó thành 1 mảng các "đơn hàng" (mỗi đơn giờ có sẵn danh sách `products` con), gọi `setOrders(...)` → React vẽ lại bảng `Table` của thư viện Ant Design.

### Bước 8 — Admin bấm xem chi tiết 1 đơn (không cần gọi thêm API)

```tsx
const handleView = (record: Order) => {
  setSelectedOrder(record);
  form.setFieldsValue({ status: record.status });
  setIsModalVisible(true);
};
```

Nút hình con mắt chỉ đơn giản lấy lại đúng `record` (dòng đã gộp sẵn ở Bước 7 — đã có đủ tên khách, danh sách sản phẩm, trạng thái) để hiển thị trong `Modal`, **không gọi thêm bất kỳ API nào**. Vì dữ liệu cần hiển thị đã có sẵn từ lúc tải danh sách, việc gọi lại API để "xem chi tiết" là không cần thiết — đây là 1 lựa chọn tối ưu (đỡ tốn 1 request), đổi lại nếu dữ liệu vừa bị người khác sửa ở nơi khác thì modal có thể hiển thị dữ liệu hơi cũ cho tới khi bấm "Làm mới".

### Bước 9 — Admin chọn trạng thái mới, bấm "Lưu thay đổi"

Trong modal có 1 ô chọn (`Select`) load sẵn `record.status`, admin đổi sang trạng thái khác rồi bấm nút "Lưu thay đổi":

```tsx
const handleModalOk = async () => {
  const values = await form.validateFields();
  if (selectedOrder) {
    await orderApi.updateOrderStatus(selectedOrder.orderId, values.status);
    message.success('Cập nhật trạng thái đơn hàng thành công');
    await fetchOrders();
    setIsModalVisible(false);
  }
};
```

`orderApi.updateOrderStatus`:

```js
updateOrderStatus: async (id, status) => {
  const response = await api.patch(`/v1/orders/status/${id}`, { status });
  return response.data;
},
```

Đây là 1 request `PATCH` (nghĩa là "sửa 1 phần dữ liệu đã có", khác `POST` là "tạo mới") gửi tới `/v1/orders/status/<orderId>`, kèm theo `{ status: "PROCESSING" }` (ví dụ) trong body.

### Bước 10 — Router khớp `PATCH /orders/status/:id`, giao cho `updateOrderStatus`

Từ Bước 4: `orderRouter.patch('/orders/status/:id', verifyToken, updateOrderStatus);` — `:id` là 1 "ô trống" nhận đúng chuỗi ID đơn hàng nằm trên URL.

### Bước 11 — Controller `updateOrderStatus` — nơi thật sự xử lý nghiệp vụ trừ/hoàn kho

File: `backend/src/controllers/order.controllers.ts`

```ts
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) { ... return; }
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ' });
      return;
    }

    const order = await orderModel.findById(id).session(session);
    if (!order) { ... return; }

    const orderDetails = await orderDetailModel.find({ orderId: id }).session(session);

    for (const detail of orderDetails) {
      if (detail.productId) {
        const product = await productModel.findById(detail.productId).session(session);
        if (!product) { throw new Error(`Sản phẩm ${detail.productId} không tồn tại`); }

        if (status === OrderStatus.PROCESSING && order.status !== OrderStatus.PROCESSING) {
          if (product.quantity < detail.quantity) {
            throw new Error(`Không đủ hàng cho sản phẩm ${product.name}`);
          }
          product.quantity -= detail.quantity;
          product.quantity_sold = (product.quantity_sold || 0) + detail.quantity;
        } else if (status === OrderStatus.CANCELLED && order.status === OrderStatus.PROCESSING) {
          product.quantity += detail.quantity;
          product.quantity_sold = Math.max(0, (product.quantity_sold || 0) - detail.quantity);
        }
        await product.save({ session });
      }
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Trạng thái đơn hàng được cập nhật thành công', order });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', details: ... });
  } finally {
    session.endSession();
  }
};
```

Giải thích bằng lời, đúng thứ tự nó chạy:

1. **Mở 1 "transaction"** (tạm hiểu: 1 gói các thay đổi được ghi database "tất cả hoặc không gì cả" — nếu giữa chừng lỗi, mọi thay đổi đã làm trong gói này bị hủy sạch, không để dữ liệu nửa vời). Rất cần thiết ở đây vì 1 lần đổi trạng thái có thể phải sửa nhiều sản phẩm CÙNG LÚC — không được để lỡ trừ kho sản phẩm A rồi lỗi giữa chừng mà sản phẩm B không được trừ.
2. Kiểm tra `id` có đúng định dạng ObjectId không, `status` gửi lên có nằm trong 5 giá trị hợp lệ của `OrderStatus` không (Controller **không** kiểm tra thứ tự chuyển đổi có hợp lý hay không — xem so sánh ở Phần 4).
3. Tìm `order` theo `id`, tìm tất cả `orderDetail` thuộc đơn đó.
4. Với mỗi dòng chi tiết có bán sản phẩm (`detail.productId`):
   - **Nếu trạng thái MỚI là `PROCESSING` và trạng thái CŨ chưa phải `PROCESSING`** (nghĩa là đây là lần đầu đơn được xác nhận xử lý): kiểm tra kho (`product.quantity`) có đủ không, nếu đủ thì **trừ thật** số lượng tồn kho và **cộng** vào số lượng đã bán (`quantity_sold`). Đây chính là thời điểm kho thực sự bị trừ — **không phải lúc khách đặt hàng** (xem ghi chú Phần 4).
   - **Nếu trạng thái MỚI là `CANCELLED` và trạng thái CŨ đang là `PROCESSING`** (đơn đang xử lý bị huỷ giữa chừng): **hoàn lại** đúng số lượng đã trừ vào kho, trừ lại số đã cộng vào `quantity_sold`.
   - Các trường hợp chuyển đổi khác (ví dụ `PROCESSING → SHIPPING`, `SHIPPING → DELIVERED`) không đụng gì tới kho — vì kho đã bị trừ ngay từ lúc vào `PROCESSING` rồi.
5. Ghi `order.status = status` rồi lưu lại `Order`.
6. `session.commitTransaction()` — "chốt" toàn bộ thay đổi (cả kho lẫn trạng thái đơn) xuống database thật cùng lúc.
7. Trả về `{ success: true, order }` — `order` đã có `status` mới.

Nếu bất kỳ bước nào ở giữa quăng lỗi (ví dụ không đủ hàng), `catch` sẽ gọi `session.abortTransaction()` — huỷ sạch mọi thay đổi đã làm trong lần gọi này, database quay lại y như trước khi gọi API, rồi trả lỗi `500` về cho frontend.

### Bước 12 — Kết quả đi ngược lại, bảng admin tự làm mới

Response `{ success: true, order }` đi ngược qua router, ra khỏi backend, tới `orderApi.updateOrderStatus`, rồi về tới `handleModalOk`:

```tsx
message.success('Cập nhật trạng thái đơn hàng thành công');
await fetchOrders();
setIsModalVisible(false);
```

Chú ý: code không dùng trực tiếp `order` vừa nhận được để cập nhật màn hình — nó gọi lại **toàn bộ Bước 1 tới Bước 7** (`fetchOrders()`) để tải lại danh sách mới nhất từ đầu, rồi mới đóng modal. Cách này đơn giản, chắc chắn dữ liệu trên bảng luôn khớp với database, đổi lại tốn thêm 1 lượt gọi API so với việc chỉ cập nhật đúng 1 dòng trên bảng.

---

## Phần 4 — So sánh với các luồng chuyển trạng thái khác

Order có nhiều "luồng trạng thái" song song, dễ nhầm với nhau. Bảng so sánh:

| | `status` (đơn hàng SẢN PHẨM) | `bookingStatus` (đơn ĐẶT LỊCH DỊCH VỤ) |
|---|---|---|
| Enum định nghĩa | `OrderStatus` (`backend/src/enums/order.enum.ts`) | `BookingStatus` (`backend/src/enums/booking.enum.ts`): `PENDING, CONFIRMED, IN_PROGRESS, CANCELLED, COMPLETED` |
| API đổi trạng thái | `PATCH /v1/orders/status/:id` → `updateOrderStatus` | `PATCH /v1/bookings/status` → `changeBookingStatus` (`backend/src/controllers/orderDetail.controllers.ts`) |
| Có kiểm tra **thứ tự chuyển đổi hợp lệ** không? | **Không** — admin có thể đổi tự do sang bất kỳ giá trị nào trong 5 giá trị, kể cả "lùi" lại (`DELIVERED → PENDING`) | **Có** — `changeBookingStatus` có hẳn 1 bảng quy định rõ được phép đi đâu: `PENDING → [CONFIRMED, CANCELLED]`, `CONFIRMED → [IN_PROGRESS, CANCELLED]`, `IN_PROGRESS → [COMPLETED]`, còn `COMPLETED`/`CANCELLED` là điểm dừng, không đổi tiếp được nữa |
| Có gửi email không? | Không | Có — khi chuyển sang `COMPLETED` sẽ gửi email "dịch vụ đã hoàn thành" cho khách |
| Trang admin nào dùng? | `frontend_react/src/admin/order/order.tsx` (trang đang giải thích trong tài liệu này) | Trang "Quản lý lịch hẹn" (menu riêng, không nằm trong phạm vi tài liệu này) |

**Vì sao trang "Quản lý đơn hàng" lại lỏng lẻo hơn (không kiểm tra thứ tự chuyển đổi)?** Nhiều khả năng đây là code viết sớm, chưa được siết chặt như luồng booking viết sau — đây là 1 rủi ro thực tế: admin có thể vô tình chọn nhầm trạng thái "lùi" (ví dụ từ `DELIVERED` quay lại `PENDING`) mà hệ thống không cảnh báo gì.

**Một điểm không khớp giữa giao diện và enum thật (đáng chú ý khi sửa code):** ô chọn trạng thái trong `order.tsx` có 6 lựa chọn: `PENDING, PROCESSING, SHIPPING, SHIPPED, DELIVERED, CANCELLED` — nhưng `OrderStatus` thật sự trên backend chỉ có 5 giá trị (`PENDING, PROCESSING, SHIPPING, DELIVERED, CANCELLED`, **không có `SHIPPED`**). Nếu admin chọn "Đã giao hàng" (`SHIPPED`) rồi bấm Lưu, backend sẽ từ chối với lỗi 400 "Trạng thái đơn hàng không hợp lệ" vì `SHIPPED` không nằm trong enum — tuỳ chọn này trên giao diện hiện là "chết", không bao giờ lưu thành công được.

**Về việc trừ kho — 1 điểm không nhất quán đáng chú ý:** khi tạo đơn hàng (`createOrderAfterPayment`, chạy lúc khách đặt hàng/thanh toán xong), code có đoạn kiểm tra và trừ kho dựa trên field `product.stock`:
```ts
if (product.stock < quantity) { throw new Error(...); }
await productModel.findByIdAndUpdate(productId, { $inc: { stock: -quantity } }, { session });
```
Nhưng model `Product` thật (`backend/src/models/product.model.ts`) **không hề có field `stock`** — chỉ có `quantity` và `quantity_sold`. Vì vậy đoạn kiểm tra này thực chất không có tác dụng thật (kiểm tra 1 field không tồn tại luôn cho kết quả "đủ hàng"), và việc **trừ kho thật sự chỉ diễn ra ở `updateOrderStatus`** (Bước 11 ở trên, dùng đúng field `quantity`) — tức là khi admin xác nhận đơn sang `PROCESSING`, không phải ngay lúc khách đặt hàng.

**Về việc "Xóa" đơn hàng trên giao diện:** nút "Xóa" (icon thùng rác) trong `order.tsx` gọi `orderApi.delete(id)` → `DELETE /v1/orders/:id`, nhưng `backend/src/routes/order.routes.ts` **chưa từng khai báo route `DELETE` nào cho `/orders/:id`** — bấm nút này hiện sẽ nhận lỗi 404 từ server, tính năng xoá đơn thực chất chưa được cài đặt ở backend.

**Về `updatePaymentStatus`:** route `PATCH /v1/orders/payment-status/:id` **không có middleware kiểm tra đăng nhập nào cả** (không `verifyToken`, không `requireAdmin`) — bất kỳ ai gọi đúng địa chỉ này (kể cả không đăng nhập) đều đổi được `payment_status` của bất kỳ đơn nào. Route này vẫn được giữ lại phục vụ các luồng khác (ví dụ đơn COD/nội bộ) — chi tiết rủi ro và cách xử lý tương tự với luồng VNPay xem `docs/payment/README.md` (Phần 4 của tài liệu đó đã vá riêng lỗ hổng cho luồng thanh toán VNPay, không liên quan tới route này).

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi field của đơn hàng (thêm/bớt cột) | `backend/src/models/order.model.ts` + `backend/src/interfaces/order.interface.ts` |
| Đổi field của từng dòng chi tiết (sản phẩm/dịch vụ trong đơn) | `backend/src/models/orderdetail.model.ts` + `backend/src/interfaces/orderdetail.interface.ts` |
| Thêm/sửa trạng thái đơn hàng sản phẩm (`PENDING`, `PROCESSING`...) | `backend/src/enums/order.enum.ts` |
| Đổi logic khi admin đổi trạng thái đơn (trừ/hoàn kho, validate) | `backend/src/controllers/order.controllers.ts`, hàm `updateOrderStatus` |
| Đổi logic lấy danh sách đơn cho trang admin | `backend/src/controllers/order.controllers.ts`, hàm `getAllOrders` |
| Đổi logic tạo đơn hàng lúc khách đặt/thanh toán | `backend/src/controllers/order.controllers.ts`, hàm `createOrderAfterPayment` |
| Đổi địa chỉ API, ai được gọi API nào của order | `backend/src/routes/order.routes.ts` |
| Đổi API liên quan tới từng dòng chi tiết/booking dịch vụ | `backend/src/routes/orderDetail.routes.ts`, `backend/src/controllers/orderDetail.controllers.ts` |
| Đổi giao diện bảng/modal quản lý đơn hàng ở admin | `frontend_react/src/admin/order/order.tsx` |
| Đổi cách gọi API đơn hàng từ frontend | `frontend_react/src/api/orderApi.js` |
| Đổi cách gọi API chi tiết đơn/booking từ frontend | `frontend_react/src/api/orderDetailApi.js` |
| Xem thông tin phương thức thanh toán/giao hàng/mã giảm giá liên kết với đơn | tài liệu riêng của từng phần (`payment_typeID`, `deliveryID`, `couponID` chỉ là tham chiếu, không định nghĩa lại ở đây) |

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin/báo gì, ở đâu" — ví dụ `/api/v1/orders/status/68abc...`.
- **HTTP method (GET/POST/PATCH/DELETE)**: GET = xin xem, POST = tạo mới, PATCH = sửa 1 phần, DELETE = xoá.
- **Middleware**: hàm chạy TRƯỚC Controller để kiểm tra/chuẩn bị (đăng nhập, quyền hạn...) — ví dụ `verifyToken`.
- **Status code (200, 400, 401, 403, 404, 500)**: 200 ổn, 400 request sai, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **Populate**: lệnh của Mongoose (thư viện làm việc với MongoDB) nói "chỗ này chỉ đang là 1 ID, hãy tự đi lấy hộ toàn bộ dữ liệu thật của ID đó rồi nhét vào" — dùng khi 1 bảng chỉ lưu tham chiếu (ID) tới bảng khác thay vì lưu lặp lại toàn bộ dữ liệu.
- **Transaction (giao dịch/phiên)**: 1 gói nhiều thay đổi dữ liệu được coi là "tất cả hoặc không gì cả" — nếu giữa chừng lỗi, mọi thay đổi trong gói bị huỷ hết, không để database ở trạng thái nửa vời (ví dụ: trừ kho sản phẩm A xong mà B lỗi thì A cũng phải được hoàn lại).
- **Enum**: 1 danh sách đóng kín các giá trị hợp lệ — field khai báo `enum` thì chỉ được nhận đúng 1 trong các giá trị liệt kê, gửi giá trị khác sẽ bị từ chối.
- **ObjectId**: kiểu "số căn cước" mà MongoDB tự sinh cho mỗi document, dùng làm `_id` và cũng dùng để 1 bảng "trỏ" sang bảng khác (ví dụ `orderId` trong `OrderDetail` trỏ sang `_id` của `Order`).
- **Schema**: bản thiết kế của Model, quy định 1 document có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB — ví dụ 1 đơn hàng cụ thể là 1 document trong collection `orders`.
- **Collection**: tập hợp nhiều document cùng loại — ví dụ `orders`, `orderDetail`, `products` là 3 collection khác nhau.
- **One-to-many (một-nhiều)**: 1 bản ghi ở bảng này có thể liên kết với NHIỀU bản ghi ở bảng kia — quan hệ giữa `Order` (1) và `OrderDetail` (nhiều).

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌─────────────┐      ┌──────────────┐      ┌──────────────────┐
│  order.tsx  │ ───▶ │  orderApi.js  │ ───▶ │  index.ts (app)  │
│ (trang admin)│      │ (gói request)│      │  cửa chính backend│
└─────────────┘      └──────────────┘      └────────┬──────────┘

┌──────────────────────────────────────────────────────┘
▼
┌────────────────────┐    ┌──────────────────────────┐    ┌───────────────────────┐
│ order.routes.ts     │ ─▶ │ order.controllers.ts      │ ─▶ │ order.model.ts +       │
│ khớp URL, chọn hàm   │    │ getAllOrders/updateOrderStatus│ │ orderdetail.model.ts  │
└────────────────────┘    └──────────────────────────┘    └─────────┬─────────────┘
                                                                     ▼
                                                          ┌────────────────────────┐
                                                          │ MongoDB (database)      │
                                                          │ collection "orders" +   │
                                                          │ collection "orderDetail"│
                                                          └─────────┬──────────────┘
                                                                     │
◀────────────────────────────────────────────────────────────────────┘
   dữ liệu đi ngược lại đúng đường trên, tới order.tsx → gộp theo orderId → vẽ lại bảng/modal
```

Tóm tắt 1 câu mỗi trạm:

1. **order.tsx** — trang admin vừa mở, tự gọi xin danh sách; khi admin đổi trạng thái trong modal và bấm "Lưu thay đổi", gọi tiếp API đổi trạng thái.
2. **orderApi.js** — đóng gói `GET /v1/orders` (xin danh sách) và `PATCH /v1/orders/status/:id` (đổi trạng thái).
3. **index.ts** — cửa chính backend, chuyển request cho `orderRouter` theo tiền tố `/api/v1`.
4. **order.routes.ts** — khớp đúng địa chỉ, kiểm tra `verifyToken` (phải đăng nhập, không cần role admin), giao cho đúng hàm controller.
5. **order.controllers.ts** — `getAllOrders` nhờ Model tìm các dòng `orderDetail` là sản phẩm rồi `populate` kèm Order/User/Product; `updateOrderStatus` kiểm tra trạng thái hợp lệ, trừ/hoàn kho sản phẩm trong 1 transaction, rồi lưu `status` mới vào Order.
6. **order.model.ts** / **orderdetail.model.ts** — 2 bảng tách riêng: Order là "hoá đơn tổng" (1 dòng/đơn), OrderDetail là "từng món trong hoá đơn" (nhiều dòng/đơn), nối nhau qua field `orderId`.
7. **MongoDB** — 2 collection `orders` và `orderDetail`, cùng các collection liên quan (`products`, `users`...) được `populate` kèm theo.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua, `order.tsx` tự gộp các dòng `orderDetail` cùng `orderId` thành từng "đơn hàng" hiển thị trên bảng, và gọi lại toàn bộ luồng lấy danh sách sau mỗi lần đổi trạng thái để bảng luôn khớp với database.
