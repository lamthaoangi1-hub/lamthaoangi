# Thông báo đẩy về máy khách (đặt đơn / đổi trạng thái đơn)

Cách hoạt động: khách bấm **Bật thông báo** → trình duyệt cấp token → web lưu vào Firestore `users/{uid}/devices/{token}`.
Khi khách đặt đơn, hoặc Admin / Quán / Shipper đổi trạng thái đơn, web gọi Google Apps Script → script đọc token của khách và gửi tin qua Firebase Cloud Messaging (FCM). Không cần nâng gói Blaze, không cần Cloud Functions.

## Các bước làm (theo thứ tự)

1. **Lấy khóa VAPID**: Firebase Console → ⚙ Project settings → tab **Cloud Messaging** → mục **Web Push certificates** → **Generate key pair** → copy chuỗi "Key pair" dán vào `push-config.js` (`VAPID_KEY = "..."`).
2. **Bật FCM API**: Google Cloud Console (cùng project `lamthaoangi1-c01cb`) → APIs & Services → bật **Firebase Cloud Messaging API** (thường đã bật sẵn; trong tab Cloud Messaging phải thấy "Firebase Cloud Messaging API (V1): Enabled").
3. **Đăng file lên GitHub** (ghi đè): `app.js`, `fb.js`, `panel.js`, `index.html`, `push-config.js`, và file mới **`firebase-messaging-sw.js`** (phải nằm ở thư mục gốc, cạnh `index.html`).
4. **Dán luật mới**: Firebase Console → Firestore → Rules → dán toàn bộ `firestore.rules` → Publish.
5. **Cập nhật Apps Script**: dán toàn bộ `google-apps-script.gs` vào script (giữ nguyên các hằng số bạn đã điền) → chạy hàm **`checkPushAccess`** một lần, xem Execution log phải ra **OK** → **Deploy → Manage deployments → Edit → New version → Deploy** (giữ nguyên URL).
6. **Thử**: mở web bằng điện thoại, đăng nhập, bấm **Bật thông báo** → đặt 1 đơn → đổi trạng thái đơn ở trang quản lý → máy khách nhận thông báo.

## Khách nhận thông báo khi nào
Đặt đơn thành công · Quán đã nhận · Đang chuẩn bị · Món sẵn sàng · Tài xế đang giao (kèm tên, SĐT) · Giao thành công · Đơn bị hủy.
Khách tự hủy đơn của mình thì không nhận thông báo (vì chính họ vừa thao tác).

## Lưu ý
- **Android / máy tính** (Chrome, Edge, Firefox): hoạt động ngay. Web phải chạy bằng **HTTPS** (GitHub Pages đã có).
- **iPhone**: chỉ nhận được khi khách **Thêm vào Màn hình chính** (Safari → Chia sẻ → Thêm vào MH chính) và mở web từ biểu tượng đó; cần iOS 16.4 trở lên.
- Khách có thể bật/tắt trong **Cá nhân → Thông báo đơn hàng**. Đăng xuất thì máy đó bị gỡ khỏi danh sách nhận tin của tài khoản.
- Token hết hạn tự bị xóa khỏi hệ thống khi gửi lỗi `UNREGISTERED`.
- Nếu không thấy thông báo: mở F12 → Console xem dòng `[Báo trạng thái đơn]`; trong Apps Script xem **Executions** để thấy dòng `FCM ...` báo lỗi gì.
