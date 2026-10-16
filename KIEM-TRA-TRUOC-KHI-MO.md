# Việc cần làm trước khi mở bán (theo thứ tự)

1. **Apps Script**: dán lại `google-apps-script.gs` → chạy hàm `checkNotifyAccess` (phải in "OK") và `checkResetAccess` → Deploy → Manage deployments → Edit → New version.
2. **Firestore Rules**: dán `firestore.rules` → Publish. (Chỉ làm SAU bước 1, vì rules mới khóa `settings/notify` khỏi khách.)
3. **Goong**: account.goong.io → giới hạn 2 khóa theo tên miền `lamthaoangi.io.vn`.
4. **Firebase Console → Authentication → Settings → Authorized domains**: có `lamthaoangi.io.vn`.
5. **Firebase → Google Cloud → Credentials → API key** của web: giới hạn HTTP referrer `lamthaoangi.io.vn/*`.
6. **Firebase → Firestore → Usage**: đặt cảnh báo ngân sách; cân nhắc bật App Check.
7. **Test 1 vòng thật**: khách đặt → mail + Zalo tới admin/quán/shipper → shipper nhận → "Đã giao xong" → khách thấy hoàn thành. Thử huỷ đơn, đơn Giao hàng, đơn Mua hộ.
8. **Admin → Cài đặt**: điền hotline, Zalo, email liên hệ thật (bản thật không còn số mẫu).
