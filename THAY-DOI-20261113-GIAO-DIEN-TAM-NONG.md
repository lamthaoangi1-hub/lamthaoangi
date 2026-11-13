# Đổi giao diện sang kiểu Tam Nông (13/11/2026)

Chỉ đổi GIAO DIỆN, giữ nguyên chức năng của Lâm Thao Ăn Gì? (ví, Quán gần bạn, tài trợ giảm giá theo quán, bảo trì...).

File thay đổi: style.css, app.js, index.html, admin.js, manifest.json; thêm cat-1..4.png.
- Trang chủ: header xanh lá thương hiệu, "Hôm nay ăn gì?", "Quán hot được yêu thích" (tự xoay), nút quay "Ăn gì?".
- Thanh dưới 4 mục: Trang chủ / Hoạt động / Hộp thư / Tài khoản. "Quán yêu thích" nằm trong Tài khoản.
- Tài khoản: thêm "Đăng ký bán hàng", "Đăng ký tài xế" (nhắn Zalo Admin).
- Trang quán: ảnh bìa, ưu đãi, Đặt nhóm / Chia sẻ, tìm món.
- Admin → Cửa hàng: thêm cột/ô tick "🔥 Quán hot" (chỉ quán được tick mới hiện ở mục Quán hot).
Không cần sửa firestore.rules hay Apps Script. Đẩy toàn bộ lên GitHub (ghi đè).
