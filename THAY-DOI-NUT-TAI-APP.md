# Thêm nút "Tải App" (cài ra màn hình chính)

Nút xanh lá nằm ngay trên nút Zalo ở trang khách.
- Android (Chrome/Edge/Samsung): bấm → hiện hộp thoại cài của máy → icon ra màn hình chính.
- iPhone (Safari): Apple không cho web tự cài → hiện hướng dẫn 2 bước (Chia sẻ → Thêm vào MH chính).
- Mở trong Zalo/Facebook: hiện hướng dẫn mở bằng Chrome/Safari rồi cài.
- Đã cài rồi (mở từ icon) → nút tự ẩn.

File đổi: `index.html` (thêm nút + nạp install.js), `style.css` (thêm CSS cuối file), `install.js` (MỚI).
Không đổi dữ liệu, Firebase, Apps Script, firestore.rules.

Lưu ý: cần có `icon-192.png`, `icon-512.png` ở thư mục gốc web (manifest.json đang gọi) và web chạy HTTPS thì Chrome mới cho cài.
