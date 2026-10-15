# Hướng dẫn đưa website "Lâm Thao Ăn Gì?" chạy dữ liệu thật

Website gồm 4 giao diện, dùng chung một cơ sở dữ liệu Firebase:

| Trang | Đường dẫn | Ai dùng |
| --- | --- | --- |
| Khách hàng | `index.html` | Khách đặt món, theo dõi đơn |
| Admin | `quanly.html` (link chung) | Chủ website: quản lý quán, đơn, người dùng, khuyến mãi, liên hệ |
| Nhà bán hàng | `quanly.html` (link chung) | Chủ quán: nhận đơn, sửa thực đơn, bật/tắt mở cửa |
| Shipper | `quanly.html` (link chung) | Tài xế: nhận đơn đã xong món, giao và hoàn thành |

Khi `firebase-config.js` **chưa điền**, website tự chạy chế độ DEMO với dữ liệu mẫu (không lưu gì thật).

> **Link đăng nhập chung:** `https://lamthaoangi.io.vn/quanly.html` — Admin, Nhà bán hàng, Shipper cùng dùng 1 link; hệ thống tự mở đúng giao diện theo vai trò. Các link cũ `admin.html`, `seller.html`, `shipper.html` vẫn dùng được (tự chuyển sang link chung).

## Luồng đơn hàng
Khách đặt (shipper và quán thấy đơn ngay, shipper nhận Zalo "Có đơn mới") → Shipper nhận đơn (Đang giao) → Shipper bấm đã giao (Hoàn thành). Quán chỉ xem đơn, không đổi được trạng thái. Admin đổi trạng thái hoặc hủy đơn được; khách tự hủy được khi shipper chưa nhận.

## Thiết lập (làm một lần, ~15 phút)

1. Vào https://console.firebase.google.com → **Add project** (tên tùy ý, tắt Google Analytics được).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
   (Website đăng nhập bằng *số điện thoại + mật khẩu*; số điện thoại được đổi thành email nội bộ `SĐT@lamthaoangi.app`, không tốn tiền SMS.)
3. **Authentication → Settings → Authorized domains → Add domain:** thêm **`lamthaoangi.io.vn`** (tên miền chính) và `lamthaoangi1-hub.github.io` (link GitHub). Thiếu tên miền chính thì đăng nhập/đăng ký trên `lamthaoangi.io.vn` sẽ báo lỗi.
4. **Build → Firestore Database → Create database** → chọn vị trí `asia-southeast1` (Singapore) → chế độ **Production**.
5. Tab **Rules** của Firestore: xóa nội dung cũ, dán toàn bộ file `firestore.rules` trong thư mục này → **Publish**.
6. **Project settings (biểu tượng bánh răng) → Your apps → biểu tượng Web `</>`** → đăng ký app → copy khối `firebaseConfig` và dán vào file **`firebase-config.js`** (thay các chữ `DAN_...`).
7. Tải toàn bộ file lên GitHub (ghi đè bản cũ), đợi ~1 phút. Mở website, bấm Ctrl+F5.

## Tạo tài khoản Admin (chỉ làm một lần)
1. Trên website, vào **Cá nhân → Đăng ký** bằng số điện thoại của bạn.
2. Firebase Console → **Firestore Database → Data → collection `users`** → mở tài liệu vừa tạo → sửa trường `role` từ `customer` thành **`admin`**.
3. Mở `https://lamthaoangi.io.vn/quanly.html`, đăng nhập bằng chính số điện thoại đó. (Các trang quản lý không còn hiện trong mục Cá nhân của website; hãy lưu link `quanly.html`.)

## Thêm quán, chủ quán, shipper
1. **Admin → Cửa hàng → Thêm cửa hàng:** nhập tên, loại, địa chỉ, SĐT, phí ship, thực đơn... (Có nút "Thêm 2 quán mẫu" để thử.)
2. Chủ quán và shipper **tự đăng ký tài khoản trên website** như khách.
3. **Admin → Người dùng:** chọn vai trò `seller` (kèm chọn **cửa hàng**) hoặc `shipper` cho họ.
4. Họ mở cùng link `quanly.html` để làm việc (nên chọn "Thêm vào màn hình chính" trên điện thoại). Trang quán/shipper phát tiếng "ting" khi có đơn mới (cần để trang mở).
5. Chủ quán tự sửa: thực đơn, giá, món hết, mở/đóng cửa, giảm giá, ảnh, địa chỉ, SĐT, vị trí GPS (chỉ lưu được 1 lần). Tên quán, loại, đánh giá và **phí giao hàng** do Admin sửa.

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

## Phí giao hàng (tính theo khoảng cách)
Phí tính từ khoảng cách quán → vị trí khách chia sẻ: **3,5 km đầu 15.000đ, mỗi km tiếp theo +3.000đ** (km lẻ tính tròn lên). Khoảng cách = đường chim bay × 1,3 (hệ số đường đi), làm tròn 0,1 km. Khách chia sẻ vị trí xong, form xác nhận hiện đúng "Quãng đường ~X km" và phí ship trước khi bấm Đặt đơn; shipper cũng thấy quãng đường trên đơn.
- Admin → tab **Liên hệ** → mục "Phí giao hàng theo khoảng cách": đổi phí cơ bản, số km đầu, giá mỗi km, hệ số đường đi.
- Quán **bắt buộc đã lưu vị trí GPS** (chủ quán bấm "Chia sẻ vị trí quán"). Quán chưa có GPS tạm dùng phí cố định ghi ở Admin → Cửa hàng → Sửa.
- "Miễn phí cơ bản từ đơn": đơn đạt mức này chỉ được miễn phần phí cơ bản, vẫn trả phần km vượt.

## Cài đặt Liên hệ và Trung tâm hỗ trợ
Admin → tab **Liên hệ**: nhập **Hotline**, **Email**, **Zalo** (số điện thoại hoặc link `zalo.me/...`) → **Lưu**. Mục **Trung tâm hỗ trợ**, **Liên hệ** và **Quên mật khẩu** của khách tự hiện đúng các nút này (Zalo mở thẳng chat với Admin); mục nào để trống thì không hiện.

## Danh sách việc trước khi mở bán thật
1. Firebase → Authentication → Authorized domains: đã có `lamthaoangi.io.vn`.
2. Firebase → Firestore → Rules: dán lại toàn bộ `firestore.rules` mới nhất → **Publish**.
3. GitHub → Settings → Pages: tên miền `lamthaoangi.io.vn` và bật **Enforce HTTPS** (bắt buộc, không có HTTPS thì điện thoại không cho lấy vị trí GPS).
4. Apps Script: dán lại `google-apps-script.gs` mới + `appsscript.json` → chạy `checkResetAccess` → **Deploy → Manage deployments → Edit → New version**; chạy `testNotify` để thử.
5. Admin → Cửa hàng: nhập đủ tên, địa chỉ, SĐT, thực đơn thật cho từng quán; xóa quán/đơn thử.
6. Mỗi chủ quán đăng nhập `quanly.html` → tab Cửa hàng → bấm **Chia sẻ vị trí quán** (đứng tại quán).
7. Admin → Liên hệ: nhập Hotline, Email, Zalo; chỉnh phí giao hàng theo ý.
8. Admin → Khuyến mãi: xóa mã thử, tạo mã thật.
9. Admin → Người dùng: gán vai trò `seller` / `shipper`, nhập Zalo ID để nhận báo đơn (xem mục Zalo ở trên).
10. Đặt thử 1 đơn bằng điện thoại thật: quán thấy đơn, shipper nhận được, khách thấy trạng thái đổi, hoàn thành đơn.
11. Đọc lại **Chính sách & Điều khoản** trong website (nội dung ở hàm `POLICY` trong `app.js`) và sửa cho đúng quy định bạn áp dụng.

## Đặt lại mật khẩu cho người dùng (Admin)
Admin → tab **Người dùng** → bấm **Đặt lại MK** ở cuối dòng người cần đổi → nhập mật khẩu mới (hoặc **Tạo mật khẩu ngẫu nhiên**) → **Đặt mật khẩu** → **Sao chép tin nhắn** gửi cho họ. Dùng được cho khách, chủ quán, shipper. Mật khẩu cũ ngừng dùng ngay.

Thiết lập một lần (vì trình duyệt không được phép đổi mật khẩu người khác nên việc này do Apps Script làm):
1. Apps Script → dán lại toàn bộ `google-apps-script.gs` mới.
2. **Project Settings (bánh răng)** → tick **Show "appsscript.json" manifest file in editor** → quay lại Editor, mở `appsscript.json` và dán đè nội dung file `appsscript.json` đi kèm (có thêm quyền `cloud-platform`).
3. Chọn hàm **`checkResetAccess`** → **Run** → cấp quyền khi Google hỏi. Xem **Execution log**: thấy `OK` là xong. Nếu báo lỗi 403 *API not enabled*: vào https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com , chọn project `lamthaoangi1-c01cb` → **Enable**, rồi chạy lại. (Tài khoản Google dùng để triển khai script phải là Owner/Editor của project Firebase.)
4. **Deploy → Manage deployments → Edit → New version → Deploy.** URL giữ nguyên.
5. Tải `fb.js` và `admin.js` mới lên GitHub rồi nhấn Ctrl+F5.

Bảo mật: script chỉ chấp nhận khi người gọi đăng nhập bằng tài khoản có vai trò `admin` trong Firestore; mật khẩu không được ghi vào log.

## Đưa website lên Google (SEO)
Không ai cam kết được "top 1" tuyệt đối, nhưng với cụm tên riêng **"Lâm Thao Ăn Gì"** thì làm đủ các bước dưới đây thường lên đầu kết quả sau vài ngày đến vài tuần. Website đã được thêm sẵn: tiêu đề/mô tả chuẩn, thẻ canonical, Open Graph (ảnh chia sẻ `og-image.jpg`), dữ liệu có cấu trúc JSON-LD, `robots.txt`, `sitemap.xml`. Bạn cần làm thêm:
1. Tải lên GitHub: `index.html`, `robots.txt`, `sitemap.xml`, `og-image.jpg`. Kiểm tra `https://lamthaoangi.io.vn/robots.txt` và `/sitemap.xml` mở được.
2. Vào https://search.google.com/search-console → **Add property** → chọn **Domain** `lamthaoangi.io.vn` (Google đưa 1 dòng TXT, thêm vào DNS ở nơi bạn mua tên miền) hoặc **URL prefix** `https://lamthaoangi.io.vn/` (xác minh bằng thẻ HTML: dán vào chỗ có ghi chú trong `index.html`).
3. Search Console → **Sitemaps** → nhập `sitemap.xml` → Submit.
4. Search Console → ô **URL Inspection** (kiểm tra URL) dán `https://lamthaoangi.io.vn/` → **Request indexing**.
5. Tạo **Google Business Profile** (Google Maps) cho "Lâm Thao Ăn Gì" tại https://business.google.com : điền địa chỉ/khu vực phục vụ Lâm Thao, SĐT, link website. Đây là cách nhanh nhất để hiện khung thông tin bên phải kết quả tìm kiếm.
6. Tạo Fanpage Facebook, nhóm Zalo, kênh TikTok cùng tên "Lâm Thao Ăn Gì" và để **link website** ở phần giới thiệu; nhờ các quán, nhóm cộng đồng Lâm Thao chia sẻ link. Liên kết từ các trang uy tín giúp Google tin tưởng và xếp hạng cao hơn.
7. Dùng đúng cụm "Lâm Thao Ăn Gì" thống nhất ở mọi nơi (tên, ảnh đại diện, mô tả). Kiểm tra sau 1–2 tuần bằng cách tìm `site:lamthaoangi.io.vn` trên Google: có kết quả là đã được lập chỉ mục.

## Giao hàng & Mua hộ (đã mở)
Trang chủ → bấm **Giao hàng** hoặc **Mua hộ** (cần đăng nhập). **Xe ôm** vẫn "sắp ra mắt".
- **Tính phí ngay khi chọn điểm:** khách bấm "Ghim điểm trên bản đồ", kéo bản đồ để đưa ghim đỏ vào đúng chỗ (có ô tìm địa chỉ và nút "Vị trí của tôi"). Phí hiện ngay khi kéo, theo đúng công thức phí ship của Admin (phí cơ bản + mỗi km tiếp theo, hệ số đường đi). Bản đồ dùng OpenStreetMap + Leaflet, miễn phí, không cần khóa API.
- **Giao hàng:** khách chọn điểm lấy hàng, người nhận, loại hàng, khối lượng, tiền thu hộ (COD), ai trả phí. **Mua hộ:** khách ghi danh sách, nơi mua (ghim vị trí), tiền ứng trước tối đa; tiền hàng trả theo hóa đơn thực tế.
- **Admin → Liên hệ → Phí giao hàng:** có thêm 3 ô: phụ phí hàng 5–10 kg, phụ phí trên 10 kg, phí mua hộ. Quãng đường tối đa là 50 km.
- **Shipper** nhận đơn như đơn đồ ăn trong `quanly.html`; thẻ đơn hiện thêm tiền thu hộ, ứng trước, ai trả phí. Admin thấy các đơn này trong tab Đơn hàng (tên "Giao hàng" / "Mua hộ"). Quán không thấy đơn loại này.
- **Cách cập nhật:** (1) tải toàn bộ file mới lên GitHub; (2) Firebase → Firestore → Rules: dán lại `firestore.rules` → Publish (bắt buộc, nếu không đơn Giao hàng/Mua hộ sẽ bị từ chối); (3) Apps Script: dán lại `google-apps-script.gs` → Deploy → New version (để báo Zalo/Gmail đúng nội dung); (4) Ctrl+F5.
- **Lưu ý vận hành:** tìm địa chỉ tự động ở vùng nông thôn chưa chính xác, hãy hướng dẫn khách ghim vị trí trên bản đồ. Phí tính theo đường chim bay × hệ số, nên nếu thấy chênh thực tế thì chỉnh hệ số đường đi trong Admin.

## Bản đồ Goong (khuyến nghị)
Bản đồ và tìm địa chỉ ở Lâm Thao chính xác hơn khi dùng Goong. Làm một lần:
1. Đăng nhập https://account.goong.io → **Keys** → **Tạo Key**, tạo **2 khóa**: một khóa loại **Maptiles**, một khóa loại **API Key**.
2. Với **mỗi** khóa, bấm sửa → **URL restrictions** → thêm `https://lamthaoangi.io.vn/*` (bắt buộc, vì khóa nằm công khai trong website).
3. Mở file `goong-config.js`, dán khóa Maptiles vào `GOONG_MAP_KEY`, khóa API vào `GOONG_API_KEY`. Tải file lên GitHub, nhấn Ctrl+F5.
4. Mở bản đồ chọn điểm: dòng nhỏ dưới bản đồ ghi **Nguồn bản đồ: Goong** là thành công. Nếu Goong lỗi (sai khóa, hết hạn mức) hệ thống tự quay về bản đồ miễn phí.
5. Theo dõi lượt dùng ở account.goong.io → Tổng quan. Gói Free hiện có 120.000 lượt tải bản đồ/tháng và 1.000 lượt gọi API/ngày (mỗi lần khách tìm địa chỉ tốn 1–2 lượt).

## Freeship theo từng quán (Admin)
Admin → Cửa hàng → bấm Sửa quán → mục **Miễn phí ship cho đơn từ (đ)**: nhập mức (100000, 200000…) hoặc bấm nhanh **Từ 100K / 150K / 200K / 300K / Tắt freeship**. Mỗi quán đặt một mức riêng.
- Tick **Miễn phí TOÀN BỘ phí giao**: đơn đạt mức thì khách không phải trả ship (kể cả km vượt). Bỏ tick: chỉ miễn phần phí cơ bản, khách vẫn trả km vượt.
- Khách thấy nhãn "Freeship từ …K" ở quán, và ở giỏ hàng có dòng gợi ý "Mua thêm … để được miễn phí giao hàng". Chủ quán không tự đổi được mức này.
- Tiền ship được miễn do **quán/nền tảng chịu**: shipper vẫn nhận phí ship bình thường theo quy định của bạn. Hãy tính trước để không bị lỗ.

## Nút Zalo nổi
Góc phải dưới màn hình khách luôn có nút Zalo, bấm vào mở chat Zalo số **0978472704**. Muốn đổi số/link: Admin → Liên hệ → ô Zalo (nếu có nhập thì dùng số đó), hoặc sửa `href` của thẻ `zalo-fab` trong `index.html`.

## Giới hạn cần biết
- **Quên mật khẩu:** người dùng nhắn Admin (Zalo/hotline), Admin vào **Người dùng → Đặt lại MK** (xem mục "Đặt lại mật khẩu" bên dưới). Chưa có tự đặt lại vì không dùng email thật.
- **Giá đơn hàng** do trình duyệt khách tính; luật bảo mật chặn sửa đơn người khác và chặn giá trị vô lý (âm, giảm quá tạm tính, phí ship quá cao) nhưng chưa đối chiếu giá từng món với thực đơn. Với quy mô địa phương là đủ; muốn chặt hơn cần thêm Cloud Functions.
- **Thông báo đẩy** trên điện thoại chưa có: đơn mới được báo qua Gmail/Zalo (xem mục trên). Shipper/quán cần **mở sẵn trang `quanly.html`** và chạm vào màn hình 1 lần để có tiếng "ting"; trang tự giữ màn hình sáng khi đang mở.
- **Thanh toán** hiện chỉ tiền mặt khi nhận hàng.
- Gói miễn phí Firebase (Spark) giới hạn 50.000 lượt đọc/ngày – đủ cho vài chục đến vài trăm đơn mỗi ngày.
- Dịch vụ Xe ôm, Giao hàng, Mua hộ vẫn hiển thị "sắp ra mắt".

## Cấu trúc file mới
`firebase-config.js` (cấu hình) · `fb.js` (kết nối dữ liệu) · `firestore.rules` (luật bảo mật) · `admin.*`, `seller.*`, `shipper.*`, `panel.*` (3 trang quản lý) · `app.js` (website khách, đã nối dữ liệu thật).
