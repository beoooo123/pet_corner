---
name: scaffold-crud-feature
description: Sinh code CRUD backend + frontend cho một resource mới trong dự án pet-corner (ví dụ banner, brand, tag, coupon...), theo đúng convention hiện có của project (category/product làm mẫu). Dùng khi user yêu cầu "thêm resource CRUD mới", "tạo quản lý admin cho X", "scaffold CRUD cho X".
---

# Scaffold CRUD feature — pet-corner

Skill này sinh toàn bộ code cần thiết để có một resource CRUD mới, quản lý được qua trang admin, theo đúng phong cách code đã có trong repo (không tự sáng tạo convention mới).

## Input cần hỏi user trước khi bắt đầu (nếu chưa rõ)

1. Tên resource (số ít, viết thường, ví dụ `banner`, `brand`) — dùng cho tên file/model.
2. Danh sách field + kiểu dữ liệu + bắt buộc/không bắt buộc.
3. Có cần upload ảnh không? Nếu có: 1 ảnh (`uploader.single`) hay nhiều ảnh (`uploader.array`, như product).
4. Có cần trường `status` (active/inactive) không?
5. Có cần API public (không cần đăng nhập, ví dụ để trang chủ lấy dữ liệu) không?
6. Trang admin cần trang riêng (list + modal) hay đơn giản chỉ cần inline modal như `category.tsx`? (Có upload ảnh → luôn cần modal riêng, theo mẫu `product.tsx`.)

## File mẫu PHẢI đọc trước khi sinh code (không đoán, đọc thật)

- Không có ảnh: `backend/src/models/category.model.ts`, `backend/src/controllers/category.controllers.ts`, `backend/src/routes/category.routes.ts`, `backend/src/enums/category.enum.ts`, `backend/src/interfaces/category.interface.ts`
- Có ảnh: `backend/src/models/product.model.ts`, `backend/src/controllers/product.controllers.ts` (đặc biệt hàm `insertProduct`/`updateProduct`), `backend/src/routes/product.routes.ts`
- Cloudinary: `backend/src/config/cloudinary.config.ts`
- Frontend API: `frontend_react/src/api/categoryApi.js`
- Frontend admin (không ảnh): `frontend_react/src/admin/category/category.tsx`
- Frontend admin (có ảnh): `frontend_react/src/admin/product/product.tsx` + `frontend_react/src/admin/components/productModal.tsx`
- Routing: `frontend_react/src/App.tsx`, `frontend_react/src/components/layout/AdminLayout.tsx`

Nếu resource cần một feature đã có sẵn gần giống (ví dụ đã từng làm banner), đọc luôn implementation đó (`backend/src/models/banner.model.ts` v.v.) làm tham khảo thêm.

## Bước sinh code — Backend

1. `backend/src/enums/<resource>.enum.ts` — chỉ tạo nếu có `status`:
   ```ts
   export enum <Resource>Status { ACTIVE = 'active', INACTIVE = 'inactive' }
   ```
2. `backend/src/interfaces/<resource>.interface.ts` — `I<Resource>` với `_id` + toàn bộ field + `createdAt?/updatedAt?` nếu dùng timestamps.
3. `backend/src/models/<resource>.model.ts` — theo đúng pattern:
   ```ts
   const <resource>Model = mongoose.models.<resource> || model('<resource>', <resource>Schema);
   export default <resource>Model;
   ```
   Dùng `{ timestamps: true }` nếu admin cần sort theo ngày tạo. KHÔNG thêm field soft-delete (`isDeleted`) — repo này luôn xoá cứng (`findByIdAndDelete`).
4. `backend/src/controllers/<resource>.controllers.ts` — chuẩn hoá response `{ success: boolean, message?: string, data? }` cho MỌI hàm (không copy các shape cũ không nhất quán như `{ result }`/`{ category }` của category cũ). Các hàm cần có, tuỳ yêu cầu:
   - `getAll<Resource>s`, `get<Resource>ById`
   - `get<Resource>sActive` — CHỈ nếu cần API public
   - `insert<Resource>` — nếu có ảnh: check `req.file`/`req.files`, lấy `.path` làm URL lưu DB (đây là link Cloudinary có sẵn, không phải path trên máy)
   - `update<Resource>` — nếu 1 ảnh: có `req.file` thì thay, không có thì giữ nguyên field ảnh cũ (không đưa field đó vào object update). Nếu nhiều ảnh: theo đúng cơ chế `existing_images`/`new_images` của `updateProduct`.
   - `toggle<Resource>Status` — nếu có `status`
   - `delete<Resource>` — hard delete
5. `backend/src/routes/<resource>.routes.ts`:
   - Route tĩnh (`/status/active`, `/reorder`...) PHẢI đăng ký TRƯỚC route có `:id`. Đây là lỗi thật đã xảy ra — Express khớp theo thứ tự, để `:id` trước sẽ "nuốt" mất route tĩnh.
   - Route ghi (POST/PATCH/DELETE) admin-only → chain `verifyToken, requireAdmin` (import từ `../middlewares/verifyToken.js` và `../middlewares/protectRoute.js`).
   - Route đọc public (nếu có) → không middleware.
   - Nếu có ảnh: `uploader.single('<field>')` hoặc `uploader.array('<field>', <limit>)` từ `../config/cloudinary.config.js`.
6. `backend/src/index.ts` — thêm `import <resource>Router from './routes/<resource>.routes.js';` và `app.use('/api/v1', <resource>Router);` cạnh các router khác.
7. **CHỈ khi có upload ảnh** — `backend/src/config/cloudinary.config.ts`: thêm route segment (dạng số nhiều, ví dụ `'banners'`) vào mảng `folderActive`. Thiếu bước này upload sẽ throw `Route X is not supported for file upload`. Nếu ảnh cần tỉ lệ khác 800×800 (ví dụ banner cần ảnh rộng-thấp), thêm nhánh `folder === 'uploads/<resource>'` riêng trong `transformation` — không sửa nhánh mặc định dùng cho resource khác.

## Bước sinh code — Frontend

1. `frontend_react/src/api/<resource>Api.js` — copy pattern `categoryApi.js` (dùng chung `api` từ `./axios`, KHÔNG tự thêm header `Authorization` vì interceptor đã lo). Nếu có upload ảnh, `create`/`update` gửi `FormData` với header `"Content-Type": "multipart/form-data"` (theo `productsApi.js`).
2. Nếu cần modal riêng (có ảnh, hoặc nhiều field) — `frontend_react/src/admin/components/<resource>Modal.tsx`, copy pattern `productModal.tsx`: `Upload` với `beforeUpload={() => false}` (không upload thật ngay, chỉ gửi lúc submit), `listType="picture-card"`.
3. `frontend_react/src/admin/<resource>/<resource>.tsx` — trang danh sách, copy pattern `category.tsx` (không ảnh, modal inline) hoặc `product.tsx` (có ảnh, modal riêng): `Card` + `Table` + `Modal.confirm` khi xoá + `notification.success/error` khi thành công/lỗi.
4. `frontend_react/src/App.tsx` — import trang list, thêm `{ path: "<resources>", element: <<Resource>List /> }` vào `children` của route `/admin`. Nếu có mảng `EMPLOYEE_ALLOWED_PAGES`, cân nhắc thêm `/admin/<resources>` vào đó nếu employee cũng được quản lý resource này.
5. `frontend_react/src/components/layout/AdminLayout.tsx` — thêm object vào `adminMenuItems` (key mới, chưa dùng — không cần đúng thứ tự số), icon từ `@ant-design/icons` chưa dùng trong file, `path: "/admin/<resources>"`. Nếu employee cũng được quản lý, thêm key đó vào mảng filter của `employeeMenuItems`.

## Checklist trước khi báo hoàn thành

- [ ] Backend: enum (nếu cần) / interface / model / controller / routes đã tạo, đăng ký trong `index.ts`
- [ ] Nếu có ảnh: đã thêm route segment vào `folderActive` trong `cloudinary.config.ts`
- [ ] `npx tsc --noEmit` ở `backend/` không lỗi
- [ ] Frontend: api file / trang admin (+ modal nếu cần) đã tạo, có route trong `App.tsx`, có menu trong `AdminLayout.tsx`
- [ ] `npm run build` ở `frontend_react/` không lỗi
- [ ] Tên số ít cho model (`banner`), số nhiều cho route/thư mục admin (`banners`) — đúng convention `category`/`categories`, `product`/`products`
- [ ] Test thử API bằng `curl` cho route public (nếu có); route admin cần user tự đăng nhập test qua UI (không tự tạo token admin giả)

Sau khi code xong, có thể gọi tiếp skill `explain-feature-flow` để viết tài liệu giải thích luồng cho feature này vào `docs/<resource>/`.
