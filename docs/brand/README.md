# Brand (Thương hiệu sản phẩm) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin của pet-corner mở trang "Brand" trong khu quản trị, xem danh sách, thêm mới, sửa hoặc xoá một thương hiệu (ví dụ: "Royal Canin", "Whiskas"...). Viết cho người **chưa biết gì về lập trình**.

Brand có cấu trúc gần giống hệt tài liệu **Category** (danh mục sản phẩm) — nếu bạn đã đọc `docs/category/README.md` rồi thì tài liệu này sẽ rất quen thuộc, chỉ khác ở chỗ Brand **đơn giản hơn Category**: mỗi thương hiệu chỉ có đúng 1 field dữ liệu là tên (`brand_name`), không có mô tả, không có trạng thái bật/tắt.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, xem menu | Cái mà người dùng (ở đây là admin) nhìn thấy và bấm vào — chạy trên trình duyệt |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/brands` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, lấy dữ liệu, xử lý, rồi trả kết quả |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một brand trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với database |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu lưu trữ thật sự, tồn tại lâu dài |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để backend/frontend hiểu nhau |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại.

---

## Phần 2 — Bức tranh tổng thể (chỉ 1 dòng)

```
Trình duyệt (brand.tsx ở khu admin)  →  gọi API  →  Backend (app→router→controller→model)  →  Database (MongoDB)
Database  →  trả dữ liệu  →  Model  →  Controller  →  Router  →  Backend  →  Trình duyệt  →  hiện bảng brand lên màn hình
```

---

## Phần 3 — Từng bước thật, từ lúc mở trang admin tới lúc thấy bảng brand

### Bước 1 — Admin mở trang "Brand"

File: `frontend_react/src/admin/brand/brand.tsx`

Ngay khi trang vừa hiện ra, React tự chạy đoạn sau **một lần duy nhất** (nhờ `useEffect`):

```tsx
const fetchBrands = async () => {
  try {
    const response = await brandApi.getAll();
    const brandData = response.data.result.map((brand: any) => ({
      key: brand._id,
      id: brand._id,
      brand_name: brand.brand_name,
    }));
    setBrands(brandData);
    setFilteredBrands(brandData);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách brand:", error);
  }
};

useEffect(() => {
  fetchBrands();
}, []);
```

`brandApi.getAll()` là hành động "đưa đơn gọi món cho lễ tân" — trang admin đang xin backend: *"cho tôi TOÀN BỘ danh sách thương hiệu"*. Trang này còn có thêm 1 chi tiết nhỏ: lắng nghe sự kiện đăng xuất ở tab khác (`window.addEventListener("storage", ...)`), nếu phát hiện có tab khác vừa đăng xuất thì tự xoá sạch danh sách brand đang hiện trên màn hình — đây là một chi tiết an toàn, không phải phần chính của luồng dữ liệu.

### Bước 2 — `brandApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/brandApi.js`

```js
getAll: async () => {
  const response = await api.get("/v1/brands");
  return {
    data: response.data,
  };
},
create: async (data) => {
  const response = await api.post("/v1/brands", data);
  return response.data;
},
update: async (id, data) => {
  const response = await api.patch(`/v1/brands/${id}`, data);
  return response.data;
},
delete: async (id) => {
  const response = await api.delete(`/v1/brands/${id}`);
  return response.data;
},
```

`api` là công cụ có sẵn (thư viện `axios`, khai báo ở `frontend_react/src/api/axios.js`) tự nối `/v1/brands` với địa chỉ gốc backend ra URL đầy đủ, ví dụ `http://localhost:5000/api/v1/brands`. `axios.js` cũng tự động đính kèm "vé vào cửa" (`accessToken` lưu trong trình duyệt) vào header `Authorization` của mọi request, để lát nữa backend kiểm tra ai đang gọi.

Đủ bộ 4 hàm CRUD (Create - Read - Update - Delete, tức "Tạo - Đọc - Sửa - Xoá") giống hệt cấu trúc của `categoryApi.js`.

### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`

Mọi request đều đi qua đây đầu tiên, qua các **middleware** ("trạm kiểm tra" chạy trước khi tới đúng người xử lý):

```ts
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger('dev'));
```

Rồi tới dòng quyết định request được **giao cho ai xử lý tiếp**:

```ts
app.use('/api/v1', brandRouter);
```

Dòng này nói: *"Bất kỳ request nào có địa chỉ bắt đầu bằng `/api/v1`, hãy đưa cho `brandRouter` xem có phải việc của nó không."*

### Bước 4 — Router (lễ tân) khớp đúng địa chỉ và chuyển tiếp

File: `backend/src/routes/brand.routes.ts`

```ts
brandRouter.get('/brands', getAllBrands);
brandRouter.get('/brands/:id', getBrandById);
brandRouter.post('/brands', verifyToken, requireAdmin, insertBrand);
brandRouter.patch('/brands/:id', verifyToken, requireAdmin, updateBrand);
brandRouter.delete('/brands/:id', verifyToken, requireAdmin, deleteBrand);
```

Request `GET /brands` khớp đúng dòng đầu → giao việc cho hàm `getAllBrands`.

Giống Category: 2 route đọc dữ liệu (`GET /brands`, `GET /brands/:id`) **không cần đăng nhập**, ai gọi cũng được. Còn 3 route ghi dữ liệu (`POST`, `PATCH`, `DELETE`) đều có 2 "trạm kiểm tra":

- `verifyToken` (`backend/src/middlewares/verifyToken.ts`): đọc "vé" (`Authorization: Bearer ...`), kiểm tra còn hạn không, giải mã ra user nào, tìm user đó trong database, gắn vào `req.user`. Sai/hết hạn → chặn lại, lỗi `401`.
- `requireAdmin` (`backend/src/middlewares/protectRoute.ts`): chạy sau `verifyToken`, kiểm tra `req.user.role` có phải `admin` không. Không phải → chặn lại, lỗi `403`.

Khác với Category (có thêm route riêng `/status/active`), Brand **không có route lọc theo trạng thái** — vì model Brand không hề có field trạng thái (xem Bước 6), nên không có gì để lọc.

### Bước 5 — Controller (đầu bếp) thực sự "nấu"

File: `backend/src/controllers/brand.controllers.ts`, hàm `getAllBrands`:

```ts
export const getAllBrands = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await brandModel.find();
    res.status(200).json({ success: true, result });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error brand up: ${error.message}`);
      return;
    } else {
      console.error('Error brand up:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
```

Controller nhờ `brandModel` (Model, xem bước 6) đi lấy hộ: *"tìm TẤT CẢ thương hiệu trong database"* (`.find()` không điều kiện = lấy hết). Sau đó gói kết quả thành JSON `{ success: true, result: [...] }` và trả mã `200` ("thành công"). Có lỗi thì trả `success: false`, mã `500`.

Vài hàm khác trong cùng file, đáng chú ý:

- `insertBrand`: kiểm tra `brand_name` có được gửi lên không, kiểm tra tên có bị trùng không (`brandModel.findOne({ brand_name })`) trước khi tạo mới và lưu (`newBrand.save()`) — giống hệt cách Category kiểm tra trùng tên.
- `updateBrand`: kiểm tra `id` có đúng định dạng ID của MongoDB không (`mongoose.isValidObjectId(id)`), rồi cập nhật bằng `brandModel.findByIdAndUpdate(id, { brand_name }, { new: true, runValidators: true })` — chỉ sửa được đúng 1 field là `brand_name`, vì model không có field nào khác để sửa.
- `deleteBrand`: gọi thẳng `brandModel.findByIdAndDelete(id)`, nếu không tìm thấy trả lỗi `404`, có thì xoá **vĩnh viễn**.
- Có một đoạn hàm `toggleCategory` bị **comment lại** (vô hiệu hoá, không chạy) ở cuối file — đây là phần code copy từ Category lúc viết dở, dùng sai tên biến (`categoryModel`) nên không hoạt động được; hiện tại Brand không có tính năng bật/tắt trạng thái.

### Bước 6 — Model (công thức + tủ lạnh) — nơi thật sự chạm vào database

File: `backend/src/models/brand.model.ts`

```ts
const brandSchema: Schema<IBrand> = new Schema<IBrand>({
  brand_name: {
    type: String,
    default: ''
  }
});
```

Và "bản thiết kế dữ liệu" tương ứng ở `backend/src/interfaces/brand.interface.ts`:

```ts
export interface IBrand {
  _id: string;
  brand_name: string;
}
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra) | "Số căn cước" duy nhất của thương hiệu đó, không cái nào trùng | `"6a57ca2411bb5ed75eb46fcb"` |
| `brand_name` | Chữ (String) | Tên thương hiệu, hiện ra cho cả admin lẫn khách xem trên web | `"Royal Canin"` |

Model của Brand là model **đơn giản nhất** trong 3 tài liệu Category/Brand/Tag: chỉ đúng 1 field dữ liệu, không có `description`, không có `status`, không có `{ timestamps: true }` (nên cũng không tự sinh `createdAt`/`updatedAt`).

Khi Controller gọi `brandModel.find()`, Model dịch câu đó thành lệnh MongoDB hiểu được, gửi xuống database thật, database lục trong collection `brands` (nơi lưu mọi thương hiệu) ra toàn bộ, trả một mảng các object ngược lên cho Controller.

### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

1. **Model** nhận kết quả từ MongoDB → trả về cho **Controller** dưới dạng mảng JavaScript.
2. **Controller** (`getAllBrands`) gói mảng đó vào `{ success: true, result: [...] }`, gọi `res.json(...)` → Express biến nó thành JSON thật và gửi ngược qua Internet.
3. **Router** không làm gì thêm ở chặng về.
4. Response tới `brandApi.js` ở frontend — `response.data` chính là JSON `{ success: true, result: [...] }` vừa nhận.
5. `brand.tsx` nhận `response.data.result`, chuyển thành mảng `brandData` gọn hơn (chỉ giữ `key`, `id`, `brand_name`), gọi `setBrands(brandData)` — lệnh nói với React: *"dữ liệu đổi rồi, vẽ lại giao diện đi"*.
6. React vẽ lại bảng (`<Table columns={columns} dataSource={filteredBrands} />` của Ant Design), mỗi dòng ứng với 1 thương hiệu, có nút Sửa/Xoá đi kèm.

Toàn bộ hành trình thường chỉ mất vài chục tới vài trăm mili-giây.

---

## Phần 4 — Luồng khi admin THÊM / SỬA / XOÁ (khác gì so với luồng xem ở trên?)

Về cơ bản đi qua đúng các "trạm" giống Phần 3, chỉ khác:

1. **Bắt buộc có "vé" admin** — `POST /brands`, `PATCH /brands/:id`, `DELETE /brands/:id` đều có `verifyToken, requireAdmin` chặn trước Controller.
2. **Chỉ có 1 ô nhập duy nhất** — form Thêm/Sửa ở `brand.tsx` chỉ có đúng 1 `Form.Item` tên `brand_name`, không có mô tả, không có lựa chọn trạng thái — vì model chỉ có 1 field.
3. **Kiểm tra trùng tên khi tạo mới** — `insertBrand` gọi `brandModel.findOne({ brand_name })` trước khi tạo, trùng tên thì báo lỗi `"Brand with this name already exists"`.
4. **Không có khái niệm ẩn/hiện** — vì không có field `status`, một brand chỉ có 2 trạng thái tồn tại: "còn trong database" hoặc "đã bị xoá vĩnh viễn" (`deleteBrand` gọi `findByIdAndDelete`), không có lựa chọn "tạm khoá" như Category.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu brand (thêm field mới, ví dụ thêm mô tả) | `backend/src/models/brand.model.ts` + `backend/src/interfaces/brand.interface.ts` |
| Đổi logic thêm/sửa/xoá/kiểm tra trùng tên | `backend/src/controllers/brand.controllers.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào | `backend/src/routes/brand.routes.ts` |
| Đổi giao diện bảng danh sách + form thêm/sửa ở admin | `frontend_react/src/admin/brand/brand.tsx` |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/brandApi.js` |

Brand cũng là 1 field liên quan tới Product (mỗi sản phẩm thường gắn với 1 thương hiệu) — chi tiết xem tài liệu `docs/product` (đang được viết riêng), không nhắc lại ở đây.

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/brands`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa, DELETE = xoá.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn...).
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response, nói tình trạng: 200 ổn, 400 request sai định dạng, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **JWT token**: một chuỗi ký tự dài, được sinh ra lúc đăng nhập thành công, dùng như "vé" để các request sau chứng minh "tôi đã đăng nhập, tôi là ai".
- **Schema**: bản thiết kế của Model, quy định 1 document (1 dòng dữ liệu) có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB (tương đương 1 dòng trong bảng Excel) — ví dụ 1 thương hiệu cụ thể là 1 document trong collection `brands`.
- **Collection**: tập hợp nhiều document cùng loại (tương đương 1 sheet trong Excel) — ví dụ collection `brands` chứa tất cả thương hiệu.
- **CRUD**: viết tắt của Create - Read - Update - Delete (Tạo - Đọc - Sửa - Xoá), 4 thao tác cơ bản nhất mà gần như mọi tính năng quản lý dữ liệu đều có.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌──────────────┐      ┌────────────────┐      ┌──────────────────┐
│  brand.tsx   │ ───▶ │  brandApi.js   │ ───▶ │  index.ts (app)  │
│ (khu admin)  │      │ (gói request)  │      │  cửa chính backend│
└──────────────┘      └────────────────┘      └────────┬──────────┘

┌──────────────────────────────────────────────────────┘
▼
┌────────────────────┐    ┌─────────────────────────┐    ┌───────────────────┐
│ brand.routes.ts    │ ─▶ │ brand.controllers.ts    │ ─▶ │ brand.model.ts     │
│ khớp URL, chọn hàm  │    │ xử lý logic, gọi Model  │    │ nói chuyện với DB  │
└────────────────────┘    └─────────────────────────┘    └─────────┬─────────┘
                                                                     ▼
                                                          ┌─────────────────────┐
                                                          │ MongoDB (database)  │
                                                          │ collection "brands" │
                                                          └─────────┬───────────┘
                                                                     │
◀────────────────────────────────────────────────────────────────────┘
   dữ liệu brand đi ngược lại đúng đường trên, tới brand.tsx → setBrands() → hiện lên Table
```

Tóm tắt 1 câu mỗi trạm:

1. **brand.tsx** — trang admin vừa mở, tự gọi xin toàn bộ danh sách thương hiệu.
2. **brandApi.js** — đóng gói yêu cầu thành request `GET`, tự đính kèm "vé" đăng nhập, gửi tới `/api/v1/brands`.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, rồi chuyển cho đúng router theo tiền tố URL.
4. **brand.routes.ts** — dò đúng địa chỉ, xem có cần "vé admin" không, giao cho đúng hàm Controller.
5. **brand.controllers.ts** — hàm tương ứng (`getAllBrands`/`insertBrand`/`updateBrand`/`deleteBrand`) nhờ Model làm việc, rồi gói kết quả thành `{ success, result }`.
6. **brand.model.ts** — dịch yêu cầu thành câu lệnh MongoDB hiểu được, thao tác đúng field duy nhất `brand_name`.
7. **MongoDB** — tìm/thêm/sửa/xoá trong collection `brands`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua, React vẽ lại bảng thương hiệu trong khu admin.
