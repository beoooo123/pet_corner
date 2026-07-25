# Tag (Thẻ sản phẩm) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin của pet-corner mở trang "Tag" trong khu quản trị, xem danh sách, thêm mới, sửa hoặc xoá một thẻ sản phẩm (ví dụ: "Bán chạy", "Giảm giá", "Hàng mới"...). Viết cho người **chưa biết gì về lập trình**.

Tag có cấu trúc gần giống hệt tài liệu **Brand** (thương hiệu) — nếu bạn đã đọc `docs/brand/README.md` rồi thì tài liệu này gần như là "chép lại": model của Tag cũng chỉ có đúng 1 field dữ liệu là tên (`tag_name`), không có mô tả, không có trạng thái bật/tắt, giống hệt Brand. (Còn Category thì có thêm `description` và `status` — xem `docs/category/README.md`.)

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, xem menu | Cái mà người dùng (ở đây là admin) nhìn thấy và bấm vào — chạy trên trình duyệt |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/tags` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, lấy dữ liệu, xử lý, rồi trả kết quả |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một tag trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với database |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu lưu trữ thật sự, tồn tại lâu dài |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để backend/frontend hiểu nhau |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại.

---

## Phần 2 — Bức tranh tổng thể (chỉ 1 dòng)

```
Trình duyệt (tag.tsx ở khu admin)  →  gọi API  →  Backend (app→router→controller→model)  →  Database (MongoDB)
Database  →  trả dữ liệu  →  Model  →  Controller  →  Router  →  Backend  →  Trình duyệt  →  hiện bảng tag lên màn hình
```

---

## Phần 3 — Từng bước thật, từ lúc mở trang admin tới lúc thấy bảng tag

### Bước 1 — Admin mở trang "Tag"

File: `frontend_react/src/admin/tag/tag.tsx`

Ngay khi trang vừa hiện ra, React tự chạy đoạn sau **một lần duy nhất** (nhờ `useEffect`):

```tsx
useEffect(() => {
  const fetchTags = async () => {
    try {
      const response = await tagApi.getAll();
      const tagData = response.data.result.map((tag: any) => ({
        key: tag._id,
        id: tag._id,
        name: tag.tag_name || tag.name,
      }));
      setTags(tagData);
      setFilteredTags(tagData);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách tag:", error);
    }
  };
  fetchTags();
}, []);
```

`tagApi.getAll()` là hành động "đưa đơn gọi món cho lễ tân" — trang admin đang xin backend: *"cho tôi TOÀN BỘ danh sách tag"*. Có một chi tiết nhỏ đáng chú ý: database lưu tên field là `tag_name`, nhưng giao diện lại đặt tên biến là `name` (dòng `name: tag.tag_name || tag.name`) — đây chỉ là cách đặt tên khác nhau giữa 2 phía, không phải 2 field khác nhau; `|| tag.name` chỉ là một lớp phòng hờ (fallback) phòng khi dữ liệu cũ từng lưu dưới tên khác.

### Bước 2 — `tagApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/tagApi.js`

```js
getAll: async () => {
  const response = await api.get("/v1/tags");
  return {
    data: response.data,
  };
},
create: async (data) => {
  const response = await api.post("/v1/tags", data);
  return response.data;
},
update: async (id, data) => {
  const response = await api.patch(`/v1/tags/${id}`, data);
  return response.data;
},
delete: async (id) => {
  const response = await api.delete(`/v1/tags/${id}`);
  return response.data;
},
```

`api` là công cụ có sẵn (thư viện `axios`, khai báo ở `frontend_react/src/api/axios.js`) tự nối `/v1/tags` với địa chỉ gốc backend ra URL đầy đủ, ví dụ `http://localhost:5000/api/v1/tags`. `axios.js` cũng tự động đính kèm "vé vào cửa" (`accessToken` lưu trong trình duyệt) vào header `Authorization` của mọi request.

Đủ bộ 4 hàm CRUD (Create - Read - Update - Delete, tức "Tạo - Đọc - Sửa - Xoá") — cấu trúc giống hệt `brandApi.js` và `categoryApi.js`, chỉ khác địa chỉ (`/v1/tags` thay vì `/v1/brands` hay `/v1/categories`).

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
app.use('/api/v1', tagRouter);
```

Dòng này nói: *"Bất kỳ request nào có địa chỉ bắt đầu bằng `/api/v1`, hãy đưa cho `tagRouter` xem có phải việc của nó không."*

### Bước 4 — Router (lễ tân) khớp đúng địa chỉ và chuyển tiếp

File: `backend/src/routes/tag.routes.ts`

```ts
tagRouter.get('/tags', getAllTags);
tagRouter.get('/tags/:id', getTagById);
tagRouter.post('/tags', verifyToken, requireAdmin, insertTag);
tagRouter.delete('/tags/:id', verifyToken, requireAdmin, deleteTag);
tagRouter.patch('/tags/:id', verifyToken, requireAdmin, updateTag);
```

Request `GET /tags` khớp đúng dòng đầu → giao việc cho hàm `getAllTags`.

Giống Brand và Category: 2 route đọc dữ liệu (`GET /tags`, `GET /tags/:id`) **không cần đăng nhập**, ai gọi cũng được. Còn 3 route ghi dữ liệu (`POST`, `PATCH`, `DELETE`) đều có 2 "trạm kiểm tra":

- `verifyToken` (`backend/src/middlewares/verifyToken.ts`): đọc "vé" (`Authorization: Bearer ...`), kiểm tra còn hạn không, giải mã ra user nào, tìm user đó trong database, gắn vào `req.user`. Sai/hết hạn → chặn lại, lỗi `401`.
- `requireAdmin` (`backend/src/middlewares/protectRoute.ts`): chạy sau `verifyToken`, kiểm tra `req.user.role` có phải `admin` không. Không phải → chặn lại, lỗi `403`.

Giống Brand, Tag **không có route lọc theo trạng thái** — vì model Tag cũng không có field trạng thái.

> Chi tiết nhỏ trong file: có 2 dòng comment cuối file (`// categoryRouter.delete(...)`, `// brandRouter...`) là code thừa còn sót lại từ lúc viết/copy giữa 3 feature Category/Brand/Tag, không ảnh hưởng gì tới việc chạy vì đã bị vô hiệu hoá bằng `//`.

### Bước 5 — Controller (đầu bếp) thực sự "nấu"

File: `backend/src/controllers/tag.controllers.ts`, hàm `getAllTags`:

```ts
export const getAllTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await tagModel.find();
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

Controller nhờ `tagModel` (Model, xem bước 6) đi lấy hộ: *"tìm TẤT CẢ tag trong database"* (`.find()` không điều kiện = lấy hết). Sau đó gói kết quả thành JSON `{ success: true, result: [...] }` và trả mã `200` ("thành công"). Có lỗi thì trả `success: false`, mã `500`. (Dòng log lỗi ghi nhầm chữ "brand" thay vì "tag" — đây là dấu vết của việc code được copy từ `brand.controllers.ts` rồi sửa lại, không ảnh hưởng tới chức năng vì đó chỉ là dòng ghi log để debug.)

Vài hàm khác trong cùng file, đáng chú ý:

- `insertTag`: kiểm tra `tag_name` có được gửi lên không, kiểm tra tên có bị trùng không (`tagModel.findOne({ tag_name })`) trước khi tạo mới và lưu (`newTag.save()`) — giống hệt cách Brand và Category kiểm tra trùng tên.
- `updateTag`: kiểm tra `id` có đúng định dạng ID của MongoDB không (`mongoose.isValidObjectId(id)`), rồi cập nhật bằng `tagModel.findByIdAndUpdate(id, { tag_name }, { new: true, runValidators: true })` — chỉ sửa được đúng 1 field là `tag_name`.
- `deleteTag`: gọi thẳng `tagModel.findByIdAndDelete(id)`, không tìm thấy thì trả lỗi `404`, có thì xoá **vĩnh viễn**.

### Bước 6 — Model (công thức + tủ lạnh) — nơi thật sự chạm vào database

File: `backend/src/models/tag.model.ts`

```ts
const tagSchema: Schema<ITag> = new Schema<ITag>({
  tag_name: {
    type: String,
    default: ''
  }
});
```

Và "bản thiết kế dữ liệu" tương ứng ở `backend/src/interfaces/tag.interface.ts`:

```ts
export interface ITag {
  _id: ObjectId;
  tag_name: string;
}
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | ObjectId (tự MongoDB sinh ra) | "Số căn cước" duy nhất của tag đó, không cái nào trùng | `"6a57ca2411bb5ed75eb46fcb"` |
| `tag_name` | Chữ (String) | Tên thẻ, dùng để gắn nhãn cho sản phẩm (ví dụ hiện huy hiệu "Bán chạy" trên sản phẩm) | `"Bán chạy"` |

Model của Tag đơn giản như Brand: chỉ đúng 1 field dữ liệu, không có `description`, không có `status`, không có `{ timestamps: true }` (nên không tự sinh `createdAt`/`updatedAt`). Điểm khác nhỏ so với Brand: interface của Tag khai báo kiểu `_id` là `ObjectId` (kiểu dữ liệu gốc của MongoDB), trong khi Brand và Category khai báo `_id` là `string` — về bản chất là cùng 1 loại giá trị, chỉ khác cách khai báo kiểu ở phía TypeScript.

Khi Controller gọi `tagModel.find()`, Model dịch câu đó thành lệnh MongoDB hiểu được, gửi xuống database thật, database lục trong collection `tags` (nơi lưu mọi thẻ) ra toàn bộ, trả một mảng các object ngược lên cho Controller.

### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

1. **Model** nhận kết quả từ MongoDB → trả về cho **Controller** dưới dạng mảng JavaScript.
2. **Controller** (`getAllTags`) gói mảng đó vào `{ success: true, result: [...] }`, gọi `res.json(...)` → Express biến nó thành JSON thật và gửi ngược qua Internet.
3. **Router** không làm gì thêm ở chặng về.
4. Response tới `tagApi.js` ở frontend — `response.data` chính là JSON `{ success: true, result: [...] }` vừa nhận.
5. `tag.tsx` nhận `response.data.result`, dịch `tag_name` thành `name` để hiển thị, gọi `setTags(tagData)` — lệnh nói với React: *"dữ liệu đổi rồi, vẽ lại giao diện đi"*.
6. React vẽ lại bảng (`<Table columns={columns} dataSource={filteredTags} />` của Ant Design), mỗi dòng ứng với 1 tag, có nút Sửa/Xoá đi kèm.

Toàn bộ hành trình thường chỉ mất vài chục tới vài trăm mili-giây.

---

## Phần 4 — Luồng khi admin THÊM / SỬA / XOÁ (khác gì so với luồng xem ở trên?)

Về cơ bản đi qua đúng các "trạm" giống Phần 3, chỉ khác:

1. **Bắt buộc có "vé" admin** — `POST /tags`, `PATCH /tags/:id`, `DELETE /tags/:id` đều có `verifyToken, requireAdmin` chặn trước Controller.
2. **Chỉ có 1 ô nhập duy nhất** — form Thêm/Sửa ở `tag.tsx` chỉ có đúng 1 `Form.Item` tên `name` (frontend gọi nó là `name`, nhưng khi gửi lên backend sẽ đóng gói lại thành `tag_name` — xem dòng `tagApi.create({ tag_name: values.name })` và `tagApi.update(selectedTag.id, { tag_name: values.name })` trong `tag.tsx`).
3. **Kiểm tra trùng tên khi tạo mới** — `insertTag` gọi `tagModel.findOne({ tag_name })` trước khi tạo, trùng tên thì báo lỗi `"Tag with this name already exists"`.
4. **Không có khái niệm ẩn/hiện** — vì không có field `status`, một tag chỉ có 2 trạng thái tồn tại: "còn trong database" hoặc "đã bị xoá vĩnh viễn" (`deleteTag` gọi `findByIdAndDelete`), không có lựa chọn "tạm khoá" như Category.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu tag (thêm field mới, ví dụ thêm màu sắc hiển thị) | `backend/src/models/tag.model.ts` + `backend/src/interfaces/tag.interface.ts` |
| Đổi logic thêm/sửa/xoá/kiểm tra trùng tên | `backend/src/controllers/tag.controllers.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào | `backend/src/routes/tag.routes.ts` |
| Đổi giao diện bảng danh sách + form thêm/sửa ở admin | `frontend_react/src/admin/tag/tag.tsx` |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/tagApi.js` |

Tag cũng là 1 field liên quan tới Product (mỗi sản phẩm có thể được gắn nhiều tag để lọc/tìm kiếm) — chi tiết xem tài liệu `docs/product` (đang được viết riêng), không nhắc lại ở đây.

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/tags`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa, DELETE = xoá.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn...).
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response, nói tình trạng: 200 ổn, 400 request sai định dạng, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **JWT token**: một chuỗi ký tự dài, được sinh ra lúc đăng nhập thành công, dùng như "vé" để các request sau chứng minh "tôi đã đăng nhập, tôi là ai".
- **Schema**: bản thiết kế của Model, quy định 1 document (1 dòng dữ liệu) có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB (tương đương 1 dòng trong bảng Excel) — ví dụ 1 tag cụ thể là 1 document trong collection `tags`.
- **Collection**: tập hợp nhiều document cùng loại (tương đương 1 sheet trong Excel) — ví dụ collection `tags` chứa tất cả thẻ.
- **CRUD**: viết tắt của Create - Read - Update - Delete (Tạo - Đọc - Sửa - Xoá), 4 thao tác cơ bản nhất mà gần như mọi tính năng quản lý dữ liệu đều có.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌──────────────┐      ┌────────────────┐      ┌──────────────────┐
│   tag.tsx    │ ───▶ │   tagApi.js    │ ───▶ │  index.ts (app)  │
│ (khu admin)  │      │ (gói request)  │      │  cửa chính backend│
└──────────────┘      └────────────────┘      └────────┬──────────┘

┌──────────────────────────────────────────────────────┘
▼
┌────────────────────┐    ┌─────────────────────────┐    ┌───────────────────┐
│ tag.routes.ts       │ ─▶ │ tag.controllers.ts      │ ─▶ │ tag.model.ts       │
│ khớp URL, chọn hàm  │    │ xử lý logic, gọi Model  │    │ nói chuyện với DB  │
└────────────────────┘    └─────────────────────────┘    └─────────┬─────────┘
                                                                     ▼
                                                          ┌─────────────────────┐
                                                          │ MongoDB (database)  │
                                                          │ collection "tags"   │
                                                          └─────────┬───────────┘
                                                                     │
◀────────────────────────────────────────────────────────────────────┘
   dữ liệu tag đi ngược lại đúng đường trên, tới tag.tsx → setTags() → hiện lên Table
```

Tóm tắt 1 câu mỗi trạm:

1. **tag.tsx** — trang admin vừa mở, tự gọi xin toàn bộ danh sách tag.
2. **tagApi.js** — đóng gói yêu cầu thành request `GET`, tự đính kèm "vé" đăng nhập, gửi tới `/api/v1/tags`.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, rồi chuyển cho đúng router theo tiền tố URL.
4. **tag.routes.ts** — dò đúng địa chỉ, xem có cần "vé admin" không, giao cho đúng hàm Controller.
5. **tag.controllers.ts** — hàm tương ứng (`getAllTags`/`insertTag`/`updateTag`/`deleteTag`) nhờ Model làm việc, rồi gói kết quả thành `{ success, result }`.
6. **tag.model.ts** — dịch yêu cầu thành câu lệnh MongoDB hiểu được, thao tác đúng field duy nhất `tag_name`.
7. **MongoDB** — tìm/thêm/sửa/xoá trong collection `tags`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua, React vẽ lại bảng tag trong khu admin.
