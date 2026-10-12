import { fb, start, track, $, $$, esc, money, fmtTime, badge, STATUS, newestFirst, toast, menuEditorHtml, bindMenuEditor, readMenu } from './panel.js';

const SAMPLE = [
  { name:'Phở Bò Lâm Thao', cat:'Phở • Món Việt', group:['Phở', 'Món Việt'], desc:'Phở bò gia truyền.', img:'pho.jpg', eta:'15 - 25 phút', shipFee:15000, freeShipMin:100000, sale:0, open:true, menu:[{ name:'Phở bò tái nạm', price:55000, available:true }, { name:'Trà đá', price:10000, available:true }] },
  { name:'Cơm Tấm Minh Tâm', cat:'Cơm • Món Việt', group:['Cơm', 'Món Việt'], desc:'Cơm tấm sườn nướng.', img:'comtam.jpg', eta:'20 - 30 phút', shipFee:15000, freeShipMin:100000, sale:0, open:true, menu:[{ name:'Cơm tấm sườn nướng', price:50000, available:true }] },
];

start({ title:'Quản trị', roles:['admin'], render(root, me) {
  let tab = 'orders', shops = [], orders = [], users = [], promos = [], settings = {}, edit = null, ofil = 'all', err = '';
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

  const shopsView = () => edit ? shopForm() : `<div class="row sb" style="margin-bottom:10px"><b>${shops.length} cửa hàng</b><span class="row"><button class="btn sm o" data-seed>+ Thêm 2 quán mẫu</button><button class="btn sm" data-newshop>+ Thêm cửa hàng</button></span></div>
    ${shops.length ? `<div class="card"><table><tr><th>Quán</th><th>Món</th><th>Trạng thái</th><th></th></tr>${shops.map(s => `<tr><td><b>${esc(s.name)}</b><br><span class="muted">${esc(s.cat || '')}</span></td><td>${(s.menu || []).length}</td><td>${s.open === false ? '<span class="badge bad">Đóng cửa</span>' : '<span class="badge ok">Mở cửa</span>'}</td><td style="text-align:right"><button class="btn sm o" data-editshop="${s.id}">Sửa</button> <button class="btn sm r" data-delshop="${s.id}">Xóa</button></td></tr>`).join('')}</table></div>` : '<div class="empty">Chưa có cửa hàng. Bấm “Thêm cửa hàng”.</div>'}`;

  function shopForm() {
    const s = edit, n = (k, d = '') => esc(s[k] ?? d);
    return `<div class="card"><h3>${s.id ? 'Sửa cửa hàng' : 'Thêm cửa hàng'}</h3>
      <div class="grid"><label class="f">Tên quán *<input type="text" id="f-name" value="${n('name')}"></label><label class="f">Loại (VD: Phở • Món Việt)<input type="text" id="f-cat" value="${n('cat')}"></label>
      <label class="f">Nhóm lọc (cách nhau dấu phẩy)<input type="text" id="f-group" value="${esc((s.group || []).join(', '))}" placeholder="Phở, Món Việt"></label><label class="f">SĐT quán<input type="tel" id="f-phone" value="${n('phone')}"></label>
      <label class="f">Địa chỉ<input type="text" id="f-address" value="${n('address')}"></label><label class="f">Thời gian giao<input type="text" id="f-eta" value="${n('eta', '15 - 30 phút')}"></label>
      <label class="f">Phí giao hàng (đ)<input type="number" id="f-ship" min="0" step="1000" value="${s.shipFee ?? 15000}"></label><label class="f">Miễn phí ship từ (đ, 0 = không)<input type="number" id="f-free" min="0" step="1000" value="${s.freeShipMin ?? 0}"></label>
      <label class="f">Giảm giá (%)<input type="number" id="f-sale" min="0" max="90" value="${s.sale ?? 0}"></label><label class="f">Điểm đánh giá (0–5, để 0 nếu quán mới)<input type="number" id="f-rate" min="0" max="5" step="0.1" value="${s.rate ?? 0}"></label>
      <label class="f">Số lượt đánh giá (VD: 120+)<input type="text" id="f-rc" value="${n('rc')}"></label><label class="f">Link ảnh hoặc tên file ảnh<input type="text" id="f-img" value="${n('img')}" placeholder="https://... hoặc pho.jpg"></label></div>
      <label class="f">Mô tả<textarea id="f-desc">${n('desc')}</textarea></label><label class="sw"><input type="checkbox" id="f-open" ${s.open === false ? '' : 'checked'}>Đang mở cửa</label>
      <h3 style="margin-top:16px">Thực đơn</h3>${menuEditorHtml(s.menu)}
      <div class="row" style="margin-top:16px"><button class="btn" data-saveshop>Lưu</button><button class="btn gray" data-cancel>Hủy</button></div></div>`;
  }

  const usersView = () => `<div class="card"><div class="row"><input type="tel" id="uq" placeholder="Tìm theo số điện thoại" style="max-width:260px;margin:0"><button class="btn sm" data-ureload>Tải lại danh sách</button></div>
    <p class="muted" style="margin-top:8px">Người dùng tự đăng ký trên website (vai trò “customer”). Chọn vai trò & cửa hàng cho họ tại đây: Nhà bán hàng cần gán cửa hàng.</p></div>
    <div class="card" style="overflow:auto"><table><tr><th>Tên</th><th>SĐT</th><th>Vai trò</th><th>Cửa hàng</th></tr>${users.filter(u => !$('#uq')?.value || (u.phone || '').includes($('#uq').value)).map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.phone)}</td>
      <td><select data-urole="${u.uid}" style="width:auto">${['customer', 'seller', 'shipper', 'admin'].map(r => `<option ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
      <td><select data-ushop="${u.uid}" style="width:auto"><option value="">—</option>${shops.map(s => `<option value="${s.id}" ${u.shopId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></td></tr>`).join('')}</table></div>`;

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
  const loadUsers = async () => { try { users = await fb.listUsers(); } catch (e) { err = fb.errMsg(e); } draw(); };

  track(fb.watchShops((l, e) => { shops = l.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi')); if (e) err = fb.errMsg(e); if (!edit || !$('#f-name')) draw(); }));
  track(fb.watchAllOrders((l, e) => { orders = l; if (e) err = fb.errMsg(e); if (tab === 'orders') draw(); }));
  track(fb.watchPromos(l => { promos = l; if (tab === 'promos') draw(); }));
  track(fb.watchSettings(s => { settings = s; if (tab === 'settings') draw(); }));
  loadUsers(); bindMenuEditor(root);

  root.addEventListener('input', e => { if (e.target.id === 'uq') draw(), $('#uq').focus(); });
  root.addEventListener('change', async e => {
    const t = e.target;
    try {
      if (t.id === 'ofil') { ofil = t.value; draw(); }
      if (t.dataset.ost) await fb.patchOrder(t.dataset.ost, { status:t.value });
      if (t.dataset.urole) { await fb.patchUser(t.dataset.urole, { role:t.value }); toast('Đã đổi vai trò'); users.find(u => u.uid === t.dataset.urole).role = t.value; }
      if (t.dataset.ushop) { await fb.patchUser(t.dataset.ushop, { shopId:t.value }); toast('Đã gán cửa hàng'); users.find(u => u.uid === t.dataset.ushop).shopId = t.value; }
      if (t.dataset.pact) { const { id, ...rest } = promos.find(p => p.id === t.dataset.pact); await fb.savePromo(id, { ...rest, active:t.checked }); toast('Đã cập nhật'); }
    } catch (er) { toast(fb.errMsg(er)); }
  });
  root.addEventListener('click', async e => {
    const g = s => e.target.closest(s);
    if (g('[data-t]')) { tab = g('[data-t]').dataset.t; edit = null; draw(); return; }
    try {
      if (g('[data-newshop]')) { edit = { menu:[] }; draw(); }
      else if (g('[data-editshop]')) { edit = JSON.parse(JSON.stringify(shops.find(s => s.id === g('[data-editshop]').dataset.editshop))); draw(); }
      else if (g('[data-cancel]')) { edit = null; draw(); }
      else if (g('[data-delshop]')) { const s = shops.find(x => x.id === g('[data-delshop]').dataset.delshop); if (confirm(`Xóa cửa hàng “${s.name}”?`)) { await fb.removeShop(s.id); toast('Đã xóa'); } }
      else if (g('[data-seed]')) { for (const s of SAMPLE) await fb.createShop(s); toast('Đã thêm quán mẫu'); }
      else if (g('[data-saveshop]')) {
        const v = id => $('#' + id).value.trim();
        if (!v('f-name')) return toast('Nhập tên quán');
        const d = { name:v('f-name'), cat:v('f-cat'), group:v('f-group').split(',').map(x => x.trim()).filter(Boolean), phone:v('f-phone'), address:v('f-address'), eta:v('f-eta'), shipFee:Math.max(0, +v('f-ship') || 0), freeShipMin:Math.max(0, +v('f-free') || 0), sale:Math.min(90, Math.max(0, +v('f-sale') || 0)), rate:Math.min(5, Math.max(0, +v('f-rate') || 0)), rc:v('f-rc'), img:v('f-img'), desc:v('f-desc'), open:$('#f-open').checked, menu:readMenu(root) };
        if (edit.id) await fb.patchShop(edit.id, d); else await fb.createShop(d);
        edit = null; toast('Đã lưu cửa hàng'); draw();
      }
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
