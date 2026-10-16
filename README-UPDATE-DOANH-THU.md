# Nâng cấp quản lý doanh thu và giao diện (16/10/2026)

## Đã thực hiện
- Nhà bán hàng: tab **Doanh thu**, lọc hôm nay / 7 ngày / tháng này / toàn bộ, tổng doanh thu, số đơn, giá trị đơn trung bình, bảng theo ngày.
- Admin: tab **Doanh thu**, tổng tất cả các quán, xếp hạng từng quán, chọn quán để xem báo cáo chi tiết; xử lý cả doanh thu của quán đã bị xóa.
- Shipper / seller / admin: nâng cấp UI responsive, card thống kê, phân cấp thông tin, bảng cuộn ngang trên di động, độ tương phản và trạng thái focus.
- Firebase: giữ nguyên phân quyền Firestore: seller chỉ được đọc đơn thuộc shopId của mình; admin mới đọc mọi đơn; shipper chỉ đơn công khai để nhận hoặc đơn được gán cho họ.
- Firebase Apps Script: giữ nguyên để tránh ảnh hưởng gửi thông báo/đặt lại mật khẩu; báo cáo tính trực tiếp từ các đơn Firestore.

## Cách tính
Doanh thu = subtotal - discount **chỉ cho đơn có status=done** thuộc cửa hàng, không tính phí giao hàng, đơn hủy, đơn giao hộ/mua hộ. Mốc ngày dựa trên updatedAt. Đây là doanh thu, không phải lợi nhuận.

## Triển khai
1. Sao lưu website hiện tại. Upload toàn bộ nội dung thư mục này lên hosting/GitHub Pages (phải có file mới `revenue.js`).
2. Đảm bảo `firestore.rules` đang được deploy trong Firebase Console > Firestore Database > Rules. **Không cần thay đổi rule** nếu đúng với phiên bản kèm theo.
3. Hard refresh trang `quanly.html`, đăng nhập tài khoản seller và admin riêng để đối chiếu số đơn.
4. Kiểm tra đơn hoàn thành cũ; trang doanh thu hiện dùng tất cả đơn nên số lượt đọc Firestore tăng theo quy mô. Với cơ sở dữ liệu hàng chục nghìn đơn trở lên, nên chuyển sang tổng hợp server-side theo ngày/tháng (Cloud Functions và báo cáo phân trang), tránh tải toàn bộ đơn về trình duyệt admin.
5. Múi giờ báo cáo dựa theo máy người đăng nhập (nên dùng múi giờ Việt Nam); đơn cũ không có updatedAt sẽ tạm lấy createdAt.

## Chưa xác minh trực tuyến
Chưa kết nối tài khoản Firebase thực tế và chưa triển khai website production. Cần thử trực tiếp với dữ liệu thật trước khi đưa lên sử dụng.
