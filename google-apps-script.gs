/**
 * GOOGLE APPS SCRIPT – Lâm Thao Ăn Gì?
 * 1) Lưu ảnh lên Google Drive (admin / seller)
 * 2) Thông báo ĐƠN MỚI: gửi Gmail cho Admin + tin Zalo Bot cho Quán và Admin
 * 3) Admin ĐẶT LẠI MẬT KHẨU cho người dùng (cần file appsscript.json đi kèm, xem HUONG-DAN.md)
 *
 * Dán toàn bộ file vào https://script.google.com, điền các hằng số bên dưới,
 * rồi Deploy → Manage deployments → Edit → New version (xem HUONG-DAN.md).
 * Các khóa bí mật của Zalo KHÔNG dán vào file này mà nhập ở Project Settings → Script properties.
 */

// ===================== CẤU HÌNH =====================
const FOLDER_ID = '1lqBEj_wMTjuk4WSXZeP5aMtiNinO5M0g';   // thư mục Drive chứa ảnh
const FIREBASE_PROJECT = 'lamthaoangi1-c01cb';
const FIREBASE_API_KEY = 'AIzaSyC9jqo52PyA3QT51XGCyWcOs0ViC1fL-a0';
const MAX_BYTES = 3 * 1024 * 1024;
const SITE_ORIGIN = 'https://lamthaoangi.io.vn';        // địa chỉ website (dùng cho biểu tượng + link khi khách bấm vào thông báo đẩy)

const ADMIN_EMAIL = 'lamthaoangi1@gmail.com';             // Gmail nhận thông báo đơn mới (có thể ghi nhiều, cách nhau dấu phẩy)
const SITE_URL = 'https://lamthaoangi.io.vn/quanly.html';  // link trang quản lý (đăng nhập chung) gắn vào email báo đơn

/**
 * Script properties (Project Settings → Script properties) – dùng cho Zalo Bot:
 *   ZALO_BOT_TOKEN : token bot (dạng 123456:abcxyz) lấy từ Zalo Bot Creator
 *   ZALO_ADMIN_IDS : chat_id Zalo của Admin, nhiều người cách nhau dấu phẩy
 * Zalo ID của chủ quán và shipper nhập trong website: Admin → Người dùng → cột "Zalo ID".
 * Chạy hàm listZaloChats() trong trình soạn thảo để xem chat_id của người đã nhắn bot.
 */

// ===================== TIỆN ÍCH =====================
function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
const props = () => PropertiesService.getScriptProperties();
const FS = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT + '/databases/(default)/documents/';

function verifyToken(token) {
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: token }), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  return JSON.parse(r.getContentText()).users[0].localId;
}

// Đổi định dạng Firestore REST ({stringValue:..}, {mapValue:..}) sang object thường
function fromFs(v) {
  if (v === undefined || v === null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFs);
  if ('mapValue' in v) { const o = {}, f = v.mapValue.fields || {}; Object.keys(f).forEach(k => o[k] = fromFs(f[k])); return o; }
  return null;
}
function docToObj(d) { const o = {}, f = d.fields || {}; Object.keys(f).forEach(k => o[k] = fromFs(f[k])); return o; }

function getDoc(path, token) {
  const r = UrlFetchApp.fetch(FS + path, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  return docToObj(JSON.parse(r.getContentText()));
}
// Đọc bằng quyền của chủ script (cần scope cloud-platform đã có trong appsscript.json). Lỗi thì rơi về token của người gọi.
function getDocAdmin(path, fallbackToken) {
  try {
    const r = UrlFetchApp.fetch(FS + path, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (r.getResponseCode() === 200) return docToObj(JSON.parse(r.getContentText()));
    if (r.getResponseCode() === 404) return null;
  } catch (e) {}
  return getDoc(path, fallbackToken);
}
// Chạy tay 1 lần trước khi siết luật settings/notify: phải in ra OK
function checkNotifyAccess() {
  const r = UrlFetchApp.fetch(FS + 'settings/notify', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  Logger.log(r.getResponseCode() === 200 || r.getResponseCode() === 404 ? 'OK – script đọc được Firestore bằng quyền riêng (' + r.getResponseCode() + ')' : 'LỖI ' + r.getResponseCode() + ': ' + r.getContentText());
}
const money = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
// Hình thức thanh toán của đơn: tiền mặt hoặc chuyển khoản (kèm nội dung CK = mã đơn để đối chiếu)
function payLabel(o) {
  if (o.payment !== 'bank') return 'tiền mặt';
  return o.payStatus === 'paid' ? 'CHUYỂN KHOẢN – đã nhận tiền' : 'CHUYỂN KHOẢN – CHỜ XÁC NHẬN, nội dung CK: ' + o.code + (o.customerPaid ? ' (khách báo đã chuyển)' : '');
}

// ===================== ĐIỂM VÀO =====================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'notifyOrder') return notifyOrder(body);
    if (body.action === 'notifyStatus') return notifyStatus(body);
    if (body.action === 'resetPassword') return resetPassword(body);
    if (body.action === 'createSeller') return createSeller(body);
    return uploadImage(body);
  } catch (err) {
    return out({ ok: false, error: 'Lỗi máy chủ: ' + err });
  }
}

// ===================== 1) TẢI ẢNH LÊN DRIVE =====================
function uploadImage(body) {
  if (!body.token || !body.data) return out({ ok: false, error: 'Thiếu dữ liệu' });
  const uid = verifyToken(body.token);
  if (!uid) return out({ ok: false, error: 'Phiên đăng nhập hết hạn, hãy đăng nhập lại' });
  const me = getDoc('users/' + uid, body.token);
  if (!me) return out({ ok: false, error: 'Không đọc được hồ sơ tài khoản' });
  if (me.role !== 'admin' && me.role !== 'seller') return out({ ok: false, error: 'Tài khoản không có quyền tải ảnh' });

  const mime = String(body.mime || '');
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) return out({ ok: false, error: 'Chỉ nhận ảnh JPG/PNG/WEBP' });
  const bytes = Utilities.base64Decode(body.data);
  if (bytes.length > MAX_BYTES) return out({ ok: false, error: 'Ảnh quá lớn (tối đa 3 MB)' });
  const name = String(body.name || 'anh.jpg').replace(/[^\w.\-]/g, '_').slice(0, 80);
  const file = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(bytes, mime, name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return out({ ok: true, id: file.getId(), url: 'https://lh3.googleusercontent.com/d/' + file.getId() + '=w900' });
}

// ===================== 3) ADMIN ĐẶT LẠI MẬT KHẨU =====================
// Trình duyệt không thể đổi mật khẩu người khác, nên việc này làm ở đây bằng quyền của chủ script
// (tài khoản Google triển khai script phải là Owner/Editor của project Firebase).
function resetPassword(body) {
  if (!body.token || !body.uid || !body.password) return out({ ok: false, error: 'Thiếu dữ liệu' });
  const adminUid = verifyToken(body.token);
  if (!adminUid) return out({ ok: false, error: 'Phiên đăng nhập hết hạn, hãy đăng nhập lại' });

  // Đọc hồ sơ bằng chính token của người gọi → chỉ tin vai trò thật lưu trong Firestore
  const me = getDoc('users/' + adminUid, body.token);
  if (!me || me.role !== 'admin') return out({ ok: false, error: 'Chỉ Admin mới được đặt lại mật khẩu' });

  const pass = String(body.password);
  if (pass.length < 6 || pass.length > 64) return out({ ok: false, error: 'Mật khẩu phải từ 6 đến 64 ký tự' });
  const target = getDoc('users/' + body.uid, body.token);
  if (!target) return out({ ok: false, error: 'Không tìm thấy tài khoản này' });

  const idt = op => 'https://identitytoolkit.googleapis.com/v1/projects/' + FIREBASE_PROJECT + '/accounts:' + op;
  const adm = (op, payload) => UrlFetchApp.fetch(idt(op), {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': FIREBASE_PROJECT },
    payload: JSON.stringify(payload) });
  const fail = (code, r) => {
    console.error('resetPassword lỗi ' + code + ': ' + r.getContentText());
    let msg = 'Không đặt lại được mật khẩu (mã ' + code + ')';
    if (code === 403) msg = 'Script chưa có quyền quản lý tài khoản Firebase. Xem mục "Đặt lại mật khẩu" trong HUONG-DAN.md';
    else if (code === 404) msg = 'Tài khoản này chưa có trong Firebase Authentication';
    return out({ ok: false, error: msg });
  };

  // 1) Xem tài khoản Firebase Authentication đang gắn với uid này (email, có bị khóa không)
  const lk = adm('lookup', { localId: [String(body.uid)] });
  if (lk.getResponseCode() !== 200) return fail(lk.getResponseCode(), lk);
  const acc = (JSON.parse(lk.getContentText()).users || [])[0];

  // 2) Đặt mật khẩu mới. Web đăng nhập bằng SĐT@lamthaoangi.app nên đồng bộ luôn email theo SĐT trong hồ sơ, và mở khóa nếu tài khoản đang bị vô hiệu hóa
  const phone = String(target.phone || '').trim();
  const wantEmail = /^0\d{9}$/.test(phone) ? phone + '@lamthaoangi.app' : String((acc && acc.email) || '');
  const emailTaken = 'SĐT ' + phone + ' đang gắn với một tài khoản Firebase khác (có thể là tài khoản cũ đã bị xóa hồ sơ). Vào Firebase Console → Authentication, xóa tài khoản ' + wantEmail + ' rồi đặt lại.';
  let upd = { localId: String(body.uid) }, recreated = false;
  if (!acc) {
    // Hồ sơ còn trong Firestore nhưng tài khoản đăng nhập đã bị xóa khỏi Firebase Authentication → tạo lại ĐÚNG uid cũ, nên đơn hàng và quyền chủ quán/shipper vẫn giữ nguyên
    if (!/^0\d{9}$/.test(phone)) return out({ ok: false, error: 'Hồ sơ này không có SĐT hợp lệ (10 số, bắt đầu bằng 0) nên không tạo lại được tài khoản đăng nhập' });
    const cr = UrlFetchApp.fetch(idt('').replace(/:$/, ''), {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': FIREBASE_PROJECT },
      payload: JSON.stringify({ localId: String(body.uid), email: wantEmail, password: pass, emailVerified: true }) });
    if (cr.getResponseCode() !== 200) {
      if (cr.getResponseCode() === 400 && /EMAIL_EXISTS/.test(cr.getContentText())) return out({ ok: false, error: emailTaken });
      return fail(cr.getResponseCode(), cr);
    }
    recreated = true;
  } else {
    upd = { localId: String(body.uid), password: pass, disableUser: false };
    if (wantEmail && String(acc.email || '').toLowerCase() !== wantEmail) upd.email = wantEmail;
    const r = adm('update', upd);
    const code = r.getResponseCode();
    if (code !== 200) {
      if (code === 400 && /EMAIL_EXISTS/.test(r.getContentText())) return out({ ok: false, error: emailTaken });
      return fail(code, r);
    }
  }

  // 3) Kiểm tra thật: đăng nhập thử bằng email + mật khẩu mới (thử tối đa 3 lần, cách nhau 1,5 giây, phòng máy chủ cập nhật chậm)
  const verify = () => {
    for (let i = 0; i < 3; i++) {
      const c = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FIREBASE_API_KEY, {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ email: wantEmail, password: pass, returnSecureToken: true }) });
      if (c.getResponseCode() === 200) return { ok: true };
      var last = c;
      if (i < 2) Utilities.sleep(1500);
    }
    return { ok: false, res: last };
  };
  let v = verify();

  // 4) Dự phòng: nếu đường cập nhật theo project không có tác dụng, dùng đường cập nhật chung (targetProjectId) rồi kiểm tra lại
  let usedFallback = false;
  if (!v.ok) {
    usedFallback = true;
    const r2 = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:update', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': FIREBASE_PROJECT },
      payload: JSON.stringify({ localId: String(body.uid), password: pass, targetProjectId: FIREBASE_PROJECT, returnSecureToken: false }) });
    console.error('resetPassword: dự phòng accounts:update → ' + r2.getResponseCode() + ' ' + r2.getContentText().slice(0, 300));
    if (r2.getResponseCode() === 200) v = verify();
  }

  if (!v.ok) {
    // Ghi đủ thông tin để chẩn đoán: email thật đang gắn với uid, nhà cung cấp đăng nhập, thời điểm đổi mật khẩu (trước/sau), và lỗi đăng nhập thử
    let after = {};
    try { after = (JSON.parse(adm('lookup', { localId: [String(body.uid)] }).getContentText()).users || [])[0] || {}; } catch (e) {}
    const info = {
      uid: String(body.uid), emailTruocKhiSua: acc ? acc.email : '(chưa có tài khoản, đã tạo lại)', emailSauKhiSua: after.email, wantEmail: wantEmail,
      providers: (after.providerUserInfo || []).map(x => x.providerId), khoa: after.disabled || false,
      passwordUpdatedAtTruoc: (acc && acc.passwordUpdatedAt) || null, passwordUpdatedAtSau: after.passwordUpdatedAt || null,
      duPhong: usedFallback, loiDangNhap: v.res ? v.res.getContentText().replace(/\s+/g, ' ').slice(0, 160) : ''
    };
    console.error('resetPassword: đăng nhập thử thất bại ' + JSON.stringify(info));
    return out({ ok: false, error: 'Đã đặt mật khẩu nhưng đăng nhập thử không thành công. Chẩn đoán: ' + JSON.stringify(info), diag: info });
  }
  console.log('resetPassword: admin ' + adminUid + ' đã đặt lại mật khẩu cho ' + body.uid + ' (' + phone + ')' + (upd.email ? ' – đã sửa email thành ' + upd.email : '') + (recreated ? ' – đã tạo lại tài khoản đăng nhập với uid cũ' : '') + (usedFallback ? ' – qua đường dự phòng' : ''));   // KHÔNG ghi mật khẩu vào log
  return out({ ok: true, email: wantEmail, emailFixed: !!upd.email, recreated: recreated });
}

// ===================== 3b) ADMIN CẤP TÀI KHOẢN NHÀ BÁN HÀNG =====================
// Làm ở đây (bằng quyền của chủ script) thay vì trong trình duyệt: không phụ thuộc mạng/bộ nhớ trình duyệt của Admin,
// tạo tài khoản đăng nhập + ghi hồ sơ trong cùng 1 lần, lỗi thì báo rõ thay vì treo.
function createSeller(body) {
  if (!body.token || !body.phone || !body.password || !body.shopId) return out({ ok: false, error: 'Thiếu dữ liệu' });
  const adminUid = verifyToken(body.token);
  if (!adminUid) return out({ ok: false, error: 'Phiên đăng nhập hết hạn, hãy đăng nhập lại' });
  const me = getDoc('users/' + adminUid, body.token);
  if (!me || me.role !== 'admin') return out({ ok: false, error: 'Chỉ Admin mới được cấp tài khoản nhà bán hàng' });

  const phone = String(body.phone).replace(/\D/g, ''), pass = String(body.password);
  if (!/^0\d{9}$/.test(phone)) return out({ ok: false, error: 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0' });
  if (pass.length < 6 || pass.length > 64) return out({ ok: false, error: 'Mật khẩu phải từ 6 đến 64 ký tự' });
  const shop = getDoc('shops/' + body.shopId, body.token);
  if (!shop) return out({ ok: false, error: 'Không tìm thấy cửa hàng này' });

  const email = phone + '@lamthaoangi.app';
  const post = (op, payload) => UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/projects/' + FIREBASE_PROJECT + '/accounts' + op, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': FIREBASE_PROJECT },
    payload: JSON.stringify(payload) });

  // 1) Tạo tài khoản đăng nhập; nếu email đã có thì xem tài khoản đó đã có hồ sơ chưa
  let uid = '', adopted = false;
  const cr = post('', { email: email, password: pass, emailVerified: true });
  if (cr.getResponseCode() === 200) uid = JSON.parse(cr.getContentText()).localId;
  else if (cr.getResponseCode() === 400 && /EMAIL_EXISTS/.test(cr.getContentText())) {
    const lk = post(':lookup', { email: [email] });
    const acc = lk.getResponseCode() === 200 ? (JSON.parse(lk.getContentText()).users || [])[0] : null;
    if (!acc) return out({ ok: false, error: 'SĐT ' + phone + ' đã có tài khoản đăng nhập nhưng không tra được thông tin. Thử lại sau.' });
    if (getDocAdmin('users/' + acc.localId, body.token)) return out({ ok: false, error: 'SĐT ' + phone + ' đã có tài khoản. Hãy vào tab Người dùng, tìm SĐT này và đổi vai trò / gán cửa hàng, hoặc bấm Đặt lại MK nếu quên mật khẩu.' });
    // Tài khoản mồ côi (có đăng nhập, chưa có hồ sơ) → dùng lại, đặt mật khẩu mới và tạo hồ sơ
    const up = post(':update', { localId: acc.localId, password: pass, disableUser: false });
    if (up.getResponseCode() !== 200) return out({ ok: false, error: 'Không đặt được mật khẩu cho tài khoản sẵn có (mã ' + up.getResponseCode() + ')' });
    uid = acc.localId; adopted = true;
  } else {
    console.error('createSeller: tạo tài khoản lỗi ' + cr.getResponseCode() + ': ' + cr.getContentText());
    return out({ ok: false, error: cr.getResponseCode() === 403 ? 'Script chưa có quyền quản lý tài khoản Firebase. Xem mục "Đặt lại mật khẩu" trong HUONG-DAN.md' : 'Không tạo được tài khoản (mã ' + cr.getResponseCode() + '): ' + cr.getContentText().replace(/\s+/g, ' ').slice(0, 160) });
  }

  // 2) Ghi hồ sơ người dùng (vai trò nhà bán hàng + cửa hàng) bằng quyền của chủ script
  const f = { name: { stringValue: String(body.name || shop.name || '') }, phone: { stringValue: phone }, role: { stringValue: 'seller' },
    shopId: { stringValue: String(body.shopId) }, address: { stringValue: '' }, createdAt: { timestampValue: new Date().toISOString() } };
  if (body.zaloId) f.zaloId = { stringValue: String(body.zaloId).trim() };
  const w = UrlFetchApp.fetch(FS + 'users/' + uid, { method: 'patch', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, payload: JSON.stringify({ fields: f }) });
  if (w.getResponseCode() !== 200) {
    console.error('createSeller: ghi hồ sơ lỗi ' + w.getResponseCode() + ': ' + w.getContentText());
    if (!adopted) { try { post(':delete', { localId: uid }); } catch (e) {} }   // không để lại tài khoản mồ côi
    return out({ ok: false, error: 'Không ghi được hồ sơ (mã ' + w.getResponseCode() + '): ' + w.getContentText().replace(/\s+/g, ' ').slice(0, 160) });
  }
  console.log('createSeller: admin ' + adminUid + ' cấp tài khoản chủ quán ' + phone + ' cho quán ' + body.shopId + (adopted ? ' (dùng lại tài khoản sẵn có)' : ''));
  return out({ ok: true, uid: uid, adopted: adopted });
}

// Chạy tay 1 lần trong trình soạn thảo (chọn hàm này → Run) để cấp quyền và kiểm tra kết nối với Firebase Authentication
function checkResetAccess() {
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/projects/' + FIREBASE_PROJECT + '/accounts:query', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': FIREBASE_PROJECT },
    payload: JSON.stringify({ returnUserInfo: false, limit: '1' }) });
  Logger.log(r.getResponseCode() === 200 ? 'OK – đã có quyền đặt lại mật khẩu.' : 'LỖI ' + r.getResponseCode() + ': ' + r.getContentText());
}

// ===================== 2) THÔNG BÁO ĐƠN MỚI =====================
function notifyOrder(body) {
  if (!body.token || !body.orderId) return out({ ok: false, error: 'Thiếu dữ liệu' });
  const uid = verifyToken(body.token);
  if (!uid) return out({ ok: false, error: 'Phiên đăng nhập hết hạn' });

  // Đọc đơn bằng chính token của khách → luật bảo mật đảm bảo đơn có thật và thuộc về khách này
  const order = getDoc('orders/' + body.orderId, body.token);
  if (!order || order.uid !== uid) return out({ ok: false, error: 'Không tìm thấy đơn' });
  if (order.status !== 'pending') return out({ ok: false, error: 'Đơn không ở trạng thái chờ' });

  // Chống gửi trùng (bấm/gọi lại nhiều lần)
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache(), key = 'notified_' + body.orderId;   // cache tự xóa sau 6 giờ, không đầy bộ nhớ như Script properties
    if (cache.get(key)) return out({ ok: true, duplicate: true });
    cache.put(key, '1', 21600);
  } finally { lock.releaseLock(); }

  const result = { email: false, admin: 0, shop: 0, shipper: 0, customer: 0 };
  // Thông báo đẩy về máy khách: đặt đơn thành công
  try { result.customer = pushToUser(order.uid, 'Đặt đơn thành công 🎉', 'Đơn #' + order.code + ' – ' + money(order.total) + '. Đang chờ quán/tài xế nhận đơn.', 'order-' + body.orderId); } catch (e) { console.error('Push khách: ' + e); }
  const shop = order.type ? {} : (getDoc('shops/' + order.shopId, body.token) || {});   // đơn Giao hàng/Mua hộ không thuộc quán nào
  const notify = getDocAdmin('settings/notify', body.token) || {};   // do Admin lưu: { shops:{shopId:[id]}, shippers:[id] }

  const warn = priceWarning(order, shop); if (warn) order._warn = warn;
  try { sendOrderEmail(order, shop); result.email = true; } catch (e) { console.error('Gmail: ' + e); }

  const list = v => (Array.isArray(v) ? v : String(v || '').split(',')).map(x => String(x).trim()).filter(Boolean);
  const adminIds = list(props().getProperty('ZALO_ADMIN_IDS'));
  const shopIds = order.type ? [] : list(((notify.shops || {})[order.shopId] || []).concat(list(shop.zaloId)));   // shop.zaloId: cách nhập cũ, vẫn đọc để không mất
  const shipperIds = list(notify.shippers);
  console.log('notifyOrder: đơn ' + order.code + ' | admin ' + adminIds.length + ' | quán ' + shopIds.length + ' | shipper ' + shipperIds.length);

  // Mỗi người chỉ nhận 1 tin dù có nhiều vai trò (ưu tiên: admin → quán → shipper)
  const sent = {};
  const push = (ids, kind, text) => ids.forEach(id => {
    if (sent[id]) return; sent[id] = 1;
    try { if (sendZalo(id, text)) result[kind]++; } catch (e) { console.error('Zalo ' + kind + ': ' + e); }
  });
  push(adminIds, 'admin', zaloText(order, shop, 'Vui lòng mở lamthaoangi.io.vn/quanly.html để theo dõi đơn.'));
  const appSet = getDoc('settings/app', body.token) || {};   // Admin tắt "Cho quán xem thông tin khách" → tin gửi quán không kèm tên/SĐT/địa chỉ khách
  const shopSeeCustomer = appSet.shopSeeCustomer !== false;
  push(shopIds, 'shop', zaloText(order, shop, 'Vui lòng mở lamthaoangi.io.vn/quanly.html để xem đơn.', !shopSeeCustomer));
  push(shipperIds, 'shipper', '🛎 Có đơn mới! Mở lamthaoangi.io.vn/quanly.html để xem và nhận đơn.');
  if (!result.email && !result.admin && !result.shop && !result.shipper && !result.customer) { try { CacheService.getScriptCache().remove('notified_' + body.orderId); } catch (e) {} return out({ ok: false, error: 'Chưa gửi được thông báo nào', result: result }); }
  return out({ ok: true, result: result });
}

// ===================== 3) THÔNG BÁO ĐẨY VỀ MÁY KHÁCH (Firebase Cloud Messaging) =====================
// Khách bật thông báo → web lưu token vào Firestore users/{uid}/devices/{token}. Script đọc token bằng quyền riêng rồi gửi qua FCM HTTP v1.
// Cần: (1) VAPID key trong push-config.js, (2) bật "Firebase Cloud Messaging API (V1)" của project, (3) Deploy lại Web app bản mới (xem HUONG-DAN-THONG-BAO.md).
function statusMessage(order, st) {
  const c = '#' + order.code;
  switch (st) {
    case 'confirmed': return { title: 'Quán đã nhận đơn ✅', body: 'Đơn ' + c + ' đã được xác nhận, quán sẽ sớm chuẩn bị món.' };
    case 'preparing': return { title: 'Quán đang chuẩn bị món 🍳', body: 'Đơn ' + c + ' đang được chuẩn bị.' };
    case 'ready': return { title: 'Món đã sẵn sàng 🛍', body: 'Đơn ' + c + ' đã làm xong, tài xế sẽ sớm tới lấy.' };
    case 'delivering': return { title: 'Shipper đã nhận đơn 🛵', body: (order.shipperName ? 'Tài xế ' + order.shipperName : 'Tài xế') + ' đã nhận đơn ' + c + ' và đang giao tới bạn.' + (order.shipperPhone ? ' SĐT tài xế: ' + order.shipperPhone + ' – bấm vào thông báo để mở đơn và gọi tài xế.' : '') };
    case 'done': return { title: 'Giao hàng thành công 🎉', body: 'Đơn ' + c + ' đã hoàn thành. Chúc bạn ngon miệng!' };
    case 'cancelled': return { title: 'Đơn đã bị hủy', body: 'Đơn ' + c + ' đã bị hủy. Cần hỗ trợ hãy liên hệ Lâm Thao Ăn Gì qua Zalo.' };
  }
  return null;
}

// Web gọi sau khi Admin / Quán / Shipper đổi trạng thái đơn. Trạng thái LẤY TỪ DỮ LIỆU THẬT, không tin trạng thái người gọi gửi lên.
function notifyStatus(body) {
  if (!body.token || !body.orderId) return out({ ok: false, error: 'Thiếu dữ liệu' });
  const uid = verifyToken(body.token);
  if (!uid) return out({ ok: false, error: 'Phiên đăng nhập hết hạn' });
  const order = getDoc('orders/' + body.orderId, body.token);   // luật bảo mật: chỉ người có quyền xem đơn mới đọc được
  if (!order) return out({ ok: false, error: 'Không tìm thấy đơn' });
  if (order.uid === uid) return out({ ok: true, skipped: 'khách tự thao tác' });
  const msg = statusMessage(order, order.status);
  if (!msg) return out({ ok: true, skipped: 'trạng thái ' + order.status });

  if (!claimStatusPush(body.orderId, order)) return out({ ok: true, duplicate: true });

  const dbg = { errors: [] };
  const n = pushToUser(order.uid, msg.title, msg.body, 'order-' + body.orderId, dbg);
  return out({ ok: true, sent: n, devices: dbg.devices, errors: dbg.errors, status: order.status });   // devices = 0 → khách chưa có token; errors = lý do FCM từ chối
}

// Đánh dấu "trạng thái này của đơn đã được báo" – dùng chung cho web gọi (notifyStatus) và bộ quét tự động (sweepOrderStatus),
// nên dù đường nào tới trước thì khách cũng chỉ nhận 1 thông báo. Trả true nếu lần này được phép gửi.
function claimStatusPush(orderId, order) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const legacyKey = ('st_' + orderId + '_' + order.status + '_' + order.updatedAt).slice(0, 240);   // khóa của bản cũ, giữ để không báo trùng lúc nâng cấp
    if (cache.get(legacyKey) || cache.get('last_' + orderId) === order.status) return false;
    cache.put(legacyKey, '1', 21600);
    cache.put('last_' + orderId, order.status, 21600);
    return true;
  } finally { lock.releaseLock(); }
}

// ===================== BỘ QUÉT TỰ ĐỘNG (đảm bảo khách luôn nhận thông báo) =====================
// Vì sao cần: thông báo trạng thái ban đầu do TRÌNH DUYỆT CỦA SHIPPER/QUÁN gọi lên. Nếu shipper tắt app ngay sau khi bấm,
// mất mạng hoặc Google chập chờn thì cuộc gọi đó rớt và khách không được báo. Hàm này chạy mỗi phút (trigger của Apps Script),
// tự tìm các đơn vừa đổi trạng thái rồi đẩy thông báo tới máy khách – không phụ thuộc ai đang mở web.
// Cài 1 lần: chọn hàm installTrigger → Run (xem HUONG-DAN-THONG-BAO.md).
const SWEEP_WINDOW_MS = 15 * 60 * 1000;   // chỉ xét đơn đổi trong 15 phút gần nhất
function sweepOrderStatus() {
  const since = new Date(Date.now() - SWEEP_WINDOW_MS).toISOString();
  const r = UrlFetchApp.fetch(FS.replace(/\/documents\/$/, '/documents') + ':runQuery', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'orders' }],
      where: { fieldFilter: { field: { fieldPath: 'updatedAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: since } } },
      limit: 100 } }) });
  if (r.getResponseCode() !== 200) { console.error('sweep lỗi ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300)); return; }
  let sent = 0;
  JSON.parse(r.getContentText()).forEach(row => {
    if (!row.document) return;
    const orderId = row.document.name.split('/').pop();
    const order = docToObj(row.document);
    // 'cancelled' bỏ qua: khách tự hủy cũng đổi sang trạng thái này, không phân biệt được ai hủy → để web báo như cũ
    if (!order.uid || order.status === 'cancelled') return;
    const msg = statusMessage(order, order.status);
    if (!msg || !claimStatusPush(orderId, order)) return;
    try { sent += pushToUser(order.uid, msg.title, msg.body, 'order-' + orderId); } catch (e) { console.error('sweep push: ' + e); }
    console.log('sweep: đơn ' + order.code + ' → ' + order.status);
  });
  if (sent) console.log('sweep: đã gửi ' + sent + ' thông báo');
}
// Chạy tay 1 lần: tạo bộ hẹn giờ chạy sweepOrderStatus mỗi phút (chạy lại nhiều lần cũng không bị tạo trùng)
function installTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sweepOrderStatus').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sweepOrderStatus').timeBased().everyMinutes(1).create();
  Logger.log('OK – đã bật quét đơn mỗi phút.');
}
function removeTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sweepOrderStatus').forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('Đã tắt quét đơn tự động.');
}

// Gửi tới mọi thiết bị của 1 khách; trả về số thiết bị gửi được
function pushToUser(uid, title, text, tag, dbg) {
  if (!uid) return 0;
  let sent = 0;
  const list = listDevices(uid);
  if (dbg) dbg.devices = list.length;
  list.forEach(d => { if (fcmSend(uid, d, title, text, tag, dbg)) sent++; });
  return sent;
}
function listDevices(uid) {
  const r = UrlFetchApp.fetch(FS + 'users/' + uid + '/devices?pageSize=20', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) { console.log('listDevices ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200)); return []; }
  return (JSON.parse(r.getContentText()).documents || []).map(d => (d.fields && d.fields.token && d.fields.token.stringValue) || '').filter(Boolean);
}
function fcmRequest(message, validateOnly) {
  return UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/' + FIREBASE_PROJECT + '/messages:send', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': FIREBASE_PROJECT },
    payload: JSON.stringify({ validate_only: !!validateOnly, message: message }) });
}
function fcmSend(uid, token, title, text, tag, dbg) {
  const r = fcmRequest({
    token: token,
    notification: { title: title, body: text },
    // data: service worker (firebase-messaging-sw.js) đọc tag + url từ đây khi web đã đóng để tự hiện thông báo và mở đúng trang đơn khi khách bấm vào
    data: { tag: String(tag || 'order-update'), url: SITE_ORIGIN + '/#orders', body: String(text || '') },
    webpush: {
      headers: { Urgency: 'high', TTL: '86400' },
      // title + body phải có cả trong webpush.notification: thiếu 2 trường này một số trình duyệt hiện thông báo trống / không hiện
      notification: { title: title, body: text, icon: SITE_ORIGIN + '/icon-192.png', badge: SITE_ORIGIN + '/icon-192.png', tag: tag, renotify: true, requireInteraction: true, vibrate: [200, 100, 200] },
      fcm_options: { link: SITE_ORIGIN + '/#orders' }
    } });
  const code = r.getResponseCode();
  if (code === 200) return true;
  const txt = r.getContentText();
  console.log('FCM ' + code + ': ' + txt.slice(0, 300));
  if (dbg) dbg.errors.push(code + ': ' + txt.slice(0, 200));
  if (code === 404 || /UNREGISTERED|registration-token-not-registered/.test(txt)) {   // token đã hết hạn / khách gỡ trình duyệt → xóa khỏi hệ thống
    try { UrlFetchApp.fetch(FS + 'users/' + uid + '/devices/' + encodeURIComponent(token), { method: 'delete', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }); } catch (e) {}
  }
  return false;
}
// Chạy tay 1 lần trong trình soạn thảo để kiểm tra quyền gửi FCM: phải in ra OK
function checkPushAccess() {
  const r = fcmRequest({ token: 'test-token-khong-ton-tai', notification: { title: 't', body: 't' } }, true);
  const code = r.getResponseCode();
  Logger.log(code === 400 || code === 404 || code === 200
    ? 'OK – script có quyền gửi thông báo đẩy (' + code + ')'
    : 'LỖI ' + code + ': ' + r.getContentText() + '\n→ Kiểm tra đã bật "Firebase Cloud Messaging API (V1)" và tài khoản chủ script là Owner/Editor của project Firebase.');
}

// So giá từng món trong đơn với thực đơn hiện tại của quán. Lệch → cảnh báo to đầu tin/mail để Admin kiểm tra trước khi giao.
function priceWarning(order, shop) {
  if (order.type || !shop || !shop.menu) return '';
  const menu = {}; (shop.menu || []).forEach(m => { menu[String(m.name).trim()] = Number(m.price) || 0; });
  const bad = (order.items || []).filter(i => menu[String(i.name).trim()] === undefined || menu[String(i.name).trim()] !== Number(i.price));
  const sub = (order.items || []).reduce((a, i) => a + Number(i.price) * Number(i.qty), 0);
  if (bad.length || sub !== Number(order.subtotal)) return '⚠️ GIÁ KHÔNG KHỚP THỰC ĐƠN – hãy kiểm tra trước khi giao: ' + bad.map(i => i.name).join(', ');
  const maxOff = Math.round(order.subtotal * (Number(shop.sale) || 0) / 100);
  if (Number(order.discount) > maxOff + 100000) return '⚠️ GIẢM GIÁ BẤT THƯỜNG (' + money(order.discount) + ') – hãy kiểm tra mã giảm giá.';
  return '';
}
function itemsLines(order) {
  if (order.type) return (order.items || []).map(i => '• ' + i.name).join('\n');   // Giao hàng / Mua hộ: không có giá từng món
  return (order.items || []).map(i => '• ' + i.qty + ' x ' + i.name + ' – ' + money(i.price * i.qty)).join('\n');
}
// Thông tin riêng của đơn Giao hàng / Mua hộ (mảng dòng chữ thuần)
function svcLines(o) {
  if (o.type === 'delivery') return ['Lấy hàng tại: ' + (o.shopAddress || ''), 'Người nhận: ' + (o.receiverName || '') + ' – ' + (o.receiverPhone || ''),
    'Hàng: ' + itemsLines(o).replace('• ', ''), 'Người trả phí: ' + (o.feePayer === 'receiver' ? 'người nhận' : 'người gửi') + (o.codAmount ? ' | Thu hộ: ' + money(o.codAmount) : '')];
  if (o.type === 'errand') return ['Mua tại: ' + (o.shopAddress || ''), 'Cần mua:', itemsLines(o), 'Ứng trước tối đa: ' + money(o.advanceMax) + ' (thu tiền hàng theo hóa đơn)'];
  return [];
}

function zaloText(order, shop, footer, hideCustomer) {
  const w = order._warn ? order._warn + '\n' : '';
  if (order.type) return w + '🛎 ĐƠN ' + (order.type === 'errand' ? 'MUA HỘ' : 'GIAO HÀNG') + ' MỚI #' + order.code + '\n'
    + svcLines(order).join('\n') + '\n'
    + 'Quãng đường: ' + (order.distanceKm != null ? order.distanceKm + ' km' : '?') + ' | PHÍ: ' + money(order.total) + (order.nightFee ? ' (gồm phụ phí đêm ' + money(order.nightFee) + ')' : '') + ' (' + payLabel(order) + ')\n'
    + (hideCustomer ? '' : 'Khách đặt: ' + (order.customerName || '') + ' – ' + (order.customerPhone || '') + '\n'
    + 'Giao đến: ' + (order.address || '') + '\n')
    + (order.note ? 'Ghi chú: ' + order.note + '\n' : '')
    + (order.lat && !hideCustomer ? 'Bản đồ: https://maps.google.com/?q=' + order.lat + ',' + order.lng + '\n' : '')
    + (footer || 'Vui lòng mở lamthaoangi.io.vn/quanly.html để xem đơn.');
  return w + '🛎 ĐƠN MỚI #' + order.code + '\n'
    + 'Quán: ' + (order.shopName || shop.name || '') + '\n'
    + itemsLines(order) + '\n'
    + 'Phí ship: ' + money(order.shipFee) + (order.nightFee ? ' (gồm phụ phí đêm ' + money(order.nightFee) + ')' : '') + (order.shopShip ? ' | Quán hỗ trợ ship: ' + money(order.shopShip) : '') + (order.discount ? ' | Giảm: -' + money(order.discount) : '') + '\n'
    + 'TỔNG: ' + money(order.total) + ' (' + payLabel(order) + ')\n'
    + (hideCustomer ? '' : 'Khách: ' + (order.customerName || '') + ' – ' + (order.customerPhone || '') + '\n'
    + 'Giao đến: ' + (order.address || '') + '\n')
    + (order.note ? 'Ghi chú: ' + order.note + '\n' : '')
    + (order.lat && !hideCustomer ? 'Bản đồ: https://maps.google.com/?q=' + order.lat + ',' + order.lng + '\n' : '')
    + (footer || 'Vui lòng mở lamthaoangi.io.vn/quanly.html để xem đơn.');
}

function sendOrderEmail(order, shop) {
  const rows = order.type ? '<tr><td colspan="2" style="padding:4px 8px">' + svcLines(order).map(esc).join('<br>').replace(/\n/g, '<br>') + '</td></tr>' : (order.items || []).map(i =>
    '<tr><td style="padding:4px 8px">' + i.qty + ' x ' + esc(i.name) + '</td><td style="padding:4px 8px;text-align:right">' + money(i.price * i.qty) + '</td></tr>').join('');
  const map = order.lat ? '<p><a href="https://maps.google.com/?q=' + order.lat + ',' + order.lng + '">📍 Xem vị trí khách trên bản đồ</a></p>' : '';
  const html = '<div style="font-family:Arial,sans-serif;max-width:520px">'
    + (order._warn ? '<p style="background:#fee2e2;color:#b91c1c;padding:8px;border-radius:6px"><b>' + esc(order._warn) + '</b></p>' : '')
    + '<h2 style="color:#16a34a;margin:0 0 8px">🛎 Đơn mới #' + esc(order.code) + '</h2>'
    + '<p style="margin:0 0 8px"><b>' + (order.type ? 'Dịch vụ' : 'Quán') + ':</b> ' + esc(order.shopName || shop.name) + (shop.phone ? ' · ' + esc(shop.phone) : '') + '</p>'
    + '<table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb">' + rows
    + '<tr><td style="padding:4px 8px">Phí giao hàng' + (order.nightFee ? ' (gồm phụ phí đêm ' + money(order.nightFee) + ')' : '') + '</td><td style="padding:4px 8px;text-align:right">' + money(order.shipFee) + '</td></tr>'
    + (order.discount ? '<tr><td style="padding:4px 8px">Giảm giá</td><td style="padding:4px 8px;text-align:right">-' + money(order.discount) + '</td></tr>' : '')
    + '<tr><td style="padding:4px 8px"><b>' + (order.type ? 'Phí' : 'Tổng') + '</b></td><td style="padding:4px 8px;text-align:right"><b>' + money(order.total) + '</b></td></tr></table>'
    + '<p><b>Khách:</b> ' + esc(order.customerName) + ' · <a href="tel:' + esc(order.customerPhone) + '">' + esc(order.customerPhone) + '</a><br>'
    + '<b>Giao đến:</b> ' + esc(order.address) + '<br>'
    + (order.note ? '<b>Ghi chú:</b> ' + esc(order.note) + '<br>' : '')
    + '<b>Thanh toán:</b> ' + (order.payment === 'bank' ? '<span style="color:#b45f06"><b>Chuyển khoản</b> – ' + (order.payStatus === 'paid' ? 'đã nhận tiền' : 'chờ bạn đối chiếu và xác nhận trong trang quản lý (nội dung CK: <b>' + esc(order.code) + '</b>)') + '</span>' : 'Tiền mặt khi nhận hàng') + '</p>' + map
    + (SITE_URL ? '<p><a href="' + SITE_URL + '">Mở trang quản lý</a></p>' : '') + '</div>';
  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: '🛎 Đơn mới #' + order.code + ' – ' + (order.shopName || shop.name || '') + ' – ' + money(order.total),
    htmlBody: html,
    body: zaloText(order, shop),   // bản chữ thuần cho trình đọc mail không hỗ trợ HTML
    name: 'Lâm Thao Ăn Gì?'
  });
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ===================== ZALO BOT =====================
// Gửi tin tới 1 chat_id (người đã nhắn tin cho bot). Trả true nếu gửi được.
function sendZalo(chatId, text) {
  const token = props().getProperty('ZALO_BOT_TOKEN');
  if (!token || !chatId) return false;
  const r = UrlFetchApp.fetch('https://bot-api.zaloplatforms.com/bot' + token + '/sendMessage', {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ chat_id: String(chatId), text: String(text).slice(0, 2000) }), muteHttpExceptions: true });
  let j = {};
  try { j = JSON.parse(r.getContentText()); } catch (e) {}
  if (j.ok) return true;
  console.error('Zalo lỗi ' + r.getResponseCode() + ': ' + r.getContentText() + ' (chat ' + chatId + ')');
  return false;
}

// ===================== HÀM CHẠY TAY TRONG TRÌNH SOẠN THẢO =====================
// Bước lấy chat_id: nhờ Admin/chủ quán nhắn 1 tin cho bot, rồi chạy hàm này và xem View → Logs.
// (Mỗi lần getUpdates trả 1 tin mới nhất chưa đọc nên hàm hỏi vài lần liên tiếp.)
function listZaloChats() {
  const token = props().getProperty('ZALO_BOT_TOKEN');
  const seen = {};
  for (let i = 0; i < 10; i++) {
    const r = UrlFetchApp.fetch('https://bot-api.zaloplatforms.com/bot' + token + '/getUpdates', {
      method: 'post', contentType: 'application/json', payload: JSON.stringify({ timeout: '3' }), muteHttpExceptions: true });
    let j = {};
    try { j = JSON.parse(r.getContentText()); } catch (e) {}
    const m = j.ok && j.result && j.result.message;
    if (!m) { if (!j.ok) Logger.log('Phản hồi: ' + r.getContentText()); continue; }
    const id = m.chat && m.chat.id;
    if (id && !seen[id]) { seen[id] = 1; Logger.log(id + '  |  ' + ((m.from && (m.from.display_name || m.from.name)) || '?') + '  |  "' + (m.text || '') + '"'); }
  }
  if (!Object.keys(seen).length) Logger.log('Chưa có tin nhắn mới. Hãy nhắn cho bot rồi chạy lại.');
}

// Chạy thử: gửi 1 mail + 1 tin Zalo mẫu để kiểm tra cấu hình (cấp quyền Gmail lần đầu cũng ở bước này)
function testNotify() {
  const order = { code: 'TEST01', shopName: 'Quán thử', items: [{ name: 'Phở bò', price: 45000, qty: 2 }], shipFee: 15000, discount: 0, total: 105000,
    customerName: 'Khách thử', customerPhone: '0900000000', address: 'Thôn thử, Lâm Thao', note: 'Đây là tin thử' };
  sendOrderEmail(order, {});
  String(props().getProperty('ZALO_ADMIN_IDS') || '').split(',').map(s => s.trim()).filter(Boolean).forEach(id => Logger.log(id + ': ' + sendZalo(id, zaloText(order, {}))));
}