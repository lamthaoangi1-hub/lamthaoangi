# Thay đổi 27/10/2026 — Thông báo khi khách cho phép + shipper nhận đơn + push khi thoát web

Xem cách deploy đầy đủ trong **HUONG-DAN-THONG-BAO.md** (mục “Các bước deploy”).

## File đã sửa (8)
| File | Thay đổi |
|---|---|
| `google-apps-script.gs` | Đồng bộ bản GS.txt mới nhất Hung gửi (bộ quét `sweepOrderStatus` mỗi phút + `installTrigger`, chống trùng `claimStatusPush`, rung + `requireInteraction`) — bản trong zip cũ đang thiếu các phần này. Thêm: tiêu đề push khi shipper nhận đơn đổi thành **“Shipper đã nhận đơn 🛵”** kèm tên + SĐT tài xế trong nội dung; `fcmSend` bổ sung `title`/`body` vào `webpush.notification` và thêm `data {tag, url, body}` cho service worker. |
| `appsscript.json` | Đồng bộ bản Json.txt mới nhất: thêm scope `script.scriptapp` (bắt buộc để `installTrigger` tạo được bộ hẹn giờ). |
| `firebase-messaging-sw.js` | Viết lại phần nhận tin nền: `onBackgroundMessage` tự hiện thông báo khi web đã đóng + `notificationclick` mở/chuyển tới trang Đơn hàng, không mở tab trùng. |
| `fb.js` | Đăng ký service worker với `updateViaCache:'none'` (không kẹt bản SW cũ trong cache); thêm `autoResyncPush()` — tự đồng bộ lại token khi khách quay lại web/tab, tối đa 1 lần/10 phút. |
| `app.js` | Giữ lại SĐT shipper trong dữ liệu đơn (trước đây bị bỏ); hiện thông tin shipper ở thẻ đơn Đang giao, Chi tiết đơn, Theo dõi đơn (kèm nút gọi) và trang Thông báo; gắn `autoResyncPush` khi đăng nhập; mục Thông báo khi đang bật có nút **Đăng ký lại máy này**; tăng version `fb.js`/`app.js`. |
| `style.css` | Thêm style `.shipper-line`, `.shipper-box`, `.shipper-call` cho khối thông tin shipper. |
| `index.html` | Tăng version `style.css`/`app.js` để trình duyệt tải bản mới, không dùng cache cũ. |
| `HUONG-DAN-THONG-BAO.md` | Viết lại hướng dẫn deploy + cách thử 5 phút. |

## File không đổi
`firestore.rules` giữ nguyên đúng bản Fire.txt Hung gửi (đã có sẵn mục token thiết bị `users/{uid}/devices`).
Toàn bộ file còn lại giữ nguyên bản trong zip Hung gửi.

## Đã kiểm thử
- Cú pháp: `app.js`, `fb.js`, `firebase-messaging-sw.js`, `google-apps-script.gs` — PASS.
- Logic Apps Script (chạy giả lập): nội dung push “Shipper đã nhận đơn” có đủ tên + SĐT; payload FCM có đủ `notification`, `webpush.notification` (title/body) và `data` — **12/12 PASS**.
- Logic service worker (chạy giả lập): nhận tin nền → hiện đúng thông báo tên/SĐT shipper; bấm vào thông báo → mở `/#orders` — PASS.
- Chưa thử được trên máy thật + Firebase thật: cần Hung deploy rồi thử theo mục “Cách thử (5 phút)” trong HUONG-DAN-THONG-BAO.md (bước bắt buộc mới: chạy `installTrigger` 1 lần trong Apps Script).
