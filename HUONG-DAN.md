# Hướng dẫn đưa website "Lâm Thao Ăn Gì?" chạy dữ liệu thật

Website gồm 4 giao diện, dùng chung một cơ sở dữ liệu Firebase:

| Trang | Đường dẫn | Ai dùng |
| --- | --- | --- |
| Khách hàng | `index.html` | Khách đặt món, theo dõi đơn |
| Admin | `admin.html` | Chủ website: quản lý quán, đơn, người dùng, khuyến mãi, liên hệ |
| Nhà bán hàng | `seller.html` | Chủ quán: nhận đơn, sửa thực đơn, bật/tắt mở cửa |
| Shipper | `shipper.html` | Tài xế: nhận đơn đã xong món, giao và hoàn thành |

Khi `firebase-config.js` **chưa điền**, website tự chạy chế độ DEMO với dữ liệu mẫu (không lưu gì thật).

## Luồng đơn hàng
Khách đặt → (Chờ xác nhận; shipper đã thấy đơn ngay) → Quán nhận đơn → Quán đang chuẩn bị → Quán báo món xong (Chờ shipper) → Shipper nhận (Đang giao) → Shipper bấm đã giao (Hoàn thành). Quán và Admin có thể hủy đơn.

## Thiết lập (làm một lần, ~15 phút)

1. Vào https://console.firebase.google.com → **Add project** (tên tùy ý, tắt Google Analytics được).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
   (Website đăng nhập bằng *số điện thoại + mật khẩu*; số điện thoại được đổi thành email nội bộ `SĐT@lamthaoangi.app`, không tốn tiền SMS.)
3. **Authentication → Settings → Authorized domains → Add domain:** `lamthaoangi1-hub.github.io`
4. **Build → Firestore Database → Create database** → chọn vị trí `asia-southeast1` (Singapore) → chế độ **Production**.
5. Tab **Rules** của Firestore: xóa nội dung cũ, dán toàn bộ file `firestore.rules` trong thư mục này → **Publish**.
6. **Project settings (biểu tượng bánh răng) → Your apps → biểu tượng Web `</>`** → đăng ký app → copy khối `firebaseConfig` và dán vào file **`firebase-config.js`** (thay các chữ `DAN_...`).
7. Tải toàn bộ file lên GitHub (ghi đè bản cũ), đợi ~1 phút. Mở website, bấm Ctrl+F5.

## Tạo tài khoản Admin (chỉ làm một lần)
1. Trên website, vào **Cá nhân → Đăng ký** bằng số điện thoại của bạn.
2. Firebase Console → **Firestore Database → Data → collection `users`** → mở tài liệu vừa tạo → sửa trường `role` từ `customer` thành **`admin`**.
3. Mở `admin.html`, đăng nhập. (Trên website, mục Cá nhân sẽ có thêm "Trang Admin".)

## Thêm quán, chủ quán, shipper
1. **Admin → Cửa hàng → Thêm cửa hàng:** nhập tên, loại, địa chỉ, SĐT, phí ship, thực đơn... (Có nút "Thêm 2 quán mẫu" để thử.)
2. Chủ quán và shipper **tự đăng ký tài khoản trên website** như khách.
3. **Admin → Người dùng:** chọn vai trò `seller` (kèm chọn **cửa hàng**) hoặc `shipper` cho họ.
4. Họ mở `seller.html` / `shipper.html` (hoặc bấm mục tương ứng trong Cá nhân) để làm việc. Trang quán/shipper phát tiếng "ting" khi có đơn mới (cần để trang mở).
5. Chủ quán tự sửa: thực đơn, giá, món hết, mở/đóng cửa, phí ship, giảm giá, ảnh. Tên quán, loại, đánh giá do Admin sửa.

## Ảnh quán
Bấm **Tải ảnh lên** (xem mục "Lưu ảnh lên Google Drive" bên dưới). Các quán cũ đang dùng tên file như `pho.jpg` vẫn hiển thị bình thường.

## Lưu ảnh lên Google Drive (tải ảnh logo quán, ảnh món)
Admin và chủ quán bấm **Tải ảnh lên** là ảnh được nén rồi lưu vào thư mục Google Drive của bạn, không cần dán link. Thiết lập một lần:

1. Vào https://drive.google.com → tạo thư mục mới, ví dụ **lamthaoangi-anh**. Mở thư mục đó, nhìn thanh địa chỉ: `drive.google.com/drive/folders/`**`1AbC...xyz`** – đoạn chữ sau `folders/` chính là **ID thư mục**, hãy copy lại.
2. Vào https://script.google.com → **New project** (Dự án mới). Xóa hết code mẫu, dán toàn bộ nội dung file **`google-apps-script.gs`** vào.
3. Ở dòng `const FOLDER_ID = '...'` thay `DAN_ID_THU_MUC_DRIVE_VAO_DAY` bằng ID thư mục vừa copy (giữ dấu nháy). Bấm biểu tượng đĩa mềm để lưu.
4. Bấm **Deploy → New deployment** → bánh răng **Select type → Web app**. Điền: *Execute as* = **Me**, *Who has access* = **Anyone** → **Deploy**.
5. Google hỏi cấp quyền: **Authorize access** → chọn tài khoản → nếu hiện "Google hasn't verified this app" thì bấm **Advanced → Go to ... (unsafe) → Allow**. (Đây là script của chính bạn.)
6. Copy **Web app URL** (dạng `https://script.google.com/macros/s/.../exec`).
7. Mở file **`upload-config.js`**, dán URL vào giữa hai dấu nháy: `export const UPLOAD_URL = "https://script.google.com/macros/s/.../exec";` rồi tải file lên GitHub (ghi đè).
8. Mở trang Admin hoặc Nhà bán hàng, nhấn Ctrl+F5, bấm **Tải ảnh lên**. Sau khi ảnh hiện, **nhớ bấm nút Lưu** của form.

Ghi chú: chỉ tài khoản admin hoặc seller đã đăng nhập mới tải ảnh được (script tự kiểm tra). Ảnh được đặt chế độ "ai có link đều xem được" để khách thấy ảnh trên website. Nếu bạn sửa code script sau này, phải **Deploy → Manage deployments → Edit → New version** thì mới có hiệu lực. Tài khoản Google Workspace của công ty/trường có thể chặn chia sẻ công khai; dùng Gmail cá nhân sẽ không gặp.

## Thông báo đơn mới qua Gmail và Zalo
Mỗi khi khách đặt đơn, website gọi Google Apps Script (cùng script lưu ảnh) để: **gửi email cho Admin** và **nhắn Zalo cho quán + Admin**. Gmail dùng ngay; Zalo cần thiết lập thêm một lần.

**A. Cập nhật script (bắt buộc)**
1. Mở script cũ trên https://script.google.com, xóa hết code, dán toàn bộ **`google-apps-script.gs`** mới.
2. Kiểm tra `ADMIN_EMAIL` (Gmail nhận đơn) và (tuỳ chọn) `SITE_URL`. Lưu.
3. Chạy hàm **`testNotify`** (chọn hàm → Run) → cấp quyền gửi mail → Gmail Admin sẽ nhận 1 mail thử.
4. **Deploy → Manage deployments → Edit (bút chì) → Version: New version → Deploy.** URL giữ nguyên nên không phải sửa `upload-config.js`.
5. Tải toàn bộ file website mới lên GitHub (ghi đè), Ctrl+F5.

**B. Bật Zalo (Zalo Bot, tạo ở Zalo Bot Creator)**
1. Lấy **token bot** (dạng `123456:abcxyz`) từ Zalo Bot Creator. Trong Apps Script: **Project Settings → Script properties → Add** → tên `ZALO_BOT_TOKEN`, giá trị là token.
2. Admin và chủ quán mở Zalo, tìm bot và **nhắn cho bot một tin bất kỳ** (bot chỉ nhắn được cho người đã nhắn nó trước).
3. Chạy hàm **`listZaloChats`** → xem **View → Logs**: mỗi dòng là `chat_id | tên | nội dung tin`.
   - Dán chat_id của Admin vào Script property **`ZALO_ADMIN_IDS`** (nhiều người cách nhau dấu phẩy).
   - Dán chat_id của **chủ quán** và **shipper** vào **Admin → Người dùng → (Nhà bán hàng / Shipper) → cột "Zalo ID"** (gõ xong bấm ra ngoài ô để lưu). Mỗi đơn mới sẽ nhắn cho Admin, chủ quán của quán đó và toàn bộ shipper có Zalo ID. Một người chỉ nhận 1 tin.
4. Chạy lại **`testNotify`** để thử nhận tin Zalo + Gmail.

Lưu ý: không được cài webhook cho bot này (webhook và getUpdates loại trừ nhau), script chỉ dùng getUpdates để lấy chat_id. Nếu Zalo lỗi, đơn vẫn đặt bình thường và mail vẫn gửi (xem lỗi ở Apps Script → Executions). Gmail thường gửi tối đa khoảng 100 mail/ngày.

## Phí giao hàng
Chỉ **Admin** sửa được phí giao hàng và mức miễn phí ship của từng quán (Admin → Cửa hàng → Sửa). Chủ quán chỉ xem được, và luật bảo mật cũng chặn chủ quán tự đổi.

## Giới hạn cần biết
- **Quên mật khẩu:** chưa có tự đặt lại (vì không dùng email thật). Cách xử lý: xóa tài khoản đó trong Firebase Console → Authentication, rồi khách đăng ký lại.
- **Giá đơn hàng** do trình duyệt khách tính; luật bảo mật chặn sửa trái phép đơn của người khác nhưng chưa kiểm tra giá theo thực đơn. Với quy mô địa phương là đủ; muốn chặt hơn cần thêm Cloud Functions.
- **Thông báo đẩy** trên điện thoại chưa có: đơn mới được báo qua Gmail/Zalo (xem mục trên); quán/shipper vẫn nên mở trang để nghe tiếng "ting".
- **Thanh toán** hiện chỉ tiền mặt khi nhận hàng.
- Gói miễn phí Firebase (Spark) giới hạn 50.000 lượt đọc/ngày – đủ cho vài chục đến vài trăm đơn mỗi ngày.
- Dịch vụ Xe ôm, Giao hàng, Mua hộ vẫn hiển thị "sắp ra mắt".

## Cấu trúc file mới
`firebase-config.js` (cấu hình) · `fb.js` (kết nối dữ liệu) · `firestore.rules` (luật bảo mật) · `admin.*`, `seller.*`, `shipper.*`, `panel.*` (3 trang quản lý) · `app.js` (website khách, đã nối dữ liệu thật).
