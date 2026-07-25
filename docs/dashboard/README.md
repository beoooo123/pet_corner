# Dashboard (trang tổng quan admin) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin mở trang "Tổng quan" (Dashboard). Viết cho người **chưa biết gì về lập trình**.

**Điểm khác biệt quan trọng cần biết trước khi đọc tiếp:** Dashboard **không phải** một feature có API/Model riêng của nó (khác với banner, revenue...). Dashboard giống như một **cái bàn tổng hợp**: nó không có "công thức nấu" và "tủ lạnh" của riêng mình, mà nó **đi hỏi 7 API khác nhau** (vốn đã phục vụ cho các trang quản lý user, đơn hàng, sản phẩm, lịch hẹn) rồi **tự cộng/đếm/lọc ngay tại trình duyệt (frontend)** để vẽ ra các con số và bảng biểu. Toàn bộ tài liệu Phần 3 bên dưới sẽ chỉ rõ: con số nào do backend tính sẵn, con số nào do chính đoạn code React tự đếm.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt (Chrome, Cốc Cốc...) của người dùng |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/users`, `/api/v1/hotproducts` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, đi lấy nguyên liệu (dữ liệu), nấu (xử lý), rồi trả món (trả kết quả) |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một user/đơn hàng/sản phẩm trông như thế nào" và là thứ duy nhất được phép nói chuyện trực tiếp với tủ lạnh (database) |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu được lưu trữ thật sự, tồn tại lâu dài, không mất khi tắt máy |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Một cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để hai bên (backend/frontend) hiểu nhau |
| **Aggregate (pipeline tổng hợp)** | Đầu bếp tự gom nguyên liệu, đếm và xếp hạng ngay trong bếp trước khi bưng ra | Một chuỗi bước tính toán mà MongoDB làm ngay bên trong database (gom nhóm, đếm tổng, sắp xếp, giới hạn số lượng) — thay vì bê hết nguyên liệu thô ra bàn rồi khách tự đếm |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại. Với Dashboard, "hỏi" này xảy ra **7 lần liên tiếp**, mỗi lần một chuyện khác nhau.

---

## Phần 2 — Bức tranh tổng thể (chỉ vài dòng)

```
Admin mở trang Dashboard (dashboard.tsx)
   → đồng loạt gọi 7 API khác nhau (user, order, orderDetail, product)
   → mỗi API có Router → Controller → Model → Database riêng của NÓ (không có Model "dashboard")
   → mỗi API trả JSON riêng
   → dashboard.tsx GOM 7 kết quả này lại, TỰ đếm/lọc/format ngay tại trình duyệt
   → vẽ 3 ô số liệu (Statistic) + 3 bảng lên màn hình
```

Khác với banner (1 trang → 1 API → 1 Model), Dashboard là "1 trang → 7 API → 7 Model khác nhau, không có Model nào tên là `dashboard`".

---

## Phần 3 — Từng bước thật, từ lúc mở trang Dashboard tới lúc thấy số liệu

### Bước 0 — Trang Dashboard tự động "hỏi" ngay khi vừa mở

File: `frontend_react/src/admin/dashboard/dashboard.tsx`

Ngay khi vào trang, React chạy đoạn này **một lần duy nhất** (nhờ `useEffect`):

```tsx
useEffect(() => {
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const usersResponse = await userApi.getAllUsers();
      ...
      const loyalUsers = await userApi.getLoyalUsers();
      ...
      const pendingOrders = await orderApi.getPendingOrders();
      ...
      const outOfStockResponse = await productsApi.getProductOutStock();
      ...
      const hotProductsResponse = await productsApi.getHotproducts();
      ...
      const allBookingsResponse = await orderDetailApi.getAllBookings();
      ...
      const cancelledBookingsResponse = await orderDetailApi.getCancelled();
      ...
    } catch (error) { ... } finally { setLoading(false); }
  };
  fetchDashboardData();
}, []);
```

Đây chính là điểm khác biệt cốt lõi: một trang bình thường (như banner) chỉ gọi **1 API**. Dashboard gọi **7 API liên tiếp**, mỗi API đi qua đúng 1 hành trình đầy đủ Router → Controller → Model → Database của riêng nó (những hành trình này vốn đã được xây cho các trang quản lý User/Đơn hàng/Sản phẩm/Lịch hẹn, Dashboard chỉ "mượn" lại). Dưới đây là từng lời gọi.

---

### Lời gọi 1 — Tổng số người dùng

**Frontend gọi:**
```tsx
const usersResponse = await userApi.getAllUsers();
setTotalUsers(usersResponse.data.result?.length || 0);
```

`userApi.getAllUsers()` (file `frontend_react/src/api/userApi.js`) gửi `GET /api/v1/users`. Route này (`backend/src/routes/user.routes.ts`: `userRouter.get('/users', verifyToken, getAllUser)`) yêu cầu phải đăng nhập (`verifyToken`). Controller `getAllUser` lấy **toàn bộ** user trong database, trả về mảng đầy đủ trong `result`.

**Điểm mấu chốt:** backend **không hề đếm** — nó trả cả danh sách. Con số "Tổng số người dùng" hiển thị trên thẻ `Statistic` chính là `usersResponse.data.result?.length` — tức là **frontend tự đếm bằng cách đo độ dài mảng**, không có API "đếm user" riêng nào cả.

---

### Lời gọi 2 — Khách hàng thân thiết

**Frontend gọi:**
```tsx
const loyalUsers = await userApi.getLoyalUsers();
const limitedCustomers = (loyalUsers.data.result || []).slice(0, 4).map((customer: any) => ({
  ...customer,
  totalQuantity: customer.totalQuantity || 0
}));
setNewCustomers(limitedCustomers);
```

`GET /api/v1/users/loyal` (`userRouter.get('/users/loyal', verifyToken, getLoyalUsers)`). Đây là trường hợp **hiếm hoi** việc tính toán/xếp hạng được làm sẵn ở **backend** bằng một "aggregate pipeline" (`backend/src/controllers/user.controllers.ts`, hàm `getLoyalUsers`):

```ts
const loyalUsers = await orderModel.aggregate([
  { $match: { status: 'DELIVERED', userID: { $ne: null } } },
  { $lookup: { from: 'orderdetails', localField: '_id', foreignField: 'orderId', as: 'orderDetails' } },
  { $unwind: '$orderDetails' },
  { $group: { _id: '$userID', totalQuantity: { $sum: '$orderDetails.quantity' }, fullname: { $first: '$inforUserGuest.fullName' } } },
  { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
  { $unwind: '$userInfo' },
  { $project: { userId: '$_id', fullname: ..., totalQuantity: 1, email: '$userInfo.email', createdAt: '$userInfo.createdAt' } },
  { $sort: { totalQuantity: -1 } },
  { $limit: 4 }
]);
```

Nói bằng lời: backend chỉ lấy các đơn hàng đã **giao thành công (`DELIVERED`)**, gom theo từng khách, **cộng dồn tổng số lượng sản phẩm** khách đó đã mua, **sắp xếp khách mua nhiều nhất lên đầu**, và **chỉ lấy 4 người đứng đầu**. Nghĩa là backend đã trả sẵn đúng "Top 4 khách thân thiết" — dòng `.slice(0, 4)` ở frontend thật ra thừa (backend đã giới hạn 4 rồi), frontend chỉ thêm bước phòng hờ `totalQuantity || 0` để tránh hiện chữ "undefined" nếu thiếu dữ liệu.

---

### Lời gọi 3 — Đơn hàng đang chờ

**Frontend gọi:**
```tsx
const pendingOrders = await orderApi.getPendingOrders();
const recentOrders = pendingOrders.data.result || [];
const formattedOrders = recentOrders.map((order: any, index: number) => ({
  key: index.toString(),
  orderId: order.orderId || `ORDER${index}`,
  shortId: order.orderId ? `**${order.orderId.slice(-4)}` : "N/A",
  paymentType: order.paymentType || "Không xác định",
  ...
}));
setOrders(formattedOrders);
setTotalOrders(recentOrders.length);
```

`GET /api/v1/pendingOrders` (`orderRouter.get('/pendingOrders', verifyToken, getPendingOrders)`). Controller `getPendingOrders` (`backend/src/controllers/order.controllers.ts`) tìm mọi đơn có `status: 'PENDING'` (đang chờ xử lý), sắp xếp mới nhất lên trước, kèm tên phương thức thanh toán/giao hàng/khách hàng, rồi trả về **toàn bộ** (không giới hạn số lượng ở backend).

Frontend nhận mảng này, chỉ **định dạng lại chữ hiển thị** (ví dụ rút gọn mã đơn còn 4 ký tự cuối `**xxxx`), rồi hiện vào bảng "ĐƠN HÀNG ĐANG CHỜ" (phân trang 4 dòng/trang — việc phân trang này cũng làm ở frontend, `pageSize: 4` trong cấu hình `Table`).

**Lưu ý trung thực:** dòng `setTotalOrders(recentOrders.length)` có tính ra một con số, nhưng nhìn vào giao diện thực tế (phần `return (...)` của component) thì **không có ô `Statistic` nào hiển thị `totalOrders` cả** — 3 ô số liệu trên cùng chỉ là "Tổng số người dùng", "Hết hàng", "Tổng lịch hẹn". Vậy `totalOrders` hiện là một biến được tính nhưng chưa được dùng để hiển thị gì (có thể do tính năng cũ bị bỏ, hoặc để dành cho sau) — đọc code thật thì phải nói đúng như vậy, không suy diễn thêm.

---

### Lời gọi 4 — Sản phẩm hết hàng

**Frontend gọi:**
```tsx
const outOfStockResponse = await productsApi.getProductOutStock();
const outOfStockItems = outOfStockResponse.data.result || [];
const formattedOutOfStockItems = outOfStockItems.map((product: any) => ({ ... }));
setOutOfStockProducts(formattedOutOfStockItems);
```

`GET /api/v1/outproducts` (`productRouter.get('/outproducts', getProductOutStock)` — route này **không yêu cầu đăng nhập**, ai gọi cũng được). Controller `getProductOutStock` (`backend/src/controllers/product.controllers.ts`) tìm mọi sản phẩm có `status: OUT_OF_STOCK` ("hết hàng"), kèm tên danh mục/thương hiệu/thẻ, trả về toàn bộ danh sách đó.

Ô `Statistic` "Hết hàng" hiển thị `outOfStockProducts.length` — **frontend tự đếm** độ dài mảng vừa nhận, backend không trả sẵn con số tổng.

---

### Lời gọi 5 — Sản phẩm bán chạy

**Frontend gọi:**
```tsx
const hotProductsResponse = await productsApi.getHotproducts();
const hotProductsItems = hotProductsResponse.data.result || [];
const formattedHotProducts = hotProductsItems.map((product: any) => ({ ... }));
setHotProducts(formattedHotProducts);
```

`GET /api/v1/hotproducts` (route công khai, không cần đăng nhập). Controller `getHotProduct` (`backend/src/controllers/product.controllers.ts`):

```ts
const result = await productModel
  .find({ $or: [{ status: ProductStatus.AVAILABLE }, { status: { $exists: false } }, { status: null }] })
  .sort({ quantity_sold: -1, createdAt: -1 })
  .limit(10)
  .populate('category_id').populate('brand_id').populate('tag_id');
```

Nói bằng lời: backend lấy các sản phẩm còn bán được (không tính sản phẩm đã ẩn), **sắp xếp theo số lượng đã bán (`quantity_sold`) giảm dần** (bán nhiều nhất lên đầu), lấy **tối đa 10 sản phẩm**. Đây cũng là một phép "xếp hạng" làm sẵn ở backend, giống lời gọi 2. Frontend chỉ format lại (thêm ảnh mặc định nếu thiếu, đổi tên danh mục/thương hiệu) rồi hiện vào bảng "SẢN PHẨM BÁN CHẠY" (phân trang 4 dòng/trang ở frontend).

---

### Lời gọi 6 — Tổng lịch hẹn (booking)

**Frontend gọi:**
```tsx
const allBookingsResponse = await orderDetailApi.getAllBookings();
const allBookings = allBookingsResponse.data || [];
setTotalAppointments(allBookings.length);
```

`GET /api/v1/ordersDetail/allBookings` (`orderDetailRouter.get('/ordersDetail/allBookings', verifyToken, getAllBookings)`). Controller `getAllBookings` (`backend/src/controllers/orderdetail.controllers.ts`) tìm mọi đơn hàng có `bookingStatus` khác rỗng (nghĩa là đơn có liên quan tới đặt lịch dịch vụ spa/grooming), rồi lấy các dòng chi tiết đơn (`orderDetail`) có gắn `serviceId` (đặt 1 dịch vụ cụ thể), trả về toàn bộ danh sách đó.

Ô `Statistic` "Tổng lịch hẹn" = `allBookings.length` — lại một lần nữa, **frontend tự đếm** bằng độ dài mảng.

---

### Lời gọi 7 — Lịch hẹn đã huỷ

**Frontend gọi:**
```tsx
const cancelledBookingsResponse = await orderDetailApi.getCancelled();
if (cancelledBookingsResponse) {
  const cancelledBookings = cancelledBookingsResponse.data || [];
  setCanceledAppointments(cancelledBookings.length);
} else {
  setCanceledAppointments(0);
}
```

`GET /api/v1/getCancelled` (route công khai, không yêu cầu đăng nhập). Controller `getCancelledBookings` lọc các `orderDetail` có dịch vụ, mà đơn hàng cha có `bookingStatus: CANCELLED` (đã huỷ), trả về toàn bộ danh sách.

**Lưu ý trung thực (giống lời gọi 3):** `canceledAppointments` được tính bằng `.length` nhưng cũng **không xuất hiện ở bất kỳ ô `Statistic` hay bảng nào** trong phần giao diện hiện tại của `dashboard.tsx`. Đây là biến được set nhưng chưa render ra màn hình.

---

### Bước cuối — Kết quả hiện lên màn hình

Sau khi cả 7 lời gọi hoàn tất (hoặc gặp lỗi — khi đó khối `catch` sẽ hiện thông báo đỏ `message.error("Lỗi khi tải dữ liệu dashboard")`), `setLoading(false)` được gọi, các ô `Statistic` hết trạng thái "đang tải" và 3 khu vực sau xuất hiện:

1. **3 ô số liệu** (Statistic): Tổng số người dùng, Hết hàng, Tổng lịch hẹn — mỗi ô là 1 con số do **frontend tự đếm `.length`** từ dữ liệu thô nhận về (không phải backend trả sẵn 1 con số tổng).
2. **Bảng "ĐƠN HÀNG ĐANG CHỜ"** và **bảng "KHÁCH HÀNG THÂN THIẾT"** nằm cạnh nhau.
3. **Bảng "SẢN PHẨM BÁN CHẠY"** ở dưới cùng.

Mỗi ô `Statistic` được bọc trong thẻ `<a href="...">` để bấm vào là nhảy sang đúng trang quản lý chi tiết (ví dụ bấm "Hết hàng" → sang `/admin/products?status=out_of_stock`) — Dashboard chỉ là "cửa sổ nhìn nhanh", muốn xem/sửa chi tiết phải qua đúng trang quản lý của feature đó.

---

## Phần 4 — Điểm khác biệt của Dashboard so với các feature khác (banner, revenue...)

1. **Không có Model/Controller/Route riêng cho "dashboard".** Grep toàn bộ `backend/src` không có file nào tên `dashboard.controllers.ts` hay `dashboard.model.ts` — vì bản chất trang này không lưu trữ hay định nghĩa dữ liệu gì mới, nó chỉ là nơi **hiển thị tổng hợp**.
2. **Không có 1 API duy nhất trả về "gói số liệu tổng quan".** Một thiết kế khác (thường gặp ở dự án lớn) là backend có sẵn 1 API kiểu `GET /dashboard/summary` trả về `{ totalUsers: 120, totalOrders: 45, ... }` đã tính sẵn. Dự án pet-corner **hiện chưa làm vậy** — mọi con số được ghép lại từ 7 API vốn phục vụ cho các trang quản lý khác.
3. **Phần lớn con số là đếm `.length` ở frontend**, chỉ 2 trường hợp (khách hàng thân thiết, sản phẩm bán chạy) là bảng dữ liệu đã được **xếp hạng/gom nhóm sẵn ở backend** bằng aggregate pipeline — còn lại (tổng người dùng, tổng lịch hẹn, hết hàng, đơn đang chờ) backend chỉ trả **danh sách thô**, phép "đếm" hoàn toàn nằm ở frontend.
4. **Tài liệu chi tiết của từng API dùng ở đây** (field gì, kiểu dữ liệu gì, còn tính năng gì khác của User/Order/Product/OrderDetail) **hiện chưa có README riêng** trong dự án (các thư mục `docs/user`, `docs/product`, `docs/Getproduct` hiện đang để trống). Vì vậy tài liệu này trỏ thẳng tới source code thật thay vì một link tài liệu không tồn tại — xem bảng tra cứu Phần 5.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi giao diện, thêm/bớt ô số liệu, đổi bảng ở trang Dashboard | `frontend_react/src/admin/dashboard/dashboard.tsx` |
| Đổi cách gọi API tổng số người dùng / khách thân thiết | `frontend_react/src/api/userApi.js` → backend `backend/src/controllers/user.controllers.ts` (hàm `getAllUser`, `getLoyalUsers`), route `backend/src/routes/user.routes.ts` |
| Đổi cách gọi API đơn hàng đang chờ | `frontend_react/src/api/orderApi.js` → backend `backend/src/controllers/order.controllers.ts` (hàm `getPendingOrders`), route `backend/src/routes/order.routes.ts` |
| Đổi cách gọi API sản phẩm hết hàng / bán chạy | `frontend_react/src/api/productsApi.js` → backend `backend/src/controllers/product.controllers.ts` (hàm `getProductOutStock`, `getHotProduct`), route `backend/src/routes/product.routes.ts` |
| Đổi cách gọi API tổng lịch hẹn / lịch hẹn đã huỷ | `frontend_react/src/api/orderDetailApi.js` → backend `backend/src/controllers/orderdetail.controllers.ts` (hàm `getAllBookings`, `getCancelledBookings`), route `backend/src/routes/orderDetail.routes.ts` |
| Đổi công thức xếp hạng "khách hàng thân thiết" (bao nhiêu người, tính theo gì) | `backend/src/controllers/user.controllers.ts`, hàm `getLoyalUsers` (đoạn `aggregate`) |
| Đổi công thức xếp hạng "sản phẩm bán chạy" (sắp theo gì, lấy bao nhiêu sản phẩm) | `backend/src/controllers/product.controllers.ts`, hàm `getHotProduct` |
| Muốn thêm 1 API tổng hợp thật sự cho Dashboard (thay vì gọi 7 API) | Cần tạo mới `backend/src/controllers/dashboard.controllers.ts` + route tương ứng — hiện CHƯA có |

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/pendingOrders`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa, DELETE = xoá. Tất cả 7 lời gọi trong Dashboard đều là GET (chỉ xin xem, không thay đổi dữ liệu).
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn...). Ví dụ `verifyToken` chặn các API cần đăng nhập như `/users`, `/pendingOrders`.
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response, nói tình trạng: 200 ổn, 401 chưa đăng nhập, 500 lỗi server.
- **Aggregate pipeline**: chuỗi bước tính toán (lọc, gom nhóm, đếm, sắp xếp, giới hạn) mà MongoDB thực hiện ngay trong database, dùng trong `getLoyalUsers` và có cấu trúc tương tự trong `getAllBookings`/`getCancelledBookings`.
- **`useEffect`**: một cơ chế của React để nói "chạy đoạn code này đúng 1 lần, ngay khi trang vừa hiện ra" — đây là cách Dashboard tự động gọi 7 API mà không cần người dùng bấm nút gì.
- **`.length`**: cách đếm "mảng này có bao nhiêu phần tử" trong JavaScript — chính là cách Dashboard "tự đếm" thay vì backend đếm hộ.
- **Schema / Document / Collection**: bản thiết kế dữ liệu / 1 dòng dữ liệu / tập hợp nhiều dòng dữ liệu cùng loại trong MongoDB — chi tiết field của User, Order, Product, OrderDetail nằm ở các Model tương ứng (`backend/src/models/user.model.ts`, `order.model.ts`, `product.model.ts`, `orderdetail.model.ts`), không nhắc lại ở đây.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
                              ┌───────────────────────┐
                              │   dashboard.tsx        │
                              │ (mở trang, tự gọi 7 API)│
                              └───────────┬────────────┘
              ┌───────────────┬───────────┼───────────┬───────────────┬───────────────┐
              ▼               ▼           ▼           ▼               ▼               ▼
      userApi.getAll   userApi.getLoyal  orderApi   productsApi   productsApi   orderDetailApi
        Users()          Users()      .getPending  .getProductOut .getHotproducts .getAllBookings()
                                       Orders()      Stock()                      + .getCancelled()
              │               │           │           │               │               │
              ▼               ▼           ▼           ▼               ▼               ▼
        GET /v1/users  GET /v1/users/  GET /v1/    GET /v1/       GET /v1/       GET /v1/ordersDetail/
                          loyal        pendingOrders outproducts   hotproducts    allBookings, /getCancelled
              │               │           │           │               │               │
              ▼               ▼           ▼           ▼               ▼               ▼
        user.controllers  user.controllers order.controllers product.controllers product.controllers orderdetail.controllers
        (đếm ở FE sau)    (đã xếp hạng    (danh sách thô,   (danh sách thô,  (đã xếp hạng     (danh sách thô,
                           top 4 tại BE)   đếm ở FE nhưng    đếm ở FE)        top 10 tại BE)    đếm ở FE)
                                           KHÔNG hiện lên UI)
              └───────────────┴───────────┴───────────┴───────────────┴───────────────┘
                                              ▼
                        3 ô Statistic (đếm .length ở FE) + 3 bảng dữ liệu
                        (Đơn hàng đang chờ / Khách hàng thân thiết / Sản phẩm bán chạy)
```

Tóm tắt 1 câu mỗi trạm:

1. **dashboard.tsx** — vừa mở trang, tự động gọi liên tiếp 7 API khác nhau, không gọi API "dashboard" nào cả vì nó không tồn tại.
2. **userApi.getAllUsers()** — xin toàn bộ user, Dashboard tự đếm `.length` ra "Tổng số người dùng".
3. **userApi.getLoyalUsers()** — backend đã tự xếp hạng sẵn Top 4 khách mua nhiều nhất (đơn `DELIVERED`), Dashboard chỉ hiển thị.
4. **orderApi.getPendingOrders()** — xin toàn bộ đơn `PENDING`, Dashboard hiển thị bảng và đếm `.length` ra `totalOrders` (nhưng số này chưa hiện ở đâu trên UI).
5. **productsApi.getProductOutStock()** — xin toàn bộ sản phẩm hết hàng, Dashboard đếm `.length` ra "Hết hàng".
6. **productsApi.getHotproducts()** — backend đã sắp xếp sẵn theo số lượng bán, giới hạn 10 sản phẩm, Dashboard chỉ hiển thị.
7. **orderDetailApi.getAllBookings()** — xin toàn bộ lịch hẹn dịch vụ, Dashboard đếm `.length` ra "Tổng lịch hẹn".
8. **orderDetailApi.getCancelled()** — xin toàn bộ lịch hẹn đã huỷ, Dashboard đếm `.length` ra `canceledAppointments` (số này cũng chưa hiện ở đâu trên UI).
9. **Màn hình cuối cùng** — 3 ô số liệu + 3 bảng, mỗi ô/bảng bấm vào sẽ dẫn sang đúng trang quản lý chi tiết của feature đó.
