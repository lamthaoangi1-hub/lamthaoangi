# Cập nhật 07/11/2026: Quán tạo đơn hộ khách (gửi link, khách chỉ chia sẻ vị trí)

## Cách dùng
**Chủ quán:** đăng nhập `quanly.html` → tab **📝 Tạo đơn hộ** → bấm + chọn món → nhập tên + SĐT khách (địa chỉ, ghi chú có thể bỏ trống) → **🔗 Tạo link gửi khách** → **Sao chép tin nhắn gửi khách** rồi dán vào Zalo / Messenger.

**Khách:** bấm link → thấy món, tên, tổng tiền → bấm **Chia sẻ vị trí** (chọn "Cho phép") → bấm **Gửi đơn**. Không cần đăng ký, đăng nhập hay nhập mật khẩu. Sau khi gửi, khách thấy màn hình theo dõi đơn (chờ nhận / đang giao / hoàn thành).

## Điều gì xảy ra sau khi khách gửi
- Đơn tạo ra **giống hệt đơn đặt trên web**: cùng cách tính phí ship theo km, phụ phí đêm, thời tiết xấu, freeship, giảm giá quán và ưu đãi Lâm Thao Ăn Gì.
- **Admin, quán, shipper online** nhận báo đơn mới như bình thường (Gmail + Zalo + chuông trên trang quản lý). Shipper nhận đơn, Admin bù giảm giá, doanh thu, Google Sheet đều chạy như đơn thường.
- Đơn có nhãn **📝 Quán tạo hộ** trong danh sách đơn của quán và ghi chú "(Quán tạo đơn hộ khách)" để shipper biết.
- Thanh toán: **tiền mặt khi nhận hàng**.
- Mỗi link **chỉ dùng được 1 lần** (tránh khách bấm 2 lần ra 2 đơn) và **hết hạn sau 3 ngày**. Muốn đặt lại thì tạo link mới. Link chưa dùng hiện ở mục "Link đã tạo, khách chưa đặt" để sao chép lại hoặc xóa.
- Quán đang đóng cửa thì khách không gửi được đơn (giống đặt trên web).

## Cách đưa lên (làm đủ 3 bước, theo thứ tự)
1. **Firebase → Authentication → Sign-in method → Anonymous (Ẩn danh) → Enable → Save.**
   Bắt buộc, vì khách không có tài khoản: trang `dat.html` tự đăng nhập ẩn danh khi khách bấm Gửi đơn. Chưa bật thì khách sẽ thấy "Hệ thống chưa bật đặt đơn bằng link".
2. **Firestore Rules:** Firebase Console → Firestore → Rules → dán toàn bộ `firestore.rules` mới → Publish. (Thêm luật cho bộ sưu tập `drafts`; luật đơn hàng giữ nguyên.)
3. **GitHub:** tải các file trong gói này lên ghi đè, đợi ~1 phút, bấm Ctrl+F5. Có file mới `dat.html` và `dat.js`.

**Không cần** đổi Google Apps Script, không cần Deploy lại.

## Lưu ý
- Tài khoản ẩn danh được tạo riêng cho trang `dat.html`, **không ảnh hưởng** đăng nhập của website chính. Khách này không thấy đơn trong mục "Đơn hàng" của web chính, nhưng mở lại đúng link trên cùng điện thoại sẽ thấy trạng thái đơn.
- Quán không phải trả thêm lượt đọc nào đáng kể: mỗi link tốn khoảng 1 lần ghi (tạo), vài lần đọc (khách mở) và 1 lần ghi khi đơn được gửi.
- Link là mã ngẫu nhiên dài, ai có link mới mở được. Tên + SĐT khách trong link chỉ người có link thấy.
- Bản này chưa gồm xác minh SĐT bằng OTP (bạn hỏi riêng ở phần chống đơn giả). Vì đơn do chính quán tạo và gửi cho khách quen, rủi ro thấp hơn đơn tự đặt.
- Chưa hỗ trợ voucher và chuyển khoản QR trong link này (chỉ tiền mặt). Cần thì báo để bổ sung.
