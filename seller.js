import { report, periodControl, metrics, note, dailyView, subsidyOf } from './revenue.js?v=20261031c';
import { hoursFormHtml, readHours, isOpenNow, hoursText } from './hours.js?v=20261023a';
import { shopLink, copyText } from './shoplink.js?v=20261031c';
import { fb, track, $, $$, esc, money, fmtTime, toDate, sameDay, badge, payBadge, payText, newestFirst, toast, beep, menuEditorHtml, bindMenuEditor, readMenu, getPos, mapLink, imgUpHtml, bindImgUpload } from './panel.js?v=20261031c';

export const panel = { key:'seller', title:'Nhà bán hàng', roles:['seller', 'admin'], render(root, me) {
  if (!me.shopId) { root.innerHTML = `<main><div class="card"><h3>Chưa gắn cửa hàng</h3><p class="muted">Tài khoản này chưa được gán cửa hàng. Hãy nhờ Admin gán cửa hàng cho bạn (trang Admin → Người dùng).</p></div></main>`; return; }
  let tab = 'orders', shop = null, settings = {}, orders = [], err = '', fil = 'active', period = 'month', subPaid = {};
  /* Tiền Lâm Thao Ăn Gì bù cho quán (phần giảm giá khách được hưởng do Admin chịu), theo ngày giao thành công */
  const pad2 = n => String(n).padStart(2, '0');
  const dayKeyOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const dmy = k => k.split('-').reverse().join('/');
  const subByDay = () => { const m = new Map(); orders.forEach(o => { const v = subsidyOf(o), d = toDate(o.updatedAt || o.createdAt); if (!v || !d) return; const k = dayKeyOf(d), c = m.get(k) || { count:0, amount:0 }; c.count++; c.amount += v; m.set(k, c); }); return m; };
  const recentKeys = n => Array.from({ length:n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return dayKeyOf(d); });
  const subState = (k, amt) => { const p = subPaid[k]; if (!(k in subPaid)) return { cls:'', text:'…', done:false }; if (!p) return { cls:'warn', text:'Chưa chuyển', done:false }; if (p.amount >= amt) return { cls:'ok', text:'Đã chuyển ' + fmtTime(p.at), done:true }; return { cls:'warn', text:`Đã nhận ${money(p.amount)}, còn thiếu ${money(amt - p.amount)}`, done:false }; };
  let subBusy = false;
  const loadSubPaid = async () => {
    if (subBusy || !me.shopId) return;
    const by = subByDay(), need = recentKeys(7).filter(k => by.has(k) && !(k in subPaid)); if (!need.length) return;
    subBusy = true;
    try { Object.assign(subPaid, await fb.getShopSettlements(me.shopId, need)); } catch (e) { /* chưa đọc được thì giữ trạng thái "…" */ }
    subBusy = false; if (tab === 'orders' || tab === 'revenue') draw();
  };
  const subCard = () => {
    const by = subByDay(), t = by.get(dayKeyOf(new Date())), past = recentKeys(7).slice(1).filter(k => by.has(k) && !subState(k, by.get(k).amount).done);
    if (!t && !past.length && !by.size) return '';
    const st = t ? subState(dayKeyOf(new Date()), t.amount) : null;
    return `<div class="card" style="background:#f0fbf4;border:1px solid #b7e4c7"><h3>🎁 Lâm Thao Ăn Gì bù cho quán</h3>
      <p class="muted" style="margin:2px 0 6px">Khách được giảm giá khi đặt món, <b>quán vẫn nhận đủ tiền món</b>. Phần giảm do Lâm Thao Ăn Gì chịu và chuyển khoản bù cho quán cuối ngày (chỉ tính đơn đã giao thành công).</p>
      <div class="row sb"><span>Hôm nay: <b class="total">${money(t ? t.amount : 0)}</b> <span class="muted">· ${t ? t.count : 0} đơn</span></span>${st ? `<span class="badge ${st.cls}">${esc(st.text)}</span>` : '<span class="muted">chưa có đơn</span>'}</div>
      ${past.map(k => { const s2 = subState(k, by.get(k).amount); return `<div class="row sb" style="margin-top:6px"><span class="muted">Ngày ${dmy(k)}: <b>${money(by.get(k).amount)}</b> (${by.get(k).count} đơn)</span><span class="badge ${s2.cls}">${esc(s2.text)}</span></div>`; }).join('')}</div>`;
  };
  const subTable = () => { const by = [...subByDay()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30); if (!by.length) return '';
    return `<div class="card"><h3>Tiền Lâm Thao Ăn Gì bù theo ngày</h3><div class="table-scroll"><table><thead><tr><th>Ngày</th><th>Đơn</th><th>Số tiền bù</th><th>Trạng thái</th></tr></thead><tbody>${by.map(([k, v]) => { const st = subState(k, v.amount); return `<tr><td>${dmy(k)}</td><td>${v.count}</td><td><b>${money(v.amount)}</b></td><td><span class="badge ${st.cls}">${esc(st.text)}</span></td></tr>`; }).join('')}</tbody></table></div><p class="muted" style="margin-top:6px">Chỉ hiện trạng thái cho 7 ngày gần nhất.</p></div>`; };

  function orderCard(o) {
    const items = (o.items || []).map(i => `<li>${i.qty} x ${esc(i.name)} <span class="muted">${money(i.price * i.qty)}</span></li>`).join('');
    const showC = settings.shopSeeCustomer !== false;   // Admin bật/tắt ở tab Liên hệ: quán có được xem thông tin khách không
    const cust = showC
      ? `<div class="muted">${fmtTime(o.createdAt)} · ${esc(o.customerName)} · <a href="tel:${esc(o.customerPhone)}">${esc(o.customerPhone)}</a></div>
        <div class="muted">Giao đến: <b>${esc(o.address)}</b>${o.lat != null && o.lng != null ? ` · <a href="${mapLink(o.lat, o.lng)}" target="_blank" rel="noopener">Xem bản đồ</a>` : ''}</div>`
      : `<div class="muted">${fmtTime(o.createdAt)} · Thông tin khách do shipper phụ trách</div>`;
    return `<div class="card"><div class="row sb"><b>#${esc(o.code)}</b>${badge(o.status)}</div>${cust}
      <ul class="items">${items}</ul>${o.note ? `<p class="muted">Ghi chú: ${esc(o.note)}</p>` : ''}
      <div class="row sb"><span>Tổng: <b class="total">${money(o.total)}</b> <span class="muted">· ${payText(o)}${o.shipperName ? ' · Shipper: ' + esc(o.shipperName) : ''}</span></span>
      <span class="muted">${showC ? 'Quán xem đơn và giao theo thông tin khách' : 'Quán chỉ xem đơn – shipper nhận và giao'}</span></div>${o.platformOff ? `<div class="muted" style="margin-top:6px">🎁 Lâm Thao Ăn Gì giảm ${o.platformPct ? o.platformPct + '% ' : ''}cho khách: <b>${money(o.platformOff)}</b> – <b>quán vẫn nhận đủ</b>, Admin sẽ chuyển khoản bù cuối ngày.</div>` : ''}${o.shopShip ? `<div class="muted" style="margin-top:6px">Quán hỗ trợ phí ship (freeship): <b>-${money(o.shopShip)}</b> · Quán thực nhận: <b>${money(Math.max(0, (o.subtotal || 0) - (o.discount || 0) + (o.platformOff || 0) - o.shopShip))}</b></div>` : ''}</div>`;
  }
  function ordersTab() {
    const act = o => ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].includes(o.status);
    const list = [...orders].sort(newestFirst).filter(o => fil === 'active' ? act(o) : !act(o)).slice(0, 80);
    const today = orders.filter(o => o.status === 'done' && sameDay(o.updatedAt));
    return subCard() + `<div class="stat"><div class="card"><b>${orders.filter(o => o.status === 'pending').length}</b><span class="muted">Chờ xác nhận</span></div><div class="card"><b>${today.length}</b><span class="muted">Đơn xong hôm nay</span></div><div class="card"><b>${money(today.reduce((a, o) => a + (o.subtotal || 0) - (o.discount || 0) + (o.platformOff || 0), 0))}</b><span class="muted">Doanh thu hôm nay</span></div></div>
      <div class="row" style="margin-bottom:10px"><button class="btn sm ${fil === 'active' ? '' : 'o'}" data-fil="active">Đang xử lý</button><button class="btn sm ${fil === 'past' ? '' : 'o'}" data-fil="past">Đã xong / hủy</button></div>
      ${list.length ? list.map(orderCard).join('') : '<div class="empty">Chưa có đơn</div>'}`;
  }
  function revenueTab() { const r = report(orders, period); return `<div class="section-heading"><h2>Doanh thu cửa hàng</h2><p>Chi tiết hoạt động kinh doanh của ${esc(shop.name)}</p></div>${periodControl(period)}${metrics(r)}${note}${dailyView(r)}${subTable()}`; }
  function menuTab() {
    return `<div class="card"><h3>Thực đơn</h3><p class="muted">Sửa tên, giá, tắt món hết hàng rồi bấm Lưu.</p>${menuEditorHtml(shop.menu)}<button class="btn" style="margin-top:14px" data-savemenu>Lưu thực đơn</button></div>`;
  }
  function shopTab() {
    const n = (k, d = '') => esc(shop[k] ?? d);
    const has = shop.lat != null && shop.lng != null;
    const locCard = `<div class="card"><h3>Vị trí quán trên bản đồ</h3>
      <p class="muted" style="margin:4px 0 10px">${has ? `Đã lưu vị trí quán${shop.locAcc ? ` (sai số khoảng ${shop.locAcc} m)` : ''}. Shipper sẽ thấy nút chỉ đường tới quán. <a href="${mapLink(shop.lat, shop.lng)}" target="_blank" rel="noopener">Xem trên bản đồ</a>. Muốn đổi vị trí, hãy nhờ Admin đặt lại.` : 'Hãy đứng tại quán, bật GPS rồi bấm nút bên dưới. Chỉ bấm được 1 lần: sau khi lưu nút sẽ bị khóa.'}</p>
      <button class="btn" data-shareloc ${has ? 'disabled' : ''}>${has ? '✓ Đã chia sẻ vị trí quán' : '📍 Chia sẻ vị trí quán'}</button></div>`;
    const linkCard = `<div class="card"><h3>🔗 Link đặt món của quán</h3><p class="muted" style="margin:4px 0 8px">Gửi link này cho khách (Zalo, Facebook, tin nhắn…): khách bấm vào là thấy ngay thực đơn của quán bạn để đặt món.</p>
      <input type="text" id="s-link" readonly value="${esc(shopLink({ id:me.shopId, name:shop.name }, [{ id:me.shopId, name:shop.name }]))}" onclick="this.select()"><button class="btn" style="margin-top:10px" data-copylink>Sao chép link</button></div>`;
    return linkCard + locCard + `<div class="card"><h3>${esc(shop.name)}</h3>
      <p class="muted" style="margin:4px 0 8px">Trạng thái hiện tại: ${shop.open === false ? '<b>Đang đóng (tắt thủ công)</b>' : isOpenNow(shop) ? '<b>Đang mở cửa</b>' : '<b>Ngoài giờ mở cửa – quán đang tự đóng</b>'}${hoursText(shop) ? ` · giờ mở cửa ${hoursText(shop)}` : ''}</p>
      ${hoursFormHtml(shop, 's')}
      <label class="sw"><input type="checkbox" id="s-open" ${shop.open === false ? '' : 'checked'}>Đang mở cửa (công tắc tổng – tắt là đóng cả ngày, không nhận đơn)</label>
      <label class="f">Mô tả<textarea id="s-desc">${n('desc')}</textarea></label>
      <div class="grid"><label class="f">Địa chỉ<input type="text" id="s-address" value="${n('address')}"></label><label class="f">SĐT quán<input type="tel" id="s-phone" value="${n('phone')}"></label>
      <label class="f">Thời gian giao (VD: 15 - 25 phút)<input type="text" id="s-eta" value="${n('eta', '15 - 30 phút')}"></label><label class="f">Giảm giá (%)<input type="number" id="s-sale" min="0" max="90" value="${shop.sale ?? 0}"></label></div>
      <label class="f">Ảnh / logo quán</label>${imgUpHtml(shop.img || '', 's-img')}
      <p class="muted" style="margin-top:12px">Phí giao hàng do Admin quy định: <b>${money(shop.shipFee ?? 15000)}</b>${shop.freeShipMin ? `, ${shop.freeShipAll ? 'miễn phí giao hàng' : 'miễn phí ship cơ bản'} cho đơn từ ${money(shop.freeShipMin)}` : ''}. Cần đổi, vui lòng liên hệ Admin.</p>
      <button class="btn" style="margin-top:14px" data-saveshop>Lưu cửa hàng</button></div>`;
  }
  function draw() {
    const pend = orders.filter(o => o.status === 'pending').length;
    root.innerHTML = `<div class="tabs"><button class="${tab === 'orders' ? 'on' : ''}" data-t="orders">Đơn hàng${pend ? `<span class="n">${pend}</span>` : ''}</button><button class="${tab === 'revenue' ? 'on' : ''}" data-t="revenue">📊 Doanh thu</button><button class="${tab === 'menu' ? 'on' : ''}" data-t="menu">Thực đơn</button><button class="${tab === 'shop' ? 'on' : ''}" data-t="shop">Cửa hàng</button></div>
      <main>${err ? `<div class="card" style="color:var(--red)">${esc(err)}</div>` : ''}${!shop ? '<div class="empty">Đang tải cửa hàng…</div>' : tab === 'orders' ? ordersTab() : tab === 'menu' ? menuTab() : tab === 'revenue' ? revenueTab() : shopTab()}</main>`;
  }
  let first = true;
  track(fb.watchShop(me.shopId, (s, e) => { shop = s; if (e) err = fb.errMsg(e); else if (!s) err = 'Không tìm thấy cửa hàng được gán cho bạn.'; if (tab === 'orders' || tab === 'revenue' || first) draw(); }));
  track(fb.watchShopOrders(me.shopId, (l, e) => {
    if (e) err = fb.errMsg(e);
    if (!first && l.filter(o => o.status === 'pending').length > orders.filter(o => o.status === 'pending').length) { beep(); toast('Có đơn mới!'); }
    orders = l; first = false; if (tab === 'orders' || tab === 'revenue') draw();
    loadSubPaid();
  }));
  track(fb.watchSettings(s => { settings = s; if (tab === 'orders') draw(); }));
  bindMenuEditor(root); bindImgUpload(root);
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; draw(); return; }
    const periodBtn = e.target.closest('[data-period]'); if (periodBtn) { period = periodBtn.dataset.period; draw(); return; }
    const f = e.target.closest('[data-fil]'); if (f) { fil = f.dataset.fil; draw(); return; }
    if (e.target.closest('[data-copylink]')) { if (await copyText($('#s-link').value)) toast('Đã sao chép link quán'); return; }
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
        const hr = readHours('s', root); if (hr.error) return toast(hr.error);
        await fb.patchShop(me.shopId, { ...hr.fields, open:$('#s-open').checked, desc:v('s-desc'), address:v('s-address'), phone:v('s-phone'), eta:v('s-eta'), sale:Math.min(90, Math.max(0, +v('s-sale') || 0)), img:v('s-img') });
        toast('Đã lưu cửa hàng');
      }
    } catch (er) { toast(fb.errMsg(er)); }
  });
} };
