# Đăng nhập (Login) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Đọc `docs/signup/README.md` trước nếu chưa đọc — luồng đăng nhập giả định tài khoản đã được tạo và xác minh OTP xong (`status = active`). Nếu chưa đọc `docs/banner/README.md` (giải thích controller/router/model), nên đọc Phần 1 file đó trước.

## Phần 1 — Vài khái niệm riêng của đăng nhập

| Khái niệm | Giải thích đơn giản |
|---|---|
| **Access token** | 1 chuỗi ký tự dài, giống "thẻ ra vào" tạm thời — mỗi lần gọi API cần đăng nhập, trình duyệt gửi kèm thẻ này để server biết "đây là ai". Hết hạn sau **1 ngày** |
| **Refresh token** | 1 "thẻ" khác, sống lâu hơn (**7 ngày**), dùng để tự động xin 1 access token MỚI khi access token cũ hết hạn — để khách không phải đăng nhập lại liên tục |
| **Cookie httpOnly** | 1 cách lưu dữ liệu trên trình duyệt mà JavaScript KHÔNG đọc được trực tiếp (an toàn hơn `localStorage`) — refresh token được lưu kiểu này |
| **`localStorage`** | Nơi lưu dữ liệu đơn giản trên trình duyệt, JavaScript đọc được bình thường — access token và thông tin user (`userData`) được lưu ở đây |

## Phần 2 — Sơ đồ tổng thể

```
Khách nhập email+mật khẩu → server kiểm tra đúng không, tài khoản có bị khoá/chưa xác minh không
→ đúng hết → server tạo access token (1 ngày) + refresh token (7 ngày)
→ access token trả về cho trình duyệt lưu vào localStorage
→ refresh token lưu vào cookie (trình duyệt tự giữ, JS không đọc trực tiếp được) + lưu luôn trong database
→ các lần gọi API sau, trình duyệt tự gắn access token vào, server đọc để biết "đây là ai"
```

## Phần 3 — Đi từng bước thật

### Bước 1 — Khách nhập email + mật khẩu

File: `frontend_react/src/pages/login/login.tsx`. Form chỉ có `email`, `password`. Kiểm tra sơ (không rỗng, đúng định dạng email) trước khi gửi `loginApi.login({ email, password })` → `POST /api/v1/auth/login`.

### Bước 2 — Backend kiểm tra từng lớp trước khi cho vào

File: `backend/src/controllers/auth.controllers.ts`, hàm `loginController`:

```ts
const user = await userModel.findOne({ email });
if (!user) { /* 404: email chưa đăng ký */ }
if (user.status === 'inactive') { /* 401: tài khoản đã bị khóa */ }
if (user.status === UserStatus.PENDING) {
  /* 403: "Vui lòng xác thực email bằng OTP trước khi đăng nhập!" */
}
const isPasswordValid = await bcryptjs.compare(password, user.password);
if (!isPasswordValid) { /* 401: mật khẩu không đúng */ }
```

Giải thích thứ tự kiểm tra, từng lớp một, dừng ngay khi sai 1 lớp:
1. Email có tồn tại trong hệ thống không.
2. Tài khoản có bị khoá (`inactive`) không.
3. Tài khoản có xác minh OTP xong chưa (`pending` = chưa xác minh → chặn, bắt xác minh trước — xem `docs/signup/README.md`).
4. Mật khẩu nhập vào, sau khi băm theo đúng công thức lúc đăng ký, có khớp với mật khẩu đã băm lưu trong DB không (`bcryptjs.compare` — không giải mã ngược, chỉ so sánh bằng cách băm lại mật khẩu vừa nhập rồi so 2 chuỗi băm).

### Bước 3 — Tạo "thẻ ra vào" (token) sau khi mọi thứ hợp lệ

```ts
const accessToken = await generateAccessToken(user._id, res);   // hết hạn sau 1 ngày
const refreshToken = await generateRefreshToken(user._id, res); // hết hạn sau 7 ngày
await userModel.findByIdAndUpdate(user._id, { refreshToken });  // lưu luôn vào DB để so khớp lúc refresh

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: ENV_VARS.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

res.status(200).json({ success: true, userData, accessToken });
```

Chú ý: **2 loại token đi 2 đường khác nhau** — `accessToken` nằm trong phần JSON trả về (frontend tự lưu vào `localStorage`), còn `refreshToken` được gài thẳng vào cookie `httpOnly` (an toàn hơn, JavaScript ở trình duyệt không đọc trực tiếp được, tự động gửi kèm mỗi request tới đúng domain).

### Bước 4 — Frontend lưu lại để dùng cho các lần sau

File: `frontend_react/src/pages/login/login.tsx`, sau khi nhận response thành công:

```js
localStorage.setItem("accessToken", accessToken);
localStorage.setItem("accountID", JSON.stringify(userData._id));
localStorage.setItem("userData", JSON.stringify(userData));
```

Sau đó chuyển về trang chủ (`navigate("/")`).

### Bước 5 — Dùng token cho các request sau

File: `frontend_react/src/api/axios.js` — MỌI request gọi API (không chỉ login) đều tự động đi qua đoạn này trước khi gửi:

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

Ví như mỗi lần vào cổng, tự động đưa thẻ ra vào ra mà không cần khách tự làm gì — cứ có "thẻ" trong `localStorage` là tự động gắn vào mọi request.

## Phần 4 — Đăng nhập bằng Google (đường riêng, khác hoàn toàn)

File: `backend/src/controllers/auth.controllers.ts`, hàm `googleLogin` (route `POST /api/v1/auth/google`). Nhận `idToken` do Google cấp (sau khi khách đăng nhập Google ở trình duyệt), xác minh với chính Google (`client.verifyIdToken`), rồi:
- Nếu email đó đã có tài khoản (tìm theo `googleId` trước, không thấy thì tìm theo `email`) → đăng nhập luôn vào tài khoản đó.
- Nếu chưa có → **tự tạo tài khoản mới với `status: 'active'` ngay**, KHÔNG cần qua bước xác minh OTP (khác hẳn đăng ký thường) — vì Google đã tự xác minh email đó rồi, không cần xác minh lại.

## Phần 5 — Đăng xuất

File: `frontend_react/src/components/header.tsx` (và lặp lại tương tự ở `AdminLayout.tsx`), hàm `handleLogout`:
```ts
await loginApi.logout();      // POST /auth/logout — backend chỉ xoá cookie refreshToken
localStorage.clear();          // xoá hết access token + userData ở trình duyệt
navigate("/login");
```

## Phần 6 — Vấn đề đã biết, CHƯA xử lý

- **Đăng nhập thường không tự chuyển admin vào `/admin`** — sau khi đăng nhập bằng email/mật khẩu, mọi người (kể cả admin) đều bị đưa về `/` (trang chủ khách hàng). Admin phải tự gõ/bấm vào `/admin` mới vào được trang quản trị. Chỉ riêng đường Google-login ở TRANG ĐĂNG KÝ (không phải trang đăng nhập) có kiểm tra `role === 'admin'` để tự chuyển — không đồng bộ giữa các luồng.
- **Cơ chế tự làm mới access token khi hết hạn (dùng refresh token) có thể không hoạt động đúng như thiết kế**: code ở `axios.js` chỉ tự refresh khi backend trả đúng chữ `"Token expired"`, nhưng middleware kiểm tra token hiện tại (`checkRoleStatus`) trả về chữ khác (`"Invalid token"`) khi token hết hạn — nghĩa là khách có thể bị đăng xuất/lỗi khi access token hết hạn (sau 1 ngày) thay vì được tự động làm mới êm ái. Cần kiểm tra lại kỹ trước khi coi đây là hoạt động đúng.
- `logoutController` chỉ xoá cookie `refreshToken`, không xoá field `refreshToken` đang lưu trong document User ở DB — refresh token cũ về lý thuyết vẫn "hợp lệ" trong DB dù cookie đã mất, không phải lỗ hổng nghiêm trọng (không có cookie thì không gửi lại được token đó) nhưng không "dọn sạch" hoàn toàn.

## Phần 7 — Bảng tra cứu nhanh

| Muốn làm gì | Mở file |
|---|---|
| Đổi điều kiện được phép đăng nhập | `backend/src/controllers/auth.controllers.ts` (hàm `loginController`) |
| Đổi thời gian sống của token | `backend/src/utils/jwt.ts` (`generateAccessToken`/`generateRefreshToken`) |
| Đổi luồng đăng nhập Google | `backend/src/controllers/auth.controllers.ts` (hàm `googleLogin`) |
| Đổi cách frontend tự gắn token vào request / tự refresh | `frontend_react/src/api/axios.js` |
| Đổi form đăng nhập | `frontend_react/src/pages/login/login.tsx` |
| Đổi nơi frontend lưu token sau đăng nhập | `frontend_react/src/pages/login/login.tsx` (đoạn `localStorage.setItem`) |
| Đổi logic đăng xuất | `frontend_react/src/components/header.tsx` + `backend/src/controllers/auth.controllers.ts` (hàm `logoutController`) |

## Phần 8 — Tóm tắt nhanh

```
login.tsx → loginApi.login() → POST /auth/login → loginController
  → check: email tồn tại? bị khoá? đã xác minh OTP? mật khẩu đúng?
  → tạo accessToken (1 ngày, trả về JSON) + refreshToken (7 ngày, cookie httpOnly + lưu DB)
                              │
login.tsx nhận accessToken → lưu localStorage → điều hướng về "/"
                              │
axios.js (mọi request sau) → tự gắn "Authorization: Bearer <accessToken>"
```

1. **login.tsx** — khách nhập email/mật khẩu.
2. **loginController** — kiểm tra đủ 4 lớp (tồn tại/khoá/đã xác minh/đúng mật khẩu) rồi mới cấp token.
3. Access token về `localStorage`, refresh token về cookie httpOnly + lưu DB.
4. **axios.js** — tự gắn access token vào mọi request tiếp theo, không cần khách làm gì thêm.
5. Đăng xuất chỉ đơn giản là xoá hết ở cả 2 phía (cookie server-side + localStorage client-side).
