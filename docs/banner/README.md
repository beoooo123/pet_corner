# Banner trang chủ — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi một người mở trang chủ pet-corner và nhìn thấy banner. Viết cho người **chưa biết gì về lập trình**, nên phần đầu sẽ giải thích vài khái niệm nền tảng trước, sau đó đi vào từng file code thật, theo đúng thứ tự nó chạy.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt (Chrome, Cốc Cốc...) của người dùng |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/banners/status/active` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, đi lấy nguyên liệu (dữ liệu), nấu (xử lý), rồi trả món (trả kết quả) |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một banner trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với tủ lạnh (database) |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu được lưu trữ thật sự, tồn tại lâu dài, không mất khi tắt máy |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Một cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để hai bên (backend/frontend) hiểu nhau |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại.

---

## Phần 2 — Bức tranh tổng thể (chỉ 1 dòng)

```
Trình duyệt (home.tsx)  →  gọi API  →  Backend (app→router→controller→model)  →  Database (MongoDB)
Database  →  trả dữ liệu  →  Model  →  Controller  →  Router  →  Backend  →  Trình duyệt  →  hiện banner lên màn hình
```

Bây giờ ta đi từng bước thật chi tiết, đúng theo thứ tự xảy ra trong thực tế.

---

## Phần 3 — Từng bước thật, từ lúc mở trang chủ tới lúc thấy banner

### Bước 1 — Người dùng mở trang chủ

File: `frontend_react/src/pages/home/home.tsx`

Ngay khi trang chủ vừa hiện ra, React (thư viện dựng giao diện) tự động chạy đoạn code sau **một lần duy nhất** (nhờ `useEffect`):

```tsx
const bannerResponse = await bannerApi.getActive();
const bannerData = bannerResponse.data.data;
setBanners(bannerData || []);
```

`bannerApi.getActive()` chính là hành động "đưa đơn gọi món cho lễ tân" — trang chủ đang xin backend: *"cho tôi danh sách banner đang được phép hiển thị"*.

### Bước 2 — `bannerApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/bannerApi.js`

```js
getActive: async () => {
  const response = await api.get("/v1/banners/status/active");
  return { data: response.data };
},
```

Dòng này làm một việc: gửi một request kiểu `GET` (nghĩa là "chỉ xin dữ liệu, không thay đổi gì") tới địa chỉ `/v1/banners/status/active`. `api` ở đây là một công cụ có sẵn (thư viện `axios`) biết cách nối địa chỉ này với địa chỉ gốc của backend (ví dụ `http://localhost:5000/api`) để ra được URL đầy đủ: `http://localhost:5000/api/v1/banners/status/active`.

Request này đi qua Internet (hoặc qua mạng máy nếu chạy local), tới đúng cái máy đang chạy backend.

### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`

Đây là **cửa chính** của cả backend — mọi request, bất kể xin gì, đều phải đi qua file này đầu tiên. Vài dòng quan trọng:

```ts
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger('dev'));
```

Đây là các **middleware** (tạm hiểu: những "trạm kiểm tra" mà request phải đi qua trước khi tới đúng người xử lý) — ví dụ `logger('dev')` giống như một "bảo vệ" ghi lại: "lúc mấy giờ, có ai gọi API gì". Không trạm nào ở đây từ chối request của banner, nó chỉ ghi log và chuẩn bị dữ liệu request cho bước sau.

Rồi tới dòng quyết định request được **giao cho ai xử lý tiếp**:

```ts
app.use('/api/v1', bannerRouter);
```

Dòng này nói: *"Bất kỳ request nào có địa chỉ bắt đầu bằng `/api/v1`, hãy đưa cho `bannerRouter` xem có phải việc của nó không."* (Có rất nhiều router khác tương tự cho product, category... — mỗi router chỉ lo một loại dữ liệu.)

### Bước 4 — Router (lễ tân) khớp đúng địa chỉ và chuyển tiếp

File: `backend/src/routes/banner.routes.ts`

`bannerRouter` nhận request có URL đầy đủ `/api/v1/banners/status/active`, nó tự bỏ phần `/api/v1` (đã bị xử lý ở bước 3), còn lại `/banners/status/active`, rồi dò trong danh sách các "địa chỉ nó biết":

```ts
bannerRouter.get('/banners', verifyToken, requireAdmin, getAllBanners);
bannerRouter.get('/banners/status/active', getBannersActive);
bannerRouter.get('/banners/:id', verifyToken, requireAdmin, getBannerById);
```

Nó thấy khớp đúng dòng `/banners/status/active` → giao việc cho hàm `getBannersActive`.

Điều đáng chú ý: dòng này **không có** `verifyToken, requireAdmin` đứng trước — nghĩa là ai cũng gọi được, không cần đăng nhập. Ngược lại dòng đầu (`/banners`, lấy TẤT CẢ banner kể cả đang bị khóa) thì có `verifyToken, requireAdmin` — hai "trạm kiểm tra" này sẽ chặn lại nếu người gọi chưa đăng nhập hoặc không phải admin. Đây là lý do trang chủ (ai xem cũng được) và trang quản trị (chỉ admin) dùng 2 địa chỉ khác nhau.

> Lưu ý kỹ thuật nhỏ nhưng quan trọng: dòng `/banners/status/active` phải viết TRƯỚC dòng `/banners/:id`. Vì `:id` là một "ô trống nhận bất kỳ chữ gì", nếu để nó lên trước, hệ thống sẽ hiểu lầm `status` chính là một `id`, và request public sẽ không bao giờ chạy đúng hàm mong muốn.

### Bước 5 — Controller (đầu bếp) thực sự "nấu"

File: `backend/src/controllers/banner.controllers.ts`, hàm `getBannersActive`:

```ts
export const getBannersActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const banners = await bannerModel.find({ status: BannerStatus.ACTIVE }).sort({ order: 1 });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error('Error getBannersActive:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};
```

Controller là nơi **quyết định logic**: nó không tự lưu trữ dữ liệu, mà nhờ `bannerModel` (Model, xem bước 6) đi lấy hộ. Ở đây nó yêu cầu Model: *"tìm tất cả banner có `status` là `active`, xong sắp xếp theo `order` tăng dần"*.

Sau khi có kết quả, nó KHÔNG trả nguyên dữ liệu database ra — nó gói lại thành JSON theo khuôn quy ước chung của cả dự án: `{ success: true, data: [...] }`, rồi `res.status(200)` nghĩa là "trả về với mã 200" (200 là mã chuẩn quốc tế nghĩa là "thành công", giống việc bếp giơ tay báo "món ok rồi").

Nếu có lỗi (ví dụ database bị mất kết nối), nó trả `success: false` và mã `500` ("lỗi phía server") — để frontend biết là có gì sai, không phải do nó không có banner nào.

### Bước 6 — Model (công thức + tủ lạnh) — nơi thật sự chạm vào database

File: `backend/src/models/banner.model.ts`

Model là bản "khai báo" — nó định nghĩa một banner trong database gồm đúng những field nào, kiểu dữ liệu gì:

```ts
const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, default: '' },
    image_url: { type: String, required: true },
    link_url: { type: String, default: '' },
    order: { type: Number, default: 0 },
    status: { type: String, enum: BannerStatus, default: BannerStatus.ACTIVE }
  },
  { timestamps: true }
);
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra) | "Số căn cước" duy nhất của banner đó, không banner nào trùng | `"6a57ca2411bb5ed75eb46fcb"` |
| `title` | Chữ (String) | Tên gợi nhớ cho admin dễ nhận biết, KHÔNG hiện ra ngoài trang chủ cho khách xem | `"Banner khuyến mãi Tết"` |
| `image_url` | Chữ (String) — 1 đường link | Link tới ảnh banner, ảnh này KHÔNG lưu trong database, chỉ lưu database chỗ ảnh đang nằm trên Cloudinary (một dịch vụ lưu ảnh riêng) | `"https://res.cloudinary.com/.../banner_seed_1....png"` |
| `link_url` | Chữ (String), có thể để trống | Nếu khách bấm vào banner, sẽ được đưa tới trang này. Để trống thì bấm vào không làm gì | `"https://pet-corner.com/khuyen-mai"` hoặc `""` |
| `order` | Số (Number) | Banner nào có số nhỏ hơn hiện ra trước trong slider | `0`, `1`, `2`... |
| `status` | Chữ, chỉ được là 1 trong 2 giá trị cố định (`enum`) | `"active"` = đang cho hiển thị ở trang chủ; `"inactive"` = admin đã tạm khóa, không hiện | `"active"` |
| `createdAt` / `updatedAt` | Ngày giờ, tự MongoDB điền (nhờ dòng `{ timestamps: true }`) | Banner này được tạo/sửa lúc nào | `"2026-07-15T17:57:56.425Z"` |

Khi Controller gọi `bannerModel.find({ status: 'active' }).sort({ order: 1 })`, Model sẽ dịch câu đó thành một câu lệnh mà MongoDB hiểu được, gửi xuống database thật, database lục trong "tủ lạnh" ra đúng những banner có `status = active`, xếp theo `order`, rồi trả một danh sách các object (mỗi object là 1 banner, đủ các field ở trên) ngược lên cho Controller.

### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

Bây giờ đi ngược lại đúng đường vừa đi xuống:

1. **Model** nhận kết quả từ MongoDB → trả về cho **Controller** dưới dạng một mảng JavaScript.
2. **Controller** (`getBannersActive`) gói mảng đó vào `{ success: true, data: [...] }`, gọi `res.json(...)` → Express (nền tảng chạy backend) biến nó thành JSON thật (chữ + số, không còn là "object trong bộ nhớ máy" nữa) và gửi ngược qua Internet.
3. **Router** không làm gì thêm ở chặng về — nó chỉ có nhiệm vụ lúc đi vào (chọn đúng controller), lúc trả về thì response cứ thế đi thẳng ra ngoài.
4. Response tới `bannerApi.js` ở frontend — dòng `const response = await api.get(...)` giờ mới thực sự có giá trị, `response.data` chính là cái JSON `{ success: true, data: [...] }` vừa nhận.
5. `home.tsx` nhận `bannerData` (chính là mảng banner), gọi `setBanners(bannerData)` — đây là lệnh nói với React: *"dữ liệu đổi rồi, vẽ lại giao diện đi"*.
6. React vẽ lại, chạy qua đoạn `banners.map(...)`, với mỗi banner tạo ra một `<img src={banner.image_url} />` — trình duyệt thấy tag `<img>` có `src` là một link, nó tự đi tải ảnh đó **trực tiếp từ Cloudinary** (không phải từ backend) và hiển thị lên.

Vậy là toàn bộ hành trình: **bấm mở trang → xin dữ liệu → qua nhiều "trạm" ở backend → chạm database → dữ liệu quay về → vẽ lên màn hình** đã xong, thường chỉ mất vài chục tới vài trăm mili-giây (nhanh hơn một cái chớp mắt).

---

## Phần 4 — Luồng khi ADMIN thêm/sửa banner (khác gì so với luồng xem ở trên?)

Về cơ bản đi qua đúng các "trạm" giống Phần 3 (app → router → controller → model → database), chỉ khác 3 điểm:

1. **Có ảnh đi kèm** — không chỉ gửi chữ/số mà còn gửi cả 1 file ảnh, nên frontend phải đóng gói bằng `FormData` (một kiểu gói hàng đặc biệt cho phép nhét cả file lẫn chữ vào cùng 1 request) thay vì JSON thường.
2. **Phải "xuất trình thẻ" admin** — route ghi dữ liệu (thêm/sửa/xoá) luôn có `verifyToken, requireAdmin` chặn trước Controller. `verifyToken` giống bảo vệ kiểm tra "vé vào cửa" (một đoạn mã gọi là JWT token, sinh ra lúc admin đăng nhập); `requireAdmin` kiểm tiếp "vé này có phải loại admin không". Sai 1 trong 2, request bị chặn lại, Controller không bao giờ chạy tới.
3. **Ảnh không lưu trong database, được gửi lên Cloudinary trước** — ngay trước khi vào tới Controller, có 1 "trạm" tên `uploader.single('image_url')` (khai báo trong `banner.routes.ts`) tự động lấy file ảnh, đẩy lên Cloudinary, Cloudinary trả về 1 link — Controller chỉ cần lưu cái LINK đó vào field `image_url`, không lưu file ảnh thật vào MongoDB.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu banner (thêm field mới) | `backend/src/models/banner.model.ts` + `backend/src/interfaces/banner.interface.ts` |
| Đổi logic thêm/sửa/xoá banner | `backend/src/controllers/banner.controllers.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào | `backend/src/routes/banner.routes.ts` |
| Đổi kích thước/tỉ lệ ảnh khi upload lên Cloudinary | `backend/src/config/cloudinary.config.ts` |
| Đổi giao diện form thêm/sửa banner ở admin | `frontend_react/src/admin/components/bannerModal.tsx` |
| Đổi giao diện bảng danh sách banner ở admin | `frontend_react/src/admin/banner/banner.tsx` |
| Đổi cách trang chủ hiển thị banner (Slider, nút chuyển ảnh, kích thước khung) | `frontend_react/src/pages/home/home.tsx` |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/bannerApi.js` |
| Seed lại banner mẫu | `backend/src/scripts/seedBanners.ts` (chạy `npm run seed:banners`) |

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/banners/status/active`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa, DELETE = xoá.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn, upload ảnh...).
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response, nói tình trạng: 200 ổn, 400 request sai định dạng, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **JWT token**: một chuỗi ký tự dài, được sinh ra lúc đăng nhập thành công, dùng như "vé" để các request sau chứng minh "tôi đã đăng nhập, tôi là ai".
- **Schema**: bản thiết kế của Model, quy định 1 document (1 dòng dữ liệu) có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB (tương đương 1 dòng trong bảng Excel) — ví dụ 1 banner cụ thể là 1 document trong collection `banners`.
- **Collection**: tập hợp nhiều document cùng loại (tương đương 1 sheet trong Excel) — ví dụ collection `banners` chứa tất cả banner.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌─────────────┐      ┌──────────────┐      ┌──────────────────┐
│  home.tsx   │ ───▶ │ bannerApi.js │ ───▶ │  index.ts (app)  │
│ (trình duyệt)│      │ (gói request) │      │  cửa chính backend│
└─────────────┘      └──────────────┘      └────────┬──────────┘

┌──────────────────────────────────────────────────────┘
▼
┌────────────────────┐    ┌─────────────────────────┐    ┌───────────────────┐
│ banner.routes.ts    │ ─▶ │ banner.controllers.ts    │ ─▶ │ banner.model.ts    │
│ khớp URL, chọn hàm  │    │ xử lý logic, gọi Model    │    │ nói chuyện với DB  │
└────────────────────┘    └─────────────────────────┘    └─────────┬─────────┘
                                                                     ▼
                                                          ┌────────────────────┐
                                                          │ MongoDB (database)  │
                                                          │ collection "banners"│
                                                          └─────────┬─────────┘
                                                                     │
◀────────────────────────────────────────────────────────────────────┘
   dữ liệu banner đi ngược lại đúng đường trên, tới home.tsx → setBanners() → hiện lên Slider
```

Tóm tắt 1 câu mỗi trạm:

1. **home.tsx** — trang chủ vừa mở, tự gọi xin danh sách banner.
2. **bannerApi.js** — đóng gói yêu cầu thành 1 request `GET`, gửi tới địa chỉ `/api/v1/banners/status/active`.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, rồi được chuyển cho đúng router theo tiền tố URL.
4. **banner.routes.ts** — dò đúng địa chỉ `/banners/status/active` (không cần đăng nhập), giao cho hàm `getBannersActive`.
5. **banner.controllers.ts** — hàm `getBannersActive` nhờ Model tìm banner `status = active`, sắp theo `order`, rồi gói kết quả thành `{ success, data }`.
6. **banner.model.ts** — dịch yêu cầu đó thành câu lệnh MongoDB hiểu được, lấy đúng field (`title`, `image_url`, `link_url`, `order`, `status`...).
7. **MongoDB** — tìm trong collection `banners`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua (Model → Controller → ra khỏi backend → `bannerApi.js` → `home.tsx`), React vẽ lại `Slider` với ảnh banner thật.

Toàn bộ 8 bước này thường chỉ mất vài chục tới vài trăm mili-giây.
