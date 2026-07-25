---
name: explain-feature-flow
description: Viết tài liệu tiếng Việt, giải thích luồng dữ liệu end-to-end (Frontend → API → Router → Controller → Model → Database) của một feature ĐÃ CODE XONG trong dự án pet-corner, cho người ĐỌC CHƯA TỪNG HỌC LẬP TRÌNH, lưu vào docs/<feature>/README.md. Dùng khi user muốn "giải thích luồng của X", "viết doc cho X để giải thích cho junior/người mới", hoặc khi có sẵn folder docs/<feature> đang trống cần lấp đầy (ví dụ docs/login, docs/signup, docs/Getproduct, docs/banner).
---

# Explain feature flow — pet-corner

Skill này KHÔNG sinh code. Nó dò code đã có sẵn của một feature, rồi viết lại thành tài liệu cho người **hoàn toàn không biết lập trình** cũng đọc hiểu được — không phải chỉ "dễ hiểu hơn code", mà phải giải thích cả những khái niệm nền tảng (server, API, router, controller, model, database) bằng ví dụ đời thường, rồi mới đi vào code thật. Mức độ chi tiết mong muốn: xem `docs/banner/README.md` — đó là ví dụ chuẩn đã được user duyệt, không phải bản nháp.

## Input

Tên feature cần giải thích (ví dụ `banner`, `login`, `signup`, `Getproduct`). Nếu user không nói rõ file nào, tự dò theo tên feature.

## Trước khi viết — bắt buộc dò các file liên quan (không tự tưởng tượng đường dẫn)

1. Model: `backend/src/models/<feature>.model.ts` + interface/enum liên quan.
2. Controller + route: grep tên feature trong `backend/src/controllers/` và `backend/src/routes/`.
3. Cấu hình đặc biệt nếu có (ví dụ upload ảnh thì xem `backend/src/config/cloudinary.config.ts` có nhắc tới feature này không).
4. Frontend API layer: `frontend_react/src/api/<feature>Api.js` (hoặc tên gần giống).
5. Trang/admin UI quản lý feature: `frontend_react/src/admin/<feature>/...`, `frontend_react/src/admin/components/<feature>Modal.tsx` nếu có.
6. Nơi feature được hiển thị cho người dùng cuối (nếu có phần public), ví dụ `frontend_react/src/pages/home/home.tsx` cho banner.

Nếu một trong các bước trên không tìm thấy file nào — feature có thể CHƯA code xong. Báo lại cho user, không tự viết doc dựa trên suy đoán.

## Output

Một file duy nhất: `docs/<feature>/README.md`, tiếng Việt. Cấu trúc cố định (mirror đúng `docs/banner/README.md`):

1. **Phần 1 — Khái niệm nền tảng**: bảng ví các thuật ngữ (Frontend, Backend, API, Request, Response, Router, Controller, Model, Database, JSON...) với một ví dụ đời thường xuyên suốt (ví dụ nhà hàng: khách/lễ tân/đầu bếp/tủ lạnh). Đây là phần KHÔNG được bỏ qua — mục tiêu là người đọc chưa biết "controller" là gì cũng hiểu được sau khi đọc bảng này.
2. **Phần 2 — Sơ đồ tổng thể 1 dòng**: mũi tên `→` đi từ trình duyệt tới database và ngược lại, chỉ 2-3 dòng, không chi tiết.
3. **Phần 3 — Đi từng bước thật, theo đúng thứ tự request thực sự chạy**: mỗi bước = 1 file thật, đúng thứ tự (frontend gọi → api.js gói request → app.ts/index.ts nhận request đầu tiên, chạy qua middleware → router khớp URL, chọn controller → controller làm gì (gọi model, xử lý, đóng gói response) → model là gì, LIỆT KÊ VÀ GIẢI THÍCH TỪNG FIELD trong bảng (tên field, kiểu dữ liệu, ý nghĩa, ví dụ giá trị thật) → kết quả đi ngược lại từng trạm về tới màn hình). Mỗi bước trích code THẬT (không viết lại thành giả code) kèm giải thích bằng lời cho người không biết lập trình — không chỉ nói "hàm này lấy dữ liệu", mà nói rõ theo kiểu "nó nhờ Model tìm trong database những banner có trạng thái active, sắp theo thứ tự order".
4. **Phần 4 — So sánh với luồng khác** (nếu feature có 2 luồng, ví dụ luồng xem public vs luồng admin sửa/xoá): chỉ nêu ĐIỂM KHÁC, không lặp lại toàn bộ.
5. **Phần 5 — Bảng tra cứu nhanh**: "muốn sửa gì → mở file nào".
6. **Phần 6 — Glossary**: các từ hay gặp (URL, HTTP method, middleware, status code, JWT, schema, document, collection...) giải thích 1 câu mỗi từ, để tra nhanh khi quên.
7. **Phần 7 — Tóm tắt nhanh**: 1 sơ đồ dạng ASCII-box vẽ các "trạm" chính (frontend → api.js → app/index.ts → router → controller → model → database, rồi mũi tên đường về), NGẮN HƠN nhiều so với Phần 3 — không giải thích khái niệm lại, chỉ 1 câu mỗi trạm (dạng "1. home.tsx — ...", "2. bannerApi.js — ..."). Đây là phần dành cho người đã đọc Phần 3 một lần, giờ chỉ cần ôn lại nhanh, hoặc người bận không có thời gian đọc hết. Xem `docs/banner/README.md` (Phần 7) làm mẫu chính xác về độ dài/định dạng sơ đồ.

## Nguyên tắc khi viết

- Mọi đường dẫn file nhắc tới trong doc phải là file THẬT ĐÃ ĐỌC, không phải đường dẫn tự đoán.
- Code snippet phải là code THẬT trích từ file, không phải code mẫu tự viết lại.
- Giải thích khái niệm TRƯỚC khi dùng nó — không nhắc tới "middleware" hay "schema" mà chưa từng định nghĩa nó bằng tiếng Việt đơn giản trước đó trong tài liệu.
- Ưu tiên giải thích "vì sao" hơn "là gì" đối với các quyết định thiết kế (ví dụ: vì sao route này không cần đăng nhập, vì sao ảnh cũ không bị mất khi update không đổi ảnh) — nhưng với các khái niệm nền tảng (router/controller/model) thì PHẢI giải thích cả "là gì" bằng ví dụ, không giả định người đọc đã biết.
- Đi hết toàn bộ hành trình 1 request — không dừng ở giữa (ví dụ không dừng ở "Controller trả JSON" mà bỏ qua đoạn "response đi ngược về frontend, React vẽ lại màn hình thế nào").
- Không cần ngắn — tài liệu này ưu tiên đầy đủ/dễ hiểu hơn là ngắn gọn, vì đối tượng đọc là người mới hoàn toàn.

## Ví dụ tham khảo đã có

`docs/banner/README.md` là ví dụ CHUẨN đã viết theo đúng format này và đã được user duyệt (feature banner: model có `order`/`status`, có upload ảnh Cloudinary, có cả luồng admin và luồng public cho trang chủ) — đọc file đó để thấy chính xác cấu trúc/độ chi tiết/giọng văn mong muốn trước khi viết feature mới. Nếu không chắc mức độ chi tiết đủ chưa, so sánh trực tiếp với file này.
