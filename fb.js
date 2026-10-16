/* Lớp dữ liệu dùng chung (Firebase Auth + Firestore) cho website, Admin, Nhà bán hàng, Shipper */
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, limit, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js?v=20261016a';
import { UPLOAD_URL } from './upload-config.js?v=20261016a';

export const configured = !!firebaseConfig.apiKey && !/^(DAN_|YOUR_)/.test(firebaseConfig.apiKey);
let auth, db;
if (configured) { const app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); }

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
export const logout = () => signOut(auth);

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
export const watchAllOrders = cb => watch(query(collection(db, 'orders'), limit(300)), cb);

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
export const patchOrder = (id, patch) => updateDoc(doc(db, 'orders', id), { ...patch, updatedAt:serverTimestamp() });
export const createShop = d => addDoc(collection(db, 'shops'), { ...d, createdAt:serverTimestamp() });
export const patchShop = (id, patch) => updateDoc(doc(db, 'shops', id), patch);
export const removeShop = id => deleteDoc(doc(db, 'shops', id));
export const listUsers = async () => (await getDocs(query(collection(db, 'users'), limit(300)))).docs.map(d => ({ uid:d.id, ...d.data() }));
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
