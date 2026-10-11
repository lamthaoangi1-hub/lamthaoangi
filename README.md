# Lâm Thao Ăn Gì? – Website đặt đồ ăn

Website tĩnh (HTML + CSS + JavaScript thuần), không cần cài đặt hay build.

## Chức năng
- **Trang chủ**: chọn khu vực, tìm kiếm, lọc/sắp xếp, dịch vụ, banner tự chuyển, danh mục, danh sách quán, thả tim yêu thích.
- **Đơn hàng**: 3 tab (Đang xử lý / Đang giao / Hoàn thành), tìm đơn, xem chi tiết, liên hệ quán, theo dõi đơn, đặt lại.
- **Yêu thích**: lưu gần đây, lọc theo danh mục, tìm kiếm, sắp xếp (lưu trong trình duyệt).
- **Thông báo**: lọc theo loại, đánh dấu đã đọc, chấm đỏ trên thanh điều hướng.
- **Cá nhân**: hồ sơ, điểm, mã giảm giá, menu; đăng xuất → màn hình chưa đăng nhập.
- **Đăng nhập / Đăng ký**: kiểm tra dữ liệu nhập, đăng nhập bằng Google/Facebook/Apple (demo).

Tài khoản demo: `0901234567` / `123456`

## Đưa lên GitHub Pages
1. Tạo repository mới, upload **toàn bộ** nội dung thư mục này (giữ nguyên `index.html`, `css/`, `js/`, `img/`).
2. Vào **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, thư mục `/ (root)`.
3. Đợi ~1 phút, website chạy tại `https://<tên-github>.github.io/<tên-repo>/`.

## Chỉnh nội dung
- Quán, món, đơn hàng, thông báo: sửa ở phần `DATA` đầu file `js/app.js`.
- Màu sắc, font: biến `:root` ở đầu `css/style.css`.
- Ảnh: thay file trong thư mục `img/` (giữ nguyên tên file).

Font dùng: Plus Jakarta Sans, Inter, Baloo 2 (Google Fonts, cần Internet).

## Banner Đền Hùng và dịch vụ

- Banner đầu trang chủ dùng ảnh cổng Đền Hùng, Phú Thọ, được lưu tại `den-hung.jpg` để không phụ thuộc máy chủ ảnh bên ngoài.
- Nguồn ảnh: [kiencgvt/den-hung-online — Cong-den-hung.jpg](https://github.com/kiencgvt/den-hung-online/blob/ba599f086870f97ee2ee7cbc3c242b21cda7d634/public/image/Cong-den-hung.jpg).
- Bốn mục dịch vụ: **Đồ ăn**, **Xe ôm**, **Giao hàng**, **Mua hộ**. Kích thước gọn trên điện thoại; giữ nguyên thanh điều hướng chân trang.
