# Liên hệ (Contact) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi một khách ghé trang "Liên hệ" của pet-corner, điền tên/email/số điện thoại/nội dung rồi bấm "Gửi cho chúng tôi". Viết cho người **chưa biết gì về lập trình**, nên phần đầu sẽ giải thích vài khái niệm nền tảng trước, sau đó đi vào từng file code thật, theo đúng thứ tự nó chạy.

Feature này nhỏ và gọn hơn nhiều so với banner, nhưng có **một điểm bất thường đáng chú ý**: có sẵn một "công thức" (Model) để lưu liên hệ vào database, nhưng code hiện tại lại **không hề dùng tới nó**. Điều này sẽ được giải thích kỹ ở Phần 4.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, điền phiếu góp ý | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt (Chrome, Cốc Cốc...) của người dùng |
| **Backend** (server) | Lễ tân + nhân viên trực điện thoại | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và xử lý |
| **API** | Ô nhận phiếu góp ý ở quầy | Một "địa chỉ" cố định mà frontend gọi tới để gửi/xin dữ liệu, ví dụ `/api/v1/contact` |
| **Request** (yêu cầu) | Tờ phiếu góp ý khách điền và nộp | Frontend gửi một "gói dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Lời nhân viên xác nhận "đã nhận phiếu của anh/chị" | Backend gửi ngược kết quả về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc phiếu, biết phải chuyển cho ai xử lý | Đoạn code quyết định: request gửi tới đúng địa chỉ nào thì giao cho ai xử lý |
| **Controller** | Nhân viên thực sự xử lý phiếu | Đoạn code thực sự "làm việc": đọc dữ liệu khách gửi, xử lý (ở đây là soạn & gửi 1 email), rồi trả kết quả |
| **Model** | Một quyển sổ mẫu có sẵn để ghi lại từng phiếu góp ý, cất vào tủ hồ sơ (database) | Định nghĩa "một liên hệ trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với database. **Điểm đặc biệt của feature này: quyển sổ mẫu này CÓ TỒN TẠI nhưng KHÔNG ai lấy ra dùng** — xem Phần 4 |
| **Database (MongoDB)** | Tủ hồ sơ lưu trữ | Nơi dữ liệu được lưu trữ thật sự, tồn tại lâu dài. Ở feature này, tủ hồ sơ **hoàn toàn không được đụng tới** |
| **Nodemailer / Email (SMTP)** | Nhân viên tự cầm điện thoại gọi ngay cho quản lý ở xa để báo tin, thay vì ghi vào sổ | Một thư viện giúp backend **tự gửi 1 email thật** ra ngoài Internet, dùng một tài khoản email đã cấu hình sẵn |
| **JSON** | Cách viết dữ liệu ra giấy để giao cho khách | Một cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để hai bên (backend/frontend) hiểu nhau |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc/ghi trực tiếp database.** Nó luôn phải "hỏi" backend qua API. Ở phần lớn feature khác (như banner), backend sẽ nhờ Model ghi/đọc database. Nhưng ở feature Liên hệ, backend **bỏ qua bước database luôn** — nó gửi thẳng một email rồi thôi, như sẽ thấy ở Phần 3 và Phần 4.

---

## Phần 2 — Bức tranh tổng thể (chỉ vài dòng)

```
Trình duyệt (contact.tsx)  →  gọi API  →  Backend (index.ts→router→controller)  →  Gửi email qua SMTP tới ngocthanhnt04@gmail.com
Backend  →  trả "đã gửi thành công"  →  Trình duyệt  →  hiện thông báo "Cảm ơn bạn đã gửi thông tin"
```

Lưu ý: khác với banner, luồng này **không đi qua Model, không chạm database** — nó dừng lại ở bước "gửi email" rồi quay đầu về luôn.

Bây giờ ta đi từng bước thật chi tiết, đúng theo thứ tự xảy ra trong thực tế.

---

## Phần 3 — Từng bước thật, từ lúc bấm "Gửi" tới lúc thấy thông báo

### Bước 1 — Khách điền form và bấm nút "Gửi cho chúng tôi"

File: `frontend_react/src/pages/contact/contact.tsx`

Form có 4 ô: tên, email, số điện thoại, nội dung. Khi bấm nút gửi, thư viện giao diện (antd `Form`) tự gom 4 ô đó thành 1 object rồi gọi hàm `onFinish`:

```tsx
const onFinish = async (values: ContactFormData) => {
  setLoading(true);
  try {
    const response = await contactApi.submitContactForm(values);
    if (response.success) {
      message.success(
        "Cảm ơn bạn đã gửi thông tin. Chúng tôi sẽ liên hệ lại sớm!"
      );
      form.resetFields(); // Reset form sau khi gửi thành công
    } else {
      ...
    }
  } catch (error: any) {
    message.error(error.message || "Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại!");
  } finally {
    setLoading(false);
  }
};
```

`values` lúc này là 1 object dạng `{ name: "Nguyễn Văn A", email: "a@gmail.com", phone: "0912345678", message: "Tôi muốn hỏi về sản phẩm..." }`. `setLoading(true)` bật icon xoay xoay trên nút bấm để khách biết hệ thống đang xử lý, tránh bấm gửi nhiều lần.

Trước khi tới được đây, antd `Form` đã tự kiểm tra các `rules` khai báo sẵn ngay trong JSX (ví dụ `{ required: true, message: "Vui lòng nhập tên của bạn!" }`, hay số điện thoại phải khớp `pattern: /^[0-9]{10}$/`) — nếu khách điền thiếu hoặc sai định dạng, form báo lỗi ngay tại chỗ và **không hề gửi request đi**, tiết kiệm cho backend khỏi phải xử lý dữ liệu rác.

### Bước 2 — `contactApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/contactApi.js`

```js
import api from "./axios";
const contactApi = {
    submitContactForm: async (formData) => {
        try {
          const response = await api.post("/v1/contact", formData)
          return response.data;
        } catch (error) {
          throw error.response?.data || { message: "Có lỗi xảy ra khi gửi thông tin." };
        }
    },
};
export default contactApi;
```

Dòng `api.post("/v1/contact", formData)` gửi một request kiểu `POST` (nghĩa là "tôi muốn tạo/gửi cái gì đó mới", khác với `GET` là "chỉ xin xem"), kèm theo `formData` (4 field name/email/phone/message) trong phần thân request. `api` là công cụ có sẵn (thư viện `axios`, cấu hình tại `frontend_react/src/api/axios.js`) tự nối `/v1/contact` với địa chỉ gốc backend để ra URL đầy đủ, ví dụ `http://localhost:5000/api/v1/contact`.

### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`

Đây là **cửa chính** của cả backend — mọi request, bất kể xin gì, đều phải đi qua file này đầu tiên:

```ts
app.use(cors(corsOptions));
app.use(express.json()); // will allow us to parse req.body
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger('dev'));
```

Đây là các **middleware** (những "trạm kiểm tra/chuẩn bị" mà request phải đi qua trước khi tới đúng người xử lý). Đáng chú ý nhất ở đây là `express.json()` — nó "mở gói" dữ liệu JSON mà `contactApi.js` gửi lên, biến nó thành 1 object JavaScript bình thường mà Controller đọc được qua `req.body`.

Rồi tới dòng quyết định request được **giao cho ai xử lý tiếp**:

```ts
app.use('/api/v1', contactRouter);
```

Dòng này nói: *"Bất kỳ request nào có địa chỉ bắt đầu bằng `/api/v1`, hãy đưa cho `contactRouter` xem có phải việc của nó không."* Dòng này nằm ở cuối danh sách các router (sau banner, revenue...) trong file, nhưng thứ tự đó không ảnh hưởng gì vì mỗi router chỉ nhận đúng địa chỉ của mình.

### Bước 4 — Router khớp đúng địa chỉ và chuyển tiếp

File: `backend/src/routes/contact.routes.ts`

```ts
import { Router } from 'express';
import { submitContactForm } from '../controllers/contact.controllers.js';

const router = Router();

router.post('/contact', submitContactForm);

export default router;
```

File này **chỉ có đúng 1 dòng route** — đơn giản hơn hẳn banner (banner có 3-4 route khác nhau cho xem/thêm/sửa/xoá). Router thấy request là `POST /contact` (sau khi bỏ tiền tố `/api/v1`) → khớp đúng → giao việc cho hàm `submitContactForm`.

Điều đáng chú ý nhất: dòng này **không có `verifyToken`, không có `requireAdmin`** — nghĩa là route này **hoàn toàn công khai (public)**, ai cũng gửi được, không cần đăng nhập tài khoản gì cả. Điều này hợp lý vì đây là form liên hệ dành cho khách vãng lai, chưa chắc có tài khoản trên hệ thống.

Một điểm khác cũng đáng chú ý: **không hề có route nào khác** kiểu `GET /contact` hay `/contact/:id` để "xem lại danh sách liên hệ đã gửi" — vì (sẽ giải thích ở Phần 4) dữ liệu này không được lưu lại ở đâu để mà xem.

### Bước 5 — Controller thực sự xử lý: soạn và gửi email

File: `backend/src/controllers/contact.controllers.ts`, hàm `submitContactForm`:

```ts
export const submitContactForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, message } = req.body;
    console.log(email, 'email');
    if (!name || !email || !phone || !message) {
      res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin!' });
    }

    // Cấu hình transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Nội dung email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'ngocthanhnt04@gmail.com', // Email nhận thông tin
      subject: 'Liên hệ mới từ website',
      html: `...bảng HTML chứa name/email/phone/message...`
    };

    // Gửi email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Thông tin đã được gửi thành công qua email!'
    });
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi gửi email. Vui lòng thử lại!' });
  }
};
```

Giải thích từng phần:

1. **Lấy dữ liệu**: `const { name, email, phone, message } = req.body;` — lấy 4 giá trị khách đã điền, đã được `express.json()` ở Bước 3 "mở gói" sẵn.
2. **Kiểm tra thiếu thông tin**: nếu thiếu 1 trong 4 field, trả về mã lỗi `400` (nghĩa là "request của anh/chị sai/thiếu, không phải lỗi của tôi") kèm thông báo tiếng Việt dễ hiểu.
3. **`transporter` — "người đưa thư"**: `nodemailer.createTransport(...)` tạo ra một "người đưa thư ảo", được cấp thông tin đăng nhập của MỘT tài khoản email thật (đọc từ file `.env` của backend: `EMAIL_HOST` là địa chỉ máy chủ gửi mail, `EMAIL_PORT` là cổng kết nối, `EMAIL_USER`/`EMAIL_PASS` là tài khoản/mật khẩu email dùng để gửi đi). Đây chính là lúc backend "tự cầm điện thoại gọi đi" như ví ở Phần 1.
4. **`mailOptions` — nội dung lá thư**: gồm người gửi (`from`), người nhận (`to`, ở đây bị **viết cứng/hard-code cố định** là `ngocthanhnt04@gmail.com` — không đọc từ cấu hình, không thể đổi trừ khi sửa thẳng code), tiêu đề, và nội dung HTML có chèn đủ 4 thông tin khách gửi vào một cái bảng đẹp.
5. **`await transporter.sendMail(mailOptions)`** — đây là dòng lệnh thực sự gửi email đi qua Internet, tới hộp thư `ngocthanhnt04@gmail.com`. Sau dòng này, y hệt việc gọi điện xong cúp máy — **không có gì được lưu lại** trong hệ thống pet-corner nữa.
6. **Trả kết quả**: nếu gửi thành công, trả `{ success: true, message: '...' }` với mã `200`. Nếu `transporter.sendMail` gặp lỗi (ví dụ sai mật khẩu email, mất mạng), rơi vào `catch`, trả `{ success: false, ... }` với mã `500`.

**Không có bước nào trong hàm này gọi tới database.** Đây là khác biệt lớn nhất so với banner (nơi Controller luôn gọi `bannerModel.find(...)` hay `.create(...)`).

### Bước 6 — Vì sao không có bước "Model nói chuyện với database" ở đây?

Ở hầu hết feature khác của pet-corner (banner, product, category...), sau Controller sẽ luôn có một bước Model đứng ra "nói chuyện" với MongoDB. Ở feature Liên hệ, bước đó **bị bỏ qua hoàn toàn** — xem giải thích chi tiết ở Phần 4 ngay dưới đây, vì đây chính là điểm đặc biệt nhất của feature này.

### Bước 7 — Kết quả đi ngược lại, từ backend ra tới màn hình

1. **Controller** (`submitContactForm`) gọi `res.status(200).json({ success: true, message: '...' })` → Express (nền tảng chạy backend) biến nó thành JSON thật và gửi ngược qua Internet.
2. **Router** không làm gì thêm ở chặng về — response cứ thế đi thẳng ra ngoài.
3. Response tới `contactApi.js` ở frontend — dòng `const response = await api.post(...)` giờ mới thực sự có giá trị, hàm trả về `response.data`, chính là `{ success: true, message: '...' }`.
4. `contact.tsx` nhận lại `response`, kiểm tra `response.success` — nếu `true`, gọi `message.success("Cảm ơn bạn đã gửi thông tin. Chúng tôi sẽ liên hệ lại sớm!")` (hiện 1 thông báo nổi góc màn hình) và `form.resetFields()` (xoá trắng form để khách gửi tiếp lần khác nếu muốn).
5. Nếu backend trả lỗi (400/500) hoặc mất mạng, `catch` ở `contact.tsx` bắt được, hiện `message.error(...)` báo khách thử lại.

Vậy là toàn bộ hành trình: **điền form → gửi request → qua vài "trạm" ở backend → backend tự gửi 1 email thật → không đụng tới database → trả "đã gửi thành công" → hiện thông báo lên màn hình** đã xong, thường mất từ dưới 1 giây tới vài giây (gửi email qua SMTP chậm hơn một chút so với đọc database).

---

## Phần 4 — Điểm đặc biệt: có Model sẵn nhưng KHÔNG được dùng tới

Khác với banner (có 2 luồng public/admin để so sánh), feature Liên hệ chỉ có **đúng 1 luồng duy nhất** (form public, không có trang admin nào quản lý liên hệ). Điểm đáng nói ở đây không phải là "luồng khác", mà là một điều bất thường trong chính luồng duy nhất này.

### Model đã được định nghĩa sẵn...

File: `backend/src/models/contact.model.ts`

```ts
interface IContact extends Document {
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: Date;
}

const contactSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model<IContact>('Contact', contactSchema);
```

Nói theo ví dụ nhà hàng ở Phần 1: đây là một "quyển sổ mẫu" đã được in sẵn, có đủ cột `name`, `email`, `phone`, `message`, `createdAt` — chỉ chờ ai đó cầm lên ghi và cất vào tủ hồ sơ (MongoDB, vào một collection tên `contacts`).

Giải thích từng field trong quyển sổ mẫu này:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra, NẾU có document được tạo) | "Số căn cước" duy nhất của 1 lượt liên hệ | `"6a57ca2411bb5ed75eb46fcb"` |
| `name` | Chữ (String), bắt buộc | Tên người gửi liên hệ | `"Nguyễn Văn A"` |
| `email` | Chữ (String), bắt buộc | Email người gửi, để liên hệ lại | `"a@gmail.com"` |
| `phone` | Chữ (String), bắt buộc | Số điện thoại người gửi | `"0912345678"` |
| `message` | Chữ (String), bắt buộc | Nội dung thắc mắc/góp ý | `"Tôi muốn hỏi về sản phẩm..."` |
| `createdAt` / `updatedAt` | Ngày giờ | Lúc liên hệ này được tạo/sửa (nhờ `{ timestamps: true }`) | `"2026-07-15T17:57:56.425Z"` |

### ...nhưng Controller không hề đụng tới nó

Mở lại `backend/src/controllers/contact.controllers.ts` (toàn bộ file, đã trích ở Bước 5): phần khai báo `import` ở đầu file chỉ có:

```ts
import { Request, Response } from 'express';
import * as nodemailer from 'nodemailer';
import dotenv from 'dotenv';
```

**Không có** dòng nào như `import ContactModel from '../models/contact.model.js'`. Và trong toàn bộ hàm `submitContactForm`, **không có** dòng nào kiểu `new ContactModel({...}).save()` hay `ContactModel.create({...})` (đây là cách thông thường một Controller sẽ dùng để "nhờ Model ghi dữ liệu vào database", y hệt cách banner gọi `bannerModel.find(...)`).

Nói cách khác: **quyển sổ mẫu (Model) đã in sẵn, nhưng chưa ai từng cầm nó lên ghi** — nó tồn tại trong code nhưng vô tác dụng ở luồng hiện tại.

### Vậy dữ liệu liên hệ hiện đang "nằm" ở đâu?

Chỉ nằm trong **1 email** được gửi tới `ngocthanhnt04@gmail.com` (địa chỉ bị viết cứng trong code, xem Bước 5). Sau khi email đó gửi xong:

- Không có bản ghi nào trong MongoDB.
- Không có trang admin nào (khác với banner, product...) để xem "danh sách các lượt khách đã liên hệ" — vì đơn giản là không có gì được lưu để mà hiển thị.
- Nếu email đó bị người nhận xoá, vào spam, hoặc việc gửi mail thất bại (sai `.env`, hết hạn mật khẩu ứng dụng...) — thông tin liên hệ đó **mất vĩnh viễn**, không có cách nào khôi phục lại từ hệ thống.

Đây là lý do tài liệu này không có mục "so sánh luồng admin vs luồng public" như banner — vì đơn giản là **không tồn tại luồng admin nào cho liên hệ cả**.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi các ô trong form liên hệ (thêm/bớt field) | `frontend_react/src/pages/contact/contact.tsx` |
| Đổi thông tin hiển thị (địa chỉ, sđt, giờ làm việc) ở trang liên hệ | `frontend_react/src/pages/contact/contact.tsx` (mảng `contactInfo`) |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/contactApi.js` |
| Đổi ai được phép gọi API liên hệ (ví dụ thêm giới hạn) | `backend/src/routes/contact.routes.ts` |
| Đổi nội dung email, đổi email người nhận (`ngocthanhnt04@gmail.com`) | `backend/src/controllers/contact.controllers.ts` |
| Đổi tài khoản email dùng để gửi (SMTP host/port/user/pass) | file `.env` của backend (biến `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`) |
| Đổi field lưu trữ liên hệ (nếu sau này có lưu database) | `backend/src/models/contact.model.ts` |
| **Muốn lưu lại lịch sử liên hệ vào database** (hiện chưa làm) | Cần: (1) trong `backend/src/controllers/contact.controllers.ts` thêm `import ContactModel from '../models/contact.model.js'`; (2) trước hoặc sau đoạn `transporter.sendMail(mailOptions)`, gọi `await ContactModel.create({ name, email, phone, message })` để ghi 1 document mới vào collection `contacts`; (3) muốn xem lại danh sách thì phải tự viết thêm 1 route `GET` mới (ví dụ `router.get('/contact', verifyToken, requireAdmin, getAllContacts)`) và 1 trang admin mới — hiện chưa có cả hai |

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin/gửi gì, ở đâu" — ví dụ `/api/v1/contact`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới/gửi đi, PATCH = sửa, DELETE = xoá. Liên hệ chỉ dùng `POST`.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (ví dụ `express.json()` giải mã dữ liệu request).
- **Status code (200, 400, 500)**: mã số 3 chữ số kèm response, nói tình trạng: 200 ổn, 400 request sai/thiếu dữ liệu, 500 lỗi phía server.
- **Schema**: bản thiết kế của Model, quy định 1 document có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB — ví dụ nếu có lưu, 1 lượt liên hệ sẽ là 1 document trong collection `contacts`.
- **Collection**: tập hợp nhiều document cùng loại, giống 1 sheet Excel — ví dụ collection `contacts` (hiện chưa có document nào vì không ai ghi vào).
- **SMTP**: giao thức chuẩn để gửi email qua Internet — `nodemailer` dùng giao thức này để gửi mail trong feature này.
- **Transporter (của nodemailer)**: đối tượng đại diện cho "người gửi email", được cấu hình sẵn tài khoản/mật khẩu email để gửi đi.
- **.env**: file cấu hình chứa các thông tin bí mật/riêng theo từng máy chủ (mật khẩu, tài khoản email...), không commit công khai lên git.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3–4)

```
┌──────────────┐      ┌────────────────┐      ┌──────────────────┐
│ contact.tsx  │ ───▶ │ contactApi.js  │ ───▶ │  index.ts (app)   │
│ (trình duyệt)│      │  (gói request)  │      │  cửa chính backend │
└──────────────┘      └────────────────┘      └────────┬──────────┘
                                                          │
                                        ┌─────────────────┘
                                        ▼
                             ┌────────────────────┐    ┌───────────────────────┐
                             │ contact.routes.ts    │ ─▶ │ contact.controllers.ts │
                             │ chỉ 1 route, public  │    │ soạn & gửi email       │
                             └────────────────────┘    └──────────┬─────────────┘
                                                                   ▼
                                                        ┌─────────────────────────┐
                                                        │ Email server (SMTP)      │
                                                        │ gửi tới ngocthanhnt04@... │
                                                        └──────────┬──────────────┘
                                                                   │
◀──────────────────────────────────────────────────────────────────┘
   { success: true } đi ngược lại đúng đường trên, tới contact.tsx → hiện thông báo "Cảm ơn bạn..."

(!) KHÔNG có bước nào đụng tới MongoDB — model contact.model.ts có tồn tại nhưng
    không được import/dùng ở đâu cả trong luồng này.
```

Tóm tắt 1 câu mỗi trạm:

1. **contact.tsx** — khách điền form, bấm gửi, antd tự kiểm tra dữ liệu hợp lệ trước.
2. **contactApi.js** — đóng gói yêu cầu thành 1 request `POST`, gửi tới `/api/v1/contact`.
3. **index.ts** — cửa chính backend, `express.json()` giải mã dữ liệu, chuyển cho `contactRouter`.
4. **contact.routes.ts** — chỉ có 1 route `POST /contact`, không cần đăng nhập (public), giao cho hàm `submitContactForm`.
5. **contact.controllers.ts** — kiểm tra đủ 4 field, dùng `nodemailer` soạn và gửi 1 email chứa thông tin khách tới `ngocthanhnt04@gmail.com`.
6. **(không có Model/database nào chạy ở đây)** — dù `contact.model.ts` tồn tại sẵn, Controller không import cũng không gọi tới nó.
7. **Đường về** — Controller trả `{ success: true, message: '...' }` → ra khỏi backend → `contactApi.js` → `contact.tsx` hiện thông báo thành công và reset form.

Toàn bộ hành trình này thường mất từ dưới 1 giây tới vài giây (chủ yếu do bước gửi email qua SMTP).
