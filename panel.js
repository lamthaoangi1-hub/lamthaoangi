/* Khung dùng chung cho 3 trang quản lý: đăng nhập, kiểm tra quyền, tiện ích hiển thị */
import * as fb from './fb.js';
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
    app.innerHTML = `<div class="login"><div class="card"><h3 style="font-size:20px">${esc(title)}</h3><p class="muted">Đăng nhập bằng tài khoản đã đăng ký trên website</p>
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

/* ---- Trình sửa thực đơn dùng chung (Admin + Nhà bán hàng) ---- */
export const menuRowHtml = (m = {}) => `<div class="mrow" data-mrow><input type="text" placeholder="Tên món" value="${esc(m.name || '')}" data-k="name"><input type="number" min="0" step="1000" placeholder="Giá (đ)" value="${m.price ?? ''}" data-k="price"><label class="sw" style="margin:0"><input type="checkbox" data-k="available" ${m.available === false ? '' : 'checked'}>Còn</label><button type="button" class="btn sm r" data-mdel title="Xóa món">×</button></div>`;
export const menuEditorHtml = menu => `<div class="mrow hd"><span>Tên món</span><span>Giá</span><span>Còn bán</span><span></span></div><div id="menu-rows">${(menu || []).map(menuRowHtml).join('')}</div><button type="button" class="btn sm o" style="margin-top:10px" data-madd>+ Thêm món</button>`;
export function bindMenuEditor(root) {
  root.addEventListener('click', e => {
    if (e.target.closest('[data-madd]')) $('#menu-rows', root).insertAdjacentHTML('beforeend', menuRowHtml());
    const d = e.target.closest('[data-mdel]'); if (d) d.closest('[data-mrow]').remove();
  });
}
export const readMenu = root => $$('[data-mrow]', root).map(r => ({
  name: $('[data-k=name]', r).value.trim(), price: Math.max(0, Math.round(Number($('[data-k=price]', r).value) || 0)), available: $('[data-k=available]', r).checked,
})).filter(m => m.name);
