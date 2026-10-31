# Cập nhật 31/10/2026: link riêng từng quán + giảm giá do Lâm Thao Ăn Gì chịu

## 1. Link riêng từng quán
- Dạng link: `https://lamthaoangi.io.vn/?quan=ten-quan-khong-dau` (ví dụ `?quan=pho-bo-lam-thao`). Khách bấm vào là mở thẳng thực đơn của quán đó, đặt món như bình thường.
- **Admin:** tab *Cửa hàng* → nút **🔗 Link** ở từng quán → tự sao chép link. Nếu 2 quán trùng tên, link tự dùng mã quán để không bị nhầm.
- **Chủ quán:** đăng nhập `quanly.html` → tab *Cửa hàng* → khung **🔗 Link đặt món của quán** → *Sao chép link*.
- Link sai/quán đã xóa: khách thấy thông báo "Không tìm thấy quán này" và vào trang chủ như thường.

## 2. Giảm giá 5% do bạn chịu
- **Bật/tắt:** Admin → tab *Liên hệ* → khung **🎁 Giảm giá do Lâm Thao Ăn Gì chịu** → nhập 5 → *Lưu mức giảm*. Nhập 0 để tắt. Có hiệu lực ngay với đơn đặt sau đó.
- **Khách thấy:** thẻ quán có nhãn "🎁 Giảm thêm 5%"; ở bước xác nhận có dòng "Ưu đãi Lâm Thao Ăn Gì (5%)". Giảm tính trên **tiền món** (sau giảm giá quán và mã giảm giá), không tính phí ship.
- **Quán nhận đủ:** doanh thu quán (trang chủ quán, báo cáo doanh thu Admin) vẫn tính đủ tiền món. Quán thấy dòng "Lâm Thao Ăn Gì giảm cho khách … quán vẫn nhận đủ, Admin bù cuối ngày".
- **Cuối ngày bù lỗ:** Admin → tab **💸 Bù lỗ** → chọn ngày → thấy số tiền phải chuyển cho từng quán (chỉ đơn đã giao thành công; đơn hủy không tính). Chuyển khoản xong bấm **Đã chuyển khoản bù**. Phát sinh thêm đơn sau khi bấm thì hệ thống báo phần còn thiếu.
- Tin Zalo/Gmail báo đơn có thêm dòng cho biết phần Lâm Thao Ăn Gì chịu.

## 3. Cách đưa lên (làm đủ 3 bước, theo thứ tự)
1. **Firestore Rules:** Firebase Console → Firestore → Rules → dán toàn bộ `firestore.rules` mới → Publish. (Thêm luật chặn khách tự sửa số tiền giảm, và luật cho tab Bù lỗ.)
2. **Google Apps Script:** mở project script → thay toàn bộ code bằng file `apps-script-DAN-VAO-GOOGLE.gs` (đã có sẵn ID Sheet của bạn) → Deploy → Manage deployments → Edit → New version → Deploy. Script tự thêm cột `platformOff` vào cuối tab DonHang trong Google Sheet.
3. **GitHub:** tải toàn bộ thư mục website lên ghi đè, đợi ~1 phút, bấm Ctrl+F5.

## Lưu ý
- Đơn đặt **trước** khi bật giảm giá, hoặc đơn cũ chưa có cột `platformOff`, không có tiền bù.
- Tab Bù lỗ đọc từ Google Sheet nên đơn vừa giao xong có thể chậm tối đa ~1 phút; bấm *Tải lại*.
- Ngày tính theo ngày đơn được giao thành công, giờ của máy đang mở trang Admin.
- Khi dán link quán lên Zalo/Facebook, ảnh xem trước vẫn là ảnh chung của website (trang web tĩnh nên chưa đổi được ảnh theo từng quán).
