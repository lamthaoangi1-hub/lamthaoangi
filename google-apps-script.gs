/**
 * GOOGLE APPS SCRIPT – Lâm Thao Ăn Gì?
 * 1) Lưu ảnh lên Google Drive (admin / seller)
 * 2) Thông báo ĐƠN MỚI: gửi Gmail cho Admin + tin Zalo Bot cho Quán và Admin
 * 3) Admin ĐẶT LẠI MẬT KHẨU cho người dùng (cần file appsscript.json đi kèm, xem HUONG-DAN.md)
 * 4) LƯU TRỮ GOOGLE SHEET: mọi tài khoản đăng ký + mọi đơn hàng (kể cả đổi trạng thái) được ghi vào Google Sheet.
 *    Admin xem lịch sử đơn / danh sách khách từ Sheet → gần như không tốn lượt đọc Firestore (xem HUONG-DAN-GOOGLE-SHEET.md)
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
const QUOTA_MSG = 'Không thể tải lên, vui lòng liên hệ quản trị.';   // hiện cho người dùng khi Firestore hết hạn mức miễn phí trong ngày (mã 429)

// ----- Google Sheet lưu trữ -----
// Để trống SHEET_ID: lần đầu script tự tạo 1 file Google Sheet mới (trong Drive của tài khoản chủ script) và nhớ ID trong Script properties.
// Muốn dùng file có sẵn: dán ID file (đoạn giữa /d/ và /edit trong link) vào đây hoặc vào Script property SHEET_ID.
const SHEET_ID = '';
const SHEET_USERS = 'NguoiDung', SHEET_ORDERS = 'DonHang';
const USER_COLS = ['uid', 'name', 'phone', 'role', 'shopId', 'zaloId', 'address', 'createdAt', 'updatedAt'];
const USER_TEXT = ['uid', 'name', 'phone', 'role', 'shopId', 'zaloId', 'address', 'createdAt', 'updatedAt'];
const ORDER_COLS = ['id', 'code', 'createdAt', 'updatedAt', 'status', 'type', 'shopId', 'shopName', 'uid', 'customerName', 'customerPhone', 'address', 'note', 'items',
  'subtotal', 'discount', 'shipFee', 'shopShip', 'nightFee', 'total', 'payment', 'payStatus', 'customerPaid', 'shipperUid', 'shipperName', 'shipperPhone',
  'lat', 'lng', 'distanceKm', 'codAmount', 'receiverName', 'receiverPhone', 'shopAddress', 'promoCode', 'platformOff', 'platformPct', 'weatherFee', 'shipVoucherOff', 'shipVoucherCode', 'adminShip'];   // cột mới LUÔN thêm vào cuối, để dữ liệu cũ không bị lệch
const ORDER_TEXT = ['id', 'code', 'createdAt', 'updatedAt', 'status', 'type', 'shopId', 'shopName', 'uid', 'customerName', 'customerPhone', 'address', 'note', 'items',
  'payment', 'payStatus', 'shipperUid', 'shipperName', 'shipperPhone', 'receiverName', 'receiverPhone', 'shopAddress', 'promoCode', 'shipVoucherCode'];
const ORDER_NUM = ['subtotal', 'discount', 'shipFee', 'shopShip', 'nightFee', 'total', 'lat', 'lng', 'distanceKm', 'codAmount', 'platformOff', 'platformPct', 'weatherFee', 'shipVoucherOff', 'adminShip'];

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

function verifyTokenInfo(token) {
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: token }), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  return JSON.parse(r.getContentText()).users[0];
}
function verifyToken(token) { const u = verifyTokenInfo(token); return u ? u.localId : null; }

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
    if (body.action === 'rateShop') return rateShop(body);
    if (body.action === 'resetPassword') return resetPassword(body);
    if (body.action === 'createSeller') return createSeller(body);
    if (body.action === 'claimPhone') return claimPhone(body);
    if (body.action === 'syncUser') return syncUser(body);
    if (body.action === 'syncOrder') return syncOrder(body);
    if (body.action === 'adminList') return adminList(body);
    if (body.action === 'backfill') return backfillWeb(body);
    if (body.action === 'zaloChats') return zaloChatsApi(body);
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
  // Vai trò: ưu tiên bộ nhớ đệm (không tốn lượt đọc Firestore) → Firestore → bản sao trong Google Sheet.
  // Nhờ vậy khi Firestore hết hạn mức đọc miễn phí trong ngày (429) nhà bán hàng vẫn tải ảnh lên Drive được (ảnh lưu ở Drive, không cần Firestore).
  const cache = CacheService.getScriptCache(), roleKey = 'role_' + uid;
  let me = null, cachedRole = cache.get(roleKey);
  if (cachedRole) me = { role: cachedRole };
  else {
    me = getDocAdmin('users/' + uid, body.token);   // đọc bằng quyền chủ script, lỗi thì rơi về token của người gọi
    if (me && me.role) { if (me.role === 'admin' || me.role === 'seller') cache.put(roleKey, me.role, 3600); }
    else {
      const sr = sheetUserRole(uid);
      if (sr) { me = { role: sr }; if (sr === 'admin' || sr === 'seller') cache.put(roleKey, sr, 900); console.warn('uploadImage: không đọc được Firestore, dùng vai trò từ Sheet cho ' + uid); }
      else me = null;
    }
  }
  if (!me) {
    const rr = UrlFetchApp.fetch(FS + 'users/' + uid, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    const c = rr.getResponseCode();
    console.error('uploadImage: không đọc được users/' + uid + ' → ' + c + ' ' + rr.getContentText().slice(0, 200));
    if (c === 429) return out({ ok: false, quota: true, error: QUOTA_MSG });   // hạn mức miễn phí tự làm mới khoảng 14h00 giờ Việt Nam
    if (c === 404) return out({ ok: false, error: 'Tài khoản này chưa có hồ sơ trong hệ thống (mã 404). Hãy nhờ Admin kiểm tra ở tab Người dùng.' });
    return out({ ok: false, error: c >= 500 ? QUOTA_MSG : 'Không đọc được hồ sơ tài khoản (mã ' + c + '). Thử lại sau ít phút.' });
  }
  if (me.role !== 'admin' && me.role !== 'seller') return out({ ok: false, error: 'Tài khoản không có quyền tải ảnh' });

  const mime = String(body.mime || '');
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) return out({ ok: false, error: 'Chỉ nhận ảnh JPG/PNG/WEBP' });
  const bytes = Utilities.base64Decode(body.data);
  if (bytes.length > MAX_BYTES) return out({ ok: false, error: 'Ảnh quá lớn (tối đa 3 MB)' });
  const name = String(body.name || 'anh.jpg').replace(/[^\w.\-]/g, '_').slice(0, 80);
  const file = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(bytes, mime, name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const driveUrl = f => 'https://lh3.googleusercontent.com/d/' + f.getId() + '=w900';
  const res = { ok: true, id: file.getId(), url: driveUrl(file) };

  // AI chỉnh ảnh sản phẩm thời trang: nền sạch, đủ sáng. Lỗi thì giữ ảnh gốc (không làm hỏng việc tải ảnh).
  if (body.enhance === 'fashion') {
    const r = aiEnhanceImage_(uid, bytes, mime);
    if (r.ok) {
      const ext = /png/.test(r.mime) ? '.png' : /webp/.test(r.mime) ? '.webp' : '.jpg';
      const aiFile = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(Utilities.base64Decode(r.data), r.mime, 'ai-' + name.replace(/\.[^.]+$/, '') + ext));
      aiFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      res.orig = res.url; res.url = driveUrl(aiFile); res.id = aiFile.getId(); res.ai = true;
    } else { res.ai = false; res.aiError = r.error; console.warn('aiEnhance: ' + r.error); }
  }
  return out(res);
}

// ===================== 1b) AI CHỈNH ẢNH THỜI TRANG (Muse của Meta hoặc Gemini của Google) =====================
// Khóa API KHÔNG dán vào file này: vào Project Settings → Script properties và thêm:
//   MUSE_API_KEY    = khóa tạo ở https://dev.meta.ai (mục API keys)       → dùng Muse
//   GEMINI_API_KEY  = khóa lấy ở https://aistudio.google.com/apikey         → dùng Gemini
//   AI_PROVIDER     = muse | gemini   (tùy chọn; bỏ trống = muse nếu có MUSE_API_KEY, ngược lại gemini)
//   AI_MAX_PER_6H   = số ảnh AI tối đa mỗi tài khoản / 6 giờ (mặc định 40)
//   MUSE_MODEL / GEMINI_MODEL (tùy chọn; mặc định muse-image-1.0 / gemini-2.5-flash-image)
const AI_PROMPT = 'Edit this product photo for an online fashion store. Keep the clothing / accessory EXACTLY the same: same shape, cut, color, pattern, print, logo, text and stitching. Do not add, remove or redesign anything on the product. ' +
  'Only improve the photo: replace the messy background with a clean, plain light-neutral studio background, correct exposure and white balance, soften harsh shadows, remove dust and lint, and center the product in a square 1:1 frame with a little margin. ' +
  'If a person is wearing the item, keep the person and the garment unchanged and only clean up the background and lighting. Do not add watermarks, captions or extra objects.';

function aiEnhanceImage_(uid, bytes, mime) {
  const props = PropertiesService.getScriptProperties();
  const pv = String(props.getProperty('AI_PROVIDER') || '').toLowerCase();
  const provider = pv === 'muse' || pv === 'gemini' ? pv : (props.getProperty('MUSE_API_KEY') ? 'muse' : 'gemini');
  const key = props.getProperty(provider === 'muse' ? 'MUSE_API_KEY' : 'GEMINI_API_KEY');
  if (!key) return { ok: false, error: 'Admin chưa cài ' + (provider === 'muse' ? 'MUSE_API_KEY' : 'GEMINI_API_KEY') + ' trong Script properties' };
  const cache = CacheService.getScriptCache(), ck = 'ai_' + uid, used = Number(cache.get(ck) || 0), max = Number(props.getProperty('AI_MAX_PER_6H')) || 40;
  if (used >= max) return { ok: false, error: 'đã dùng hết lượt AI tạm thời, thử lại sau' };
  const r = provider === 'muse' ? aiMuse_(key, props, bytes, mime) : aiGemini_(key, props, bytes, mime);
  if (r.ok) cache.put(ck, String(used + 1), 21600);
  return r;
}

// Muse Image (Meta Model API – kiểu "responses"): ảnh gửi dạng data URL, ảnh kết quả là base64 trong output[].image_generation_call.result
function aiMuse_(key, props, bytes, mime) {
  let r;
  try {
    r = UrlFetchApp.fetch('https://api.meta.ai/v1/responses', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + key },
      payload: JSON.stringify({
        model: props.getProperty('MUSE_MODEL') || 'muse-image-1.0',
        input: [{ type: 'message', role: 'user', content: [
          { type: 'input_text', text: AI_PROMPT },
          { type: 'input_image', image_url: 'data:' + mime + ';base64,' + Utilities.base64Encode(bytes) },
        ] }],
        tools: [{ type: 'image_generation' }],
        max_output_tokens: 2048, store: false, stream: false,
      }),
    });
  } catch (e) { return { ok: false, error: 'không gọi được Muse: ' + e }; }
  const code = r.getResponseCode(), txt = r.getContentText();
  if (code !== 200) return { ok: false, error: code === 429 ? 'Muse đang quá tải / hết hạn mức, thử lại sau' : 'Muse trả lỗi ' + code + ' ' + txt.slice(0, 200) };
  let j; try { j = JSON.parse(txt); } catch (e) { return { ok: false, error: 'Muse trả dữ liệu lạ' }; }
  const out = j.output || [];
  for (let i = 0; i < out.length; i++) {
    if (out[i].type === 'image_generation_call' && out[i].result) return { ok: true, data: out[i].result, mime: 'image/png' };
  }
  return { ok: false, error: 'Muse không trả về ảnh: ' + txt.slice(0, 200) };
}

// Gemini (Google)
function aiGemini_(key, props, bytes, mime) {
  const model = props.getProperty('GEMINI_MODEL') || 'gemini-2.5-flash-image';
  let r;
  try {
    r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { 'x-goog-api-key': key },
      payload: JSON.stringify({
        contents: [{ parts: [{ text: AI_PROMPT }, { inline_data: { mime_type: mime, data: Utilities.base64Encode(bytes) } }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });
  } catch (e) { return { ok: false, error: 'không gọi được AI: ' + e }; }
  const code = r.getResponseCode();
  if (code !== 200) return { ok: false, error: code === 429 ? 'AI đang quá tải / hết hạn mức, thử lại sau' : 'AI trả lỗi ' + code + ' ' + r.getContentText().slice(0, 120) };
  let j; try { j = JSON.parse(r.getContentText()); } catch (e) { return { ok: false, error: 'AI trả dữ liệu lạ' }; }
  const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
  for (let i = 0; i < parts.length; i++) {
    const d = parts[i].inlineData || parts[i].inline_data;
    if (d && d.data) return { ok: true, data: d.data, mime: d.mimeType || d.mime_type || 'image/png' };
  }
  return { ok: false, error: 'AI không trả về ảnh (có thể ảnh bị từ chối)' };
}
// Chạy thử trong trình soạn thảo (chọn hàm testAi → Run): cấp quyền + xem đã có khóa nào. Xem kết quả ở Execution log
function testAi() {
  const p = PropertiesService.getScriptProperties();
  Logger.log('MUSE_API_KEY: ' + (p.getProperty('MUSE_API_KEY') ? 'có' : 'chưa có') + ' | GEMINI_API_KEY: ' + (p.getProperty('GEMINI_API_KEY') ? 'có' : 'chưa có') + ' | AI_PROVIDER: ' + (p.getProperty('AI_PROVIDER') || '(tự chọn)'));
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
  try { upsertUser(uid, { name: String(body.name || shop.name || ''), phone: phone, role: 'seller', shopId: String(body.shopId), zaloId: body.zaloId ? String(body.zaloId).trim() : '', address: '' }, { createdAt: new Date().toISOString() }); } catch (e) { console.error('Sheet user: ' + e); }
  console.log('createSeller: admin ' + adminUid + ' cấp tài khoản chủ quán ' + phone + ' cho quán ' + body.shopId + (adopted ? ' (dùng lại tài khoản sẵn có)' : ''));
  return out({ ok: true, uid: uid, adopted: adopted });
}


// ===================== 3c) KHÁCH ĐĂNG KÝ LẠI SĐT BỊ "MỒ CÔI" =====================
// Tài khoản mồ côi = có trong Firebase Authentication nhưng KHÔNG có hồ sơ trong Firestore (lần đăng ký trước bị rớt mạng / tắt trang giữa chừng).
// Khách đăng ký lại sẽ bị báo "đã được đăng ký" mãi. Hàm này cho khách nhận lại đúng SĐT đó: đặt mật khẩu mới + tạo hồ sơ khách hàng.
// AN TOÀN: chỉ áp dụng cho tài khoản chưa có hồ sơ (chưa có đơn, chưa có quyền gì) và đã tạo hơn 2 phút. SĐT đã có hồ sơ thật thì bị từ chối.
function claimPhone(body) {
  const phone = String(body.phone || '').replace(/\D/g, ''), pass = String(body.password || ''), name = String(body.name || '').trim().slice(0, 100);
  const TAKEN = 'Số điện thoại đã được đăng ký. Nếu quên mật khẩu, bấm "Quên mật khẩu?" hoặc liên hệ Lâm Thao Ăn Gì qua Zalo.';
  if (!/^0\d{9}$/.test(phone)) return out({ ok: false, error: 'Số điện thoại gồm 10 số, bắt đầu bằng 0' });
  if (pass.length < 6 || pass.length > 64) return out({ ok: false, error: 'Mật khẩu từ 6 đến 64 ký tự' });
  if (name.length < 2) return out({ ok: false, error: 'Vui lòng nhập họ và tên' });
  const email = phone + '@lamthaoangi.app';
  const hdr = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': FIREBASE_PROJECT };
  const post = (op, payload) => UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/projects/' + FIREBASE_PROJECT + '/accounts' + op, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: hdr, payload: JSON.stringify(payload) });

  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const lk = post(':lookup', { email: [email] });
    if (lk.getResponseCode() !== 200) { console.error('claimPhone lookup ' + lk.getResponseCode() + ': ' + lk.getContentText().slice(0, 200)); return out({ ok: false, error: lk.getResponseCode() === 403 ? 'Máy chủ chưa đủ quyền, vui lòng liên hệ quản trị.' : TAKEN }); }
    const acc = (JSON.parse(lk.getContentText()).users || [])[0];
    if (!acc) return out({ ok: false, error: 'Không tìm thấy tài khoản, vui lòng bấm Tạo tài khoản lại.' });
    // Đã có hồ sơ thật → không được nhận
    const pr = UrlFetchApp.fetch(FS + 'users/' + acc.localId, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    const pc = pr.getResponseCode();
    if (pc === 200) return out({ ok: false, error: TAKEN });
    if (pc !== 404) return out({ ok: false, error: pc === 429 || pc >= 500 ? QUOTA_MSG : 'Không kiểm tra được tài khoản (mã ' + pc + '), thử lại sau ít phút.' });
    if (Date.now() - Number(acc.createdAt || 0) < 120000) return out({ ok: false, error: 'Tài khoản đang được tạo, vui lòng đợi 1–2 phút rồi thử lại.' });

    // Đặt mật khẩu mới (dự phòng đường cập nhật chung nếu đường theo project không có tác dụng), kiểm tra bằng cách đăng nhập thử
    const tryLogin = () => UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FIREBASE_API_KEY, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ email: email, password: pass, returnSecureToken: true }) }).getResponseCode() === 200;
    const up = post(':update', { localId: acc.localId, password: pass, disableUser: false });
    let okPass = up.getResponseCode() === 200 && (tryLogin() || (Utilities.sleep(1500), tryLogin()));
    if (!okPass) {
      UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:update', { method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: hdr,
        payload: JSON.stringify({ localId: acc.localId, password: pass, targetProjectId: FIREBASE_PROJECT, returnSecureToken: false }) });
      okPass = tryLogin() || (Utilities.sleep(1500), tryLogin());
    }
    if (!okPass) { console.error('claimPhone: không đặt được mật khẩu cho ' + acc.localId); return out({ ok: false, error: 'Chưa đặt được mật khẩu, vui lòng thử lại hoặc liên hệ quản trị.' }); }

    // Tạo hồ sơ khách hàng (chỉ khi chưa có: currentDocument.exists=false)
    const f = { name: { stringValue: name }, phone: { stringValue: phone }, role: { stringValue: 'customer' }, address: { stringValue: '' }, createdAt: { timestampValue: new Date().toISOString() } };
    const w = UrlFetchApp.fetch(FS + 'users/' + acc.localId + '?currentDocument.exists=false', { method: 'patch', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, payload: JSON.stringify({ fields: f }) });
    if (w.getResponseCode() !== 200) { console.error('claimPhone ghi hồ sơ ' + w.getResponseCode() + ': ' + w.getContentText().slice(0, 200)); return out({ ok: false, error: w.getResponseCode() === 429 ? QUOTA_MSG : TAKEN }); }
    try { upsertUser(acc.localId, { name: name, phone: phone, role: 'customer', address: '' }, { createdAt: new Date().toISOString() }); } catch (e) { console.error('Sheet user: ' + e); }
    console.log('claimPhone: đã nhận lại tài khoản mồ côi ' + phone + ' (' + acc.localId + ')');
    return out({ ok: true });
  } finally { lock.releaseLock(); }
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
  let order = getDoc('orders/' + body.orderId, body.token);
  // Firestore hết hạn mức ĐỌC trong ngày (429) nhưng vẫn ghi được đơn → không đọc lại đơn được. Dùng bản đơn do web gửi kèm (chỉ khi đúng chủ đơn) để quán / Admin vẫn nhận báo.
  if (!order && body.order && typeof body.order === 'object' && body.order.uid === uid && Array.isArray(body.order.items) && body.order.items.length) {
    order = Object.assign({}, body.order, { status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    console.warn('notifyOrder: không đọc được đơn ' + body.orderId + ' từ Firestore, dùng dữ liệu web gửi kèm');
  }
  if (!order || order.uid !== uid) return out({ ok: false, error: 'Không tìm thấy đơn' });
  // Lưu đơn vào Google Sheet trước (ghi đè theo mã đơn nên gọi lại nhiều lần cũng không bị trùng dòng)
  try { upsertOrder(body.orderId, order); } catch (e) { console.error('Sheet đơn: ' + e); }
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
  const shipperIds = onlineShipperZaloIds();   // CHỈ shipper đang bật ONLINE (presence) mới nhận tin Zalo; settings/notify.shippers không còn dùng để gửi
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
  push(shopIds, 'shop', zaloText(order, shop, 'Vui lòng mở lamthaoangi.io.vn/quanly.html để xem đơn.', !shopSeeCustomer, true));
  const fee = order.shipFull != null ? order.shipFull : order.shipFee;
  push(shipperIds, 'shipper', '🛎 Có đơn mới #' + order.code + (order.shopName ? ' – ' + order.shopName : (order.type === 'errand' ? ' – Mua hộ' : order.type === 'delivery' ? ' – Giao hàng' : '')) + (fee != null ? '\nPhí ship bạn nhận: ' + money(fee) : '') + '\nMở lamthaoangi.io.vn/quanly.html để xem và nhận đơn.');
  if (!result.email && !result.admin && !result.shop && !result.shipper && !result.customer) { try { CacheService.getScriptCache().remove('notified_' + body.orderId); } catch (e) {} return out({ ok: false, error: 'Chưa gửi được thông báo nào', result: result }); }
  return out({ ok: true, result: result });
}

// ===================== SHIPPER ONLINE → NHẬN BÁO ĐƠN QUA ZALO =====================
// Shipper bật/tắt nút ONLINE trên web → ghi presence/{uid} = { online, since, lastSeen } vào Firestore.
// Hàm này lấy Zalo ID (trong hồ sơ users/{uid}.zaloId, Admin nhập ở tab Người dùng) của các shipper đang ONLINE.
// Shipper tắt online → không có trong danh sách → không nhận tin Zalo. Bật mà quá 12 giờ không hoạt động thì bỏ qua (quên tắt / hết pin).
const SHIPPER_ONLINE_MAX_MS = 12 * 3600 * 1000;
function onlineShipperZaloIds() {
  const ids = [];
  try {
    const r = UrlFetchApp.fetch(FS.replace(/\/documents\/$/, '/documents') + ':runQuery', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: 'presence' }],
        where: { fieldFilter: { field: { fieldPath: 'online' }, op: 'EQUAL', value: { booleanValue: true } } },
        limit: 200 } }) });
    if (r.getResponseCode() !== 200) { console.error('presence lỗi ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300)); return ids; }
    JSON.parse(r.getContentText()).forEach(row => {
      if (!row.document) return;
      const uid = row.document.name.split('/').pop(), p = docToObj(row.document);
      const last = Date.parse(p.lastSeen || p.since || '');
      if (last && Date.now() - last > SHIPPER_ONLINE_MAX_MS) return;
      const u = getDocAdmin('users/' + uid, '');
      if (!u || u.role !== 'shipper') return;
      String(u.zaloId || '').split(',').map(x => x.trim()).filter(Boolean).forEach(z => { if (ids.indexOf(z) < 0) ids.push(z); });
    });
  } catch (e) { console.error('onlineShipperZaloIds: ' + e); }
  return ids;
}
// Chạy tay để kiểm tra: in ra Zalo ID của các shipper đang online
function testOnlineShippers() { Logger.log(JSON.stringify(onlineShipperZaloIds())); }

// ===================== ĐÁNH GIÁ QUÁN (1-5 sao, mỗi đơn 1 lần) =====================
// Khách đánh giá → web ghi rating vào đơn (luật Firestore chỉ cho ghi 1 lần). Hàm này cộng vào điểm của quán (shops.rateSum / rateCount / rate / rc)
// bằng quyền chủ script. Gọi lại nhiều lần vẫn an toàn: mỗi đơn chỉ được cộng 1 lần nhờ cờ ratingCounted.
function rateShop(body) {
  if (!body.token || !body.orderId) return out({ ok: false, error: 'Thiếu dữ liệu' });
  const uid = verifyToken(body.token);
  if (!uid) return out({ ok: false, error: 'Phiên đăng nhập hết hạn' });
  const order = getDoc('orders/' + body.orderId, body.token);   // đọc bằng token của khách → đúng chủ đơn mới đọc được
  if (!order || order.uid !== uid) return out({ ok: false, error: 'Không tìm thấy đơn' });
  const stars = Number(order.rating);
  if (order.status !== 'done' || order.type || !(stars >= 1 && stars <= 5)) return out({ ok: false, error: 'Đơn chưa có đánh giá hợp lệ' });
  if (order.ratingCounted === true) return out({ ok: true, duplicate: true });
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const again = getDocAdmin('orders/' + body.orderId, body.token);
    if (again && again.ratingCounted === true) return out({ ok: true, duplicate: true });
    const shop = getDocAdmin('shops/' + order.shopId, body.token);
    if (!shop) return out({ ok: false, error: 'Không tìm thấy quán' });
    // Mốc cộng dồn: nếu Admin đã chỉnh tay (rateSum/rateCount) hoặc chỉ nhập rate + rc ở trang Admin thì cộng tiếp lên đó, không quay về số thật
    let baseCnt = shop.rateCount != null ? Number(shop.rateCount) : (Number(shop.rate) > 0 ? (parseInt(shop.rc, 10) || 10) : 0);
    let baseSum = shop.rateSum != null ? Number(shop.rateSum) : Math.round(Number(shop.rate || 0) * baseCnt);
    const sum = baseSum + stars, cnt = baseCnt + 1;
    const hdr = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
    const s = UrlFetchApp.fetch(FS + 'shops/' + order.shopId + '?updateMask.fieldPaths=rateSum&updateMask.fieldPaths=rateCount&updateMask.fieldPaths=rate&updateMask.fieldPaths=rc',
      { method: 'patch', contentType: 'application/json', muteHttpExceptions: true, headers: hdr,
        payload: JSON.stringify({ fields: { rateSum: { integerValue: String(sum) }, rateCount: { integerValue: String(cnt) },
          rate: { doubleValue: Math.round(sum / cnt * 10) / 10 }, rc: { stringValue: String(cnt) } } }) });
    if (s.getResponseCode() !== 200) return out({ ok: false, error: 'Không ghi được điểm quán (' + s.getResponseCode() + ')' });
    UrlFetchApp.fetch(FS + 'orders/' + body.orderId + '?updateMask.fieldPaths=ratingCounted',
      { method: 'patch', contentType: 'application/json', muteHttpExceptions: true, headers: hdr, payload: JSON.stringify({ fields: { ratingCounted: { booleanValue: true } } }) });
    return out({ ok: true, rate: Math.round(sum / cnt * 10) / 10, count: cnt });
  } finally { lock.releaseLock(); }
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
  try { upsertOrder(body.orderId, order); } catch (e) { console.error('Sheet đơn: ' + e); }   // cập nhật trạng thái/thanh toán vào Google Sheet (kể cả khi khách tự hủy)
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
    // Đồng bộ Google Sheet cho đơn vừa đổi (bỏ qua nếu bản ghi trong Sheet đã đúng trạng thái này)
    try {
      const sig = order.status + '|' + order.updatedAt + '|' + order.payStatus + '|' + order.customerPaid, ck = 'sh_' + orderId, cc = CacheService.getScriptCache();
      if (cc.get(ck) !== sig) { upsertOrder(orderId, order); cc.put(ck, sig, 21600); }
    } catch (e) { console.error('sweep sheet: ' + e); }
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
  if (Number(order.discount) > maxOff + Number(order.platformOff || 0) + 100000) return '⚠️ GIẢM GIÁ BẤT THƯỜNG (' + money(order.discount) + ') – hãy kiểm tra mã giảm giá.';
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

// Ghi chú phụ phí trong tin báo: " (gồm phụ phí đêm 5.000đ + phụ phí thời tiết xấu 10.000đ)"
function feeNote(o) {
  const p = [];
  if (o.nightFee) p.push('phụ phí đêm ' + money(o.nightFee));
  if (o.weatherFee) p.push('phụ phí thời tiết xấu ' + money(o.weatherFee));
  return p.length ? ' (gồm ' + p.join(' + ') + ')' : '';
}
function zaloText(order, shop, footer, hideCustomer, forShop) {
  const w = order._warn ? order._warn + '\n' : '';
  if (order.type) return w + '🛎 ĐƠN ' + (order.type === 'errand' ? 'MUA HỘ' : 'GIAO HÀNG') + ' MỚI #' + order.code + '\n'
    + svcLines(order).join('\n') + '\n'
    + 'Quãng đường: ' + (order.distanceKm != null ? order.distanceKm + ' km' : '?') + ' | PHÍ: ' + money(order.total) + feeNote(order) + ' (' + payLabel(order) + ')\n'
    + (hideCustomer ? '' : 'Khách đặt: ' + (order.customerName || '') + ' – ' + (order.customerPhone || '') + '\n'
    + 'Giao đến: ' + (order.address || '') + '\n')
    + (order.note ? 'Ghi chú: ' + order.note + '\n' : '')
    + (order.lat && !hideCustomer ? 'Bản đồ: https://maps.google.com/?q=' + order.lat + ',' + order.lng + '\n' : '')
    + (footer || 'Vui lòng mở lamthaoangi.io.vn/quanly.html để xem đơn.');
  return w + '🛎 ĐƠN MỚI #' + order.code + '\n'
    + 'Quán: ' + (order.shopName || shop.name || '') + '\n'
    + itemsLines(order) + '\n'
    + (forShop
      // Tin gửi QUÁN: chỉ nói tiền món quán nhận, KHÔNG có phí ship / tổng khách trả (tránh quán hiểu nhầm)
      ? 'TIỀN MÓN QUÁN NHẬN: ' + money(Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0) + Number(order.platformOff || 0))) + (order.discount ? ' (đã trừ giảm giá ' + money(order.discount) + ')' : '') + '\n'
        + (order.shopShip ? 'Quán hỗ trợ ship (freeship): -' + money(order.shopShip) + ' → quán thực nhận ' + money(Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0) + Number(order.platformOff || 0) - Number(order.shopShip || 0))) + '\n' : '')
        + 'Phí ship khách trả cho shipper, không tính vào quán.\n'
      : 'Phí ship: ' + money(order.shipFee) + feeNote(order) + (order.shopShip ? ' | Quán hỗ trợ ship: ' + money(order.shopShip) : '') + (order.discount ? ' | Giảm: -' + money(order.discount) : '') + '\n'
        + 'TỔNG: ' + money(order.total) + ' (' + payLabel(order) + ')\n')
    + (order.platformOff ? '🎁 Lâm Thao Ăn Gì giảm cho khách ' + money(order.platformOff) + ' – quán VẪN NHẬN ĐỦ, Admin bù lại cuối ngày\n' : '')
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
    + '<tr><td style="padding:4px 8px">Phí giao hàng' + feeNote(order) + '</td><td style="padding:4px 8px;text-align:right">' + money(order.shipFee) + '</td></tr>'
    + (order.discount ? '<tr><td style="padding:4px 8px">Giảm giá</td><td style="padding:4px 8px;text-align:right">-' + money(order.discount) + '</td></tr>' : '')
    + (order.platformOff ? '<tr><td style="padding:4px 8px">🎁 Trong đó Lâm Thao Ăn Gì chịu (bù cho quán)</td><td style="padding:4px 8px;text-align:right">' + money(order.platformOff) + '</td></tr>' : '')
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


// ===================== 4) LƯU TRỮ GOOGLE SHEET =====================
function getSS() {
  const id = SHEET_ID || props().getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);   // lỗi tạm thời thì để lỗi nổi lên, TUYỆT ĐỐI không tự tạo file mới (tránh nhân đôi dữ liệu)
  const ss = SpreadsheetApp.create('Lâm Thao Ăn Gì – Dữ liệu');
  props().setProperty('SHEET_ID', ss.getId());
  return ss;
}
function sheetOf(name, cols, textCols) {
  const ss = getSS();
  let sh = ss.getSheetByName(name);
  if (sh) return sh;
  sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e8f5e9');
  sh.setFrozenRows(1);
  textCols.forEach(c => sh.getRange(1, cols.indexOf(c) + 1, sh.getMaxRows(), 1).setNumberFormat('@'));   // định dạng văn bản: giữ số 0 đầu của SĐT, không bị Sheets tự đổi ISO date
  const first = ss.getSheets()[0];
  if (ss.getSheets().length > 1 && /^(Sheet1|Trang tính1|Bảng tính1)$/.test(first.getName()) && first.getLastRow() === 0) { try { ss.deleteSheet(first); } catch (e) {} }
  return sh;
}
const usersSheet = () => sheetOf(SHEET_USERS, USER_COLS, USER_TEXT);
// Tự thêm tiêu đề cột mới (VD: platformOff) vào Sheet đã có từ trước, không đụng tới dữ liệu cũ
const ordersSheet = () => {
  const sh = sheetOf(SHEET_ORDERS, ORDER_COLS, ORDER_TEXT), have = sh.getLastColumn();
  if (have > 0 && have < ORDER_COLS.length) sh.getRange(1, have + 1, 1, ORDER_COLS.length - have).setValues([ORDER_COLS.slice(have)]).setFontWeight('bold').setBackground('#e8f5e9');
  return sh;
};
function findRow(sh, id) {
  const last = sh.getLastRow(); if (last < 2) return 0;
  const f = sh.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).matchCase(true).findNext();
  return f ? f.getRow() : 0;
}
const cellVal = v => v == null ? '' : (v instanceof Date ? v.toISOString() : (typeof v === 'object' ? JSON.stringify(v) : v));
function rowToObj(cols, row, numCols) {
  const o = {};
  cols.forEach((c, i) => {
    let v = row[i]; if (v instanceof Date) v = v.toISOString();
    if (v === '' || v == null) return;
    if (numCols && numCols.indexOf(c) >= 0) v = Number(v);
    o[c] = v;
  });
  return o;
}
function orderArr(id, o) { return ORDER_COLS.map(c => c === 'id' ? String(id) : c === 'items' ? JSON.stringify(o.items || []) : cellVal(o[c])); }
function orderFromRow(row) {
  const o = rowToObj(ORDER_COLS, row, ORDER_NUM);
  try { o.items = JSON.parse(o.items || '[]'); } catch (e) { o.items = []; }
  if ('customerPaid' in o) o.customerPaid = o.customerPaid === true || o.customerPaid === 'true' || o.customerPaid === 'TRUE';
  return o;
}
// Thêm đơn vào Sheet, hoặc ghi đè dòng cũ nếu mã đơn đã có
function upsertOrder(id, o) {
  const sh = ordersSheet(), row = orderArr(id, o);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const r = findRow(sh, id);
    if (r) sh.getRange(r, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
  } finally { lock.releaseLock(); }
}
// patch: chỉ ghi các trường có giá trị (undefined = giữ nguyên); defaults: chỉ dùng khi thêm dòng mới
function upsertUser(uid, patch, defaults) {
  const sh = usersSheet();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const r = findRow(sh, uid);
    const old = r ? rowToObj(USER_COLS, sh.getRange(r, 1, 1, USER_COLS.length).getValues()[0]) : Object.assign({}, defaults || {});
    const cur = Object.assign({}, old);
    Object.keys(patch || {}).forEach(k => { if (patch[k] !== undefined && patch[k] !== null) cur[k] = patch[k]; });
    cur.uid = String(uid); cur.updatedAt = new Date().toISOString();
    if (!cur.createdAt) cur.createdAt = cur.updatedAt;
    const row = USER_COLS.map(c => cellVal(cur[c]));
    if (r) sh.getRange(r, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
  } finally { lock.releaseLock(); }
}
function sheetUserRole(uid) {
  try { const sh = usersSheet(), r = findRow(sh, uid); return r ? String(sh.getRange(r, 4).getValue()) : null; } catch (e) { return null; }
}
// Vai trò thật của người gọi: đọc Firestore bằng token của họ; Firestore hết hạn mức thì lấy từ bản sao trong Sheet
function roleOf(uid, token) {
  const d = getDoc('users/' + uid, token);
  return d ? d.role : sheetUserRole(uid);
}

// Web gọi sau khi khách đăng ký / sửa hồ sơ (không truyền uid), hoặc Admin đổi vai trò / gán quán / Zalo ID của người khác (truyền uid)
function syncUser(body) {
  if (!body.token) return out({ ok: false, error: 'Thiếu dữ liệu' });
  const me = verifyTokenInfo(body.token);
  if (!me) return out({ ok: false, error: 'Phiên đăng nhập hết hạn' });
  const clean = v => String(v == null ? '' : v).trim().slice(0, 200);
  const pick = d => ({ name: d.name, phone: d.phone, role: d.role, shopId: d.shopId, zaloId: d.zaloId, address: d.address, createdAt: d.createdAt });
  let uid = me.localId;
  if (body.uid && body.uid !== me.localId) {
    if (roleOf(me.localId, body.token) !== 'admin') return out({ ok: false, error: 'Chỉ Admin mới đồng bộ hồ sơ người khác' });
    uid = String(body.uid);
    try { CacheService.getScriptCache().remove('role_' + uid); } catch (e) {}   // đổi vai trò → bỏ bộ nhớ đệm để quyền tải ảnh cập nhật ngay
    const d = getDoc('users/' + uid, body.token);
    if (!d) return out({ ok: false, error: 'Không đọc được hồ sơ' });
    upsertUser(uid, pick(d), {});
    return out({ ok: true });
  }
  const d = getDoc('users/' + uid, body.token);   // hồ sơ của chính mình (luật bảo mật cho phép)
  if (d) upsertUser(uid, pick(d), {});
  else upsertUser(uid, { name: clean(body.name), phone: String(me.email || '').split('@')[0], address: body.address == null ? undefined : clean(body.address) }, { role: 'customer', createdAt: new Date().toISOString() });
  return out({ ok: true });
}
// Web gọi sau khi đổi thanh toán / ghi chú đơn mà không đổi trạng thái (VD: Admin xác nhận đã nhận tiền, khách báo đã chuyển khoản)
function syncOrder(body) {
  if (!body.token || !body.orderId) return out({ ok: false, error: 'Thiếu dữ liệu' });
  if (!verifyToken(body.token)) return out({ ok: false, error: 'Phiên đăng nhập hết hạn' });
  const order = getDoc('orders/' + body.orderId, body.token);   // luật bảo mật: chỉ người có quyền xem đơn mới đọc được
  if (!order) return out({ ok: false, error: 'Không tìm thấy đơn' });
  upsertOrder(body.orderId, order);
  return out({ ok: true });
}

// ----- Admin đọc dữ liệu từ Sheet (thay cho đọc cả bộ sưu tập Firestore) -----
function adminList(body) {
  if (!body.token) return out({ ok: false, error: 'Thiếu dữ liệu' });
  const uid = verifyToken(body.token);
  if (!uid) return out({ ok: false, error: 'Phiên đăng nhập hết hạn, hãy đăng nhập lại' });
  if (roleOf(uid, body.token) !== 'admin') return out({ ok: false, error: 'Chỉ Admin mới xem được' });
  const limit = Math.min(Math.max(parseInt(body.limit, 10) || 100, 1), 1000), offset = Math.max(parseInt(body.offset, 10) || 0, 0);

  if (body.what === 'orders') {
    const sh = ordersSheet(), last = sh.getLastRow(), total = Math.max(0, last - 1);
    if (!total) return out({ ok: true, rows: [], total: 0, done: true });
    if (body.mode === 'done') {   // báo cáo doanh thu: chỉ đơn hoàn thành, chỉ các cột cần thiết
      const vals = sh.getRange(2, 1, total, ORDER_COLS.length).getValues();
      const keep = ['id', 'shopId', 'status', 'type', 'subtotal', 'discount', 'shopShip', 'platformOff', 'platformPct', 'shipVoucherOff', 'adminShip', 'shipperUid', 'shipperName', 'code', 'customerName', 'shipFee', 'total', 'createdAt', 'updatedAt'];
      const rows = vals.filter(r => r[ORDER_COLS.indexOf('status')] === 'done').map(r => { const o = orderFromRow(r), s = {}; keep.forEach(k => { if (o[k] !== undefined) s[k] = o[k]; }); return s; });
      return out({ ok: true, rows: rows, total: rows.length, done: true });
    }
    // Lịch sử đơn: mới nhất trước, phân trang từ cuối Sheet lên
    const endRow = last - offset, startRow = Math.max(2, endRow - limit + 1);
    if (endRow < 2) return out({ ok: true, rows: [], total: total, done: true });
    const vals = sh.getRange(startRow, 1, endRow - startRow + 1, ORDER_COLS.length).getValues().reverse();
    return out({ ok: true, rows: vals.map(orderFromRow), total: total, done: startRow <= 2 });
  }
  if (body.what === 'search') {   // tìm theo tên / SĐT trên TOÀN BỘ Sheet (mọi vai trò)
    const flat = x => String(x == null ? '' : x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    const q = flat(body.q).trim(); if (q.length < 2) return out({ ok: true, rows: [], total: 0, done: true });
    const sh = usersSheet(), last = sh.getLastRow();
    const all = last < 2 ? [] : sh.getRange(2, 1, last - 1, USER_COLS.length).getValues().map(r => rowToObj(USER_COLS, r));
    const rows = all.filter(u => flat(u.name).indexOf(q) >= 0 || flat(u.phone).indexOf(q) >= 0).slice(0, 50);
    return out({ ok: true, rows: rows, total: rows.length, done: true });
  }
  if (body.what === 'customers' || body.what === 'staff') {
    const sh = usersSheet(), last = sh.getLastRow();
    let all = last < 2 ? [] : sh.getRange(2, 1, last - 1, USER_COLS.length).getValues().map(r => rowToObj(USER_COLS, r));
    all = body.what === 'staff' ? all.filter(u => u.role && u.role !== 'customer') : all.filter(u => !u.role || u.role === 'customer');
    all.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const rows = body.what === 'staff' ? all : all.slice(offset, offset + limit);
    return out({ ok: true, rows: rows, total: all.length, done: body.what === 'staff' || offset + limit >= all.length });
  }
  return out({ ok: false, error: 'Yêu cầu không hợp lệ' });
}

// ----- Chạy tay trong trình soạn thảo -----
// 1) setupSheets: cấp quyền Google Sheet, tạo file + 2 tab, in ra link file
function setupSheets() {
  usersSheet(); ordersSheet();
  Logger.log('OK – file Google Sheet lưu trữ: ' + getSS().getUrl());
}
// 2) Chuyển dữ liệu CŨ từ Firestore sang Sheet (chỉ chạy 1 lần; tốn lượt đọc Firestore một lần). Hết thời gian thì chạy lại, script tự làm tiếp từ chỗ dừng.
function backfillUsers() { backfill_('users', usersSheet(), USER_COLS, (id, d) => USER_COLS.map(c => c === 'uid' ? id : cellVal(d[c]))); }
function backfillOrders() { backfill_('orders', ordersSheet(), ORDER_COLS, (id, d) => orderArr(id, d)); }
function backfillResetUsers() { props().deleteProperty('BF_users'); Logger.log('Đã đặt lại điểm dừng chuyển người dùng'); }
function backfillResetOrders() { props().deleteProperty('BF_orders'); Logger.log('Đã đặt lại điểm dừng chuyển đơn hàng'); }
function backfill_(col, sh, cols, toRow, maxMs) {
  const t0 = Date.now(), key = 'BF_' + col, limitMs = maxMs || 240000;
  const lastRow = sh.getLastRow();
  const have = {}; if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, 1).getValues().forEach(r => have[String(r[0])] = 1);
  let token = props().getProperty(key) || '', added = 0, seen = 0;
  while (Date.now() - t0 < limitMs) {
    const r = UrlFetchApp.fetch(FS + col + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : ''), { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) {
      const c = r.getResponseCode();
      Logger.log('LỖI ' + c + ': ' + r.getContentText().slice(0, 300) + (c === 429 ? '\n→ Firestore hết hạn mức hôm nay, chạy lại sau 14h00 (giờ VN); script nhớ điểm dừng.' : ''));
      return { done: false, added: added, seen: seen, error: c === 429 ? QUOTA_MSG : 'Lỗi đọc Firestore (mã ' + c + ')', quota: c === 429 };
    }
    const j = JSON.parse(r.getContentText()), rows = [];
    (j.documents || []).forEach(doc => {
      seen++; const id = doc.name.split('/').pop();
      if (!have[id]) { have[id] = 1; rows.push(toRow(id, docToObj(doc))); }
    });
    if (rows.length) {
      const lock = LockService.getScriptLock(); lock.waitLock(20000);
      try {
        const start = sh.getLastRow() + 1, need = start + rows.length - 1 - sh.getMaxRows();
        if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
        sh.getRange(start, 1, rows.length, cols.length).setValues(rows); added += rows.length;
      } finally { lock.releaseLock(); }
    }
    token = j.nextPageToken || '';
    if (token) props().setProperty(key, token); else { props().deleteProperty(key); Logger.log('XONG chuyển ' + col + ': đã xét ' + seen + ' bản ghi, thêm mới ' + added + ' dòng.'); return { done: true, added: added, seen: seen }; }
  }
  Logger.log('Hết thời gian chạy (đã thêm ' + added + ' dòng). Hãy bấm Run lại hàm này để làm tiếp.');
  return { done: false, added: added, seen: seen };
}
// Admin bấm nút "Đồng bộ" trên web: mỗi lần chạy tối đa ~2,5 phút rồi trả về, web tự gọi lại cho đến khi done = true
function backfillWeb(body) {
  if (!body.token) return out({ ok: false, error: 'Thiếu dữ liệu' });
  const uid = verifyToken(body.token);
  if (!uid) return out({ ok: false, error: 'Phiên đăng nhập hết hạn, hãy đăng nhập lại' });
  if (roleOf(uid, body.token) !== 'admin') return out({ ok: false, error: 'Chỉ Admin mới đồng bộ được' });
  if (body.what !== 'users' && body.what !== 'orders') return out({ ok: false, error: 'Yêu cầu không hợp lệ' });
  if (body.reset) props().deleteProperty('BF_' + body.what);
  const r = body.what === 'users'
    ? backfill_('users', usersSheet(), USER_COLS, (id, d) => USER_COLS.map(c => c === 'uid' ? id : cellVal(d[c])), 150000)
    : backfill_('orders', ordersSheet(), ORDER_COLS, (id, d) => orderArr(id, d), 150000);
  return out(Object.assign({ ok: !r.error }, r));
}

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

// ===================== DANH SÁCH NGƯỜI NHẮN BOT (Admin gắn Zalo ID trên web) =====================
// Mỗi tin nhắn gửi cho bot chỉ đọc được 1 lần qua getUpdates, nên lưu lại vào tab "ZaloChats" của Google Sheet để Admin xem lại danh sách bất kỳ lúc nào.
const SHEET_ZALO = 'ZaloChats', ZALO_COLS = ['id', 'name', 'text', 'at'];
const zaloSheet = () => sheetOf(SHEET_ZALO, ZALO_COLS, ZALO_COLS);
function pullZaloUpdates() {
  const token = props().getProperty('ZALO_BOT_TOKEN');
  if (!token) throw new Error('Chưa nhập ZALO_BOT_TOKEN trong Script properties');
  const sh = zaloSheet(), seen = {};
  let empty = 0, apiErr = '';
  for (let i = 0; i < 25 && empty < 2; i++) {
    const r = UrlFetchApp.fetch('https://bot-api.zaloplatforms.com/bot' + token + '/getUpdates', {
      method: 'post', contentType: 'application/json', payload: JSON.stringify({ timeout: '2' }), muteHttpExceptions: true });
    let j = {}; try { j = JSON.parse(r.getContentText()); } catch (e) {}
    if (!j.ok) { apiErr = r.getContentText().slice(0, 200); break; }
    const m = j.result && j.result.message;
    const id = m && m.chat && m.chat.id;
    if (!id) { empty++; continue; }
    empty = 0;
    seen[id] = { id: String(id), name: String((m.from && (m.from.display_name || m.from.name)) || ''), text: String(m.text || '').slice(0, 80), at: new Date().toISOString() };
  }
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    Object.keys(seen).forEach(id => {
      const row = ZALO_COLS.map(c => seen[id][c]), r = findRow(sh, id);
      if (r) sh.getRange(r, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
    });
  } finally { lock.releaseLock(); }
  return { added: Object.keys(seen).length, apiErr: apiErr };
}
function zaloChatsApi(body) {
  if (!body.token) return out({ ok: false, error: 'Thiếu dữ liệu' });
  const uid = verifyToken(body.token);
  if (!uid) return out({ ok: false, error: 'Phiên đăng nhập hết hạn, hãy đăng nhập lại' });
  if (roleOf(uid, body.token) !== 'admin') return out({ ok: false, error: 'Chỉ Admin mới xem được danh sách Zalo' });
  let info;
  try { info = pullZaloUpdates(); } catch (e) { return out({ ok: false, error: String(e.message || e) }); }
  const sh = zaloSheet(), last = sh.getLastRow();
  const rows = last < 2 ? [] : sh.getRange(2, 1, last - 1, ZALO_COLS.length).getValues().map(r => rowToObj(ZALO_COLS, r));
  rows.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  if (info.apiErr && !rows.length) return out({ ok: false, error: 'Zalo Bot báo lỗi: ' + info.apiErr });
  return out({ ok: true, rows: rows.slice(0, 200), added: info.added });
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