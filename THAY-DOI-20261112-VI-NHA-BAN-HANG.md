# Thay đổi 12/11/2026 – Bỏ "Bù lỗ", Admin tài trợ giảm % cho từng quán, Ví nhà bán hàng

**Đã bỏ:** tab 💸 Bù lỗ (Admin), thẻ "Lâm Thao Ăn Gì bù cho quán" + bảng bù theo ngày (nhà bán hàng), ô "Giảm giá do Lâm Thao Ăn Gì chịu" (một mức % cho MỌI quán) ở tab Liên hệ, luật settlements / shopSettlements.

**Mới:**
- Admin → Cửa hàng → Sửa quán → ô **🎁 Admin tài trợ giảm giá (%)**: chỉ quán nào có số > 0 mới được tài trợ. Khách thấy "Ưu đãi Lâm Thao Ăn Gì x%", quán vẫn nhận đủ tiền món.
- Phần giảm (`platformOff`) của đơn **đã giao thành công** được cộng vào **👛 Ví** của nhà bán hàng (chỉ đơn tạo từ 00:00 12/11/2026, đổi mốc ở `SPONSOR_WALLET_FROM` trong `revenue.js`).
- Nhà bán hàng → tab 👛 Ví: chọn ngân hàng + số tài khoản → Apps Script hỏi ngân hàng lấy **tên chủ tài khoản** (qua VietQR) → lưu vào `sellerBanks/{uid}` (quán không tự sửa được tên) → nhập số tiền, gửi yêu cầu rút (tối thiểu 10.000đ, không vượt số dư).
- Admin → tab 🏪 Ví quán: yêu cầu rút đang chờ (kèm ngân hàng đã xác minh tên), số dư từng quán, nút Đã chuyển khoản / Từ chối (từ chối thì tiền hoàn lại ví). Ví tài xế tách riêng, không lẫn.

**Đưa lên (đủ 4 bước, theo thứ tự):**
1. **VietQR:** đăng ký https://my.vietqr.io lấy Client ID + API Key. Apps Script → Project Settings → Script Properties → thêm `VIETQR_CLIENT_ID` và `VIETQR_API_KEY`.
2. **Apps Script:** dán `google-apps-script.gs` mới → Deploy → Manage deployments → Edit → New version (thêm action `saveSellerBank`, đã gồm bản vá link Google Maps).
3. **Firestore Rules:** dán toàn bộ `firestore.rules` mới → Publish.
4. **GitHub:** chép đè các file trong gói này, đợi ~1 phút, Ctrl+F5.
