/* Khung dùng chung cho 3 trang quản lý: đăng nhập, kiểm tra quyền, tiện ích hiển thị */
import * as fb from './fb.js?v=20261125c';
export { fb };
import { pool, callApi, groupByCat } from './bulk-photo.js?v=20261125d';
import { parseMenuText, parseMenuSheets, readSheets, downloadMenuTemplate } from './bulk.js?v=20261023a';
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
/* Thanh toán: payment = 'cash' | 'bank'; với bank thì payStatus 'unpaid' | 'paid' (Admin xác nhận), customerPaid = khách bấm "Tôi đã chuyển khoản" */
export const payText = o => o.payment === 'bank' ? (o.payStatus === 'paid' ? 'chuyển khoản · đã nhận tiền' : o.customerPaid ? 'chuyển khoản · khách báo đã chuyển, chờ xác nhận' : 'chuyển khoản · chưa nhận tiền') : 'tiền mặt';
export const payBadge = o => o.payment !== 'bank' ? '' : o.payStatus === 'paid' ? '<span class="badge ok">Đã nhận tiền CK</span>' : `<span class="badge warn">${o.customerPaid ? 'Khách báo đã CK' : 'Chờ chuyển khoản'}</span>`;
export const newestFirst = (a, b) => (toDate(b.createdAt)?.getTime() || Date.now()) - (toDate(a.createdAt)?.getTime() || Date.now());

let tt;
export function toast(msg) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.append(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400);
}
/* Âm "ting" báo đơn: trình duyệt chỉ cho phát sau khi người dùng chạm vào trang ít nhất 1 lần, nên mở khóa ở lần chạm đầu tiên */
let actx = null;
const audioCtx = () => { try { return actx || (actx = new (window.AudioContext || window.webkitAudioContext)()); } catch { return null; } };
['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { const c = audioCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }, { passive:true }));
export function beep() {
  try {
    const c = audioCtx(); if (!c) return;
    const play = () => { [0, .32].forEach(t => { const o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = .25; o.start(c.currentTime + t); o.stop(c.currentTime + t + .22); }); };
    if (c.state === 'suspended') c.resume().then(play).catch(() => {}); else play();
    if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
  } catch {}
}
/* Giữ màn hình sáng khi đang mở trang để không lỡ đơn mới (điện thoại tắt màn hình sẽ ngừng nhận đơn) */
let wl = null;
async function keepAwake() {
  try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch {}
}
document.addEventListener('visibilitychange', keepAwake);
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
      document.body.dataset.panel = cur.key;
      const foot = cur.key === 'admin' ? '' : `<footer class="pfoot"><div class="pf-brand"><b>Lâm Thao Ăn Gì?</b><span>${cur.key === 'shipper' ? 'Cổng dành cho Shipper' : 'Cổng dành cho Nhà bán hàng'}</span></div><div class="pf-links"><a href="./">Về website</a><a href="https://lamthaoangi.com" target="_blank" rel="noopener">lamthaoangi.com</a></div><div class="pf-copy">© ${new Date().getFullYear()} Lâm Thao Ăn Gì? · Mọi quyền được bảo lưu</div></footer>`;
      app.innerHTML = `<div class="top"><span class="av" aria-hidden="true">${esc(String(p.name || '?').trim().charAt(0).toUpperCase())}</span><h1>${esc(cur.title)}<small>${esc(p.name || '')} · ${esc(p.phone || '')}</small></h1>${sw}<a href="./">Website</a><button id="lo">Đăng xuất</button></div><div id="body"></div>${foot}`;
      $('#lo').onclick = () => fb.logout();
      if (sw) $('#sw').onchange = e => show(e.target.value);
      cur.render($('#body'), p);
      keepAwake();
    };
    show(store.get('panel'));
  });
}

/* ---- Trình sửa thực đơn dùng chung (Admin + Nhà bán hàng) ---- */
export const menuRowHtml = (m = {}) => `<div class="mitem" data-mrow><div class="mrow"><input type="text" placeholder="Tên món" value="${esc(m.name || '')}" data-k="name"><input type="number" min="0" step="1000" placeholder="Giá (đ)" value="${m.price ?? ''}" data-k="price"><label class="sw" style="margin:0"><input type="checkbox" data-k="available" ${m.available === false ? '' : 'checked'}>Còn</label><button type="button" class="btn sm r" data-mdel title="Xóa món">×</button></div><div class="mrow2"><input type="text" placeholder="Nhóm món (VD: Đồ ăn nhanh)" value="${esc(m.cat || '')}" data-k="cat">${imgUpHtml(m.img || '')}</div><div class="mrow3"><input type="text" placeholder="Thông tin / mô tả (VD: size S-M-L, màu đỏ, chất liệu cotton; hoặc nội dung gói dịch vụ)" value="${esc(m.desc || '')}" data-k="desc" maxlength="300"></div><div class="mrow4"><input type="text" placeholder="Size (VD: S, M, L, XL hoặc 38-39-40)" value="${esc(m.sizes || '')}" data-k="sizes" maxlength="80"><input type="text" placeholder="Màu (VD: Đen, Trắng, Be)" value="${esc(m.colors || '')}" data-k="colors" maxlength="80"><input type="text" placeholder="Chất liệu (VD: Cotton 100%)" value="${esc(m.mat || '')}" data-k="mat" maxlength="80"></div></div>`;
export const menuEditorHtml = menu => `<div class="mrow hd"><span>Tên món</span><span>Giá</span><span>Còn bán</span><span></span></div><div id="menu-rows">${(menu || []).map(menuRowHtml).join('')}</div>
  <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px"><button type="button" class="btn sm o" data-madd>+ Thêm món</button><button type="button" class="btn sm o" data-mpaste>📋 Dán danh sách món</button><button type="button" class="btn sm" data-mphoto>📸 Đăng hàng loạt từ ảnh</button><button type="button" class="btn sm o" data-mxl>⬆ Nhập từ Excel</button><button type="button" class="btn sm gray" data-mtpl>⬇ File Excel mẫu</button><input type="file" accept=".xlsx,.xls,.csv" data-mxfile hidden><input type="file" accept="image/*" multiple data-mphotofile hidden></div>
  <div class="card" data-mphotobox hidden style="margin-top:10px;background:#f6faf7"></div>
  <div class="card" data-mpastebox hidden style="margin-top:10px;background:#f6faf7"><p class="muted" style="margin:0 0 6px">Mỗi dòng 1 món, ví dụ:<br><code>Phở bò tái | 55000 | Món chính</code> &nbsp; <code>Trà đá - 10k</code> &nbsp; <code>Cơm sườn 45.000</code><br>Copy nhiều dòng từ Excel (cột Món, Giá, Nhóm) rồi dán vào đây cũng được. Món trùng tên sẽ được cập nhật giá.</p>
  <textarea data-mpastetxt rows="7" placeholder="Phở bò tái | 55000 | Món chính&#10;Trà đá - 10k"></textarea><div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-mpastego>Thêm vào thực đơn</button><button type="button" class="btn sm gray" data-mpasteclose>Đóng</button></div></div>`;
/* Thêm/cập nhật nhiều món vào bảng thực đơn đang sửa (chưa lưu cho tới khi bấm nút Lưu) */
function mergeMenu(root, items, bad = []) {
  if (!items.length) return toast(bad.length ? `Không đọc được món nào (dòng thiếu giá: ${bad.slice(0, 3).join('; ')}…)` : 'Không thấy món nào để thêm');
  items = items.slice(0, 300);
  const box = $('#menu-rows', root), byName = {};
  $$('[data-mrow]', box).forEach(r => { byName[normName($('[data-k=name]', r).value)] = r; });
  let add = 0, upd = 0;
  items.forEach(m => {
    const r = byName[normName(m.name)];
    if (r) {
      $('[data-k=price]', r).value = m.price; $('[data-k=available]', r).checked = m.available;
      if (m.cat) $('[data-k=cat]', r).value = m.cat; upd++;
    } else { box.insertAdjacentHTML('beforeend', menuRowHtml(m)); byName[normName(m.name)] = box.lastElementChild; add++; }
  });
  toast(`Đã thêm ${add} món, cập nhật ${upd} món${bad.length ? `, bỏ qua ${bad.length} dòng thiếu giá` : ''}. Nhớ bấm nút Lưu bên dưới.`);
}
const normName = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ');
export function bindMenuEditor(root) {
  root.addEventListener('input', e => { if (e.target.matches?.('[data-k=price]') && e.target.value) e.target.closest('[data-mrow]')?.classList.remove('np'); });
  root.addEventListener('click', async e => {
    if (e.target.closest('[data-madd]')) $('#menu-rows', root).insertAdjacentHTML('beforeend', menuRowHtml());
    const d = e.target.closest('[data-mdel]'); if (d) d.closest('[data-mrow]').remove();
    if (e.target.closest('[data-mpaste]')) { const b = $('[data-mpastebox]', root); b.hidden = !b.hidden; if (!b.hidden) $('[data-mpastetxt]', b).focus(); }
    if (e.target.closest('[data-mpasteclose]')) $('[data-mpastebox]', root).hidden = true;
    if (e.target.closest('[data-mpastego]')) {
      const t = $('[data-mpastetxt]', root), r = parseMenuText(t.value);
      mergeMenu(root, r.items, r.bad); if (r.items.length) { t.value = ''; $('[data-mpastebox]', root).hidden = true; }
    }
    if (e.target.closest('[data-mphoto]')) photoBulkForm(root);
    if (e.target.closest('[data-mxl]')) $('[data-mxfile]', root).click();
    if (e.target.closest('[data-mtpl]')) { try { await downloadMenuTemplate(); } catch (er) { toast(er.message); } }
  });
  root.addEventListener('change', async e => {
    const f = e.target;
    if (f.matches && f.matches('[data-mphotofile]')) { const fs = [...f.files]; f.value = ''; if (fs.length) runPhotoBulk(root, fs); return; }
    if (!f.matches || !f.matches('[data-mxfile]')) return;
    const file = f.files[0]; f.value = ''; if (!file) return;
    try { toast('Đang đọc file…'); const r = parseMenuSheets(await readSheets(file)); mergeMenu(root, r.items, r.bad); } catch (er) { toast(er.message || 'Không đọc được file'); }
  });
}
/* ====== Đăng hàng loạt từ ảnh ====== */
const MAX_PHOTOS = 300;
let photoCtl = null;
const warnLeave = e => { e.preventDefault(); e.returnValue = ''; };
function photoBulkForm(root) {
  const box = $('[data-mphotobox]', root); box.hidden = false;
  box.innerHTML = `<h4 style="margin:0 0 6px">📸 Đăng hàng loạt từ ảnh</h4>
  <p class="muted" style="margin:0 0 8px">Chọn nhiều ảnh cùng lúc (tối đa ${MAX_PHOTOS}). Mỗi ảnh = 1 sản phẩm. AI tự đặt tên, nhóm, màu, mô tả. Bạn chỉ cần kiểm tra giá rồi bấm <b>Lưu thực đơn</b>.</p>
  <div class="mrow2"><input type="number" min="0" step="1000" placeholder="Giá mặc định (đ) – sửa sau cũng được" data-pb="price"><input type="text" placeholder="Size mặc định (VD: Freesize hoặc S, M, L)" data-pb="sizes" maxlength="80"></div>
  <label class="sw" style="margin-top:8px"><input type="checkbox" data-pb="enhance">✨ Chỉnh ảnh bằng AI lên nền thương hiệu (chậm: 15–30 giây/ảnh, tốn lượt AI)</label>
  <div class="row" style="margin-top:8px;gap:6px"><button type="button" class="btn sm" data-pbgo>Chọn ảnh từ máy</button><button type="button" class="btn sm gray" data-pbclose>Đóng</button></div><div data-pbstat style="margin-top:10px"></div>`;
  box.onclick = e => {
    if (e.target.closest('[data-pbgo]')) $('[data-mphotofile]', root).click();
    if (e.target.closest('[data-pbclose]')) { if (photoCtl) photoCtl.cancel = true; box.hidden = true; }
    if (e.target.closest('[data-pbcancel]') && photoCtl) { photoCtl.cancel = true; toast('Đang dừng… các ảnh đã xử lý vẫn được giữ lại'); }
    if (e.target.closest('[data-pbretry]')) { const fs = photoCtl?.failed || []; if (fs.length) runPhotoBulk(root, fs, true); }
    const ap = e.target.closest('[data-pbapply]');
    if (ap) {
      const cat = ap.dataset.pbapply, v = Math.max(0, Math.round(Number($(`[data-pbcat="${CSS.escape(cat)}"]`, box).value) || 0)); if (!v) return toast('Nhập giá trước');
      let n = 0; $$('[data-mrow][data-pbnew]', root).forEach(r => { if ((r.querySelector('[data-k=cat]').value.trim() || 'Khác') === cat) { r.querySelector('[data-k=price]').value = v; r.classList.remove('np'); n++; } });
      toast(`Đã đặt giá ${money(v)} cho ${n} sản phẩm nhóm “${cat}”`);
    }
  };
}
async function runPhotoBulk(root, files, isRetry = false) {
  const box = $('[data-mphotobox]', root), stat = $('[data-pbstat]', box);
  if (photoCtl && photoCtl.running) return toast('Đang xử lý lô trước, vui lòng đợi');
  files = files.filter(f => /^image\//.test(f.type)); if (files.length > MAX_PHOTOS) { toast(`Chỉ nhận tối đa ${MAX_PHOTOS} ảnh mỗi lần, đã lấy ${MAX_PHOTOS} ảnh đầu`); files = files.slice(0, MAX_PHOTOS); }
  if (!files.length) return toast('Không có file ảnh nào');
  if (!fb.uploadUrl) return toast('Chưa bật lưu ảnh Google Drive. Xem HUONG-DAN.md');
  const price = Math.max(0, Math.round(Number($('[data-pb=price]', box)?.value) || 0)), sizes = ($('[data-pb=sizes]', box)?.value || '').trim(), enhance = !!$('[data-pb=enhance]', box)?.checked;
  const ctl = photoCtl = { cancel: false, running: true, failed: [], done: 0, total: files.length, rows: [], quota: '' };
  window.addEventListener('beforeunload', warnLeave);
  const rowsBox = $('#menu-rows', root);
  const draw = (phase, extra = '') => { const pc = Math.round(((phase === 1 ? ctl.done : ctl.done2) / (phase === 1 ? ctl.total : ctl.rows.length || 1)) * 100); stat.innerHTML = `<div style="height:8px;border-radius:4px;background:#e3ebe5;overflow:hidden"><div style="height:100%;width:${pc}%;background:var(--g,#16a34a)"></div></div><p class="muted" style="margin:6px 0 0">${phase === 1 ? `AI đang đọc ảnh: <b>${ctl.done}/${ctl.total}</b>` : `AI đang chỉnh ảnh nền: <b>${ctl.done2}/${ctl.rows.length}</b>`}${ctl.failed.length ? ` · lỗi ${ctl.failed.length}` : ''} ${extra}</p><button type="button" class="btn sm gray" data-pbcancel style="margin-top:6px">Dừng</button>`; };
  draw(1);
  await pool(files, 3, async (file, k) => {
    try {
      const data = await toB64(await shrink(file, 1024)), token = await fb.idToken();
      const j = await callApi(fb.uploadUrl, { action: 'aiProduct', token, name: `lt-${Date.now()}-${k}.jpg`, mime: 'image/jpeg', data });
      if (j.quota) { ctl.cancel = true; ctl.quota = j.error; ctl.failed.push(file); return; }
      const i = j.info || {};
      rowsBox.insertAdjacentHTML('beforeend', menuRowHtml({ name: i.name || file.name.replace(/\.[^.]+$/, ''), price, available: true, cat: i.cat || '', img: j.url, desc: i.desc || '', sizes, colors: i.colors || '', mat: i.mat || '' }));
      const r = rowsBox.lastElementChild; r.dataset.pbnew = '1'; r.dataset.fid = j.id; if (!price) r.classList.add('np'); ctl.rows.push(r);
    } catch (e) { ctl.failed.push(file); }
    ctl.done++; draw(1);
  }, ctl);
  /* B2 (tùy chọn): chỉnh ảnh nền */
  ctl.done2 = 0;
  if (enhance && !ctl.cancel && ctl.rows.length) {
    draw(2);
    await pool(ctl.rows, 2, async r => {
      try {
        const token = await fb.idToken(), j = await callApi(fb.uploadUrl, { action: 'aiEnhance', token, id: r.dataset.fid }, 2);
        if (j.ok && j.ai) { const w = $('[data-imgup]', r); const old = $('input[type=hidden]', w).value; setImg(w, j.url); w.dataset.orig = old; $('[data-useorig]', w).hidden = false; }
        else if (j.quota || /lượt AI/.test(j.error || '')) ctl.cancel = true;
      } catch (e) {}
      ctl.done2++; draw(2);
    }, ctl);
  }
  ctl.running = false; window.removeEventListener('beforeunload', warnLeave);
  const g = groupByCat(ctl.rows.map(r => ({ cat: r.querySelector('[data-k=cat]').value.trim() })));
  const needPrice = ctl.rows.filter(r => r.classList.contains('np')).length;
  stat.innerHTML = `<p style="margin:0 0 6px"><b>✅ Đã thêm ${ctl.rows.length} sản phẩm</b>${ctl.failed.length ? ` · <span style="color:var(--red)">${ctl.failed.length} ảnh lỗi</span> <button type="button" class="btn sm o" data-pbretry>Thử lại ảnh lỗi</button>` : ''}${ctl.cancel && !ctl.quota ? ' · đã dừng giữa chừng' : ''}</p>
  ${ctl.quota ? `<p style="color:var(--red);margin:0 0 6px">${esc(ctl.quota)}</p>` : ''}
  ${needPrice ? `<p class="muted" style="margin:0 0 6px">Đặt giá nhanh theo nhóm (ô giá đỏ = chưa có giá):</p>${Object.entries(g).map(([c, ix]) => `<div class="row" style="gap:6px;margin-top:4px;align-items:center"><span style="flex:1">${esc(c)} <small class="muted">(${ix.length})</small></span><input type="number" min="0" step="1000" placeholder="Giá" data-pbcat="${esc(c)}" style="width:110px;margin:0"><button type="button" class="btn sm o" data-pbapply="${esc(c)}">Áp dụng</button></div>`).join('')}` : ''}
  <p class="muted" style="margin:8px 0 0">⚠ Chưa lưu! Kiểm tra lại rồi bấm <b>Lưu thực đơn</b> ở cuối trang.</p>`;
  if (ctl.rows.length) rowsBox.lastElementChild?.scrollIntoView({ block: 'nearest' });
}
export const readMenu = root => $$('[data-mrow]', root).map(r => ({
  name: $('[data-k=name]', r).value.trim(), price: Math.max(0, Math.round(Number($('[data-k=price]', r).value) || 0)), available: $('[data-k=available]', r).checked,
  cat: $('[data-k=cat]', r).value.trim(), img: $('[data-k=img]', r).value.trim(), desc: ($('[data-k=desc]', r)?.value || '').trim(),
  sizes: ($('[data-k=sizes]', r)?.value || '').trim(), colors: ($('[data-k=colors]', r)?.value || '').trim(), mat: ($('[data-k=mat]', r)?.value || '').trim(),
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
export async function shrink(file, max = 900) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
}
const toB64 = blob => new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1]); f.onerror = no; f.readAsDataURL(blob); });
/* enhance=true: Apps Script gửi ảnh qua AI (Gemini) để làm nền sạch, chỉnh sáng, rồi lưu ảnh đã chỉnh. Trả về { url, orig, ai, aiError } */
export async function uploadImageFull(file, enhance = false) {
  if (!fb.uploadUrl) throw new Error('Chưa bật lưu ảnh Google Drive. Xem HUONG-DAN.md, mục "Lưu ảnh lên Google Drive".');
  if (!/^image\//.test(file.type)) throw new Error('Vui lòng chọn file ảnh');
  const blob = await shrink(file, enhance ? 1280 : 900), data = await toB64(blob), token = await fb.idToken();
  let res; try { res = await fetch(fb.uploadUrl, { method:'POST', body:JSON.stringify({ token, name:`lt-${Date.now()}.jpg`, mime:'image/jpeg', data, ...(enhance ? { enhance:'fashion' } : {}) }) }); } catch (e) { throw new Error('Không kết nối được máy chủ lưu ảnh. Kiểm tra mạng rồi thử lại.'); }
  const j = await res.json().catch(() => null);
  if (!j) throw new Error('Máy chủ lưu ảnh trả về lỗi. Admin cần kiểm tra Google Apps Script (Deploy → Manage deployments → New version).');
  if (!j.ok) throw new Error(j.error || 'Tải ảnh thất bại');
  return j;
}
export const uploadImage = async file => (await uploadImageFull(file, false)).url;
export const imgUpHtml = (value = '', id = '') => `<div class="imgup" data-imgup><img class="th" alt="" src="${esc(value)}" ${value ? '' : 'hidden'}><span class="th ph" ${value ? 'hidden' : ''}>Ảnh</span><button type="button" class="btn sm o" data-pick>Tải ảnh lên</button><button type="button" class="btn sm gray" data-clearimg ${value ? '' : 'hidden'}>Xóa ảnh</button><button type="button" class="btn sm gray" data-useorig hidden>↩ Dùng ảnh gốc</button><input type="hidden" ${id ? `id="${id}"` : 'data-k="img"'} value="${esc(value)}"><input type="file" accept="image/*" hidden><small class="aihint">✨ Ảnh thời trang sẽ được AI tự chỉnh (nền sạch, đủ sáng) rồi đăng lên web</small></div>`;
function setImg(w, url) {
  $('input[type=hidden]', w).value = url; const im = $('img.th', w); im.src = url; im.hidden = !url; $('.ph', w).hidden = !!url; $('[data-clearimg]', w).hidden = !url;
  const uo = $('[data-useorig]', w); if (uo && !(w.dataset.orig && url && url !== w.dataset.orig)) uo.hidden = true;
}
/* Ảnh SẢN PHẨM của cửa hàng Thời trang (ô data-k="img" trong khu vực data-msector="fashion") được AI chỉnh; logo quán và các mục khác giữ nguyên */
const wantsAi = w => $('input[type=hidden]', w).dataset.k === 'img' && !!w.closest('[data-msector="fashion"]');
export function bindImgUpload(root) {
  root.addEventListener('click', e => {
    const p = e.target.closest('[data-pick]'); if (p) $('input[type=file]', p.closest('[data-imgup]')).click();
    const c = e.target.closest('[data-clearimg]'); if (c) { const w = c.closest('[data-imgup]'); delete w.dataset.orig; setImg(w, ''); }
    const o = e.target.closest('[data-useorig]'); if (o) { const w = o.closest('[data-imgup]'), u = w.dataset.orig; delete w.dataset.orig; if (u) { setImg(w, u); toast('Đã chuyển về ảnh gốc. Nhớ bấm nút Lưu bên dưới.'); } }
  });
  root.addEventListener('change', async e => {
    const f = e.target; if (f.type !== 'file' || !f.closest('[data-imgup]')) return;
    const w = f.closest('[data-imgup]'), file = f.files[0]; f.value = ''; if (!file) return;
    const ai = wantsAi(w), b = $('[data-pick]', w), old = b.textContent; b.disabled = true; b.textContent = ai ? '✨ AI đang chỉnh ảnh… (10–30 giây)' : 'Đang tải…';
    try {
      const r = await uploadImageFull(file, ai); delete w.dataset.orig; setImg(w, r.url);
      if (ai && r.ai && r.orig) { w.dataset.orig = r.orig; $('[data-useorig]', w).hidden = false; }
      toast(ai ? (r.ai ? '✨ AI đã chỉnh xong ảnh. Nhớ bấm nút Lưu bên dưới.' : 'Đã tải ảnh gốc lên (AI chưa chỉnh được: ' + (r.aiError || 'lỗi không rõ') + '). Nhớ bấm nút Lưu bên dưới.') : 'Đã tải ảnh lên Google Drive. Nhớ bấm nút Lưu bên dưới.');
    } catch (er) { toast(er.message || 'Tải ảnh thất bại'); }
    b.disabled = false; b.textContent = old;
  });
}

/* ---- Thanh điều hướng dưới cùng (chân trang) cho Nhà bán hàng / Shipper ---- */
const NAV_ICON = {
  orders:'<path d="M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1z"/><path d="M8 11h8M8 15h5"/>',
  ship:'<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  revenue:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  wallet:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  shop:'<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9c0 1.4 1.1 2.5 2.5 2.5S9 10.4 9 9c0 1.4 1.1 2.5 2.5 2.5h1C13.9 11.5 15 10.4 15 9c0 1.4 1.1 2.5 2.5 2.5S20 10.4 20 9"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/>',
  open:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  mine:'<path d="M3 11l18-8-8 18-2-8-8-2z"/>',
  hist:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
/* items: [key, tênIcon, nhãn, huyHiệu(không bắt buộc)] */
export const navHtml = (items, cur) => `<div class="tabs" role="tablist">${items.map(([k, ic, lb, n]) => `<button role="tab" aria-selected="${cur === k}" class="${cur === k ? 'on' : ''}" data-t="${k}"><span class="ic"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAV_ICON[ic] || ''}</svg>${n ? `<em class="n">${n}</em>` : ''}</span><span class="lb">${lb}</span></button>`).join('')}</div>`;
