# Quản lý người dùng (User) — trang Admin — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

> **Lưu ý phạm vi trước khi đọc**: Tài liệu này KHÁC với `docs/login/README.md` và `docs/signup/README.md`. Hai tài liệu đó nói về việc **một khách hàng tự tạo tài khoản và tự đăng nhập** (authentication) — tức là góc nhìn của người dùng bình thường thao tác trên chính tài khoản của họ.
>
> Tài liệu NÀY nói về việc **ADMIN mở trang quản trị, xem danh sách toàn bộ người dùng đã có sẵn trong hệ thống, và khoá/mở khoá tài khoản của người khác** (quản trị tài khoản). Ở đây không có chuyện "nhập mật khẩu để đăng nhập" — admin đã đăng nhập từ trước (bằng đúng luồng ở `docs/login`), giờ chỉ đang dùng "quyền admin" của mình để thao tác lên dữ liệu của NGƯỜI KHÁC.

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin mở trang "Quản lý người dùng" trong khu vực quản trị của pet-corner. Viết cho người **chưa biết gì về lập trình**, nên phần đầu sẽ giải thích vài khái niệm nền tảng trước, sau đó đi vào từng file code thật, theo đúng thứ tự nó chạy.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt (Chrome, Cốc Cốc...) của người dùng. Ở đây "khách" chính là admin, đang ngồi ở trang quản trị |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/users` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, đi lấy nguyên liệu (dữ liệu), nấu (xử lý), rồi trả món (trả kết quả) |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một người dùng trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với tủ lạnh (database) |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu được lưu trữ thật sự, tồn tại lâu dài, không mất khi tắt máy |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Một cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để hai bên (backend/frontend) hiểu nhau |
| **Middleware / "trạm kiểm tra"** | Bảo vệ đứng trước cửa bếp, kiểm tra "vé vào cửa" | Một đoạn code chạy TRƯỚC khi request được giao cho Controller — ví dụ kiểm tra "người gọi API này đã đăng nhập chưa" |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại.

Một khái niệm riêng của feature này cần biết trước — **`role` (vai trò)**: mỗi người dùng trong database có 1 field tên `role`, chỉ được là 1 trong 3 giá trị: `user` (khách hàng bình thường), `admin` (người có toàn quyền quản trị, xem/sửa được trang này), `employee` (nhân viên). Field này quyết định một người được phép làm gì trong hệ thống — nó khác với `status` (trạng thái tài khoản đang hoạt động hay bị khoá).

---

## Phần 2 — Bức tranh tổng thể (chỉ 1 dòng)

```
Trình duyệt admin (user.tsx)  →  gọi API  →  Backend (index.ts→router→controller→model)  →  Database (MongoDB)
Database  →  trả danh sách user  →  Model  →  Controller  →  Router  →  Backend  →  Trình duyệt  →  hiện bảng danh sách người dùng
```

Bây giờ ta đi từng bước thật chi tiết, đúng theo thứ tự xảy ra trong thực tế, bắt đầu từ lúc admin mở trang cho tới lúc thấy bảng danh sách.

---

## Phần 3 — Từng bước thật: admin mở trang, xem danh sách người dùng

### Bước 1 — Admin mở trang "Quản lý người dùng"

File: `frontend_react/src/admin/user/user.tsx`

Ngay khi trang vừa hiện ra, React tự động chạy đoạn code sau **một lần duy nhất** (nhờ `useEffect`):

```tsx
useEffect(() => {
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await userApi.getAllUsers();
      const fetchedUsers = data.result.map((user: any) => ({
        key: user._id,
        _id: user._id,
        fullname: user.fullname || "Chưa đặt tên",
        email: user.email,
        avatar: user.avatar || "",
        phone_number: user.phone_number || "Chưa có",
        createdAt: new Date(user.createdAt).toLocaleDateString("vi-VN"),
        status: user.status === "active" ? "Hoạt động" : "Bị khóa",
        role: user.role || "USER",
      }));
      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };
  fetchUsers();
}, []);
```

`userApi.getAllUsers()` chính là hành động "đưa đơn gọi món cho lễ tân" — trang quản trị đang xin backend: *"cho tôi TOÀN BỘ danh sách người dùng đã đăng ký"*. Đáng chú ý: đoạn này còn tự "dịch" dữ liệu thô nhận về cho dễ đọc — ví dụ `status === "active"` được đổi thành chữ tiếng Việt `"Hoạt động"`, còn lại (kể cả `"inactive"`) đổi thành `"Bị khóa"`. Việc dịch chữ này chỉ xảy ra ở frontend, database vẫn lưu nguyên `"active"`/`"inactive"`.

### Bước 2 — `userApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/userApi.js`

```js
getAllUsers: async () => {
  const response = await api.get("/v1/users");
  return {
    data: response.data,
  };
},
```

Dòng này gửi một request kiểu `GET` (nghĩa là "chỉ xin dữ liệu, không thay đổi gì") tới địa chỉ `/v1/users`. `api` là một công cụ có sẵn (thư viện `axios`, khai báo trong `frontend_react/src/api/axios.js`) biết cách nối địa chỉ này với địa chỉ gốc của backend để ra URL đầy đủ, ví dụ `http://localhost:5000/api/v1/users`.

Trước khi request này thật sự rời khỏi trình duyệt, `axios.js` tự động "kẹp thêm" một thứ vào request — đây là điểm khác biệt quan trọng so với banner (banner công khai không cần chuyện này):

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

Nghĩa là: mọi request gửi đi đều tự động đính kèm "vé vào cửa" (JWT access token, được cấp lúc admin đăng nhập — xem `docs/login/README.md`) vào phần header `Authorization`. Đây giống như đưa kèm thẻ nhân viên khi đưa đơn gọi món, để lễ tân biết "ai đang xin dữ liệu này".

### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`

```ts
app.use('/api/v1', userRouter);
```

Giống mọi request khác, nó phải đi qua các middleware chung trước (CORS, đọc JSON, ghi log...) rồi mới tới dòng này: *"Bất kỳ request nào có địa chỉ bắt đầu bằng `/api/v1`, hãy đưa cho `userRouter` xem có phải việc của nó không."*

### Bước 4 — Router khớp đúng địa chỉ và kiểm tra "vé vào cửa"

File: `backend/src/routes/user.routes.ts`

```ts
userRouter.get('/users/health', healthyCheck)
userRouter.get('/users', verifyToken, getAllUser);
userRouter.get('/users/new', verifyToken, getNewUsers);
userRouter.get('/users/loyal', verifyToken, getLoyalUsers);
userRouter.patch('/users/:id', verifyToken, uploader.single('avatar'), updateUser);
userRouter.patch('/users/self/cart', verifyToken, updateCart);
userRouter.get('/users/:id', verifyToken, getUserById);
```

Request của trang admin có URL `/users` (sau khi Router tự bỏ tiền tố `/api/v1` đã xử lý ở Bước 3), khớp đúng dòng `userRouter.get('/users', verifyToken, getAllUser)` → giao việc cho hàm `getAllUser`.

Trước khi tới `getAllUser`, request phải qua "trạm kiểm tra" `verifyToken` (file `backend/src/middlewares/verifyToken.ts`):

```ts
export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: No token provided' });
    return;
  }
  const token = authHeader ? authHeader.split(' ')[1] : '';
  const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET) as jwt.JwtPayload;
  if (!decoded || !decoded.userId) {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }
  const user = await userModel.findById(decoded.userId).select('-password');
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  req.user = user;
  req.token = token;
  next();
};
```

`verifyToken` đọc "vé" (Bearer token) đính kèm ở Bước 2, giải mã nó, tìm ra chính xác đây là tài khoản nào trong database, gắn thông tin đó vào `req.user`, rồi gọi `next()` — nghĩa là "vé hợp lệ, cho đi tiếp tới Controller". Nếu không có vé, vé sai, hoặc vé hết hạn, nó chặn lại ngay, Controller (`getAllUser`) không bao giờ được chạy.

> **Lưu ý quan trọng cần biết thật (không tô hồng)**: khác với `banner.routes.ts` (route quản trị của banner có cả `verifyToken` VÀ `requireAdmin`), route `/users` ở đây **chỉ có `verifyToken`** — nghĩa là điều kiện duy nhất đang được kiểm tra là *"đã đăng nhập chưa"*, chưa có một "trạm" riêng kiểm tra *"người này có đúng là `role: admin` không"*. Trên thực tế trang này chỉ được đưa vào khu vực `/admin` ở giao diện (xem `frontend_react/src/App.tsx`, route `users` nằm trong layout admin), nên người dùng thường sẽ không thấy đường dẫn tới trang này — nhưng đây là điểm khác với banner nên tài liệu cần nói rõ, không giấu.

### Bước 5 — Controller thực sự "nấu"

File: `backend/src/controllers/user.controllers.ts`, hàm `getAllUser`:

```ts
export const getAllUser = async (req: Request, res: Response) => {
  try {
    const result = await userModel.find().select('-password');
    res.status(200).json({ success: true, result });
    return;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error user up: ${error.message}`);
      return;
    } else {
      console.error('Error user up:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
```

Controller nhờ `userModel` (Model, xem Bước 6) lấy hộ: *"tìm TẤT CẢ document trong collection `users`"*. Đoạn `.select('-password')` rất quan trọng — dấu `-` phía trước nghĩa là "loại bỏ field này ra khỏi kết quả", nên dù mật khẩu (đã được mã hoá) có nằm trong database, nó **không bao giờ** được gửi ra ngoài qua API này, kể cả cho admin.

Kết quả được gói lại thành JSON `{ success: true, result: [...] }` rồi trả về với mã `200` ("thành công").

### Bước 6 — Model — nơi thật sự chạm vào database

File: `backend/src/models/user.model.ts`

```ts
const userSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: false },
    email: { type: String, required: true, unique: true, default: '' },
    fullname: { type: String, required: false, default: '' },
    password: { type: String, required: false },
    phone_number: { type: String, default: '' },
    address: [addressSchema],
    status: { type: String, default: UserStatus.PENDING },
    role: { type: String, default: UserRoles.USER },
    avatar: { type: String },
    cart: [{ product: { type: Schema.Types.ObjectId, ref: product, required: true }, quantity: { type: Number, default: 1 } }],
    reset_password_token: { type: String, default: '' },
    reset_password_expires: { type: Date, default: null },
    refreshToken: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    isVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật (bảng này liệt kê đúng field trong `user.model.ts` và `user.interface.ts`):

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra) | "Số căn cước" duy nhất của người dùng đó | `"64f1a2b3c4d5e6f7a8b9c0d1"` |
| `googleId` | Chữ (String), có thể không có | Nếu tài khoản đăng nhập bằng Google thì đây là mã định danh Google, dùng để nhận ra "đây chính là tài khoản Google đó" mà không cần mật khẩu | `"110345798234567890123"` hoặc không có field |
| `email` | Chữ (String), bắt buộc, `unique` (không ai được trùng) | Email dùng để đăng nhập, cũng là cách liên hệ chính với người dùng | `"khach@gmail.com"` |
| `fullname` | Chữ (String), mặc định rỗng | Họ tên hiển thị | `"Nguyễn Văn A"` |
| `password` | Chữ (String), không bắt buộc | Mật khẩu **đã được mã hoá 1 chiều** (hash bằng `bcryptjs`), không phải chữ gốc; không bắt buộc vì tài khoản đăng nhập Google không cần mật khẩu | `"$2a$10$N9qo8uLOickgx2ZMRZoMy..."` (API luôn ẩn field này bằng `.select('-password')`) |
| `phone_number` | Chữ (String), mặc định rỗng | Số điện thoại liên hệ | `"0912345678"` |
| `address` | Mảng các object (mỗi object gồm `name`, `phone`, `address`, `isDefault`) | Danh sách địa chỉ giao hàng của người dùng, có thể có nhiều địa chỉ, 1 địa chỉ được đánh dấu mặc định | `[{ name: "Nguyễn Văn A", phone: "0912345678", address: "123 Lê Lợi, Q1", isDefault: true }]` |
| `status` | Chữ, mặc định `"pending"` | Trạng thái của TÀI KHOẢN: `"active"` = đang hoạt động bình thường; `"inactive"` = admin đã khoá; `"pending"` = mới đăng ký, chưa xác minh xong; `"AVAILABLE"` = giá trị khác dùng ở luồng khác của hệ thống | `"active"` |
| `role` | Chữ, mặc định `"user"` | Vai trò/quyền hạn của tài khoản: `"user"` = khách hàng thường; `"admin"` = quản trị viên (được vào các trang như trang này); `"employee"` = nhân viên | `"user"`, `"admin"` |
| `avatar` | Chữ (String) — 1 đường link | Link ảnh đại diện, ảnh thật được lưu trên Cloudinary, database chỉ lưu link | `"https://res.cloudinary.com/.../avatar123.png"` |
| `cart` | Mảng object `{ product: ObjectId, quantity: Number }` | Giỏ hàng hiện tại của người dùng, mỗi phần tử trỏ tới 1 sản phẩm (`ref product`) kèm số lượng | `[{ product: "64f1...", quantity: 2 }]` |
| `reset_password_token` / `reset_password_expires` | Chữ / Ngày giờ | Dùng cho chức năng "quên mật khẩu" — mã tạm thời và thời điểm hết hạn của nó | `""` khi không dùng |
| `refreshToken` | Chữ (String) | "Vé" dùng lâu dài để tự xin cấp lại access token mới khi access token hết hạn (xem `docs/login/README.md`) | chuỗi JWT dài |
| `dateOfBirth` | Chữ (String) | Ngày sinh | `"1998-05-20"` |
| `otp` / `otpExpiry` | Chữ / Ngày giờ | Mã xác minh email lúc đăng ký (xem `docs/signup/README.md`) và thời điểm mã đó hết hạn | `"482913"` |
| `isVerified` | Đúng/Sai (Boolean), mặc định `false` | Đã xác minh email bằng OTP xong chưa | `true` |
| `createdAt` / `updatedAt` | Ngày giờ, tự MongoDB điền (nhờ `{ timestamps: true }`) | Tài khoản được tạo/sửa lúc nào | `"2026-06-10T08:30:00.000Z"` |

Khi Controller gọi `userModel.find().select('-password')`, Model dịch câu đó thành lệnh MongoDB hiểu được, gửi xuống database thật, database lục "tủ lạnh" ra TẤT CẢ document trong collection `users` (không lọc điều kiện gì — khác với banner chỉ lấy `status: active`), rồi trả một mảng object ngược lên cho Controller, mỗi object đủ các field ở trên (trừ `password`).

### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

1. **Model** nhận kết quả từ MongoDB → trả về cho **Controller** dưới dạng một mảng JavaScript.
2. **Controller** (`getAllUser`) gói mảng đó vào `{ success: true, result: [...] }`, gọi `res.status(200).json(...)` → Express biến nó thành JSON thật và gửi ngược qua Internet.
3. **Router** không làm gì thêm ở chặng về — response cứ thế đi thẳng ra ngoài.
4. Response tới `userApi.js` ở frontend — `response.data` chính là JSON `{ success: true, result: [...] }` vừa nhận.
5. `user.tsx` nhận `data.result`, chạy `.map(...)` để "dịch" từng user thô thành dạng dễ hiển thị (đổi `status` sang tiếng Việt, thêm `key` cho bảng...), rồi gọi `setUsers(fetchedUsers)` và `setFilteredUsers(fetchedUsers)` — lệnh nói với React: *"dữ liệu đổi rồi, vẽ lại giao diện đi"*.
6. React vẽ lại component `Table` của thư viện Ant Design, mỗi dòng ứng với 1 người dùng: cột "Ảnh" hiện `avatar` (nếu có, tải trực tiếp từ Cloudinary; nếu không có thì hiện icon 👤 mặc định), cột "Trạng thái" hiện nhãn màu xanh (`"Hoạt động"`) hoặc đỏ (`"Bị khóa"`), cột "Vai trò" hiện `role`.

Việc **tìm kiếm** (ô "Tìm kiếm...") và **lọc theo trạng thái** (dropdown "Lọc trạng thái") ở trang này **không gọi lại API** — chúng chạy hoàn toàn ở frontend, trên mảng `users` đã tải sẵn (hàm `handleSearchAndFilter`, dùng `removeAccents` để so khớp không phân biệt dấu tiếng Việt). Nghĩa là admin gõ tìm kiếm bao nhiêu lần cũng không tốn thêm 1 request nào tới backend, vì toàn bộ danh sách đã nằm sẵn trong bộ nhớ trình duyệt từ Bước 1.

---

## Phần 4 — Luồng khi ADMIN sửa (khoá/mở khoá) một người dùng — khác gì so với luồng xem ở trên?

Khi admin bấm nút sửa (icon bút chì) trên 1 dòng, hàm `handleEdit` mở ra 1 `Modal` (hộp thoại) và điền sẵn dữ liệu người dùng đó vào form. Đáng chú ý: trong form này, các trường `fullname`, `email`, `phone_number`, "Ngày đăng ký" đều bị khoá (`disabled`) — **chỉ duy nhất trường "Trạng thái" là sửa được**. Vậy trên giao diện admin hiện tại, "sửa người dùng" trong thực tế nghĩa là **khoá/mở khoá tài khoản**, chứ không sửa các thông tin cá nhân khác.

Khi admin bấm "Lưu lại" (`handleModalOk`):

```ts
const updatedData = {
  status: values.status === "Hoạt động" ? "active" : "inactive",
};
const { data } = await userApi.update(selectedUser?._id, updatedData);
```

Nó "dịch ngược" nhãn tiếng Việt về đúng giá trị lưu trong database (`"active"`/`"inactive"`), rồi gọi:

```js
update: async (id, data) => {
  const response = await api.patch(`/v1/users/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return { data: response.data };
},
```

Request này là `PATCH` (nghĩa là "sửa một phần dữ liệu đã có", khác với `GET` chỉ xin xem) tới `/v1/users/:id`. Route tương ứng ở backend:

```ts
userRouter.patch('/users/:id', verifyToken, uploader.single('avatar'), updateUser);
```

Khác với route xem danh sách, route này có thêm "trạm" `uploader.single('avatar')` — trạm này chuẩn bị sẵn để nhận kèm 1 file ảnh đại diện mới (upload lên Cloudinary) nếu có, dù ở màn hình khoá/mở khoá hiện tại không có ảnh nào được gửi kèm.

Controller `updateUser` xử lý:

```ts
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { email, fullname, phone_number, address, role, avatar, status, dateOfBirth } = req.body;
  if (!email && !fullname && !phone_number && !address && !role && !avatar && !status && !dateOfBirth) {
    res.status(400).json({ success: false, message: 'Vui lòng cung cấp ít nhất một thông tin để cập nhật' });
    return;
  }
  const updateData: Partial<IUser> = {};
  if (email) updateData.email = email;
  if (fullname) updateData.fullname = fullname;
  if (phone_number) updateData.phone_number = phone_number;
  if (address) updateData.address = address;
  if (role) updateData.role = role;
  if (status) updateData.status = status;
  if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
  if (req.file) {
    updateData.avatar = req.file.path; // URL của ảnh từ Cloudinary
  }
  const updatedUser = await userModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  ...
};
```

Điểm quan trọng: `updateUser` chỉ cập nhật field nào THẬT SỰ được gửi lên (`if (email) ...`) — field nào không gửi thì giữ nguyên giá trị cũ trong database, không bị xoá mất. Vì giao diện admin hiện tại chỉ gửi `status`, nên trên thực tế chỉ có `status` bị đổi; các field khác (kể cả `role`) tuy Controller có hỗ trợ cập nhật, nhưng **chưa có ô nhập nào trên form admin gửi chúng lên** — nghĩa là đổi vai trò `role` (ví dụ nâng 1 user thường lên admin) hiện chưa làm được từ trang này.

Sau khi `findByIdAndUpdate(..., { new: true, runValidators: true })` chạy xong ở Model, Controller trả về `{ message: 'Người dùng đã được cập nhật thành công', user: updatedUser }` với mã `200`. Response đi ngược lại đúng đường (Model → Controller → ra khỏi backend → `userApi.js`), `user.tsx` nhận kết quả, tự cập nhật lại mảng `users`/`filteredUsers` trong bộ nhớ trình duyệt (không cần gọi lại API xem danh sách), đóng Modal, và hiện thông báo xanh "Thành công" (`notification.success`) ở góc màn hình.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu người dùng (thêm field mới) | `backend/src/models/user.model.ts` + `backend/src/interfaces/user.interface.ts` |
| Đổi các giá trị hợp lệ của `status`/`role` | `backend/src/enums/user.enum.ts` |
| Đổi logic lấy danh sách/cập nhật người dùng | `backend/src/controllers/user.controllers.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào, thêm kiểm tra quyền admin | `backend/src/routes/user.routes.ts` |
| Đổi cách kiểm tra "đã đăng nhập chưa" (JWT) | `backend/src/middlewares/verifyToken.ts` |
| Đổi giao diện bảng danh sách + Modal sửa trạng thái ở admin | `frontend_react/src/admin/user/user.tsx` |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/userApi.js` |
| Đổi cách gắn token vào mỗi request, cách tự refresh token | `frontend_react/src/api/axios.js` |
| Đổi đường dẫn menu vào trang này trong khu vực admin | `frontend_react/src/App.tsx` (route `users` trong layout admin), `frontend_react/src/components/layout/AdminLayout.tsx` |

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/users`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa 1 phần, DELETE = xoá.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (ở đây là `verifyToken` — kiểm tra đăng nhập).
- **Status code (200, 400, 401, 404, 500)**: mã số 3 chữ số kèm response, nói tình trạng: 200 ổn, 400 request sai định dạng, 401 chưa đăng nhập/token sai, 404 không tìm thấy, 500 lỗi server.
- **JWT / access token**: một chuỗi ký tự dài, sinh ra lúc đăng nhập thành công, dùng như "vé" để các request sau chứng minh "tôi đã đăng nhập, tôi là ai" (xem thêm `docs/login/README.md`).
- **`role` vs `status`**: `role` quyết định "được LÀM gì" (user/admin/employee); `status` quyết định "tài khoản có đang HOẠT ĐỘNG không" (active/inactive/pending). Hai khái niệm độc lập nhau.
- **Hash (mã hoá 1 chiều)**: cách biến mật khẩu thật thành 1 chuỗi không thể dịch ngược, để kể cả người xem được database cũng không đọc được mật khẩu gốc.
- **Schema**: bản thiết kế của Model, quy định 1 document (1 dòng dữ liệu) có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB — ví dụ 1 người dùng cụ thể là 1 document trong collection `users`.
- **Collection**: tập hợp nhiều document cùng loại — ví dụ collection `users` chứa tất cả người dùng.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌─────────────┐      ┌──────────────┐      ┌──────────────────┐
│  user.tsx   │ ───▶ │  userApi.js  │ ───▶ │  index.ts (app)  │
│(trang admin)│      │ (gói request  │      │  cửa chính backend│
│             │      │ + gắn token)  │      │                   │
└─────────────┘      └──────────────┘      └────────┬──────────┘

┌──────────────────────────────────────────────────────┘
▼
┌────────────────────┐    ┌─────────────────────────┐    ┌───────────────────┐
│ user.routes.ts      │ ─▶ │ user.controllers.ts      │ ─▶ │ user.model.ts      │
│ khớp URL, kiểm tra   │    │ xử lý logic, gọi Model    │    │ nói chuyện với DB  │
│ verifyToken         │    │                           │    │                   │
└────────────────────┘    └─────────────────────────┘    └─────────┬─────────┘
                                                                     ▼
                                                          ┌────────────────────┐
                                                          │ MongoDB (database)  │
                                                          │ collection "users"  │
                                                          └─────────┬─────────┘
                                                                     │
◀────────────────────────────────────────────────────────────────────┘
   dữ liệu người dùng đi ngược lại đúng đường trên, tới user.tsx → setUsers() → hiện lên bảng Table
```

Tóm tắt 1 câu mỗi trạm (luồng xem danh sách):

1. **user.tsx** — trang admin vừa mở, tự gọi xin toàn bộ danh sách người dùng.
2. **userApi.js** — đóng gói yêu cầu thành 1 request `GET` tới `/api/v1/users`, `axios.js` tự gắn kèm token đăng nhập của admin vào header.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, rồi được chuyển cho đúng router theo tiền tố URL.
4. **user.routes.ts** — dò đúng địa chỉ `/users`, bắt qua "trạm" `verifyToken` (phải đã đăng nhập), giao cho hàm `getAllUser`.
5. **user.controllers.ts** — hàm `getAllUser` nhờ Model tìm TẤT CẢ user, ẩn field `password`, gói kết quả thành `{ success, result }`.
6. **user.model.ts** — dịch yêu cầu đó thành câu lệnh MongoDB hiểu được, lấy đúng field (`email`, `fullname`, `status`, `role`, `avatar`...).
7. **MongoDB** — tìm trong collection `users`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua (Model → Controller → ra khỏi backend → `userApi.js` → `user.tsx`), React vẽ lại `Table` với đầy đủ user; tìm kiếm/lọc sau đó chạy ngay ở frontend, không gọi lại API.

Luồng **sửa trạng thái** (khoá/mở khoá) đi qua đúng các trạm trên nhưng theo chiều `PATCH /api/v1/users/:id`, chỉ khác: Controller là `updateUser` (chỉ cập nhật field nào thật sự được gửi lên, ở đây chỉ có `status`), và route có thêm 1 trạm `uploader.single('avatar')` để sẵn sàng nhận ảnh mới nếu có.
