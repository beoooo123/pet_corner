# Revenue (báo cáo doanh thu) — Giải thích luồng dữ liệu (dành cho người chưa từng học lập trình)

Tài liệu này giải thích **chính xác từng bước** chuyện gì xảy ra khi admin mở trang "Thống kê doanh thu" và xem biểu đồ/bảng doanh thu theo tháng. Viết cho người **chưa biết gì về lập trình**, nên phần đầu sẽ giải thích vài khái niệm nền tảng trước, sau đó đi vào từng file code thật, theo đúng thứ tự nó chạy.

Khác với Dashboard (trang gom nhiều API có sẵn), **Revenue có Router → Controller → Model → Database thật của riêng nó**, giống banner — nên tài liệu này sẽ đi hết một hành trình đầy đủ, và trọng tâm là giải thích **chính xác công thức tính doanh thu**.

---

## Phần 1 — Vài khái niệm cần biết trước

Ví bạn hình dung cả hệ thống như một **nhà hàng**:

| Khái niệm lập trình | Ví trong nhà hàng | Giải thích |
|---|---|---|
| **Frontend** (trang web bạn thấy) | Khách hàng ngồi ở bàn, xem menu | Cái mà người dùng nhìn thấy và bấm vào — chạy trên trình duyệt (Chrome, Cốc Cốc...) của người dùng |
| **Backend** (server) | Nhà bếp + lễ tân | Chương trình chạy trên một máy chủ ở xa, không ai nhìn thấy, chỉ nhận yêu cầu và trả kết quả |
| **API** | Tờ menu + cách gọi món | Một "địa chỉ" cố định mà frontend gọi tới để xin dữ liệu, ví dụ `/api/v1/revenue` |
| **Request** (yêu cầu) | Đơn gọi món khách đưa cho lễ tân | Frontend gửi một "đơn xin dữ liệu" qua Internet tới backend, kèm theo "yêu cầu cụ thể" (ví dụ: xem doanh thu từ ngày nào tới ngày nào) |
| **Response** (phản hồi) | Món ăn bếp trả ra bàn | Backend gửi ngược dữ liệu về cho frontend |
| **Router** (bộ định tuyến) | Lễ tân đọc đơn, biết phải đưa cho đúng đầu bếp nào | Đoạn code quyết định: request này đi tới đúng URL nào thì giao cho ai xử lý |
| **Controller** | Đầu bếp | Đoạn code thực sự "làm việc": đọc yêu cầu, đi lấy nguyên liệu (dữ liệu), nấu (tính toán, cộng dồn), rồi trả món (trả kết quả) |
| **Model** | Công thức nấu + tủ lạnh chứa nguyên liệu | Định nghĩa "một đơn hàng/một dòng chi tiết đơn trông như thế nào" và là thứ duy nhất được phép nói chuyện trực tiếp với tủ lạnh (database) |
| **Database (MongoDB)** | Tủ lạnh/kho chứa nguyên liệu thật | Nơi dữ liệu (đơn hàng, chi tiết đơn, lịch hẹn spa...) được lưu trữ thật sự |
| **JSON** | Cách viết món ăn ra giấy để giao cho khách | Một cách viết dữ liệu bằng chữ và số theo khuôn `{ "tên": "giá trị" }` để hai bên (backend/frontend) hiểu nhau |
| **Query string / tham số lọc** | Ghi chú thêm trên đơn gọi món ("cho tôi món này nhưng ít cay") | Thông tin đi kèm request để nói rõ "tôi muốn xem khoảng nào" — ở đây là `from` (từ ngày) và `to` (đến ngày) |

Điểm quan trọng nhất cần nhớ: **Frontend không bao giờ tự cộng doanh thu từ dữ liệu thô.** Toàn bộ phép cộng, gom nhóm theo tháng, lọc đơn hợp lệ đều làm ở **backend** — frontend (trang Revenue) chỉ xin sẵn kết quả đã tính xong và vẽ biểu đồ/bảng.

---

## Phần 2 — Bức tranh tổng thể (chỉ 1 dòng)

```
Trình duyệt (revenue.tsx)  →  gọi API kèm khoảng ngày (from, to)  →  Backend (index.ts→revenue.routes.ts→revenue.controllers.ts→order.model.ts + orderdetail.model.ts)  →  MongoDB
MongoDB  →  trả đơn hàng + chi tiết đơn thoả điều kiện  →  Controller CỘNG DỒN theo tháng  →  trả về mảng doanh thu từng tháng  →  Router  →  Backend  →  Trình duyệt  →  vẽ biểu đồ + bảng
```

Bây giờ ta đi từng bước thật chi tiết, đúng theo thứ tự xảy ra trong thực tế.

---

## Phần 3 — Từng bước thật, từ lúc mở trang Revenue tới lúc thấy biểu đồ

### Bước 1 — Người dùng (admin) mở trang Thống kê doanh thu

File: `frontend_react/src/admin/revenue/revenue.tsx`

Ngay khi trang vừa mở, nó tự chọn sẵn một khoảng thời gian mặc định là "3 tháng gần nhất" rồi gọi hàm xin dữ liệu:

```tsx
const [chartLimit, setChartLimit] = useState(3); // Default to 3 months

const getDefaultRange = (limit: number): [dayjs.Dayjs, dayjs.Dayjs] => {
  return [dayjs().subtract(limit, 'months').startOf('month'), dayjs()];
};

const fetchRevenue = debounce(async (filters: any) => {
  setLoading(true);
  try {
    const params: any = { type: 'monthly' }; // Force monthly type
    if (filters.range) {
      params.from = filters.range[0].format('YYYY-MM-DD');
      params.to = filters.range[1].format('YYYY-MM-DD');
    }
    const res = await revenueApi.getDetails(params);
    setData(res.data.data || []);
  } catch (err: any) {
    message.error(err.message);
  } finally {
    setLoading(false);
  }
}, 500);

useEffect(() => {
  form.setFieldsValue(initialFilters);
  fetchRevenue(initialFilters);
}, []);
```

Admin cũng có thể tự chọn lại khoảng ngày bằng ô "Khoảng thời gian" (`RangePicker`), với vài luật kiểm tra ngay tại frontend trước khi gửi đi (`onFinish`): ngày kết thúc không được ở tương lai, ngày bắt đầu phải trong 2 năm gần nhất, khoảng chọn phải tối thiểu 1 tháng. Đây là bước "lễ tân tự soát lại đơn trước khi đưa vào bếp" — kiểm tra sơ bộ ở frontend cho nhanh, nhưng **backend vẫn kiểm tra lại lần nữa** (xem Bước 5) vì không được tin tưởng tuyệt đối dữ liệu gửi từ trình duyệt.

`fetchRevenue` gọi `revenueApi.getDetails(params)` — đây là hành động "đưa đơn gọi món cho lễ tân": *"cho tôi doanh thu theo tháng, từ ngày `from` tới ngày `to`"*.

### Bước 2 — `revenueAPI.js` gói yêu cầu lại và gửi đi

File: `frontend_react/src/api/revenueAPI.js`

```js
const revenueApi = {
  getDetails: async (params) => {
    try {
      const response = await api.get('/v1/revenue', { params });
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy chi tiết doanh thu');
    }
  },
};
```

Dòng này gửi một request kiểu `GET` (chỉ xin dữ liệu, không thay đổi gì) tới địa chỉ `/v1/revenue`, kèm theo `params` (chính là `from`, `to`, `type`) được gắn vào cuối URL dạng `?from=2026-04-01&to=2026-07-16&type=monthly`. `api` là công cụ có sẵn (`axios`) tự nối với địa chỉ gốc backend để ra URL đầy đủ.

### Bước 3 — Request "vào cửa" backend, router khớp địa chỉ

File: `backend/src/index.ts` (đăng ký router) và `backend/src/routes/revenue.routes.ts` (khớp URL)

```ts
// index.ts
import revenueRouter from './routes/revenue.routes.js';
...
app.use('/api/v1', revenueRouter);
```

```ts
// revenue.routes.ts
import { Router } from 'express';
import { getRevenue } from '../controllers/revenue.controllers.js';

const router = Router();
router.get('/revenue', getRevenue);
export default router;
```

Request `/api/v1/revenue` đi qua "cửa chính" `index.ts` (mọi request đều phải qua đây trước — xem middleware CORS, đọc JSON... đã được thiết lập chung cho cả backend), được chuyển cho `revenueRouter`, router này khớp đúng `/revenue` và giao việc cho hàm `getRevenue`.

**Lưu ý quan trọng, nói thật đúng những gì thấy trong code:** route `router.get('/revenue', getRevenue)` **không có** `verifyToken`/`requireAdmin` đứng trước (khác với banner, nơi các route ghi dữ liệu luôn có 2 "trạm gác" này). Nghĩa là về mặt kỹ thuật, API doanh thu này không tự nó chặn người chưa đăng nhập ở tầng backend — việc chỉ admin mới thấy trang Revenue hiện đang chỉ được đảm bảo ở tầng giao diện (trang admin nằm trong khu vực quản trị của frontend), không phải ở chính API này.

### Bước 4 — Controller (đầu bếp) kiểm tra đầu vào

File: `backend/src/controllers/revenue.controllers.ts`, hàm `getRevenue`

```ts
const { from, to } = req.query;

if (!from || !to) {
  res.status(400).json({ success: false, message: 'Thiếu tham số bắt buộc: from và to' });
  return;
}

const startDate = dayjs(from as string);
const endDate = dayjs(to as string);

if (!startDate.isValid() || !endDate.isValid()) {
  res.status(400).json({ success: false, message: 'Định dạng ngày không hợp lệ cho from hoặc to' });
  return;
}

if (endDate.isAfter(dayjs())) {
  res.status(400).json({ success: false, message: 'Ngày kết thúc không thể ở tương lai' });
  return;
}

if (startDate.isBefore(dayjs().subtract(2, 'years'))) {
  res.status(400).json({ success: false, message: 'Ngày bắt đầu phải nằm trong 2 năm gần nhất' });
  return;
}

if (endDate.diff(startDate, 'month') < 1) {
  res.status(400).json({ success: false, message: 'Khoảng thời gian phải ít nhất 1 tháng' });
  return;
}

const adjustedStartDate = startDate.startOf('month').toDate();
const adjustedEndDate = endDate.endOf('month').toDate();
```

Nói bằng lời: Controller **soát lại từ đầu**, y hệt các luật đã kiểm ở frontend (Bước 1) — không tin frontend đã kiểm đúng, backend phải tự kiểm lại: phải có đủ `from`/`to`, ngày phải hợp lệ, không được chọn ngày tương lai, không được lùi quá 2 năm, khoảng chọn tối thiểu 1 tháng. Nếu sai bất kỳ điều nào, trả về mã lỗi `400` ("request sai") kèm lý do bằng tiếng Việt.

Sau đó nó "làm tròn" khoảng ngày: dù admin chọn giữa chừng tháng (ví dụ 15/4), nó vẫn kéo về **đầu tháng 4** (`startOf('month')`) và **cuối tháng cuối cùng** (`endOf('month')`) để đảm bảo mỗi tháng trong khoảng chọn đều được tính đầy đủ, không bị cắt nửa tháng.

### Bước 5 — Công thức tính doanh thu THẬT (phần quan trọng nhất)

Vẫn trong `getRevenue`, Controller lấy dữ liệu từ **2 nguồn khác nhau** rồi cộng lại: doanh thu bán hàng (đơn mua sản phẩm) và doanh thu dịch vụ (đặt lịch spa/grooming).

**5.1. Doanh thu bán hàng — lấy từ Model `order`:**

```ts
const matchOrder: any = {
  payment_status: { $in: ['PAID', 'CASH_ON_DELIVERY'], $exists: true, $type: 'string' }, // Chỉ lấy PAID hoặc CASH_ON_DELIVERY
  status: { $ne: 'CANCELLED' }, // Loại bỏ CANCELLED
  createdAt: { $gte: adjustedStartDate, $lte: adjustedEndDate }
};

const orders = await orderModel.find(matchOrder).lean();
const orderRevenueMap: Record<string, number> = {};

for (const order of orders) {
  const date = formatDate(order.createdAt);
  const totalOrderRevenue = order.total_price || 0; // Chỉ lấy total_price, không cộng tiền ship
  orderRevenueMap[date] = (orderRevenueMap[date] || 0) + totalOrderRevenue;
}
```

Nói bằng lời — **điều kiện một đơn hàng được TÍNH vào doanh thu**:
- `payment_status` (trạng thái thanh toán) phải là `PAID` (đã thanh toán online) **hoặc** `CASH_ON_DELIVERY` (thanh toán khi nhận hàng) — đơn còn `PENDING` (chưa thanh toán) thì **không được tính**.
- `status` (trạng thái đơn) phải **khác** `CANCELLED` (đã huỷ) — đơn bị huỷ dù đã thanh toán hay chưa cũng **không được tính** vào doanh thu.
- `createdAt` (ngày tạo đơn) phải nằm trong khoảng ngày admin chọn (đã làm tròn theo tháng ở Bước 4).

Với mỗi đơn hợp lệ, số tiền được cộng vào là `order.total_price` — **chỉ tổng tiền hàng, không cộng thêm phí ship** (comment ngay trong code ghi rõ "không cộng tiền ship"). Số tiền được cộng dồn theo **tháng tạo đơn** (hàm `formatDate` bên dưới nhóm theo `YYYY-MM`).

**5.2. Doanh thu dịch vụ (spa/grooming) — lấy từ Model `orderDetail`:**

```ts
const matchOrderDetail: any = {
  updatedAt: { $gte: adjustedStartDate, $lte: adjustedEndDate }
};

const orderDetails = await orderDetailModel
  .find(matchOrderDetail)
  .populate({ path: 'orderId', match: { bookingStatus: BookingStatus.COMPLETED } })
  .lean();

const bookingRevenueMap: Record<string, number> = {};

for (const detail of orderDetails) {
  if (!detail.orderId) continue;
  const date = formatDate(detail.updatedAt);
  bookingRevenueMap[date] = (bookingRevenueMap[date] || 0) + detail.realPrice;
}
```

Nói bằng lời — **điều kiện một lượt đặt dịch vụ được tính vào doanh thu dịch vụ**:
- Dòng chi tiết đơn (`orderDetail`) có `updatedAt` (lần cập nhật gần nhất) nằm trong khoảng ngày đã chọn.
- Đơn hàng cha của nó (`orderId`) phải có `bookingStatus` (trạng thái lịch hẹn) là `COMPLETED` ("đã hoàn thành buổi dịch vụ") — dòng `.populate({ path: 'orderId', match: {...} })` nghĩa là: nếu đơn cha không thoả điều kiện này, `detail.orderId` sẽ là `null`/rỗng, và dòng `if (!detail.orderId) continue;` sẽ **bỏ qua** dòng đó, không tính vào doanh thu. Nói cách khác: lịch hẹn đang chờ, đang thực hiện, hay đã huỷ đều **không được tính**, chỉ tính lịch **đã hoàn thành**.
- Số tiền cộng vào là `detail.realPrice` (giá thực tế của dịch vụ đó, ví dụ giá tắm chải tính theo cân nặng thú cưng thực tế, không phải giá niêm yết ban đầu).
- Cộng dồn theo **tháng cập nhật lần cuối** của dòng chi tiết đơn đó (`updatedAt`, không phải ngày tạo).

**5.3. Nhóm theo tháng, có tính múi giờ Việt Nam:**

```ts
const formatDate = (date: Date): string => {
  const adjustedDate = dayjs(date).tz('Asia/Ho_Chi_Minh');
  const year = adjustedDate.year();
  const month = String(adjustedDate.month() + 1).padStart(2, '0');
  return `${year}-${month}`;
};
```

Trước khi xác định "đơn này thuộc tháng nào", ngày giờ lưu trong database (thường theo giờ UTC) được đổi sang **giờ Việt Nam** (`Asia/Ho_Chi_Minh`) trước — để một đơn tạo lúc 23h30 giờ Việt Nam (nhưng có thể đã sang ngày hôm sau theo giờ UTC) vẫn được tính đúng vào tháng theo giờ Việt Nam, không bị lệch tháng.

**5.4. Gộp 2 nguồn doanh thu lại thành kết quả cuối:**

```ts
const mergeRevenue = (orderRevenueMap, bookingRevenueMap) => {
  const map = {};
  for (const date in orderRevenueMap) {
    map[date] = { salesRevenue: orderRevenueMap[date] || 0, serviceRevenue: 0 };
  }
  for (const date in bookingRevenueMap) {
    if (map[date]) {
      map[date].serviceRevenue = bookingRevenueMap[date] || 0;
    } else {
      map[date] = { salesRevenue: 0, serviceRevenue: bookingRevenueMap[date] || 0 };
    }
  }
  const result = Object.keys(map)
    .map((date) => {
      const sales = map[date].salesRevenue;
      const service = map[date].serviceRevenue;
      return { date, salesRevenue: sales, serviceRevenue: service, totalRevenue: sales + service };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  return result;
};
```

Với mỗi tháng xuất hiện trong khoảng đã chọn, kết quả cuối cùng có 4 con số: `date` (tháng, dạng `"2026-06"`), `salesRevenue` (doanh thu bán hàng tháng đó), `serviceRevenue` (doanh thu dịch vụ tháng đó), và `totalRevenue` = `salesRevenue + serviceRevenue` (tổng cộng). Danh sách được **sắp xếp theo tháng tăng dần** (tháng cũ trước, tháng mới sau).

**Tóm tắt công thức bằng 1 câu:** *Doanh thu 1 tháng = (tổng `total_price` của các đơn hàng tạo trong tháng đó, đã thanh toán hoặc thu tiền khi giao, và chưa bị huỷ) + (tổng `realPrice` của các lượt đặt dịch vụ có đơn cha đã hoàn thành, cập nhật trong tháng đó).*

### Bước 6 — Model (nơi thật sự chạm database)

File `backend/src/models/order.model.ts` (rút gọn, chỉ các field liên quan tới doanh thu):

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `total_price` | Số (Number) | Tổng tiền hàng của đơn (KHÔNG gồm phí ship) | `450000` |
| `payment_status` | Chữ, 1 trong 3 giá trị cố định (`enum`: `PENDING`, `PAID`, `CASH_ON_DELIVERY`) | Đơn đã thanh toán chưa, thanh toán bằng cách nào | `"PAID"` |
| `status` | Chữ (`enum`: `PENDING`, `PROCESSING`, `SHIPPING`, `DELIVERED`, `CANCELLED`) | Đơn đang ở giai đoạn nào trong quy trình giao hàng | `"DELIVERED"` |
| `bookingStatus` | Chữ (`enum`: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `CANCELLED`, `COMPLETED`) hoặc `null` | Nếu đơn có kèm đặt lịch dịch vụ, đây là trạng thái của lịch hẹn đó | `"COMPLETED"` |
| `createdAt` | Ngày giờ, tự MongoDB điền | Lúc đơn được tạo — dùng để nhóm doanh thu bán hàng theo tháng | `"2026-06-03T09:12:00.000Z"` |

File `backend/src/models/orderdetail.model.ts` (các field liên quan tới doanh thu dịch vụ):

| Field | Kiểu dữ liệu | Ý nghĩa | Ví dụ giá trị thật |
|---|---|---|---|
| `orderId` | Tham chiếu tới 1 `Order` | Dòng chi tiết này thuộc đơn hàng nào | `ObjectId` trỏ tới 1 order |
| `serviceId` | Tham chiếu tới 1 `Service`, có thể để trống | Nếu dòng này là đặt dịch vụ spa (không phải mua sản phẩm), đây là dịch vụ nào | `ObjectId` trỏ tới "Tắm chải chó nhỏ" |
| `realPrice` | Số (Number) | Giá thực tế tính cho lượt dịch vụ đó (ví dụ tính theo cân nặng thú cưng thật, khác giá niêm yết) | `250000` |
| `updatedAt` | Ngày giờ, tự MongoDB điền | Lần cập nhật gần nhất của dòng này — dùng để nhóm doanh thu dịch vụ theo tháng | `"2026-06-20T14:00:00.000Z"` |

Khi Controller gọi `orderModel.find(matchOrder)` và `orderDetailModel.find(matchOrderDetail).populate(...)`, Model dịch các câu lệnh đó thành câu lệnh MongoDB thật, database lục trong "tủ lạnh" (2 collection `orders` và `orderdetails`) ra đúng các document thoả điều kiện, trả về mảng cho Controller cộng dồn như Bước 5.

### Bước 7 — Kết quả đi ngược lại, từ database ra tới biểu đồ

1. **Model** trả kết quả thô (danh sách order, danh sách orderDetail) cho **Controller**.
2. **Controller** cộng dồn theo công thức ở Bước 5, gói thành `{ success: true, data: [{ date, salesRevenue, serviceRevenue, totalRevenue }, ...] }`, gọi `res.json(...)`.
3. **Router** không làm gì thêm ở chặng về, response đi thẳng ra ngoài.
4. Response tới `revenueAPI.js` ở frontend — `response.data.data` chính là mảng các tháng vừa tính.
5. `revenue.tsx` nhận về, gọi `setData(res.data.data || [])` — báo cho React "dữ liệu đổi rồi, vẽ lại".
6. React vẽ lại 2 thứ:
   - **Bảng** (`Table` của antd): mỗi dòng 1 tháng, hiện `salesRevenue`, `serviceRevenue`, `totalRevenue` đã format thành tiền VNĐ (`val.toLocaleString() + '₫'`).
   - **Biểu đồ cột** (`BarChart` của thư viện `recharts`): mỗi tháng vẽ 3 cột (doanh thu bán hàng, doanh thu dịch vụ, tổng doanh thu), trục dọc hiện đơn vị "triệu đồng" (`(value / 1000000).toFixed(1) + 'M ₫'`).
   - Cả bảng và biểu đồ chỉ hiện `chartLimit` tháng gần nhất (3 hoặc 6 tháng tuỳ admin chọn ở ô "Số tháng hiển thị") bằng `data.slice(-chartLimit)` — đây là bước cắt bớt làm ở **frontend**, không phải backend trả thiếu dữ liệu.

Vậy là toàn bộ hành trình: **admin chọn khoảng ngày → xin dữ liệu → backend lọc đúng đơn hợp lệ theo 2 nguồn (bán hàng + dịch vụ) → cộng dồn theo tháng → trả về → frontend vẽ bảng và biểu đồ** đã xong.

---

## Phần 4 — Vì sao thiết kế công thức như vậy?

- **Vì sao tách riêng "doanh thu bán hàng" và "doanh thu dịch vụ"?** Vì đây là 2 loại hoạt động kinh doanh khác nhau của pet-corner (bán sản phẩm thú cưng và cung cấp dịch vụ spa/grooming), lưu ở 2 Model khác nhau (`order` cho đơn mua hàng thuần, `orderDetail` cho từng lượt dịch vụ) — tách riêng giúp admin nhìn được nguồn nào đang tăng/giảm, không chỉ 1 con số gộp mù mờ.
- **Vì sao đơn `CANCELLED` và lịch hẹn chưa `COMPLETED` không được tính?** Vì đó là tiền chưa thực sự "về túi" hoặc đã hoàn lại — tính vào sẽ làm doanh thu ảo, cao hơn thực tế.
- **Vì sao đơn `PENDING` (chưa thanh toán) không được tính dù đơn đó chưa bị huỷ?** Vì `payment_status` phải là `PAID` hoặc `CASH_ON_DELIVERY` mới được tính — đơn chưa xác nhận thanh toán thì chưa chắc chắn có tiền thật, nên chưa ghi nhận là doanh thu.
- **Vì sao không cộng phí ship vào doanh thu?** Vì phí ship thường được trả lại cho đơn vị vận chuyển, không phải tiền lời của cửa hàng — comment trong code ghi rõ chủ đích này.
- **Vì sao phải làm tròn ngày về đầu/cuối tháng (Bước 4)?** Vì đơn vị báo cáo là "theo tháng" — nếu admin chọn giữa tháng 4 tới giữa tháng 7, hệ thống vẫn cần dữ liệu đầy đủ cả tháng 4 và tháng 7 để biểu đồ không bị hiểu lầm là tháng đó có ít doanh thu do bị cắt cụt.
- **Vì sao phải đổi múi giờ về `Asia/Ho_Chi_Minh` trước khi nhóm theo tháng?** Vì MongoDB lưu giờ theo chuẩn UTC (giờ quốc tế), lệch 7 tiếng so với giờ Việt Nam — nếu không đổi múi giờ, một đơn tạo lúc 23h-24h giờ Việt Nam có thể bị tính nhầm sang ngày/tháng sau theo giờ UTC.

---

## Phần 5 — Bảng tra cứu nhanh: muốn sửa gì thì mở file nào

| Muốn làm gì | Mở file |
|---|---|
| Đổi công thức tính doanh thu (điều kiện đơn hợp lệ, có cộng ship hay không...) | `backend/src/controllers/revenue.controllers.ts`, hàm `getRevenue` |
| Đổi điều kiện lọc lịch hẹn dịch vụ được tính doanh thu | `backend/src/controllers/revenue.controllers.ts`, đoạn `matchOrderDetail` + `populate(... match: { bookingStatus: ... })` |
| Đổi cách nhóm theo tháng / theo múi giờ | `backend/src/controllers/revenue.controllers.ts`, hàm `formatDate` |
| Đổi luật kiểm tra khoảng ngày (tối đa 2 năm, tối thiểu 1 tháng...) | `backend/src/controllers/revenue.controllers.ts` (backend) và `frontend_react/src/admin/revenue/revenue.tsx` (frontend, hàm `onFinish`) |
| Đổi địa chỉ API doanh thu, thêm quyền hạn (ví dụ bắt buộc đăng nhập/admin) | `backend/src/routes/revenue.routes.ts` |
| Đổi endpoint/cách gọi API từ frontend | `frontend_react/src/api/revenueAPI.js` |
| Đổi giao diện bảng/biểu đồ, số tháng hiển thị mặc định (3 hay 6 tháng) | `frontend_react/src/admin/revenue/revenue.tsx` |
| Xem field gốc của đơn hàng / chi tiết đơn dùng để tính doanh thu | `backend/src/models/order.model.ts`, `backend/src/models/orderdetail.model.ts` |

---

## Phần 6 — Glossary: các chữ hay gặp, tra nhanh

- **URL / địa chỉ**: chuỗi ký tự xác định "muốn xin gì, ở đâu" — ví dụ `/api/v1/revenue?from=2026-04-01&to=2026-07-16&type=monthly`.
- **Query string / tham số**: phần thông tin gắn sau dấu `?` trong URL để "lọc" hoặc "tuỳ chỉnh" yêu cầu — ở đây là `from`, `to`, `type`.
- **HTTP method (GET/POST/PATCH/DELETE)**: loại "ý định" của request — GET = xin xem, không thay đổi dữ liệu (revenue chỉ dùng GET).
- **Middleware**: một hàm chạy TRƯỚC khi tới Controller, dùng để kiểm tra/chuẩn bị (đăng nhập, quyền hạn...) — route `/revenue` hiện không có middleware kiểm tra đăng nhập nào.
- **Status code (200, 400, 401, 403, 404, 500)**: mã số 3 chữ số kèm response — 200 ổn, 400 request sai (thiếu `from`/`to`, sai định dạng ngày...), 500 lỗi server.
- **`enum`**: một field chỉ được nhận một trong vài giá trị cố định định trước — ví dụ `payment_status` chỉ được là `PENDING`, `PAID`, hoặc `CASH_ON_DELIVERY`, không được ghi giá trị khác.
- **`.lean()`**: một tuỳ chọn khi hỏi Model, nghĩa là "chỉ cần dữ liệu thô để đọc, không cần các tính năng phụ của Mongoose" — giúp truy vấn nhanh hơn khi chỉ đọc dữ liệu để tính toán, không sửa gì.
- **`.populate(...)`**: khi 1 field chỉ lưu "số căn cước" (ObjectId) tham chiếu sang document khác (ví dụ `orderDetail.orderId` chỉ lưu ID của order), `.populate()` là lệnh nói Model "đi lấy luôn dữ liệu đầy đủ của document đó về, đừng chỉ trả cái ID". Kèm `match` thì nó lấy về **có điều kiện** — nếu đơn cha không thoả điều kiện, kết quả trả về `null`.
- **Schema / Document / Collection**: bản thiết kế của Model / 1 dòng dữ liệu / tập hợp nhiều dòng dữ liệu cùng loại trong MongoDB — ví dụ `orders` và `orderdetails` là 2 collection riêng, được nối với nhau qua field `orderId`.

---

## Phần 7 — Tóm tắt nhanh (đọc phần này nếu không có thời gian đọc hết Phần 3)

```
┌───────────────┐      ┌────────────────┐      ┌──────────────────┐
│  revenue.tsx   │ ───▶ │ revenueAPI.js   │ ───▶ │  index.ts (app)   │
│ (chọn khoảng   │      │ (gói request,   │      │  cửa chính backend │
│  ngày, gọi API)│      │  GET /v1/revenue)│      └────────┬───────────┘
└───────────────┘      └────────────────┘               │
                                                          ▼
                                            ┌────────────────────────┐
                                            │ revenue.routes.ts        │
                                            │ khớp '/revenue'           │
                                            └───────────┬───────────────┘
                                                         ▼
                                            ┌─────────────────────────────┐
                                            │ revenue.controllers.ts        │
                                            │ 1. Kiểm tra from/to hợp lệ     │
                                            │ 2. Lọc order: PAID/COD,        │
                                            │    không CANCELLED             │
                                            │ 3. Lọc orderDetail: đơn cha    │
                                            │    bookingStatus = COMPLETED   │
                                            │ 4. Cộng dồn theo tháng (giờ VN)│
                                            └───────────┬──────────────────┘
                                     ┌───────────────────┴──────────────────┐
                                     ▼                                       ▼
                          ┌────────────────────┐                 ┌───────────────────────┐
                          │ order.model.ts       │                 │ orderdetail.model.ts    │
                          │ collection "orders"   │                 │ collection "orderdetails"│
                          └──────────┬───────────┘                 └────────────┬──────────┘
                                     └──────────────────┬─────────────────────────┘
                                                         ▼
                                                ┌──────────────────┐
                                                │  MongoDB          │
                                                └────────┬──────────┘
                                                         │
◀────────────────────────────────────────────────────────┘
   { date, salesRevenue, serviceRevenue, totalRevenue }[] đi ngược lại tới revenue.tsx → vẽ bảng + biểu đồ
```

Tóm tắt 1 câu mỗi trạm:

1. **revenue.tsx** — admin chọn khoảng ngày (mặc định 3 tháng gần nhất), tự động gọi xin dữ liệu doanh thu.
2. **revenueAPI.js** — đóng gói thành request `GET /v1/revenue?from=...&to=...&type=monthly`.
3. **index.ts** — cửa chính backend, chuyển request cho `revenueRouter`.
4. **revenue.routes.ts** — khớp đúng `/revenue`, giao cho hàm `getRevenue` (không có "trạm gác" đăng nhập/admin ở route này).
5. **revenue.controllers.ts** — kiểm tra ngày hợp lệ, sau đó lấy **2 nguồn**: đơn hàng đã thanh toán/COD và chưa huỷ (Model `order`), lịch dịch vụ đã hoàn thành (Model `orderDetail`, qua `populate` lọc đơn cha), cộng dồn từng nguồn theo tháng (đổi giờ Việt Nam trước khi nhóm), rồi gộp 2 nguồn lại thành `salesRevenue` + `serviceRevenue` = `totalRevenue`.
6. **order.model.ts / orderdetail.model.ts** — dịch các điều kiện lọc thành câu lệnh MongoDB, lấy đúng field cần (`total_price`, `payment_status`, `status`, `createdAt`, `realPrice`, `updatedAt`, `bookingStatus`).
7. **MongoDB** — tìm trong 2 collection `orders` và `orderdetails`, trả kết quả ngược lên.
8. **Đường về** — kết quả (mảng doanh thu từng tháng) đi ngược lại tới `revenue.tsx`, React vẽ bảng (đơn vị VNĐ) và biểu đồ cột (đơn vị triệu đồng), chỉ hiện số tháng gần nhất theo lựa chọn của admin (3 hoặc 6 tháng).

**Công thức cốt lõi, nhắc lại lần cuối:** *Doanh thu 1 tháng = tổng `total_price` của các đơn có `payment_status` là `PAID` hoặc `CASH_ON_DELIVERY`, `status` khác `CANCELLED`, tạo trong tháng đó — CỘNG VỚI — tổng `realPrice` của các lượt dịch vụ mà đơn cha có `bookingStatus = COMPLETED`, cập nhật trong tháng đó.*
