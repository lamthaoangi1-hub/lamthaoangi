/* Lớp dữ liệu dùng chung (Firebase Auth + Firestore) cho website, Admin, Nhà bán hàng, Shipper */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, limit, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { UPLOAD_URL } from './upload-config.js';

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
export const watchShipperOrders = (uid, cb) => watch(query(collection(db, 'orders'), where('shipperUid', '==', uid)), cb);
export const watchAllOrders = cb => watch(query(collection(db, 'orders'), limit(300)), cb);

/* ---- ghi ---- */
export const placeOrder = o => addDoc(collection(db, 'orders'), { ...o, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
export const patchOrder = (id, patch) => updateDoc(doc(db, 'orders', id), { ...patch, updatedAt:serverTimestamp() });
export const createShop = d => addDoc(collection(db, 'shops'), { ...d, createdAt:serverTimestamp() });
export const patchShop = (id, patch) => updateDoc(doc(db, 'shops', id), patch);
export const removeShop = id => deleteDoc(doc(db, 'shops', id));
export const listUsers = async () => (await getDocs(query(collection(db, 'users'), limit(300)))).docs.map(d => ({ uid:d.id, ...d.data() }));
export const patchUser = (uid, patch) => updateDoc(doc(db, 'users', uid), patch);
export const savePromo = (id, d) => id ? setDoc(doc(db, 'promos', id), d) : addDoc(collection(db, 'promos'), d);
export const removePromo = id => deleteDoc(doc(db, 'promos', id));
export const saveSettings = d => setDoc(doc(db, 'settings', 'app'), d, { merge:true });
