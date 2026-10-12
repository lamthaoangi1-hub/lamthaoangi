import { fb, start, track, $, $$, esc, money, fmtTime, sameDay, badge, newestFirst, toast, beep, mapLink, dirLink } from './panel.js';

start({ title:'Shipper', roles:['shipper', 'admin'], render(root, me) {
  let tab = 'open', open = [], mine = [], err = '';
  const tel = p => p ? `<a href="tel:${esc(p)}">${esc(p)}</a>` : '';
  const map = a => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a || '')}`;

  function card(o, kind) {
    const items = (o.items || []).map(i => `<li>${i.qty} x ${esc(i.name)}</li>`).join('');
    return `<div class="card"><div class="row sb"><b>#${esc(o.code)}</b>${badge(o.status)}</div>
      <div class="muted">${fmtTime(o.createdAt)}</div>
      <p style="margin-top:8px"><b>Lấy hàng:</b> ${esc(o.shopName)}<br><span class="muted">${esc(o.shopAddress || 'Chưa có địa chỉ quán')} · ${tel(o.shopPhone)}</span>${o.shopLat != null ? `<br><a class="btn sm" style="margin-top:6px" href="${dirLink(o.shopLat, o.shopLng)}" target="_blank" rel="noopener">📍 Chỉ đường tới quán</a>` : (o.shopAddress ? ` <a href="${map(o.shopAddress)}" target="_blank" rel="noopener">Bản đồ</a>` : '')}</p>
      <p style="margin-top:8px"><b>Giao tới:</b> ${esc(o.customerName)} · ${tel(o.customerPhone)}<br><span class="muted">${esc(o.address)}</span>${o.lat != null ? `<br><a class="btn sm" style="margin-top:6px" href="${dirLink(o.lat, o.lng)}" target="_blank" rel="noopener">📍 Chỉ đường tới khách (vị trí khách chia sẻ)</a>` : ` <a href="${map(o.address)}" target="_blank" rel="noopener">Bản đồ</a>`}</p>
      ${o.note ? `<p class="muted" style="margin-top:6px">Ghi chú: ${esc(o.note)}</p>` : ''}
      <ul class="items">${items}</ul>
      <div class="row sb"><span>Thu tiền mặt: <b class="total">${money(o.total)}</b> <span class="muted">(ship ${money(o.shipFee)})</span></span>
      ${kind === 'open' ? `<button class="btn" data-claim="${o.id}">Nhận đơn</button>` : o.status === 'delivering' ? `<button class="btn" data-done="${o.id}">Đã giao xong</button>` : ''}</div></div>`;
  }
  function draw() {
    const active = mine.filter(o => o.status === 'delivering').sort(newestFirst);
    const hist = mine.filter(o => o.status === 'done').sort(newestFirst);
    const today = hist.filter(o => sameDay(o.updatedAt));
    const body = tab === 'open' ? (open.length ? [...open].sort(newestFirst).map(o => card(o, 'open')).join('') : '<div class="empty">Chưa có đơn nào chờ giao</div>')
      : tab === 'mine' ? (active.length ? active.map(o => card(o)).join('') : '<div class="empty">Bạn chưa nhận đơn nào</div>')
      : `<div class="stat"><div class="card"><b>${today.length}</b><span class="muted">Đơn hôm nay</span></div><div class="card"><b>${money(today.reduce((a, o) => a + (o.shipFee || 0), 0))}</b><span class="muted">Phí ship hôm nay</span></div><div class="card"><b>${hist.length}</b><span class="muted">Tổng đơn đã giao</span></div></div>` + (hist.length ? hist.slice(0, 60).map(o => card(o)).join('') : '<div class="empty">Chưa có lịch sử</div>');
    root.innerHTML = `<div class="tabs"><button class="${tab === 'open' ? 'on' : ''}" data-t="open">Đơn chờ nhận${open.length ? `<span class="n">${open.length}</span>` : ''}</button><button class="${tab === 'mine' ? 'on' : ''}" data-t="mine">Đang giao${active.length ? `<span class="n">${active.length}</span>` : ''}</button><button class="${tab === 'hist' ? 'on' : ''}" data-t="hist">Lịch sử</button></div>
      <main>${err ? `<div class="card" style="color:var(--red)">${esc(err)}</div>` : ''}${body}</main>`;
  }
  let first = true;
  track(fb.watchOrdersByStatus('ready', (l, e) => { err = e ? fb.errMsg(e) : ''; if (!first && l.length > open.length) { beep(); toast('Có đơn mới chờ giao!'); } open = l; first = false; draw(); }));
  track(fb.watchShipperOrders(me.uid, (l, e) => { if (e) err = fb.errMsg(e); mine = l; draw(); }));
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; draw(); return; }
    const c = e.target.closest('[data-claim]'), d = e.target.closest('[data-done]');
    try {
      if (c) { c.disabled = true; await fb.patchOrder(c.dataset.claim, { status:'delivering', shipperUid:me.uid, shipperName:me.name || '', shipperPhone:me.phone || '' }); toast('Đã nhận đơn'); tab = 'mine'; draw(); }
      if (d) { if (!confirm('Xác nhận đã giao và thu tiền xong?')) return; d.disabled = true; await fb.patchOrder(d.dataset.done, { status:'done' }); toast('Đã hoàn thành đơn'); }
    } catch (er) { toast(fb.errMsg(er) + ' (đơn có thể đã có shipper khác nhận)'); draw(); }
  });
} });
