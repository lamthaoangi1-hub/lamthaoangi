import { report, periodControl, metrics, note, dailyView, walletCredit } from './revenue.js?v=20261112a';
import { hoursFormHtml, readHours, isOpenNow, hoursText } from './hours.js?v=20261023a';
import { shopLink, copyText } from './shoplink.js?v=20261103a';
import { fb, track, $, $$, esc, money, fmtTime, toDate, sameDay, badge, payBadge, payText, newestFirst, toast, beep, menuEditorHtml, bindMenuEditor, readMenu, getPos, mapLink, imgUpHtml, bindImgUpload } from './panel.js?v=20261112a';

export const panel = { key:'seller', title:'Nhà bán hàng', roles:['seller', 'admin'], render(root, me) {
  if (!me.shopId) { root.innerHTML = `<main><div class="card"><h3>Chưa gắn cửa hàng</h3><p class="muted">Tài khoản này chưa được gán cửa hàng. Hãy nhờ Admin gán cửa hàng cho bạn (trang Admin → Người dùng).</p></div></main>`; return; }
  let tab = 'orders', shipCalls = [], sc = { phone:'', cod:'', note:'' }, scBusy = false, shop = null, settings = {}, orders = [], err = '', fil = 'active', period = 'month', payouts = [], bank = null, bf = { bin:'', acc:'', holder:'', amt:'', edit:false, busy:false };
  /* ---- Ví nhà bán hàng: phần giảm giá do Admin tài trợ (platformOff) của đơn đã giao xong được cộng vào ví. Quán nhập STK (hệ thống kiểm tra tên chủ TK rồi lưu) và gửi yêu cầu rút cho Admin ---- */
  const BANKS = [['Vietcombank', '970436'], ['VietinBank', '970415'], ['BIDV', '970418'], ['Agribank', '970405'], ['MB Bank', '970422'], ['Techcombank', '970407'], ['ACB', '970416'], ['VPBank', '970432'], ['TPBank', '970423'], ['Sacombank', '970403'], ['VIB', '970441'], ['SHB', '970443'], ['HDBank', '970437'], ['OCB', '970448'], ['MSB', '970426'], ['SeABank', '970440'], ['LPBank', '970449'], ['Eximbank', '970431'], ['Nam A Bank', '970428'], ['Bac A Bank', '970409'], ['PVcomBank', '970412']];
  const PST = { pending:['Chờ Admin chuyển', 'bankwait'], paid:['Đã chuyển khoản', 'bank'], rejected:['Bị từ chối (đã hoàn lại ví)', ''] };
  const myPay = () => payouts.filter(p => p.kind === 'shop');
  const walletInfo = () => { const earned = orders.reduce((a, o) => a + walletCredit(o), 0), used = myPay().filter(p => p.status !== 'rejected').reduce((a, p) => a + Number(p.amount || 0), 0); return { earned, used, bal:Math.max(0, earned - used) }; };
  function walletTab() {
    const w = walletInfo(), pct = Number(shop.sponsorPct) || 0;
    const cr = orders.filter(o => walletCredit(o) > 0).sort(newestFirst).slice(0, 40), ps = [...myPay()].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 20);
    const bankCard = bank
      ? `<div class="card"><h3>Tài khoản nhận tiền</h3><div style="margin:6px 0">🏦 <b>${esc(bank.bankName || '')}</b> · <b>${esc(bank.bankAccount || '')}</b><br>Chủ tài khoản: <b>${esc(bank.bankHolder || '')}</b> <span class="badge ok">🔒 Đã khóa</span></div><p class="muted" style="margin:0">Tài khoản đã lưu và khóa, quán không tự sửa được. Tiền rút sẽ chuyển đúng tài khoản này. Muốn đổi, hãy liên hệ Admin.</p></div>`
      : `<div class="card"><h3>Nhập tài khoản nhận tiền</h3><p class="muted" style="margin:0 0 8px">Chọn ngân hàng, nhập số tài khoản và tên chủ tài khoản. <b>Sau khi lưu sẽ bị khóa, không tự sửa được</b> nên hãy kiểm tra thật kỹ.</p>
        <div class="grid"><label class="f">Ngân hàng<select id="wb-bank" ${bf.busy ? 'disabled' : ''}><option value="">— Chọn ngân hàng —</option>${BANKS.map(([n, b]) => `<option value="${b}" ${bf.bin === b ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="f">Số tài khoản<input type="text" id="wb-acc" inputmode="numeric" maxlength="19" value="${esc(bf.acc)}" ${bf.busy ? 'disabled' : ''}></label>
        <label class="f">Tên chủ tài khoản (không dấu, viết hoa)<input type="text" id="wb-holder" placeholder="NGUYEN VAN A" maxlength="60" value="${esc(bf.holder || '')}" ${bf.busy ? 'disabled' : ''}></label></div>
        <div class="row" style="margin-top:12px;gap:8px"><button class="btn" data-savebank ${bf.busy ? 'disabled' : ''}>${bf.busy ? 'Đang lưu…' : '💾 Lưu tài khoản'}</button></div></div>`;
    return `<div class="section-heading"><h2>Ví nhà bán hàng</h2><p>${pct ? `Admin đang tài trợ <b>${pct}%</b> giá trị món cho khách đặt quán bạn. ` : 'Quán bạn hiện chưa được Admin tài trợ giảm giá. '}Khách được giảm, <b>quán vẫn nhận đủ tiền món</b>; phần giảm do Admin chịu được <b>cộng vào ví</b> khi đơn giao thành công. Bạn rút về tài khoản ngân hàng bằng cách gửi yêu cầu cho Admin.</p></div>
      <div class="stat"><div class="card"><b>${money(w.bal)}</b><span class="muted">Số dư ví (rút được)</span></div><div class="card"><b>${money(w.earned)}</b><span class="muted">Tổng đã cộng vào ví</span></div><div class="card"><b>${money(w.used)}</b><span class="muted">Đã rút / đang chờ</span></div></div>
      ${bankCard}
      <div class="card"><h3>Rút tiền</h3><label class="f">Số tiền muốn rút (đ)<input type="number" id="w-amt" min="10000" step="1000" value="${esc(bf.amt)}" placeholder="Tối thiểu 10.000"></label>
        <button class="btn" style="margin-top:12px" data-withdraw ${!bank || w.bal < 10000 ? 'disabled' : ''}>${!bank ? 'Nhập tài khoản ngân hàng trước' : w.bal < 10000 ? 'Số dư chưa đủ 10.000đ' : 'Gửi yêu cầu rút tiền'}</button></div>
      <div class="card"><h3>Lịch sử rút tiền</h3>${ps.length ? ps.map(p => `<div class="row sb" style="padding:6px 0;border-top:1px solid #eef0f2"><span><b>${money(p.amount)}</b><br><span class="muted">${esc(fmtTime(p.createdAt))} · ${esc(p.bankName || '')} ${esc(p.bankAccount || '')}</span></span><span class="${(PST[p.status] || ['', ''])[1]}">${esc((PST[p.status] || [p.status])[0])}</span></div>`).join('') : '<div class="muted">Chưa có yêu cầu rút nào</div>'}</div>
      <div class="card"><h3>Các đơn được cộng vào ví</h3>${cr.length ? cr.map(o => `<div class="row sb" style="padding:6px 0;border-top:1px solid #eef0f2"><span>#${esc(o.code)} <span class="muted">· ${esc(fmtTime(o.updatedAt || o.createdAt))}${o.platformPct ? ' · ' + o.platformPct + '%' : ''}</span></span><b style="color:var(--g)">+${money(walletCredit(o))}</b></div>`).join('') : '<div class="muted">Chưa có đơn nào được cộng vào ví</div>'}</div>`;
  }

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
      <span class="muted">${showC ? 'Quán xem đơn và giao theo thông tin khách' : 'Quán chỉ xem đơn – shipper nhận và giao'}</span></div>${o.platformOff ? `<div class="muted" style="margin-top:6px">🎁 Lâm Thao Ăn Gì giảm ${o.platformPct ? o.platformPct + '% ' : ''}cho khách: <b>${money(o.platformOff)}</b> – <b>quán vẫn nhận đủ</b>, số này được cộng vào <b>Ví</b> khi đơn giao thành công.</div>` : ''}${o.shopShip ? `<div class="muted" style="margin-top:6px">Quán hỗ trợ phí ship (freeship): <b>-${money(o.shopShip)}</b> · Quán thực nhận: <b>${money(Math.max(0, (o.subtotal || 0) - (o.discount || 0) + (o.platformOff || 0) - o.shopShip))}</b></div>` : ''}</div>`;
  }
  function ordersTab() {
    const act = o => ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].includes(o.status);
    const list = [...orders].sort(newestFirst).filter(o => fil === 'active' ? act(o) : !act(o)).slice(0, 80);
    const today = orders.filter(o => o.status === 'done' && sameDay(o.updatedAt));
    return `<div class="stat"><div class="card"><b>${orders.filter(o => o.status === 'pending').length}</b><span class="muted">Chờ xác nhận</span></div><div class="card"><b>${today.length}</b><span class="muted">Đơn xong hôm nay</span></div><div class="card"><b>${money(today.reduce((a, o) => a + (o.subtotal || 0) - (o.discount || 0) + (o.platformOff || 0), 0))}</b><span class="muted">Doanh thu hôm nay</span></div></div>
      <div class="row" style="margin-bottom:10px"><button class="btn sm ${fil === 'active' ? '' : 'o'}" data-fil="active">Đang xử lý</button><button class="btn sm ${fil === 'past' ? '' : 'o'}" data-fil="past">Đã xong / hủy</button></div>
      ${list.length ? list.map(orderCard).join('') : '<div class="empty">Chưa có đơn</div>'}`;
  }
  function revenueTab() { const r = report(orders, period); return `<div class="section-heading"><h2>Doanh thu cửa hàng</h2><p>Chi tiết hoạt động kinh doanh của ${esc(shop.name)}</p></div>${periodControl(period)}${metrics(r)}${note}${dailyView(r)}`; }
  /* ===== Gọi ship: giao đơn ngoài app. Quán chỉ nhập SĐT khách, Admin xin định vị qua Zalo rồi tạo đơn cho shipper ===== */
  function shipTab() {
    const noGps = shop.lat == null, stt = { new:['Chờ Admin liên hệ khách', 'warn'], ordered:['Đã giao cho shipper', 'ok'], done:['Đã hoàn thành', 'ok'], cancelled:['Đã hủy', ''] };
    const rows = shipCalls.map(c => { const t = stt[c.status] || ['', '']; return `<div class="qrow"><div><b>${esc(c.customerPhone)}</b> <span class="muted">· ${fmtTime(c.createdAtMs)}</span>
      <div class="muted">${c.cod ? 'Thu hộ ' + money(c.cod) + (c.note ? ' · ' : '') : ''}${esc(c.note || '')}</div></div>
      <div class="row"><span class="badge ${t[1]}">${t[0]}</span>${c.status === 'new' ? `<button class="btn sm r" data-cancelship="${esc(c.id)}">Hủy</button>` : ''}</div></div>`; }).join('') || '<div class="muted">Chưa có yêu cầu nào.</div>';
    return `<div class="card" id="sc-form"><h3>🛵 Gọi ship (đơn ngoài app)</h3>
      <p class="muted" style="margin:4px 0 6px">Bạn chỉ cần nhập số điện thoại khách. Admin sẽ liên hệ khách xin định vị rồi gọi shipper tới lấy hàng. Khách đã từng giao thì hệ thống nhớ vị trí, không phải xin lại.</p>
      ${noGps ? '<p style="color:var(--red);font-weight:600">Quán chưa lưu vị trí GPS. Vào tab Cửa hàng → bấm "Chia sẻ vị trí quán" trước khi gọi ship.</p>' : ''}
      <label class="f">Số điện thoại khách *<input type="tel" id="sc-phone" inputmode="tel" maxlength="15" value="${esc(sc.phone)}" placeholder="09xx xxx xxx"></label>
      <details style="margin-top:8px"${sc.cod || sc.note ? ' open' : ''}><summary class="muted" style="cursor:pointer">Thêm tiền thu hộ / ghi chú (không bắt buộc)</summary>
      <div class="grid"><label class="f">Tiền thu hộ khách (đ)<input type="number" id="sc-cod" inputmode="numeric" min="0" value="${esc(sc.cod)}" placeholder="0"></label>
      <label class="f">Ghi chú cho shipper<input type="text" id="sc-note" maxlength="300" value="${esc(sc.note)}" placeholder="VD: 2 phần cơm"></label></div></details>
      <button class="btn" data-sendship ${noGps || scBusy ? 'disabled' : ''} style="margin-top:10px">${scBusy ? 'Đang gửi…' : 'Gửi yêu cầu cho Admin'}</button></div>
      <div class="card"><h3>Yêu cầu gần đây</h3>${rows}</div>`;
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
    root.innerHTML = `<div class="tabs"><button class="${tab === 'orders' ? 'on' : ''}" data-t="orders">Đơn hàng${pend ? `<span class="n">${pend}</span>` : ''}</button><button class="${tab === 'ship' ? 'on' : ''}" data-t="ship">🛵 Gọi ship${shipCalls.filter(c => c.status === 'new').length ? `<span class="n">${shipCalls.filter(c => c.status === 'new').length}</span>` : ''}</button><button class="${tab === 'revenue' ? 'on' : ''}" data-t="revenue">📊 Doanh thu</button><button class="${tab === 'wallet' ? 'on' : ''}" data-t="wallet">👛 Ví</button><button class="${tab === 'menu' ? 'on' : ''}" data-t="menu">Thực đơn</button><button class="${tab === 'shop' ? 'on' : ''}" data-t="shop">Cửa hàng</button></div>
      <main>${err ? `<div class="card" style="color:var(--red)">${esc(err)}</div>` : ''}${!shop ? '<div class="empty">Đang tải cửa hàng…</div>' : tab === 'orders' ? ordersTab() : tab === 'ship' ? shipTab() : tab === 'menu' ? menuTab() : tab === 'revenue' ? revenueTab() : tab === 'wallet' ? walletTab() : shopTab()}</main>`;
  }
  let first = true;
  track(fb.watchShop(me.shopId, (s, e) => { shop = s; if (e) err = fb.errMsg(e); else if (!s) err = 'Không tìm thấy cửa hàng được gán cho bạn.'; if (tab === 'orders' || tab === 'revenue' || first) draw(); }));
  track(fb.watchShopOrders(me.shopId, (l, e) => {
    if (e) err = fb.errMsg(e);
    if (!first && l.filter(o => o.status === 'pending').length > orders.filter(o => o.status === 'pending').length) { beep(); toast('Có đơn mới!'); }
    orders = l; first = false; if (tab === 'orders' || tab === 'revenue' || tab === 'wallet') draw();
  }));
  track(fb.watchSettings(s => { settings = s; if (tab === 'orders') draw(); }));
  track(fb.watchMyPayouts(me.uid, l => { payouts = l; if (tab === 'wallet') draw(); }));
  track(fb.watchMyBank(me.uid, b => { bank = b; if (tab === 'wallet') draw(); }));
  track(true ? fb.watchShopShipCalls(me.shopId, l => { shipCalls = l.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)); if (!document.activeElement?.closest?.('input,textarea,select')) draw(); }) : () => {});
  bindMenuEditor(root); bindImgUpload(root);
  root.addEventListener('input', e => { const m = { 'wb-bank':'bin', 'wb-acc':'acc', 'wb-holder':'holder', 'w-amt':'amt' }[e.target.id]; if (m) bf[m] = e.target.value; });
  root.addEventListener('click', async e => {
    if (e.target.closest('[data-savebank]')) {
      if (bf.busy || bank) return; const acc = String(bf.acc || '').replace(/\s/g, ''), b = BANKS.find(x => x[1] === bf.bin), holder = String(bf.holder || '').trim().replace(/\s+/g, ' ');
      if (!b) return toast('Hãy chọn ngân hàng'); if (!/^\d{6,19}$/.test(acc)) return toast('Số tài khoản chưa đúng (6–19 chữ số)');
      if (holder.length < 3) return toast('Hãy nhập tên chủ tài khoản');
      if (!confirm('Lưu tài khoản và KHÓA, không tự sửa được sau này?\n\n' + b[0] + ' – ' + acc + '\n' + holder.toUpperCase())) return;
      bf.busy = true; draw();
      try { await fb.saveSellerBank(me.uid, me.shopId, b[1], b[0], acc, holder); bf = { ...bf, acc:'', bin:'', holder:'' }; toast('Đã lưu và khóa tài khoản nhận tiền'); }
      catch (er) { toast(fb.errMsg(er)); }
      bf.busy = false; draw(); return;
    }
    const wd = e.target.closest('[data-withdraw]');
    if (wd) {
      const w = walletInfo(), amt = Math.round(Number(bf.amt) || 0);
      if (!bank) return toast('Hãy nhập và lưu tài khoản ngân hàng trước');
      if (amt < 10000) return toast('Số tiền rút tối thiểu 10.000đ');
      if (amt > w.bal) return toast('Số tiền vượt quá số dư ví (' + money(w.bal) + ')');
      if (!confirm('Rút ' + money(amt) + ' về ' + bank.bankName + ' – ' + bank.bankAccount + ' (' + bank.bankHolder + ')?')) return;
      wd.disabled = true;
      try { await fb.requestShopPayout({ shopId:me.shopId, uid:me.uid, name:(shop && shop.name) || me.name || '', phone:me.phone || (shop && shop.phone) || '', amount:amt, bankName:bank.bankName, bankAccount:bank.bankAccount, bankHolder:bank.bankHolder }); bf.amt = ''; toast('Đã gửi yêu cầu rút tiền, chờ Admin chuyển khoản'); }
      catch (er) { toast(fb.errMsg(er)); }
      draw(); return;
    }
  });
  root.addEventListener('input', e => { const k = { 'sc-phone':'phone', 'sc-cod':'cod', 'sc-note':'note' }[e.target.id]; if (k) sc[k] = e.target.value; });
  root.addEventListener('click', async e => {
    if (e.target.closest('[data-sendship]')) {
      if (scBusy) return;
      const phone = sc.phone.replace(/[\s.\-]/g, ''), cod = Math.max(0, Math.min(20000000, Math.round(+sc.cod || 0)));
      if (shop.lat == null || shop.lng == null) return toast('Quán chưa lưu vị trí GPS (tab Cửa hàng)');
      if (!/^(0|\+?84)\d{8,10}$/.test(phone)) return toast('Số điện thoại khách chưa đúng');
      scBusy = true; draw();
      try {
        const d = { shopId:me.shopId, shopName:shop.name || '', shopPhone:shop.phone || '', shopAddress:shop.address || '', shopLat:shop.lat, shopLng:shop.lng, customerPhone:phone, cod, note:sc.note.trim().slice(0, 300) };
        const id = await fb.createShipCall(d); fb.notifyShipCall(id);
        sc = { phone:'', cod:'', note:'' }; toast('Đã gửi cho Admin, Admin sẽ liên hệ khách');
      } catch (er) { toast(fb.errMsg(er)); }
      scBusy = false; draw(); return;
    }
    const cs = e.target.closest('[data-cancelship]');
    if (cs) { if (!confirm('Hủy yêu cầu gọi ship này?')) return; try { await fb.patchShipCall(cs.dataset.cancelship, { status:'cancelled' }); toast('Đã hủy'); } catch (er) { toast(fb.errMsg(er)); } }
  });
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
