# Thay đổi 04/11/2026 (b) – Hết khựng khi đổi mục + hiện quán ngay khi vào web

1. **Đổi mục (Đồ ăn / Thời trang / Thực phẩm sống / Dịch vụ) không còn khựng**: trước đây mỗi lần bấm là vẽ lại cả trang chủ (ảnh Đền Hùng, banner, thanh tìm kiếm…). Nay chỉ thay phần danh mục + danh sách quán (hàm `switchSector`). Thêm `content-visibility` cho thẻ quán và giảm độ trễ hiệu ứng xuất hiện.
2. **Vào web là hiện quán ngay, không chờ "Đang tải danh sách quán…"**: danh sách quán lần trước được lưu trong máy khách (`localStorage lt_shopsCache`); dữ liệu mới từ Firebase về sẽ tự cập nhật đè lên. Khách mở web lần đầu tiên trên máy vẫn phải chờ 1 lần. Cách này cũng giúp web vẫn hiện quán khi Firestore tạm hết hạn mức.
3. **Tải Firebase sớm hơn**: `fb.js` và các module Firebase được tải song song ngay từ đầu (`modulepreload` + `preconnect` trong index.html).

Chỉ sửa: `app.js`, `style.css`, `index.html` (đổi số phiên bản thành `?v=20261104b`). Không cần sửa Firestore rules / Apps Script / appsscript.json.
