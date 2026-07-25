# Đăng ký (Signup) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Nếu chưa đọc `docs/banner/README.md`, nên đọc Phần 1 của file đó trước (giải thích controller/router/model là gì). Tài liệu này giả định bạn đã biết các khái niệm đó.

## Phần 1 — Tóm tắt luồng đăng ký

Đăng ký không chỉ là "lưu vào database" — có 2 bước bắt buộc: (1) tạo tài khoản, (2) xác minh email THẬT bằng mã OTP gửi qua email, trước khi được phép đăng nhập. Đây là để chắc chắn email nhập vào có thật, không phải email giả/của người khác.

| Khái niệm | Giải thích đơn giản |
|---|---|
| **Hash mật khẩu** | Không lưu mật khẩu thật vào database — biến nó thành 1 chuỗi mã hoá 1 chiều (không thể dịch ngược lại được). Kể cả người có quyền xem database cũng không đọc được mật khẩu gốc |
| **OTP (One-Time Password)** | Mã số 6 chữ số, dùng 1 lần, gửi qua email, hết hạn sau 1 khoảng thời gian ngắn — để xác minh người đăng ký đúng là chủ email đó |
| **isVerified / status** | 2 field trên tài khoản đánh dấu "đã xác minh email chưa" — tài khoản mới tạo LUÔN ở trạng thái chưa xác minh, chưa đăng nhập được |

## Phần 2 — Sơ đồ tổng thể

```
Khách điền form đăng ký → tạo tài khoản (CHƯA xác minh) → gửi mã OTP qua email
→ khách nhập mã OTP → xác minh đúng → tài khoản chuyển sang "active"
→ mời khách qua trang đăng nhập (đăng ký KHÔNG tự đăng nhập luôn)
```

## Phần 3 — Đi từng bước thật

### Bước 1 — Khách điền form đăng ký

File: `frontend_react/src/pages/signup/signup.tsx`. Form thu `fullname`, `email`, `password`, `confirmPassword` — tự kiểm tra ở trình duyệt trước (2 mật khẩu khớp nhau, email đúng định dạng, mật khẩu ≥ 6 ký tự) rồi mới gửi lên server, tránh gửi request vô ích khi rõ ràng sai.

### Bước 2 — Backend tạo tài khoản (CHƯA cho đăng nhập được)

File: `backend/src/controllers/auth.controllers.ts`, hàm `signupController`. Gọi qua `POST /api/v1/auth/signup`.

```ts
const existingUserByEmail = await userModel.findOne({ email });
if (existingUserByEmail) { /* báo lỗi: email đã tồn tại */ }

const salt = await bcryptjs.genSalt(10);
const hashedPassword = await bcryptjs.hash(password, salt);

const otp = generateOTP();                              // 6 chữ số ngẫu nhiên
const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);  // hết hạn sau 5 phút

const newUser = new userModel({
  email, password: hashedPassword, fullname,
  avatar: avatarUrl,  // tự tạo ảnh đại diện chữ cái đầu tên, màu ngẫu nhiên
  otp, otpExpiry, isVerified: false
});
await newUser.save();

await sendEmail(email, 'Xác thực email của bạn', `Mã OTP của bạn là: ${otp}...`, '');
```

Giải thích:
- Kiểm tra email đã tồn tại chưa trước khi tạo mới (không cho 2 tài khoản trùng email).
- Mật khẩu KHÔNG lưu nguyên văn — băm qua `bcryptjs` (thuật toán băm chuyên cho mật khẩu, có thêm "salt" — 1 chuỗi ngẫu nhiên trộn vào trước khi băm, để 2 người dùng chung mật khẩu vẫn ra chuỗi băm khác nhau).
- Field `otp` (mã 6 số) và `otpExpiry` (hết hạn sau 5 phút) được lưu ngay trên chính document User đó — không cần bảng riêng.
- `isVerified: false` — mặc định tài khoản mới CHƯA được xác minh. Field `status` không set ở đây, tự lấy giá trị mặc định của schema là `"pending"` (đang chờ).
- Cuối cùng gửi email chứa mã OTP (dùng `sendEmail`, xem thêm ở phần "Vấn đề đã sửa trước đây" trong lịch sử — đây chính là chức năng đã test lúc đầu buổi làm việc, dùng Gmail App Password).

### Bước 3 — Chuyển qua trang nhập mã OTP

Frontend, sau khi `signupApi.signup(...)` trả về thành công, chuyển trang: `navigate("/verify-otp", { state: { email } })` — gửi kèm email qua "state" của router (không phải hiện trên URL), để trang OTP biết đang xác minh cho ai.

### Bước 4 — Xác minh mã OTP

File: `backend/src/controllers/auth.controllers.ts`, hàm `verifyOTPController`. Gọi qua `POST /api/v1/auth/verify-otp`.

```ts
const user = await userModel.findOne({ email });
if (user.otp !== otp || new Date() > user.otpExpiry) {
  // báo lỗi: mã không đúng hoặc đã hết hạn
  return;
}
user.otp = null;
user.otpExpiry = null;
user.isVerified = true;
user.status = UserStatus.ACTIVE;   // "active" — từ giờ đăng nhập được
await user.save();
```

So khớp mã OTP nhập vào với mã đã lưu, VÀ kiểm tra chưa quá giờ hết hạn. Đúng cả 2 → xoá mã OTP đi (dùng 1 lần xong không dùng lại được), đánh dấu `isVerified = true` và `status = 'active'`. Từ đây tài khoản mới thật sự dùng được.

Frontend nhận phản hồi thành công → chuyển sang trang `/login` để khách tự đăng nhập lại — đăng ký xong KHÔNG tự động đăng nhập luôn.

## Phần 4 — Vấn đề đã biết, CHƯA xử lý

- **Nút "Gửi lại OTP" không hoạt động**: trang `verifyOTP.tsx` có gọi `signupApi.resendOtp(email)`, nhưng hàm này KHÔNG tồn tại trong `signupApi.js`, và backend cũng không có route nào cho việc gửi lại OTP. Bấm nút này sẽ báo lỗi. Nếu mã OTP hết hạn (quá 5 phút), hiện tại khách phải đăng ký lại từ đầu bằng email đó (nhưng email đã tồn tại trong DB ở trạng thái `pending` — sẽ bị báo "email đã tồn tại", tạo ra 1 vòng lặp bí — đây là lỗi thật, cần xử lý sau).
- Ở `verifyOTPController`, có gọi `generateAccessToken(...)` nhưng không dùng kết quả đó (không trả token về cho client) — code thừa, không gây lỗi nhưng vô nghĩa.
- OTP (mã 6 số) bị trả nguyên trong response JSON của bước đăng ký (`user: {...newUser}` không loại bỏ field `otp`) — không phải lỗ hổng nghiêm trọng (email thì cũng nhận được mã đó rồi) nhưng không cần thiết phải trả về, nên bỏ.

## Phần 5 — Bảng tra cứu nhanh

| Muốn làm gì | Mở file |
|---|---|
| Đổi điều kiện hợp lệ khi đăng ký (độ dài mật khẩu...) | `backend/src/controllers/auth.controllers.ts` (hàm `signupController`) |
| Đổi nội dung email OTP | `backend/src/controllers/auth.controllers.ts` (biến `message` trong `signupController`) + `backend/src/utils/sendEmail.ts` |
| Đổi thời gian hết hạn OTP | `backend/src/controllers/auth.controllers.ts` (dòng tính `otpExpiry`) |
| Đổi logic xác minh OTP | `backend/src/controllers/auth.controllers.ts` (hàm `verifyOTPController`) |
| Đổi form đăng ký | `frontend_react/src/pages/signup/signup.tsx` |
| Đổi trang nhập mã OTP | `frontend_react/src/pages/verifyOTP/verifyOTP.tsx` |
| Đổi field lưu trên tài khoản | `backend/src/models/user.model.ts` |

## Phần 6 — Tóm tắt nhanh

```
signup.tsx → signupApi.signup() → POST /auth/signup → signupController
  → check trùng email → hash password → tạo OTP 5 phút → lưu User (status=pending)
  → gửi email chứa OTP
                    │
verifyOTP.tsx → signupApi.verifyOtp() → POST /auth/verify-otp → verifyOTPController
  → so khớp OTP + còn hạn → status=active, isVerified=true
                    │
              chuyển qua /login, khách tự đăng nhập
```

1. **signup.tsx** — khách điền thông tin, gửi lên server.
2. **signupController** — kiểm tra trùng email, băm mật khẩu, tạo mã OTP, lưu tài khoản ở trạng thái CHƯA dùng được, gửi email.
3. **verifyOTP.tsx** — khách nhập mã từ email.
4. **verifyOTPController** — đúng mã + còn hạn → mở khoá tài khoản (`active`).
5. Xong bước 4, khách phải tự qua trang đăng nhập — xem tiếp `docs/login/README.md`.
