# Blog (Bài viết) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi một người mở trang "Blog" (danh sách bài viết) trên pet-corner, bấm vào xem 1 bài, và khi admin thêm/sửa bài viết. Viết cho người **chưa biết gì về lập trình**, nên phần đầu sẽ giải thích vài khái niệm nền tảng trước, sau đó đi vào từng file code thật, theo đúng thứ tự nó chạy.

Feature Blog thực chất gồm **2 loại dữ liệu đi kèm nhau**:
- **Blog** — 1 bài viết cụ thể (tiêu đề, nội dung, ảnh, tác giả...).
- **BlogCategory** — 1 danh mục để nhóm các bài viết lại (ví dụ "Kinh nghiệm nuôi chó", "Dinh dưỡng cho mèo"...). Mỗi bài viết thuộc về 1 danh mục.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt (Chrome, Cốc Cốc...) của người dùng |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/blogs/status/active` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, đi lấy nguyên liệu (dữ liệu), nấu (xử lý), rồi trả món (trả kết quả) |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một bài viết trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với tủ lạnh (database) |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu được lưu trữ thật sự, tồn tại lâu dài, không mất khi tắt máy |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Một cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để hai bên (backend/frontend) hiểu nhau |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại.

Vì Blog có 2 "tủ lạnh" liên quan tới nhau (bài viết và danh mục), có thêm 1 khái niệm cần biết trước:

| Khái niệm | Ví dụ đời thường | Giải thích |
|---|---|---|
| **Populate** (nối dữ liệu) | Món ăn ghi "kèm sốt số 5" trên phiếu, đầu bếp tự đi lấy đúng lọ sốt số 5 ra bỏ kèm vào đĩa | Trong 1 bài viết, database chỉ lưu "số căn cước" (`_id`) của danh mục, không lưu tên danh mục. `populate` là lệnh nói với Model: "đi tra luôn tên danh mục ra, gắn kèm vào kết quả trả về" |

---

## Phần 2 — Bức tranh tổng thể (chỉ 1 dòng)

```
Trình duyệt (blog.tsx)  →  gọi API (blogApi + blogCategoryApi)  →  Backend (app→router→controller→model)  →  Database (MongoDB: collection "blogs" + "blogcategories")
Database  →  trả dữ liệu  →  Model  →  Controller  →  Router  →  Backend  →  Trình duyệt  →  hiện danh sách bài viết + sidebar danh mục lên màn hình
```

Bây giờ ta đi từng bước thật chi tiết, đúng theo thứ tự xảy ra trong thực tế.

---

## Phần 3 — Từng bước thật: từ lúc mở trang Blog tới lúc đọc xong 1 bài viết

### 3A. Luồng xem trang danh sách bài viết (`/blogs`)

#### Bước 1 — Người dùng mở trang `/blogs`

File: `frontend_react/src/pages/blog/blog.tsx`

Ngay khi trang vừa hiện ra, React (thư viện dựng giao diện) tự động chạy 2 việc **song song** (nhờ 2 `useEffect` riêng): xin danh sách bài viết, và xin danh sách danh mục để vẽ sidebar bên trái.

```tsx
const fetchBlogs = async () => {
  try {
    const blogResponse = await BlogApi.getBlogActive();
    const blogData = blogResponse.data.data;
    setBlogs(blogData || []);
    setLoading(false);
  } catch (err: any) {
    ...
  }
};
```

```tsx
const fetchBlogCategorys = async () => {
  try {
    const blogCategoryResponse = await blogCategoryApi.getCategoriesActive();
    const blogCategoryData = blogCategoryResponse.data.result;
    setBlogsCategory(blogCategoryData || []);
    ...
  }
};
```

`BlogApi.getBlogActive()` giống như "đưa đơn gọi món cho lễ tân": trang đang xin backend *"cho tôi danh sách bài viết đang được phép hiển thị"*. Song song đó, `blogCategoryApi.getCategoriesActive()` xin thêm *"cho tôi danh sách danh mục để vẽ menu lọc bên trái"*.

#### Bước 2 — `blogApi.js` và `blogCategoryApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/blogApi.js`

```js
getBlogActive: async () => {
  const response = await api.get("/v1/blogs/status/active");
  return {
    data: response.data,
  };
},
```

File: `frontend_react/src/api/blogCategoryApi.js`

```js
getCategoriesActive: async () => {
  const response = await api.get("/v1/blogcategories/status/active");
  return {
    data: response.data,
  };
},
```

Cả 2 dòng này đều gửi 1 request kiểu `GET` (nghĩa là "chỉ xin dữ liệu, không thay đổi gì"). `api` ở đây là công cụ có sẵn (thư viện `axios`) biết cách nối địa chỉ này với địa chỉ gốc của backend để ra URL đầy đủ, ví dụ `http://localhost:5000/api/v1/blogs/status/active`.

Request đi qua Internet (hoặc qua mạng máy nếu chạy local), tới đúng cái máy đang chạy backend.

#### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`

Đây là **cửa chính** của cả backend — mọi request, bất kể xin gì, đều phải đi qua file này đầu tiên:

```ts
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger('dev'));
```

Đây là các **middleware** (những "trạm kiểm tra" mà request phải đi qua trước khi tới đúng người xử lý). Không trạm nào ở đây từ chối request của blog, nó chỉ ghi log và chuẩn bị dữ liệu request cho bước sau.

Rồi tới 2 dòng quyết định request được **giao cho ai xử lý tiếp**:

```ts
app.use('/api/v1', blogRouter);
app.use('/api/v1', blogCategoryRouter);
```

Dòng này nói: *"Bất kỳ request nào có địa chỉ bắt đầu bằng `/api/v1`, hãy đưa cho `blogRouter` (hoặc `blogCategoryRouter`) xem có phải việc của nó không."*

#### Bước 4 — Router (lễ tân) khớp đúng địa chỉ và chuyển tiếp

File: `backend/src/routes/blog.routes.ts`

`blogRouter` nhận request có URL đầy đủ `/api/v1/blogs/status/active`, tự bỏ phần `/api/v1` (đã bị xử lý ở bước 3), còn lại `/blogs/status/active`, rồi dò trong danh sách các "địa chỉ nó biết":

```ts
blogRouter.get('/blogs', getAllBlogs);
blogRouter.get('/blogs/status/active', getActiveBlogs);
blogRouter.get('/blogs/:id', getBlogById);
```

Nó thấy khớp đúng dòng `/blogs/status/active` → giao việc cho hàm `getActiveBlogs`.

Điều đáng chú ý: cả 3 dòng GET này **không có** `verifyToken, requireAdmin` đứng trước — nghĩa là ai cũng gọi được, không cần đăng nhập, kể cả `/blogs` (lấy TẤT CẢ bài viết, không lọc trạng thái). Chỉ có các route ghi dữ liệu (tạo/sửa/xoá, xem ở Phần 4) mới bị chặn bởi 2 "trạm kiểm tra" này.

> Lưu ý kỹ thuật nhỏ: `/blogs/status/active` (2 khúc sau `/blogs`) và `/blogs/:id` (1 khúc sau `/blogs`) không bao giờ giẫm chân nhau, vì hệ thống định tuyến so khớp theo **số khúc** trong địa chỉ trước — một request 2 khúc như `/blogs/status/active` sẽ không bao giờ bị `/blogs/:id` (chỉ nhận 1 khúc) nuốt mất, dù `/blogs/:id` được khai báo trước hay sau.

Tương tự, file `backend/src/routes/blogCategory.routes.ts` cũng có `blogCategoryRouter` xử lý `/blogcategories/status/active` → giao cho hàm `getBlogCategoriesActive`.

#### Bước 5 — Controller (đầu bếp) thực sự "nấu"

File: `backend/src/controllers/blog.controllers.ts`, hàm `getActiveBlogs`:

```ts
export const getActiveBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blogs = await blogModel
      .find({ status: BlogStatus.ACTIVE })
      .skip(skip)
      .limit(limit)
      .populate('blog_category_id', 'name');
    const total = await blogModel.countDocuments({ status: BlogStatus.ACTIVE });

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error when fetching active blogs' });
  }
};
```

Controller là nơi **quyết định logic**: nó không tự lưu trữ dữ liệu, mà nhờ `blogModel` (Model, xem bước 6) đi lấy hộ. Ở đây nó yêu cầu Model: *"tìm tất cả bài viết có `status` là `active`, bỏ qua (`skip`) một số bài đầu để phân trang, giới hạn (`limit`) số bài trả về, và với mỗi bài, tra thêm tên danh mục (`populate`) gắn kèm vào"*.

- `page`/`limit` là **phân trang**: nếu trang gửi `?page=2&limit=10`, nó sẽ bỏ qua 10 bài đầu, lấy tiếp 10 bài kế — thực tế `blog.tsx` không truyền `page`/`limit` nên luôn nhận trang 1, tối đa 10 bài (giao diện tự "Tải thêm bài viết" bằng cách hiện dần trong danh sách 10 bài đã tải, không gọi lại API).
- `.populate('blog_category_id', 'name')` là lý do khi nhận kết quả, field `blog_category_id` không phải 1 chuỗi ký tự trơn, mà là cả 1 object có `name` (tên danh mục) đi kèm.

Sau khi có kết quả, Controller KHÔNG trả nguyên dữ liệu database ra — nó gói lại thành JSON theo khuôn quy ước chung của cả dự án: `{ success: true, data: [...], pagination: {...} }`, rồi `res.status(200)` nghĩa là "trả về với mã 200" (200 là mã chuẩn quốc tế nghĩa là "thành công").

Song song đó, `backend/src/controllers/blogCategory.controllers.ts`, hàm `getBlogCategoriesActive`:

```ts
export const getBlogCategoriesActive = async (req: Request, res: Response) => {
  try {
    const result = await blogCategoryModel.find({ status: BlogCategoryStatus.ACTIVE });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};
```

Chỗ này đơn giản hơn: lấy hết danh mục có `status = active`, không phân trang. Chú ý khuôn trả về hơi khác (`result` thay vì `data`) — đây là do 2 người viết code khác thời điểm, không đồng bộ tên field, nhưng cả 2 vẫn hoạt động đúng vì frontend đọc đúng tên field tương ứng.

#### Bước 6 — Model (công thức + tủ lạnh) — nơi thật sự chạm vào database

File: `backend/src/models/blog.model.ts`

```ts
const blogSchema: Schema<IBlog> = new Schema<IBlog>(
  {
    blog_category_id: {
      type: Schema.Types.ObjectId,
      ref: blogCategory,
      autoPopulate: true
    },
    image_url: {
      type: String,
      required: false
    },
    title: {
      type: String,
      required: true
    },
    author: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: BlogStatus,
      default: BlogStatus.ACTIVE
    }
  },
  { timestamps: true }
);
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra) | "Số căn cước" duy nhất của bài viết đó, không bài nào trùng | `"6a57ca2411bb5ed75eb46fcb"` |
| `blog_category_id` | ObjectId (số căn cước của 1 danh mục), có `ref` trỏ tới model `blogCategory` | Bài viết này thuộc danh mục nào. Nhờ `ref` + `populate` (bước 5), khi trả về frontend nó không chỉ là 1 chuỗi mã, mà là cả object `{ _id, name }` | `{ "_id": "66f...", "name": "Kinh nghiệm cắm trại" }` |
| `image_url` | Chữ (String), không bắt buộc | Link tới ảnh minh hoạ bài viết, ảnh này KHÔNG lưu trong database, chỉ lưu chỗ ảnh đang nằm trên Cloudinary (dịch vụ lưu ảnh riêng) | `"https://res.cloudinary.com/.../uploads/blogs/tieu_de_1699999999.png"` |
| `title` | Chữ (String), bắt buộc | Tiêu đề bài viết | `"5 kỹ năng cắm trại cùng chó"` |
| `author` | Chữ (String), bắt buộc | Tên tác giả bài viết | `"Pet Corner Team"` |
| `content` | Chữ (String), bắt buộc — thật ra là 1 đoạn HTML dài | Toàn bộ nội dung bài viết, được soạn bằng trình soạn thảo có định dạng (in đậm, xuống dòng, chèn ảnh...) nên lưu dưới dạng mã HTML | `"<p>Khi đi cắm trại cùng thú cưng...</p>"` |
| `status` | Chữ, chỉ được là 1 trong 2 giá trị cố định (`enum`) | `"active"` = đang cho hiển thị công khai; `"inactive"` = admin đã tạm khóa, không hiện ở trang Blog | `"active"` |
| `createdAt` / `updatedAt` | Ngày giờ, tự MongoDB điền (nhờ dòng `{ timestamps: true }`) | Bài viết này được tạo/sửa lúc nào | `"2026-07-15T17:57:56.425Z"` |

Model của danh mục, file `backend/src/models/blogCategory.model.ts`:

```ts
const blogCategorySchema: Schema<IBlogCategory> = new Schema<IBlogCategory>({
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
    enum: BlogCategoryStatus,
    default: BlogCategoryStatus.ACTIVE
  }
});
```

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra) | "Số căn cước" của danh mục | `"66f0a1b2c3d4e5f678901234"` |
| `name` | Chữ (String) | Tên danh mục, hiện ra ở sidebar bộ lọc | `"Kinh nghiệm cắm trại"` |
| `description` | Chữ (String) | Mô tả ngắn cho danh mục, chỉ admin thấy khi quản lý, không hiện ngoài trang Blog | `"Các bài viết về mẹo cắm trại cùng thú cưng"` |
| `status` | Chữ, `enum` | `"active"` = đang cho lọc/hiển thị; `"inactive"` = ẩn khỏi sidebar | `"active"` |

Khi Controller gọi `blogModel.find({ status: 'active' }).skip(...).limit(...).populate('blog_category_id', 'name')`, Model dịch câu đó thành câu lệnh MongoDB hiểu được: (1) lục trong collection `blogs` lấy đúng bài `status = active`, cắt bớt theo trang; (2) với mỗi bài, lấy `blog_category_id` đang trỏ tới, sang collection `blogcategories` lục tiếp đúng danh mục đó, chỉ lấy field `name`, rồi gắn kèm vào kết quả trước khi trả ngược lên cho Controller.

#### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

1. **Model** nhận kết quả từ MongoDB (đã gắn kèm tên danh mục) → trả về cho **Controller** dưới dạng mảng JavaScript.
2. **Controller** (`getActiveBlogs`) gói mảng đó vào `{ success: true, data: [...], pagination: {...} }`, gọi `res.json(...)` → Express biến nó thành JSON thật và gửi ngược qua Internet.
3. **Router** không làm gì thêm ở chặng về — response cứ thế đi thẳng ra ngoài.
4. Response tới `blogApi.js` ở frontend — `response.data` chính là JSON `{ success: true, data: [...] }` vừa nhận. Tương tự `blogCategoryApi.js` nhận `{ success: true, result: [...] }`.
5. `blog.tsx` nhận `blogData`, gọi `setBlogs(blogData)`; nhận `blogCategoryData`, gọi `setBlogsCategory(blogCategoryData)` — đây là lệnh nói với React: *"dữ liệu đổi rồi, vẽ lại giao diện đi"*.
6. React vẽ lại: sidebar hiện danh sách danh mục để bấm lọc; phần nội dung chính chạy qua `filteredBlogs.slice(0, visiblePosts).map(...)` để vẽ từng bài viết dạng thẻ (ảnh + tiêu đề + đoạn trích + ngày + tác giả), với `<img src={post.image_url} />` — trình duyệt tự tải ảnh **trực tiếp từ Cloudinary**, không qua backend.
7. Việc lọc theo danh mục và theo ô tìm kiếm (`filteredBlogs`) diễn ra **hoàn toàn ở trình duyệt** (không gọi lại API) — vì toàn bộ danh sách bài `active` đã có sẵn trong bộ nhớ, React chỉ lọc mảng đó lại mỗi khi người dùng gõ chữ hoặc bấm 1 danh mục khác.

### 3B. Luồng xem chi tiết 1 bài viết (`/blogs/:id`)

Khi người dùng bấm vào 1 thẻ bài viết ở trang danh sách (`<Link to={`/blogs/${post._id}`}>`), trình duyệt chuyển sang trang chi tiết — về cơ bản đi qua đúng các "trạm" giống 3A (frontend → api.js → index.ts → router → controller → model → database), chỉ khác ở các điểm sau:

- File: `frontend_react/src/pages/blogDetail/blogDetail.tsx`, lấy `id` từ chính URL (`useParams<{ id: string }>()`), rồi gọi:

```tsx
const blogDetailResponse = await BlogApi.getBlogById(params.id);
const blogDetailData = blogDetailResponse.data.data;
setBlogDetail(blogDetailData);
```

- `frontend_react/src/api/blogApi.js`:

```js
getBlogById: async (id) => {
  const response = await api.get(`/v1/blogs/${id}`);
  return { data: response.data };
},
```

- Router khớp dòng `blogRouter.get('/blogs/:id', getBlogById)` trong `backend/src/routes/blog.routes.ts` — route này **cũng không cần đăng nhập**, vì bất kỳ ai cũng phải xem được nội dung 1 bài viết public.
- Controller `getBlogById` (`backend/src/controllers/blog.controllers.ts`):

```ts
export const getBlogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const blog = await blogModel.findById(id);

    if (!blog) {
      res.status(404).json({ success: false, message: 'Blog not found' });
      return;
    }

    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error when fetching blog' });
  }
};
```

Chú ý: hàm này **không** `.populate('blog_category_id', ...)` như `getActiveBlogs` — vì trang chi tiết không cần hiện tên danh mục, nên Controller không tốn thêm 1 lượt tra cứu database không cần thiết. Nếu không tìm thấy bài viết (id sai hoặc đã bị xoá), nó trả về mã `404` ("không tìm thấy") thay vì `200`.

- Ở chặng về, `blogDetail.tsx` nhận bài viết, rồi làm thêm 2 việc đáng chú ý mà trang danh sách không làm:
  - Dùng thư viện `DOMPurify` để **"khử độc"** đoạn `content` (vốn là HTML người dùng/admin soạn ra) trước khi cho hiển thị lên trang, tránh trường hợp nội dung HTML chứa mã độc (kỹ thuật gọi là chống **XSS**).
  - Ghép thêm các thẻ `<meta>` (qua `Helmet`) cho tiêu đề, mô tả, ảnh đại diện — để khi chia sẻ link bài viết lên Facebook, nó hiện đúng ảnh/tiêu đề bài viết đó thay vì hiện trang trắng.

---

## Phần 4 — Luồng khi ADMIN quản lý bài viết (khác gì so với luồng xem ở trên?)

Về cơ bản đi qua đúng các "trạm" giống Phần 3 (app → router → controller → model → database), chỉ khác ở các điểm sau:

1. **Trang danh sách quản trị lấy hết bài viết, không chỉ bài `active`** — `frontend_react/src/admin/blog/blog.tsx` gọi `BlogApi.getAllBlogs()` → `GET /v1/blogs` → hàm `getAllBlogs` (`blog.controllers.ts`):

   ```ts
   export const getAllBlogs = async (req: Request, res: Response): Promise<void> => {
     try {
       const blogs = await blogModel.find().populate('blog_category_id', 'name');
       res.status(200).json({ success: true, data: blogs });
     } catch (error) {
       res.status(500).json({ success: false, message: 'Server error when fetching blogs' });
     }
   };
   ```

   Hàm này lấy **toàn bộ** bài viết, không lọc `status`, không phân trang — để admin thấy được cả bài đang bị khoá (`inactive`) mà sửa lại. Việc tìm kiếm theo tiêu đề, lọc theo trạng thái, và phân trang (10 dòng/trang) đều được `blog.tsx` tự làm ở trình duyệt sau khi đã tải hết 1 lần.

   **Điểm đáng chú ý:** khác với banner (route lấy-tất-cả của banner có `verifyToken, requireAdmin` chặn trước), route `GET /blogs` của blog **không có** 2 "trạm kiểm tra" này trong `blog.routes.ts`:
   ```ts
   blogRouter.get('/blogs', getAllBlogs);
   ```
   Nghĩa là về mặt kỹ thuật, ai gọi thẳng địa chỉ này (kể cả chưa đăng nhập) cũng lấy được danh sách đầy đủ bài viết. Chỉ có các thao tác **ghi** dữ liệu (tạo/sửa/xoá bên dưới) mới thực sự bị chặn nếu chưa đăng nhập hoặc không phải admin.

2. **Thêm/sửa bài viết đi kèm ảnh + nội dung soạn thảo dạng rich-text** — `frontend_react/src/admin/components/blogModal.tsx` dùng `ReactQuill` (1 trình soạn thảo có nút in đậm, chèn ảnh, xuống dòng...) cho ô "Nội dung bài viết", kết quả người dùng gõ ra được lưu thành 1 chuỗi HTML. Vì vừa có file ảnh, vừa có chữ, form phải đóng gói bằng `FormData` (kiểu gói hàng đặc biệt cho phép nhét cả file lẫn chữ vào cùng 1 request) thay vì JSON thường:

   ```tsx
   const formData = new FormData();
   formData.append("title", values.title || "");
   formData.append("blog_category_id", values.blog_category_id || "");
   formData.append("status", values.status === "Hoạt động" ? "active" : "inactive");
   formData.append("content", values.content || "");
   formData.append("author", values.author || "");
   ```

3. **Phải "xuất trình thẻ" admin** — route ghi dữ liệu luôn có `verifyToken, requireAdmin` chặn trước Controller (`backend/src/routes/blog.routes.ts`):

   ```ts
   blogRouter.post('/blogs', verifyToken, requireAdmin, uploader.single('image_url'), createBlog);
   blogRouter.patch('/blogs/:id', verifyToken, requireAdmin, uploader.single('image_url'), updateBlog);
   blogRouter.delete('/blogs/:id', verifyToken, requireAdmin, deleteBlog);
   ```

   `verifyToken` giống bảo vệ kiểm tra "vé vào cửa" (một đoạn mã gọi là JWT token, sinh ra lúc admin đăng nhập); `requireAdmin` kiểm tiếp "vé này có phải loại admin không". Sai 1 trong 2, request bị chặn lại, Controller không bao giờ chạy tới.

4. **Ảnh không lưu trong database, được gửi lên Cloudinary trước** — ngay trước khi vào tới Controller, có 1 "trạm" tên `uploader.single('image_url')` (khai báo ngay trong route ở trên) tự động lấy file ảnh, đẩy lên Cloudinary vào thư mục `uploads/blogs` (xem `backend/src/config/cloudinary.config.ts`, hàm `getFolderFromRoute` tự suy ra thư mục từ chính URL đang gọi), Cloudinary trả về 1 link — Controller chỉ cần lưu cái LINK đó vào field `image_url`.

5. **Ảnh cũ không bị mất khi sửa bài mà không đổi ảnh** — trong `updateBlog` (`backend/src/controllers/blog.controllers.ts`):

   ```ts
   // Giữ ảnh cũ nếu không upload ảnh mới
   let image_url = blog.image_url;
   if (req.file) {
     image_url = req.file.path; // Cập nhật URL mới từ Cloudinary
   }
   ```

   Nếu admin sửa bài mà không chọn ảnh mới, `req.file` sẽ rỗng (`uploader.single` không tạo ra file nào), nên Controller giữ nguyên `image_url` cũ đã lưu trong database, thay vì xoá mất nó.

6. **Danh mục bài viết (BlogCategory) có CRUD riêng của nó** — `frontend_react/src/admin/blog_category/blog_category.tsx` gọi `blogCategoryApi` (`create`, `update`, `delete`) tới router riêng `backend/src/routes/blogCategory.routes.ts`. Các route ghi dữ liệu của danh mục cũng có `verifyToken, requireAdmin`:

   ```ts
   blogCategoryRouter.post('/blogcategories', verifyToken, requireAdmin, insertBlogCategory);
   blogCategoryRouter.patch('/blogcategories/:id', verifyToken, requireAdmin, updateBlogCategory);
   blogCategoryRouter.delete('/blogcategories/:id', verifyToken, requireAdmin, deleteBlogCategory);
   ```

   Danh mục không có ảnh nên form của nó gửi JSON thường, không cần `FormData`.

7. **Trang chủ cũng hiển thị bài blog mới nhất** — trang chủ (`frontend_react/src/pages/home/home.tsx`) gọi cùng API `GET /v1/blogs/status/active`, lấy bài đầu tiên (`blogs[0]`) làm bài viết chính và 3 bài kế tiếp (`blogs.slice(1, 4)`) làm bài liên quan. Luồng này đã được giải thích chi tiết ở tài liệu riêng: xem **`docs/home/README.md`, Phần 5** — không lặp lại ở đây.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu bài viết (thêm field mới) | `backend/src/models/blog.model.ts` + `backend/src/interfaces/blog.interface.ts` |
| Đổi trường dữ liệu danh mục bài viết | `backend/src/models/blogCategory.model.ts` + `backend/src/interfaces/blogCategory.interface.ts` |
| Đổi logic thêm/sửa/xoá/lấy bài viết | `backend/src/controllers/blog.controllers.ts` |
| Đổi logic thêm/sửa/xoá/lấy danh mục bài viết | `backend/src/controllers/blogCategory.controllers.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào (bài viết) | `backend/src/routes/blog.routes.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào (danh mục) | `backend/src/routes/blogCategory.routes.ts` |
| Đổi kích thước/thư mục ảnh khi upload lên Cloudinary | `backend/src/config/cloudinary.config.ts` |
| Đổi giao diện form thêm/sửa bài viết ở admin | `frontend_react/src/admin/components/blogModal.tsx` |
| Đổi giao diện bảng danh sách bài viết ở admin | `frontend_react/src/admin/blog/blog.tsx` |
| Đổi giao diện quản lý danh mục ở admin | `frontend_react/src/admin/blog_category/blog_category.tsx` |
| Đổi giao diện trang danh sách bài viết công khai (`/blogs`) | `frontend_react/src/pages/blog/blog.tsx` |
| Đổi giao diện trang chi tiết 1 bài viết (`/blogs/:id`) | `frontend_react/src/pages/blogDetail/blogDetail.tsx` |
| Đổi cách trang chủ hiển thị 2 bài blog mới nhất | `frontend_react/src/pages/home/home.tsx` (xem thêm `docs/home/README.md`) |
| Đổi endpoint/cách gọi API bài viết từ frontend | `frontend_react/src/api/blogApi.js` |
| Đổi endpoint/cách gọi API danh mục từ frontend | `frontend_react/src/api/blogCategoryApi.js` |
| Đổi enum trạng thái bài viết/danh mục | `backend/src/enums/blog.enum.ts` / `backend/src/enums/blogCategory.enum.ts` |

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/blogs/status/active`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa, DELETE = xoá.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn, upload ảnh...).
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response, nói tình trạng: 200 ổn, 400 request sai định dạng, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **JWT token**: một chuỗi ký tự dài, được sinh ra lúc đăng nhập thành công, dùng như "vé" để các request sau chứng minh "tôi đã đăng nhập, tôi là ai".
- **Schema**: bản thiết kế của Model, quy định 1 document (1 dòng dữ liệu) có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB (tương đương 1 dòng trong bảng Excel) — ví dụ 1 bài viết cụ thể là 1 document trong collection `blogs`.
- **Collection**: tập hợp nhiều document cùng loại (tương đương 1 sheet trong Excel) — ví dụ collection `blogs` chứa tất cả bài viết, collection `blogcategories` chứa tất cả danh mục.
- **Populate**: lệnh nói với Model "đi tra thêm dữ liệu ở 1 collection khác dựa theo cái ID đang lưu, gắn kèm vào kết quả trả về" — ví dụ tra tên danh mục từ `blog_category_id`.
- **Phân trang (pagination)**: kỹ thuật chỉ trả về 1 phần nhỏ dữ liệu mỗi lần (ví dụ 10 bài/lần) thay vì trả hết cùng lúc, dùng `page` (đang ở trang mấy) và `limit` (mỗi trang bao nhiêu bài).
- **FormData / multipart**: một kiểu "gói hàng" của request cho phép gửi kèm cả file (ảnh) lẫn chữ trong cùng 1 lần gửi, khác với JSON thường (JSON chỉ gửi được chữ/số).
- **Rich-text editor (ví dụ ReactQuill)**: ô soạn thảo có định dạng (in đậm, chèn ảnh, xuống dòng...), lưu lại nội dung dưới dạng mã HTML thay vì chữ trơn.
- **XSS / Sanitize (khử độc, ví dụ DOMPurify)**: vì nội dung bài viết là HTML do người dùng soạn, trước khi hiển thị lại phải "lọc sạch" các đoạn mã có thể gây hại (ví dụ đoạn script độc hại) — kỹ thuật này gọi là chống tấn công XSS.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌─────────────┐      ┌───────────────────────┐      ┌──────────────────┐
│  blog.tsx   │ ───▶ │ blogApi.js             │ ───▶ │  index.ts (app)  │
│ (trình duyệt)│      │ blogCategoryApi.js      │      │  cửa chính backend│
└─────────────┘      └───────────────────────┘      └────────┬──────────┘

┌──────────────────────────────────────────────────────────────┘
▼
┌───────────────────────┐   ┌───────────────────────────┐   ┌────────────────────────┐
│ blog.routes.ts         │──▶│ blog.controllers.ts        │──▶│ blog.model.ts           │
│ blogCategory.routes.ts │   │ blogCategory.controllers.ts│   │ blogCategory.model.ts   │
│ khớp URL, chọn hàm     │   │ xử lý logic, gọi Model      │   │ nói chuyện với DB       │
└───────────────────────┘   └───────────────────────────┘   └───────────┬────────────┘
                                                                          ▼
                                                              ┌─────────────────────────┐
                                                              │ MongoDB (database)       │
                                                              │ collection "blogs"        │
                                                              │ collection "blogcategories"│
                                                              └────────────┬────────────┘
                                                                           │
◀──────────────────────────────────────────────────────────────────────────┘
   dữ liệu bài viết + danh mục đi ngược lại đúng đường trên, tới blog.tsx → setBlogs()/setBlogsCategory() → hiện danh sách + sidebar
```

Tóm tắt 1 câu mỗi trạm:

1. **blog.tsx** — trang danh sách vừa mở, tự gọi xin danh sách bài viết `active` và danh sách danh mục.
2. **blogApi.js / blogCategoryApi.js** — đóng gói yêu cầu thành request `GET`, gửi tới `/api/v1/blogs/status/active` và `/api/v1/blogcategories/status/active`.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, rồi được chuyển cho đúng router theo tiền tố URL.
4. **blog.routes.ts / blogCategory.routes.ts** — dò đúng địa chỉ (không cần đăng nhập với các route GET), giao cho đúng hàm controller.
5. **blog.controllers.ts (`getActiveBlogs`)** — nhờ Model tìm bài viết `status = active`, phân trang, và tra kèm tên danh mục (`populate`); **blogCategory.controllers.ts (`getBlogCategoriesActive`)** — tìm danh mục `status = active`.
6. **blog.model.ts / blogCategory.model.ts** — dịch yêu cầu đó thành câu lệnh MongoDB hiểu được, lấy đúng field (`title`, `content`, `image_url`, `author`, `status`, `blog_category_id`, `name`...).
7. **MongoDB** — tìm trong collection `blogs` và `blogcategories`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua (Model → Controller → ra khỏi backend → `blogApi.js`/`blogCategoryApi.js` → `blog.tsx`), React vẽ lại danh sách bài viết + sidebar danh mục. Khi bấm vào 1 bài, `blogDetail.tsx` lặp lại đúng hành trình này với `GET /v1/blogs/:id` để lấy 1 bài duy nhất.

Toàn bộ hành trình này thường chỉ mất vài chục tới vài trăm mili-giây (nhanh hơn một cái chớp mắt).
