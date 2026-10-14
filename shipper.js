import { fb, track, $, $$, esc, money, fmtTime, sameDay, badge, newestFirst, toast, beep, mapLink, dirLink } from './panel.js?v=20261014e';

export const panel = { key:'shipper', title:'Shipper', roles:['shipper', 'admin'], render(root, me) {
  let tab = 'open', open = [], mine = [], err = '';
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
  function card(o, kind) {
    const items = (o.items || []).map(i => `<b>${i.qty}×</b> ${esc(i.name)}`).join('<span class="sep"></span>');
    const extra = [o.distanceKm != null ? `Quãng đường ${String(o.distanceKm).replace('.', ',')} km` : '', fmtTime(o.createdAt)].filter(Boolean).join(' · ');
    return `<article class="oc">
      <header class="oc-head"><div><span class="oc-code">#${esc(o.code)}</span><div class="oc-time">${extra}</div></div>${badge(o.status)}</header>
      <div class="oc-money"><div class="earn"><small>Phí ship bạn nhận</small><b>${money(o.shipFee)}</b></div><div><small>Thu tiền mặt của khách</small><b>${money(o.total)}</b></div></div>
      <div class="oc-route">
        <div class="oc-stop from"><i class="oc-dot"></i><div>
          <div class="oc-lbl">Lấy hàng tại</div><div class="oc-name">${esc(o.shopName)}</div>
          <div class="oc-addr${o.shopAddress ? '' : ' none'}">${esc(o.shopAddress || 'Quán chưa có địa chỉ')}</div>
          ${kind === 'open' ? `<div style="margin-top:6px">${distHtml(o)}</div>` : ''}
          <div class="oc-acts">${navBtn(o.shopLat, o.shopLng, o.shopAddress, 'Chỉ đường tới quán')}${callBtn(o.shopPhone)}</div></div></div>
        <div class="oc-stop to"><i class="oc-dot"></i><div>
          <div class="oc-lbl">Giao tới</div><div class="oc-name">${esc(o.customerName)}</div>
          <div class="oc-addr">${esc(o.address)}</div>
          ${o.note ? `<div class="oc-note">Ghi chú: ${esc(o.note)}</div>` : ''}
          <div class="oc-acts">${navBtn(o.lat, o.lng, o.address, 'Chỉ đường tới khách')}${callBtn(o.customerPhone)}</div></div></div>
      </div>
      <div class="oc-items">${items}</div>
      ${kind === 'open' ? `<div class="oc-foot"><button class="oc-go" data-claim="${o.id}">Nhận đơn này</button></div>` : o.status === 'delivering' ? `<div class="oc-foot"><button class="oc-go done" data-done="${o.id}">Đã giao xong</button></div>` : ''}
    </article>`;
  }
  function draw() {
    const active = mine.filter(o => o.status === 'delivering').sort(newestFirst);
    const hist = mine.filter(o => o.status === 'done').sort(newestFirst);
    const today = hist.filter(o => sameDay(o.updatedAt));
    const body = tab === 'open' ? (open.length ? [...open].sort(newestFirst).map(o => card(o, 'open')).join('') : '<div class="empty">Chưa có đơn mới</div>')
      : tab === 'mine' ? (active.length ? active.map(o => card(o)).join('') : '<div class="empty">Bạn chưa nhận đơn nào</div>')
      : `<div class="stat"><div class="card"><b>${today.length}</b><span class="muted">Đơn hôm nay</span></div><div class="card"><b>${money(today.reduce((a, o) => a + (o.shipFee || 0), 0))}</b><span class="muted">Phí ship hôm nay</span></div><div class="card"><b>${hist.length}</b><span class="muted">Tổng đơn đã giao</span></div></div>` + (hist.length ? hist.slice(0, 60).map(o => card(o)).join('') : '<div class="empty">Chưa có lịch sử</div>');
    root.innerHTML = `<div class="tabs"><button class="${tab === 'open' ? 'on' : ''}" data-t="open">Đơn chờ nhận${open.length ? `<span class="n">${open.length}</span>` : ''}</button><button class="${tab === 'mine' ? 'on' : ''}" data-t="mine">Đang giao${active.length ? `<span class="n">${active.length}</span>` : ''}</button><button class="${tab === 'hist' ? 'on' : ''}" data-t="hist">Lịch sử</button></div>
      <main>${err ? `<div class="card" style="color:var(--red)">${esc(err)}</div>` : ''}${body}</main>`;
  }
  let first = true;
  track(fb.watchOpenOrders( (l, e) => { err = e ? fb.errMsg(e) : ''; if (!first && l.length > open.length) { refreshPos(); beep(); toast('Có đơn mới chờ giao!'); } open = l; first = false; draw(); }));
  track(fb.watchShipperOrders(me.uid, (l, e) => { if (e) err = fb.errMsg(e); mine = l; draw(); }));
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; draw(); return; }
    const c = e.target.closest('[data-claim]'), d = e.target.closest('[data-done]');
    try {
      if (c) { c.disabled = true; await fb.patchOrder(c.dataset.claim, { status:'delivering', shipperUid:me.uid, shipperName:me.name || '', shipperPhone:me.phone || '' }); toast('Đã nhận đơn'); tab = 'mine'; draw(); }
      if (d) { if (!confirm('Xác nhận đã giao và thu tiền xong?')) return; d.disabled = true; await fb.patchOrder(d.dataset.done, { status:'done' }); toast('Đã hoàn thành đơn'); }
    } catch (er) { toast(fb.errMsg(er) + ' (đơn có thể đã có shipper khác nhận)'); draw(); }
  });
} };
