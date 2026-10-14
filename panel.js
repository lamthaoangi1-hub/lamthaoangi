/* Khung dùng chung cho 3 trang quản lý: đăng nhập, kiểm tra quyền, tiện ích hiển thị */
import * as fb from './fb.js?v=20261014b';
export { fb };
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const money = n => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
export const toDate = t => t?.toDate ? t.toDate() : (t?.seconds ? new Date(t.seconds * 1000) : (t ? new Date(t) : null));
export const fmtTime = t => { const d = toDate(t); return d ? d.toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }) : ''; };
export const sameDay = (t, d2 = new Date()) => { const d = toDate(t); return !!d && d.toDateString() === d2.toDateString(); };
export const STATUS = {
  pending:['Chờ xác nhận', 'warn'], confirmed:['Đã nhận đơn', 'info'], preparing:['Đang chuẩn bị', 'info'],
  ready:['Chờ shipper', 'warn'], delivering:['Đang giao', 'info'], done:['Hoàn thành', 'ok'], cancelled:['Đã hủy', 'bad'],
};
export const badge = st => `<span class="badge ${STATUS[st]?.[1] || ''}">${STATUS[st]?.[0] || esc(st)}</span>`;
export const newestFirst = (a, b) => (toDate(b.createdAt)?.getTime() || Date.now()) - (toDate(a.createdAt)?.getTime() || Date.now());

let tt;
export function toast(msg) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.append(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400);
}
export function beep() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = .15; o.start(); o.stop(c.currentTime + .25);
  } catch {}
}
const unsubs = [];
export const track = u => { unsubs.push(u); return u; };
const clearTracked = () => { while (unsubs.length) { try { unsubs.pop()(); } catch {} } };

/* start({title, roles, render(main, profile)}) */
export function start({ title, roles, render }) {
  const app = $('#app');
  document.title = title + ' – Lâm Thao Ăn Gì?';
  if (!fb.configured) {
    app.innerHTML = `<div class="login"><div class="card"><h3>Chưa cấu hình Firebase</h3><p class="muted" style="margin-top:8px">Mở file <b>firebase-config.js</b> và dán thông tin project Firebase của bạn vào, rồi tải lại trang. Xem hướng dẫn trong <b>HUONG-DAN.md</b>.</p></div></div>`;
    return;
  }
  const loginView = (msg = '') => {
    app.innerHTML = `<div class="login"><div class="card"><h3 style="font-size:17px">${esc(title)}</h3><p class="muted">Đăng nhập bằng tài khoản đã đăng ký trên website</p>
      <form id="lf"><label class="f">Số điện thoại<input type="tel" name="p" inputmode="numeric" autocomplete="username" required></label>
      <label class="f">Mật khẩu<input type="password" name="w" autocomplete="current-password" required></label>
      <div class="err" id="le">${esc(msg)}</div><button class="btn" style="width:100%;margin-top:6px">Đăng nhập</button></form>
      <p class="muted" style="margin-top:14px"><a href="./">← Về website</a></p></div></div>`;
    $('#lf').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; $('#le').textContent = '';
      try { await fb.login(f.p.value, f.w.value); } catch (er) { $('#le').textContent = fb.errMsg(er); }
    });
  };
  const deniedView = p => {
    app.innerHTML = `<div class="login"><div class="card"><h3>Chưa có quyền truy cập</h3>
      <p class="muted" style="margin:8px 0">Tài khoản <b>${esc(p?.phone || '')}</b> (vai trò hiện tại: <b>${esc(p?.role || 'chưa có hồ sơ')}</b>) chưa được cấp quyền cho trang này. Hãy nhờ Admin cấp quyền.</p>
      <button class="btn gray" id="lo">Đăng xuất</button> <a class="btn o" href="./">Về website</a></div></div>`;
    $('#lo').onclick = () => fb.logout();
  };
  fb.onAuth((u, p) => {
    clearTracked();
    if (!u) return loginView();
    if (!p) return loginView('Không tìm thấy hồ sơ tài khoản. Thử đăng nhập lại.');
    if (!roles.includes(p.role)) return deniedView(p);
    app.innerHTML = `<div class="top"><h1>${esc(title)}<small>${esc(p.name || '')} · ${esc(p.phone || '')}</small></h1><a href="./">Website</a><button id="lo">Đăng xuất</button></div><div id="body"></div>`;
    $('#lo').onclick = () => fb.logout();
    render($('#body'), p);
  });
}

/* Cổng đăng nhập chung: 1 link, 1 lần đăng nhập → tự mở đúng giao diện theo vai trò.
   panels = [{key, title, roles, render}] ; Admin thấy cả 3 giao diện và có ô chuyển nhanh. */
export function startPortal(panels) {
  const app = $('#app');
  document.title = 'Đăng nhập quản lý – Lâm Thao Ăn Gì?';
  if (!fb.configured) {
    app.innerHTML = `<div class="login"><div class="card"><h3>Chưa cấu hình Firebase</h3><p class="muted" style="margin-top:8px">Mở file <b>firebase-config.js</b> và dán thông tin project Firebase của bạn vào, rồi tải lại trang. Xem hướng dẫn trong <b>HUONG-DAN.md</b>.</p></div></div>`;
    return;
  }
  const store = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} } };
  const loginView = (msg = '') => {
    document.title = 'Đăng nhập quản lý – Lâm Thao Ăn Gì?';
    app.innerHTML = `<div class="login"><div class="card"><h3 style="font-size:17px">Đăng nhập quản lý</h3><p class="muted">Dành cho Admin, Nhà bán hàng và Shipper. Hệ thống tự mở đúng trang theo tài khoản của bạn.</p>
      <form id="lf"><label class="f">Số điện thoại<input type="tel" name="p" inputmode="numeric" autocomplete="username" required></label>
      <label class="f">Mật khẩu<input type="password" name="w" autocomplete="current-password" required></label>
      <div class="err" id="le">${esc(msg)}</div><button class="btn" style="width:100%;margin-top:6px">Đăng nhập</button></form>
      <p class="muted" style="margin-top:14px"><a href="./">← Về website</a></p></div></div>`;
    $('#lf').addEventListener('submit', async e => {
      e.preventDefault(); $('#le').textContent = '';
      try { await fb.login(e.target.p.value, e.target.w.value); } catch (er) { $('#le').textContent = fb.errMsg(er); }
    });
  };
  const deniedView = p => {
    document.title = 'Chưa có quyền – Lâm Thao Ăn Gì?';
    app.innerHTML = `<div class="login"><div class="card"><h3>Chưa có quyền truy cập</h3>
      <p class="muted" style="margin:8px 0">Tài khoản <b>${esc(p?.phone || '')}</b> (vai trò hiện tại: <b>${esc(p?.role || 'chưa có hồ sơ')}</b>) chưa được cấp quyền quản lý. Hãy nhờ Admin cấp quyền Nhà bán hàng hoặc Shipper.</p>
      <button class="btn gray" id="lo">Đăng xuất</button> <a class="btn o" href="./">Về website</a></div></div>`;
    $('#lo').onclick = () => fb.logout();
  };
  fb.onAuth((u, p) => {
    clearTracked();
    if (!u) return loginView();
    if (!p) return loginView('Không tìm thấy hồ sơ tài khoản. Thử đăng nhập lại.');
    const mine = (p.role === 'admin' ? ['admin', 'seller', 'shipper'].map(k => panels.find(x => x.key === k)) : panels.filter(x => x.key === p.role)).filter(Boolean);
    if (!mine.length) return deniedView(p);
    const show = key => {
      clearTracked();
      const cur = mine.find(x => x.key === key) || mine[0];
      store.set('panel', cur.key);
      document.title = cur.title + ' – Lâm Thao Ăn Gì?';
      const sw = mine.length > 1 ? `<select id="sw" aria-label="Chuyển giao diện" style="font-weight:600;font-size:14px;padding:6px 8px;border-radius:8px;border:0">${mine.map(x => `<option value="${x.key}" ${x.key === cur.key ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select>` : '';
      app.innerHTML = `<div class="top"><h1>${esc(cur.title)}<small>${esc(p.name || '')} · ${esc(p.phone || '')}</small></h1>${sw}<a href="./">Website</a><button id="lo">Đăng xuất</button></div><div id="body"></div>`;
      $('#lo').onclick = () => fb.logout();
      if (sw) $('#sw').onchange = e => show(e.target.value);
      cur.render($('#body'), p);
    };
    show(store.get('panel'));
  });
}

/* ---- Trình sửa thực đơn dùng chung (Admin + Nhà bán hàng) ---- */
export const menuRowHtml = (m = {}) => `<div class="mitem" data-mrow><div class="mrow"><input type="text" placeholder="Tên món" value="${esc(m.name || '')}" data-k="name"><input type="number" min="0" step="1000" placeholder="Giá (đ)" value="${m.price ?? ''}" data-k="price"><label class="sw" style="margin:0"><input type="checkbox" data-k="available" ${m.available === false ? '' : 'checked'}>Còn</label><button type="button" class="btn sm r" data-mdel title="Xóa món">×</button></div><div class="mrow2"><input type="text" placeholder="Nhóm món (VD: Đồ ăn nhanh)" value="${esc(m.cat || '')}" data-k="cat">${imgUpHtml(m.img || '')}</div></div>`;
export const menuEditorHtml = menu => `<div class="mrow hd"><span>Tên món</span><span>Giá</span><span>Còn bán</span><span></span></div><div id="menu-rows">${(menu || []).map(menuRowHtml).join('')}</div><button type="button" class="btn sm o" style="margin-top:10px" data-madd>+ Thêm món</button>`;
export function bindMenuEditor(root) {
  root.addEventListener('click', e => {
    if (e.target.closest('[data-madd]')) $('#menu-rows', root).insertAdjacentHTML('beforeend', menuRowHtml());
    const d = e.target.closest('[data-mdel]'); if (d) d.closest('[data-mrow]').remove();
  });
}
export const readMenu = root => $$('[data-mrow]', root).map(r => ({
  name: $('[data-k=name]', r).value.trim(), price: Math.max(0, Math.round(Number($('[data-k=price]', r).value) || 0)), available: $('[data-k=available]', r).checked,
  cat: $('[data-k=cat]', r).value.trim(), img: $('[data-k=img]', r).value.trim(),
})).filter(m => m.name);

/* ---- Vị trí (GPS) ---- */
export const mapLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
export const dirLink = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=motorcycle`;
export function getPos() {
  return new Promise((ok, no) => {
    if (!navigator.geolocation) return no(new Error('Thiết bị không hỗ trợ định vị'));
    navigator.geolocation.getCurrentPosition(p => ok({ lat:+p.coords.latitude.toFixed(6), lng:+p.coords.longitude.toFixed(6), acc:Math.round(p.coords.accuracy) }), e => no(new Error(
      e.code === 1 ? 'Bạn đã chặn quyền vị trí. Hãy bấm biểu tượng ổ khóa cạnh địa chỉ trang, cho phép "Vị trí" rồi thử lại.' : e.code === 3 ? 'Lấy vị trí quá lâu, hãy bật GPS/ra chỗ thoáng rồi thử lại.' : 'Không lấy được vị trí, hãy bật GPS rồi thử lại.')),
    { enableHighAccuracy:true, timeout:20000, maximumAge:0 });
  });
}

/* Khóa phóng to/thu nhỏ trên iOS Safari */
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));

/* ---- Tải ảnh lên Google Drive (qua Google Apps Script) ---- */
async function shrink(file, max = 900) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
}
const toB64 = blob => new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1]); f.onerror = no; f.readAsDataURL(blob); });
export async function uploadImage(file) {
  if (!fb.uploadUrl) throw new Error('Chưa bật lưu ảnh Google Drive. Xem HUONG-DAN.md, mục "Lưu ảnh lên Google Drive".');
  if (!/^image\//.test(file.type)) throw new Error('Vui lòng chọn file ảnh');
  const blob = await shrink(file), data = await toB64(blob), token = await fb.idToken();
  const res = await fetch(fb.uploadUrl, { method:'POST', body:JSON.stringify({ token, name:`lt-${Date.now()}.jpg`, mime:'image/jpeg', data }) });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'Tải ảnh thất bại');
  return j.url;
}
export const imgUpHtml = (value = '', id = '') => `<div class="imgup" data-imgup><img class="th" alt="" src="${esc(value)}" ${value ? '' : 'hidden'}><span class="th ph" ${value ? 'hidden' : ''}>Ảnh</span><button type="button" class="btn sm o" data-pick>Tải ảnh lên</button><button type="button" class="btn sm gray" data-clearimg ${value ? '' : 'hidden'}>Xóa ảnh</button><input type="hidden" ${id ? `id="${id}"` : 'data-k="img"'} value="${esc(value)}"><input type="file" accept="image/*" hidden></div>`;
function setImg(w, url) {
  $('input[type=hidden]', w).value = url; const im = $('img.th', w); im.src = url; im.hidden = !url; $('.ph', w).hidden = !!url; $('[data-clearimg]', w).hidden = !url;
}
export function bindImgUpload(root) {
  root.addEventListener('click', e => {
    const p = e.target.closest('[data-pick]'); if (p) $('input[type=file]', p.closest('[data-imgup]')).click();
    const c = e.target.closest('[data-clearimg]'); if (c) setImg(c.closest('[data-imgup]'), '');
  });
  root.addEventListener('change', async e => {
    const f = e.target; if (f.type !== 'file' || !f.closest('[data-imgup]')) return;
    const w = f.closest('[data-imgup]'), file = f.files[0]; f.value = ''; if (!file) return;
    const b = $('[data-pick]', w), old = b.textContent; b.disabled = true; b.textContent = 'Đang tải…';
    try { setImg(w, await uploadImage(file)); toast('Đã tải ảnh lên Google Drive. Nhớ bấm nút Lưu bên dưới.'); } catch (er) { toast(er.message || 'Tải ảnh thất bại'); }
    b.disabled = false; b.textContent = old;
  });
}
