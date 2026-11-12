/* Trang khách xác nhận ĐƠN DO QUÁN TẠO HỘ: dat.html?d=<mã đơn nháp>
   Khách chỉ cần chia sẻ vị trí rồi bấm Gửi đơn. Không cần đăng ký / đăng nhập: trang tự đăng nhập ẩn danh (Firebase Anonymous Auth).
   Dùng 1 "app Firebase" riêng tên 'order' nên không đụng tới phiên đăng nhập của website chính. Đơn tạo ra giống hệt đơn đặt trên web
   (cùng luật Firestore, cùng thông báo Gmail + Zalo cho Admin / quán / shipper online). */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, addDoc, updateDoc, collection, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js?v=20261023a';
import { UPLOAD_URL } from './upload-config.js?v=20261023a';
import { isOpenNow } from './hours.js?v=20261023a';

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const money = n => (Number(n) || 0).toLocaleString('vi-VN').replace(/,/g, '.') + 'đ';
let toastT;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); };
const app = $('#app'), foot = $('#foot'), footIn = $('#foot-in');
const showFoot = html => { footIn.innerHTML = html; foot.hidden = !html; };
const message = (icon, title, text = '', extra = '') => { showFoot(''); app.innerHTML = `<div class="msg"><div class="big">${icon}</div><h1>${esc(title)}</h1><p class="muted">${text}</p>${extra}</div>`; };
const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
const QUOTA_MSG = 'Không thể gửi đơn lúc này, vui lòng liên hệ quán hoặc quản trị.';
const isQuota = e => /resource-exhausted/.test(String(e?.code || '')) || /quota|resource.exhausted|\b429\b/i.test(String(e?.message || ''));

/* ---- Phí giao hàng: phải GIỐNG HỆT app.js (SHIPCFG, phụ phí đêm, thời tiết xấu, freeship, giảm giá Lâm Thao Ăn Gì) để khớp luật Firestore ---- */
const SHIPCFG = { base:15000, baseKm:3.5, perKm:3000, road:1.3 };
const NIGHT = { fee:5000, from:22, to:5 };
const nightFee = () => { const h = new Date(Date.now() + 7 * 36e5).getUTCHours(); return (h >= NIGHT.from || h < NIGHT.to) ? NIGHT.fee : 0; };
const haverKm = (a, b) => { const R = 6371, r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
function shipQuote(s, loc) {
  if (!loc) return { mode:'need-loc', fee:0, km:null, extraKm:0 };
  if (s.lat == null || s.lng == null) return { mode:'flat', fee:s.shipFee ?? SHIPCFG.base, km:null, extraKm:0 };
  const km = Math.round(haverKm(loc, { lat:s.lat, lng:s.lng }) * SHIPCFG.road * 10) / 10;
  const extraKm = Math.max(0, Math.ceil(Math.round((km - SHIPCFG.baseKm) * 10) / 10));
  return { mode:'km', fee:SHIPCFG.base + extraKm * SHIPCFG.perKm, km, extraKm };
}
let SHOP = null, DRAFT = null, PLAT = 0, WX = { on:false, fee:0, label:'Phụ phí thời tiết xấu' }, LOC = null;
function calc() {
  const s = SHOP, sub = DRAFT.items.reduce((a, l) => a + l.price * l.qty, 0);
  const disc = Math.round(sub * (+s.sale || 0) / 100);
  const platOff = PLAT > 0 ? Math.max(0, Math.round((sub - disc) * PLAT / 100)) : 0;
  const q = shipQuote(s, LOC), need = q.mode === 'need-loc';
  const hit = !!(s.freeShipMin && sub >= s.freeShipMin);
  const shipBase = hit ? (s.freeShipAll ? 0 : (q.mode === 'km' ? q.extraKm * SHIPCFG.perKm : 0)) : q.fee;
  const night = need ? 0 : nightFee(), wx = need ? 0 : (WX.on && WX.fee > 0 ? WX.fee : 0);
  const ship = shipBase + night + wx, shipFull = need ? 0 : q.fee + night + wx;
  const shopShip = Math.max(0, shipFull - ship);
  return { sub, disc, platOff, ship, shipBase, night, wx, shipFull, shopShip, mode:q.mode, km:q.km, total:sub - disc - platOff + ship };
}

/* ---- Màn hình đặt ---- */
function render() {
  const c = calc(), d = DRAFT, need = c.mode === 'need-loc';
  const closed = !isOpenNow(SHOP);
  app.innerHTML = `
    <div class="card"><div class="shop">🏪 ${esc(SHOP.name || d.shopName)}</div><div class="muted" style="margin-top:2px">Quán đã lên đơn giúp bạn. Bạn chỉ cần chia sẻ vị trí rồi bấm Gửi đơn.</div></div>
    ${closed ? '<div class="warn">Quán hiện đang đóng cửa nên chưa nhận đơn. Bạn hãy mở lại link này khi quán mở cửa nhé.</div>' : ''}
    <div class="card"><h2>Món bạn đã đặt</h2>${d.items.map(l => `<div class="item"><span class="q">${l.qty}×</span><span class="n">${esc(l.name)}</span><b>${money(l.price * l.qty)}</b></div>`).join('')}</div>
    <div class="card"><h2>Người nhận</h2><div class="row"><span class="muted">Tên</span><b>${esc(d.customerName)}</b></div><div class="row"><span class="muted">Số điện thoại</span><b>${esc(d.customerPhone)}</b></div>
      <label for="addr" style="margin-top:8px">Địa chỉ nhận hàng <span class="muted">(không bắt buộc, giúp shipper tìm nhà dễ hơn)</span></label>
      <input type="text" id="addr" maxlength="200" placeholder="Số nhà, thôn/xóm…" value="${esc(ADDR)}" autocomplete="street-address">
      ${d.note ? `<div class="muted" style="margin-top:8px">Ghi chú: ${esc(d.note)}</div>` : ''}</div>
    <div class="card loc ${LOC ? 'ok' : ''}"><div class="ic">${LOC ? '✓' : '📍'}</div>
      <div class="tx"><b>${LOC ? 'Đã chia sẻ vị trí giao hàng' : 'Chia sẻ vị trí giao hàng'}</b><span class="muted">${LOC ? 'Shipper sẽ thấy đúng vị trí của bạn trên bản đồ.' : 'Bắt buộc để gửi đơn. Bấm nút, rồi chọn "Cho phép" khi điện thoại hỏi.'}</span></div>
      ${LOC ? '' : '<button class="btn sm" id="loc-btn">Chia sẻ</button>'}</div>
    <div class="card"><h2>Thanh toán</h2>
      <div class="row"><span>Tạm tính</span><b>${money(c.sub)}</b></div>
      ${c.disc ? `<div class="row off"><span>Giảm giá quán (${+SHOP.sale}%)</span><b>-${money(c.disc)}</b></div>` : ''}
      ${c.platOff ? `<div class="row off"><span>🎁 Ưu đãi Lâm Thao Ăn Gì (${PLAT}%)</span><b>-${money(c.platOff)}</b></div>` : ''}
      ${need ? `<div class="row"><span>Phí giao hàng</span><b style="color:var(--or)">Chia sẻ vị trí để tính</b></div>`
        : `<div class="row"><span>Phí giao hàng${c.mode === 'km' ? ` <span class="muted">· ${String(c.km).replace('.', ',')} km</span>` : ''}</span><b>${c.shipBase ? money(c.shipBase) : 'Miễn phí'}</b></div>`}
      ${c.night ? `<div class="row"><span>Phụ phí ship đêm</span><b>${money(c.night)}</b></div>` : ''}
      ${c.wx ? `<div class="row"><span>🌧 ${esc(WX.label)}</span><b>${money(c.wx)}</b></div>` : ''}
      <div class="total"><span>Tổng cộng${need ? ' <span class="muted" style="font-weight:500">(chưa gồm phí ship)</span>' : ''}</span><b>${money(c.total)}</b></div>
      <div class="muted" style="margin-top:8px">💵 Thanh toán tiền mặt khi nhận hàng</div></div>`;
  showFoot(`<button class="btn" id="send" ${LOC && !closed ? '' : 'disabled'}>${closed ? 'Quán đang đóng cửa' : LOC ? 'Gửi đơn · ' + money(c.total) : 'Chia sẻ vị trí để gửi đơn'}</button>`);
  $('#addr').addEventListener('input', e => { ADDR = e.target.value; });
  $('#loc-btn')?.addEventListener('click', shareLoc);
  $('#send')?.addEventListener('click', send);
}
let ADDR = '', auth, db, sending = false;

function shareLoc(e) {
  const btn = e.currentTarget;
  if (!navigator.geolocation) return toast('Thiết bị không hỗ trợ định vị');
  btn.disabled = true; btn.textContent = 'Đang lấy…';
  navigator.geolocation.getCurrentPosition(p => {
    LOC = { lat:+p.coords.latitude.toFixed(6), lng:+p.coords.longitude.toFixed(6), acc:Math.round(p.coords.accuracy) };
    render(); toast('Đã lấy vị trí của bạn');
  }, er => {
    btn.disabled = false; btn.textContent = 'Chia sẻ';
    toast(er.code === 1 ? 'Bạn đã chặn quyền vị trí. Hãy bật "Vị trí" cho trình duyệt rồi bấm lại.' : 'Không lấy được vị trí, hãy bật GPS rồi thử lại.');
  }, { enableHighAccuracy:true, timeout:20000, maximumAge:0 });
}

async function notifyNewOrder(user, orderId, data) {
  if (!UPLOAD_URL) return;
  for (let i = 0; i < 3; i++) {
    try {
      const token = await user.getIdToken();
      const r = await fetch(UPLOAD_URL, { method:'POST', body:JSON.stringify({ action:'notifyOrder', token, orderId, order:data }) });
      const j = await r.json().catch(() => null);
      console.log('[Báo đơn mới]', j);
      if (j && j.ok) return;
    } catch (e) { console.warn('Không gửi được thông báo đơn mới', e); }
    await new Promise(r => setTimeout(r, 3000));
  }
}

let MAINT = { on:false, msg:'' };
async function send() {
  if (sending || !LOC) return;
  if (MAINT.on) return toast('Hệ thống đang bảo trì, chưa nhận đơn');
  if (!isOpenNow(SHOP)) return toast('Quán đang đóng cửa');
  const c = calc(); if (c.mode === 'need-loc') return toast('Hãy chia sẻ vị trí để tính phí giao hàng');
  sending = true;
  const btn = $('#send'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Đang gửi đơn…';
  try {
    // Chỉ đăng nhập ẩn danh khi khách thật sự gửi đơn (người chỉ mở xem thì không tạo tài khoản)
    const user = auth.currentUser || (await withTimeout(signInAnonymously(auth), 20000, 'Không kết nối được, vui lòng thử lại.')).user;
    const addr = ADDR.trim();
    const data = {
      code:'LT' + Date.now().toString().slice(-6), uid:user.uid, customerName:DRAFT.customerName, customerPhone:DRAFT.customerPhone,
      address:`${addr || 'Giao theo vị trí GPS khách đã chia sẻ'}, Lâm Thao, Phú Thọ`,
      note:[DRAFT.note, '(Quán tạo đơn hộ khách)'].filter(Boolean).join(' '),
      shopId:DRAFT.shopId, shopName:SHOP.name || DRAFT.shopName, shopPhone:SHOP.phone || '', shopAddress:SHOP.address || '', shopLat:SHOP.lat ?? null, shopLng:SHOP.lng ?? null,
      lat:LOC.lat, lng:LOC.lng, locAcc:LOC.acc,
      items:DRAFT.items.map(l => ({ name:l.name, price:l.price, qty:l.qty })), subtotal:c.sub, discount:c.disc + c.platOff,
      ...(c.platOff ? { platformOff:c.platOff, platformPct:PLAT } : {}), promoCode:'',
      shipFee:c.ship, shipFull:c.shipFull, ...(c.shopShip ? { adminShip:c.shopShip } : {}), ...(c.night ? { nightFee:c.night } : {}), ...(c.wx ? { weatherFee:c.wx } : {}),
      distanceKm:c.km, total:c.total, payment:'cash', status:'pending', viaSeller:true, draftId:DRAFT.id,
    };
    const ref = await withTimeout(addDoc(collection(db, 'orders'), { ...data, createdAt:serverTimestamp(), updatedAt:serverTimestamp() }), 30000, QUOTA_MSG);
    try { localStorage.setItem('lt_draft_' + DRAFT.id, ref.id); } catch (e) {}
    notifyNewOrder(user, ref.id, data);   // Gmail admin + Zalo quán / admin / shipper online (chạy nền)
    updateDoc(doc(db, 'drafts', DRAFT.id), { status:'used', usedAt:serverTimestamp(), orderId:ref.id }).catch(() => {});   // link chỉ dùng 1 lần, tránh đặt trùng
    track(ref.id, data.code, data.total);
  } catch (e) {
    sending = false; render();
    const code = String(e?.code || '');
    toast(code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation' ? 'Hệ thống chưa bật đặt đơn bằng link, vui lòng báo cho quán.'
      : isQuota(e) ? QUOTA_MSG : code === 'permission-denied' ? 'Không gửi được đơn (quán có thể vừa đóng cửa). Vui lòng thử lại hoặc báo cho quán.' : (e.message || 'Có lỗi xảy ra, vui lòng thử lại'));
  }
}

/* ---- Theo dõi đơn sau khi gửi (khách đọc được đơn của chính mình) ---- */
const STEPS = [['pending', 'Đã gửi đơn, chờ quán/tài xế nhận'], ['preparing', 'Quán đang chuẩn bị món'], ['delivering', 'Tài xế đang giao tới bạn'], ['done', 'Giao hàng thành công']];
const RANK = { pending:0, confirmed:1, preparing:1, ready:1, delivering:2, done:3 };
function track(orderId, code, total) {
  showFoot('');
  const draw = o => {
    if (o && o.status === 'cancelled') return app.innerHTML = `<div class="msg"><div class="big">❌</div><h1>Đơn #${esc(code)} đã bị hủy</h1><p class="muted">Cần hỗ trợ, bạn hãy liên hệ quán hoặc nhắn Zalo cho Lâm Thao Ăn Gì.</p></div>`;
    const r = RANK[o?.status] ?? 0;
    app.innerHTML = `<div class="msg"><div class="big">${r >= 3 ? '🎉' : '✅'}</div><h1>${r >= 3 ? 'Giao hàng thành công' : 'Đã gửi đơn thành công!'}</h1>
      <p class="muted">Mã đơn <b>#${esc(code)}</b> · ${money(o?.total ?? total)}${r < 3 ? '<br>Bạn có thể tắt trang này, tài xế sẽ gọi khi giao tới.' : '<br>Chúc bạn ngon miệng!'}</p></div>
      <div class="card"><div class="steps">${STEPS.map(([k, t], i) => `<div class="step ${i < r ? 'done' : i === r ? 'on' : ''}"><i>${i < r ? '✓' : i + 1}</i><span>${t}</span></div>`).join('')}</div>
        ${o?.shipperName ? `<div class="muted" style="margin-top:10px">Tài xế: <b>${esc(o.shipperName)}</b>${o.shipperPhone ? ` · <a href="tel:${esc(o.shipperPhone)}">${esc(o.shipperPhone)}</a>` : ''}</div>` : ''}</div>
      <a class="btn o" style="text-decoration:none" href="./">Xem thêm quán ngon ở Lâm Thao</a>`;
  };
  draw(null);
  onSnapshot(doc(db, 'orders', orderId), s => { if (s.exists()) draw(s.data()); }, () => {});
}

/* ---- Khởi động ---- */
(async function main() {
  const id = (new URLSearchParams(location.search).get('d') || '').trim();
  if (!id || !/^[A-Za-z0-9]{10,40}$/.test(id)) return message('🔗', 'Link không hợp lệ', 'Vui lòng mở đúng link mà quán đã gửi cho bạn.');
  if (!firebaseConfig.apiKey) return message('⚠️', 'Chưa cấu hình', 'Website chưa được cấu hình. Vui lòng liên hệ quán.');
  const fbApp = initializeApp(firebaseConfig, 'order');
  auth = getAuth(fbApp); db = getFirestore(fbApp);
  let saved = ''; try { saved = localStorage.getItem('lt_draft_' + id) || ''; } catch (e) {}
  try {
    const ds = await withTimeout(getDoc(doc(db, 'drafts', id)), 20000, 'Kết nối chậm, vui lòng tải lại trang.');
    if (!ds.exists()) return message('🔗', 'Không tìm thấy đơn', 'Link này không đúng hoặc quán đã xóa. Hãy nhờ quán gửi lại link mới.');
    DRAFT = { id, ...ds.data() };
    if (DRAFT.status !== 'open') {
      if (saved) { app.innerHTML = ''; return track(saved, '', 0); }   // chính máy này đã đặt → cho xem lại trạng thái
      return message('✅', 'Link này đã được dùng', 'Đơn này đã được gửi đi rồi. Nếu cần đặt thêm, hãy nhờ quán gửi link mới.');
    }
    if (Date.now() - (DRAFT.createdAtMs || 0) > 3 * 864e5) return message('⌛', 'Link đã hết hạn', 'Hãy nhờ quán gửi lại link mới cho bạn.');
    const [ss, st] = await Promise.all([getDoc(doc(db, 'shops', DRAFT.shopId)), getDoc(doc(db, 'settings', 'app')).catch(() => null)]);
    if (!ss.exists()) return message('🏪', 'Quán không còn hoạt động', 'Vui lòng liên hệ quán để được hỗ trợ.');
    SHOP = ss.data();
    const c = st && st.exists() ? st.data() : {};
    MAINT = c.maintenanceOn === true ? { on:true, msg:String(c.maintenanceMsg || '').trim().slice(0, 300) } : { on:false, msg:'' };
    if (MAINT.on) return message('🛠', 'Hệ thống đang bảo trì', esc(MAINT.msg || 'Tạm thời chưa nhận đơn. Vui lòng quay lại sau ít phút. Xin lỗi vì sự bất tiện này!'), '<p style="margin-top:14px"><button class="btn sm" onclick="location.reload()">Tải lại</button></p>');
    const pp = Number(SHOP.sponsorPct); PLAT = pp > 0 && pp <= 50 ? pp : 0;   // Admin tài trợ % riêng cho quán này
    const wf = Math.round(Number(c.weatherFee)); WX = { on:c.weatherOn === true && wf > 0, fee:wf > 0 ? Math.min(wf, 100000) : 0, label:String(c.weatherLabel || '').trim().slice(0, 40) || 'Phụ phí thời tiết xấu' };
    ADDR = DRAFT.address || '';
    render();
  } catch (e) { message('⚠️', 'Không mở được đơn', esc(isQuota(e) ? QUOTA_MSG : (e.message || 'Vui lòng thử lại sau ít phút.')), '<p style="margin-top:14px"><button class="btn sm" onclick="location.reload()">Tải lại</button></p>'); }
})();
