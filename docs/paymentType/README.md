# PaymentType — Danh sách loại/phương thức thanh toán (trang quản trị) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin mở trang "Phương thức thanh toán" trong khu quản trị (admin) của pet-corner: xem danh sách, thêm mới, sửa, xoá một loại phương thức thanh toán (ví dụ "Thanh toán khi nhận hàng", "Thanh toán online qua VNPay"). Viết cho người **chưa biết gì về lập trình** — cách đọc và cấu trúc giống hệt `docs/banner/README.md`.

---

## Đính chính trước khi đọc — PaymentType KHÁC gì với "docs/payment"

Dự án này có **2 tài liệu rất dễ nhầm với nhau vì tên gần giống**, nhưng nói về 2 việc hoàn toàn khác nhau:

| | `docs/payment/README.md` (đã có sẵn) | Tài liệu này — `docs/paymentType` |
|---|---|---|
| Nói về gì | Luồng **xử lý một giao dịch thanh toán VNPay thật** — tạo link thanh toán, khách trả tiền thật trên VNPay, xác minh "chữ ký" khi VNPay báo kết quả về | Một **bảng danh sách CRUD đơn giản** — quản lý các "lựa chọn phương thức thanh toán" mà shop cho phép khách chọn khi đặt hàng (chỉ có tên + mô tả) |
| Có tiền thật đi qua không | Có — khách trả tiền thật (hoặc tiền test ở môi trường sandbox) trên cổng VNPay | Không — không có đồng nào được xử lý ở đây, chỉ là dữ liệu tĩnh kiểu "danh mục" |
| Có gọi dịch vụ bên ngoài (VNPay) không | Có, toàn bộ luồng xoay quanh việc gọi/nhận VNPay | Không, không hề gọi VNPay hay bất kỳ dịch vụ thanh toán nào |
| Model/Controller liên quan | `payment.controllers.ts`, không có "model" riêng (giao dịch không lưu thành 1 bảng riêng, chỉ cập nhật `payment_status` trên Order) | `paymentType.model.ts`, `paymentType.controllers.ts`, `paymentType.routes.ts` |
| Ví dụ dễ hình dung | Giống "máy cà thẻ thật đang thu tiền khách" | Giống "tờ menu liệt kê các hình thức trả tiền cửa hàng nhận" (menu không tự thu tiền, chỉ liệt kê cửa hàng nhận tiền mặt hay chuyển khoản) |

Nói ngắn gọn: **PaymentType không thanh toán được gì cả** — nó chỉ trả lời câu hỏi "shop này đang cho khách chọn những phương thức thanh toán nào" (một danh sách gồm tên + mô tả, admin tự thêm/sửa/xoá). Việc "tiền có thực sự được xử lý ra sao" là chuyện của `docs/payment` (luồng VNPay). Hai thứ này có **liên hệ gián tiếp** ở trang thanh toán của khách (xem Phần 4) nhưng là 2 hệ thống tách biệt, không dùng chung Model, Controller hay Route.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng (ở đây là admin) ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt của người dùng |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/payments` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, đi lấy nguyên liệu (dữ liệu), nấu (xử lý), rồi trả món (trả kết quả) |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một phương thức thanh toán trông như thế nào" (có field gì) và là thứ duy nhất được phép nói chuyện trực tiếp với tủ lạnh (database) |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu được lưu trữ thật sự, tồn tại lâu dài, không mất khi tắt máy |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Một cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để hai bên (backend/frontend) hiểu nhau |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ đọc trực tiếp database.** Nó luôn phải "hỏi" backend qua API, backend mới là bên duy nhất được lấy dữ liệu ra từ database rồi trả lại.

---

## Phần 2 — Bức tranh tổng thể (chỉ 1 dòng)

```
Trình duyệt (paymentType.tsx, trang admin)  →  gọi API  →  Backend (app→router→controller→model)  →  Database (MongoDB)
Database  →  trả dữ liệu  →  Model  →  Controller  →  Router  →  Backend  →  Trình duyệt  →  hiện bảng danh sách phương thức thanh toán
```

Bây giờ ta đi từng bước thật chi tiết, đúng theo thứ tự xảy ra trong thực tế.

---

## Phần 3 — Từng bước thật, từ lúc admin mở trang tới lúc thấy bảng danh sách

### Bước 1 — Admin mở trang "Phương thức thanh toán"

File: `frontend_react/src/admin/paymentType/paymentType.tsx`

Ngay khi trang này vừa hiện ra, React tự động chạy đoạn code sau **một lần duy nhất** (nhờ `useEffect`):

```tsx
useEffect(() => {
  fetchPaymentTypes();
}, []);
```

Hàm `fetchPaymentTypes` gọi:

```tsx
const response = await paymentTypeApi.getAllPayment();
const fetched = (response.data.data || []).map((p: any) => ({
  key: p._id,
  _id: p._id,
  payment_type_name: p.payment_type_name,
  description: p.description,
}));
setPaymentTypes(fetched);
setFilteredPaymentTypes(fetched);
```

`paymentTypeApi.getAllPayment()` chính là hành động "đưa đơn gọi món cho lễ tân" — trang admin đang xin backend: *"cho tôi TOÀN BỘ danh sách phương thức thanh toán"*. Sau khi có dữ liệu, `setPaymentTypes(...)` báo cho React vẽ lại bảng (`Table`) với dữ liệu thật.

### Bước 2 — `paymentTypeApi.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/paymentTypeApi.js`

```js
const paymentTypeApi = {
  getAllPayment: async () => {
    const response = await api.get("/v1/payments");
    return { data: response.data };
  },
  create: async (data) => {
    const response = await api.post("/v1/payments", data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/v1/payments/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/v1/payments/${id}`);
    return response.data;
  },
};
```

4 hàm tương ứng đúng 4 việc admin có thể làm: xem (`GET`, "chỉ xin dữ liệu"), tạo (`POST`, "tạo thêm 1 dòng mới"), sửa (`PATCH`, "sửa 1 phần dữ liệu"), xoá (`DELETE`, "xoá hẳn 1 dòng"). Lưu ý địa chỉ API là `/v1/payments` (số nhiều, không phải `/v1/payment-types`) — tên route trong code được đặt hơi khác tên feature, nhưng chức năng của nó vẫn đúng là quản lý "loại thanh toán", không liên quan gì tới việc xử lý tiền của `docs/payment`.

### Bước 3 — Request "vào cửa" backend qua `index.ts`

File: `backend/src/index.ts`, dòng đăng ký router (tương tự cách đăng ký `bannerRouter`, `deliveryRouter`...):

```ts
app.use('/api/v1', paymentTypeRouter);
```

Đây là **cửa chính** của cả backend — mọi request đều qua đây trước (chạy qua các "trạm kiểm tra" chung như `cors`, `express.json()`, `logger('dev')`...), rồi được chuyển cho đúng router theo tiền tố URL `/api/v1`.

### Bước 4 — Router (lễ tân) khớp đúng địa chỉ và chuyển tiếp

File: `backend/src/routes/paymentType.routes.ts`

```ts
paymentTypeRouter.get('/payments', getAllPayments);
paymentTypeRouter.get('/payments/:id', getPaymentById);
paymentTypeRouter.post('/payments', verifyToken, requireAdmin, insertPayment);
paymentTypeRouter.patch('/payments/:id', verifyToken, requireAdmin, updatePayment);
paymentTypeRouter.delete('/payments/:id', verifyToken, requireAdmin, deletePayments);
```

Request `/api/v1/payments` sau khi bỏ tiền tố `/api/v1` còn lại `/payments`, khớp đúng dòng đầu tiên → giao việc cho hàm `getAllPayments`.

Giống các feature CRUD khác trong dự án: route XEM (`GET`) không cần đăng nhập — ai cũng gọi được (lý do: trang thanh toán của khách khi đặt hàng cũng cần đọc danh sách này để hiện các lựa chọn thanh toán, xem Phần 4). Route TẠO/SỬA/XOÁ đều bắt qua 2 "trạm kiểm tra":

- `verifyToken` (`backend/src/middlewares/verifyToken.ts`) — đọc token đăng nhập (JWT) trong request, không hợp lệ thì chặn lại với lỗi `401`.
- `requireAdmin` (`backend/src/middlewares/protectRoute.ts`) — kiểm tiếp user đó có role `admin` không, không phải thì chặn lại với lỗi `403`.

### Bước 5 — Controller (đầu bếp) thực sự "nấu"

File: `backend/src/controllers/paymentType.controllers.ts`

Đáng chú ý ngay dòng đầu file:

```ts
import paymentModel from '../models/paymentType.model.js'; // Assuming there's a Payment model
```

Tên biến import là `paymentModel` (không phải `paymentTypeModel`) và có ghi chú `// Assuming there's a Payment model` — đây là dấu vết cho thấy code này ban đầu có thể được viết/copy vội, đặt tên biến hơi lẫn giữa "payment" (thanh toán, giao dịch) và "payment type" (loại thanh toán). Về mặt chức năng nó vẫn trỏ đúng vào `paymentType.model.ts`, không ảnh hưởng gì tới việc chạy đúng — chỉ là tên gọi dễ gây nhầm khi đọc code, đúng như đã "đính chính" ở đầu tài liệu.

Hàm chạy khi mở trang là `getAllPayments`:

```ts
export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const payments = await paymentModel.find();
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
```

Nó nhờ Model tìm TẤT CẢ phương thức thanh toán (không lọc gì), gói kết quả thành `{ success: true, count, data: [...] }`.

Hàm tạo mới (`insertPayment`) kiểm tra dữ liệu bắt buộc trước khi lưu:

```ts
const { payment_type_name, description } = req.body;
if (!payment_type_name || !description) {
  res.status(400).json({
    success: false,
    message: 'Payment type name is required'
  });
  return;
}
const payment = new paymentModel({ payment_type_name, description });
const savedPayment = await payment.save();
```

Đáng chú ý: thông báo lỗi ghi `'Payment type name is required'` (chỉ nhắc thiếu tên), nhưng điều kiện `if` thật ra bắt buộc CẢ `description` cũng phải có — nếu admin để trống mô tả, request vẫn bị chặn với thông báo dễ hiểu lầm là "chỉ thiếu tên". Đây là 1 điểm không khớp nhỏ giữa message và logic thật, không phải lỗi nghiêm trọng nhưng nên biết khi đọc code.

Hàm sửa (`updatePayment`) dùng `findByIdAndUpdate(..., { new: true, runValidators: true })` — trả về bản ghi MỚI sau khi sửa, và bắt kiểm tra lại ràng buộc schema trước khi lưu. Hàm xoá (`deletePayments`) dùng `findByIdAndDelete` — xoá thẳng khỏi database, không giữ lại bản sao.

### Bước 6 — Model (công thức + tủ lạnh) — nơi thật sự chạm vào database

File: `backend/src/models/paymentType.model.ts`

```ts
const paymentTypeSchema: Schema<IPaymentType> = new Schema<IPaymentType>(
  {
    payment_type_name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: false,
      default: ''
    }
  },
  { timestamps: true }
);

const PaymentType = mongoose.models.paymentType || mongoose.model('paymentType', paymentTypeSchema);
```

Giải thích **từng field**, ý nghĩa thật, kiểu giá trị thật:

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `_id` | Chuỗi ký tự (tự MongoDB sinh ra, hoặc có thể bị ép thành 1 giá trị cố định — xem lưu ý bên dưới) | "Số căn cước" duy nhất của phương thức thanh toán đó — đây chính là cái `payment_type_id`/`payment_typeID` mà Order tham chiếu tới khi khách chọn phương thức này lúc đặt hàng | `"67d67442aeb5082f01074c28"` |
| `payment_type_name` | Chữ (String), bắt buộc | Tên phương thức, hiển thị cho admin và cho khách chọn ở trang thanh toán | `"Thanh toán khi nhận hàng"` |
| `description` | Chữ (String), khai báo `required: false` trong Model nhưng Controller lại bắt buộc phải có (xem Bước 5) | Mô tả thêm cho phương thức | `"Trả tiền mặt cho shipper khi nhận hàng (COD)"` |
| `createdAt` / `updatedAt` | Ngày giờ, tự MongoDB điền (nhờ `{ timestamps: true }`) | Bản ghi này được tạo/sửa lúc nào | `"2026-07-15T17:57:56.425Z"` |

Model này **rất đơn giản** — chỉ 2 field thật sự (`payment_type_name`, `description`), không có field nào như "số tài khoản", "mã giao dịch", "trạng thái thanh toán"... Đây chính là bằng chứng cụ thể cho thấy PaymentType chỉ là danh mục tĩnh, không lưu bất kỳ thông tin giao dịch nào — hoàn toàn khác với luồng VNPay ở `docs/payment` (nơi có `vnp_TxnRef`, `vnp_SecureHash`, `payment_status` được cập nhật thẳng trên Order).

**Lưu ý quan trọng — `_id` của mục "COD" bị hardcode (gán cứng) ở nhiều nơi:**

File `backend/src/scripts/seedPaymentTypes.ts` (script chạy 1 lần để tạo dữ liệu mẫu ban đầu) có đoạn:

```ts
// _id của "Thanh toán khi nhận hàng" được cố định (khớp đúng chuỗi frontend đang hardcode
// so sánh ở payment.tsx: `selectedPayment === "67d67442aeb5082f01074c28"`). Nếu seed với _id
// tự sinh khác, so sánh đó sẽ luôn sai và COD sẽ bị coi là thanh toán online (VNPay).
const COD_ID = '67d67442aeb5082f01074c28';

await paymentTypeModel.create({
  _id: new mongoose.Types.ObjectId(COD_ID),
  payment_type_name: 'Thanh toán khi nhận hàng',
  description: 'Trả tiền mặt cho shipper khi nhận hàng (COD)'
});
```

Nghĩa là: bình thường `_id` do MongoDB tự sinh ngẫu nhiên, nhưng riêng bản ghi "Thanh toán khi nhận hàng" (COD) được ép mang đúng `_id` cố định này — vì ở trang thanh toán của khách (`frontend_react/src/pages/payment/payment.tsx`), code kiểm tra thẳng chuỗi này để quyết định rẽ nhánh COD hay VNPay (xem Phần 4). Vì lý do này, giao diện admin (`paymentType.tsx`) có gắn cảnh báo ngay đầu trang:

```tsx
<Alert
  className="mb-4"
  type="warning"
  showIcon
  message="Lưu ý"
  description={`Mục "Thanh toán khi nhận hàng" (COD) đang được code ở trang thanh toán nhận diện qua _id cố định, không nên xoá — chỉ nên sửa tên/mô tả nếu cần.`}
/>
```

và khi admin bấm xoá đúng bản ghi này, hộp thoại xác nhận đổi nội dung cảnh báo nặng hơn:

```tsx
const COD_ID = "67d67442aeb5082f01074c28";
...
content:
  record._id === COD_ID
    ? `"${record.payment_type_name}" đang được hệ thống dùng để nhận biết đơn hàng thanh toán khi nhận hàng (COD). Xoá mục này có thể làm sai logic thanh toán ở trang checkout. Bạn vẫn muốn xoá?`
    : `Bạn có chắc chắn muốn xóa "${record.payment_type_name}"?`,
```

Điều này KHÔNG ngăn admin xoá được (không có khoá cứng ở backend), chỉ là lời cảnh báo ở giao diện — nếu admin vẫn xoá, tính năng thanh toán COD trên trang khách hàng sẽ hỏng vì không còn dòng nào khớp `_id` đó nữa.

Khi Controller gọi `paymentModel.find()`, Model dịch câu đó thành câu lệnh MongoDB hiểu được, lấy toàn bộ document trong collection `paymentType`, trả về một mảng.

### Bước 7 — Kết quả đi ngược lại, từ database ra tới màn hình

1. **Model** nhận kết quả từ MongoDB → trả về cho **Controller** dưới dạng mảng JavaScript.
2. **Controller** (`getAllPayments`) gói mảng đó vào `{ success: true, count, data: [...] }`, gọi `res.json(...)` → Express biến nó thành JSON thật và gửi ngược qua Internet.
3. **Router** không làm gì thêm ở chặng về.
4. Response tới `paymentTypeApi.js` — `response.data` chính là JSON vừa nhận.
5. `paymentType.tsx` nhận `response.data.data`, map lại thành mảng gọn hơn, gọi `setPaymentTypes(fetched)` và `setFilteredPaymentTypes(fetched)`.
6. React vẽ lại `Table` (Ant Design), mỗi dòng là 1 phương thức thanh toán với 2 cột dữ liệu (`payment_type_name`, `description`) và cột "Tính năng" (nút sửa/xoá).

Vậy là toàn bộ hành trình xem danh sách đã xong.

---

## Phần 4 — Luồng khi admin TẠO MỚI / SỬA / XOÁ, và mối liên hệ với trang thanh toán của khách

Về cơ bản đi qua đúng các "trạm" giống Phần 3, chỉ khác vài điểm:

1. **Bắt buộc đăng nhập admin** — 3 route tạo/sửa/xoá đều có `verifyToken, requireAdmin` chặn trước Controller; route xem thì không.
2. **Không có upload ảnh, không có enum trạng thái** — khác với banner (có ảnh) và delivery (có `status` dạng enum), PaymentType chỉ có 2 ô nhập chữ (`payment_type_name`, `description`) trong form, cả 2 đều `required: true` phía giao diện:
   ```tsx
   <Form.Item label="Tên phương thức" name="payment_type_name" rules={[{ required: true, ... }]}>
     <Input placeholder="Ví dụ: Thanh toán khi nhận hàng" />
   </Form.Item>
   <Form.Item label="Mô tả" name="description" rules={[{ required: true, ... }]}>
     <Input.TextArea rows={2} />
   </Form.Item>
   ```
3. **Sửa/xoá xong load lại toàn bộ danh sách** — giống delivery, sau khi backend trả thành công, `paymentType.tsx` gọi lại `fetchPaymentTypes()` để đồng bộ với dữ liệu thật trong database.

**Mối liên hệ với trang thanh toán của khách** (`frontend_react/src/pages/payment/payment.tsx`) — đây là chỗ duy nhất PaymentType "chạm" tới luồng thanh toán thật, nhưng vẫn KHÔNG xử lý giao dịch, chỉ cung cấp danh sách lựa chọn:

```tsx
const paymentResponse = await paymentTypeApi.getAllPayment();
const paymentMethodsData: PaymentType[] = ...
setPaymentMethods(paymentMethodsData);
if (paymentMethodsData.length > 0) {
  setSelectedPayment(paymentMethodsData[0]._id);
}
```

Trang thanh toán gọi ĐÚNG API `getAllPayment()` này (dùng chung với trang admin) để hiện danh sách phương thức cho khách chọn. Khi khách bấm đặt hàng, code rẽ nhánh dựa vào `_id` khách vừa chọn có trùng `COD_ID` hay không:

```tsx
if (selectedPayment === "67d67442aeb5082f01074c28") {
  // Thanh toán khi nhận hàng
  message.success("Đơn hàng của bạn đã được tạo thành công!");
  navigate("/userprofile/orders");
} else {
  // Thanh toán online
  const paymentData = { orderId: order._id, amount: totalAmount, ... };
  await handlePayment(paymentData); // đây mới là lúc gọi sang luồng VNPay thật, xem docs/payment
}
```

Nói cách khác: PaymentType chỉ trả lời "khách vừa chọn cái nào trong danh sách" (một chuỗi `_id`); việc "cái đó là COD (không cần gọi gì thêm) hay là online (phải sang luồng VNPay ở `docs/payment`)" là do trang thanh toán tự so sánh `_id` đó, không phải do PaymentType Controller/Model quyết định. Đây cũng là lý do PaymentType để trạng thái, mô tả tuỳ ý (không enum) nhưng riêng `_id` của COD lại không được đổi/xoá tuỳ tiện.

Ngoài ra, Order (đơn hàng, tài liệu riêng) lưu lại field `payment_typeID` (xem đoạn `orderData` ở trên) — đây chính là cách 1 đơn hàng "tham chiếu" tới đúng phương thức thanh toán khách đã chọn trong bảng PaymentType này.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi trường dữ liệu payment type (thêm field mới) | `backend/src/models/paymentType.model.ts` + `backend/src/interfaces/paymentType.interface.ts` |
| Đổi logic thêm/sửa/xoá/lấy danh sách payment type | `backend/src/controllers/paymentType.controllers.ts` |
| Đổi địa chỉ API, đổi ai được gọi API nào | `backend/src/routes/paymentType.routes.ts` |
| Đổi giao diện bảng + form thêm/sửa phương thức thanh toán ở admin | `frontend_react/src/admin/paymentType/paymentType.tsx` |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/paymentTypeApi.js` |
| Đổi dữ liệu mẫu ban đầu (bao gồm `_id` cố định của COD) | `backend/src/scripts/seedPaymentTypes.ts` |
| Đổi cách trang thanh toán của khách rẽ nhánh COD/online dựa trên `_id` | `frontend_react/src/pages/payment/payment.tsx` (biến `COD_ID`, hàm `processCheckout`) |
| Đổi luồng xử lý thanh toán VNPay thật (tạo link, xác minh chữ ký) | Xem `docs/payment/README.md` — KHÔNG nằm trong phạm vi tài liệu này |
| Đổi đường dẫn trang admin (URL, menu điều hướng) | `frontend_react/src/App.tsx` (route `payment-types`), `frontend_react/src/components/layout/AdminLayout.tsx` |

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/payments`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, POST = tạo mới, PATCH = sửa, DELETE = xoá.
- **Middleware**: một hàm được chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn...) — ở đây là `verifyToken` và `requireAdmin`.
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response — 200 ổn, 400 request sai/thiếu dữ liệu, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy, 500 lỗi server.
- **JWT token**: chuỗi ký tự dài sinh ra lúc đăng nhập thành công, dùng như "vé" để chứng minh "tôi đã đăng nhập, tôi là ai".
- **Schema**: bản thiết kế của Model, quy định 1 document có field gì, kiểu gì.
- **Document**: 1 "dòng dữ liệu" trong MongoDB — ví dụ 1 phương thức thanh toán cụ thể là 1 document trong collection `paymentType`.
- **Collection**: tập hợp nhiều document cùng loại — collection `paymentType` chứa tất cả phương thức thanh toán.
- **hardcode (gán cứng)**: việc viết thẳng 1 giá trị cố định vào code (ví dụ chuỗi `"67d67442aeb5082f01074c28"`) thay vì tra cứu linh động — rủi ro là nếu giá trị thật trong database đổi/mất, code vẫn so sánh với giá trị cũ và sẽ chạy sai mà không báo lỗi rõ ràng.
- **Seed (dữ liệu mẫu)**: một đoạn script chạy 1 lần để tạo sẵn vài dòng dữ liệu ban đầu trong database (ví dụ 2 phương thức thanh toán mẫu), thường dùng khi mới cài đặt hệ thống hoặc set up môi trường test.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│  paymentType.tsx   │ ─▶ │ paymentTypeApi.js  │ ─▶ │  index.ts (app)   │
│ (trang admin)       │    │ (gói request)       │    │  cửa chính backend│
└───────────────────┘    └───────────────────┘    └────────┬──────────┘

┌──────────────────────────────────────────────────────────┘
▼
┌─────────────────────────┐  ┌───────────────────────────┐  ┌────────────────────┐
│ paymentType.routes.ts     │▶│ paymentType.controllers.ts │▶│ paymentType.model.ts│
│ khớp URL, kiểm quyền        │  │ xử lý logic, gọi Model      │  │ nói chuyện với DB    │
└─────────────────────────┘  └───────────────────────────┘  └─────────┬──────────┘
                                                                       ▼
                                                            ┌────────────────────┐
                                                            │ MongoDB (database)  │
                                                            │ collection          │
                                                            │ "paymentType"       │
                                                            └─────────┬──────────┘
                                                                       │
◀──────────────────────────────────────────────────────────────────────┘
   dữ liệu đi ngược lại đúng đường trên, tới paymentType.tsx → setPaymentTypes() → hiện lên Table
```

Tóm tắt 1 câu mỗi trạm:

1. **paymentType.tsx** — trang admin vừa mở, tự gọi xin toàn bộ danh sách phương thức thanh toán.
2. **paymentTypeApi.js** — đóng gói yêu cầu thành request `GET/POST/PATCH/DELETE` tương ứng, gửi tới địa chỉ `/api/v1/payments`.
3. **index.ts** — cửa chính backend, request nào cũng qua đây trước, chuyển cho đúng router theo tiền tố URL.
4. **paymentType.routes.ts** — dò đúng địa chỉ, XEM thì cho qua tự do, còn TẠO/SỬA/XOÁ thì bắt qua 2 trạm `verifyToken` + `requireAdmin`.
5. **paymentType.controllers.ts** — mỗi hàm lo đúng 1 việc (lấy tất cả / lấy 1 / tạo / sửa / xoá), có kiểm tra tên + mô tả bắt buộc khi tạo mới, gói kết quả thành `{ success, data }`.
6. **paymentType.model.ts** — dịch yêu cầu thành câu lệnh MongoDB hiểu được, lấy đúng field (`payment_type_name`, `description`).
7. **MongoDB** — tìm/thêm/sửa/xoá trong collection `paymentType`, trả kết quả ngược lên.
8. **Đường về** — kết quả đi ngược lại y chỗ vừa đi qua, React vẽ lại `Table` với dữ liệu thật, kèm thông báo thành công/lỗi.
9. **Nhắc lại điều quan trọng nhất**: đây chỉ là danh mục lựa chọn (tên + mô tả); việc xử lý tiền thật (tạo link VNPay, xác minh giao dịch) là chuyện hoàn toàn khác, nằm ở `docs/payment/README.md`.

Toàn bộ hành trình này thường chỉ mất vài chục tới vài trăm mili-giây.
