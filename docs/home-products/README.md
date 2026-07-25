# Các khối sản phẩm ở trang chủ — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

## Đính chính trước khi vào chi tiết

Câu hỏi ban đầu là "sản phẩm nổi bật lấy data dựa trên field nào, gắn trong tablist nhỏ ở trang home" — sau khi kiểm tra kỹ code, **hiện KHÔNG có "tablist" (thanh tab bấm qua lại) nào giữa các khối sản phẩm ở trang chủ**. Thực tế là **3 khối hiển thị CÙNG LÚC, xếp nối tiếp nhau từ trên xuống** trên trang chủ: "Sản phẩm mới", "Sản phẩm giảm giá", "Sản phẩm bán chạy". Mỗi khối tự có nút mũi tên trái/phải riêng (để lướt xem hết các sản phẩm trong khối đó bằng carousel), nhưng đó là lướt ảnh, không phải chuyển đổi loại dữ liệu. Tài liệu này giải thích đúng thực tế đó.

## Phần 1 — Sơ đồ tổng thể

```
Trang chủ (home.tsx) load lần đầu → gọi 3 API riêng biệt, cùng lúc:
  getNewProducts()  → "Sản phẩm mới"
  getSaleproducts() → "Sản phẩm giảm giá"
  getHotproducts()  → "Sản phẩm bán chạy"
→ mỗi API trả về 1 danh sách tối đa 10 sản phẩm, lọc/sắp xếp theo tiêu chí RIÊNG
→ 3 danh sách này hiện thành 3 khối riêng trên trang chủ, không liên quan qua lại
```

## Phần 2 — Từng khối lấy dữ liệu dựa trên field nào

### "Sản phẩm mới" — `getNewProduct` (`backend/src/controllers/product.controllers.ts`)

```ts
const result = await productModel
  .find({
    $or: [{ status: ProductStatus.AVAILABLE }, { status: { $exists: false } }, { status: null }]
  })
  .sort({ createdAt: -1, updatedAt: -1 })
  .limit(10);
```
Giải thích: KHÔNG có field "đánh dấu là mới" riêng — sản phẩm "mới" chỉ đơn giản là sản phẩm được TẠO GẦN ĐÂY NHẤT (`createdAt` giảm dần — sản phẩm tạo sau lên đầu), miễn còn `status` là "còn bán" (`available`, hoặc không set `status`). Lấy tối đa 10 sản phẩm.

### "Sản phẩm giảm giá" — `getSaleProduct`

```ts
const result = await productModel
  .find({
    discount: { $gt: 0 },
    $or: [{ status: ProductStatus.AVAILABLE }, { status: { $exists: false } }, { status: null }]
  })
  .limit(10);
```
Giải thích: chỉ lọc sản phẩm có `discount` (số % giảm giá) LỚN HƠN 0 — **không có bước sắp xếp nào cả** (không có `.sort()`). Đây là điểm dễ gây hiểu lầm: sản phẩm giảm giá NHIỀU NHẤT không chắc hiện lên trước — thứ tự hiện ra là thứ tự lưu trong database (gần giống thứ tự tạo sản phẩm), không phải % giảm giá. Nếu muốn "giảm giá nhiều nhất lên trước", cần thêm `.sort({ discount: -1 })` vào đây (chưa làm, chỉ ghi nhận).

### "Sản phẩm bán chạy" — `getHotProduct`

```ts
const result = await productModel
  .find({
    $or: [{ status: ProductStatus.AVAILABLE }, { status: { $exists: false } }, { status: null }]
  })
  .sort({ quantity_sold: -1, createdAt: -1 })
  .limit(10);
```
Giải thích: dựa vào field `quantity_sold` (số lượng ĐÃ BÁN được, cộng dồn mỗi lần có đơn hàng) — sản phẩm bán được nhiều nhất lên đầu. Nếu 2 sản phẩm bán bằng nhau, sản phẩm tạo gần đây hơn (`createdAt`) lên trước (chỉ để phân định thứ tự, không có ý nghĩa gì khác).

## Phần 3 — Các API khác liên quan (không hiện trực tiếp thành khối riêng trên trang chủ)

- **Theo danh mục** (`getProductByCategoryID`) — trang chủ dùng để tạo các dòng "sản phẩm theo từng danh mục" bên dưới 3 khối trên. Chỉ lọc theo `category_id`, KHÔNG lọc `status` (nghĩa là sản phẩm hết hàng/ngừng bán vẫn có thể hiện ra ở đây), không sắp xếp gì — trang chủ tự cắt lấy 8 sản phẩm đầu ở phía frontend (`slice(0, 8)`), không phải backend giới hạn.
- **`getProductActive`** (`GET /products/status/active`) — lọc CHẶT hơn 3 khối trên: chỉ đúng `status === 'available'` (không chấp nhận thiếu field/`null` như 3 khối kia). Dùng ở nơi khác (không phải 3 khối trang chủ).
- **`getProductOutStock`** — chỉ lấy sản phẩm hết hàng (`status === 'out_of_stock'`), dùng cho trang quản trị, không xuất hiện ở trang chủ.

## Phần 4 — Bảng tổng hợp (tra nhanh)

| Khối trên trang chủ | Route | Field quyết định có/không hiện | Sắp xếp | Giới hạn |
|---|---|---|---|---|
| Sản phẩm mới | `GET /v1/newproducts` | `status` còn bán | `createdAt` giảm dần | 10 |
| Sản phẩm giảm giá | `GET /v1/saleproducts` | `discount > 0` + `status` còn bán | **không có** (thứ tự lưu trong DB) | 10 |
| Sản phẩm bán chạy | `GET /v1/hotproducts` | `status` còn bán | `quantity_sold` giảm dần | 10 |
| Theo danh mục | `GET /v1/products/cate/:id` | `category_id` khớp (không lọc status) | không có | 8 (cắt ở frontend) |

## Phần 5 — Bảng tra cứu nhanh

| Muốn làm gì | Mở file |
|---|---|
| Đổi tiêu chí/số lượng của 1 trong 3 khối | `backend/src/controllers/product.controllers.ts` (hàm `getNewProduct`/`getSaleProduct`/`getHotProduct`) |
| Sắp xếp "giảm giá" theo % giảm nhiều nhất | Thêm `.sort({ discount: -1 })` vào `getSaleProduct` (chưa làm) |
| Đổi giao diện hiển thị 1 khối | `frontend_react/src/components/newproduct.tsx` / `saleproduct.tsx` / `hotproduct.tsx` |
| Đổi cách trang chủ gọi API và lưu state | `frontend_react/src/pages/home/home.tsx` |
| Đổi field nào ảnh hưởng (`quantity_sold`, `discount`, `status`...) | `backend/src/models/product.model.ts` |
