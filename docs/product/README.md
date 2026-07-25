# Quản lý sản phẩm (Admin) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi một quản trị viên (admin) mở trang "Quản lý sản phẩm" trong khu vực quản trị của pet-corner: xem danh sách sản phẩm (có lọc, có phân trang), thêm sản phẩm mới, sửa sản phẩm (đặc biệt là cách xử lý ảnh cũ/ảnh mới — phần phức tạp nhất của cả tính năng), xoá sản phẩm, và đổi trạng thái còn hàng/hết hàng. Viết cho người **chưa biết gì về lập trình**, nên phần đầu sẽ nhắc lại vài khái niệm nền tảng trước, sau đó đi vào từng file code thật, theo đúng thứ tự nó chạy.

Sản phẩm (Product) là bảng dữ liệu **phức tạp hơn** Banner: nó không đứng một mình mà có tham chiếu tới 3 bảng khác (Danh mục/Category, Thương hiệu/Brand, Tag), có nhiều ảnh thay vì 1 ảnh, và có logic cập nhật ảnh khá rắc rối. Tài liệu này sẽ đi chậm qua đúng những chỗ rắc rối đó.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt (Chrome, Cốc Cốc...) của người dùng. Ở đây là màn hình admin trong Chrome/Cốc Cốc của bạn |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/products` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" (hoặc đơn xin ghi thêm/sửa/xoá dữ liệu) qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu (hoặc thông báo thành công/lỗi) về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, đi lấy nguyên liệu (dữ liệu), nấu (xử lý), rồi trả món (trả kết quả) |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một sản phẩm trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với tủ lạnh (database) |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu được lưu trữ thật sự, tồn tại lâu dài, không mất khi tắt máy |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Một cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để hai bên (backend/frontend) hiểu nhau |
| **Tham chiếu (ref/populate)** | Món ăn ghi "kèm nước chấm số 5" thay vì viết lại cả công thức nước chấm | Một sản phẩm không tự chứa tên danh mục/thương hiệu, nó chỉ lưu "số căn cước" (ID) của danh mục/thương hiệu đó; khi cần hiển thị tên thật, Model phải "tra cứu hộ" (gọi là `populate`) sang đúng bảng kia |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại.

Điểm thứ hai cần nhớ vì Product có liên quan: **Product tham chiếu tới 3 bảng khác** qua 3 field `category_id`, `brand_id`, `tag_id` (số căn cước của danh mục/thương hiệu/tag). Bản thân 3 bảng đó (Category, Brand, Tag) có tài liệu giải thích riêng ở `docs/category`, `docs/brand`, `docs/tag` — tài liệu này chỉ nhắc tới chúng khi cần, không giải thích lại chi tiết cấu trúc của chúng.

---

## Phần 2 — Bức tranh tổng thể (chỉ vài dòng)

```
Admin mở trang "Quản lý sản phẩm" (product.tsx)
   → gọi API xin danh sách sản phẩm
   → Backend (index.ts → product.routes.ts → product.controllers.ts → product.model.ts)
   → Database (MongoDB, collection "products")
Database → trả dữ liệu → Model → Controller → Router → Backend → Trình duyệt → vẽ lại bảng sản phẩm
```

Admin cũng có thể **ghi** dữ liệu (thêm/sửa/xoá/đổi trạng thái) — luồng ghi đi qua đúng các "trạm" y hệt, chỉ khác ở chỗ có thêm bước "xuất trình thẻ admin" và (với thêm/sửa) thêm bước "gửi ảnh lên Cloudinary". Phần 3 sẽ đi chi tiết luồng **xem danh sách**; Phần 4 so sánh 4 luồng ghi còn lại.

---

## Phần 3 — Từng bước thật: mở trang "Quản lý sản phẩm" và xem danh sách

### Bước 1 — Admin mở trang, trang tự xin dữ liệu

File: `frontend_react/src/admin/product/product.tsx`

Ngay khi trang vừa hiện ra, React tự động chạy đoạn sau **một lần duy nhất** (nhờ `useEffect`):

```tsx
useEffect(() => {
  fetchProducts();
  fetchBrands();
  fetchTags();
}, []);
```

Ba lời gọi chạy gần như cùng lúc: xin danh sách sản phẩm, xin danh sách thương hiệu (để đổ vào ô lọc "Thương hiệu"), xin danh sách tag (để đổ vào ô lọc "Tag"). Ta tập trung vào `fetchProducts`:

```tsx
const fetchProducts = async () => {
  setLoading(true);
  try {
    const response = await productsApi.getAll({ limit: "1000" });
    const productList = response.data.result || [];
    ...
    const formattedProducts = productList.map((product: any) => ({
      key: product._id,
      _id: product._id,
      name: product.name,
      image: product.image_url?.[0] || "",
      images: product.image_url || [],
      quantity: product.quantity || 0,
      quantity_sold: product.quantity_sold || 0,
      status: product.status,
      price: product.price,
      category: product.category_id?.name || "Không xác định",
      brand: product.brand_id?.brand_name || "Không có thương hiệu",
      tag: product.tag_id?.tag_name || "Không có thẻ",
      category_id: product.category_id,
      brand_id: product.brand_id,
      tag_id: product.tag_id,
      discount: product.discount,
      image_url: product.image_url || [],
      description: product.description || "Không có mô tả",
    }));

    setAllProducts(formattedProducts);
    setTotalFiltered(formattedProducts.length);
  } ...
};
```

Đáng chú ý một điểm quan trọng: trang admin xin **luôn 1000 sản phẩm một lượt** (`limit: "1000"`), rồi tự lọc/tự cắt trang **ngay trong trình duyệt** bằng một hàm riêng tên `filterProducts` (xem Bước 7), thay vì mỗi lần đổi bộ lọc lại gọi API mới. Backend thật ra đã chuẩn bị sẵn khả năng lọc/phân trang theo `search`, `status`, `brand`, `category`, `tag`, `priceMin`, `priceMax`, `page`, `limit` ngay tại nguồn (xem Bước 5) — nhưng màn hình admin hiện tại chưa tận dụng các tham số đó, mà tự lọc lại ở phía trình duyệt. Cách này vẫn chạy đúng khi số sản phẩm còn ít, nhưng nếu shop có vài nghìn sản phẩm, tải 1000 bản ghi 1 lúc sẽ chậm hơn nếu lọc thẳng ở backend.

### Bước 2 — `productsApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/productsApi.js`

```js
getAll: async (params = {}) => {
  try {
    const response = await api.get("/v1/products", {
      params,
    });
    return {
      data: response.data,
    };
  } catch (error) {
    console.error("Error fetching products:", error.response?.data || error);
    throw error;
  }
},
```

Dòng này gửi một request kiểu `GET` (nghĩa là "chỉ xin dữ liệu, không thay đổi gì") tới địa chỉ `/v1/products`, kèm theo `params` (ở đây là `{ limit: "1000" }`) được `axios` (thư viện gửi request có sẵn) tự động biến thành phần đuôi URL kiểu `?limit=1000`. `api` biết cách nối địa chỉ này với địa chỉ gốc của backend để ra URL đầy đủ, ví dụ `http://localhost:5000/api/v1/products?limit=1000`.

### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`

```ts
app.use('/api/v1', productRouter);
```

Mọi request bắt đầu bằng `/api/v1` (kể cả `/api/v1/products`) đều được backend chuyển tiếp cho `productRouter` xem có phải việc của nó không (trước đó request cũng đi qua các middleware chung như `cors`, `express.json()`, `logger('dev')` — xem `docs/banner/README.md` Phần 3 Bước 3 nếu muốn ôn lại middleware chung là gì, vì `index.ts` xử lý y hệt cho mọi feature).

### Bước 4 — Router (lễ tân) khớp đúng địa chỉ

File: `backend/src/routes/product.routes.ts`

```ts
productRouter.get('/products', getAllProduct);
productRouter.get('/products/status/active', getProductActive);
productRouter.get('/products/:id', getProductById);
...
productRouter.post('/products', verifyToken, requireAdmin, uploader.array('images_url', 12), insertProduct);
productRouter.patch('/products/:id', verifyToken, requireAdmin, uploader.array('images_url', 12), updateProduct);
productRouter.patch('/products/status/:id', verifyToken, requireAdmin, toggleProduct);
productRouter.patch('/products/toggle-status/:id', verifyToken, requireAdmin, toggleProductStatus);
productRouter.delete('/products/:id', verifyToken, requireAdmin, deleteProduct);
```

Request `GET /products` khớp đúng dòng đầu tiên, được giao cho hàm `getAllProduct`.

Điểm đáng chú ý: dòng `productRouter.get('/products', getAllProduct)` **không có** `verifyToken, requireAdmin` phía trước — nghĩa là về mặt kỹ thuật, ai gọi cũng được, không bắt buộc đăng nhập. Đây là khác biệt so với route lấy toàn bộ banner (`/banners`) vốn luôn yêu cầu admin. Trong dự án này, endpoint `GET /products` hiện chỉ được trang admin dùng (`productsApi.getAll`) — các trang công khai (trang danh sách sản phẩm, tìm kiếm) lại gọi một endpoint khác là `GET /products/status/active` (`productsApi.getProductActive`). Vì cả hai route đều để mở, việc endpoint dành cho admin không có "trạm gác" là một điểm cần lưu ý khi rà soát bảo mật sau này, dù hiện tại chưa gây hại vì dữ liệu trả về không có gì bí mật (chỉ là thông tin sản phẩm công khai).

Ngược lại, mọi route **ghi** dữ liệu (`POST /products`, `PATCH /products/:id`, `PATCH /products/status/:id`, `PATCH /products/toggle-status/:id`, `DELETE /products/:id`) đều có `verifyToken, requireAdmin` đứng trước — hai "trạm kiểm tra" bắt buộc phải qua trước khi tới Controller (xem giải thích ở Phần 4).

### Bước 5 — Controller (đầu bếp) thực sự "nấu"

File: `backend/src/controllers/product.controllers.ts`, hàm `getAllProduct`:

```ts
export const getAllProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, tag, status, brand, category, priceMin, priceMax, page = '1', limit = '10' } = req.query;
    const query: any = {};

    // 1. Lọc theo trạng thái (status)
    if (status && typeof status === 'string') {
      if (!Object.values(ProductStatus).includes(status as ProductStatus)) {
        res.status(400).json({ success: false, message: `Trạng thái không hợp lệ...` });
        return;
      }
      query.status = status;
    }

    // 2. Lọc theo tag (tag_id) — kiểm tra tag có tồn tại thật trong DB không, rồi mới lọc
    ...

    // 3. Tìm kiếm theo tên sản phẩm (search) với hỗ trợ không dấu
    if (search && typeof search === 'string') {
      const searchNoTones = removeVietnameseTones(search);
      query.name = { $regex: searchNoTones, $options: 'i' };
    }

    // 4, 5. Lọc theo brand_id / category_id — cũng kiểm tra tồn tại trước khi lọc
    ...

    // 6. Lọc theo khoảng giá (priceMin/priceMax)
    ...

    // Phân trang
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await productModel.countDocuments(query);

    const result = await productModel
      .find(query)
      .populate('category_id', 'name')
      .populate('brand_id', 'brand_name')
      .populate('tag_id', 'tag_name')
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      message: result.length > 0 ? 'Lấy danh sách sản phẩm thành công' : 'Không tìm thấy sản phẩm phù hợp',
      result,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
  }
};
```

Nói bằng lời cho người không biết code: Controller nhận request, đọc xem admin có gửi kèm điều kiện lọc nào không (`search`, `tag`, `status`, `brand`, `category`, `priceMin`, `priceMax` — trong request lần này từ trang admin, các ô này đều trống, chỉ có `limit=1000`). Với mỗi điều kiện, nó **kiểm tra hợp lệ trước khi lọc** — ví dụ nếu admin lọc theo `tag`, nó không lọc mù quáng mà đi hỏi `tagModel.findById(tag)` xem tag đó có thật trong database không, nếu không có thì trả lỗi 404 ngay, tránh lọc ra một danh sách rỗng gây hiểu lầm. Sau khi ráp xong "điều kiện lọc" (biến `query`), nó nhờ Model đếm tổng số sản phẩm khớp điều kiện (`countDocuments`, dùng để tính tổng số trang), rồi nhờ Model lấy đúng một "trang" kết quả (`skip`/`limit`), đồng thời **tra cứu hộ** tên danh mục/thương hiệu/tag (`populate`) để trả về sẵn `category_id.name`, `brand_id.brand_name`, `tag_id.tag_name` thay vì chỉ trả về những chuỗi ID vô nghĩa với người đọc.

Chú ý dòng tìm theo tên (`search`): nó tự bỏ dấu tiếng Việt của từ khoá gõ vào (hàm `removeVietnameseTones`) trước khi so khớp bằng "biểu thức so khớp mẫu" (`$regex`), nghĩa là gõ "meo" cũng tìm ra sản phẩm tên "Mèo" — nhưng vì `name` trong database không được bỏ dấu sẵn khi lưu, cách so khớp này chỉ khớp đúng khi tên sản phẩm gốc không dấu, còn tên có dấu (ví dụ "Thức ăn cho Mèo") vẫn được MongoDB so trực tiếp ký tự, nên tìm không dấu chỉ chắc chắn hoạt động tốt khi từ khoá không dấu trùng khớp phần không dấu của chuỗi có dấu (đây là một quyết định kỹ thuật đơn giản hoá, không phải bỏ dấu 2 chiều hoàn chỉnh).

### Bước 6 — Model (công thức + tủ lạnh) — nơi thật sự chạm vào database

File: `backend/src/models/product.model.ts`

```ts
const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: String, required: true },
    category_id: { type: Schema.Types.ObjectId, ref: category, autoPopulate: true, required: [true, 'category_id is required'] },
    image_url: [String],
    brand_id: { type: Schema.Types.ObjectId, ref: brand, autoPopulate: true, required: [true, 'brand_id is required'] },
    tag_id: { type: Schema.Types.ObjectId, ref: tag, autoPopulate: true },
    status: { type: String, enum: ProductStatus, default: ProductStatus.AVAILABLE },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    quantity_sold: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra) | "Số căn cước" duy nhất của sản phẩm, không sản phẩm nào trùng | `"6a57ca2411bb5ed75eb46fcb"` |
| `name` | Chữ (String), bắt buộc | Tên sản phẩm hiển thị cho khách | `"Thức ăn hạt cho mèo Royal Canin 2kg"` |
| `description` | Chữ (String), bắt buộc | Mô tả chi tiết, được soạn bằng trình soạn thảo có định dạng (in đậm, xuống dòng...) nên thật ra lưu dạng HTML | `"<p>Sản phẩm nhập khẩu...</p>"` |
| `price` | **Chữ (String)**, bắt buộc | Giá bán. Lưu ý: field này khai báo kiểu **String (chuỗi chữ)**, không phải Number (số) — mọi phép so sánh giá (lọc theo khoảng giá ở Bước 5) đang so một con số với một field vốn là chữ, nên khi lọc `priceMin`/`priceMax` có thể cho kết quả không như mong đợi trong vài trường hợp; đây là điểm cần lưu ý nếu sau này ai đó sửa logic liên quan tới giá | `"250000"` |
| `category_id` | ObjectId, tham chiếu (`ref`) sang bảng `category`, bắt buộc | Sản phẩm thuộc danh mục nào (ví dụ "Thức ăn cho mèo") — chỉ lưu ID, muốn biết tên phải `populate` | `"66f0a1..."` |
| `image_url` | **Mảng chữ** (`[String]`) | Danh sách link ảnh sản phẩm (có thể nhiều ảnh, khác với Banner chỉ có 1 ảnh) — mỗi phần tử là 1 link ảnh trên Cloudinary | `["https://res.cloudinary.com/.../a_123.jpg", "https://res.cloudinary.com/.../b_456.jpg"]` |
| `brand_id` | ObjectId, tham chiếu sang bảng `brand`, bắt buộc | Sản phẩm thuộc thương hiệu nào | `"66f0b2..."` |
| `tag_id` | ObjectId, tham chiếu sang bảng `tag`, KHÔNG bắt buộc | Gắn thêm 1 tag/nhãn cho sản phẩm (nếu có) | `"66f0c3..."` hoặc để trống |
| `status` | Chữ, chỉ được là 1 trong các giá trị cố định (`enum`) | `"available"` = còn hàng; `"out_of_stock"` = hết hàng; `"discontinued"` = ngừng kinh doanh | `"available"` |
| `discount` | Số (0-100), mặc định `0` | Phần trăm giảm giá | `10` (giảm 10%) |
| `quantity` | Số, mặc định `0` | Số lượng còn trong kho | `50` |
| `quantity_sold` | Số, mặc định `0` | Tổng số lượng đã bán được (cộng dồn khi có đơn hàng — chi tiết cách cộng dồn này không thuộc phạm vi tài liệu này) | `120` |
| `createdAt` / `updatedAt` | Ngày giờ, tự MongoDB điền (nhờ `{ timestamps: true }`) | Sản phẩm được tạo/sửa lúc nào | `"2026-07-15T17:57:56.425Z"` |

Khi Controller gọi `productModel.find(query).populate('category_id', 'name').populate('brand_id', 'brand_name').populate('tag_id', 'tag_name').skip(skip).limit(limitNum)`, Model dịch câu đó thành lệnh MongoDB thật, đi lấy đúng những sản phẩm khớp `query`, cắt đúng "trang" (`skip`/`limit`), và với mỗi sản phẩm, đi sang bảng `category`/`brand`/`tag` lấy hộ đúng field `name`/`brand_name`/`tag_name` (chỉ lấy đúng field được yêu cầu, không lấy nguyên cả bảng kia cho nhẹ), rồi gắn kết quả đó thay vào chỗ vốn chỉ là 1 chuỗi ID.

### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

1. **Model** trả mảng sản phẩm (đã có sẵn `category_id.name`, `brand_id.brand_name`, `tag_id.tag_name`) cho **Controller**.
2. **Controller** gói vào `{ success: true, message: ..., result: [...], pagination: {...} }`, gọi `res.json(...)`.
3. **Router** không làm gì thêm ở chặng về.
4. Response tới `productsApi.js` — `getAll` trả `{ data: response.data }`, tức `data.result` chính là mảng sản phẩm.
5. `product.tsx` nhận `response.data.result`, `map` lại thành mảng `Product[]` gọn hơn cho bảng (đổi `category_id.name` thành `category`, v.v. — xem lại Bước 1), gọi `setAllProducts(...)`.
6. Một `useEffect` khác tự chạy lại mỗi khi `allProducts`/bộ lọc/`currentPage` đổi, gọi `filterProducts()`:

```tsx
const filterProducts = () => {
  let result = [...allProducts];
  if (searchText) {
    const searchNoAccents = removeAccents(searchText.toLowerCase());
    result = result.filter((product) => removeAccents(product.name.toLowerCase()).includes(searchNoAccents));
  }
  if (filterStatus) result = result.filter((product) => product.status === filterStatus);
  if (filterBrand) result = result.filter((product) => (product.brand_id && typeof product.brand_id === "object" ? product.brand_id._id === filterBrand : product.brand_id === filterBrand));
  if (filterTag) result = result.filter((product) => (product.tag_id && typeof product.tag_id === "object" ? product.tag_id._id === filterTag : product.tag_id === filterTag));

  setTotalFiltered(result.length);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  setFilteredProducts(result.slice(start, end));
};
```

Đây chính là nơi bộ lọc "Tìm kiếm", "Lọc theo trạng thái/thương hiệu/tag" và phân trang **thực sự chạy** — hoàn toàn bằng JavaScript ngay trong trình duyệt, trên 1000 sản phẩm đã tải sẵn từ Bước 1, không gọi thêm request nào tới backend. `setFilteredProducts` chỉ giữ lại đúng 10 dòng (`pageSize = 10`) của đúng trang đang xem.

7. React vẽ lại `<Table columns={columns} dataSource={filteredProducts} ... />` — mỗi dòng bảng ứng với 1 sản phẩm, cột "Ảnh" là thẻ `<Image src={text} />` khiến trình duyệt tự tải ảnh **trực tiếp từ Cloudinary** (không qua backend) và hiển thị.

Vậy là luồng xem danh sách hoàn tất.

---

## Phần 4 — So sánh với các luồng ghi dữ liệu khác (thêm / sửa / xoá / đổi trạng thái)

Cả 4 luồng dưới đây đều đi qua đúng các "trạm" giống Phần 3 (`index.ts` → `product.routes.ts` → `product.controllers.ts` → `product.model.ts` → MongoDB), khác nhau ở Controller làm gì và ở chỗ đều có 2 "trạm gác" bắt buộc trước Controller: `verifyToken` (kiểm tra "vé vào cửa" — JWT token sinh ra lúc admin đăng nhập) và `requireAdmin` (kiểm tiếp "vé này có phải loại admin không"). Sai 1 trong 2, request bị chặn lại (401/403), Controller không bao giờ chạy tới.

### 4.1 Thêm sản phẩm mới

Route: `productRouter.post('/products', verifyToken, requireAdmin, uploader.array('images_url', 12), insertProduct)`

Trước khi tới `insertProduct`, có thêm 1 "trạm" nữa: `uploader.array('images_url', 12)` (khai báo Cloudinary/multer ở `backend/src/config/cloudinary.config.ts`) — nó tự động nhận tối đa 12 file ảnh admin tải lên, đẩy từng file lên Cloudinary (thư mục `uploads/products`, tự nén về tối đa 800x800px), rồi gắn kết quả (đường link ảnh + đường dẫn tạm) vào `req.files` trước khi Controller chạy.

Vì có ảnh đi kèm, `productModal.tsx` (form thêm/sửa) phải đóng gói dữ liệu bằng `FormData` (một kiểu gói hàng cho phép nhét cả file lẫn chữ vào cùng 1 request) thay vì JSON thường:

```tsx
const formData = new FormData();
formData.append("name", values.name || "");
formData.append("price", values.price?.toString() || "");
formData.append("category_id", values.category_id || "");
...
newImages.forEach((img) => formData.append("images_url", img.file));

if (product) {
  await productsApi.update(product._id, formData);
} else {
  await productsApi.create(formData);
}
```

Controller `insertProduct`:

```ts
export const insertProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.files) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const images: string[] = [];
    const fileData = req.files;
    if (Array.isArray(fileData) && fileData.length > 0) {
      fileData.map((file) => { images.push(file?.path); });
    }
    const { name, description, price, category_id, tag_id, brand_id, status } = req.body;
    if (!mongoose.isValidObjectId(category_id)) {
      res.status(400).json({ message: 'Required field' });
      return;
    }
    const newProduct = new productModel<Partial<IProduct>>({
      name, description, price, category_id, image_url: images, tag_id, brand_id, status
    });
    await newProduct.save();
    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error });
  }
};
```

Nói bằng lời: bắt buộc phải có ít nhất ảnh gửi kèm, lấy đúng `file.path` (link Cloudinary) của từng ảnh gộp thành mảng `images`, kiểm tra `category_id` gửi lên có đúng định dạng "số căn cước" MongoDB hay không, rồi tạo 1 document sản phẩm mới và lưu (`save()`). Trả về mã `201` (thành công, "đã tạo mới" — khác `200` là "thành công" chung chung).

### 4.2 Sửa sản phẩm — phần phức tạp nhất: xử lý ảnh cũ/ảnh mới

Route: `productRouter.patch('/products/:id', verifyToken, requireAdmin, uploader.array('images_url', 12), updateProduct)`

Đây là chỗ khác biệt lớn nhất so với Banner (Banner chỉ có 1 ảnh, thay là thay hẳn; Product có **nhiều ảnh xếp theo thứ tự**, admin có thể: giữ nguyên vài ảnh cũ, xoá vài ảnh cũ, thay thế 1 ảnh cụ thể bằng ảnh mới, hoặc thêm ảnh mới vào cuối — tất cả trong cùng 1 lần bấm "Lưu").

**Phía frontend** (`productModal.tsx`) chuẩn bị dữ liệu ảnh trước khi gửi:

```tsx
const originalImages = product?.images || [];
const existingImages: string[] = [];
const newImages: { file: any; index: number }[] = [];

imageFileList.forEach((file) => {
  if (file.url && !file.originFileObj) {
    // Ảnh cũ giữ lại
    if (originalImages.includes(file.url)) {
      existingImages.push(file.url);
    }
  } else if (file.originFileObj) {
    // Ảnh mới (thay thế hoặc thêm)
    newImages.push({
      file: file.originFileObj,
      index: file.index !== undefined ? file.index : originalImages.length + newImages.length,
    });
  }
});

if (existingImages.length > 0) {
  formData.append("existing_images", JSON.stringify(existingImages));
}
if (newImages.length > 0) {
  formData.append("new_images", JSON.stringify(newImages.map((img) => ({ index: img.index }))));
  newImages.forEach((img) => formData.append("images_url", img.file));
}
```

Giải thích bằng lời: ô "Ảnh sản phẩm" trên form hiển thị danh sách ảnh hiện có (đã đánh số thứ tự `index` khi nạp form — xem lại đoạn `formattedImages` trong `productModal.tsx`). Với mỗi ảnh trong danh sách đó lúc bấm "Lưu":
- Nếu nó **vẫn là ảnh cũ** (có `url`, không có `originFileObj` — nghĩa là admin không đụng vào) → cho vào `existingImages`, gửi lên backend dưới tên `existing_images` (một chuỗi JSON chứa mảng link ảnh muốn **giữ lại**).
- Nếu nó là **file mới** (có `originFileObj` — do admin vừa tải lên, hoặc vừa bấm vào 1 ảnh cũ để thay thế bằng ảnh khác thông qua `handleImagePreview`) → cho vào `newImages`, nhớ kèm theo `index` là **vị trí** ảnh đó nên nằm ở đâu trong danh sách cuối cùng. Các file ảnh thật được gửi lên qua field `images_url` (multer nhận thành mảng `req.files`), còn "vị trí của từng file" được gửi riêng qua `new_images` (JSON) — vì HTTP không có cách nào tự gắn kèm 1 con số vào giữa 1 file ảnh, nên phải tách làm 2 field rồi để Controller ráp lại bằng thứ tự.
- Nếu admin **xoá hẳn 1 ảnh cũ** khỏi danh sách (bấm nút xoá trên ô ảnh) → ảnh đó biến mất khỏi `imageFileList`, nên không lọt vào cả `existingImages` lẫn `newImages` → mặc nhiên bị loại khỏi sản phẩm sau khi lưu.

**Phía backend** (`updateProduct`) ráp lại đúng thứ tự đó:

```ts
let images_url: string[] = [...(currentProduct.image_url || [])];

let keptImages: string[] = [];
if (existing_images) {
  keptImages = typeof existing_images === 'string' ? JSON.parse(existing_images) : existing_images;
  if (!Array.isArray(keptImages)) keptImages = [];
}

if (req.files && Array.isArray(req.files) && req.files.length > 0) {
  const newImagesPaths = req.files.map((file) => file.path);
  let newImagesIndices = [];
  if (new_images) {
    newImagesIndices = typeof new_images === 'string' ? JSON.parse(new_images) : new_images;
  }

  const finalImages: string[] = [];
  const maxIndex = Math.max(images_url.length, ...newImagesIndices.map((ni: any) => ni.index));

  for (let i = 0; i <= maxIndex; i++) {
    const newImageIndex = newImagesIndices.findIndex((ni: any) => ni.index === i);
    if (newImageIndex !== -1) {
      finalImages[i] = newImagesPaths[newImageIndex]; // ảnh mới ghi đè đúng vị trí i
    } else if (i < images_url.length && keptImages.includes(images_url[i])) {
      finalImages[i] = images_url[i]; // ảnh cũ được giữ lại đúng vị trí i
    }
    // nếu không rơi vào 2 trường hợp trên: vị trí i bị bỏ trống (ảnh đã bị admin xoá)
  }

  images_url = finalImages.filter((img) => img !== undefined);
} else {
  // Không có ảnh mới nào cả -> danh sách ảnh cuối cùng chỉ còn đúng những ảnh admin chọn giữ lại
  images_url = keptImages;
}
```

Nói lại bằng ví dụ cụ thể cho dễ hình dung: giả sử sản phẩm đang có 3 ảnh ở vị trí `[0, 1, 2]`. Admin xoá ảnh ở vị trí 1, và thay ảnh ở vị trí 2 bằng 1 ảnh mới. Khi đó frontend gửi lên: `existing_images = ["link-ảnh-0"]` (chỉ còn ảnh 0 được giữ), `new_images = [{ index: 2 }]`, kèm 1 file ảnh thật trong `images_url`. Backend duyệt từ vị trí `0` tới `maxIndex`: vị trí 0 không có ảnh mới nhưng nằm trong `keptImages` → giữ ảnh cũ; vị trí 1 không có ảnh mới và ảnh cũ ở đó không nằm trong `keptImages` (vì admin đã xoá nó khỏi `existing_images`) → bỏ trống; vị trí 2 có ảnh mới theo `new_images` → dùng ảnh mới. Kết quả cuối: mảng 2 ảnh `[ảnh-0-cũ, ảnh-mới]` — đúng như admin mong muốn, mà **hoàn toàn không cần xoá gì trên Cloudinary**, chỉ đơn giản là không còn nhắc tới link ảnh cũ đó trong `image_url` nữa (ảnh vẫn tồn tại thật trên Cloudinary, chỉ không được sản phẩm này trỏ tới nữa — không có đoạn code nào gọi Cloudinary xoá file, nên các ảnh "bị bỏ" vẫn nằm lại trên Cloudinary, không mất dung lượng lưu trữ dù không còn hiển thị ở đâu).

Đây cũng là lý do vì sao **ảnh cũ không bị mất khi admin sửa các trường khác (tên, giá...) mà không đụng vào ảnh**: vì `images_url` luôn được khởi tạo bằng đúng `currentProduct.image_url` hiện có trong database (`let images_url: string[] = [...(currentProduct.image_url || [])]`), và nếu admin không xoá ảnh nào khỏi form thì toàn bộ ảnh cũ tự động nằm trong `existingImages`/`existing_images`, nên vẫn được giữ nguyên qua bước ráp lại ở trên.

Sau khi có `images_url` cuối cùng, Controller cập nhật toàn bộ sản phẩm:

```ts
const updatedProduct = await productModel.findByIdAndUpdate(
  id,
  { name, description, price, category_id, image_url: images_url, brand_id, status, tag_id, quantity, discount },
  { new: true, runValidators: true }
);
```

`{ new: true }` nghĩa là trả về bản ghi **sau khi** đã cập nhật (không phải bản cũ); `runValidators: true` nghĩa là vẫn áp dụng lại các luật ràng buộc khai báo trong Model (ví dụ `discount` phải từ 0-100) ngay cả khi cập nhật, không chỉ khi tạo mới.

### 4.3 Xoá sản phẩm

Route: `productRouter.delete('/products/:id', verifyToken, requireAdmin, deleteProduct)`

```ts
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id).populate('category_id').populate('brand_id').populate('tag_id');
    if (!product) {
      res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      return;
    }
    await productModel.findByIdAndDelete(id);
    res.status(200).json({ message: 'Xóa sản phẩm thành công', product });
  } catch (error) {
    res.status(500).json({ message: 'Error getting product', error });
  }
};
```

Controller tìm sản phẩm trước (để biết chắc nó tồn tại và để trả về thông tin đầy đủ của sản phẩm vừa xoá trong response), rồi mới thực sự xoá bằng `findByIdAndDelete`. Cũng giống mục 4.2, việc xoá này **chỉ xoá document trong MongoDB**, không xoá ảnh tương ứng khỏi Cloudinary.

Điểm cần lưu ý: hàm `deleteProduct` và hàm `productsApi.delete(id)` (`frontend_react/src/api/productsApi.js`) đã có sẵn và hoạt động đầy đủ ở tầng backend/API, nhưng **giao diện bảng danh sách sản phẩm hiện tại** (`frontend_react/src/admin/product/product.tsx`, cột "Chức năng") **chỉ có nút Sửa, chưa có nút Xoá nào gọi tới `productsApi.delete`**. Nói cách khác: về mặt code, tính năng xoá sản phẩm đã viết xong ở backend nhưng chưa được nối vào giao diện admin — hiện admin chưa có cách xoá sản phẩm qua màn hình quản lý, trừ khi gọi API trực tiếp.

### 4.4 Đổi trạng thái còn hàng/hết hàng

Trang admin gọi:

```js
toggleStatus: async (id, status) => {
  const response = await api.patch(`/v1/products/toggle-status/${id}`, { status }, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return response.data;
},
```

khớp route `productRouter.patch('/products/toggle-status/:id', verifyToken, requireAdmin, toggleProductStatus)`, chạy Controller `toggleProductStatus`:

```ts
export const toggleProductStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!Object.values(ProductStatus).includes(status as ProductStatus)) {
      res.status(400).json({ message: `Trạng thái không hợp lệ...` });
      return;
    }
    const product = await productModel.findById(id);
    if (!product) {
      res.status(404).json({ message: 'Sản phẩm không tồn tại' });
      return;
    }
    product.status = status;
    await product.save();
    res.status(200).json({ message: `Trạng thái sản phẩm đã được cập nhật thành ${status} thành công`, product });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái sản phẩm', error });
  }
};
```

Đơn giản: tìm đúng sản phẩm, kiểm tra `status` mới gửi lên có nằm trong danh sách hợp lệ (`available`/`out_of_stock`/`discontinued`) không, gán rồi lưu lại. Trong file controller còn có 1 hàm tên gần giống là `toggleProduct` (route `PATCH /products/status/:id`, nhận `status` qua query string `?status=...` thay vì qua body) — hàm này vẫn tồn tại trong route nhưng **không có nơi nào trong frontend hiện tại gọi tới nó**; màn hình admin chỉ dùng `toggleProductStatus` (qua body). Nhiều khả năng đây là phiên bản cũ hơn được giữ lại, chưa dọn dẹp.

**Riêng về gọi API khác:** 3 khối sản phẩm hiển thị ở trang chủ ("Sản phẩm mới", "Sản phẩm giảm giá", "Sản phẩm bán chạy" — dùng `getNewProduct`, `getSaleProduct`, `getHotProduct` trong cùng file controller này) không thuộc phạm vi quản trị nên không nhắc lại chi tiết ở đây — xem `docs/home-products/README.md` (hoặc `docs/home/README.md`).

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu sản phẩm (thêm field mới) | `backend/src/models/product.model.ts` + `backend/src/interfaces/product.interface.ts` |
| Đổi danh sách trạng thái hợp lệ (`available`/`out_of_stock`/`discontinued`) | `backend/src/enums/product.enum.ts` |
| Đổi logic lọc/phân trang danh sách sản phẩm | `backend/src/controllers/product.controllers.ts`, hàm `getAllProduct` |
| Đổi logic thêm sản phẩm | `backend/src/controllers/product.controllers.ts`, hàm `insertProduct` |
| Đổi logic sửa sản phẩm / cách ráp ảnh cũ-mới | `backend/src/controllers/product.controllers.ts`, hàm `updateProduct` |
| Đổi logic xoá sản phẩm | `backend/src/controllers/product.controllers.ts`, hàm `deleteProduct` |
| Đổi logic đổi trạng thái | `backend/src/controllers/product.controllers.ts`, hàm `toggleProductStatus` (và `toggleProduct` nếu muốn dọn luôn bản cũ) |
| Đổi địa chỉ API, đổi ai được gọi API nào | `backend/src/routes/product.routes.ts` |
| Đổi kích thước/tỉ lệ ảnh sản phẩm khi upload lên Cloudinary | `backend/src/config/cloudinary.config.ts` |
| Đổi giao diện form thêm/sửa sản phẩm (kể cả logic chọn ảnh) | `frontend_react/src/admin/components/productModal.tsx` |
| Đổi giao diện bảng danh sách sản phẩm, ô lọc/tìm kiếm, thêm nút Xoá | `frontend_react/src/admin/product/product.tsx` |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/productsApi.js` |
| Xem sản phẩm tham chiếu danh mục/thương hiệu/tag như thế nào (chi tiết bảng đó) | `docs/category/README.md`, `docs/brand/README.md`, `docs/tag/README.md` (nếu đã có) |
| Xem cách trang chủ chọn "Sản phẩm mới/giảm giá/bán chạy" | `docs/home-products/README.md` |

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/products`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa một phần, DELETE = xoá.
- **Query string / query params**: phần đuôi URL sau dấu `?`, dùng để gửi kèm điều kiện lọc khi xin dữ liệu — ví dụ `?limit=1000&status=available`.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn, upload ảnh...).
- **Status code (200, 201, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response — 200 ổn, 201 vừa tạo mới thành công, 400 request sai định dạng, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **JWT token**: một chuỗi ký tự dài, được sinh ra lúc đăng nhập thành công, dùng như "vé" để các request sau chứng minh "tôi đã đăng nhập, tôi là ai".
- **Schema**: bản thiết kế của Model, quy định 1 document (1 dòng dữ liệu) có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB — ví dụ 1 sản phẩm cụ thể là 1 document trong collection `products`.
- **Collection**: tập hợp nhiều document cùng loại — ví dụ collection `products` chứa tất cả sản phẩm.
- **ObjectId**: kiểu "số căn cước" đặc biệt của MongoDB, dùng làm `_id` và dùng khi 1 bảng tham chiếu (`ref`) sang bảng khác (ví dụ `category_id`).
- **populate**: hành động Model "tra cứu hộ" sang bảng khác dựa trên ObjectId đang lưu, để lấy về thông tin thật (ví dụ từ `category_id` tra ra được `category_id.name`) thay vì chỉ có 1 chuỗi ID vô nghĩa.
- **multipart/form-data**: kiểu đóng gói request đặc biệt cho phép gửi kèm cả file (ảnh) lẫn chữ/số trong cùng 1 lần gửi — dùng `FormData` ở frontend, khác với JSON thường (JSON không gửi được file).
- **regex ($regex)**: "biểu thức so khớp mẫu", cho phép tìm chuỗi theo kiểu "có chứa đoạn này" thay vì phải khớp y hệt toàn bộ.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3-4)

```
┌──────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  product.tsx │ ───▶ │ productsApi.js   │ ───▶ │  index.ts (app)  │
│ (trang admin)│      │ (gói request)     │      │  cửa chính backend│
└──────────────┘      └──────────────────┘      └────────┬──────────┘

┌──────────────────────────────────────────────────────────┘
▼
┌────────────────────┐    ┌───────────────────────────┐    ┌───────────────────┐
│ product.routes.ts   │ ─▶ │ product.controllers.ts     │ ─▶ │ product.model.ts   │
│ khớp URL, chọn hàm,  │    │ lọc/phân trang, ráp ảnh     │    │ nói chuyện với DB,  │
│ gác cổng admin+ảnh   │    │ cũ/mới, gọi Model           │    │ populate category/  │
└────────────────────┘    └───────────────────────────┘    │ brand/tag           │
                                                              └─────────┬─────────┘
                                                                         ▼
                                                              ┌────────────────────┐
                                                              │ MongoDB (database)  │
                                                              │ collection "products"│
                                                              └─────────┬─────────┘
                                                                         │
◀────────────────────────────────────────────────────────────────────────┘
   dữ liệu sản phẩm đi ngược lại đúng đường trên, tới product.tsx → lọc/phân trang
   ở trình duyệt → hiện lên Table
```

Tóm tắt 1 câu mỗi trạm (cho luồng xem danh sách — luồng chính):

1. **product.tsx** — trang admin vừa mở, tự gọi xin 1000 sản phẩm 1 lượt.
2. **productsApi.js** — đóng gói yêu cầu thành 1 request `GET`, gửi tới `/v1/products?limit=1000`.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, rồi được chuyển cho `productRouter`.
4. **product.routes.ts** — khớp `/products` (route này không cần đăng nhập), giao cho hàm `getAllProduct`.
5. **product.controllers.ts** — hàm `getAllProduct` ráp điều kiện lọc (nếu có), nhờ Model đếm tổng số + lấy đúng 1 trang, kèm tra cứu (`populate`) tên danh mục/thương hiệu/tag.
6. **product.model.ts** — dịch yêu cầu thành lệnh MongoDB, lấy đúng field (`name`, `price`, `image_url`, `category_id`...).
7. **MongoDB** — tìm trong collection `products`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại (Model → Controller → ra khỏi backend → `productsApi.js` → `product.tsx`), rồi `product.tsx` tự lọc/tự cắt trang bằng JavaScript (`filterProducts`) và vẽ lại `Table`.

Với các luồng ghi (thêm/sửa/xoá/đổi trạng thái): thêm 2 "trạm gác" `verifyToken` + `requireAdmin` trước Controller; thêm/sửa còn có thêm 1 "trạm" `uploader.array('images_url', 12)` tự đẩy ảnh lên Cloudinary trước khi Controller chạy. Sửa sản phẩm là luồng phức tạp nhất vì phải ráp lại đúng thứ tự ảnh cũ giữ lại + ảnh mới thay/thêm dựa trên cặp `existing_images`/`new_images` gửi từ frontend (xem Phần 4.2). Nút "Xoá" đã có sẵn ở backend/API nhưng hiện chưa được gắn trên giao diện bảng danh sách.
