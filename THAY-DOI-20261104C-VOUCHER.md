# Thay đổi 04/11/2026 (c) – Voucher vận chuyển + khách CHỌN voucher (không nhập mã)

**Admin → tab Mã giảm giá:** thêm ô *Loại voucher*: "Giảm giá đơn hàng" (trừ tiền món, như cũ) hoặc "Vận chuyển" (trừ phí ship; tích "miễn phí ship toàn bộ" hoặc nhập số tiền giảm). Voucher cũ không có loại = Giảm giá đơn hàng, vẫn chạy bình thường.

**Khách:** bước *Xác nhận đơn hàng* không còn ô nhập mã. Voucher hiện thành danh sách để bấm chọn (bấm lại để bỏ chọn), chia 2 nhóm; mỗi đơn dùng được 1 voucher giảm giá + 1 voucher vận chuyển. Voucher chưa đủ đơn tối thiểu bị mờ kèm dòng "Mua thêm …". Voucher vận chuyển chỉ tính được sau khi khách chia sẻ vị trí.

**Tiền:** voucher vận chuyển trừ vào phần phí ship khách trả (gồm cả phụ phí đêm/thời tiết). Shipper vẫn nhận đủ (`shipFull`), quán KHÔNG bị trừ, phần chênh do Lâm Thao Ăn Gì chịu. Đơn lưu thêm `shipVoucherOff`, `shipVoucherCode`. Admin → Bù lỗ có thẻ "Voucher vận chuyển" tổng theo ngày; app shipper hiện dòng "Lâm Thao Ăn Gì hỗ trợ …".

**Đưa lên:** (1) chép đè `app.js`, `style.css`, `index.html`, `admin.js`, `shipper.js`; (2) dán lại `google-apps-script.gs` rồi Deploy → New version (tự thêm 2 cột cuối tab DonHang). Không cần sửa Firestore rules.

**Bổ sung:** voucher có thể giảm theo % (kèm mức giảm tối đa). % tính trên tiền món sau giảm giá quán (voucher giảm giá) hoặc trên phí ship khách trả (voucher vận chuyển).
