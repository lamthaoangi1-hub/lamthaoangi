import { fb, track, $, $$, esc, money, fmtTime, sameDay, badge, newestFirst, toast, beep, menuEditorHtml, bindMenuEditor, readMenu, getPos, mapLink, imgUpHtml, bindImgUpload } from './panel.js?v=20261016a';

export const panel = { key:'seller', title:'Nhà bán hàng', roles:['seller', 'admin'], render(root, me) {
  if (!me.shopId) { root.innerHTML = `<main><div class="card"><h3>Chưa gắn cửa hàng</h3><p class="muted">Tài khoản này chưa được gán cửa hàng. Hãy nhờ Admin gán cửa hàng cho bạn (trang Admin → Người dùng).</p></div></main>`; return; }
  let tab = 'orders', shop = null, orders = [], err = '', fil = 'active';

  function orderCard(o) {
    const items = (o.items || []).map(i => `<li>${i.qty} x ${esc(i.name)} <span class="muted">${money(i.price * i.qty)}</span></li>`).join('');
    return `<div class="card"><div class="row sb"><b>#${esc(o.code)}</b>${badge(o.status)}</div><div class="muted">${fmtTime(o.createdAt)} · ${esc(o.customerName)} · <a href="tel:${esc(o.customerPhone)}">${esc(o.customerPhone)}</a></div>
      <ul class="items">${items}</ul>${o.note ? `<p class="muted">Ghi chú: ${esc(o.note)}</p>` : ''}
      <div class="row sb"><span>Tổng: <b class="total">${money(o.total)}</b> <span class="muted">· tiền mặt${o.shipperName ? ' · Shipper: ' + esc(o.shipperName) : ''}</span></span>
      <span class="muted">Quán chỉ xem đơn – shipper nhận và giao</span></div></div>`;
  }
  function ordersTab() {
    const act = o => ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].includes(o.status);
    const list = [...orders].sort(newestFirst).filter(o => fil === 'active' ? act(o) : !act(o)).slice(0, 80);
    const today = orders.filter(o => o.status === 'done' && sameDay(o.updatedAt));
    return `<div class="stat"><div class="card"><b>${orders.filter(o => o.status === 'pending').length}</b><span class="muted">Chờ xác nhận</span></div><div class="card"><b>${today.length}</b><span class="muted">Đơn xong hôm nay</span></div><div class="card"><b>${money(today.reduce((a, o) => a + (o.subtotal || 0) - (o.discount || 0), 0))}</b><span class="muted">Doanh thu hôm nay</span></div></div>
      <div class="row" style="margin-bottom:10px"><button class="btn sm ${fil === 'active' ? '' : 'o'}" data-fil="active">Đang xử lý</button><button class="btn sm ${fil === 'past' ? '' : 'o'}" data-fil="past">Đã xong / hủy</button></div>
      ${list.length ? list.map(orderCard).join('') : '<div class="empty">Chưa có đơn</div>'}`;
  }
  function menuTab() {
    return `<div class="card"><h3>Thực đơn</h3><p class="muted">Sửa tên, giá, tắt món hết hàng rồi bấm Lưu.</p>${menuEditorHtml(shop.menu)}<button class="btn" style="margin-top:14px" data-savemenu>Lưu thực đơn</button></div>`;
  }
  function shopTab() {
    const n = (k, d = '') => esc(shop[k] ?? d);
    const has = shop.lat != null && shop.lng != null;
    const locCard = `<div class="card"><h3>Vị trí quán trên bản đồ</h3>
      <p class="muted" style="margin:4px 0 10px">${has ? `Đã lưu vị trí quán${shop.locAcc ? ` (sai số khoảng ${shop.locAcc} m)` : ''}. Shipper sẽ thấy nút chỉ đường tới quán. <a href="${mapLink(shop.lat, shop.lng)}" target="_blank" rel="noopener">Xem trên bản đồ</a>. Muốn đổi vị trí, hãy nhờ Admin đặt lại.` : 'Hãy đứng tại quán, bật GPS rồi bấm nút bên dưới. Chỉ bấm được 1 lần: sau khi lưu nút sẽ bị khóa.'}</p>
      <button class="btn" data-shareloc ${has ? 'disabled' : ''}>${has ? '✓ Đã chia sẻ vị trí quán' : '📍 Chia sẻ vị trí quán'}</button></div>`;
    return locCard + `<div class="card"><h3>${esc(shop.name)}</h3>
      <label class="sw"><input type="checkbox" id="s-open" ${shop.open === false ? '' : 'checked'}>Đang mở cửa (nhận đơn)</label>
      <label class="f">Mô tả<textarea id="s-desc">${n('desc')}</textarea></label>
      <div class="grid"><label class="f">Địa chỉ<input type="text" id="s-address" value="${n('address')}"></label><label class="f">SĐT quán<input type="tel" id="s-phone" value="${n('phone')}"></label>
      <label class="f">Thời gian giao (VD: 15 - 25 phút)<input type="text" id="s-eta" value="${n('eta', '15 - 30 phút')}"></label><label class="f">Giảm giá (%)<input type="number" id="s-sale" min="0" max="90" value="${shop.sale ?? 0}"></label></div>
      <label class="f">Ảnh / logo quán</label>${imgUpHtml(shop.img || '', 's-img')}
      <p class="muted" style="margin-top:12px">Phí giao hàng do Admin quy định: <b>${money(shop.shipFee ?? 15000)}</b>${shop.freeShipMin ? `, ${shop.freeShipAll ? 'miễn phí giao hàng' : 'miễn phí ship cơ bản'} cho đơn từ ${money(shop.freeShipMin)}` : ''}. Cần đổi, vui lòng liên hệ Admin.</p>
      <button class="btn" style="margin-top:14px" data-saveshop>Lưu cửa hàng</button></div>`;
  }
  function draw() {
    const pend = orders.filter(o => o.status === 'pending').length;
    root.innerHTML = `<div class="tabs"><button class="${tab === 'orders' ? 'on' : ''}" data-t="orders">Đơn hàng${pend ? `<span class="n">${pend}</span>` : ''}</button><button class="${tab === 'menu' ? 'on' : ''}" data-t="menu">Thực đơn</button><button class="${tab === 'shop' ? 'on' : ''}" data-t="shop">Cửa hàng</button></div>
      <main>${err ? `<div class="card" style="color:var(--red)">${esc(err)}</div>` : ''}${!shop ? '<div class="empty">Đang tải cửa hàng…</div>' : tab === 'orders' ? ordersTab() : tab === 'menu' ? menuTab() : shopTab()}</main>`;
  }
  let first = true;
  track(fb.watchShop(me.shopId, (s, e) => { shop = s; if (e) err = fb.errMsg(e); else if (!s) err = 'Không tìm thấy cửa hàng được gán cho bạn.'; if (tab === 'orders' || first) draw(); }));
  track(fb.watchShopOrders(me.shopId, (l, e) => {
    if (e) err = fb.errMsg(e);
    if (!first && l.filter(o => o.status === 'pending').length > orders.filter(o => o.status === 'pending').length) { beep(); toast('Có đơn mới!'); }
    orders = l; first = false; if (tab === 'orders') draw();
  }));
  bindMenuEditor(root); bindImgUpload(root);
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; draw(); return; }
    const f = e.target.closest('[data-fil]'); if (f) { fil = f.dataset.fil; draw(); return; }
    try {
      const sl = e.target.closest('[data-shareloc]');
      if (sl) {
        if (shop.lat != null) return;
        sl.disabled = true; sl.textContent = 'Đang lấy vị trí…';
        try {
          const p = await getPos();
          await fb.patchShop(me.shopId, { lat:p.lat, lng:p.lng, locAcc:p.acc, locAt:Date.now() });
          shop = { ...shop, lat:p.lat, lng:p.lng, locAcc:p.acc }; draw(); toast('Đã lưu vị trí quán');
        } catch (er) { sl.disabled = false; sl.textContent = '📍 Chia sẻ vị trí quán'; toast(er.message || fb.errMsg(er)); }
        return;
      }
      if (e.target.closest('[data-savemenu]')) { await fb.patchShop(me.shopId, { menu:readMenu(root) }); toast('Đã lưu thực đơn'); return; }
      if (e.target.closest('[data-saveshop]')) {
        const v = id => $('#' + id).value.trim();
        await fb.patchShop(me.shopId, { open:$('#s-open').checked, desc:v('s-desc'), address:v('s-address'), phone:v('s-phone'), eta:v('s-eta'), sale:Math.min(90, Math.max(0, +v('s-sale') || 0)), img:v('s-img') });
        toast('Đã lưu cửa hàng');
      }
    } catch (er) { toast(fb.errMsg(er)); }
  });
} };
