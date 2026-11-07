import { report, periodControl, metrics, note, dailyView, subsidyOf } from './revenue.js?v=20261107a';
import { hoursFormHtml, readHours, isOpenNow, hoursText } from './hours.js?v=20261023a';
import { shopLink, copyText, siteBase } from './shoplink.js?v=20261103a';
import { fb, track, $, $$, esc, money, fmtTime, toDate, sameDay, badge, payBadge, payText, newestFirst, toast, beep, menuEditorHtml, bindMenuEditor, readMenu, getPos, mapLink, imgUpHtml, bindImgUpload } from './panel.js?v=20261107a';

export const panel = { key:'seller', title:'Nhà bán hàng', roles:['seller', 'admin'], render(root, me) {
  if (!me.shopId) { root.innerHTML = `<main><div class="card"><h3>Chưa gắn cửa hàng</h3><p class="muted">Tài khoản này chưa được gán cửa hàng. Hãy nhờ Admin gán cửa hàng cho bạn (trang Admin → Người dùng).</p></div></main>`; return; }
  let tab = 'orders', cf = 'all', cq = '', draft = { q:{}, name:'', phone:'', addr:'', note:'' }, drafts = null, lastLink = '', draftBusy = false, shop = null, settings = {}, orders = [], err = '', fil = 'active', period = 'month', subPaid = {};
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
    return `<div class="card"><div class="row sb"><b>#${esc(o.code)}${o.viaSeller ? ' <span class="badge info">📝 Quán tạo hộ</span>' : ''}</b>${badge(o.status)}</div>${cust}${o.rating ? `<div style="margin-top:4px;color:#f5a623">${'★'.repeat(o.rating)}${'☆'.repeat(5 - o.rating)} <span class="muted">Khách đánh giá ${o.rating}/5 sao</span></div>` : ''}
      <ul class="items">${items}</ul>${o.note ? `<p class="muted">Ghi chú: ${esc(o.note)}</p>` : ''}
      <div class="row sb"><span>Tiền món quán nhận: <b class="total">${money(Math.max(0, (o.subtotal || 0) - (o.discount || 0) + (o.platformOff || 0)))}</b> <span class="muted">· phí ship khách trả cho shipper, không tính vào quán${o.shipperName ? ' · Shipper: ' + esc(o.shipperName) : ''}</span></span>
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
  /* ---- Tạo đơn hộ khách: quán chọn món → tạo link → khách mở link, chia sẻ vị trí và gửi ---- */
  const menuList = () => (shop.menu || []).map((m, i) => ({ i, name:m.name, price:+m.price || 0, cat:String(m.cat || '').trim(), ok:m.available !== false })).filter(m => m.ok && m.name);
  const nz = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const NOCAT = '__nocat';
  const selCount = () => draftLines().reduce((a, l) => a + l.qty, 0);
  /* Chip danh mục: Tất cả · Đã chọn · từng danh mục (kèm số món đã chọn) · Chưa phân loại */
  function catChips() {
    const list = menuList(), cats = [...new Set(list.map(m => m.cat).filter(Boolean))], hasNo = list.some(m => !m.cat);
    if (!cats.length) return '';
    const cnt = k => list.filter(m => draft.q[m.i] > 0 && (m.cat || NOCAT) === k).reduce((a, m) => a + draft.q[m.i], 0);
    const chip = (k, t, n) => `<button type="button" class="${cf === k ? 'on' : ''}" data-cf="${esc(k)}">${esc(t)}${n ? ` <span class="n">${n}</span>` : ''}</button>`;
    return chip('all', 'Tất cả') + chip('sel', '✓ Đã chọn', selCount()) + cats.map(c => chip(c, c, cnt(c))).join('') + (hasNo ? chip(NOCAT, 'Khác', cnt(NOCAT)) : '');
  }
  function rowsHtml() {
    const q = nz(cq.trim());
    const list = menuList().filter(m => (cf === 'all' || (cf === 'sel' ? draft.q[m.i] > 0 : (m.cat || NOCAT) === cf)) && (!q || nz(m.name).includes(q)));
    if (!list.length) return `<div class="empty" style="padding:24px 10px">${cf === 'sel' ? 'Chưa chọn món nào' : 'Không tìm thấy món phù hợp'}</div>`;
    return list.map(m => `<div class="qrow"><div><b>${esc(m.name)}</b><div class="muted">${money(m.price)}</div></div><div class="qctl"><button type="button" data-qm="${m.i}" aria-label="Giảm">−</button><b data-qn="${m.i}">${draft.q[m.i] || 0}</b><button type="button" data-qp="${m.i}" aria-label="Tăng">+</button></div></div>`).join('');
  }
  const refreshChips = () => { const c = $('#c-cats', root); if (c) c.innerHTML = catChips(); const n = $('#c-cnt', root); if (n) n.textContent = selCount(); };
  const refreshList = () => { const r = $('#c-rows', root); if (r) { r.innerHTML = rowsHtml(); r.scrollTop = 0; } refreshChips(); };
  const draftLines = () => menuList().filter(m => draft.q[m.i] > 0).map(m => ({ name:m.name, price:m.price, qty:draft.q[m.i] }));
  const draftSub = () => draftLines().reduce((a, l) => a + l.price * l.qty, 0);
  const draftUrl = id => siteBase() + 'dat.html?d=' + encodeURIComponent(id);
  const draftMsg = (url, name) => `Quán ${shop.name} đã lên đơn giúp${name ? ' ' + name : ' bạn'}. Bạn bấm link này, cho phép "Vị trí" rồi bấm "Gửi đơn" là xong nhé:\n${url}`;
  async function loadDrafts() {
    try { drafts = await fb.listOpenDrafts(me.shopId); } catch (e) { drafts = []; toast(fb.errMsg(e)); }
    if (tab === 'create') draw();
  }
  function createTab() {
    const list = menuList(), closed = !isOpenNow(shop);
    const rows = list.length ? rowsHtml() : '<div class="empty">Quán chưa có món nào đang bán. Hãy thêm món ở tab Thực đơn.</div>';
    const linkCard = lastLink ? `<div class="card" style="background:#f0fbf4;border:1px solid #b7e4c7"><h3>✅ Đã tạo link cho khách</h3>
      <p class="muted" style="margin:4px 0 8px">Gửi link này cho khách (Zalo, Messenger, tin nhắn…). Khách bấm vào, cho phép vị trí rồi bấm Gửi đơn. Đơn sẽ báo về quán, shipper và Admin như đơn thường.</p>
      <input type="text" id="c-link" readonly value="${esc(lastLink)}" onclick="this.select()">
      <div class="row" style="margin-top:10px"><button class="btn" data-copydraft="${esc(lastLink)}">Sao chép tin nhắn gửi khách</button>${navigator.share ? `<button class="btn o" data-sharedraft="${esc(lastLink)}">Chia sẻ…</button>` : ''}</div></div>` : '';
    const pend = drafts && drafts.length ? `<div class="card"><h3>Link đã tạo, khách chưa đặt</h3>${drafts.map(d => `<div class="qrow"><div><b>${esc(d.customerName || 'Khách')}</b> <span class="muted">· ${esc(d.customerPhone || '')} · ${fmtTime(d.createdAtMs)}</span>
        <div class="muted">${(d.items || []).map(i => i.qty + ' x ' + esc(i.name)).join(', ')} · <b>${money((d.items || []).reduce((a, i) => a + i.price * i.qty, 0))}</b></div></div>
        <div class="row"><button class="btn sm" data-copydraft="${esc(draftUrl(d.id))}" data-dname="${esc(d.customerName || '')}">Sao chép</button><button class="btn sm r" data-deldraft="${esc(d.id)}">Xóa</button></div></div>`).join('')}</div>` : (drafts === null ? '<div class="muted" style="margin-bottom:10px">Đang tải link đã tạo…</div>' : '');
    return linkCard + `<div class="card"><h3>📝 Tạo đơn hộ khách</h3><p class="muted" style="margin:4px 0 4px">Dành cho khách không quen dùng web: bạn chọn món, tạo link rồi gửi cho khách. Khách chỉ cần chia sẻ vị trí và bấm Gửi đơn.</p>
      ${closed ? '<p style="color:var(--red);font-weight:600;margin-top:6px">Quán đang đóng cửa nên khách chưa gửi đơn được. Hãy bật mở cửa ở tab Cửa hàng.</p>' : ''}
      ${list.length > 8 ? `<input type="text" id="c-q" value="${esc(cq)}" placeholder="🔍 Tìm món theo tên (${list.length} món)…" autocomplete="off">` : ''}
      <div class="chips" id="c-cats">${catChips()}</div>
      <div class="row sb csum"><span>Đã chọn <b id="c-cnt">${selCount()}</b> món · tạm tính <span class="muted">(chưa gồm ship)</span></span><b class="total" id="c-sub">${money(draftSub())}</b></div>
      <div id="c-rows" class="clist">${rows}</div></div>
      <div class="card"><h3>Thông tin khách</h3><p class="muted" style="margin:4px 0 0">Shipper cần tên và số điện thoại để liên hệ giao hàng.</p>
      <div class="grid"><label class="f">Tên khách *<input type="text" id="c-name" maxlength="80" value="${esc(draft.name)}" placeholder="VD: Chị Lan"></label><label class="f">Số điện thoại *<input type="tel" id="c-phone" maxlength="15" inputmode="tel" value="${esc(draft.phone)}" placeholder="09xxxxxxxx"></label></div>
      <label class="f">Địa chỉ nhận hàng (không bắt buộc, khách có thể bổ sung)<input type="text" id="c-addr" maxlength="200" value="${esc(draft.addr)}" placeholder="Số nhà, thôn/xóm…"></label>
      <label class="f">Ghi chú cho quán / shipper<input type="text" id="c-note" maxlength="200" value="${esc(draft.note)}" placeholder="Ít cay, gọi trước khi tới… (không bắt buộc)"></label>
      <button class="btn" style="margin-top:14px" data-makedraft ${draftBusy ? 'disabled' : ''}>🔗 Tạo link gửi khách</button></div>` + pend;
  }
  function menuTab() {
    return `<div class="card" data-msector="${esc(shop.sector || 'food')}"><h3>Thực đơn</h3><p class="muted">Sửa tên, giá, tắt món hết hàng rồi bấm Lưu.${shop.sector === 'fashion' ? ' Điền thêm Size / Màu / Chất liệu để khách bấm “Xem chi tiết”. Ảnh bạn tải lên sẽ được AI chỉnh đẹp rồi tự đăng lên web.' : ''}</p>${menuEditorHtml(shop.menu)}<button class="btn" style="margin-top:14px" data-savemenu>Lưu thực đơn</button></div>`;
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
    root.innerHTML = `<div class="tabs"><button class="${tab === 'orders' ? 'on' : ''}" data-t="orders">Đơn hàng${pend ? `<span class="n">${pend}</span>` : ''}</button><button class="${tab === 'create' ? 'on' : ''}" data-t="create">📝 Tạo đơn hộ</button><button class="${tab === 'revenue' ? 'on' : ''}" data-t="revenue">📊 Doanh thu</button><button class="${tab === 'menu' ? 'on' : ''}" data-t="menu">Thực đơn</button><button class="${tab === 'shop' ? 'on' : ''}" data-t="shop">Cửa hàng</button></div>
      <main>${err ? `<div class="card" style="color:var(--red)">${esc(err)}</div>` : ''}${!shop ? '<div class="empty">Đang tải cửa hàng…</div>' : tab === 'orders' ? ordersTab() : tab === 'create' ? createTab() : tab === 'menu' ? menuTab() : tab === 'revenue' ? revenueTab() : shopTab()}</main>`;
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
  root.addEventListener('input', e => { if (e.target.id === 'c-q') { cq = e.target.value; refreshList(); return; } const k = { 'c-name':'name', 'c-phone':'phone', 'c-addr':'addr', 'c-note':'note' }[e.target.id]; if (k) draft[k] = e.target.value; });
  async function makeDraft() {
    if (draftBusy) return;
    const lines = draftLines(), name = draft.name.trim(), phone = draft.phone.replace(/[\s.\-]/g, '');
    if (!lines.length) return toast('Hãy chọn ít nhất 1 món');
    if (!name) return toast('Vui lòng nhập tên khách');
    if (!/^(0|\+?84)\d{8,10}$/.test(phone)) return toast('Số điện thoại khách chưa đúng');
    draftBusy = true;
    try {
      const id = await fb.createDraft({ shopId:me.shopId, shopName:shop.name || '', items:lines, customerName:name, customerPhone:phone, address:draft.addr.trim(), note:draft.note.trim() });
      lastLink = draftUrl(id);
      drafts = [{ id, shopId:me.shopId, items:lines, customerName:name, customerPhone:phone, createdAtMs:Date.now() }, ...(drafts || [])];
      draft = { q:{}, name:'', phone:'', addr:'', note:'' };
      toast('Đã tạo link, hãy gửi cho khách');
    } catch (er) { toast(fb.errMsg(er)); }
    draftBusy = false; draw();
    window.scrollTo({ top:0, behavior:'smooth' });
  }
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; draw(); if (tab === 'create' && drafts === null) loadDrafts(); return; }
    const qp = e.target.closest('[data-qp]'), qm = e.target.closest('[data-qm]');
    if (qp || qm) { const i = +(qp || qm).dataset[qp ? 'qp' : 'qm']; draft.q[i] = Math.max(0, Math.min(99, (draft.q[i] || 0) + (qp ? 1 : -1))); const n = $(`[data-qn="${i}"]`, root); if (n) n.textContent = draft.q[i]; const sb = $('#c-sub', root); if (sb) sb.textContent = money(draftSub()); refreshChips(); return; }
    const cfb = e.target.closest('[data-cf]'); if (cfb) { cf = cfb.dataset.cf; refreshList(); return; }
    const cd = e.target.closest('[data-copydraft]'); if (cd) { if (await copyText(draftMsg(cd.dataset.copydraft, cd.dataset.dname ?? draft.name))) toast('Đã sao chép tin nhắn, dán gửi cho khách'); return; }
    const sd = e.target.closest('[data-sharedraft]'); if (sd) { try { await navigator.share({ text:draftMsg(sd.dataset.sharedraft, draft.name) }); } catch (er) { /* khách hủy chia sẻ */ } return; }
    const dd = e.target.closest('[data-deldraft]'); if (dd) { if (!confirm('Xóa link này? Khách sẽ không mở được nữa.')) return; try { await fb.deleteDraft(dd.dataset.deldraft); drafts = (drafts || []).filter(x => x.id !== dd.dataset.deldraft); draw(); toast('Đã xóa link'); } catch (er) { toast(fb.errMsg(er)); } return; }
    if (e.target.closest('[data-makedraft]')) { await makeDraft(); return; }
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
