# Quản lý mã giảm giá (Coupon) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin mở trang "Quản lý mã giảm giá" trong khu vực quản trị (admin) của pet-corner, xem danh sách, thêm/sửa mã giảm giá. Ngoài ra, vì mã giảm giá không chỉ nằm im ở trang admin mà còn được KHÁCH HÀNG dùng lúc đặt hàng, tài liệu cũng chỉ ra ngắn gọn nơi mã giảm giá thực sự được "tiêu" trong lúc đặt hàng — nhưng không đi sâu vào toàn bộ luồng đặt hàng (đó là một feature khác).

Viết cho người **chưa biết gì về lập trình**, nên phần đầu sẽ giải thích vài khái niệm nền tảng trước, sau đó đi vào từng file code thật, theo đúng thứ tự nó chạy.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng/nhân viên ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt (Chrome, Cốc Cốc...) |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin/gửi dữ liệu, ví dụ `/api/v1/coupons` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" (hoặc đơn "làm ơn lưu giúp tôi cái này") qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu (hoặc thông báo thành công/lỗi) về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng địa chỉ nào thì giao cho hàm nào xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, kiểm tra hợp lệ, đi lấy/lưu nguyên liệu (dữ liệu), rồi trả kết quả |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một mã giảm giá trông như thế nào" (có field gì, ràng buộc gì) và là thứ duy nhất được phép nói chuyện trực tiếp với tủ lạnh (database) |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu được lưu trữ thật sự, tồn tại lâu dài, không mất khi tắt máy |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để backend/frontend hiểu nhau |
| **Validation (kiểm tra hợp lệ)** | Đầu bếp kiểm tra nguyên liệu trước khi nấu, và kiểm tra phiếu giảm giá trước khi áp dụng | Bước kiểm tra dữ liệu có "hợp lý" không (đủ thông tin chưa, mã còn hạn không, còn lượt dùng không...) trước khi cho phép làm tiếp |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database (hoặc ghi vào database) rồi trả lại.

Một điểm riêng của Coupon so với các mục quản lý đơn giản khác (category, brand, tag): mã giảm giá không phải "cứ tồn tại là dùng được". Nó có **hạn sử dụng** (ngày bắt đầu/kết thúc), có **số lượt dùng tối đa**, và có thể bị vô hiệu hoá theo thời gian. Vì vậy ngoài việc "lưu dữ liệu", hệ thống còn phải **kiểm tra ràng buộc** mỗi khi mã được dùng — đây là phần quan trọng nhất của tài liệu này, sẽ giải thích kỹ ở Phần 3 và Phần 4.

---

## Phần 2 — Bức tranh tổng thể (chỉ vài dòng)

```
Trình duyệt (admin bấm "Quản lý mã giảm giá")  →  gọi API  →  Backend (app→router→controller→model)  →  Database (MongoDB)
Database  →  trả dữ liệu  →  Model  →  Controller  →  Router  →  Backend  →  Trình duyệt  →  hiện bảng danh sách mã giảm giá
```

Và khi khách hàng đặt hàng có nhập mã giảm giá:

```
Trang thanh toán (payment.tsx)  →  gửi couponID kèm đơn hàng  →  order.controllers.ts kiểm tra mã còn hợp lệ không  →  nếu hợp lệ: trừ 1 lượt dùng, lưu đơn hàng
```

Bây giờ ta đi từng bước thật chi tiết, đúng theo thứ tự xảy ra trong thực tế, bắt đầu từ trang admin.

---

## Phần 3 — Từng bước thật: trang admin "Quản lý mã giảm giá" hiển thị danh sách

### Bước 1 — Admin mở trang, React tự xin danh sách mã giảm giá

File: `frontend_react/src/admin/coupon/coupon.tsx`

Trang admin coupon được gắn vào route `/admin/coupon` (khai báo trong `frontend_react/src/App.tsx`: `{ path: "coupon", element: <CouponList /> }`). Ngay khi component `CouponList` được hiển thị lần đầu, React tự chạy:

```tsx
useEffect(() => {
  fetchCoupons();
}, []);
```

và hàm `fetchCoupons`:

```tsx
const fetchCoupons = async () => {
  setLoading(true);
  try {
    const response = await couponApi.getAllCoupons();
    setCoupons(response.data.result || []);
  } catch (error) {
    notification.error({
      message: "Lỗi",
      description: "Không thể tải danh sách mã giảm giá!",
    });
  } finally {
    setLoading(false);
  }
};
```

`setLoading(true)` bật hiệu ứng "đang tải..." trên bảng (Table của thư viện giao diện antd), rồi nó nhờ `couponApi.getAllCoupons()` đi "hỏi" backend, giống như đưa đơn gọi món cho lễ tân: *"cho tôi toàn bộ danh sách mã giảm giá"*.

### Bước 2 — `couponApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/couponApi.js`

```js
getAllCoupons: async () => {
  const response = await api.get("/v1/coupons");
  return { data: response.data };
},
```

Dòng này gửi một request kiểu `GET` (nghĩa là "chỉ xin dữ liệu, không thay đổi gì") tới địa chỉ `/v1/coupons`. `api` là công cụ có sẵn (thư viện `axios`) tự nối thêm địa chỉ gốc của backend để ra URL đầy đủ, ví dụ `http://localhost:5000/api/v1/coupons`.

### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`

```ts
import couponRouter from './routes/coupon.routes.js';
...
app.use('/api/v1', couponRouter);
```

`index.ts` là **cửa chính** của backend — mọi request đều đi qua đây trước (qua các middleware như `cors`, `express.json()`, `cookieParser()`... để chuẩn bị dữ liệu request), rồi dòng `app.use('/api/v1', couponRouter)` nói: *"Bất kỳ request nào có địa chỉ bắt đầu bằng `/api/v1`, đưa cho `couponRouter` xem có phải việc của nó không."*

### Bước 4 — Router (lễ tân) khớp đúng địa chỉ, chuyển tiếp

File: `backend/src/routes/coupon.routes.ts`

```ts
couponRouter.get('/coupons', getAllCoupon);
couponRouter.get('/coupons/active', getActiveCoupons);
couponRouter.get('/coupons/:id', getCouponById);
couponRouter.post('/coupons', verifyToken, requireAdmin, createCoupon);
couponRouter.delete('/coupons/:id', verifyToken, requireAdmin, deleteCouponById);
couponRouter.patch('/coupons/:id', verifyToken, requireAdmin, updateCoupon);
couponRouter.post('/coupons/apply', verifyToken, applyCoupon);
```

Request của bước 2 (`GET /coupons`) khớp đúng dòng đầu tiên → giao việc cho hàm `getAllCoupon`.

Đáng chú ý: dòng `GET /coupons` (xem danh sách) **không có** `verifyToken, requireAdmin` — ai gọi cũng được, kể cả chưa đăng nhập. Ngược lại các dòng `POST /coupons`, `DELETE /coupons/:id`, `PATCH /coupons/:id` (tạo/xoá/sửa) đều có `verifyToken, requireAdmin` — hai "trạm gác" này chặn lại nếu người gọi chưa đăng nhập hoặc không phải admin. Đây là lý do trang admin coupon vẫn tải được danh sách dù đôi khi token hết hạn, nhưng thao tác thêm/sửa/xoá thì bắt buộc phải đăng nhập bằng tài khoản admin.

Riêng dòng `POST /coupons/apply` có `verifyToken` (phải đăng nhập) nhưng không có `requireAdmin` — vì đây là hành động dành cho khách hàng (áp dụng mã giảm giá), không phải hành động quản trị.

> Lưu ý kỹ thuật (giống banner): dòng `/coupons/active` phải đứng TRƯỚC dòng `/coupons/:id`, vì `:id` là "ô trống nhận bất kỳ chữ gì" — nếu để `:id` lên trước, hệ thống sẽ hiểu nhầm `active` chính là một `id`.

### Bước 5 — Controller (đầu bếp) thực sự xử lý

File: `backend/src/controllers/coupon.controllers.ts`, hàm `getAllCoupon`:

```ts
export const getAllCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await couponModel.find();
    res.status(200).json({ success: true, result });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error coupon up: ${error.message}`);
      return;
    } else {
      console.error('Error coupon up:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
```

Controller nhờ `couponModel` (Model, xem bước 6) đi lấy hộ: `couponModel.find()` nghĩa là *"lấy TOÀN BỘ mã giảm giá có trong database, không lọc gì cả"* (khác với banner — banner có bản public chỉ lấy `status: active`; coupon ở trang admin lấy hết, kể cả mã đã hết hạn/vô hiệu, để admin nhìn thấy toàn bộ lịch sử).

Sau khi có kết quả, nó gói lại thành JSON theo khuôn `{ success: true, result: [...] }` rồi trả về với mã `200` ("thành công"). Nếu lỗi (ví dụ mất kết nối database) thì trả `success: false` và mã `500`.

### Bước 6 — Model (công thức + tủ lạnh) — nơi thật sự chạm database, và nơi các RÀNG BUỘC DỮ LIỆU đầu tiên được khai báo

File: `backend/src/models/coupon.model.ts`

```ts
const couponSchema: Schema<ICoupon> = new Schema<ICoupon>({
  coupon_code: {
    type: String,
    required: [true, 'Mã coupon là bắt buộc'],
    unique: true, // Đảm bảo mã coupon là duy nhất
    trim: true, // Loại bỏ khoảng trắng thừa
    uppercase: true
  },
  discount_value: {
    type: Number,
    required: [true, 'Giá trị giảm giá là bắt buộc'],
    min: [0, 'Giá trị giảm giá không được âm']
  },
  min_order_value: {
    type: Number,
    required: [true, 'Giá trị đơn hàng tối thiểu là bắt buộc'],
    min: [0, 'Giá trị đơn hàng tối thiểu không được âm']
  },
  start_date: { type: Date, required: [true, 'Ngày bắt đầu là bắt buộc'] },
  end_date: { type: Date, required: true },
  usage_limit: {
    type: Number,
    required: [true, 'Số lần sử dụng tối đa là bắt buộc'],
    min: [1, 'Số lần sử dụng tối đa phải lớn hơn 0']
  },
  used_count: { type: Number, default: 0, min: [0, 'Số lần đã sử dụng không được âm'] },
  status: { type: String, enum: CouponStatus, default: CouponStatus.ACTIVE }
});
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra) | "Số căn cước" duy nhất của mã giảm giá đó | `"64f1c2a1e9b3a2001c8d4a11"` |
| `coupon_code` | Chữ (String), bắt buộc, **duy nhất** (`unique`), tự viết HOA (`uppercase`), tự cắt khoảng trắng thừa (`trim`) | Mã mà khách nhập lúc thanh toán để được giảm giá | `"SALE50"` |
| `discount_value` | Số (Number), bắt buộc, tối thiểu 0 | Phần trăm giảm giá (không phải số tiền cố định — xem cách nó được dùng ở Phần 4) | `10` (nghĩa là giảm 10%) |
| `min_order_value` | Số (Number), bắt buộc, tối thiểu 0 | Đơn hàng phải có tổng tiền ít nhất bằng số này thì mã mới được áp dụng | `200000` (VNĐ) |
| `start_date` | Ngày giờ (Date), bắt buộc | Ngày mã bắt đầu có hiệu lực | `"2026-07-01T00:00:00.000Z"` |
| `end_date` | Ngày giờ (Date), bắt buộc | Ngày mã hết hiệu lực | `"2026-08-01T00:00:00.000Z"` |
| `usage_limit` | Số (Number), bắt buộc, tối thiểu 1 | Mã này được dùng tối đa bao nhiêu lần (tính trên toàn hệ thống, không phải theo từng khách) | `100` |
| `used_count` | Số (Number), mặc định `0` | Mã này ĐÃ được dùng bao nhiêu lần rồi | `37` |
| `status` | Chữ, chỉ được là 1 trong 2 giá trị cố định (`enum` khai báo ở `backend/src/enums/coupon.enum.ts`) | `"active"` = đang cho phép dùng; `"inactive"` = đã bị khoá/hết hiệu lực | `"active"` |

**Vì sao những ràng buộc này nằm ở Model?** Đây là các ràng buộc "mang tính cấu trúc" — luôn luôn đúng bất kể ai gọi, gọi lúc nào: một mã giảm giá luôn phải có mã, luôn phải có ngày bắt đầu/kết thúc, giá trị không được âm, mã không được trùng nhau. Mongoose (thư viện giúp Model nói chuyện với MongoDB) tự động kiểm tra các điều này **mỗi khi có ai gọi `.create()` hoặc `.save()`**, bất kể gọi từ controller nào — nên chỉ cần khai báo 1 lần ở đây là an toàn cho toàn bộ hệ thống, không ai "lách" được.

Còn những ràng buộc "còn hạn không", "còn lượt dùng không" thì Model **không** thể tự kiểm tra được — vì nó phụ thuộc vào **thời điểm hiện tại** (ngày giờ lúc gọi API, chứ không phải lúc lưu dữ liệu) và vào **quan hệ giữa 2 field** (`used_count` so với `usage_limit`). Mongoose schema không có cách khai báo "field A phải nhỏ hơn field B, so theo giờ hiện tại lúc đọc". Vì vậy các ràng buộc này được kiểm tra thủ công **ở Controller**, mỗi lần mã giảm giá được dùng — xem chi tiết ở Phần 4.

### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

1. **Model** nhận kết quả từ MongoDB (một mảng gồm tất cả document trong collection `coupons`) → trả về cho **Controller**.
2. **Controller** (`getAllCoupon`) gói mảng đó vào `{ success: true, result: [...] }`, gọi `res.json(...)` → Express biến nó thành JSON thật, gửi ngược qua Internet.
3. **Router** không làm gì thêm ở chặng về, response cứ thế đi thẳng ra ngoài.
4. Response tới `couponApi.js` — dòng `const response = await api.get(...)` giờ mới có giá trị, `response.data` chính là JSON `{ success: true, result: [...] }` vừa nhận.
5. `coupon.tsx` nhận kết quả, gọi `setCoupons(response.data.result || [])` — lệnh nói với React: *"dữ liệu đổi rồi, vẽ lại giao diện đi"*.
6. React vẽ lại `<Table columns={columns} dataSource={coupons} ... />` — mỗi coupon trở thành 1 dòng trong bảng, với các cột "Mã giảm giá", "Giá trị giảm", "Giá trị đơn hàng tối thiểu", "Thời gian hiệu lực", "Số lần sử dụng", "Hành động" (nút Sửa/Xoá).

Vậy là toàn bộ hành trình xem danh sách đã xong.

---

## Phần 4 — Nơi các RÀNG BUỘC HỢP LỆ được kiểm tra, và vì sao (phần quan trọng nhất của coupon)

Đây là điểm khác biệt lớn nhất giữa Coupon và các mục CRUD đơn giản khác (category, brand, tag): coupon không chỉ được "lưu và đọc", nó còn phải được **kiểm tra hợp lệ** ở nhiều thời điểm khác nhau trong vòng đời của nó.

### 4.1. Lúc TẠO mã mới (`createCoupon`) — kiểm tra đủ dữ liệu

File: `backend/src/controllers/coupon.controllers.ts`

```ts
const { coupon_code, discount_value, date_range, min_order_value, usage_limit, used_count, score } = req.body;

// Kiểm tra các trường bắt buộc
if (!coupon_code || !discount_value || !date_range || date_range.length !== 2) {
  res.status(400).json({ success: false, message: 'Thiếu các trường bắt buộc hoặc date_range không hợp lệ' });
  return;
}

const [start_date, end_date] = date_range; // Lấy giá trị start_date và end_date từ date_range
```

Frontend (form admin, xem 4.4) gửi lên 1 cặp ngày gộp chung trong 1 mảng tên `date_range` (ví dụ `["2026-07-01T00:00:00.000Z", "2026-08-01T00:00:00.000Z"]`) chứ không tách sẵn `start_date`/`end_date` riêng — vì ô nhập liệu trên form admin là 1 ô chọn khoảng ngày (`RangePicker`) duy nhất. Vì Model chỉ biết field tên `start_date`/`end_date` (không biết `date_range` là gì), Controller phải **tự tách `date_range` thành 2 field trước khi đưa cho Model** — đây là lý do phải kiểm tra thủ công ở Controller (`!date_range || date_range.length !== 2`) trước khi tách, để tránh code bị lỗi (ví dụ `undefined[0]`) nếu admin chưa chọn ngày.

Sau khi tách xong, `couponModel.create({...})` mới chạm tới Model — lúc này các ràng buộc "cấu trúc" ở Bước 6 (bắt buộc, không âm, không trùng mã...) mới thực sự được Mongoose kiểm tra lần cuối.

### 4.2. Lúc SỬA mã (`updateCoupon`) — tự động bật/tắt trạng thái theo ngày và số lượt dùng

```ts
// Tự động cập nhật status dựa trên ngày và số lần sử dụng
const currentDate = new Date();
if (
  (updateData.end_date && updateData.end_date < currentDate) ||
  (updateData.used_count ?? 0) >= (updateData.usage_limit ?? 0)
) {
  updateData.status = CouponStatus.INACTIVE;
} else if (
  updateData.start_date &&
  updateData.end_date &&
  updateData.start_date <= currentDate &&
  updateData.end_date >= currentDate
) {
  updateData.status = CouponStatus.ACTIVE;
}
```

Mỗi lần admin bấm "Lưu" để sửa một mã giảm giá, Controller so sánh ngày hết hạn (`end_date`) và số lượt đã dùng (`used_count`) với hiện tại **ngay tại thời điểm sửa**, rồi tự quyết định `status` nên là `active` hay `inactive` — admin không cần tự tay tick "khoá mã này". Đây là lý do vì sao logic này PHẢI nằm ở Controller chứ không phải Model: Model chỉ chạy khi có ai `.save()`/`.update()`, nó không có "đồng hồ" tự chạy nền để tự khoá mã đúng lúc nửa đêm khi mã hết hạn — mã chỉ được "chấm lại trạng thái" vào đúng những lúc có request chạm tới nó (sửa, hoặc áp dụng — xem 4.3).

### 4.3. Lúc ÁP DỤNG mã (`applyCoupon`, `POST /coupons/apply`) — kiểm tra đầy đủ 3 ràng buộc nghiệp vụ

```ts
const coupon = await couponModel.findOne({ coupon_code });
if (!coupon) { ...'Mã giảm giá không tồn tại'... }

const currentDate = new Date();
if (coupon.status !== CouponStatus.ACTIVE) {
  res.status(400).json({ success: false, message: 'Mã giảm giá không còn hiệu lực (trạng thái không hoạt động)' });
  return;
}

if (currentDate < coupon.start_date || currentDate > coupon.end_date) {
  coupon.status = CouponStatus.INACTIVE;
  await coupon.save();
  res.status(400).json({ success: false, message: 'Mã giảm giá không còn hiệu lực (hết hạn)' });
  return;
}

if (coupon.used_count >= coupon.usage_limit) {
  coupon.status = CouponStatus.INACTIVE;
  await coupon.save();
  res.status(400).json({ success: false, message: 'Mã giảm giá đã vượt quá số lần sử dụng cho phép' });
  return;
}

coupon.used_count += 1;
if (coupon.used_count >= coupon.usage_limit) {
  coupon.status = CouponStatus.INACTIVE;
}
await coupon.save();
```

Đây chính là nơi 3 ràng buộc "còn dùng được không" được kiểm tra tuần tự, mỗi cái để tránh một lỗi thực tế khác nhau:

| Ràng buộc kiểm tra | Vì sao cần |
|---|---|
| `coupon.status !== ACTIVE` | Tránh dùng mã mà admin đã chủ động khoá (ví dụ phát hiện mã bị lộ/lạm dụng) |
| `currentDate < start_date` hoặc `> end_date` | Tránh khách dùng mã **chưa tới ngày** hoặc **đã hết hạn** — ví dụ mã khuyến mãi Tết dùng lại vào tháng 6 |
| `used_count >= usage_limit` | Tránh mã bị dùng **vượt quá số lượt cho phép** — ví dụ mã chỉ dành cho 100 khách đầu tiên, khách thứ 101 không được dùng nữa |

Nếu qua hết cả 3 kiểm tra, mã mới được coi là hợp lệ: `coupon.used_count += 1` (tăng thêm 1 lượt đã dùng), rồi lưu lại. Đây là hành động **"tiêu" 1 lượt dùng của mã** — chỉ xảy ra ở bước cuối cùng này, sau khi đã chắc chắn mọi ràng buộc đều qua, để tránh trừ lượt dùng của một mã không hợp lệ.

> Ghi chú thực tế: route `POST /coupons/apply` (hàm `applyCoupon` ở trên) đã được định nghĩa đầy đủ trong `coupon.routes.ts`, nhưng khi rà lại toàn bộ frontend, không tìm thấy nơi nào trong giao diện thực sự gọi tới endpoint này. Nơi mã giảm giá **thực sự được kiểm tra và trừ lượt trong luồng đặt hàng hiện tại** là một đoạn code khác, nằm ngay trong lúc tạo đơn hàng — xem mục 4.4 dưới đây.

### 4.4. Coupon được dùng ở đâu trong luồng đặt hàng (checkout)?

Feature checkout/đặt hàng đầy đủ không thuộc phạm vi tài liệu này, nhưng vì user hỏi coupon được áp dụng ở đâu trong đó, đây là điểm chạm ngắn gọn:

- Ở trang thanh toán (`frontend_react/src/pages/payment/payment.tsx`), khi khách bấm "Áp dụng" mã giảm giá, code hiện tại tự lấy danh sách rồi tự so sánh ngày/`min_order_value`/`usage_limit` ngay trên trình duyệt (không gọi `POST /coupons/apply`). Đây chỉ là bước gợi ý/hiển thị cho khách biết trước — **không phải bước quyết định cuối cùng**, vì phía trình duyệt có thể bị sửa/qua mặt.
- Bước quyết định thật sự nằm ở **backend, lúc tạo đơn hàng**: file `backend/src/controllers/order.controllers.ts`, trong hàm tạo đơn hàng, khi đơn có kèm `couponID`:

```ts
if (isOrder && couponID) {
  const coupon = await couponModel.findById(couponID).session(session);
  if (!coupon) throw new Error('Không tìm thấy mã giảm giá');
  const currentDate = new Date();
  if (
    coupon.status !== CouponStatus.ACTIVE ||
    currentDate < coupon.start_date ||
    currentDate > coupon.end_date ||
    coupon.used_count >= coupon.usage_limit
  ) {
    throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn');
  }
  const discountPercentage = coupon.discount_value;
  discount = (subtotal * discountPercentage) / 100;
  await couponModel.findByIdAndUpdate(couponID, { $inc: { used_count: 1 } }, { session });
}
```

Đây mới là nơi **thật sự đáng tin cậy**: nó chạy y hệt 3 kiểm tra ở mục 4.3 (status/hạn dùng/số lượt), rồi mới tính số tiền giảm và cộng thêm 1 vào `used_count` bằng `$inc` — toàn bộ nằm trong một **transaction** (`session`, tạm hiểu: "gói tất cả các bước lưu dữ liệu của 1 đơn hàng lại làm một, nếu có bước nào lỗi thì huỷ hết, không để dữ liệu bị lưu dở dang") cùng lúc với việc tạo đơn hàng — để đảm bảo không bao giờ xảy ra tình trạng "đơn hàng được tạo nhưng quên trừ lượt dùng mã", hoặc ngược lại. Field `couponID` trên đơn hàng (`backend/src/models/order.model.ts`, dòng `couponID: { type: Schema.Types.ObjectId, ref: coupon, default: null }`) chỉ lưu "số căn cước" của coupon, không copy dữ liệu coupon vào đơn hàng.

### 4.5. So sánh nhanh: xem danh sách (Phần 3) vs. thêm/sửa/áp dụng (Phần 4)

Cùng đi qua các "trạm" App → Router → Controller → Model → Database giống Phần 3, chỉ khác:

1. **Phương thức HTTP khác nhau**: xem danh sách dùng `GET` (chỉ xin, không đổi gì); tạo/sửa dùng `POST`/`PATCH` (có gửi kèm dữ liệu trong "thân" request); áp dụng mã cũng là `POST` nhưng có thể làm thay đổi `used_count`/`status` của coupon đã có, chứ không tạo dòng mới.
2. **Bắt buộc "xuất trình thẻ" admin** với tạo/sửa/xoá (`verifyToken, requireAdmin`); riêng route "áp dụng mã" (`/coupons/apply`) chỉ cần đăng nhập thường (`verifyToken`), vì đây là hành động của khách hàng, không phải quản trị viên.
3. **Có bước kiểm tra ràng buộc nghiệp vụ** (hạn dùng, số lượt, trạng thái) mà việc xem danh sách không cần — như giải thích ở 4.1–4.4.

---

## Phần 5 — Giao diện form thêm/sửa ở admin (để hiểu vì sao dữ liệu gửi lên có dạng `date_range`)

File: `frontend_react/src/admin/coupon/coupon.tsx`, trong `Modal` chứa `Form`:

```tsx
<Form.Item label="Thời gian hiệu lực" name="date_range" ...>
  <RangePicker style={{ width: "100%" }} />
</Form.Item>
```

`RangePicker` (của thư viện giao diện antd) là 1 ô chọn "khoảng ngày" (chọn 1 lần ra cả ngày bắt đầu + ngày kết thúc), nên khi submit, Form gom lại thành 1 field duy nhất tên `date_range` chứa 2 giá trị ngày. Hàm `handleSave` xử lý trước khi gửi:

```tsx
const payload = {
  ...values,
  discount_value: Number(values.discount_value),
  date_range: values.date_range.map((date: moment.Moment) => date.toISOString()),
};

if (editingCoupon) {
  await couponApi.updateCoupon(editingCoupon._id, payload);
} else {
  await couponApi.createCoupon(payload);
}
```

Đây chính là lý do Controller (mục 4.1) phải tự tách `date_range` thành `start_date`/`end_date` — vì "hợp đồng dữ liệu" giữa frontend và backend đã được thiết kế vậy: frontend gửi gộp cho tiện nhập liệu, backend tách ra cho khớp với field thật trong Model.

Cũng lưu ý: ô nhập "Giá trị giảm (%)" trên form giới hạn `min={0} max={100}` — đây là giới hạn CHỈ Ở GIAO DIỆN (frontend), giúp admin không lỡ tay gõ số vô lý. Model ở backend (`discount_value: { min: [0, ...] }`) chỉ chặn số âm, KHÔNG chặn số lớn hơn 100 — nghĩa là nếu ai đó gọi thẳng vào API (bỏ qua giao diện admin) vẫn có thể tạo ra một coupon với `discount_value: 500`, backend sẽ không tự chặn. Đây là điểm cần biết nếu sau này muốn siết chặt thêm ràng buộc "không được giảm quá 100%" — nên thêm luôn ở Model (`max: [100, ...]`), không chỉ dựa vào giới hạn trên form.

---

## Phần 6 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu coupon (thêm field mới, ví dụ giảm theo số tiền cố định thay vì %) | `backend/src/models/coupon.model.ts` + `backend/src/interfaces/coupon.interface.ts` |
| Đổi logic tạo/sửa/xoá/áp dụng coupon | `backend/src/controllers/coupon.controllers.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào (public/đăng nhập/admin) | `backend/src/routes/coupon.routes.ts` |
| Đổi các giá trị cố định (`active`/`inactive`) | `backend/src/enums/coupon.enum.ts` |
| Đổi giao diện bảng danh sách + form thêm/sửa coupon ở admin | `frontend_react/src/admin/coupon/coupon.tsx` |
| Đổi cách gọi API từ admin (endpoint, method) | `frontend_react/src/api/couponApi.js` |
| Đổi logic áp dụng/kiểm tra mã lúc khách thanh toán | `frontend_react/src/pages/payment/payment.tsx` (kiểm tra tạm ở frontend) và `backend/src/controllers/order.controllers.ts` (kiểm tra thật, quyết định cuối cùng) |
| Đổi cách coupon gắn với đơn hàng | `backend/src/models/order.model.ts` (field `couponID`) |

---

## Phần 7 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin/gửi gì, ở đâu" — ví dụ `/api/v1/coupons`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới (hoặc thực hiện 1 hành động như "áp dụng mã"), PATCH = sửa, DELETE = xoá.
- **Middleware**: một hàm chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn...) — ví dụ `verifyToken`, `requireAdmin`.
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response — 200 ổn, 400 request sai/không hợp lệ (ví dụ mã giảm giá hết hạn), 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **JWT token**: chuỗi ký tự dài sinh ra lúc đăng nhập thành công, dùng như "vé" chứng minh "tôi đã đăng nhập, tôi là ai".
- **Schema**: bản thiết kế của Model, quy định 1 document có field gì, kiểu gì, ràng buộc gì (bắt buộc, không âm, duy nhất...).
- **Document**: 1 "dòng dữ liệu" trong MongoDB — ví dụ 1 mã `SALE50` cụ thể là 1 document trong collection `coupons`.
- **Collection**: tập hợp nhiều document cùng loại — collection `coupons` chứa tất cả mã giảm giá.
- **Enum**: một danh sách cố định các giá trị hợp lệ cho 1 field — `status` của coupon chỉ được là `active` hoặc `inactive`, không được là chữ khác.
- **Transaction / session**: gói nhiều bước ghi dữ liệu (ví dụ vừa tạo đơn hàng vừa trừ lượt dùng coupon) lại làm một khối duy nhất — nếu 1 bước lỗi, toàn bộ các bước khác cũng bị huỷ, tránh dữ liệu bị lưu dở dang.
- **Validation (kiểm tra hợp lệ)**: bước kiểm tra dữ liệu có hợp lý/còn dùng được không, trước khi cho phép thực hiện tiếp — với coupon là kiểm tra còn hạn, còn lượt, đúng trạng thái.

---

## Phần 8 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3–4)

```
┌─────────────┐      ┌──────────────┐      ┌──────────────────┐
│ coupon.tsx  │ ───▶ │ couponApi.js │ ───▶ │  index.ts (app)  │
│ (trang admin)│      │ (gói request) │      │  cửa chính backend│
└─────────────┘      └──────────────┘      └────────┬──────────┘

┌──────────────────────────────────────────────────────┘
▼
┌────────────────────┐    ┌─────────────────────────┐    ┌───────────────────┐
│ coupon.routes.ts    │ ─▶ │ coupon.controllers.ts    │ ─▶ │ coupon.model.ts    │
│ khớp URL, chọn hàm  │    │ xử lý logic + kiểm tra    │    │ nói chuyện với DB  │
│ (public/admin)      │    │ ràng buộc hợp lệ          │    │ + ràng buộc dữ liệu│
└────────────────────┘    └─────────────────────────┘    └─────────┬─────────┘
                                                                     ▼
                                                          ┌────────────────────┐
                                                          │ MongoDB (database)  │
                                                          │ collection "coupons"│
                                                          └─────────┬─────────┘
                                                                     │
◀────────────────────────────────────────────────────────────────────┘
   dữ liệu coupon đi ngược lại đúng đường trên, tới coupon.tsx → setCoupons() → hiện lên bảng
```

Tóm tắt 1 câu mỗi trạm (luồng xem danh sách ở trang admin):

1. **coupon.tsx** — trang admin vừa mở, tự gọi xin danh sách coupon.
2. **couponApi.js** — đóng gói yêu cầu thành 1 request `GET`, gửi tới `/v1/coupons`.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, rồi chuyển cho đúng router.
4. **coupon.routes.ts** — dò đúng địa chỉ `/coupons` (không cần đăng nhập với GET; cần admin với POST/PATCH/DELETE), giao cho hàm tương ứng.
5. **coupon.controllers.ts** — hàm `getAllCoupon` nhờ Model lấy toàn bộ coupon, gói kết quả thành `{ success, result }`. Với tạo/sửa/áp dụng, đây cũng là nơi kiểm tra ràng buộc "còn hạn/còn lượt/đúng trạng thái".
6. **coupon.model.ts** — khai báo và tự kiểm tra ràng buộc "cấu trúc" (bắt buộc, không âm, mã không trùng) mỗi khi lưu; dịch câu lệnh Controller thành lệnh MongoDB hiểu được.
7. **MongoDB** — tìm/lưu trong collection `coupons`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua (Model → Controller → ra khỏi backend → `couponApi.js` → `coupon.tsx`), React vẽ lại bảng danh sách mã giảm giá.
9. **Riêng lúc đặt hàng** — coupon không đi qua `coupon.controllers.ts` nữa, mà được `order.controllers.ts` tự kiểm tra lại (status/hạn dùng/số lượt) và trừ `used_count` ngay trong lúc tạo đơn hàng, để đảm bảo dữ liệu luôn khớp nhau.

Toàn bộ các bước này (trừ lúc chờ admin thao tác) thường chỉ mất vài chục tới vài trăm mili-giây.
