import { fb, start, track, $, $$, esc, money, fmtTime, badge, STATUS, newestFirst, toast, menuEditorHtml, bindMenuEditor, readMenu, mapLink, imgUpHtml, bindImgUpload } from './panel.js';
import { parseWorkbook } from './import-sheet.js';

const SAMPLE = [
  { name:'Phở Bò Lâm Thao', cat:'Phở • Món Việt', group:['Phở', 'Món Việt'], desc:'Phở bò gia truyền.', img:'pho.jpg', eta:'15 - 25 phút', shipFee:15000, freeShipMin:100000, sale:0, open:true, menu:[{ name:'Phở bò tái nạm', price:55000, available:true }, { name:'Trà đá', price:10000, available:true }] },
  { name:'Cơm Tấm Minh Tâm', cat:'Cơm • Món Việt', group:['Cơm', 'Món Việt'], desc:'Cơm tấm sườn nướng.', img:'comtam.jpg', eta:'20 - 30 phút', shipFee:15000, freeShipMin:100000, sale:0, open:true, menu:[{ name:'Cơm tấm sườn nướng', price:50000, available:true }] },
];

const loadXLSX = () => window.XLSX ? Promise.resolve(window.XLSX) : new Promise((ok, no) => {
  const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload = () => ok(window.XLSX); s.onerror = () => no(new Error('Không tải được thư viện đọc Excel, kiểm tra mạng')); document.head.appendChild(s);
});

start({ title:'Quản trị', roles:['admin'], render(root, me) {
  let tab = 'orders', shops = [], orders = [], users = [], promos = [], settings = {}, edit = null, ofil = 'all', err = '', imp = null, impBusy = false, ufil = 'seller';
  const shopName = id => shops.find(s => s.id === id)?.name || '(đã xóa)';

  const ordersView = () => {
    const l = [...orders].sort(newestFirst).filter(o => ofil === 'all' || o.status === ofil);
    return `<div class="row" style="margin-bottom:10px"><select id="ofil" style="width:auto"><option value="all">Tất cả trạng thái</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${ofil === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select><span class="muted">${l.length} đơn (tối đa 300 đơn gần nhất)</span></div>
      ${l.length ? l.slice(0, 100).map(o => `<div class="card"><div class="row sb"><b>#${esc(o.code)} · ${esc(o.shopName)}</b>${badge(o.status)}</div>
      <div class="muted">${fmtTime(o.createdAt)} · ${esc(o.customerName)} ${esc(o.customerPhone)} · ${esc(o.address)}</div>
      <ul class="items">${(o.items || []).map(i => `<li>${i.qty} x ${esc(i.name)}</li>`).join('')}</ul>
      <div class="row sb"><span><b class="total">${money(o.total)}</b> <span class="muted">${o.shipperName ? '· Shipper: ' + esc(o.shipperName) + ' ' + esc(o.shipperPhone || '') : ''}</span></span>
      <select data-ost="${o.id}" style="width:auto">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div></div>`).join('') : '<div class="empty">Chưa có đơn</div>'}`;
  };

  const byOrder = (a, b) => (a.order ?? 9999) - (b.order ?? 9999) || String(a.name || '').localeCompare(String(b.name || ''), 'vi');
  const sellersOf = id => users.filter(u => u.shopId === id && u.role === 'seller').map(u => u.phone).join(', ');
  const importView = () => `<div class="card"><h3>Nhập quán từ Excel cũ</h3><p class="muted">Tick những quán muốn đưa sang web mới. Quán đã có trên web mới được bỏ tick sẵn để tránh trùng.</p>
    <table><tr><th></th><th>Quán</th><th>Món</th><th>Ghi chú</th></tr>${imp.map((x, i) => `<tr><td><input type="checkbox" data-impck="${i}" ${x.on ? 'checked' : ''}></td><td><b>${esc(x.data.name)}</b></td><td>${x.data.menu.length}</td><td class="muted">${esc(x.notes.join('; '))}</td></tr>`).join('')}</table>
    <div class="row" style="margin-top:12px"><button class="btn" data-impgo ${impBusy ? 'disabled' : ''}>${impBusy ? 'Đang nhập…' : `Nhập ${imp.filter(x => x.on).length} quán đã chọn`}</button><button class="btn o" data-impcancel ${impBusy ? 'disabled' : ''}>Hủy</button></div></div>`;
  const shopsView = () => edit ? shopForm() : imp ? importView() : `<div class="row sb" style="margin-bottom:10px"><b>${shops.length} cửa hàng</b><span class="row"><input type="file" id="imp-file" accept=".xlsx,.xls" hidden><button class="btn sm o" data-impfile>⬆ Nhập từ Excel cũ</button><button class="btn sm o" data-seed>+ Thêm 2 quán mẫu</button><button class="btn sm" data-newshop>+ Thêm cửa hàng</button></span></div>
    ${shops.length ? `<p class="muted" style="margin:0 0 8px">Dùng ▲ ▼ để đổi vị trí quán trên trang chủ. Quán bật <b>⭐ Nổi bật</b> hoặc có <b>Giảm giá</b> sẽ hiện trên banner đầu trang.</p><div class="card" style="overflow-x:auto"><table><tr><th>Thứ tự</th><th>Quán</th><th>Món</th><th>⭐ Nổi bật</th><th>Giảm %</th><th>Trạng thái</th><th></th></tr>${[...shops].sort(byOrder).map((s, i, arr) => `<tr><td style="white-space:nowrap"><button class="btn sm o" data-mv="up" data-id="${s.id}" ${i === 0 ? 'disabled' : ''}>▲</button> <button class="btn sm o" data-mv="down" data-id="${s.id}" ${i === arr.length - 1 ? 'disabled' : ''}>▼</button></td><td><b>${esc(s.name)}</b><br><span class="muted">${esc(s.cat || '')}</span><br><span class="muted">${sellersOf(s.id) ? '🔑 TK bán hàng: ' + esc(sellersOf(s.id)) : '⚠ Chưa có tài khoản bán hàng'}</span></td><td>${(s.menu || []).length}</td><td><label class="sw" style="margin:0"><input type="checkbox" data-feat="${s.id}" ${s.featured ? 'checked' : ''}></label></td><td><input type="number" data-sale="${s.id}" min="0" max="90" value="${s.sale || 0}" style="width:64px"></td><td>${s.open === false ? '<span class="badge bad">Đóng cửa</span>' : '<span class="badge ok">Mở cửa</span>'}</td><td style="text-align:right"><button class="btn sm" data-mkseller="${s.id}">Cấp TK</button> <button class="btn sm o" data-editshop="${s.id}">Sửa</button> <button class="btn sm r" data-delshop="${s.id}">Xóa</button></td></tr>`).join('')}</table></div>` : '<div class="empty">Chưa có cửa hàng. Bấm “Thêm cửa hàng”.</div>'}`;

  function shopForm() {
    const s = edit, n = (k, d = '') => esc(s[k] ?? d);
    return `<div class="card"><h3>${s.id ? 'Sửa cửa hàng' : 'Thêm cửa hàng'}</h3>
      <div class="grid"><label class="f">Tên quán *<input type="text" id="f-name" value="${n('name')}"></label><label class="f">Loại (VD: Phở • Món Việt)<input type="text" id="f-cat" value="${n('cat')}"></label>
      <label class="f">Nhóm lọc (cách nhau dấu phẩy)<input type="text" id="f-group" value="${esc((s.group || []).join(', '))}" placeholder="Phở, Món Việt"></label><label class="f">SĐT quán<input type="tel" id="f-phone" value="${n('phone')}"></label>
      <label class="f">Địa chỉ<input type="text" id="f-address" value="${n('address')}"></label><label class="f">Thời gian giao<input type="text" id="f-eta" value="${n('eta', '15 - 30 phút')}"></label>
      <label class="f">Phí giao hàng (đ)<input type="number" id="f-ship" min="0" step="1000" value="${s.shipFee ?? 15000}"></label><label class="f">Miễn phí ship từ (đ, 0 = không)<input type="number" id="f-free" min="0" step="1000" value="${s.freeShipMin ?? 0}"></label>
      <label class="f">Giảm giá (%)<input type="number" id="f-sale" min="0" max="90" value="${s.sale ?? 0}"></label><label class="f">Điểm đánh giá (0–5, để 0 nếu quán mới)<input type="number" id="f-rate" min="0" max="5" step="0.1" value="${s.rate ?? 0}"></label>
      <label class="f">Số lượt đánh giá (VD: 120+)<input type="text" id="f-rc" value="${n('rc')}"></label></div>
      <label class="f">Ảnh / logo quán</label>${imgUpHtml(s.img || '', 'f-img')}
      <label class="f">Mô tả<textarea id="f-desc">${n('desc')}</textarea></label>
      ${s.id ? `<p class="muted" style="margin-top:10px">Vị trí bản đồ: ${s.lat != null ? `đã lưu · <a href="${mapLink(s.lat, s.lng)}" target="_blank" rel="noopener">xem</a> · <button type="button" class="btn sm r" data-resetloc>Đặt lại vị trí</button>` : 'chưa có (chủ quán tự chia sẻ ở trang Nhà bán hàng)'}</p>` : ''}
      <label class="sw"><input type="checkbox" id="f-open" ${s.open === false ? '' : 'checked'}>Đang mở cửa</label>
      <label class="sw"><input type="checkbox" id="f-feat" ${s.featured ? 'checked' : ''}>⭐ Nổi bật (hiện trên banner trang chủ)</label>
      <h3 style="margin-top:16px">Thực đơn</h3>${menuEditorHtml(s.menu)}
      <div class="row" style="margin-top:16px"><button class="btn" data-saveshop>Lưu</button><button class="btn gray" data-cancel>Hủy</button></div></div>`;
  }

  const ROLES = [['seller', 'Nhà bán hàng'], ['shipper', 'Shipper'], ['customer', 'Khách hàng'], ['admin', 'Admin']];
  const flat = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const roleSel = u => `<select data-urole="${u.uid}" style="width:auto">${ROLES.map(([r, l]) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const userTable = (role, list) => {
    const isS = role === 'seller', hasZ = isS || role === 'shipper', cols = 3 + (isS ? 1 : 0) + (hasZ ? 1 : 0);
    const zalo = u => `<td><input type="text" data-uzalo="${u.uid}" value="${esc(u.zaloId || '')}" placeholder="Zalo ID (nhận báo đơn)" style="min-width:150px"></td>`;
    return `<div class="card" style="overflow:auto"><table><tr><th>Tên</th><th>SĐT</th>${isS ? '<th>Cửa hàng</th>' : ''}${hasZ ? '<th>Zalo ID</th>' : ''}<th>Vai trò</th></tr>${list.length ? list.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.phone)}</td>${isS ? `<td><select data-ushop="${u.uid}" style="width:auto"><option value="">— chọn quán —</option>${shops.map(s => `<option value="${s.id}" ${u.shopId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>${u.shopId ? '' : '<br><span class="badge warn">Chưa gán quán</span>'}</td>` : ''}${hasZ ? zalo(u) : ''}<td>${roleSel(u)}</td></tr>`).join('') : `<tr><td colspan="${cols}" class="muted">Chưa có ai trong nhóm này</td></tr>`}</table></div>`;
  };
  const usersView = () => {
    const q = flat($('#uq')?.value.trim());
    const match = u => !q || flat(u.phone).includes(q) || flat(u.name).includes(q);
    const cnt = r => users.filter(u => u.role === r).length;
    const pills = [['all', 'Tất cả', users.length], ...ROLES.map(([r, l]) => [r, l, cnt(r)])];
    const groups = ufil === 'all' ? ROLES : ROLES.filter(([r]) => r === ufil);
    return `<div class="card"><div class="row"><input type="search" id="uq" placeholder="Tìm theo tên hoặc số điện thoại" style="max-width:280px;margin:0"><button class="btn sm" data-ureload>Tải lại danh sách</button></div>
    <p class="muted" style="margin-top:8px">Khách tự đăng ký trên website (vai trò “Khách hàng”). Đổi vai trò tại đây; <b>Nhà bán hàng</b> cần gán cửa hàng, hoặc dùng nút “Cấp TK” ở tab Cửa hàng.</p></div>
    <div class="tabs" style="position:static;border:0;padding:0;background:none;margin:2px 0 10px">${pills.map(([k, l, n]) => `<button class="${ufil === k ? 'on' : ''}" data-ufil="${k}">${l} (${n})</button>`).join('')}</div>
    ${groups.map(([r, l]) => `${ufil === 'all' ? `<h3 style="margin:14px 0 6px">${l} (${cnt(r)})</h3>` : ''}${userTable(r, users.filter(u => u.role === r && match(u)))}`).join('')}`;
  };

  const promosView = () => `<div class="card"><h3>Thêm mã giảm giá</h3><div class="grid"><label class="f">Mã<input type="text" id="p-code" placeholder="GIAM30K"></label><label class="f">Mô tả<input type="text" id="p-desc" placeholder="Giảm 30K cho đơn từ 100K"></label>
    <label class="f">Giảm (đ)<input type="number" id="p-off" min="0" step="1000"></label><label class="f">Đơn tối thiểu (đ)<input type="number" id="p-min" min="0" step="1000"></label></div><button class="btn" style="margin-top:12px" data-addpromo>Thêm</button>
    <p class="muted" style="margin-top:8px">Mã hiển thị cho khách ở mục “Mã giảm giá” và tab Thông báo. Khách nhập mã khi đặt đơn.</p></div>
    ${promos.map(p => `<div class="card row sb"><span><b>${esc(p.code)}</b> · ${esc(p.desc)}<br><span class="muted">Giảm ${money(p.off)} · đơn từ ${money(p.min)}</span></span><span class="row"><label class="sw" style="margin:0"><input type="checkbox" data-pact="${p.id}" ${p.active === false ? '' : 'checked'}>Bật</label><button class="btn sm r" data-delpromo="${p.id}">Xóa</button></span></div>`).join('') || '<div class="empty">Chưa có mã</div>'}`;

  const settingsView = () => `<div class="card"><h3>Thông tin liên hệ hiển thị trên website</h3><div class="grid"><label class="f">Hotline<input type="tel" id="c-hot" value="${esc(settings.hotline || '')}"></label><label class="f">Email<input type="text" id="c-mail" value="${esc(settings.email || '')}"></label><label class="f">Zalo (số hoặc link)<input type="text" id="c-zalo" value="${esc(settings.zalo || '')}"></label></div><button class="btn" style="margin-top:12px" data-savesettings>Lưu</button></div>`;

  function draw() {
    const keep = $('#uq')?.value;
    const pend = orders.filter(o => o.status === 'pending').length;
    const T = [['orders', `Đơn hàng${pend ? `<span class="n">${pend}</span>` : ''}`], ['shops', 'Cửa hàng'], ['users', 'Người dùng'], ['promos', 'Khuyến mãi'], ['settings', 'Liên hệ']];
    root.innerHTML = `<div class="tabs">${T.map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div><main>${err ? `<div class="card" style="color:var(--red)">${esc(err)}</div>` : ''}${{ orders:ordersView, shops:shopsView, users:usersView, promos:promosView, settings:settingsView }[tab]()}</main>`;
    if (keep && $('#uq')) $('#uq').value = keep;
  }
  /* Ghi danh sách Zalo ID (chủ quán theo từng quán + shipper) để Apps Script biết gửi báo đơn cho ai */
  const syncNotify = async () => {
    const shopsMap = {}, shippers = [];
    users.forEach(u => {
      const ids = String(u.zaloId || '').split(',').map(x => x.trim()).filter(Boolean);
      if (u.role === 'seller' && u.shopId) shopsMap[u.shopId] = [...(shopsMap[u.shopId] || []), ...ids];
      if (u.role === 'shipper') shippers.push(...ids);
    });
    await fb.saveNotify({ shops:shopsMap, shippers });
  };
  const loadUsers = async () => { try { users = await fb.listUsers(); } catch (e) { err = fb.errMsg(e); } draw(); };

  track(fb.watchShops((l, e) => { shops = l.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi')); if (e) err = fb.errMsg(e); if (!edit || !$('#f-name')) draw(); }));
  track(fb.watchAllOrders((l, e) => { orders = l; if (e) err = fb.errMsg(e); if (tab === 'orders') draw(); }));
  track(fb.watchPromos(l => { promos = l; if (tab === 'promos') draw(); }));
  track(fb.watchSettings(s => { settings = s; if (tab === 'settings') draw(); }));
  loadUsers(); bindMenuEditor(root); bindImgUpload(root);

  root.addEventListener('input', e => { if (e.target.id === 'uq') draw(), $('#uq').focus(); });
  root.addEventListener('change', async e => {
    const t = e.target;
    try {
      if (t.id === 'ofil') { ofil = t.value; draw(); }
      if (t.dataset.feat) { await fb.patchShop(t.dataset.feat, { featured:t.checked }); toast(t.checked ? 'Đã bật Nổi bật' : 'Đã tắt Nổi bật'); }
      if (t.dataset.sale !== undefined) { await fb.patchShop(t.dataset.sale, { sale:Math.min(90, Math.max(0, +t.value || 0)) }); toast('Đã cập nhật giảm giá'); }
      if (t.dataset.impck !== undefined) { imp[+t.dataset.impck].on = t.checked; draw(); }
      if (t.id === 'imp-file' && t.files[0]) {
        toast('Đang đọc file…');
        const X = await loadXLSX(), wb = X.read(await t.files[0].arrayBuffer(), { type: 'array' }), sheets = {};
        wb.SheetNames.forEach(n => { sheets[n] = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: null }); });
        imp = parseWorkbook(sheets, shops.map(s => s.name)).shops;
        if (!imp.length) { imp = null; toast('Không thấy dữ liệu quán trong file (cần tab “Quán”)'); }
        t.value = ''; draw();
      }
      if (t.dataset.ost) await fb.patchOrder(t.dataset.ost, { status:t.value });
      if (t.dataset.urole) { await fb.patchUser(t.dataset.urole, { role:t.value }); users.find(u => u.uid === t.dataset.urole).role = t.value; if (ufil !== 'all') ufil = t.value; await syncNotify(); toast('Đã đổi vai trò' + (t.value === 'seller' ? ' – hãy chọn cửa hàng cho họ' : '')); draw(); }
      if (t.dataset.ushop) { await fb.patchUser(t.dataset.ushop, { shopId:t.value }); users.find(u => u.uid === t.dataset.ushop).shopId = t.value; await syncNotify(); toast('Đã gán cửa hàng'); }
      if (t.dataset.uzalo !== undefined) { const z = t.value.trim(); await fb.patchUser(t.dataset.uzalo, { zaloId:z }); users.find(u => u.uid === t.dataset.uzalo).zaloId = z; await syncNotify(); toast('Đã lưu Zalo ID'); }
      if (t.dataset.pact) { const { id, ...rest } = promos.find(p => p.id === t.dataset.pact); await fb.savePromo(id, { ...rest, active:t.checked }); toast('Đã cập nhật'); }
    } catch (er) { toast(fb.errMsg(er)); }
  });
  root.addEventListener('click', async e => {
    const g = s => e.target.closest(s);
    if (g('[data-t]')) { tab = g('[data-t]').dataset.t; edit = null; draw(); return; }
    try {
      if (g('[data-newshop]')) { edit = { menu:[] }; draw(); }
      else if (g('[data-editshop]')) { edit = JSON.parse(JSON.stringify(shops.find(s => s.id === g('[data-editshop]').dataset.editshop))); draw(); }
      else if (g('[data-resetloc]')) { if (confirm('Đặt lại vị trí quán? Chủ quán sẽ chia sẻ lại được 1 lần.')) { await fb.patchShop(edit.id, { lat:null, lng:null, locAcc:null, locAt:null }); edit.lat = null; edit.lng = null; toast('Đã đặt lại vị trí'); draw(); } }
      else if (g('[data-cancel]')) { edit = null; draw(); }
      else if (g('[data-delshop]')) { const s = shops.find(x => x.id === g('[data-delshop]').dataset.delshop); if (confirm(`Xóa cửa hàng “${s.name}”?`)) { await fb.removeShop(s.id); toast('Đã xóa'); } }
      else if (g('[data-mv]')) {
        const b = g('[data-mv]'), list = [...shops].sort(byOrder), i = list.findIndex(s => s.id === b.dataset.id), j = i + (b.dataset.mv === 'up' ? -1 : 1);
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        await Promise.all(list.map((s, k) => s.order === (k + 1) * 10 ? null : fb.patchShop(s.id, { order:(k + 1) * 10 })));
        toast('Đã đổi thứ tự');
      }
      else if (g('[data-mkseller]')) {
        const s = shops.find(x => x.id === g('[data-mkseller]').dataset.mkseller);
        const phone = (prompt(`Số điện thoại đăng nhập của chủ quán “${s.name}”:`, s.phone || '') || '').replace(/\D/g, '');
        if (!phone) return;
        const old = users.find(u => u.phone === phone);
        if (old) {                                            // SĐT đã có tài khoản → chỉ cần gán quyền
          if (!confirm(`SĐT ${phone} đã có tài khoản (${old.name}). Gán làm chủ quán “${s.name}”?`)) return;
          await fb.patchUser(old.uid, { role:'seller', shopId:s.id }); await loadUsers(); return toast('Đã gán quyền bán hàng');
        }
        const pass = prompt('Đặt mật khẩu tạm (tối thiểu 6 ký tự). Hãy gửi cho chủ quán cùng số điện thoại:');
        if (!pass) return; if (pass.length < 6) return toast('Mật khẩu tối thiểu 6 ký tự');
        toast('Đang tạo tài khoản…');
        await fb.createSellerAccount({ name:s.name, phone, pass, shopId:s.id });
        await loadUsers(); toast(`Đã tạo tài khoản: ${phone}`);
      }
      else if (g('[data-impfile]')) { $('#imp-file').click(); }
      else if (g('[data-impcancel]')) { imp = null; draw(); }
      else if (g('[data-impgo]')) {
        const pick = imp.filter(x => x.on); if (!pick.length) return toast('Chưa chọn quán nào');
        impBusy = true; let n = 0; draw();
        try { for (const x of pick) { await fb.createShop(x.data); toast(`Đang nhập ${++n}/${pick.length}…`); } }
        finally { impBusy = false; draw(); }
        imp = null; toast(`Đã nhập ${n} quán`); draw();
      }
      else if (g('[data-seed]')) { for (const s of SAMPLE) await fb.createShop(s); toast('Đã thêm quán mẫu'); }
      else if (g('[data-saveshop]')) {
        const v = id => $('#' + id).value.trim();
        if (!v('f-name')) return toast('Nhập tên quán');
        const d = { name:v('f-name'), cat:v('f-cat'), group:v('f-group').split(',').map(x => x.trim()).filter(Boolean), phone:v('f-phone'), address:v('f-address'), eta:v('f-eta'), shipFee:Math.max(0, +v('f-ship') || 0), freeShipMin:Math.max(0, +v('f-free') || 0), sale:Math.min(90, Math.max(0, +v('f-sale') || 0)), rate:Math.min(5, Math.max(0, +v('f-rate') || 0)), rc:v('f-rc'), img:v('f-img'), desc:v('f-desc'), open:$('#f-open').checked, featured:$('#f-feat').checked, menu:readMenu(root) };
        if (edit.id) await fb.patchShop(edit.id, d); else await fb.createShop(d);
        edit = null; toast('Đã lưu cửa hàng'); draw();
      }
      else if (g('[data-ufil]')) { ufil = g('[data-ufil]').dataset.ufil; draw(); }
      else if (g('[data-ureload]')) { await loadUsers(); toast('Đã tải lại'); }
      else if (g('[data-addpromo]')) {
        const v = id => $('#' + id).value.trim(); if (!v('p-code')) return toast('Nhập mã');
        await fb.savePromo(null, { code:v('p-code').toUpperCase(), desc:v('p-desc'), off:+v('p-off') || 0, min:+v('p-min') || 0, active:true }); toast('Đã thêm mã');
      }
      else if (g('[data-delpromo]')) { if (confirm('Xóa mã này?')) await fb.removePromo(g('[data-delpromo]').dataset.delpromo); }
      else if (g('[data-savesettings]')) { await fb.saveSettings({ hotline:$('#c-hot').value.trim(), email:$('#c-mail').value.trim(), zalo:$('#c-zalo').value.trim() }); toast('Đã lưu'); }
    } catch (er) { toast(fb.errMsg(er)); }
  });
} });
