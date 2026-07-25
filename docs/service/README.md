# Quản lý dịch vụ (Service) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin mở trang "Quản lý dịch vụ" trong khu quản trị (ví dụ dịch vụ tắm, cắt tỉa lông cho thú cưng) để xem/thêm/sửa/xoá. Viết cho người **chưa biết gì về lập trình**, nên phần đầu sẽ giải thích vài khái niệm nền tảng trước, sau đó đi vào từng file code thật, theo đúng thứ tự nó chạy.

### Service khác Booking ở chỗ nào? (đọc trước khi vào chi tiết)

Đây là 2 tài liệu riêng vì 2 luồng làm 2 việc khác nhau, nhưng liên quan chặt tới nhau:

- **Service (tài liệu này)** = "Menu" — admin định nghĩa **có những dịch vụ gì đang được cung cấp**: tên, giá, thời lượng, mô tả, đang mở hay tạm khoá. Đây là dữ liệu GỐC.
- **Booking** (xem `docs/booking/README.md`) = "Đơn gọi món" — khách chọn MỘT dịch vụ có sẵn trong Service, rồi đặt lịch (ngày giờ, con vật nào). Booking không tự tạo ra dịch vụ, nó chỉ **tham chiếu tới** 1 Service đã tồn tại (qua field `serviceId`).

Nói cách khác: Service trả lời câu hỏi *"có những dịch vụ gì để đặt?"*, còn Booking trả lời câu hỏi *"khách nào đặt dịch vụ nào, lúc nào?"*. Nếu admin xoá hoặc khoá (`inactive`) một Service, khách sẽ không thấy dịch vụ đó nữa ở trang đặt lịch (`getServiceActive` chỉ trả về dịch vụ `active` — xem Bước 5), nhưng các booking CŨ đã tạo trước đó vẫn giữ nguyên (Booking chỉ lưu `serviceId`, không copy dữ liệu Service qua).

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng** (giống cách giải thích trong `docs/banner/README.md`):

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng/nhân viên ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt (Chrome, Cốc Cốc...) của người dùng |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/services` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, đi lấy nguyên liệu (dữ liệu), nấu (xử lý), rồi trả món (trả kết quả) |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một dịch vụ trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với tủ lạnh (database) |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu được lưu trữ thật sự, tồn tại lâu dài, không mất khi tắt máy |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Một cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để hai bên (backend/frontend) hiểu nhau |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại.

---

## Phần 2 — Bức tranh tổng thể (chỉ 1 dòng)

```
Trình duyệt (service.tsx của admin)  →  gọi API  →  Backend (index.ts→router→controller→model)  →  Database (MongoDB)
Database  →  trả dữ liệu  →  Model  →  Controller  →  Router  →  Backend  →  Trình duyệt  →  hiện bảng dịch vụ lên màn hình
```

Bây giờ ta đi từng bước thật chi tiết, đúng theo thứ tự xảy ra trong thực tế, lấy ví dụ luồng **xem danh sách dịch vụ** (luồng thường chạy đầu tiên khi mở trang).

---

## Phần 3 — Từng bước thật, từ lúc admin mở trang "Quản lý dịch vụ" tới lúc thấy bảng dịch vụ

### Bước 1 — Admin mở trang quản lý dịch vụ

File: `frontend_react/src/admin/service/service.tsx`

Ngay khi trang vừa hiện ra, React (thư viện dựng giao diện) tự động chạy đoạn code sau **một lần duy nhất** (nhờ `useEffect`):

```tsx
const fetchServices = async () => {
  setLoading(true);
  try {
    const { data } = await serviceApi.getAllService();
    const fetchedServices = data.result.map((service: any) => ({
      key: service._id,
      _id: service._id,
      service_name: service.service_name || 'Chưa đặt tên dịch vụ',
      description: service.description || 'Chưa đặt mô tả',
      service_price: service.service_price || 0,
      duration: service.duration || 0,
      status: service.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động',
    }));
    setServices(fetchedServices);
    setFilteredServices(fetchedServices); 
  } catch (error) { ... }
};
fetchServices();
```

`serviceApi.getAllService()` chính là hành động "đưa đơn gọi món cho lễ tân" — trang quản lý đang xin backend: *"cho tôi TOÀN BỘ danh sách dịch vụ, kể cả đang tạm khoá"*. Sau khi có kết quả, nó không hiển thị y nguyên mà "dịch" lại cho dễ đọc — ví dụ `status: 'active'` được đổi thành chữ tiếng Việt `'Hoạt động'` để hiện lên bảng, và nếu dịch vụ nào chưa có tên/mô tả thì hiện chữ mặc định `'Chưa đặt tên dịch vụ'`.

### Bước 2 — `serviceApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/serviceApi.js`

```js
getAllService: async () => {
  const response = await api.get("/v1/services");
  return { data: response.data };
},
```

Dòng này gửi một request kiểu `GET` (nghĩa là "chỉ xin dữ liệu, không thay đổi gì") tới địa chỉ `/v1/services`. `api` ở đây là một công cụ có sẵn (thư viện `axios`) biết cách nối địa chỉ này với địa chỉ gốc của backend để ra được URL đầy đủ, ví dụ `http://localhost:5000/api/v1/services`.

Request này đi qua Internet (hoặc qua mạng máy nếu chạy local), tới đúng cái máy đang chạy backend.

### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`

Đây là **cửa chính** của cả backend — mọi request, bất kể xin gì, đều phải đi qua file này đầu tiên. Dòng liên quan tới service:

```ts
import serviceRouter from './routes/service.routes.js';
...
app.use('/api/v1', serviceRouter);
```

Dòng này nói: *"Bất kỳ request nào có địa chỉ bắt đầu bằng `/api/v1`, hãy đưa cho `serviceRouter` xem có phải việc của nó không."* (Có rất nhiều router khác tương tự cho banner, product, category... — mỗi router chỉ lo một loại dữ liệu.) Trước đó, request cũng đi qua các "trạm kiểm tra" chung như `express.json()` (đọc phần dữ liệu gửi kèm), `cors`, `logger` — giống hệt luồng đã giải thích ở `docs/banner/README.md` Phần 3 Bước 3, không lặp lại chi tiết ở đây.

### Bước 4 — Router (lễ tân) khớp đúng địa chỉ và chuyển tiếp

File: `backend/src/routes/service.routes.ts`

`serviceRouter` nhận request có URL đầy đủ `/api/v1/services`, tự bỏ phần `/api/v1` (đã bị xử lý ở bước 3), còn lại `/services`, rồi dò trong danh sách các "địa chỉ nó biết":

```ts
serviceRouter.get('/services', verifyToken, getAllServices); // Lấy tất cả dịch vụ
serviceRouter.post('/services', createService); // Tạo mới một dịch vụ
serviceRouter.get('/services/status/active', getServiceActive);
serviceRouter.get('/services/:id', getServiceById);
serviceRouter.patch('/services/:id', verifyToken, requireAdmin, updateService); // Cập nhật dịch vụ theo serviceID
serviceRouter.delete('/services/:id', verifyToken, requireAdmin, deleteService);
```

Nó thấy khớp đúng dòng `GET /services` → giao việc cho hàm `getAllServices`.

Vài điểm đáng chú ý về "trạm kiểm tra" trước mỗi hàm:
- `GET /services` (lấy TẤT CẢ, kể cả `inactive`) chỉ có `verifyToken` — nghĩa là phải đăng nhập, nhưng KHÔNG bắt buộc phải là admin (không có `requireAdmin`).
- `GET /services/status/active` và `GET /services/:id` **không có trạm kiểm tra nào** — ai cũng gọi được, không cần đăng nhập. Đây chính là 2 địa chỉ mà trang đặt lịch cho khách (`services.tsx` ở `frontend_react/src/pages/services/`) dùng để hiển thị menu dịch vụ công khai.
- `POST /services` (tạo mới) **không có** `verifyToken`/`requireAdmin` — hiện ai gọi đúng địa chỉ này cũng tạo được dịch vụ mới, không bắt buộc phải đăng nhập admin. Đây là điểm khác với banner (nơi tạo/sửa/xoá đều bắt buộc `verifyToken, requireAdmin`) — ghi lại ở Phần 5 như một điều cần lưu ý, không phải đã sửa.
- `PATCH /services/:id` và `DELETE /services/:id` (sửa/xoá) đều có đủ `verifyToken, requireAdmin` — phải đăng nhập VÀ phải là admin mới sửa/xoá được.

> Giống banner: dòng `/services/status/active` phải viết TRƯỚC dòng `/services/:id`, vì `:id` là "ô trống nhận bất kỳ chữ gì" — nếu để `:id` lên trước, hệ thống sẽ hiểu lầm `status` chính là 1 `id`.

### Bước 5 — Controller (đầu bếp) thực sự "nấu"

File: `backend/src/controllers/service.controllers.ts`, hàm `getAllServices`:

```ts
export const getAllServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await serviceModel.find();
    res.status(200).json({ success: true, result });
  } catch (error) {
    ...
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
```

Controller không tự lưu trữ dữ liệu, mà nhờ `serviceModel` (Model, xem bước 6) đi lấy hộ. Ở đây nó yêu cầu Model: *"tìm TẤT CẢ document trong collection `services`, không lọc gì cả"* (khác với banner, nơi `getBannersActive` có lọc theo `status`). Sau khi có kết quả, nó gói lại thành JSON `{ success: true, result: [...] }` (chú ý: field tên là `result`, không phải `data` như banner — đây là lý do phía frontend phải đọc `data.result` chứ không phải `data.data`), rồi `res.status(200)` báo "thành công".

Trang quản lý admin dùng đúng hàm này (`GET /services`) để hiển thị TẤT CẢ dịch vụ kể cả đang `inactive`, để admin còn bật lại được.

### Bước 6 — Model (công thức + tủ lạnh) — nơi thật sự chạm vào database

File: `backend/src/models/service.model.ts`

Model là bản "khai báo" — nó định nghĩa một dịch vụ trong database gồm đúng những field nào, kiểu dữ liệu gì:

```ts
const serviceSchema: Schema<IService> = new Schema<IService>(
  {
    service_name: { type: String, required: true, default: '' },
    description: { type: String, default: '' },
    duration: { type: Number, required: true, default: 0 },
    service_price: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: Object.values(ServiceStatus).filter((value) => typeof value === 'string'),
      default: ServiceStatus.ACTIVE
    }
  },
  { timestamps: true }
);
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra) | "Số căn cước" duy nhất của dịch vụ đó, không dịch vụ nào trùng | `"6a57ca2411bb5ed75eb46fcb"` |
| `service_name` | Chữ (String), bắt buộc | Tên dịch vụ, hiện ra cho khách chọn lúc đặt lịch | `"Tắm và sấy lông cho chó"` |
| `description` | Chữ (String), có thể để trống | Mô tả chi tiết dịch vụ gồm những gì | `"Tắm bằng sữa tắm chuyên dụng, sấy khô, chải lông"` |
| `duration` | Số (Number), bắt buộc | Thời lượng thực hiện dịch vụ, tính theo phút | `60` |
| `service_price` | Số (Number), bắt buộc | Giá dịch vụ, tính theo VNĐ | `150000` |
| `status` | Chữ, chỉ được là 1 trong 2 giá trị cố định (`enum` trong `backend/src/enums/service.enum.ts`) | `"active"` = đang mở cho khách đặt lịch; `"inactive"` = admin tạm khoá, khách không thấy nữa ở trang đặt lịch | `"active"` |
| `createdAt` / `updatedAt` | Ngày giờ, tự MongoDB điền (nhờ dòng `{ timestamps: true }`) | Dịch vụ này được tạo/sửa lúc nào | `"2026-07-15T17:57:56.425Z"` |

Enum `ServiceStatus` (`backend/src/enums/service.enum.ts`) chỉ có đúng 2 giá trị:

```ts
export enum ServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}
```

Khi Controller gọi `serviceModel.find()`, Model sẽ dịch câu đó thành một câu lệnh mà MongoDB hiểu được, gửi xuống database thật, database lục trong "tủ lạnh" ra TẤT CẢ dịch vụ trong collection `services`, rồi trả một danh sách các object (mỗi object là 1 dịch vụ, đủ các field ở trên) ngược lên cho Controller.

### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

Bây giờ đi ngược lại đúng đường vừa đi xuống:

1. **Model** nhận kết quả từ MongoDB → trả về cho **Controller** dưới dạng một mảng JavaScript.
2. **Controller** (`getAllServices`) gói mảng đó vào `{ success: true, result: [...] }`, gọi `res.json(...)` → Express biến nó thành JSON thật và gửi ngược qua Internet.
3. **Router** không làm gì thêm ở chặng về — nó chỉ có nhiệm vụ lúc đi vào (chọn đúng controller).
4. Response tới `serviceApi.js` ở frontend — dòng `const { data } = await serviceApi.getAllService()` giờ mới thực sự có giá trị, `data.result` chính là mảng dịch vụ vừa nhận.
5. `service.tsx` (admin) nhận `data.result`, "dịch" lại từng dịch vụ (đổi `status` thành tiếng Việt, điền chữ mặc định nếu thiếu tên/mô tả) rồi gọi `setServices(fetchedServices)` — đây là lệnh nói với React: *"dữ liệu đổi rồi, vẽ lại giao diện đi"*.
6. React vẽ lại bảng (`<Table columns={columns} dataSource={filteredServices} />`), mỗi dòng là 1 dịch vụ với các cột Tên dịch vụ, Mô tả, Giá, Thời lượng, Trạng thái (dạng `Tag` màu xanh nếu "Hoạt động", đỏ nếu "Ngừng hoạt động"), và 2 nút Sửa/Xoá.

Vậy là toàn bộ hành trình: **bấm mở trang → xin dữ liệu → qua nhiều "trạm" ở backend → chạm database → dữ liệu quay về → vẽ lên màn hình** đã xong, thường chỉ mất vài chục tới vài trăm mili-giây.

---

## Phần 4 — Luồng khi admin THÊM / SỬA / XOÁ dịch vụ (khác gì so với luồng xem ở trên?)

Về cơ bản đi qua đúng các "trạm" giống Phần 3 (app → router → controller → model → database), chỉ khác ở phần dữ liệu gửi đi và các điểm sau:

### Thêm mới (Tạo dịch vụ)

Frontend (`service.tsx`, hàm `handleAddModalOk`) gửi:

```ts
const response = await serviceApi.create(newService); // POST /v1/services
```

Controller `createService` (`backend/src/controllers/service.controllers.ts`) kiểm tra dữ liệu trước khi lưu — bắt buộc phải có `service_name` và `duration` hợp lệ (số dương), và không được trùng tên với dịch vụ đã có:

```ts
const existingService = await serviceModel.findOne({ service_name });
if (existingService) {
  res.status(400).json({ success: false, message: 'Dịch vụ đã tồn tại' });
  return;
}

const newService = new serviceModel({
  service_name,
  description: description || '',
  duration: dur,
  status: status || 'active'
});
```

**Lưu ý một điểm khá quan trọng đã phát hiện khi đọc code**: dòng tạo `newService` ở trên **KHÔNG có `service_price`** trong danh sách field được gán — dù form ở frontend (`service.tsx`) vẫn có ô nhập giá và gửi `service_price` lên. Vì Model có `default: 0` cho `service_price`, hậu quả là **mọi dịch vụ mới tạo đều bị lưu với giá 0 VNĐ**, bất kể admin nhập giá bao nhiêu lúc tạo — phải bấm "Sửa" lại sau khi tạo thì giá mới thật sự được lưu (vì `updateService` bên dưới CÓ xử lý `service_price` đầy đủ). Đây là 1 lỗi (bug) có thật trong code hiện tại, không phải cố ý thiết kế — ghi lại ở Phần 5.

### Sửa dịch vụ

Frontend gửi `PATCH /v1/services/:id`. Controller `updateService` chỉ cập nhật field nào THẬT SỰ được gửi lên (kiểm tra `!== undefined`), field nào không gửi thì giữ nguyên giá trị cũ:

```ts
if (service_price !== undefined) {
  const price = Number(service_price);
  if (isNaN(price) || price < 0) {
    res.status(400).json({ success: false, message: 'Giá dịch vụ phải là số không âm' });
    return;
  }
  service.service_price = price;
}
```

Route này bắt buộc `verifyToken, requireAdmin` — phải đăng nhập và phải là admin.

### Xoá dịch vụ

Frontend gửi `DELETE /v1/services/:id`. Controller `deleteService` tìm dịch vụ theo `id`, nếu không thấy trả lỗi `404`, nếu thấy thì xoá thẳng khỏi database bằng `serviceModel.findByIdAndDelete(id)` — đây là **xoá cứng** (xoá vĩnh viễn khỏi database), không phải kiểu "đánh dấu ẩn". Route này cũng bắt buộc `verifyToken, requireAdmin`.

> Vì Booking chỉ lưu `serviceId` (tham chiếu) chứ không copy dữ liệu Service, nếu admin xoá 1 Service đã từng được đặt lịch, các booking cũ liên quan tới `serviceId` đó sẽ không tra ra được tên/giá dịch vụ nữa (ví dụ email hoàn thành dịch vụ ở `emailService.ts` tra `ServiceModel.findById(serviceId)` sẽ trả về rỗng, và hiện chữ `"Không xác định"` thay cho tên dịch vụ). Nên cân nhắc dùng "Ngừng hoạt động" (`inactive`) thay vì xoá hẳn nếu dịch vụ đã từng có người đặt.

### Xem 1 dịch vụ theo ID (`getServiceById`)

Hàm này có 1 chi tiết đáng chú ý: mặc định nó CHỈ trả về dịch vụ nếu `status === 'active'`, trừ khi request có kèm `?showAll=true`:

```ts
if (showAll !== 'true' && service.status !== ServiceStatus.ACTIVE) {
  res.status(404).json({ success: false, message: 'Dịch vụ không hoạt động' });
  return;
}
```

Nghĩa là trang đặt lịch công khai (khách xem) sẽ không bao giờ thấy được 1 dịch vụ đã bị khoá, kể cả khi biết đúng `id` của nó — trừ khi thêm `showAll=true` (dành cho admin xem lại dịch vụ đã khoá).

---

## Phần 5 — Các vấn đề đã biết, CHƯA xử lý (ghi lại để biết, không phải đã sửa)

- **Bug giá 0 khi tạo mới**: như mô tả ở Phần 4, `createService` không gán `service_price` khi tạo document mới, nên mọi dịch vụ mới luôn có giá `0` cho tới khi admin sửa lại lần đầu.
- **`POST /services` (tạo dịch vụ) không yêu cầu đăng nhập/quyền admin** ở `backend/src/routes/service.routes.ts` — khác với route sửa/xoá (có đủ `verifyToken, requireAdmin`). Về lý thuyết, ai biết đúng địa chỉ API đều tạo được dịch vụ mới mà không cần đăng nhập.
- **`GET /services` chỉ yêu cầu đăng nhập (`verifyToken`), không yêu cầu phải là admin (`requireAdmin`)** — bất kỳ tài khoản đã đăng nhập nào (không nhất thiết admin) đều xem được toàn bộ danh sách dịch vụ kể cả đang `inactive`.
- **Xoá dịch vụ là xoá cứng, không kiểm tra ràng buộc với Booking đã có** — không có bước nào kiểm tra "dịch vụ này đã từng được đặt lịch chưa" trước khi cho xoá, dẫn tới các booking cũ có thể tra không ra tên/giá dịch vụ gốc (xem ví dụ `emailService.ts` ở Phần 4).
- File `backend/src/utils/emailService.ts` có hàm `sendBookingCompletionEmail` tra cứu `ServiceModel` để lấy `service_name` cho vào email báo hoàn thành dịch vụ — nhưng qua kiểm tra, hàm này hiện **không được gọi ở đâu khác trong code** (luồng gửi email hoàn thành thật sự đang dùng `backend/src/utils/sendBookingEmail.ts`, được gọi từ `order.controllers.ts` và `orderDetail.controllers.ts`). Có thể đây là code cũ chưa dọn, không phải trọng tâm của tài liệu này.

---

## Phần 6 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu dịch vụ (thêm field mới) | `backend/src/models/service.model.ts` + `backend/src/interfaces/service.interface.ts` |
| Đổi danh sách trạng thái (`active`/`inactive`) | `backend/src/enums/service.enum.ts` |
| Đổi logic thêm/sửa/xoá dịch vụ, sửa bug giá 0 khi tạo | `backend/src/controllers/service.controllers.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào (thêm `verifyToken`/`requireAdmin`) | `backend/src/routes/service.routes.ts` |
| Đổi giao diện bảng danh sách + form thêm/sửa dịch vụ ở admin | `frontend_react/src/admin/service/service.tsx` |
| Đổi cách trang đặt lịch cho khách hiển thị dịch vụ để chọn | `frontend_react/src/pages/services/services.tsx` |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/serviceApi.js` |
| Đổi luồng đặt lịch tham chiếu tới Service (booking) | xem `docs/booking/README.md` |

---

## Phần 7 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/services/status/active`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa, DELETE = xoá.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn...) — ví dụ `verifyToken`, `requireAdmin`.
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response, nói tình trạng: 200 ổn, 400 request sai định dạng, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **JWT token**: một chuỗi ký tự dài, được sinh ra lúc đăng nhập thành công, dùng như "vé" để các request sau chứng minh "tôi đã đăng nhập, tôi là ai".
- **Schema**: bản thiết kế của Model, quy định 1 document (1 dòng dữ liệu) có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB (tương đương 1 dòng trong bảng Excel) — ví dụ 1 dịch vụ cụ thể là 1 document trong collection `services`.
- **Collection**: tập hợp nhiều document cùng loại (tương đương 1 sheet trong Excel) — ví dụ collection `services` chứa tất cả dịch vụ.
- **Tham chiếu (reference)**: 1 model chỉ lưu "số căn cước" (`_id`) của model khác thay vì copy toàn bộ dữ liệu — ví dụ Booking lưu `serviceId` để trỏ tới 1 Service, không copy tên/giá dịch vụ qua.
- **Xoá cứng (hard delete)**: xoá vĩnh viễn document khỏi database, không thể khôi phục — khác với "khoá" (đổi `status` thành `inactive`) là chỉ ẩn đi, dữ liệu vẫn còn.

---

## Phần 8 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌──────────────┐      ┌────────────────┐      ┌──────────────────┐
│ service.tsx   │ ───▶ │ serviceApi.js   │ ───▶ │  index.ts (app)   │
│ (admin xem)   │      │ (gói request)   │      │  cửa chính backend │
└──────────────┘      └────────────────┘      └────────┬──────────┘

┌──────────────────────────────────────────────────────┘
▼
┌─────────────────────┐    ┌──────────────────────────┐    ┌────────────────────┐
│ service.routes.ts    │ ─▶ │ service.controllers.ts    │ ─▶ │ service.model.ts    │
│ khớp URL, chọn hàm   │    │ xử lý logic, gọi Model     │    │ nói chuyện với DB    │
└─────────────────────┘    └──────────────────────────┘    └─────────┬──────────┘
                                                                       ▼
                                                            ┌────────────────────┐
                                                            │ MongoDB (database)  │
                                                            │ collection "services"│
                                                            └─────────┬──────────┘
                                                                       │
◀────────────────────────────────────────────────────────────────────┘
   dữ liệu dịch vụ đi ngược lại đúng đường trên, tới service.tsx → setServices() → hiện lên bảng (Table)
```

Tóm tắt 1 câu mỗi trạm:

1. **service.tsx (admin)** — trang quản lý vừa mở, tự gọi xin toàn bộ danh sách dịch vụ.
2. **serviceApi.js** — đóng gói yêu cầu thành 1 request `GET`, gửi tới địa chỉ `/api/v1/services`.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, rồi được chuyển cho đúng router theo tiền tố URL.
4. **service.routes.ts** — dò đúng địa chỉ `/services` (cần đăng nhập, không cần admin), giao cho hàm `getAllServices`.
5. **service.controllers.ts** — hàm `getAllServices` nhờ Model tìm TẤT CẢ dịch vụ, gói kết quả thành `{ success, result }`.
6. **service.model.ts** — dịch yêu cầu đó thành câu lệnh MongoDB hiểu được, lấy đúng field (`service_name`, `description`, `service_price`, `duration`, `status`...).
7. **MongoDB** — tìm trong collection `services`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua (Model → Controller → ra khỏi backend → `serviceApi.js` → `service.tsx`), React vẽ lại bảng dịch vụ.
9. **Liên hệ với Booking** — mỗi dịch vụ trong bảng này chính là 1 lựa chọn mà khách sẽ thấy và chọn khi đặt lịch ở trang `services.tsx` (khách); xem `docs/booking/README.md` để biết luồng đặt lịch tiếp theo.

Toàn bộ các bước này thường chỉ mất vài chục tới vài trăm mili-giây.
