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
const money = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';

// ===================== ĐIỂM VÀO =====================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'notifyOrder') return notifyOrder(body);
    if (body.action === 'resetPassword') return resetPassword(body);
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

  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/projects/' + FIREBASE_PROJECT + '/accounts:update', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': FIREBASE_PROJECT },
    payload: JSON.stringify({ localId: String(body.uid), password: pass }) });
  const code = r.getResponseCode();
  if (code === 200) {
    console.log('resetPassword: admin ' + adminUid + ' đã đặt lại mật khẩu cho ' + body.uid + ' (' + (target.phone || '') + ')');   // KHÔNG ghi mật khẩu vào log
    return out({ ok: true });
  }
  console.error('resetPassword lỗi ' + code + ': ' + r.getContentText());
  let msg = 'Không đặt lại được mật khẩu (mã ' + code + ')';
  if (code === 403) msg = 'Script chưa có quyền quản lý tài khoản Firebase. Xem mục "Đặt lại mật khẩu" trong HUONG-DAN.md';
  else if (code === 404) msg = 'Tài khoản này chưa có trong Firebase Authentication';
  return out({ ok: false, error: msg });
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

  const result = { email: false, admin: 0, shop: 0, shipper: 0 };
  const shop = order.type ? {} : (getDoc('shops/' + order.shopId, body.token) || {});   // đơn Giao hàng/Mua hộ không thuộc quán nào
  const notify = getDoc('settings/notify', body.token) || {};   // do Admin lưu: { shops:{shopId:[id]}, shippers:[id] }

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
  push(shopIds, 'shop', zaloText(order, shop, 'Vui lòng mở lamthaoangi.io.vn/quanly.html để xem đơn.'));
  push(shipperIds, 'shipper', '🛎 Có đơn mới! Mở lamthaoangi.io.vn/quanly.html để xem và nhận đơn.');
  return out({ ok: true, result: result });
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

function zaloText(order, shop, footer) {
  if (order.type) return '🛎 ĐƠN ' + (order.type === 'errand' ? 'MUA HỘ' : 'GIAO HÀNG') + ' MỚI #' + order.code + '\n'
    + svcLines(order).join('\n') + '\n'
    + 'Quãng đường: ' + (order.distanceKm != null ? order.distanceKm + ' km' : '?') + ' | PHÍ: ' + money(order.total) + ' (tiền mặt)\n'
    + 'Khách đặt: ' + (order.customerName || '') + ' – ' + (order.customerPhone || '') + '\n'
    + 'Giao đến: ' + (order.address || '') + '\n'
    + (order.note ? 'Ghi chú: ' + order.note + '\n' : '')
    + (order.lat ? 'Bản đồ: https://maps.google.com/?q=' + order.lat + ',' + order.lng + '\n' : '')
    + (footer || 'Vui lòng mở lamthaoangi.io.vn/quanly.html để xem đơn.');
  return '🛎 ĐƠN MỚI #' + order.code + '\n'
    + 'Quán: ' + (order.shopName || shop.name || '') + '\n'
    + itemsLines(order) + '\n'
    + 'Phí ship: ' + money(order.shipFee) + (order.discount ? ' | Giảm: -' + money(order.discount) : '') + '\n'
    + 'TỔNG: ' + money(order.total) + ' (tiền mặt)\n'
    + 'Khách: ' + (order.customerName || '') + ' – ' + (order.customerPhone || '') + '\n'
    + 'Giao đến: ' + (order.address || '') + '\n'
    + (order.note ? 'Ghi chú: ' + order.note + '\n' : '')
    + (order.lat ? 'Bản đồ: https://maps.google.com/?q=' + order.lat + ',' + order.lng + '\n' : '')
    + (footer || 'Vui lòng mở lamthaoangi.io.vn/quanly.html để xem đơn.');
}

function sendOrderEmail(order, shop) {
  const rows = order.type ? '<tr><td colspan="2" style="padding:4px 8px">' + svcLines(order).map(esc).join('<br>').replace(/\n/g, '<br>') + '</td></tr>' : (order.items || []).map(i =>
    '<tr><td style="padding:4px 8px">' + i.qty + ' x ' + esc(i.name) + '</td><td style="padding:4px 8px;text-align:right">' + money(i.price * i.qty) + '</td></tr>').join('');
  const map = order.lat ? '<p><a href="https://maps.google.com/?q=' + order.lat + ',' + order.lng + '">📍 Xem vị trí khách trên bản đồ</a></p>' : '';
  const html = '<div style="font-family:Arial,sans-serif;max-width:520px">'
    + '<h2 style="color:#16a34a;margin:0 0 8px">🛎 Đơn mới #' + esc(order.code) + '</h2>'
    + '<p style="margin:0 0 8px"><b>' + (order.type ? 'Dịch vụ' : 'Quán') + ':</b> ' + esc(order.shopName || shop.name) + (shop.phone ? ' · ' + esc(shop.phone) : '') + '</p>'
    + '<table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb">' + rows
    + '<tr><td style="padding:4px 8px">Phí giao hàng</td><td style="padding:4px 8px;text-align:right">' + money(order.shipFee) + '</td></tr>'
    + (order.discount ? '<tr><td style="padding:4px 8px">Giảm giá</td><td style="padding:4px 8px;text-align:right">-' + money(order.discount) + '</td></tr>' : '')
    + '<tr><td style="padding:4px 8px"><b>' + (order.type ? 'Phí' : 'Tổng') + '</b></td><td style="padding:4px 8px;text-align:right"><b>' + money(order.total) + '</b></td></tr></table>'
    + '<p><b>Khách:</b> ' + esc(order.customerName) + ' · <a href="tel:' + esc(order.customerPhone) + '">' + esc(order.customerPhone) + '</a><br>'
    + '<b>Giao đến:</b> ' + esc(order.address) + '<br>'
    + (order.note ? '<b>Ghi chú:</b> ' + esc(order.note) + '<br>' : '')
    + '<b>Thanh toán:</b> Tiền mặt khi nhận hàng</p>' + map
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
