# Thông báo đẩy về máy khách — BẢN CẬP NHẬT 27/10/2026

## Bản này có gì mới

1. **Khách cho phép thông báo là được đăng ký nhận tin ngay + tự đăng ký lại về sau**
   - Khách bấm *Cho phép / Bật thông báo* → web xin quyền, lấy token FCM và lưu vào Firestore `users/{uid}/devices/{token}` ngay lúc đó.
   - Mỗi lần khách quay lại web / chuyển lại vào tab (vẫn đang đăng nhập), web lặng lẽ đồng bộ lại token (tối đa 1 lần/10 phút) — khách cấp quyền trong cài đặt trình duyệt, hoặc token bị FCM đổi, cũng tự khớp lại, không cần đăng xuất/đăng nhập lại.
   - Trong *Cá nhân → Thông báo đơn hàng* khi đang bật có thêm nút **Đăng ký lại máy này** (dùng khi đổi điện thoại / lâu không thấy thông báo).

2. **Shipper nhận đơn → khách thấy ngay thông tin shipper**
   - Thông báo đẩy: **“Shipper đã nhận đơn 🛵 — Tài xế [Tên] đã nhận đơn #[mã] và đang giao tới bạn. SĐT tài xế: [số]…”**
   - Trong web: thẻ đơn ở mục *Đang giao* hiện dòng tài xế + bấm để gọi; *Xem chi tiết* và *Theo dõi đơn* hiện tên + SĐT shipper kèm nút **📞 Gọi tài xế**; trang *Thông báo* cũng ghi SĐT shipper.

3. **Đổi trạng thái đơn → thông báo đẩy kể cả khi khách đã thoát web**
   - Service worker mới (`firebase-messaging-sw.js`) tự hiển thị thông báo khi web đã đóng (không phụ thuộc trình duyệt tự suy diễn nội dung), bấm vào thông báo mở đúng trang Đơn hàng.
   - Apps Script gửi kèm tiêu đề + nội dung trong cả `notification` lẫn `webpush.notification` và `data` (trước đây `webpush.notification` thiếu title/body nên một số máy hiện thông báo trống/không hiện).
   - **Bộ quét dự phòng mỗi phút** (`sweepOrderStatus`): nếu shipper bấm nhận đơn xong tắt app/mất mạng khiến cuộc gọi báo trạng thái bị rớt, Apps Script vẫn tự quét đơn vừa đổi trạng thái trong 15 phút gần nhất và đẩy thông báo cho khách. Chống gửi trùng với đường web gọi trực tiếp — khách chỉ nhận **1** thông báo cho mỗi lần đổi trạng thái.

## Các bước deploy (theo thứ tự, làm đủ cả 3 phần)

### A. Đăng file lên GitHub (ghi đè)
`index.html`, `app.js`, `fb.js`, `style.css`, `firebase-messaging-sw.js`, `push-config.js`
(và giữ nguyên các file còn lại). File `firebase-messaging-sw.js` **phải nằm ở thư mục gốc**, cạnh `index.html`.

### B. Firestore Rules
Bản rules lần này **không đổi** so với bản đang chạy (đã có sẵn mục `users/{uid}/devices`).
Chỉ khi đang dùng rules cũ hơn mới cần: Firebase Console → Firestore → Rules → dán toàn bộ `firestore.rules` → Publish.

### C. Cập nhật Apps Script — QUAN TRỌNG, có thêm việc mới
1. Dán toàn bộ `google-apps-script.gs` vào script (giữ nguyên các hằng số bạn đã điền: FOLDER_ID, API key, email…).
2. Thay `appsscript.json`: trong trình soạn thảo Apps Script, mở *Project Settings → bật “Show appsscript.json manifest file in editor”*, rồi dán toàn bộ file `appsscript.json` trong gói này — **bản mới có thêm quyền `script.scriptapp`**, thiếu quyền này là bộ quét mỗi phút không tạo được.
3. Chạy hàm **`checkPushAccess`** một lần → Execution log phải ra **OK**.
4. Chạy hàm **`installTrigger`** một lần → log ra *“OK – đã bật quét đơn mỗi phút”*. (Chạy lại nhiều lần cũng không tạo trùng. Muốn tắt: chạy `removeTrigger`.)
5. **Deploy → Manage deployments → Edit → New version → Deploy** (giữ nguyên URL Web app).

### D. Điều kiện tiên quyết (chỉ kiểm tra nếu chưa từng làm)
- **Khóa VAPID** đã có trong `push-config.js` (đã điền sẵn).
- **Firebase Cloud Messaging API (V1)** đã bật: Firebase Console → ⚙ Project settings → tab Cloud Messaging phải thấy trạng thái Enabled.

## Khách nhận thông báo khi nào
Đặt đơn thành công · Quán đã nhận · Đang chuẩn bị · Món sẵn sàng · **Shipper đã nhận đơn (kèm tên + SĐT)** · Giao thành công · Đơn bị hủy.
Khách tự hủy đơn của mình thì không nhận thông báo đẩy (chính họ vừa thao tác) — bộ quét dự phòng cũng bỏ qua đơn hủy để tránh báo nhầm.

## Cách thử (5 phút)
1. Điện thoại khách: mở web → đăng nhập → *Cá nhân → Thông báo đơn hàng* → **Bật thông báo** (trạng thái phải hiện “Đang bật”).
2. **Thoát hẳn web** (vuốt đóng tab/trình duyệt), đặt 1 đơn thử bằng tài khoản khác hoặc nhờ người nhà đặt.
3. Shipper đăng nhập `quanly.html` → bấm **Nhận đơn này** → điện thoại khách phải hiện thông báo **“Shipper đã nhận đơn 🛵”** kèm tên + SĐT shipper, dù web đang đóng.
4. Shipper bấm **Đã giao xong** → khách nhận tiếp thông báo “Giao hàng thành công 🎉”.
5. Mở lại web → mục *Đang giao / Xem chi tiết / Theo dõi đơn* phải thấy tên + SĐT shipper và nút gọi.

## Lưu ý
- **Android / máy tính** (Chrome, Edge, Firefox): hoạt động ngay, web chạy HTTPS (GitHub Pages đã có).
- **iPhone**: chỉ nhận được khi khách **Thêm vào Màn hình chính** (Safari → Chia sẻ → Thêm vào MH chính), mở web từ biểu tượng đó và bật thông báo trong đó; cần iOS 16.4 trở lên.
- Đăng xuất thì máy đó bị gỡ khỏi danh sách nhận tin của tài khoản (đăng nhập lại tự đăng ký lại nếu quyền vẫn còn).
- Token hết hạn tự bị xóa khi FCM trả lỗi `UNREGISTERED`.
- Không thấy thông báo: mở F12 → Console xem dòng `[Báo trạng thái đơn]` (phải có `sent ≥ 1`; `devices: 0` nghĩa là khách chưa có token — chưa bật thông báo hoặc chưa lưu được token); trong Apps Script xem **Executions** của `sweepOrderStatus` / `notifyStatus` để thấy dòng `FCM ...` báo lỗi gì.
