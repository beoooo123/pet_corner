# Trang chủ — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi một người mở trang chủ pet-corner (`frontend_react/src/pages/home/home.tsx`). Trang chủ là trang phức tạp nhất trong dự án vì nó phải xin dữ liệu từ **6 nguồn khác nhau cùng lúc** (banner, danh mục, sản phẩm mới, sản phẩm giảm giá, sản phẩm bán chạy, tin tức). Viết cho người **chưa biết gì về lập trình**.

> Trọng tâm tài liệu này là trả lời chính xác 2 câu hỏi hay bị nhầm: **"Sản phẩm nổi bật" lấy dựa trên cái gì?** và **"Sản phẩm bán chạy" dựa trên cái gì?** — xem ngay Phần 4 nếu chỉ cần câu trả lời nhanh.

---

## Đính chính trước khi vào chi tiết

Sau khi kiểm tra kỹ code: **trang chủ không có khối nào tên là "sản phẩm nổi bật"**, và cũng **không có "tab" để chuyển qua lại** giữa các loại sản phẩm. Thực tế trang chủ có **3 khối sản phẩm hiện SONG SONG, xếp chồng từ trên xuống** (`frontend_react/src/pages/home/home.tsx`, dòng 181-194):

1. **"SẢN PHẨM MỚI"** — component `NewProduct`
2. **"SẢN PHẨM GIẢM GIÁ"** — component `SaleProduct`
3. **"SẢN PHẨM BÁN CHẠY"** — component `HotProduct`

Trong 3 cái tên này, không có tên nào là "nổi bật" theo đúng nghĩa đen trong code. Nếu ý là *"sản phẩm được ưu tiên đưa lên đầu trang chủ để khách chú ý"*, thì gần nghĩa nhất chính là khối **"SẢN PHẨM BÁN CHẠY"** (tiếng Anh trong code là `HotProduct`/`hotproducts` — "hot" cũng thường được hiểu là "nổi bật, hot trend"). Tài liệu này sẽ giải thích rõ tiêu chí của **cả 3 khối**, đặc biệt là khối "bán chạy", để không còn nhầm lẫn.

---

## Phần 1 — Vài khái niệm cần biết trước

Hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt của người dùng |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên máy chủ ở xa, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/hotproducts` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, lấy dữ liệu, xử lý, trả kết quả |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một sản phẩm trông như thế nào" (có field gì) và là thứ duy nhất được nói chuyện trực tiếp với database |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu lưu trữ thật sự, không mất khi tắt máy |
| **`.sort()` / `.limit()`** (trong Model) | Dặn đầu bếp "xếp món theo thứ tự nào, lấy tối đa bao nhiêu phần" | Cách Model yêu cầu database sắp xếp kết quả theo 1 field và giới hạn số lượng trả về |
| **Gọi nhiều API "song song" (`Promise.all`)** | Một người đưa cùng lúc nhiều đơn gọi món cho nhiều đầu bếp khác nhau, không cần đợi món này xong mới đưa đơn tiếp | Frontend gửi nhiều request cùng lúc, không đợi cái trước xong mới gửi cái sau, nên nhanh hơn |
| **Gọi API "tuần tự" (`await` nối tiếp nhau)** | Đưa đơn cho lễ tân, đứng đợi món ra tận bàn xong mới đưa đơn tiếp theo | Frontend gửi request A, đợi có kết quả A xong mới gửi request B — chậm hơn cách song song |

Điểm quan trọng nhất: **Frontend không bao giờ đọc trực tiếp database**, luôn phải "hỏi" qua API.

---

## Phần 2 — Bức tranh tổng thể (chỉ vài dòng)

```
Trang chủ (home.tsx) vừa mở
  → useEffect thứ nhất chạy 1 lần, xin lần lượt 6 thứ (TUẦN TỰ, không song song):
      1. danh mục (categories)
      2. sản phẩm mới (newProduct)
      3. sản phẩm giảm giá (saleProduct)
      4. sản phẩm bán chạy (hotProduct)
      5. tin tức (blogs)
      6. banner
  → mỗi thứ đi qua: api.js → index.ts (cửa chính) → router → controller → model → MongoDB → trả ngược lại
  → sau khi có "categories", useEffect thứ hai chạy: xin sản phẩm theo TỪNG danh mục, lần này SONG SONG (Promise.all)
  → tất cả dữ liệu đổ vào state của React → màn hình vẽ lại
```

---

## Phần 3 — Từng bước thật

### Bước 1 — `home.tsx` mở trang, gọi 6 API liên tiếp

File: `frontend_react/src/pages/home/home.tsx` (dòng 58-91)

```tsx
useEffect(() => {
  const fetchProducts = async () => {
    try {
      const categoriesResponse = await categoryApi.getCategoriesActive();
      const categoriesData = await categoriesResponse.data.result;
      setCategories(categoriesData);

      const newProductResponse = await productsApi.getNewProducts();
      const newProductData = newProductResponse.data.result;
      setNewProduct(newProductData || []);

      const saleProductResponse = await productsApi.getSaleproducts();
      const saleProductData = await saleProductResponse.data.result;
      setSaleProduct(saleProductData || []);

      const hotProductResponse = await productsApi.getHotproducts();
      const hotProductData = await hotProductResponse.data.result;
      setHotProduct(hotProductData || []);

      const blogResponse = await BlogApi.getBlogActive();
      const blogData = await blogResponse.data.data;
      setBlogs(blogData || []);

      const bannerResponse = await bannerApi.getActive();
      const bannerData = bannerResponse.data.data;
      setBanners(bannerData || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setCategories([]);
    }
  };
  fetchProducts();
}, []);
```

Đây là điểm **rất đáng chú ý**: mỗi dòng có chữ `await` đứng trước, nghĩa là dòng này phải "xin xong, có kết quả trả về" thì dòng tiếp theo mới được chạy — giống việc đưa đơn cho lễ tân rồi **đứng đợi tại chỗ** cho tới khi món ra mới đưa đơn tiếp theo, KHÔNG đưa hết 6 đơn cùng lúc. Vì vậy trang chủ xin dữ liệu theo đúng thứ tự: danh mục → sản phẩm mới → sản phẩm giảm giá → sản phẩm bán chạy → tin tức → banner, cái sau luôn đợi cái trước xong. Đây là lý do nếu 1 trong 6 API bị chậm (ví dụ mạng lag lúc xin "sản phẩm giảm giá"), toàn bộ các khối phía sau nó (bán chạy, tin tức, banner) đều phải chờ theo, dù bản thân chúng không hề chậm.

> Nếu có `.catch()` báo lỗi ở BẤT KỲ dòng nào trong 6 dòng trên, code nhảy thẳng xuống `catch (error)`, các dòng `set...` còn lại phía sau sẽ **không chạy nữa** — đây cũng là lý do đôi khi thấy trang chủ "mất" một vài khối dù các khối khác vẫn hiện bình thường.

### Bước 2 — Mỗi API gói request theo đúng khuôn `xxxApi.js`

Mỗi lời gọi ở Bước 1 tương ứng 1 hàm trong 1 file `api.js` riêng, chỉ làm 1 việc: gửi `GET` tới đúng địa chỉ.

| Lời gọi trong `home.tsx` | File `api.js` | Địa chỉ (URL) thật |
|---|---|---|
| `categoryApi.getCategoriesActive()` | `frontend_react/src/api/categoryApi.js` | `GET /v1/categories/status/active` |
| `productsApi.getNewProducts()` | `frontend_react/src/api/productsApi.js` | `GET /v1/newproducts` |
| `productsApi.getSaleproducts()` | `frontend_react/src/api/productsApi.js` | `GET /v1/saleproducts` |
| `productsApi.getHotproducts()` | `frontend_react/src/api/productsApi.js` | `GET /v1/hotproducts` |
| `BlogApi.getBlogActive()` | `frontend_react/src/api/blogApi.js` | `GET /v1/blogs/status/active` |
| `bannerApi.getActive()` | `frontend_react/src/api/bannerApi.js` | `GET /v1/banners/status/active` |

Ví dụ 1 hàm thật (`productsApi.js`):

```js
getHotproducts: async () => {
  const response = await api.get("/v1/hotproducts");
  return { data: response.data };
},
```

`api` là công cụ có sẵn (`axios`) tự nối thêm địa chỉ gốc backend (ví dụ `http://localhost:5000/api`), ra URL đầy đủ `http://localhost:5000/api/v1/hotproducts`.

### Bước 3 — Backend nhận request, router khớp đúng địa chỉ

File cửa chính: `backend/src/index.ts` — mọi request đều đi qua đây trước, qua các "trạm kiểm tra" (middleware) rồi được phân cho đúng router theo tiền tố `/api/v1`:

```ts
app.use('/api/v1', categoryRouter);
app.use('/api/v1', productRouter);
...
app.use('/api/v1', blogRouter);
app.use('/api/v1', bannerRouter);
```

(Cơ chế app → router → middleware này giống hệt banner, đã giải thích chi tiết từng dòng ở `docs/banner/README.md`, Phần 3 — Bước 3, không lặp lại ở đây.)

Router tương ứng khớp URL rồi giao cho đúng controller, ví dụ (`backend/src/routes/product.routes.ts`):

```ts
productRouter.get('/newproducts', getNewProduct);
productRouter.get('/saleproducts', getSaleProduct);
productRouter.get('/hotproducts', getHotProduct);
```

Cả 3 route này **không có** `verifyToken, requireAdmin` phía trước — ai cũng xem được, không cần đăng nhập (khác với các route thêm/sửa/xoá sản phẩm trong cùng file, có 2 "trạm gác" đó).

### Bước 4 — Controller: nơi quyết định tiêu chí lọc/sắp xếp thật sự

Đây là phần quan trọng nhất để trả lời câu hỏi "dựa trên cái gì". Cả 3 hàm nằm trong `backend/src/controllers/product.controllers.ts`.

**"Sản phẩm bán chạy"** — hàm `getHotProduct`:

```ts
export const getHotProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await productModel
      .find({
        $or: [{ status: ProductStatus.AVAILABLE }, { status: { $exists: false } }, { status: null }]
      })
      .sort({ quantity_sold: -1, createdAt: -1 })
      .limit(10)
      .populate('category_id')
      .populate('brand_id')
      .populate('tag_id');

    res.status(200).json({
      success: true,
      message: result.length > 0 ? 'Lấy sản phẩm bán chạy thành công' : 'Chưa có sản phẩm bán chạy',
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy sản phẩm bán chạy', error });
  }
};
```

Giải thích bằng lời: Controller nhờ Model tìm tất cả sản phẩm còn bán được (`status` là `available`, hoặc sản phẩm cũ chưa từng được gán `status`), rồi **sắp xếp theo field `quantity_sold` giảm dần** — sản phẩm nào có `quantity_sold` (số lượng đã bán cộng dồn) lớn nhất thì lên đầu danh sách. Nếu 2 sản phẩm bán bằng số lượng nhau, sản phẩm nào `createdAt` (ngày tạo) gần đây hơn thì lên trước — chỉ để phân định thứ tự, không có ý nghĩa gì thêm. Cuối cùng chỉ lấy tối đa 10 sản phẩm đầu tiên (`.limit(10)`).

**Vậy tiêu chí "bán chạy" chỉ dựa trên đúng 1 field: `quantity_sold`.**

**"Sản phẩm mới"** — hàm `getNewProduct`:

```ts
const result = await productModel
  .find({
    $or: [{ status: ProductStatus.AVAILABLE }, { status: { $exists: false } }, { status: null }]
  })
  .sort({ createdAt: -1, updatedAt: -1 })
  .limit(10);
```

Không có field nào đánh dấu "đây là hàng mới" — "mới" chỉ đơn giản là **sản phẩm có `createdAt` (ngày tạo) gần đây nhất**, sắp giảm dần, lấy 10 sản phẩm đầu.

**"Sản phẩm giảm giá"** — hàm `getSaleProduct`:

```ts
const result = await productModel
  .find({
    discount: { $gt: 0 },
    $or: [{ status: ProductStatus.AVAILABLE }, { status: { $exists: false } }, { status: null }]
  })
  .limit(10);
```

Chỉ lọc sản phẩm có field `discount` (số phần trăm giảm giá) **lớn hơn 0**. Đáng chú ý: khối này **không có `.sort()` nào cả** — khác với 2 khối kia. Nghĩa là sản phẩm giảm giá nhiều nhất **không chắc** hiện lên đầu, thứ tự hiện ra chỉ là thứ tự sản phẩm nằm trong database (gần giống thứ tự MongoDB trả về mặc định), không phải theo % giảm giá.

### Bước 5 — Model: field nào trong database quyết định các tiêu chí trên

File: `backend/src/models/product.model.ts`. Các field liên quan trực tiếp tới 3 khối trên trang chủ:

| Field | Kiểu dữ liệu | Ý nghĩa | Dùng cho khối nào |
|---|---|---|---|
| `status` | Chữ, enum (`available`, `out_of_stock`, `discontinued`) | Sản phẩm còn bán hay không | Cả 3 khối đều lọc `status = available` (hoặc thiếu field này) |
| `createdAt` | Ngày giờ, MongoDB tự điền lúc tạo | Sản phẩm được thêm vào lúc nào | "Sản phẩm mới" (sắp xếp chính), "Sản phẩm bán chạy" (chỉ dùng để phân định khi bằng điểm) |
| `discount` | Số (0-100) | Phần trăm giảm giá | "Sản phẩm giảm giá" (điều kiện lọc `> 0`) |
| `quantity_sold` | Số, mặc định `0` | Tổng số lượng sản phẩm đó đã bán được (cộng dồn mỗi khi có đơn hàng) | **"Sản phẩm bán chạy"** (field sắp xếp duy nhất) |
| `quantity` | Số | Số lượng còn trong kho | Không dùng để lọc 3 khối này, chỉ hiện ở frontend để biết còn hàng hay không |

`quantity_sold` không tự nhiên tăng — nó chỉ tăng lên khi có đơn hàng thực sự được đặt cho sản phẩm đó (xử lý ở luồng đặt hàng, không nằm trong phạm vi tài liệu này).

### Bước 6 — Kết quả đi ngược về, hiện lên từng khối

Giống cơ chế đã giải thích ở `docs/banner/README.md` (Phần 3, Bước 7): Model → Controller đóng gói `{ success, message, result }` → response đi qua Internet → về tới `productsApi.js` → `home.tsx` gọi `setHotProduct(hotProductData)` / `setNewProduct(...)` / `setSaleProduct(...)` → React vẽ lại, mỗi mảng dữ liệu được truyền vào đúng component tương ứng:

```tsx
<HotProduct data={hotProduct} />   {/* Sản phẩm bán chạy */}
<SaleProduct data={saleProduct} /> {/* Sản phẩm giảm giá */}
<NewProduct data={newProduct} />   {/* Sản phẩm mới */}
```

Mỗi component (`frontend_react/src/components/hotproduct.tsx`, `saleproduct.tsx`, `newproduct.tsx`) chỉ lo hiển thị — chạy `data.map(...)` vẽ từng sản phẩm thành 1 thẻ (Card) có ảnh, tên, giá, nút "Mua ngay". Cả 3 file gần như giống hệt nhau về giao diện, chỉ khác tiêu đề hiển thị (`SẢN PHẨM MỚI` / `SẢN PHẨM GIẢM GIÁ` / `SẢN PHẨM BÁN CHẠY`) và dữ liệu (`data`) được truyền vào — bản thân component **không tự quyết định tiêu chí gì cả**, tiêu chí lọc/sắp xếp hoàn toàn nằm ở Controller (Bước 4).

### Bước 7 — Sản phẩm theo danh mục: luồng thứ hai, chạy SONG SONG

Sau khi `categories` (danh mục) đã có dữ liệu (từ Bước 1), một `useEffect` khác chạy tiếp (`home.tsx`, dòng 94-119):

```tsx
useEffect(() => {
  const fetchProductsByCategory = async () => {
    if (categories.length === 0) return;
    try {
      const categoryPromises = categories.map(async (category) => {
        const productResponse = await productsApi.getProductByCategoryID(category._id);
        const productData = await productResponse.data.result;
        const limitedProducts = productData ? productData.slice(0, 8) : [];
        return { [category.name]: limitedProducts };
      });

      const categoryProducts = await Promise.all(categoryPromises);
      const productsMap = categoryProducts.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setProductsByCategory(productsMap);
    } catch (error) {
      console.error("Error fetching products by category:", error);
      setProductsByCategory({});
    }
  };
  fetchProductsByCategory();
}, [categories]);
```

Khác với Bước 1 (đợi từng cái xong mới xin cái tiếp theo), đoạn này dùng `Promise.all` — gửi **TẤT CẢ request cho từng danh mục CÙNG LÚC**, không đợi request này xong mới gửi request kia — giống việc đưa cùng lúc N đơn gọi món cho N đầu bếp khác nhau. Vì vậy nếu có 5 danh mục, trang chủ gửi 5 request "lấy sản phẩm theo danh mục" gần như đồng thời, chỉ cần chờ bằng thời gian của request CHẬM NHẤT, chứ không phải tổng thời gian của cả 5.

Controller đứng sau (`getProductByCategoryID`, `backend/src/controllers/product.controllers.ts`) chỉ lọc theo `category_id`, **không lọc `status`** (khác 3 khối ở Bước 4 — nghĩa là sản phẩm hết hàng/ngừng bán vẫn có thể xuất hiện ở đây) và không sắp xếp gì. Việc chỉ lấy 8 sản phẩm mỗi danh mục (`.slice(0, 8)`) làm ở **phía frontend**, backend trả về toàn bộ.

---

## Phần 4 — Bảng tổng hợp: "nổi bật" và "bán chạy" dựa trên cái gì? (trả lời trực tiếp)

| Khối trên trang chủ | Tên trong code | Route (API) | Điều kiện lọc | Sắp xếp theo field nào | Giới hạn |
|---|---|---|---|---|---|
| **"Sản phẩm bán chạy"** (gần nghĩa nhất với "nổi bật") | `HotProduct` / `getHotProduct` | `GET /v1/hotproducts` | `status` còn bán | **`quantity_sold` giảm dần** (số lượng đã bán được), rồi tới `createdAt` giảm dần nếu bằng nhau | 10 |
| Sản phẩm mới | `NewProduct` / `getNewProduct` | `GET /v1/newproducts` | `status` còn bán | `createdAt` giảm dần (ngày tạo gần nhất) | 10 |
| Sản phẩm giảm giá | `SaleProduct` / `getSaleProduct` | `GET /v1/saleproducts` | `discount > 0` + `status` còn bán | **Không sắp xếp** (thứ tự trong database) | 10 |
| Theo danh mục | `CateProduct` / `getProductByCategoryID` | `GET /v1/products/cate/:id` | `category_id` khớp (không lọc status) | Không sắp xếp | 8 (cắt ở frontend) |

**Kết luận ngắn gọn:**
- Trang chủ **không có khối "sản phẩm nổi bật"** theo đúng nghĩa đen trong code.
- Nếu hiểu "nổi bật" = "được ưu tiên hiển thị vì bán tốt", thì đó chính là khối **"SẢN PHẨM BÁN CHẠY"**, và nó dựa **100% vào field `quantity_sold`** (tổng số lượng đã bán) — không liên quan gì tới lượt xem, đánh giá (rating), hay bất kỳ field nào khác.
- "Sản phẩm mới" dựa vào **ngày tạo** (`createdAt`), không có field đánh dấu "mới" riêng.
- "Sản phẩm giảm giá" chỉ cần **có giảm giá** (`discount > 0`), không quan tâm giảm nhiều hay ít khi xếp thứ tự.

---

## Phần 5 — Luồng banner và tin tức (tóm tắt, không lặp lại chi tiết)

- **Banner**: giống hệt luồng đã giải thích đầy đủ ở `docs/banner/README.md` — route `GET /v1/banners/status/active`, lọc `status = active`, sắp theo field `order`.
- **Tin tức (blog)**: route `GET /v1/blogs/status/active` (`backend/src/controllers/blog.controllers.ts`, hàm `getActiveBlogs`) — lọc `status = active`, có phân trang (`page`, `limit`), **không sắp xếp theo field nào đặc biệt** (giống thứ tự database trả về). Trang chủ chỉ lấy `blogs[0]` làm bài viết chính, `blogs.slice(1, 4)` làm 3 bài liên quan.
- **Danh mục**: route `GET /v1/categories/status/active` (`backend/src/controllers/category.controllers.ts`, hàm `getCategoriesActive`) — chỉ lọc `status = active`, không sắp xếp.

---

## Phần 6 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi tiêu chí/số lượng "sản phẩm bán chạy" (ví dụ: đổi từ `quantity_sold` sang field khác) | `backend/src/controllers/product.controllers.ts`, hàm `getHotProduct` |
| Đổi tiêu chí "sản phẩm mới" | `backend/src/controllers/product.controllers.ts`, hàm `getNewProduct` |
| Đổi tiêu chí "sản phẩm giảm giá" (ví dụ: thêm sắp xếp theo % giảm nhiều nhất — hiện CHƯA có `.sort()`) | `backend/src/controllers/product.controllers.ts`, hàm `getSaleProduct` — thêm `.sort({ discount: -1 })` |
| Thêm field mới cho sản phẩm (ví dụ thêm field "nổi bật" thật sự, kiểu `is_featured: boolean`) | `backend/src/models/product.model.ts` + `backend/src/interfaces/product.interface.ts`, rồi sửa `getHotProduct`/thêm hàm mới để lọc theo field đó |
| Đổi giao diện 1 khối sản phẩm ở trang chủ | `frontend_react/src/components/hotproduct.tsx` / `saleproduct.tsx` / `newproduct.tsx` / `cateproduct.tsx` |
| Đổi thứ tự các khối xuất hiện trên trang chủ, hoặc cách gọi API | `frontend_react/src/pages/home/home.tsx` |
| Đổi endpoint gọi từ frontend | `frontend_react/src/api/productsApi.js`, `categoryApi.js`, `blogApi.js`, `bannerApi.js` |
| Đổi banner trang chủ | Xem `docs/banner/README.md` |
| Đổi cách hiển thị/lọc tin tức | `backend/src/controllers/blog.controllers.ts` (hàm `getActiveBlogs`) |

---

## Phần 7 — Glossary: các chữ hay gặp, tra nhanh

- **`.find({...})`**: câu lệnh nhờ Model tìm trong database những document khớp điều kiện trong `{...}`.
- **`.sort({ field: -1 })`**: sắp xếp kết quả theo `field`, `-1` là giảm dần (lớn nhất trước), `1` là tăng dần.
- **`.limit(n)`**: chỉ lấy tối đa `n` kết quả đầu tiên sau khi đã sắp xếp/lọc.
- **`.populate('field')`**: sau khi lấy sản phẩm, tự động lấy thêm thông tin chi tiết của field đó (ví dụ `category_id` chỉ là 1 chuỗi ID, `.populate('category_id')` sẽ thay nó bằng cả object danh mục đầy đủ tên/mô tả).
- **`quantity_sold`**: field lưu tổng số lượng một sản phẩm đã được bán, tăng dần theo thời gian mỗi khi có đơn hàng.
- **`Promise.all([...])`**: cách gửi nhiều request cùng lúc, chỉ đợi request chậm nhất xong, nhanh hơn gửi lần lượt.
- **`useEffect`**: đoạn code React tự động chạy vào một thời điểm nhất định (ví dụ ngay khi trang vừa mở, hoặc mỗi khi 1 biến cụ thể thay đổi giá trị).
- **State (`useState`)**: "hộp nhớ" của React, khi giá trị trong hộp đổi (ví dụ `setHotProduct(...)`), React tự vẽ lại giao diện có liên quan.
- **Status code, Schema, Document, Collection, Middleware, JWT**: xem `docs/banner/README.md`, Phần 6 — định nghĩa giống hệt, dùng chung toàn bộ dự án.

---

## Phần 8 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
home.tsx mở trang
  │
  ├─ (tuần tự, đợi lần lượt) ─▶ categoryApi ─▶ productsApi (mới/giảm giá/bán chạy) ─▶ blogApi ─▶ bannerApi
  │                                     mỗi cái: api.js → index.ts → router → controller → model → MongoDB → về lại
  │
  └─ (sau khi có categories) ─▶ Promise.all: gọi productsApi.getProductByCategoryID cho TỪNG danh mục CÙNG LÚC

Tiêu chí lọc/sắp xếp (Controller, backend/src/controllers/product.controllers.ts):
  1. getNewProduct  → sort createdAt giảm dần            → "SẢN PHẨM MỚI"
  2. getSaleProduct → filter discount > 0, KHÔNG sort     → "SẢN PHẨM GIẢM GIÁ"
  3. getHotProduct  → sort quantity_sold giảm dần         → "SẢN PHẨM BÁN CHẠY" (= "nổi bật")

Kết quả đi ngược lại đúng đường vừa đi, home.tsx gọi setNewProduct/setSaleProduct/setHotProduct(...)
→ React vẽ lại 3 khối tương ứng bằng component NewProduct / SaleProduct / HotProduct.
```

1. **home.tsx** — trang chủ vừa mở, tự gọi lần lượt 6 API rồi sau đó gọi song song API theo từng danh mục.
2. **categoryApi.js / productsApi.js / blogApi.js / bannerApi.js** — mỗi file đóng gói 1 nhóm request `GET` tới đúng địa chỉ.
3. **index.ts** — cửa chính backend, mọi request qua đây trước, được chuyển cho đúng router theo tiền tố `/api/v1`.
4. **category.routes.ts / product.routes.ts / blog.routes.ts / banner.routes.ts** — dò đúng địa chỉ, giao cho đúng hàm controller.
5. **product.controllers.ts** — 3 hàm `getNewProduct`/`getSaleProduct`/`getHotProduct` chứa đúng tiêu chí lọc/sắp xếp (xem Phần 4).
6. **product.model.ts** — định nghĩa các field quyết định tiêu chí: `status`, `createdAt`, `discount`, `quantity_sold`.
7. **MongoDB** — tìm trong collection `products` (và `categories`, `blogs`, `banners`), trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại, React vẽ lại từng khối tương ứng trên trang chủ.
