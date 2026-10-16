# Lâm Thao Ăn Gì? – Website đặt đồ ăn

Website tĩnh (HTML + CSS + JavaScript thuần, không cần build) chạy trên GitHub Pages, dữ liệu thật bằng Firebase (Auth + Firestore), ảnh lưu Google Drive, báo đơn qua Gmail + Zalo Bot bằng Google Apps Script.

## Cấu trúc
- `index.html`, `app.js`, `style.css` – website khách hàng (đồ ăn, Giao hàng, Mua hộ).
- `quanly.html` + `quanly.js`, `panel.js`, `admin.js`, `seller.js`, `shipper.js`, `panel.css` – cổng quản lý chung (Admin / Nhà bán hàng / Shipper).
- `fb.js`, `firebase-config.js`, `upload-config.js`, `goong-config.js` – cấu hình và lớp dữ liệu.
- `firestore.rules` – luật bảo mật (dán vào Firebase Console → Firestore → Rules → Publish).
- `google-apps-script.gs` + `appsscript.json` – dán vào script.google.com.
- `manifest.json`, `icon-*.png` – cài lên màn hình chính điện thoại (PWA).
- Hướng dẫn chi tiết: **HUONG-DAN.md**. Danh sách việc cần làm trước khi mở bán: **KIEM-TRA-TRUOC-KHI-MO.md**.

## Đưa lên GitHub Pages
Settings → Pages → Deploy from a branch → `main` / root. Tên miền trong `CNAME`.

## Cập nhật
Sửa file xong, đổi số phiên bản `?v=...` trong các file (tìm/thay toàn bộ) để trình duyệt tải bản mới.
