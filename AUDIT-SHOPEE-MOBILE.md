# Rà soát website hiện tại + bản giao diện Shopee-mobile

## 1. Đây là website nào? (quan trọng, tránh nhầm)
File bạn gửi KHÔNG phải bản Next.js/Supabase mình làm trước đó. Đây là website
đang chạy thật tại `lamthaoangi.io.vn` (xem `CNAME`): **HTML/CSS/JS thuần, không
cần build, host GitHub Pages, dữ liệu Firebase**. Vì vậy bản update này được làm
trên đúng bản Firebase này, không ghi đè bản Next.js kia.

## 2. Kiến trúc hiện tại
- Khách (`index.html` + `app.js` ~126KB + `style.css`): Trang chủ, Đơn hàng,
  Yêu thích, Thông báo, Cá nhân, Đăng nhập. Dịch vụ: Đồ ăn, Xe ôm, Giao hàng,
  Mua hộ. Tìm kiếm, danh mục, banner, quán, trang quán, giỏ, checkout dạng
  bottom-sheet, bản đồ chọn điểm (Leaflet/OSM + Goong), theo dõi đơn, đặt lại.
- Quản lý (`quanly.html` + `panel.js`): Admin / Nhà bán hàng / Shipper chung
  1 cổng. Admin quản lý người dùng, vai trò, quán, mã giảm giá, cài đặt
  (thông báo Zalo, tài khoản ngân hàng), doanh thu. Seller quản lý thực đơn
  trong document quán, giờ mở cửa (thủ công + tự động theo khung giờ).
  Shipper xem đơn mở, nhận đơn, bấm đã giao xong.
- Dữ liệu Firestore: `users`, `shops`, `orders`, `promos`, `settings/app`,
  `settings/notify`. Ảnh: Google Drive qua Google Apps Script. Thông báo đơn
  mới: Gmail cho admin + Zalo Bot cho quán/admin/shipper (Apps Script, chống
  gửi trùng bằng cache 6 giờ + lock).
- Đơn hàng: trạng thái `pending → confirmed → preparing → ready →
  delivering → done`, hoặc `cancelled`. Khách chỉ hủy khi còn `pending`.
  Thanh toán: tiền mặt, hoặc chuyển khoản VietQR (QR từ vietqr.io, nội dung
  CK = mã đơn, admin xác nhận đã nhận tiền thủ công, khách chỉ bấm "đã chuyển").
- Phí ship (trong `app.js`, hàm `shipQuote`/`calc`): 15.000đ cho 3,5 km đầu
  (khoảng cách chim bay × 1,3), +3.000đ mỗi km tiếp theo (làm tròn lên).
  Freeship theo ngưỡng từng quán; quán chưa có GPS thì dùng phí cố định cũ.
  Đặt đơn đồ ăn bắt buộc phải chia sẻ vị trí GPS (luật Firestore cũng bắt buộc
  `lat`/`lng`).

## 3. Kết quả rà soát — cái nào tốt, cái nào cần sửa
### Đang làm tốt
- Firestore Rules khá chặt ở nhiều chỗ: khách chỉ tạo đơn của mình, tổng tiền
  phải khớp `subtotal - discount + shipFee`, chặn tự gắn shipper, chặn tự đánh
  dấu đã trả tiền, seller không được đổi `shipFee`/`freeShipMin` (chỉ admin),
  `settings/notify` (chứa Zalo ID) chỉ admin đọc, quán đóng cửa (tắt tay hoặc
  ngoài giờ tự động) thì không tạo được đơn.
- Upload ảnh kiểm tra quyền admin/seller, chỉ JPG/PNG/WEBP, tối đa 3MB.
- Thông báo đơn mới có chống gửi trùng; nút đặt đơn bị disable sau khi bấm.

### Rủi ro cần sửa trước khi mở rộng (theo thứ tự)
1. **Giá món chưa được xác thực ở server.** Rules chỉ kiểm tra tổng tiền khớp
   với `subtotal/discount/shipFee` do client gửi, KHÔNG đối chiếu giá từng món
   với thực đơn của quán, cũng không kiểm tra % giảm của quán hay mã giảm giá.
   Người biết dùng Firestore API có thể tự tạo đơn với giá món thấp nhưng tổng
   vẫn khớp công thức. Cách sửa đúng: chuyển tạo đơn sang Cloud Function /
   Apps Script xác thực giá theo `shops/{id}.menu` rồi mới ghi đơn (hoặc ít
   nhất ghi lại giá gốc để admin đối soát). Đừng chỉ dựa vào rules hiện tại.
2. **Không có idempotency key cho đơn hàng.** Mã đơn là `LT + 6 số cuối của
   Date.now()`, nút đặt bị disable nhưng nếu mạng gửi lại / người dùng thao
   tác nhanh vẫn có thể tạo 2 đơn trùng. Nên thêm key chống trùng ở client +
   kiểm tra ở phía ghi đơn.
3. **Shipper nhận đơn không dùng transaction.** `shipper.js` chỉ `patchOrder`
   sang `delivering`. Trên thực tế Firestore sẽ serialize các lần ghi nên lần
   ghi thứ hai thường bị rules chặn (vì đơn đã sang `delivering`), nhưng vẫn
   nên dùng transaction / Cloud Function để đảm bảo chỉ 1 shipper thắng và
   trả lỗi rõ ràng, thay vì dựa vào may rủi về thứ tự ghi.
4. **File cấu hình chứa key trong repo.** `firebase-config.js`,
   `goong-config.js` và `google-apps-script.gs` (bản bạn gửi) chứa key dạng
   text. Key web Firebase và Goong vốn phải chạy ở trình duyệt nên không giấu
   hoàn toàn được, nhưng BẮT BUỘC phải: giới hạn Firebase key chỉ cho Identity
   Toolkit + Firestore và giới hạn HTTP referrer `lamthaoangi.io.vn`; giới
   hạn Goong key theo domain; Zalo Bot token PHẢI ở Script Properties (hiện
   code đã làm đúng chỗ này — giữ nguyên, đừng bao giờ dán token vào file).
   Đừng gửi file zip này lên nơi công khai khi chưa siết các giới hạn trên.
5. **Không có nhật ký thao tác (audit log).** Admin đổi vai trò, đặt lại mật
   khẩu, sửa giá — hiện không lưu ai làm, lúc nào. Nên thêm collection
   `audit_logs` khi làm bản nâng cấp.
6. **Quán đọc công khai (`shops` allow read: true).** Đây là chủ đích để khách
   xem quán, nhưng hãy chắc document quán không chứa trường nhạy cảm nào
   (số tài khoản, Zalo ID riêng, ghi chú nội bộ).

## 4. Bản update giao diện Shopee-mobile (trong thư mục này)
- Chỉ thêm **1 file mới**: `shopee-mobile.css`, và sửa 2 dòng trong
  `index.html` (theme-color + nạp file CSS mới sau `style.css`) + 1 dòng
  `theme_color` trong `manifest.json`. **Không sửa `app.js`, `fb.js`,
  `firestore.rules` hay bất kỳ logic/dữ liệu nào** — đã kiểm chứng bằng
  `diff`: ngoài 2 file trên + file CSS mới, mọi file còn lại giống hệt bản gốc.
- Đổi nhận diện từ xanh lá sang **cam Shopee `#ee4d2d`** (gradient header
  `#f53d2d → #ff6633`), nền xám `#f5f5f5`, thẻ trắng bo 12.
- Mobile-first 100%: khung app chiếm toàn bộ chiều rộng điện thoại (trên màn
  hình lớn mới giới hạn 540px để không vỡ bố cục), header gọn (ẩn ảnh Đền
  Hùng lớn, logo thu nhỏ), ô tìm kiếm bo 8 cao 44px, banner thấp 120px,
  danh mục/chip cuộn ngang, **danh sách quán thành lưới 2 cột kiểu Shopee**
  (ảnh lớn trên, tên/meta/tag dưới), nút chính và nút `+` cao 44–52px (đủ
  chạm ngón tay), thanh điều hướng dưới 56px + vùng an toàn tai thỏ, bottom
  sheet cao tối đa 92%, input giữ 16px để iOS không tự phóng to.
- Cổng quản lý (`quanly.html`/`panel.css`) giữ nguyên trong đợt này để không
  làm vỡ bảng admin/seller/shipper; nếu bạn muốn, đợt sau sẽ làm riêng giao
  diện mobile cho cổng quản lý.

## 5. Cách đưa bản mới lên web (GitHub Pages)
1. Sao chép toàn bộ thư mục này đè lên repo GitHub Pages hiện tại (giữ nguyên
   `CNAME`).
2. Commit + push lên nhánh `main`. GitHub Pages sẽ tự deploy trong vài phút.
3. Mở `https://lamthaoangi.io.vn` trên điện thoại, hard-refresh 1 lần
   (trình duyệt có thể cache CSS cũ — file mới đã có `?v=20261024a` nên
   thường không cần, nhưng nếu vẫn thấy xanh lá cũ thì xóa cache là hết).
4. Kiểm tra nhanh: Trang chủ → vào 1 quán → thêm món → checkout → đặt đơn
   thử (có thể hủy ngay khi còn `pending`) → vào `quanly.html` xem đơn có
   hiện cho quán/shipper không.

## 6. Kiểm thử đã làm ở đây
- `diff -r` bản gốc vs bản mới: chỉ khác `index.html`, `manifest.json` và
  thêm `shopee-mobile.css`.
- `node --check` cho toàn bộ 14 file JS: PASS (không sửa JS nên không thể vỡ
  logic).
- Kiểm tra ngoặc CSS mới: 96 mở / 96 đóng, cân bằng; có lưới 2 cột và màu
  `#ee4d2d`.
- Chạy server local và tải được `index.html` (200) kèm link CSS mới.
- Chưa kiểm thử trực quan trên điện thoại thật và chưa chạy với dữ liệu
  Firebase thật (cần tài khoản Firebase của bạn) — hãy làm bước kiểm tra
  nhanh ở mục 5 sau khi deploy.

## 7. Bản HOÀN THIỆN 24/10/2026 — những gì đã sửa thêm so với bản Shopee-mobile đầu
1. **Giao diện Shopee-mobile cho cổng quản lý:** thêm `panel-mobile.css`
   (nạp sau `panel.css` trong `quanly.html`), đổi theme sang cam `#ee4d2d`,
   nền xám, nút tối thiểu 44px, bảng admin cuộn ngang trên điện thoại thay vì
   vỡ cột, khung quản lý giới hạn 540px. Không sửa `panel.js`/`admin.js`/
   `seller.js`/`shipper.js` ngoài việc đổi số phiên bản cache.
2. **Shipper nhận đơn bằng transaction:** `fb.js` thêm `claimOrder()` dùng
   `runTransaction` — đọc trạng thái + `shipperUid` rồi mới ghi. 2 shipper
   bấm cùng lúc thì chỉ 1 thắng, người còn lại nhận lỗi và toast sẵn có
   trong `shipper.js` sẽ hiện "đơn có thể đã có shipper khác nhận".
3. **Chống đơn trùng bằng `clientKey`:** mỗi lần mở checkout chỉ sinh 1 key
   (`CART.orderKey`), đơn ghi vào Firestore kèm `clientKey`. Nếu bấm lại /
   mạng gửi lại trong cùng phiên checkout mà đơn với key đó đã có trong danh
   sách realtime thì app không tạo đơn mới mà chuyển sang trang Đơn hàng.
   Lưu ý: Firestore không có unique constraint nên key này chặn trùng ở
   luồng app bình thường, không chặn được kẻ gọi thẳng API.
4. **Xác thực giá đơn qua Apps Script:** `google-apps-script.gs` thêm
   `validateOrder` — đọc lại thực đơn thật của quán, tính lại tạm tính,
   giảm % của quán, mã giảm giá, phí ship (đúng công thức 15.000đ/3,5km +
   3.000đ/km, hệ số 1,3, freeship) và tổng tiền; khác nhau thì app chặn đơn.
   `app.js` gọi hàm này trước `placeOrder`, `fb.js` thêm `validateOrder()`.
5. **Chống cache cũ:** tất cả import `?v=20261023a` đã đổi sang
   `?v=20261024b` (kể cả `app.js`, `quanly.js`) để trình duyệt tải đúng bản mới.

## 8. Cách deploy bản hoàn thiện (làm đủ 2 bước, thiếu 1 bước là mất tác dụng)
**Bước A — Website (GitHub Pages):** copy toàn bộ thư mục này đè lên repo,
commit + push `main`, đợi Pages deploy.
**Bước B — Apps Script (bắt buộc để bật xác thực giá):** mở script.google.com,
dán đè toàn bộ file `google-apps-script.gs` mới vào project cũ (giữ nguyên
Script Properties: Zalo token, admin IDs — không dán lại token vào code),
Deploy → Manage deployments → Edit → New version → Deploy. Nếu không làm
bước B, website vẫn chạy như cũ và xác thực giá sẽ tự bỏ qua (đã cố tình
thiết kế fallback này để không vỡ luồng đặt đơn).
**Kiểm tra sau deploy:** (1) điện thoại mở `lamthaoangi.io.vn` thấy header
cam + lưới quán 2 cột; (2) mở `quanly.html` thấy header cam + bảng cuộn
ngang; (3) đặt thử 1 đơn, hủy khi còn `pending`; (4) 2 tài khoản shipper
cùng bấm nhận 1 đơn — chỉ 1 người nhận được; (5) đổi giá 1 món trong
quanly rồi đặt đơn cũ chưa tải lại — app phải chặn và báo giá đã thay đổi
(chỉ đúng sau khi đã deploy script mới ở bước B).

## 9. Giới hạn còn lại — nói thẳng
- Xác thực giá ở mục 7.4 vẫn bypass được nếu kẻ tấn công gọi thẳng
  Firestore API. Chặn tuyệt đối cần Cloud Function tạo đơn (đọc menu bằng
  Admin SDK, ghi đơn bằng Admin SDK) — đó là bước nâng cấp tiếp theo, không
  thể làm chỉ bằng Apps Script + Rules vì Rules không cộng dồn được giá
  theo thực đơn.
- Chưa test trên điện thoại thật và dữ liệu Firebase thật (cần tài khoản
  của bạn) — hãy chạy checklist mục 8 sau khi deploy.
