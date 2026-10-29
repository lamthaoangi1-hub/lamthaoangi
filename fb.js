/* Lớp dữ liệu dùng chung (Firebase Auth + Firestore) cho website, Admin, Nhà bán hàng, Shipper */
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, limit, serverTimestamp }
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
export const errMsg = e => ERR[e?.code] || e?.message || 'Có lỗi xảy ra';

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
export async function register(name, phone, pass) {
  const c = await createUserWithEmailAndPassword(auth, toEmail(phone), pass);
  await setDoc(doc(db, 'users', c.user.uid), { name, phone, role:'customer', address:'', createdAt:serverTimestamp() });
}
export const logout = async () => { try { if (auth.currentUser) await disablePush(auth.currentUser.uid, false); } catch (e) {} return signOut(auth); };   // gỡ máy này khỏi danh sách nhận thông báo của tài khoản trước khi thoát

/* Admin tạo sẵn tài khoản Nhà bán hàng: dùng 1 app Firebase phụ để đăng ký (admin không bị đăng xuất), rồi admin gán vai trò + cửa hàng */
export async function createSellerAccount({ name, phone, pass, shopId, zaloId = '' }) {
  const app2 = initializeApp(firebaseConfig, 'seller-' + Date.now());
  try {
    const a2 = getAuth(app2), d2 = getFirestore(app2);
    const c = await createUserWithEmailAndPassword(a2, toEmail(phone), pass);
    await setDoc(doc(d2, 'users', c.user.uid), { name, phone, role:'customer', address:'', createdAt:serverTimestamp() });
    await signOut(a2);
    await updateDoc(doc(db, 'users', c.user.uid), { role:'seller', shopId, ...(zaloId ? { zaloId } : {}) });
  } finally { await deleteApp(app2); }
}
export const updateMyProfile = (uid, patch) => updateDoc(doc(db, 'users', uid), patch);

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

/* ---- ghi ---- */
export const placeOrder = o => addDoc(collection(db, 'orders'), { ...o, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
/* Báo đơn mới qua Gmail (admin) + Zalo (quán, admin) bằng Google Apps Script. Không chặn việc đặt đơn nếu lỗi. */
export async function notifyNewOrder(orderId) {
  if (!UPLOAD_URL) return;
  for (let i = 0; i < 3; i++) {   // thử lại tối đa 3 lần nếu mạng/Google chập chờn
    try {
      const token = await idToken();
      const res = await fetch(UPLOAD_URL, { method:'POST', body:JSON.stringify({ action:'notifyOrder', token, orderId }) });
      const j = await res.json().catch(() => null);
      console.log('[Báo đơn mới]', j);   // F12 → Console: ok:true là đã gửi
      if (j && j.ok) return;
    } catch (e) { console.warn('Không gửi được thông báo đơn mới', e); }
    await new Promise(r => setTimeout(r, 3000));
  }
}
export async function patchOrder(id, patch) {
  await updateDoc(doc(db, 'orders', id), { ...patch, updatedAt:serverTimestamp() });
  if (patch && patch.status) notifyStatus(id);   // đổi trạng thái → báo về máy khách (chạy nền, không chặn thao tác)
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
/* Trước đây chỉ lấy 300 hồ sơ đầu (thứ tự theo mã ngẫu nhiên) nên khi khách đăng ký nhiều, chủ quán/shipper mới bị rớt khỏi danh sách Admin.
   Giờ luôn lấy ĐỦ nhân sự (admin/seller/shipper) rồi mới lấy thêm khách (tối đa 2000). */
export async function listUsers() {
  const col = collection(db, 'users'), map = new Map();
  const add = s => s.docs.forEach(d => map.set(d.id, { uid:d.id, ...d.data() }));
  add(await getDocs(query(col, where('role', 'in', ['admin', 'seller', 'shipper']))));
  add(await getDocs(query(col, limit(2000))));
  return [...map.values()];
}
export const patchUser = (uid, patch) => updateDoc(doc(db, 'users', uid), patch);
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
