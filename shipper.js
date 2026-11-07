import { fb, track, $, $$, esc, money, fmtTime, sameDay, badge, payText, newestFirst, toast, beep, mapLink, dirLink } from './panel.js?v=20261107a';

export const panel = { key:'shipper', title:'Shipper', roles:['shipper', 'admin'], render(root, me) {
  let tab = 'open', open = [], mine = [], err = '', pay = [], wf = null;
  try { wf = JSON.parse(localStorage.getItem('lt_shipBank') || 'null'); } catch (e) {}
  wf = { amt:'', bankName:'', bankAccount:'', bankHolder:'', ...(wf || {}) };
  const wallet = () => { const earned = mine.filter(o => o.status === 'done').reduce((a, o) => a + credit(o), 0), used = pay.filter(p => p.status !== 'rejected').reduce((a, p) => a + Number(p.amount || 0), 0); return { earned, used, bal:Math.max(0, earned - used) }; };
  const PST = { pending:['Chờ Admin chuyển', 'bankwait'], paid:['Đã chuyển khoản', 'bank'], rejected:['Bị từ chối (đã hoàn lại ví)', ''] };
  const walletBody = () => {
    const w = wallet(), cr = mine.filter(o => o.status === 'done' && credit(o) > 0).sort(newestFirst).slice(0, 40), ps = [...pay].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 20);
    return `<div class="stat"><div class="card"><b>${money(w.bal)}</b><span class="muted">Số dư ví (rút được)</span></div><div class="card"><b>${money(w.earned)}</b><span class="muted">Tổng đã cộng vào ví</span></div><div class="card"><b>${money(w.used)}</b><span class="muted">Đã rút / đang chờ</span></div></div>
      <div class="card"><h3>Rút tiền về tài khoản ngân hàng</h3><p class="muted" style="margin:0 0 8px">Ví gồm phần phí ship do Lâm Thao Ăn Gì chịu (freeship, voucher ship) của các đơn đã giao xong. Admin sẽ chuyển khoản rồi bấm xác nhận.</p>
        <div class="grid"><label class="f">Số tiền muốn rút (đ)<input type="number" id="w-amt" min="10000" step="1000" value="${esc(wf.amt)}" placeholder="Tối thiểu 10.000"></label><label class="f">Ngân hàng<input type="text" id="w-bank" value="${esc(wf.bankName)}" placeholder="VD: Vietcombank"></label><label class="f">Số tài khoản<input type="text" id="w-acc" inputmode="numeric" value="${esc(wf.bankAccount)}"></label><label class="f">Tên chủ tài khoản<input type="text" id="w-holder" value="${esc(wf.bankHolder)}"></label></div>
        <button class="btn" style="margin-top:12px" data-withdraw ${w.bal < 10000 ? 'disabled' : ''}>${w.bal < 10000 ? 'Số dư chưa đủ 10.000đ' : 'Gửi yêu cầu rút tiền'}</button></div>
      <div class="card"><h3>Lịch sử rút tiền</h3>${ps.length ? ps.map(p => `<div class="row sb" style="padding:6px 0;border-top:1px solid #eef0f2"><span><b>${money(p.amount)}</b><br><span class="muted">${esc(fmtTime(p.createdAt))} · ${esc(p.bankName || '')} ${esc(p.bankAccount || '')}</span></span><span class="${(PST[p.status] || ['', ''])[1]}">${esc((PST[p.status] || [p.status])[0])}</span></div>`).join('') : '<div class="muted">Chưa có yêu cầu rút nào</div>'}</div>
      <div class="card"><h3>Các đơn được cộng vào ví</h3>${cr.length ? cr.map(o => `<div class="row sb" style="padding:6px 0;border-top:1px solid #eef0f2"><span>#${esc(o.code)} <span class="muted">· ${esc(fmtTime(o.updatedAt || o.createdAt))}</span></span><b style="color:var(--g)">+${money(credit(o))}</b></div>`).join('') : '<div class="muted">Chưa có đơn nào được cộng vào ví</div>'}</div>`;
  };
  /* ONLINE / OFFLINE: chỉ shipper đang ONLINE mới được báo đơn mới về Zalo (admin xem được ai đang online) */
  const canToggle = me.role === 'shipper';
  let online = false, presBusy = false, lastBeat = 0;
  /* Vị trí thật của shipper (GPS) → tính khoảng cách đường thẳng tới quán */
  let pos = null, posErr = '';
  const km = (a, b) => {
    const R = 6371, r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const fmtKm = d => d < 1 ? `${Math.round(d * 1000 / 10) * 10} m` : `${d.toFixed(1)} km`;
  const distHtml = o => {
    if (o.shopLat == null || o.shopLng == null) return '<span class="oc-chip off">Quán chưa ghim vị trí</span>';
    if (!pos) return `<span class="oc-chip off">${posErr || 'Đang lấy vị trí của bạn…'}</span>`;
    return `<span class="oc-chip">Cách bạn ${fmtKm(km(pos, { lat:o.shopLat, lng:o.shopLng }))}</span>`;
  };
  const gpsOk = p => { posErr = ''; const np = { lat:p.coords.latitude, lng:p.coords.longitude }; if (!pos || km(pos, np) > 0.03) { pos = np; draw(); } };
  const gpsFail = e => { posErr = e && e.code === 1 ? 'Hãy cho phép truy cập vị trí trên trình duyệt để xem khoảng cách' : 'Chưa lấy được vị trí của bạn'; draw(); };
  const refreshPos = () => navigator.geolocation && navigator.geolocation.getCurrentPosition(gpsOk, gpsFail, { enableHighAccuracy:true, maximumAge:0, timeout:15000 });
  if (navigator.geolocation) {
    const wid = navigator.geolocation.watchPosition(gpsOk, gpsFail, { enableHighAccuracy:true, maximumAge:15000, timeout:20000 });
    track(() => navigator.geolocation.clearWatch(wid));
  } else posErr = 'Thiết bị không hỗ trợ định vị';
  const tel = p => p ? `<a href="tel:${esc(p)}">${esc(p)}</a>` : '';
  const map = a => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a || '')}`;

  const I = {
    phone:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    nav:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 21 3l-8 18-2-8-8-2z"/></svg>',
  };
  const callBtn = p => p ? `<a class="oc-act" href="tel:${esc(p)}">${I.phone}Gọi ${esc(p)}</a>` : '';
  const navBtn = (lat, lng, addr, label) => lat != null ? `<a class="oc-act" href="${dirLink(lat, lng)}" target="_blank" rel="noopener">${I.nav}${label}</a>` : (addr ? `<a class="oc-act" href="${map(addr)}" target="_blank" rel="noopener">${I.nav}Xem bản đồ</a>` : '');
  const svcNote = o => o.type === 'delivery' ? `${esc(o.goods || '')}${o.weight ? ' · ' + esc(o.weight) : ''} · Người ${o.feePayer === 'receiver' ? 'nhận' : 'gửi'} trả phí${o.codAmount ? ` · <b>Thu hộ ${money(o.codAmount)}</b> từ người nhận` : ''}`
    : o.type === 'errand' ? `Mua hộ · Ứng trước tối đa <b>${money(o.advanceMax || 0)}</b> · Thu tiền hàng theo hóa đơn${o.payment === 'bank' ? (o.payStatus === 'paid' ? ' (phí đã chuyển khoản)' : ' (phí chuyển khoản, chờ xác nhận)') : ' + phí'}` : '';
  const shipEarn = o => o.shipFull ?? o.shipFee ?? 0;
  /* Ví tài xế: phần phí ship do Admin chịu (freeship + voucher ship) cộng vào ví khi đơn giao xong; còn lại là tiền mặt shipper giữ từ khách */
  const credit = o => Math.max(0, Number(o.adminShip || 0) + Number(o.shipVoucherOff || 0));
  /* Tiền shipper trả cho quán = tiền món − giảm giá − phần quán hỗ trợ ship = tổng thu của khách − phí ship KHÁCH THỰC TRẢ (đã trừ voucher ship) − phần quán hỗ trợ.
     Không dùng (tổng − shipFull) vì voucher ship do Lâm Thao Ăn Gì chịu làm khách trả ít hơn shipFull nhưng không được trừ vào tiền quán. */
  const shopPay = o => Math.max(0, o.shipFee != null ? (o.total || 0) - (o.shipFee || 0) - (o.shopShip || 0) : (o.total || 0) - shipEarn(o));   // đơn cũ chưa có shipFull: dùng shipFee
  function card(o, kind) {
    const items = (o.items || []).map(i => `<b>${i.qty}×</b> ${esc(i.name)}`).join('<span class="sep"></span>');
    const extra = [o.distanceKm != null ? `Quãng đường ${String(o.distanceKm).replace('.', ',')} km` : '', fmtTime(o.createdAt)].filter(Boolean).join(' · ');
    const bank = o.payment === 'bank', paid = bank && o.payStatus === 'paid';
    return `<article class="oc">
      <header class="oc-head"><div><span class="oc-code">#${esc(o.code)}</span><div class="oc-time">${extra}</div></div>${badge(o.status)}</header>
      <div class="oc-money"><div class="earn"><small>Phí ship bạn nhận${o.nightFee || o.weatherFee ? ' (gồm ' + [o.nightFee ? 'phụ phí đêm ' + money(o.nightFee) : '', o.weatherFee ? 'phụ phí thời tiết ' + money(o.weatherFee) : ''].filter(Boolean).join(' + ') + ')' : ''}${o.shopShip ? ' · quán trả ' + money(o.shopShip) : ''}${credit(o) && !o.type ? ` = ${money(o.shipFee || 0)} tiền mặt bạn giữ + ${money(credit(o))} vào Ví (Admin hỗ trợ phí ship)` : ''}</small><b>${money(shipEarn(o))}</b></div><div class="${bank ? (paid ? 'bank' : 'bankwait') : ''}"><small>${bank ? (paid ? 'Khách ĐÃ chuyển khoản – không thu tiền' : 'Chuyển khoản – chờ xác nhận nhận tiền') : o.type ? 'Phí dịch vụ (tiền mặt)' : 'Thu tiền mặt của khách'}</small><b>${paid ? '0đ' : money(o.total)}</b></div>${!o.type && !bank ? `<div style="grid-column:1/-1"><small>Trả cho quán (đúng giá menu)${o.shopShip ? ' − phí ship quán hỗ trợ' : ''}</small><b>${money(shopPay(o))}</b><div class="muted" style="font-size:12px;margin-top:4px">+ Tiền ship bạn giữ ${money(o.shipFee || 0)} = ${money(o.total || 0)} thu của khách${credit(o) ? `<br>👛 +${money(credit(o))} cộng vào Ví khi giao xong (không thu của khách)` : ''}</div></div>` : ''}</div>
      ${bank && !paid ? '<div class="oc-warn">⚠️ Đơn chuyển khoản CHƯA được xác nhận nhận tiền. Hãy hỏi Admin hoặc khách trước khi giao.</div>' : ''}
      <div class="oc-route">
        <div class="oc-stop from"><i class="oc-dot"></i><div>
          <div class="oc-lbl">${o.type === 'errand' ? 'Mua hàng tại' : 'Lấy hàng tại'}</div><div class="oc-name">${esc(o.shopName)}</div>
          <div class="oc-addr${o.shopAddress ? '' : ' none'}">${esc(o.shopAddress || 'Quán chưa có địa chỉ')}</div>
          ${kind === 'open' ? `<div style="margin-top:6px">${distHtml(o)}</div>` : ''}
          <div class="oc-acts">${navBtn(o.shopLat, o.shopLng, o.shopAddress, 'Chỉ đường tới quán')}${callBtn(o.shopPhone)}</div></div></div>
        <div class="oc-stop to"><i class="oc-dot"></i><div>
          <div class="oc-lbl">Giao tới</div><div class="oc-name">${esc(o.receiverName || o.customerName)}</div>
          <div class="oc-addr">${esc(o.address)}</div>
          ${o.type ? `<div class="oc-note">${svcNote(o)}</div>` : ''}${o.type === 'delivery' ? `<div class="oc-note">Người gửi: ${esc(o.customerName)} ${esc(o.customerPhone)}</div>` : ''}
          ${o.note ? `<div class="oc-note">Ghi chú: ${esc(o.note)}</div>` : ''}
          <div class="oc-acts">${navBtn(o.lat, o.lng, o.address, 'Chỉ đường tới khách')}${callBtn(o.receiverPhone || o.customerPhone)}</div></div></div>
      </div>
      <div class="oc-items">${items}</div>
      ${kind === 'open' ? `<div class="oc-foot"><button class="oc-go" data-claim="${o.id}">Nhận đơn này</button></div>` : o.status === 'delivering' ? `<div class="oc-foot"><button class="oc-go done" data-done="${o.id}">Đã giao xong</button></div>` : ''}
    </article>`;
  }
  const presBar = () => !canToggle ? '' : `<div class="pres ${online ? 'on' : ''}"><div><b>${online ? '🟢 Bạn đang ONLINE' : '⚪ Bạn đang OFFLINE'}</b><small>${online ? 'Có đơn mới sẽ báo về Zalo để bạn đi nhận.' : 'Bật ONLINE để nhận báo đơn mới qua Zalo. Đang tắt thì sẽ không có tin Zalo.'}</small>${me.zaloId ? '' : '<small class="warn">⚠️ Chưa có Zalo ID – nhờ Admin nhập Zalo ID cho bạn thì mới nhận được tin Zalo.</small>'}</div><button class="pres-btn" data-online="${online ? '0' : '1'}" ${presBusy ? 'disabled' : ''}>${online ? 'Tắt online' : 'Bật online'}</button></div>`;
  function draw() {
    const active = mine.filter(o => o.status === 'delivering').sort(newestFirst);
    const hist = mine.filter(o => o.status === 'done').sort(newestFirst);
    const today = hist.filter(o => sameDay(o.updatedAt));
    const body = tab === 'open' ? (open.length ? [...open].sort(newestFirst).map(o => card(o, 'open')).join('') : '<div class="empty">Chưa có đơn mới</div>')
      : tab === 'mine' ? (active.length ? active.map(o => card(o)).join('') : '<div class="empty">Bạn chưa nhận đơn nào</div>')
      : tab === 'wallet' ? walletBody()
      : `<div class="stat"><div class="card"><b>${today.length}</b><span class="muted">Đơn hôm nay</span></div><div class="card"><b>${money(today.reduce((a, o) => a + shipEarn(o), 0))}</b><span class="muted">Phí ship hôm nay</span></div><div class="card"><b>${hist.length}</b><span class="muted">Tổng đơn đã giao</span></div></div>` + (hist.length ? hist.slice(0, 60).map(o => card(o)).join('') : '<div class="empty">Chưa có lịch sử</div>');
    root.innerHTML = `<div class="tabs"><button class="${tab === 'open' ? 'on' : ''}" data-t="open">Đơn chờ nhận${open.length ? `<span class="n">${open.length}</span>` : ''}</button><button class="${tab === 'mine' ? 'on' : ''}" data-t="mine">Đang giao${active.length ? `<span class="n">${active.length}</span>` : ''}</button><button class="${tab === 'hist' ? 'on' : ''}" data-t="hist">Lịch sử</button>${canToggle ? `<button class="${tab === 'wallet' ? 'on' : ''}" data-t="wallet">👛 Ví${wallet().bal ? `<span class="n">${Math.floor(wallet().bal / 1000)}K</span>` : ''}</button>` : ''}</div>
      <main>${presBar()}<div class="section-heading"><h2>${tab === 'open' ? 'Đơn đang chờ shipper' : tab === 'mine' ? 'Đơn giao của tôi' : tab === 'wallet' ? 'Ví tài xế' : 'Thống kê giao hàng'}</h2><p>${tab === 'wallet' ? 'Tiền do Lâm Thao Ăn Gì chịu phí ship, rút về ngân hàng bất cứ lúc nào' : tab === 'hist' ? 'Phí giao hàng và lịch sử hoàn thành' : 'Theo dõi trạng thái đơn hàng nhanh chóng'}</p></div>${err ? `<div class="card" style="color:var(--red)">${esc(err)}</div>` : ''}${body}</main>`;
  }
  /* Heartbeat: khi đang ONLINE và đang mở trang, ghi "lastSeen" mỗi 5 phút để Admin biết còn hoạt động (tiết kiệm lượt ghi Firestore) */
  const beat = force => { if (!online || !canToggle || document.visibilityState !== 'visible') return; if (!force && Date.now() - lastBeat < 120000) return; lastBeat = Date.now(); fb.setPresence(me.uid, { lastSeen:fb.ts() }).catch(() => {}); };
  const hb = setInterval(() => beat(false), 300000), onVis = () => beat(false);
  document.addEventListener('visibilitychange', onVis);
  track(() => { clearInterval(hb); document.removeEventListener('visibilitychange', onVis); });
  if (canToggle) { let firstP = true; track(fb.watchMyPresence(me.uid, p => { online = !!(p && p.online === true); if (firstP && online) beat(true); firstP = false; draw(); })); }
  let first = true;
  track(fb.watchOpenOrders( (l, e) => { err = e ? fb.errMsg(e) : ''; if (!first && l.length > open.length) { refreshPos(); beep(); toast('Có đơn mới chờ giao!'); } open = l; first = false; draw(); }));
  if (canToggle) track(fb.watchMyPayouts(me.uid, l => { pay = l; draw(); }));
  root.addEventListener('input', e => { const m = { 'w-amt':'amt', 'w-bank':'bankName', 'w-acc':'bankAccount', 'w-holder':'bankHolder' }[e.target.id]; if (m) wf[m] = e.target.value; });
  track(fb.watchShipperOrders(me.uid, (l, e) => { if (e) err = fb.errMsg(e); mine = l; draw(); }));
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; draw(); return; }
    const po = e.target.closest('[data-online]');
    if (po) {
      if (presBusy) return; const on = po.dataset.online === '1'; presBusy = true; draw();
      try {
        await fb.setPresence(me.uid, on ? { name:me.name || '', phone:me.phone || '', online:true, since:fb.ts(), lastSeen:fb.ts() } : { online:false, lastSeen:fb.ts() });
        lastBeat = Date.now(); toast(on ? 'Đã bật ONLINE – đơn mới sẽ báo về Zalo' : 'Đã tắt ONLINE – sẽ không báo đơn qua Zalo');
      } catch (er) { toast(fb.errMsg(er)); }
      presBusy = false; draw(); return;
    }
    const wd = e.target.closest('[data-withdraw]');
    if (wd) {
      const w = wallet(), amt = Math.round(Number(wf.amt) || 0), f = k => String(wf[k] || '').trim();
      if (amt < 10000) return toast('Số tiền rút tối thiểu 10.000đ');
      if (amt > w.bal) return toast('Số tiền vượt quá số dư ví (' + money(w.bal) + ')');
      if (!f('bankName') || !f('bankAccount') || !f('bankHolder')) return toast('Nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản');
      if (!confirm('Rút ' + money(amt) + ' về ' + f('bankName') + ' – ' + f('bankAccount') + ' (' + f('bankHolder') + ')?')) return;
      wd.disabled = true;
      try { await fb.requestPayout({ uid:me.uid, name:me.name || '', phone:me.phone || '', amount:amt, bankName:f('bankName'), bankAccount:f('bankAccount'), bankHolder:f('bankHolder') }); try { localStorage.setItem('lt_shipBank', JSON.stringify({ ...wf, amt:'' })); } catch (e2) {} wf.amt = ''; toast('Đã gửi yêu cầu rút tiền, chờ Admin chuyển khoản'); }
      catch (er) { toast(fb.errMsg(er)); }
      draw(); return;
    }
    const c = e.target.closest('[data-claim]'), d = e.target.closest('[data-done]');
    try {
      if (c) { c.disabled = true; await fb.patchOrder(c.dataset.claim, { status:'delivering', shipperUid:me.uid, shipperName:me.name || '', shipperPhone:me.phone || '' }); toast('Đã nhận đơn'); tab = 'mine'; draw(); }
      if (d) { const od = mine.find(x => x.id === d.dataset.done) || {}; if (!confirm(od.payment === 'bank' ? (od.payStatus === 'paid' ? 'Xác nhận đã giao xong? (khách đã chuyển khoản, không thu tiền)' : 'Đơn chuyển khoản CHƯA được xác nhận nhận tiền. Vẫn xác nhận đã giao xong?') : 'Xác nhận đã giao và thu tiền xong?')) return; d.disabled = true; await fb.patchOrder(d.dataset.done, { status:'done' }); toast('Đã hoàn thành đơn'); }
    } catch (er) { toast(fb.errMsg(er) + ' (đơn có thể đã có shipper khác nhận)'); draw(); }
  });
} };
