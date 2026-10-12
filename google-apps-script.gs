/**
 * GOOGLE APPS SCRIPT – Lâm Thao Ăn Gì?
 * 1) Lưu ảnh lên Google Drive (admin / seller)
 * 2) Thông báo ĐƠN MỚI: gửi Gmail cho Admin + tin Zalo Bot cho Quán và Admin
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
const SITE_URL = '';                                       // (tuỳ chọn) link website/admin, vd https://lamthaoangi1-hub.github.io/lamthaoangi/admin.html

/**
 * Script properties (Project Settings → Script properties) – dùng cho Zalo Bot:
 *   ZALO_BOT_TOKEN : token bot (dạng 123456:abcxyz) lấy từ Zalo Bot Creator
 *   ZALO_ADMIN_IDS : chat_id Zalo của Admin, nhiều người cách nhau dấu phẩy
 * chat_id của từng quán nhập trong Admin → Cửa hàng → Sửa → ô "Zalo ID của quán".
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
    const key = 'notified_' + body.orderId;
    if (props().getProperty(key)) return out({ ok: true, duplicate: true });
    props().setProperty(key, String(Date.now()));
  } finally { lock.releaseLock(); }

  const result = { email: false, zaloAdmin: 0, zaloShop: false };
  const shop = getDoc('shops/' + order.shopId, body.token) || {};

  console.log('notifyOrder: đơn ' + order.code + ' | quán ' + order.shopId + ' | zaloId quán: ' + (shop.zaloId || '(chưa có)') + ' | ZALO_ADMIN_IDS: ' + (props().getProperty('ZALO_ADMIN_IDS') || '(chưa có)'));
  try { sendOrderEmail(order, shop); result.email = true; } catch (e) { console.error('Gmail: ' + e); }

  const text = zaloText(order, shop);
  String(props().getProperty('ZALO_ADMIN_IDS') || '').split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
    try { if (sendZalo(id, text)) result.zaloAdmin++; } catch (e) { console.error('Zalo admin: ' + e); }
  });
  if (shop.zaloId) {
    try { result.zaloShop = sendZalo(String(shop.zaloId).trim(), text); } catch (e) { console.error('Zalo quán: ' + e); }
  }
  return out({ ok: true, result: result });
}

function itemsLines(order) {
  return (order.items || []).map(i => '• ' + i.qty + ' x ' + i.name + ' – ' + money(i.price * i.qty)).join('\n');
}

function zaloText(order, shop) {
  return '🛎 ĐƠN MỚI #' + order.code + '\n'
    + 'Quán: ' + (order.shopName || shop.name || '') + '\n'
    + itemsLines(order) + '\n'
    + 'Phí ship: ' + money(order.shipFee) + (order.discount ? ' | Giảm: -' + money(order.discount) : '') + '\n'
    + 'TỔNG: ' + money(order.total) + ' (tiền mặt)\n'
    + 'Khách: ' + (order.customerName || '') + ' – ' + (order.customerPhone || '') + '\n'
    + 'Giao đến: ' + (order.address || '') + '\n'
    + (order.note ? 'Ghi chú: ' + order.note + '\n' : '')
    + (order.lat ? 'Bản đồ: https://maps.google.com/?q=' + order.lat + ',' + order.lng + '\n' : '')
    + 'Vui lòng mở trang quán để NHẬN ĐƠN.';
}

function sendOrderEmail(order, shop) {
  const rows = (order.items || []).map(i =>
    '<tr><td style="padding:4px 8px">' + i.qty + ' x ' + esc(i.name) + '</td><td style="padding:4px 8px;text-align:right">' + money(i.price * i.qty) + '</td></tr>').join('');
  const map = order.lat ? '<p><a href="https://maps.google.com/?q=' + order.lat + ',' + order.lng + '">📍 Xem vị trí khách trên bản đồ</a></p>' : '';
  const html = '<div style="font-family:Arial,sans-serif;max-width:520px">'
    + '<h2 style="color:#16a34a;margin:0 0 8px">🛎 Đơn mới #' + esc(order.code) + '</h2>'
    + '<p style="margin:0 0 8px"><b>Quán:</b> ' + esc(order.shopName || shop.name) + (shop.phone ? ' · ' + esc(shop.phone) : '') + '</p>'
    + '<table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb">' + rows
    + '<tr><td style="padding:4px 8px">Phí giao hàng</td><td style="padding:4px 8px;text-align:right">' + money(order.shipFee) + '</td></tr>'
    + (order.discount ? '<tr><td style="padding:4px 8px">Giảm giá</td><td style="padding:4px 8px;text-align:right">-' + money(order.discount) + '</td></tr>' : '')
    + '<tr><td style="padding:4px 8px"><b>Tổng</b></td><td style="padding:4px 8px;text-align:right"><b>' + money(order.total) + '</b></td></tr></table>'
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
