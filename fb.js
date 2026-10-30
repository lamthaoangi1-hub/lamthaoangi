/* Lớp dữ liệu dùng chung (Firebase Auth + Firestore) cho website, Admin, Nhà bán hàng, Shipper */
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, limit, orderBy, startAfter, documentId, getCountFromServer, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js?v=20261023a';
import { UPLOAD_URL } from './upload-config.js?v=20261023a';
import { VAPID_KEY } from './push-config.js?v=20261027b';

export const configured = !!firebaseConfig.apiKey && !/^(DAN_|YOUR_)/.test(firebaseConfig.apiKey);
let auth, db, fbApp;
if (configured) { fbApp = initializeApp(firebaseConfig); auth = getAuth(fbApp); db = getFirestore(fbApp); }

/* Đăng nhập bằng số điện thoại + mật khẩu (SĐT được quy đổi thành email nội bộ, không tốn SMS) */
const toEmail = p => `${String(p).trim()}@lamthaoangi.app`;
const ERR = {
  'auth/invalid-credential':'Sai số điện thoại hoặc mật khẩu', 'auth/user-not-found':'Số điện thoại chưa được đăng ký',
  'auth/wrong-password':'Mật khẩu không đúng', 'auth/email-already-in-use':'Số điện thoại đã được đăng ký',
  'auth/weak-password':'Mật khẩu tối thiểu 6 ký tự', 'auth/too-many-requests':'Thử quá nhiều lần, vui lòng đợi ít phút',
  'auth/network-request-failed':'Không có kết nối mạng', 'permission-denied':'Bạn không có quyền thực hiện thao tác này',
};
/* Firestore hết hạn mức miễn phí trong ngày (đọc/ghi) → báo chung 1 câu, không lộ chi tiết kỹ thuật */
export const QUOTA_MSG = 'Không thể tải lên, vui lòng liên hệ quản trị.';
export const isQuota = e => /resource-exhausted/.test(String(e?.code || '')) || /quota|resource.exhausted|\b429\b/i.test(String(e?.message || ''));
export const errMsg = e => isQuota(e) ? QUOTA_MSG : (ERR[e?.code] || e?.message || 'Có lỗi xảy ra');

export const ts = () => serverTimestamp();
export const currentUser = () => auth?.currentUser || null;
export const uploadUrl = UPLOAD_URL;
export const idToken = () => auth.currentUser.getIdToken();

async function fetchProfile(uid) {
  for (let i = 0; i < 4; i++) {
    const s = await getDoc(doc(db, 'users', uid));
    if (s.exists()) return { uid, ...s.data() };
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}
export function onAuth(cb) {
  if (!configured) return () => {};
  return onAuthStateChanged(auth, async u => {
    if (!u) return cb(null, null);
    try { cb(u, await fetchProfile(u.uid)); } catch (e) { cb(u, null); }
  });
}
export async function login(phone, pass) { await signInWithEmailAndPassword(auth, toEmail(phone), pass); }
/* Chờ tối đa ms mili-giây; quá hạn thì báo lỗi thay vì treo mãi (Firestore hết hạn mức / mất mạng sẽ tự thử lại vô hạn) */
const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
const SLOW = QUOTA_MSG;   // quá hạn chờ = nhiều khả năng Firestore đã hết hạn mức trong ngày
export async function register(name, phone, pass) {
  const c = await createUserWithEmailAndPassword(auth, toEmail(phone), pass);
  try { await withTimeout(setDoc(doc(db, 'users', c.user.uid), { name, phone, role:'customer', address:'', createdAt:serverTimestamp() }), 15000, SLOW); }
  catch (e) { try { await c.user.delete(); } catch (e2) {} throw e; }   // ghi hồ sơ lỗi thì xóa luôn tài khoản vừa tạo, tránh để lại tài khoản "mồ côi" (báo đã đăng ký nhưng không có trong danh sách)
  sheetCall('syncUser', { name });   // lưu tài khoản mới vào Google Sheet (chạy nền, lỗi cũng không ảnh hưởng việc đăng ký)
}
export const logout = async () => { try { if (auth.currentUser) await disablePush(auth.currentUser.uid, false); } catch (e) {} return signOut(auth); };   // gỡ máy này khỏi danh sách nhận thông báo của tài khoản trước khi thoát

/* Admin tạo sẵn tài khoản Nhà bán hàng: dùng 1 app Firebase phụ để đăng ký (admin không bị đăng xuất), rồi admin gán vai trò + cửa hàng */
export async function createSellerAccount({ name, phone, pass, shopId, zaloId = '', onStep = () => {} }) {
  if (!UPLOAD_URL) throw new Error('Chưa cấu hình Google Apps Script (upload-config.js)');
  onStep('1/2 – lấy phiên đăng nhập');
  const token = await withTimeout(idToken(), 15000, 'Không lấy được phiên đăng nhập, hãy đăng nhập lại.');
  onStep('2/2 – tạo tài khoản và hồ sơ (có thể mất 5–15 giây)');
  const res = await withTimeout(fetch(UPLOAD_URL, { method:'POST', body:JSON.stringify({ action:'createSeller', token, name, phone, password:pass, shopId, zaloId }) }), 60000,
    'Google Apps Script không phản hồi. Kiểm tra đã Deploy bản mới (New version) chưa, rồi thử lại.');
  const j = await res.json().catch(() => null);
  if (!j || !j.ok) throw new Error((j && j.error) || 'Không cấp được tài khoản, thử lại sau');
}
/* Gọi Google Apps Script (lưu / đọc dữ liệu Google Sheet). Chạy nền, trả null nếu lỗi – KHÔNG bao giờ ném lỗi. */
async function sheetCall(action, extra = {}, timeout = 0) {
  if (!UPLOAD_URL || !configured || !auth?.currentUser) return null;
  try {
    const token = await idToken();
    const req = fetch(UPLOAD_URL, { method:'POST', keepalive:!timeout, body:JSON.stringify({ action, token, ...extra }) }).then(r => r.json());
    return await (timeout ? withTimeout(req, timeout, 'Google Apps Script không phản hồi') : req);
  } catch (e) { console.warn('[Google Sheet]', action, e); return null; }
}
export const updateMyProfile = async (uid, patch) => { await updateDoc(doc(db, 'users', uid), patch); sheetCall('syncUser', { name:patch.name, address:patch.address }); };
/* Admin đổi vai trò / gán quán / Zalo ID: ghi Firestore rồi cập nhật bản sao trong Google Sheet */
export const patchUser = async (uid, patch) => { await updateDoc(doc(db, 'users', uid), patch); sheetCall('syncUser', { uid }); };

/* ---- đọc realtime ---- */
const watch = (q, cb) => onSnapshot(q, s => cb(s.docs.map(d => ({ id:d.id, ...d.data() })), null), e => cb([], e));
export const watchShops = cb => watch(collection(db, 'shops'), cb);
export const watchPromos = cb => watch(collection(db, 'promos'), cb);
export const watchShop = (id, cb) => onSnapshot(doc(db, 'shops', id), s => cb(s.exists() ? { id:s.id, ...s.data() } : null, null), e => cb(null, e));
export const watchSettings = cb => onSnapshot(doc(db, 'settings', 'app'), s => cb(s.exists() ? s.data() : {}), () => cb({}));
export const watchMyOrders = (uid, cb) => watch(query(collection(db, 'orders'), where('uid', '==', uid)), cb);
export const watchShopOrders = (shopId, cb) => watch(query(collection(db, 'orders'), where('shopId', '==', shopId)), cb);
export const watchOrdersByStatus = (st, cb) => watch(query(collection(db, 'orders'), where('status', '==', st)), cb);
export const watchOpenOrders = cb => watch(query(collection(db, 'orders'), where('status', 'in', ['pending', 'confirmed', 'preparing', 'ready'])), cb);
export const watchShipperOrders = (uid, cb) => watch(query(collection(db, 'orders'), where('shipperUid', '==', uid)), cb);
export const watchAllOrders = cb => watch(collection(db, 'orders'), cb);
/* Admin: CHỈ đơn đang xử lý (realtime). Đơn đã xong/hủy rời khỏi truy vấn này nên không còn tốn lượt đọc; lịch sử lấy từ Google Sheet (sheetOrders) */
export const watchActiveOrders = cb => watch(query(collection(db, 'orders'), where('status', 'in', ['pending', 'confirmed', 'preparing', 'ready', 'delivering'])), cb);

/* ---- ghi ---- */
export const placeOrder = o => withTimeout(addDoc(collection(db, 'orders'), { ...o, createdAt:serverTimestamp(), updatedAt:serverTimestamp() }), 30000, QUOTA_MSG);
/* Báo đơn mới qua Gmail (admin) + Zalo (quán, admin) bằng Google Apps Script. Không chặn việc đặt đơn nếu lỗi. */
export async function notifyNewOrder(orderId, orderData) {
  if (!UPLOAD_URL) return;
  for (let i = 0; i < 3; i++) {   // thử lại tối đa 3 lần nếu mạng/Google chập chờn
    try {
      const token = await idToken();
      const res = await fetch(UPLOAD_URL, { method:'POST', body:JSON.stringify({ action:'notifyOrder', token, orderId, order:orderData }) });
      const j = await res.json().catch(() => null);
      console.log('[Báo đơn mới]', j);   // F12 → Console: ok:true là đã gửi
      if (j && j.ok) return;
    } catch (e) { console.warn('Không gửi được thông báo đơn mới', e); }
    await new Promise(r => setTimeout(r, 3000));
  }
}
export async function patchOrder(id, patch) {
  await updateDoc(doc(db, 'orders', id), { ...patch, updatedAt:serverTimestamp() });
  if (patch && patch.status) notifyStatus(id);   // đổi trạng thái → báo về máy khách + cập nhật Google Sheet (chạy nền, không chặn thao tác)
  else sheetCall('syncOrder', { orderId:id });   // đổi thanh toán / khách báo đã chuyển khoản → cập nhật Google Sheet
}
/* Nhờ Apps Script gửi thông báo đẩy "đơn đã đổi trạng thái" tới các máy của khách. Lỗi cũng không ảnh hưởng việc cập nhật đơn. */
async function notifyStatus(orderId) {
  if (!UPLOAD_URL) return;
  for (let i = 0; i < 2; i++) {
    try {
      const token = await idToken();
      const res = await fetch(UPLOAD_URL, { method:'POST', keepalive:true, body:JSON.stringify({ action:'notifyStatus', token, orderId }) });   // keepalive: shipper tắt app ngay sau khi bấm thì yêu cầu vẫn được gửi đi
      const j = await res.json().catch(() => null);
      console.log('[Báo trạng thái đơn]', j);
      if (j && j.ok) return;
    } catch (e) { console.warn('Không gửi được thông báo trạng thái', e); }
    await new Promise(r => setTimeout(r, 2500));
  }
}

/* ---------------- THÔNG BÁO ĐẨY (FCM) cho khách ----------------
   Mỗi máy/trình duyệt khách cho phép thông báo sẽ có 1 token, lưu ở users/{uid}/devices/{token}. */
const MSG_URL = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js';
const pushOK = () => configured && !!VAPID_KEY && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
/* 'unsupported' | 'denied' | 'default' (chưa hỏi) | 'granted' */
const offKey = uid => 'pushOff:' + uid;
const isOff = uid => { try { return !!uid && localStorage.getItem(offKey(uid)) === '1'; } catch (e) { return false; } };
/* 'off' = trình duyệt vẫn cho phép nhưng khách đã tự tắt thông báo trên máy này (bật lại được ngay, không cần hỏi quyền) */
export const pushState = uid => !pushOK() ? 'unsupported' : (Notification.permission === 'granted' && isOff(uid) ? 'off' : Notification.permission);
async function saveToken(uid) {
  const { getMessaging, getToken } = await import(MSG_URL);
  const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js', { updateViaCache:'none' });   // luôn kiểm tra bản service worker mới nhất (bản cũ kẹt cache là nguyên nhân hay gặp khiến thoát web không nhận được thông báo)
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(fbApp), { vapidKey:VAPID_KEY, serviceWorkerRegistration:reg });
  if (!token) throw new Error('Không lấy được mã thông báo của thiết bị');
  await setDoc(doc(db, 'users', uid, 'devices', token), { token, ua:navigator.userAgent.slice(0, 120), updatedAt:serverTimestamp() });
  try { localStorage.setItem('fcmTok:' + uid, token); } catch (e) {}
  return token;
}
/* Gọi khi khách bấm "Bật thông báo" (bắt buộc từ thao tác bấm của khách thì trình duyệt mới hỏi quyền) */
export async function enablePush(uid) {
  if (!pushOK()) throw new Error('Trình duyệt này chưa hỗ trợ thông báo');
  const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (p !== 'granted') throw new Error(p === 'denied' ? 'Bạn đang chặn thông báo. Hãy cho phép “Thông báo” trong cài đặt trang web.' : 'Bạn chưa cho phép thông báo');
  try { localStorage.removeItem(offKey(uid)); } catch (e) {}   // bật lại: bỏ cờ "đã tắt"
  return saveToken(uid);
}
/* Đã cho phép từ trước: mỗi lần đăng nhập lặng lẽ cập nhật lại token (token có thể đổi) */
export async function syncPush(uid) {
  if (!pushOK() || Notification.permission !== 'granted' || isOff(uid)) return;   // khách đã tự tắt thì không tự bật lại
  try { await saveToken(uid); } catch (e) { console.warn('Không đồng bộ được token thông báo', e); }
}
/* Khi khách đã cho phép thông báo: mỗi lần khách quay lại tab / mở lại web trong lúc vẫn đăng nhập,
   lặng lẽ đồng bộ lại token (tối đa 1 lần / 10 phút). Nhờ vậy khách cấp quyền ở cài đặt trình duyệt,
   hoặc token bị FCM đổi, thì máy vẫn được đăng ký lại ngay mà không cần đăng xuất / đăng nhập lại.
   Gắn listener 1 lần duy nhất; gọi lại khi đổi tài khoản để cập nhật uid. */
let resyncUid = null, resyncAt = 0, resyncBound = false;
export function autoResyncPush(uid) {
  resyncUid = uid || null;
  if (!uid) return;
  if (!resyncAt) resyncAt = Date.now();   // vừa syncPush lúc đăng nhập xong, không cần chạy lại ngay
  if (resyncBound) return; resyncBound = true;
  const kick = () => {
    if (!resyncUid || document.visibilityState !== 'visible') return;
    if (Date.now() - resyncAt < 600000) return;
    resyncAt = Date.now(); syncPush(resyncUid);
  };
  document.addEventListener('visibilitychange', kick);
  window.addEventListener('focus', kick);
}
/* byUser=true: khách chủ động tắt (nhớ lại để lần sau không tự bật). byUser=false: chỉ gỡ máy khi đăng xuất, đăng nhập lại sẽ tự bật lại. */
export async function disablePush(uid, byUser = true) {
  if (byUser) { try { localStorage.setItem(offKey(uid), '1'); } catch (e) {} }
  let tk = ''; try { tk = localStorage.getItem('fcmTok:' + uid) || ''; } catch (e) {}
  if (tk) { try { await deleteDoc(doc(db, 'users', uid, 'devices', tk)); } catch (e) {} try { localStorage.removeItem('fcmTok:' + uid); } catch (e) {} }
  if (pushOK()) { try { const { getMessaging, deleteToken } = await import(MSG_URL); await deleteToken(getMessaging(fbApp)); } catch (e) {} }
}
/* Đang mở web mà có thông báo tới: trình duyệt không tự hiện, nên gọi cb({title, body}) để web tự hiện toast */
export async function onForegroundPush(cb) {
  if (!pushOK()) return;
  try { const { getMessaging, onMessage } = await import(MSG_URL); onMessage(getMessaging(fbApp), p => cb(p.notification || {})); } catch (e) {}
}
export const createShop = d => addDoc(collection(db, 'shops'), { ...d, createdAt:serverTimestamp() });
export const patchShop = (id, patch) => updateDoc(doc(db, 'shops', id), patch);
export const removeShop = id => deleteDoc(doc(db, 'shops', id));
/* Danh sách người dùng cho Admin: nhân sự (admin/seller/shipper) luôn lấy ĐỦ; khách lấy theo từng trang (mặc định 300) để tiết kiệm lượt đọc, bấm "Tải thêm" để lấy tiếp.
   Trước đây chỉ lấy 300 hồ sơ đầu (thứ tự theo mã ngẫu nhiên) nên chủ quán/shipper mới bị rớt khỏi danh sách. */
export async function listStaff() {
  try {
    const s = await getDocs(query(collection(db, 'users'), where('role', 'in', ['admin', 'seller', 'shipper'])));
    return s.docs.map(d => ({ uid:d.id, ...d.data() }));
  } catch (e) {   // Firestore hết hạn mức → lấy bản sao nhân sự trong Google Sheet để Admin vẫn xem được
    const j = await sheetCall('adminList', { what:'staff' }, 30000);
    if (j && j.ok) return j.rows;
    throw e;
  }
}
/* Khách hàng: đọc từ Google Sheet (không tốn lượt đọc Firestore). cursor = số khách đã tải. Chưa cấu hình / script chưa cập nhật thì rơi về đọc Firestore như cũ. */
const SHEET_PAGE_FAIL = 'Chưa đọc được Google Sheet. Hãy Deploy bản Apps Script mới (xem HUONG-DAN-GOOGLE-SHEET.md).';
let custTotal = null;
export async function listCustomers(cursor = null, size = 300) {
  const offset = typeof cursor === 'number' ? cursor : 0;
  const j = await sheetCall('adminList', { what:'customers', offset, limit:size }, 40000);
  if (j && j.ok) { custTotal = j.total; return { list:j.rows.map(u => ({ ...u })), cursor:offset + j.rows.length, done:!!j.done }; }
  if (typeof cursor === 'number') throw new Error((j && j.error) || SHEET_PAGE_FAIL);
  const q = query(collection(db, 'users'), where('role', '==', 'customer'), orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(size));
  const s = await getDocs(q);   // dự phòng (chỉ khi Sheet chưa dùng được)
  custTotal = null;
  return { list: s.docs.map(d => ({ uid:d.id, ...d.data() })), cursor: s.docs.length ? s.docs[s.docs.length - 1] : cursor, done: s.docs.length < size };
}
/* Tổng số khách: lấy từ lần đọc Google Sheet gần nhất (không tốn thêm lượt đọc); chưa có thì đếm bên Firestore (rất rẻ) */
export async function countCustomers() {
  if (custTotal != null) return custTotal;
  try { return (await getCountFromServer(query(collection(db, 'users'), where('role', '==', 'customer')))).data().count; } catch (e) { return null; }
}
/* Tìm người dùng theo tên / SĐT: tìm trong Sheet, và nếu gõ đủ SĐT thì hỏi thêm Firestore đúng 1 truy vấn (để tìm được cả người chưa kịp chuyển sang Sheet) */
export async function searchUsers(q) {
  const found = {};
  const j = await sheetCall('adminList', { what:'search', q }, 30000);
  if (j && j.ok) j.rows.forEach(u => { found[u.uid] = u; });
  const digits = String(q).replace(/\D/g, '');
  if (digits.length >= 9) {
    try { (await getDocs(query(collection(db, 'users'), where('phone', '==', digits), limit(3)))).docs.forEach(d => { found[d.id] = { uid:d.id, ...d.data() }; }); }
    catch (e) { if (!(j && j.ok)) throw e; }
  }
  return Object.values(found);
}
/* Đếm bản ghi trên Firestore (chỉ vài lượt đọc) để so với Google Sheet và báo thiếu */
export async function fsCount(what) {
  try {
    const q = what === 'customers' ? query(collection(db, 'users'), where('role', '==', 'customer')) : collection(db, what);
    return (await getCountFromServer(q)).data().count;
  } catch (e) { return null; }
}
/* Đồng bộ dữ liệu cũ Firestore → Google Sheet ngay trên web (script chạy từng đợt ~2,5 phút, hàm này tự gọi lại đến khi xong) */
export async function sheetBackfill(what, onProgress) {
  let added = 0;
  for (let i = 0; i < 40; i++) {
    const j = await sheetCall('backfill', { what }, 240000);
    if (!j) throw new Error(SHEET_PAGE_FAIL);
    if (!j.ok) throw new Error(j.quota ? QUOTA_MSG : (j.error || SHEET_PAGE_FAIL));
    added += j.added || 0; if (onProgress) onProgress(added, !!j.done);
    if (j.done) return added;
  }
  return added;
}
/* Lịch sử đơn từ Google Sheet: mới nhất trước. before = số đơn đã tải. */
export async function sheetOrders(before = 0, size = 100) {
  const j = await sheetCall('adminList', { what:'orders', offset:before, limit:size }, 40000);
  if (!j || !j.ok) throw new Error((j && j.error) || SHEET_PAGE_FAIL);
  return { rows:j.rows, total:j.total, done:!!j.done };
}
/* Đơn đã hoàn thành (cột gọn) cho báo cáo doanh thu */
export async function sheetDoneOrders() {
  const j = await sheetCall('adminList', { what:'orders', mode:'done' }, 60000);
  if (!j || !j.ok) throw new Error((j && j.error) || SHEET_PAGE_FAIL);
  return j.rows;
}
/* Admin đặt lại mật khẩu cho người dùng: gọi Apps Script (script tự kiểm tra người gọi là Admin rồi đổi mật khẩu trong Firebase Auth) */
export async function resetUserPassword(uid, password) {
  if (!UPLOAD_URL) throw new Error('Chưa cấu hình Google Apps Script (upload-config.js)');
  const token = await idToken();
  const res = await fetch(UPLOAD_URL, { method:'POST', body:JSON.stringify({ action:'resetPassword', token, uid, password }) });
  const j = await res.json().catch(() => null);
  if (!j || !j.ok) throw new Error((j && j.error) || 'Không đặt lại được mật khẩu, thử lại sau');
}
export const savePromo = (id, d) => id ? setDoc(doc(db, 'promos', id), d) : addDoc(collection(db, 'promos'), d);
export const removePromo = id => deleteDoc(doc(db, 'promos', id));
/* Danh sách Zalo ID nhận báo đơn mới: { shops:{ shopId:[id...] }, shippers:[id...] } – Admin ghi, Apps Script đọc */
export const saveNotify = d => setDoc(doc(db, 'settings', 'notify'), d);
export const saveSettings = d => setDoc(doc(db, 'settings', 'app'), d, { merge:true });
