# Thay đổi 04/11/2026 (d) – Admin chịu phí ship hỗ trợ, quán nhận đủ, ví tài xế

**Tiền đơn mới:** phần phí ship hỗ trợ (freeship của quán) KHÔNG còn trừ vào quán (`shopShip`), mà ghi vào `adminShip` do Admin chịu. Quán nhận đủ tiền món. Khách trả phần phí ship còn lại bằng tiền mặt (shipper giữ khi thu hộ); phần Admin chịu (`adminShip` + voucher ship `shipVoucherOff`) được CỘNG VÀO VÍ tài xế khi đơn giao xong. Đơn cũ giữ nguyên cách tính cũ.

**Shipper – tab 👛 Ví:** xem số dư, các đơn được cộng ví, nhập ngân hàng + số tài khoản + tên chủ TK và gửi yêu cầu rút (tối thiểu 10.000đ, không vượt số dư).

**Admin – tab 👛 Ví tài xế:** danh sách yêu cầu rút (kèm thông tin ngân hàng), bấm "Đã chuyển khoản" sau khi chuyển tiền hoặc "Từ chối" (tiền hoàn lại ví); bảng số dư từng tài xế; cảnh báo nếu yêu cầu vượt số dư tính từ Google Sheet. Tab Bù lỗ có thẻ tổng phí ship Admin chịu theo ngày.

**Đưa lên (đủ 3 bước):** 1) Firebase → Firestore → Rules: dán `firestore.rules` mới → Publish (thêm `payouts` + giới hạn `adminShip`/`shipVoucherOff`). 2) Apps Script: dán `google-apps-script.gs` mới → Deploy → New version (thêm cột `adminShip`). 3) GitHub: chép đè `app.js`, `admin.js`, `shipper.js`, `fb.js`, `panel.js`, `index.html` rồi Ctrl+F5.
