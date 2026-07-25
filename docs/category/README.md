# Category (Danh mục sản phẩm) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin của pet-corner mở trang "Danh mục" trong khu quản trị, xem danh sách, thêm mới, sửa hoặc xoá một danh mục sản phẩm (ví dụ: "Thức ăn cho chó", "Đồ chơi mèo"...). Viết cho người **chưa biết gì về lập trình**.

Category có cấu trúc gần giống hệt 2 feature khác trong dự án là **Brand** (thương hiệu) và **Tag** (thẻ sản phẩm) — cả 3 đều chỉ là "danh sách các nhóm có tên + mô tả + trạng thái bật/tắt", không có ảnh, không có gì phức tạp. Nếu bạn đã đọc tài liệu Category rồi, đọc Brand/Tag sẽ rất nhanh vì chúng gần như là "chép lại" cùng 1 khuôn.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, xem menu | Cái mà người dùng (ở đây là admin) nhìn thấy và bấm vào — chạy trên trình duyệt |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/categories` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, lấy dữ liệu, xử lý, rồi trả kết quả |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một danh mục trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với database |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu lưu trữ thật sự, tồn tại lâu dài |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để backend/frontend hiểu nhau |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại.

---

## Phần 2 — Bức tranh tổng thể (chỉ 1 dòng)

```
Trình duyệt (category.tsx ở khu admin)  →  gọi API  →  Backend (app→router→controller→model)  →  Database (MongoDB)
Database  →  trả dữ liệu  →  Model  →  Controller  →  Router  →  Backend  →  Trình duyệt  →  hiện bảng danh mục lên màn hình
```

---

## Phần 3 — Từng bước thật, từ lúc mở trang admin tới lúc thấy bảng danh mục

### Bước 1 — Admin mở trang "Danh mục"

File: `frontend_react/src/admin/category/category.tsx`

Ngay khi trang vừa hiện ra, React tự chạy đoạn sau **một lần duy nhất** (nhờ `useEffect`):

```tsx
const response = await categoryApi.getAll();
const fetchedCategories = response.data.result.map((category: any) => ({
  key: category._id,
  _id: category._id,
  name: category.name,
  description: category.description,
  status: category.status === "active" ? "Hoạt động" : "Bị khóa",
}));
setCategories(fetchedCategories);
setFilteredCategories(fetchedCategories);
```

`categoryApi.getAll()` là hành động "đưa đơn gọi món cho lễ tân" — trang admin đang xin backend: *"cho tôi TOÀN BỘ danh mục, kể cả cái đang bị khoá"*. Chú ý dòng `status === "active" ? "Hoạt động" : "Bị khóa"` — dữ liệu thật trong database chỉ lưu chữ tiếng Anh `"active"`/`"inactive"`, frontend tự dịch sang tiếng Việt để hiện cho đẹp mắt, chứ database không hề đổi.

### Bước 2 — `categoryApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/categoryApi.js`

```js
getAll: async () => {
  const response = await api.get("/v1/categories");
  return { data: response.data };
},
```

`api` là công cụ có sẵn (thư viện `axios`, khai báo ở `frontend_react/src/api/axios.js`) tự nối `/v1/categories` với địa chỉ gốc backend (`baseURL`) ra URL đầy đủ, ví dụ `http://localhost:5000/api/v1/categories`. Ngoài ra `axios.js` còn tự động đính kèm "vé vào cửa" vào mọi request:

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

Nghĩa là: nếu admin đã đăng nhập (có `accessToken` lưu sẵn trong trình duyệt), MỌI request gửi đi đều tự động kèm theo cái vé này trong phần header `Authorization`, để lát nữa backend kiểm tra.

`categoryApi.js` còn có đủ bộ hàm tương ứng CRUD (Create - Read - Update - Delete, tức "Tạo - Đọc - Sửa - Xoá", 4 thao tác cơ bản nhất với dữ liệu):

```js
create: async (data) => {
  const response = await api.post("/v1/categories", data);
  return response.data;
},
update: async (id, data) => {
  const response = await api.patch(`/v1/categories/${id}`, data);
  return response.data;
},
delete: async (id) => {
  const response = await api.delete(`/v1/categories/${id}`);
  return response.data;
},
```

### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`

Đây là **cửa chính** của cả backend, mọi request đều đi qua đây trước:

```ts
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger('dev'));
```

Đây là các **middleware** ("trạm kiểm tra" mà request phải đi qua trước khi tới đúng người xử lý). Không trạm nào ở đây từ chối request của category, chỉ chuẩn bị dữ liệu cho bước sau.

Rồi tới dòng quyết định request được **giao cho ai xử lý tiếp**:

```ts
app.use('/api/v1', categoryRouter);
```

Dòng này nói: *"Bất kỳ request nào có địa chỉ bắt đầu bằng `/api/v1`, hãy đưa cho `categoryRouter` xem có phải việc của nó không."* (Có nhiều router khác tương tự cho brand, tag, product, banner... — mỗi router chỉ lo một loại dữ liệu.)

### Bước 4 — Router (lễ tân) khớp đúng địa chỉ và chuyển tiếp

File: `backend/src/routes/category.routes.ts`

```ts
categoryRouter.get('/categories', getAllCategory);
categoryRouter.get('/categories/status/active', getCategoriesActive);
categoryRouter.get('/categories/:id', getCategoryById);
categoryRouter.post('/categories', verifyToken, requireAdmin, insertCategory);
categoryRouter.patch('/categories/:id', verifyToken, requireAdmin, updateCategory);
categoryRouter.patch('/categories/status/:id', verifyToken, requireAdmin, toggleCategory);
categoryRouter.delete('/categories/:id', verifyToken, requireAdmin, deleteCategory);
```

Request `GET /categories` khớp đúng dòng đầu tiên → giao việc cho hàm `getAllCategory`.

Điều đáng chú ý: dòng `GET /categories` (lấy tất cả) và `GET /categories/:id` (lấy 1 cái theo id) **không có** `verifyToken, requireAdmin` — ai gọi cũng được, không cần đăng nhập. Ngược lại mọi route TẠO/SỬA/XOÁ (`POST`, `PATCH`, `DELETE`) đều có 2 "trạm kiểm tra" này đứng trước. Đây là 2 middleware khác nhau xem ở `backend/src/middlewares/verifyToken.ts` và `backend/src/middlewares/protectRoute.ts`:

- `verifyToken`: đọc "vé" (`Authorization: Bearer ...`) trong header, kiểm tra vé còn hạn không, giải mã ra xem vé của user nào, rồi tìm user đó trong database, gắn vào `req.user`. Vé sai/hết hạn/không có → chặn lại, trả lỗi `401` (chưa đăng nhập), Controller không bao giờ chạy tới.
- `requireAdmin`: chạy SAU `verifyToken`, kiểm tra `req.user.role` có phải `admin` không. Không phải admin → chặn lại, trả lỗi `403` (không đủ quyền).

> Lưu ý kỹ thuật nhỏ nhưng quan trọng, giống hệt banner: dòng `/categories/status/active` phải viết TRƯỚC dòng `/categories/:id`. Vì `:id` là một "ô trống nhận bất kỳ chữ gì", nếu để nó lên trước, hệ thống sẽ hiểu lầm `status` chính là một `id`.

### Bước 5 — Controller (đầu bếp) thực sự "nấu"

File: `backend/src/controllers/category.controllers.ts`, hàm `getAllCategory`:

```ts
export const getAllCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await categoryModel.find();
    res.status(200).json({ success: true, result });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error category up: ${error.message}`);
    } else {
      console.error('Error category up:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
```

Controller nhờ `categoryModel` (Model, xem bước 6) đi lấy hộ: *"tìm TẤT CẢ danh mục trong database, không lọc gì cả"* (`.find()` không có điều kiện = lấy hết, kể cả `inactive`). Sau đó gói kết quả thành JSON `{ success: true, result: [...] }` rồi trả về mã `200` ("thành công"). Nếu có lỗi (ví dụ mất kết nối database) thì trả `success: false` và mã `500` ("lỗi phía server").

Vài hàm khác trong cùng file, đáng chú ý:

- `getCategoriesActive`: giống hệt nhưng có lọc `categoryModel.find({ status: CategoryStatus.ACTIVE })` — chỉ lấy danh mục đang `active`. Route public dùng hàm này, ví dụ để hiện danh mục ở trang chủ cho khách xem, không hiện danh mục đã bị admin khoá.
- `insertCategory`: kiểm tra `name` và `description` có được gửi lên không, kiểm tra tên có bị trùng không (`categoryModel.findOne({ name })`), rồi mới tạo mới và lưu (`newCategory.save()`).
- `updateCategory`: kiểm tra `id` có đúng định dạng ID của MongoDB không (`mongoose.isValidObjectId(id)`), kiểm tra `name`, `description`, `status` đều phải có, kiểm tra `status` phải là 1 trong 2 giá trị hợp lệ (`active`/`inactive`), rồi mới cập nhật bằng `categoryModel.findByIdAndUpdate(id, { name, description, status }, { new: true, runValidators: true })` — `{ new: true }` nghĩa là trả về bản ĐÃ cập nhật (không phải bản cũ trước khi sửa).
- `toggleCategory`: một API riêng chỉ để bật/tắt trạng thái (không cần gửi `name`/`description`), nhận `status` qua query string (`?status=inactive`) thay vì body.
- `deleteCategory`: tìm xem danh mục có tồn tại không, có thì xoá hẳn bằng `categoryModel.findByIdAndDelete(id)` — đây là xoá **vĩnh viễn** khỏi database, không phải chỉ ẩn đi.

### Bước 6 — Model (công thức + tủ lạnh) — nơi thật sự chạm vào database

File: `backend/src/models/category.model.ts`

```ts
const categorySchema: Schema<ICategory> = new Schema<ICategory>({
  name: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE
  }
});
```

`CategoryStatus` là một **enum** (danh sách các giá trị cố định được phép), khai báo ở `backend/src/enums/category.enum.ts`:

```ts
export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}
```

Và "bản thiết kế dữ liệu" tương ứng ở `backend/src/interfaces/category.interface.ts`:

```ts
export interface ICategory {
  _id: string;
  name: string;
  description: string;
  status: CategoryStatus;
}
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra) | "Số căn cước" duy nhất của danh mục đó, không cái nào trùng | `"6a57ca2411bb5ed75eb46fcb"` |
| `name` | Chữ (String) | Tên danh mục, hiện ra cho cả admin lẫn khách xem trên web | `"Thức ăn cho chó"` |
| `description` | Chữ (String) | Mô tả ngắn về danh mục, giúp admin/khách hiểu danh mục này gồm những gì | `"Các loại thức ăn khô và ướt dành cho chó"` |
| `status` | Chữ, chỉ được là 1 trong 2 giá trị cố định (`enum`) | `"active"` = đang cho hiển thị; `"inactive"` = admin đã tạm khoá, ẩn khỏi trang khách xem | `"active"` |

Khác với banner, Model của Category **không có** `{ timestamps: true }`, nên không tự sinh `createdAt`/`updatedAt` — nghĩa là hệ thống không lưu lại "danh mục này được tạo/sửa lúc nào".

Khi Controller gọi `categoryModel.find()`, Model dịch câu đó thành lệnh MongoDB hiểu được, gửi xuống database thật, database lục trong collection `categories` (nơi lưu MỌI danh mục) ra toàn bộ, trả một mảng các object ngược lên cho Controller.

### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

1. **Model** nhận kết quả từ MongoDB → trả về cho **Controller** dưới dạng mảng JavaScript.
2. **Controller** (`getAllCategory`) gói mảng đó vào `{ success: true, result: [...] }`, gọi `res.json(...)` → Express biến nó thành JSON thật và gửi ngược qua Internet.
3. **Router** không làm gì thêm ở chặng về.
4. Response tới `categoryApi.js` ở frontend — `response.data` chính là JSON `{ success: true, result: [...] }` vừa nhận.
5. `category.tsx` nhận `response.data.result`, dịch `status` sang tiếng Việt, gọi `setCategories(fetchedCategories)` — lệnh nói với React: *"dữ liệu đổi rồi, vẽ lại giao diện đi"*.
6. React vẽ lại bảng (`<Table columns={columns} dataSource={filteredCategories} />` của thư viện Ant Design), mỗi dòng trong bảng ứng với 1 danh mục, có nút Sửa/Xoá đi kèm.

Toàn bộ hành trình thường chỉ mất vài chục tới vài trăm mili-giây.

---

## Phần 4 — Luồng khi admin THÊM / SỬA / XOÁ (khác gì so với luồng xem ở trên?)

Về cơ bản đi qua đúng các "trạm" giống Phần 3 (app → router → controller → model → database), chỉ khác:

1. **Bắt buộc có "vé" admin** — mọi route ghi dữ liệu (`POST /categories`, `PATCH /categories/:id`, `PATCH /categories/status/:id`, `DELETE /categories/:id`) đều có `verifyToken, requireAdmin` chặn trước Controller. Thiếu vé hoặc không phải admin, Controller không bao giờ chạy tới.
2. **Không có ảnh** — khác hẳn banner, Category chỉ có 2 ô nhập (`name`, `description`) + 1 lựa chọn (`status`), nên frontend gửi JSON thường qua `api.post`/`api.patch`, không cần `FormData` hay upload lên Cloudinary.
3. **Kiểm tra trùng tên khi tạo mới** — `insertCategory` gọi `categoryModel.findOne({ name })` trước khi tạo, nếu đã có danh mục trùng tên hệt thì báo lỗi `"Category with this name already exists"`.
4. **2 cách đổi trạng thái** — có route riêng `PATCH /categories/status/:id` (hàm `toggleCategory`) chỉ để bật/tắt nhanh, khác với `PATCH /categories/:id` (hàm `updateCategory`) sửa toàn bộ tên + mô tả + trạng thái cùng lúc. Giao diện admin hiện tại (`category.tsx`) chỉ dùng cách sửa toàn bộ (không có nút bật/tắt riêng), nhưng API `toggleCategory` vẫn tồn tại sẵn để dùng khi cần.
5. **Xoá là xoá vĩnh viễn** — `deleteCategory` gọi `findByIdAndDelete`, danh mục biến mất khỏi database luôn, không phải chỉ ẩn (`inactive`). Nếu chỉ muốn tạm ẩn, nên dùng sửa trạng thái thành `inactive` thay vì xoá.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu danh mục (thêm field mới) | `backend/src/models/category.model.ts` + `backend/src/interfaces/category.interface.ts` |
| Đổi các trạng thái được phép (`active`/`inactive`) | `backend/src/enums/category.enum.ts` |
| Đổi logic thêm/sửa/xoá/kiểm tra trùng tên | `backend/src/controllers/category.controllers.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào | `backend/src/routes/category.routes.ts` |
| Đổi giao diện bảng danh sách + form thêm/sửa ở admin | `frontend_react/src/admin/category/category.tsx` |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/categoryApi.js` |

**Category còn được dùng ở đâu khác trong dự án** (không nhắc lại chi tiết ở đây, xem tài liệu tương ứng):

- Trang chủ hiển thị danh mục cho khách xem (gọi `getCategoriesActive`) — xem `docs/home/README.md`.
- Category là 1 field **bắt buộc** khi tạo sản phẩm (mỗi sản phẩm phải thuộc về 1 danh mục) — xem `docs/product` (đang được viết riêng).

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/categories`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa, DELETE = xoá.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn...).
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response, nói tình trạng: 200 ổn, 400 request sai định dạng, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **JWT token**: một chuỗi ký tự dài, được sinh ra lúc đăng nhập thành công, dùng như "vé" để các request sau chứng minh "tôi đã đăng nhập, tôi là ai".
- **Enum**: danh sách các giá trị cố định được phép dùng cho 1 field — ví dụ `status` chỉ được là `active` hoặc `inactive`, không được ghi chữ khác.
- **Schema**: bản thiết kế của Model, quy định 1 document (1 dòng dữ liệu) có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB (tương đương 1 dòng trong bảng Excel) — ví dụ 1 danh mục cụ thể là 1 document trong collection `categories`.
- **Collection**: tập hợp nhiều document cùng loại (tương đương 1 sheet trong Excel) — ví dụ collection `categories` chứa tất cả danh mục.
- **CRUD**: viết tắt của Create - Read - Update - Delete (Tạo - Đọc - Sửa - Xoá), 4 thao tác cơ bản nhất mà gần như mọi tính năng quản lý dữ liệu đều có.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌──────────────┐      ┌────────────────┐      ┌──────────────────┐
│ category.tsx │ ───▶ │ categoryApi.js │ ───▶ │  index.ts (app)  │
│ (khu admin)  │      │ (gói request)  │      │  cửa chính backend│
└──────────────┘      └────────────────┘      └────────┬──────────┘

┌──────────────────────────────────────────────────────┘
▼
┌────────────────────┐    ┌─────────────────────────┐    ┌───────────────────┐
│ category.routes.ts │ ─▶ │ category.controllers.ts │ ─▶ │ category.model.ts  │
│ khớp URL, chọn hàm  │    │ xử lý logic, gọi Model  │    │ nói chuyện với DB  │
└────────────────────┘    └─────────────────────────┘    └─────────┬─────────┘
                                                                     ▼
                                                          ┌─────────────────────┐
                                                          │ MongoDB (database)  │
                                                          │ collection          │
                                                          │ "categories"        │
                                                          └─────────┬───────────┘
                                                                     │
◀────────────────────────────────────────────────────────────────────┘
   dữ liệu danh mục đi ngược lại đúng đường trên, tới category.tsx → setCategories() → hiện lên Table
```

Tóm tắt 1 câu mỗi trạm:

1. **category.tsx** — trang admin vừa mở, tự gọi xin toàn bộ danh mục.
2. **categoryApi.js** — đóng gói yêu cầu thành request `GET`, tự đính kèm "vé" đăng nhập, gửi tới `/api/v1/categories`.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, rồi chuyển cho đúng router theo tiền tố URL.
4. **category.routes.ts** — dò đúng địa chỉ, xem có cần "vé admin" không, giao cho đúng hàm Controller.
5. **category.controllers.ts** — hàm tương ứng (`getAllCategory`/`insertCategory`/`updateCategory`/`toggleCategory`/`deleteCategory`) nhờ Model làm việc, rồi gói kết quả thành `{ success, result }`.
6. **category.model.ts** — dịch yêu cầu thành câu lệnh MongoDB hiểu được, thao tác đúng field (`name`, `description`, `status`).
7. **MongoDB** — tìm/thêm/sửa/xoá trong collection `categories`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua, React vẽ lại bảng danh mục trong khu admin.
