# Thay đổi 04/11/2026 – Nút "Xem chi tiết" + AI chỉnh ảnh Thời trang

## Đã thêm
1. **Nút "Xem chi tiết"** trên mỗi sản phẩm của cửa hàng Thời trang → mở khung có ảnh lớn, giá, **Size**, **Màu**, **Chất liệu**, mô tả đầy đủ và nút "Thêm vào giỏ".
2. **3 ô mới trong Thực đơn** (chỉ hiện với cửa hàng thuộc mục Thời trang, cả Admin lẫn Nhà bán hàng): Size, Màu, Chất liệu (lưu vào Firestore: `sizes`, `colors`, `mat`).
3. **AI chỉnh ảnh**: khi nhà bán hàng bấm "Tải ảnh lên" ở một sản phẩm thời trang, ảnh được gửi qua Muse (Meta) hoặc Gemini (Google) (làm nền sạch, chỉnh sáng, giữ nguyên sản phẩm) rồi ảnh đã chỉnh được lưu Drive và gắn vào sản phẩm. Có nút "↩ Dùng ảnh gốc" nếu chưa ưng. AI lỗi/hết lượt → tự giữ ảnh gốc.

## Bắt buộc làm để AI chạy (1 lần)
1. Lấy khóa miễn phí: https://aistudio.google.com/apikey
2. script.google.com → dự án hiện tại → dán lại toàn bộ `google-apps-script.gs` mới.
3. Project Settings → Script properties → thêm `MUSE_API_KEY` (khóa tạo ở dev.meta.ai → API keys) để dùng Muse, và/hoặc `GEMINI_API_KEY` để dùng Gemini. `AI_PROVIDER` = `muse` hoặc `gemini` để chọn (bỏ trống: có khóa Muse thì dùng Muse).
   (Tùy chọn: `GEMINI_MODEL` – mặc định `gemini-2.5-flash-image`; `AI_MAX_PER_6H` – mặc định 40 ảnh / tài khoản / 6 giờ.)
4. Deploy → Manage deployments → Edit → **New version**.
5. Đẩy các file web đã sửa lên hosting (đã đổi số phiên bản `?v=20261104a` để trình duyệt tải bản mới).

Không cần sửa `firestore.rules`.

## File đã sửa
`google-apps-script.gs`, `panel.js`, `panel.css`, `seller.js`, `admin.js`, `app.js`, `style.css`, `index.html`, `quanly.html`, `quanly.js`, `revenue.js`, `shipper.js`
