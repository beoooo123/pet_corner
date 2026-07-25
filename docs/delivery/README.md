# Delivery — Phương thức giao hàng (trang quản trị) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin mở trang "Phương thức vận chuyển" trong khu quản trị (admin) của pet-corner: xem danh sách, thêm mới, sửa, xoá một phương thức giao hàng (ví dụ "Giao hàng tiêu chuẩn", "Giao hàng nhanh"...). Viết cho người **chưa biết gì về lập trình** — cách đọc và cấu trúc giống hệt `docs/banner/README.md`, nếu bạn đã đọc file đó thì các khái niệm nền tảng ở Phần 1 dưới đây sẽ quen thuộc, đọc lướt qua cũng được.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng (ở đây là admin) ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt (Chrome, Cốc Cốc...) của người dùng |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/delivery` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, đi lấy nguyên liệu (dữ liệu), nấu (xử lý), rồi trả món (trả kết quả) |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một phương thức giao hàng trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với tủ lạnh (database) |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu được lưu trữ thật sự, tồn tại lâu dài, không mất khi tắt máy |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Một cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để hai bên (backend/frontend) hiểu nhau |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại.

**Delivery ở đây là gì?** Đây là bảng dữ liệu quản lý **các phương thức giao hàng mà shop cung cấp** — ví dụ "Giao hàng tiêu chuẩn" (phí 20.000đ, giao trong 3 ngày), "Giao hàng nhanh" (phí 40.000đ, giao trong 1 ngày). Đây **không phải** là hệ thống theo dõi shipper/đơn vị vận chuyển thật (như GHN, GHTK) đang giao tới đâu — nó chỉ là danh sách các "lựa chọn giao hàng" mà admin định nghĩa sẵn, để khi khách đặt hàng, khách chọn 1 trong các phương thức này, và Order (đơn hàng) lưu lại `delivery_id` — tức là "tham chiếu" tới đúng phương thức đã chọn trong bảng này (tài liệu về Order được viết riêng, ở đây chỉ nhắc qua).

---

## Phần 2 — Bức tranh tổng thể (chỉ 1 dòng)

```
Trình duyệt (delivery.tsx, trang admin)  →  gọi API  →  Backend (app→router→controller→model)  →  Database (MongoDB)
Database  →  trả dữ liệu  →  Model  →  Controller  →  Router  →  Backend  →  Trình duyệt  →  hiện bảng danh sách phương thức giao hàng
```

Bây giờ ta đi từng bước thật chi tiết, đúng theo thứ tự xảy ra trong thực tế.

---

## Phần 3 — Từng bước thật, từ lúc admin mở trang tới lúc thấy bảng danh sách

### Bước 1 — Admin mở trang "Phương thức vận chuyển"

File: `frontend_react/src/admin/delivery/delivery.tsx`

Ngay khi trang này vừa hiện ra, React tự động chạy đoạn code sau **một lần duy nhất** (nhờ `useEffect`):

```tsx
useEffect(() => {
  fetchDeliveries();
}, []);
```

Hàm `fetchDeliveries` gọi:

```tsx
const response = await deliveryApi.getAllDelivery();
const fetched = (response.data.data || []).map((d: any) => ({
  key: d._id,
  _id: d._id,
  delivery_name: d.delivery_name,
  description: d.description,
  delivery_fee: d.delivery_fee,
  estimated_delivery_time: d.estimated_delivery_time,
  status: d.status,
}));
setDeliveries(fetched);
setFilteredDeliveries(fetched);
```

`deliveryApi.getAllDelivery()` chính là hành động "đưa đơn gọi món cho lễ tân" — trang admin đang xin backend: *"cho tôi TOÀN BỘ danh sách phương thức giao hàng"*. Sau khi có dữ liệu, nó gọi `setDeliveries(...)` — lệnh nói với React: *"dữ liệu đổi rồi, vẽ lại giao diện đi"* — bảng (`Table`) trên màn hình được vẽ lại với dữ liệu thật.

### Bước 2 — `deliveryApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/deliveryApi.js`

```js
const deliveryApi = {
  getAllDelivery: async () => {
    const response = await api.get("/v1/delivery");
    return { data: response.data };
  },
  create: async (data) => {
    const response = await api.post("/v1/delivery", data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/v1/delivery/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/v1/delivery/${id}`);
    return response.data;
  },
};
```

Bốn hàm này tương ứng đúng 4 việc admin có thể làm: xem danh sách (`GET`, "chỉ xin dữ liệu, không thay đổi gì"), tạo mới (`POST`, "tạo thêm 1 dòng dữ liệu mới"), sửa (`PATCH`, "sửa 1 phần dữ liệu của dòng đã có"), xoá (`DELETE`, "xoá hẳn 1 dòng"). `api` ở đây là công cụ có sẵn (thư viện `axios`) tự nối địa chỉ này với địa chỉ gốc của backend để ra URL đầy đủ, ví dụ `http://localhost:5000/api/v1/delivery`.

### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`

```ts
import deliveryRouter from './routes/delivery.routes.js';
...
app.use('/api/v1', deliveryRouter);
```

Đây là **cửa chính** của cả backend — mọi request, bất kể xin gì, đều phải đi qua file này đầu tiên (chạy qua các "trạm kiểm tra" chung như `cors`, `express.json()`, `logger('dev')`...). Dòng `app.use('/api/v1', deliveryRouter)` nói: *"Bất kỳ request nào có địa chỉ bắt đầu bằng `/api/v1`, hãy đưa cho `deliveryRouter` xem có phải việc của nó không."*

### Bước 4 — Router (lễ tân) khớp đúng địa chỉ và chuyển tiếp

File: `backend/src/routes/delivery.routes.ts`

```ts
deliveryRouter.get('/delivery', getAllDeliveries);
deliveryRouter.get('/delivery/:id', getDeliveryById);
deliveryRouter.post('/delivery', verifyToken, requireAdmin, insertDelivery);
deliveryRouter.patch('/delivery/:id', verifyToken, requireAdmin, updateDelivery);
deliveryRouter.delete('/delivery/:id', verifyToken, requireAdmin, deleteDelivery);
```

`deliveryRouter` nhận request có URL đầy đủ `/api/v1/delivery`, tự bỏ phần `/api/v1` (đã xử lý ở bước 3), còn lại `/delivery`, khớp đúng dòng đầu tiên → giao việc cho hàm `getAllDeliveries`.

Điều đáng chú ý: dòng `GET /delivery` và `GET /delivery/:id` **không có** `verifyToken, requireAdmin` — nghĩa là ai cũng gọi được để XEM, không cần đăng nhập. Ngược lại 3 dòng còn lại (tạo/sửa/xoá) đều có 2 "trạm kiểm tra" này chặn trước:

- `verifyToken` (file `backend/src/middlewares/verifyToken.ts`) — giống bảo vệ kiểm tra "vé vào cửa": đọc header `Authorization: Bearer <token>` trên request, giải mã token đó (JWT — xem Glossary), nếu token hợp lệ và tìm thấy đúng user trong database thì cho đi tiếp (`next()`), sai/thiếu token thì trả lỗi `401` (chưa đăng nhập) ngay lập tức, Controller không bao giờ chạy tới.
- `requireAdmin` (file `backend/src/middlewares/protectRoute.ts`) — kiểm tiếp: user vừa xác thực ở trên có `role` là `admin` không, không phải thì trả lỗi `403` (không đủ quyền).

```ts
export const requireAdmin = (req, res, next): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Bạn chưa đăng nhập' });
    return;
  }
  if (req.user.role !== UserRoles.ADMIN) {
    res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
    return;
  }
  next();
};
```

Đây là lý do: khách vãng lai (nếu tương lai có trang chọn phương thức giao hàng khi đặt hàng) chỉ cần XEM danh sách được, còn việc thêm/sửa/xoá phương thức giao hàng chỉ admin đã đăng nhập mới làm được.

### Bước 5 — Controller (đầu bếp) thực sự "nấu"

File: `backend/src/controllers/delivery.controllers.ts`

Có 5 hàm, mỗi hàm lo đúng 1 việc. Hàm quan trọng nhất khi mở trang là `getAllDeliveries`:

```ts
export const getAllDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const deliveries = await deliveryModel.find();
    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching deliveries',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
```

Nó nhờ `deliveryModel` (Model) đi lấy hộ: *"tìm TẤT CẢ phương thức giao hàng, không lọc gì cả"* (khác với banner — banner có 1 hàm riêng chỉ lấy cái đang `active` cho trang chủ; delivery ở đây chỉ có 1 hàm lấy tất cả, dùng chung cho cả trang admin). Sau đó gói kết quả thành JSON theo khuôn quy ước chung của cả dự án: `{ success: true, count: ..., data: [...] }`.

Hàm tạo mới (`insertDelivery`) có kiểm tra dữ liệu bắt buộc trước khi lưu:

```ts
const { delivery_name, description, delivery_fee, estimated_delivery_time, status } = req.body;

if (!delivery_name || !delivery_fee || !estimated_delivery_time) {
  res.status(400).json({
    success: false,
    message: 'Delivery name, delivery fee, and estimated delivery time are required'
  });
  return;
}

const delivery = new deliveryModel({ delivery_name, description, delivery_fee, estimated_delivery_time, status });
const savedDelivery = await delivery.save();
```

Nếu admin bỏ trống tên phương thức, phí, hoặc ngày dự kiến giao — Controller chặn lại ngay, trả lỗi `400` ("request sai/thiếu dữ liệu"), không cho lưu vào database một bản ghi thiếu thông tin.

Hàm sửa (`updateDelivery`) dùng `findByIdAndUpdate` với `{ new: true, runValidators: true }` — nghĩa là: cập nhật xong thì trả về bản ghi MỚI (không phải bản ghi cũ trước khi sửa), và bắt Model kiểm tra lại các ràng buộc trong schema (ví dụ `delivery_fee` phải có) trước khi lưu. Hàm xoá (`deleteDelivery`) dùng `findByIdAndDelete` — xoá thẳng, không có cơ chế "xoá mềm" (không giữ lại bản ghi đã xoá).

### Bước 6 — Model (công thức + tủ lạnh) — nơi thật sự chạm vào database

File: `backend/src/models/delivery.model.ts`

```ts
const deliverySchema: Schema<IDelivery> = new Schema<IDelivery>(
  {
    delivery_name: { type: String, required: true },
    description: { type: String, default: '' },
    delivery_fee: { type: Number, required: true, default: 0 },
    estimated_delivery_time: { type: Date },
    status: { type: String, enum: DeliveryStatus, default: DeliveryStatus.PENDING }
  },
  { timestamps: true }
);
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra) | "Số căn cước" duy nhất của phương thức giao hàng đó, không dòng nào trùng — đây chính là cái `delivery_id` mà Order sẽ tham chiếu tới khi khách chọn phương thức này | `"66f1a2b3c4d5e6f7a8b9c0d1"` |
| `delivery_name` | Chữ (String), bắt buộc | Tên phương thức, hiển thị cho admin (và về sau cho khách chọn lúc đặt hàng) | `"Giao hàng tiêu chuẩn"` |
| `description` | Chữ (String), mặc định để trống | Mô tả thêm, ví dụ nói rõ thời gian giao | `"Giao trong 2-3 ngày"` |
| `delivery_fee` | Số (Number), bắt buộc, mặc định `0` | Phí vận chuyển tính bằng VNĐ, `0` nghĩa là miễn phí | `20000` |
| `estimated_delivery_time` | Ngày giờ (Date) | Một MỐC NGÀY THAM KHẢO cho phương thức này (không phải "ngày giao của 1 đơn hàng cụ thể") — trong code có ghi chú `// Corrected typo here`, tức trước đây field này từng bị đặt tên/kiểu sai, đã được sửa lại | `"2026-07-20T00:00:00.000Z"` |
| `status` | Chữ, chỉ được là 1 trong 5 giá trị cố định (`enum`, xem file `delivery.enum.ts`) | Trạng thái của BẢN GHI phương thức giao hàng này — xem lưu ý bên dưới | `"pending"` |
| `createdAt` / `updatedAt` | Ngày giờ, tự MongoDB điền (nhờ dòng `{ timestamps: true }`) | Phương thức này được tạo/sửa lúc nào | `"2026-07-15T17:57:56.425Z"` |

**Lưu ý quan trọng về field `status`** — dễ gây hiểu lầm: enum của nó (`backend/src/enums/delivery.enum.ts`) là:

```ts
export enum DeliveryStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPING = 'shipping',
  COMPLETED = 'completed',
  CANCELED = 'cancelled'
}
```

Đây là các nhãn nghe giống "trạng thái của một ĐƠN HÀNG đang giao" (chờ xử lý/đã xác nhận/đang giao/hoàn thành/đã hủy) hơn là trạng thái của một "phương thức giao hàng" (một phương thức thường chỉ cần "đang bật/đang tắt" để admin chọn cho phép dùng hay không). Trong giao diện admin (`delivery.tsx`), 5 giá trị này được hiển thị bằng nhãn tiếng Việt:

```ts
const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
```

Nói cách khác: field `status` này đang tồn tại trên BẢN GHI "phương thức giao hàng" (ví dụ "Giao hàng tiêu chuẩn") nhưng mang ý nghĩa như thể nó mô tả trạng thái của một đơn giao hàng cụ thể. Đây là điểm cần lưu ý khi đọc dữ liệu — không phải lỗi khiến hệ thống chạy sai, chỉ là tên gọi/enum dễ gây nhầm lẫn giữa "trạng thái của phương thức" và "trạng thái của một đơn giao hàng thật".

Khi Controller gọi `deliveryModel.find()`, Model dịch câu đó thành câu lệnh MongoDB hiểu được, lấy TOÀN BỘ document trong collection `delivery`, trả về một mảng.

### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

1. **Model** nhận kết quả từ MongoDB → trả về cho **Controller** dưới dạng mảng JavaScript.
2. **Controller** (`getAllDeliveries`) gói mảng đó vào `{ success: true, count, data: [...] }`, gọi `res.json(...)` → Express biến nó thành JSON thật và gửi ngược qua Internet.
3. **Router** không làm gì thêm ở chặng về.
4. Response tới `deliveryApi.js` — `response.data` chính là JSON vừa nhận.
5. `delivery.tsx` nhận `response.data.data`, map lại thành mảng `Delivery` gọn hơn (chỉ giữ field cần dùng), gọi `setDeliveries(fetched)` và `setFilteredDeliveries(fetched)`.
6. React vẽ lại `Table` (bảng của thư viện Ant Design), mỗi dòng là 1 phương thức giao hàng, cột "Trạng thái" hiển thị bằng `<Tag color="blue">{STATUS_LABELS[status] || status}</Tag>` — tức tra bảng nhãn tiếng Việt ở trên, không có thì hiện nguyên chữ tiếng Anh.

Vậy là toàn bộ hành trình xem danh sách đã xong.

---

## Phần 4 — Luồng khi admin TẠO MỚI / SỬA / XOÁ (khác gì so với luồng xem ở trên?)

Về cơ bản đi qua đúng các "trạm" giống Phần 3 (app → router → controller → model → database), chỉ khác vài điểm:

1. **Bắt buộc đăng nhập admin** — 3 route này đều có `verifyToken, requireAdmin` chặn trước Controller (xem Bước 4). Route xem (`GET`) thì không.
2. **Không có upload ảnh** — khác với banner, delivery không có field ảnh, nên frontend gửi thẳng JSON thường (không cần `FormData`), Controller cũng không có bước gọi Cloudinary.
3. **Form phía admin xử lý ngày giờ trước khi gửi** — `estimated_delivery_time` trên giao diện là ô chọn ngày (`DatePicker` của Ant Design, giá trị nội bộ là đối tượng `dayjs`), trước khi gửi lên backend, `delivery.tsx` chuyển nó thành chuỗi chuẩn ISO bằng `.toISOString()`:
   ```tsx
   await deliveryApi.create({
     ...values,
     estimated_delivery_time: values.estimated_delivery_time?.toISOString(),
   });
   ```
   Lý do: backend/MongoDB lưu `Date` theo chuẩn ISO, còn `DatePicker` trên giao diện làm việc với định dạng khác (`dayjs`), nên phải "dịch" giữa 2 định dạng trước khi gửi đi.
4. **Xoá là xoá thật** — bấm nút xoá, `delivery.tsx` hiện `Modal.confirm` hỏi lại admin cho chắc, xác nhận xong mới gọi `deliveryApi.delete(record._id)` → Controller gọi `deliveryModel.findByIdAndDelete(...)` → bản ghi bị xoá vĩnh viễn khỏi MongoDB, không có cách khôi phục qua giao diện.
5. **Sửa xong load lại toàn bộ danh sách** — cả 3 hành động tạo/sửa/xoá, sau khi backend trả thành công, `delivery.tsx` đều gọi lại `fetchDeliveries()` để lấy danh sách mới nhất từ database, thay vì tự sửa mảng trong bộ nhớ trình duyệt — đảm bảo giao diện luôn khớp với dữ liệu thật.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu delivery (thêm field mới, đổi kiểu) | `backend/src/models/delivery.model.ts` + `backend/src/interfaces/delivery.interface.ts` |
| Đổi danh sách trạng thái (`status`) cho phép | `backend/src/enums/delivery.enum.ts` |
| Đổi logic thêm/sửa/xoá/lấy danh sách delivery | `backend/src/controllers/delivery.controllers.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào (thêm/bớt yêu cầu đăng nhập) | `backend/src/routes/delivery.routes.ts` |
| Đổi giao diện bảng + form thêm/sửa phương thức giao hàng ở admin | `frontend_react/src/admin/delivery/delivery.tsx` |
| Đổi nhãn tiếng Việt hiển thị cho từng trạng thái | `frontend_react/src/admin/delivery/delivery.tsx` (biến `STATUS_LABELS`) |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/deliveryApi.js` |
| Đổi đường dẫn trang admin (URL, menu điều hướng) | `frontend_react/src/App.tsx` (route `deliveries`), `frontend_react/src/components/layout/AdminLayout.tsx` |
| Đổi cách kiểm tra quyền admin trước khi cho thêm/sửa/xoá | `backend/src/middlewares/verifyToken.ts`, `backend/src/middlewares/protectRoute.ts` |

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/delivery`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa, DELETE = xoá.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn...) — ở đây là `verifyToken` và `requireAdmin`.
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response, nói tình trạng: 200 ổn, 400 request sai định dạng/thiếu dữ liệu, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **JWT token**: một chuỗi ký tự dài, được sinh ra lúc đăng nhập thành công, dùng như "vé" để các request sau chứng minh "tôi đã đăng nhập, tôi là ai".
- **Schema**: bản thiết kế của Model, quy định 1 document (1 dòng dữ liệu) có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB (tương đương 1 dòng trong bảng Excel) — ví dụ 1 phương thức giao hàng cụ thể là 1 document trong collection `delivery`.
- **Collection**: tập hợp nhiều document cùng loại (tương đương 1 sheet trong Excel) — ví dụ collection `delivery` chứa tất cả phương thức giao hàng.
- **enum**: một danh sách giá trị CỐ ĐỊNH cho phép — field `status` chỉ được nhận đúng 1 trong 5 chữ khai báo trong `delivery.enum.ts`, không được tự bịa giá trị khác.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│  delivery.tsx  │ ─▶ │  deliveryApi.js   │ ─▶ │  index.ts (app)   │
│ (trang admin)   │    │ (gói request)      │    │  cửa chính backend│
└────────────────┘    └──────────────────┘    └────────┬──────────┘

┌──────────────────────────────────────────────────────┘
▼
┌─────────────────────┐    ┌──────────────────────────┐    ┌────────────────────┐
│ delivery.routes.ts   │ ─▶ │ delivery.controllers.ts   │ ─▶ │ delivery.model.ts   │
│ khớp URL, kiểm quyền  │    │ xử lý logic, gọi Model     │    │ nói chuyện với DB   │
└─────────────────────┘    └──────────────────────────┘    └─────────┬──────────┘
                                                                       ▼
                                                            ┌────────────────────┐
                                                            │ MongoDB (database)  │
                                                            │ collection "delivery"│
                                                            └─────────┬──────────┘
                                                                       │
◀──────────────────────────────────────────────────────────────────────┘
   dữ liệu delivery đi ngược lại đúng đường trên, tới delivery.tsx → setDeliveries() → hiện lên Table
```

Tóm tắt 1 câu mỗi trạm:

1. **delivery.tsx** — trang admin vừa mở, tự gọi xin toàn bộ danh sách phương thức giao hàng.
2. **deliveryApi.js** — đóng gói yêu cầu thành request `GET/POST/PATCH/DELETE` tương ứng, gửi tới địa chỉ `/api/v1/delivery`.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, chuyển cho đúng router theo tiền tố URL.
4. **delivery.routes.ts** — dò đúng địa chỉ, XEM thì cho qua tự do, còn TẠO/SỬA/XOÁ thì bắt qua 2 trạm `verifyToken` + `requireAdmin` trước khi tới Controller.
5. **delivery.controllers.ts** — mỗi hàm lo đúng 1 việc (lấy tất cả / lấy 1 / tạo / sửa / xoá), có kiểm tra dữ liệu bắt buộc khi tạo mới, gói kết quả thành `{ success, data }`.
6. **delivery.model.ts** — dịch yêu cầu đó thành câu lệnh MongoDB hiểu được, lấy đúng field (`delivery_name`, `description`, `delivery_fee`, `estimated_delivery_time`, `status`...).
7. **MongoDB** — tìm/thêm/sửa/xoá trong collection `delivery`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua (Model → Controller → ra khỏi backend → `deliveryApi.js` → `delivery.tsx`), React vẽ lại `Table` với dữ liệu thật, kèm thông báo thành công/lỗi (`notification`).

Toàn bộ hành trình này thường chỉ mất vài chục tới vài trăm mili-giây.
