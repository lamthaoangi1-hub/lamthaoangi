# Lưu dữ liệu vào Google Sheet + giảm tải Firestore (30/10/2026)

Không cần nâng gói Blaze. Dữ liệu người dùng và đơn hàng được **sao lưu sang Google Sheet**, Admin xem lịch sử từ Sheet nên gần như không tốn lượt đọc Firestore.

## Cái gì thay đổi
| Việc | Trước | Sau |
|---|---|---|
| Khách đăng ký | chỉ lưu Firestore | lưu Firestore **và** ghi 1 dòng vào tab `NguoiDung` |
| Đơn mới / đổi trạng thái / xác nhận thanh toán | chỉ Firestore | ghi / cập nhật dòng ở tab `DonHang` (theo mã đơn, không bị trùng) |
| Admin tab Đơn hàng | đọc realtime **toàn bộ** đơn mỗi lần mở | realtime chỉ đơn **đang xử lý**; đơn xong/hủy lấy từ Sheet (100 đơn/lần, nút "Tải thêm") |
| Admin tab Doanh thu | đọc toàn bộ đơn | lấy đơn hoàn thành từ Sheet |
| Admin tab Người dùng | 300 khách/lần từ Firestore | khách đọc từ Sheet; nhân sự (admin/chủ quán/shipper) vẫn từ Firestore, tự dùng Sheet nếu Firestore hết hạn mức |
| Hết hạn mức Firestore | thông báo kỹ thuật dài | hiện **"Không thể tải lên, vui lòng liên hệ quản trị."** (đặt đơn, đăng ký, tải ảnh, trang quản lý) |

## Các bước triển khai (làm đúng thứ tự)
1. **Web**: đưa toàn bộ thư mục này lên hosting/GitHub như cũ (có sửa `fb.js`, `admin.js`, `app.js`, `panel.js`, ... đã đổi số phiên bản `?v=20261030a` để trình duyệt tải bản mới).
2. **Apps Script**: dán lại toàn bộ `google-apps-script.gs`; trong *Project Settings* bật "Show appsscript.json" rồi dán nội dung `appsscript.json` mới (có thêm quyền `spreadsheets`).
3. Chọn hàm **`setupSheets`** → Run → bấm *Review permissions* → Allow. Xem *Execution log* để lấy link file Google Sheet vừa tạo (nằm trong Drive của tài khoản chủ script). Muốn dùng file có sẵn: dán ID vào hằng `SHEET_ID` ở đầu file.
4. **Deploy → Manage deployments → Edit → New version → Deploy** (giữ nguyên link /exec cũ).
5. **Chuyển dữ liệu cũ** (chỉ 1 lần, tốn lượt đọc Firestore 1 lần; chạy khi còn hạn mức, hoặc sau 14h00 giờ VN):
   - Run `backfillUsers`, rồi Run `backfillOrders`.
   - Nếu log báo "Hết thời gian chạy" thì bấm Run lại, script tự làm tiếp từ chỗ dừng. Log báo `XONG` là hoàn tất.
   - Chưa chuyển thì Admin sẽ **không thấy** khách / đơn cũ trong danh sách (dữ liệu vẫn nguyên trong Firestore).
6. Vào `quanly.html` bằng Admin, bấm tab *Doanh thu* và *Người dùng* để kiểm tra số liệu.

## Lưu ý
- Tab `NguoiDung` / `DonHang` do hệ thống ghi tự động; đừng đổi tên tab, đổi tên cột hay chèn cột. Thêm cột tính toán ở bên phải thì được.
- Vai trò Admin được kiểm tra bằng Firestore; khi Firestore hết hạn mức thì dùng cột `role` trong tab `NguoiDung` làm dự phòng. Chỉ chia sẻ file Sheet cho người tin cậy (có SĐT và địa chỉ khách).
- Bộ quét `sweepOrderStatus` (mỗi phút) cũng cập nhật Sheet nên đơn không bị sót khi shipper tắt app. Bộ quét này **tự đọc Firestore mỗi phút**; nếu vẫn sát hạn mức, đổi `everyMinutes(1)` thành `everyMinutes(5)` trong `installTrigger` rồi chạy lại hàm đó.
- Chủ quán (`seller.js`) vẫn xem toàn bộ đơn của quán mình qua Firestore; nếu quán có hàng nghìn đơn thì đây là nguồn đọc lớn tiếp theo.
- Đã bổ sung `patchUser` còn thiếu trong `fb.js` (trước đây `admin.js` gọi hàm này nhưng chưa được định nghĩa, nên đổi vai trò / gán quán / Zalo ID sẽ lỗi).
- `firestore.rules` **không cần đổi**.
