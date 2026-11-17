/* Báo cáo doanh thu: chỉ đơn hoàn thành, không gồm phí giao hàng.
   Dùng updatedAt (thời điểm đơn hoàn thành), theo múi giờ trình duyệt. */
import { money, esc, toDate } from './panel.js?v=20261117a';
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
/* Quán thực nhận = tiền món − giảm giá − phí ship quán hỗ trợ + phần giảm giá do Lâm Thao Ăn Gì chịu (platformOff: khách được giảm nhưng quán vẫn nhận đủ, Admin bù lại) */
export const earned = o => o.status === 'done' && !['delivery','errand'].includes(o.type) ? Math.max(0, Number(o.subtotal || 0) - Number(o.discount || 0) + Number(o.platformOff || 0) - Number(o.shopShip || 0)) : 0;
/* Số tiền Admin phải bù cho quán của 1 đơn (chỉ đơn đã giao thành công) */
export const subsidyOf = o => o.status === 'done' && !['delivery','errand'].includes(o.type) ? Math.max(0, Number(o.platformOff || 0)) : 0;
/* Ví nhà bán hàng: số tiền Admin tài trợ (platformOff) của đơn đã giao được CỘNG VÀO VÍ quán. Chỉ tính đơn tạo từ mốc này trở đi (00:00 12/11/2026 giờ VN) để không tính lại những đơn trước đây đã bù lỗ theo ngày. */
export const SPONSOR_WALLET_FROM = Date.UTC(2026, 10, 11, 17, 0, 0);
export const walletCredit = o => { const v = subsidyOf(o); if (!v) return 0; const d = toDate(o.createdAt || o.updatedAt); return d && d.getTime() >= SPONSOR_WALLET_FROM ? v : 0; };
export const periodStart = (period, now = new Date()) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') d.setDate(d.getDate() - 6);
  if (period === 'month') d.setDate(1);
  if (period === 'all') return new Date(0);
  return d;
};
export function report(orders, period='month') {
  const now = new Date(), start = periodStart(period, now);
  const rows = orders.filter(o => o.status === 'done' && !['delivery','errand'].includes(o.type) && (() => { const d = toDate(o.updatedAt || o.createdAt); return d && d >= start && d <= now; })());
  return { rows, count:rows.length, revenue:rows.reduce((sum,o) => sum + earned(o),0), avg:rows.length ? rows.reduce((sum,o) => sum + earned(o),0)/rows.length : 0 };
}
export const periods = [['today','Hôm nay'],['week','7 ngày'],['month','Tháng này'],['all','Tất cả']];
export const periodControl = current => `<div class="periods" role="group" aria-label="Lọc khoảng thời gian">${periods.map(([key,label])=>`<button type="button" data-period="${key}" class="${current===key?'on':''}">${label}</button>`).join('')}</div>`;
export const metrics = (r, caption='Doanh thu món bán') => `<div class="stat revenue-stats"><div class="card"><span class="metric-icon">💰</span><span class="muted">${esc(caption)}</span><b>${money(r.revenue)}</b></div><div class="card"><span class="metric-icon">✅</span><span class="muted">Đơn hoàn thành</span><b>${r.count.toLocaleString('vi-VN')}</b></div><div class="card"><span class="metric-icon">🧾</span><span class="muted">Trung bình / đơn</span><b>${money(r.avg)}</b></div></div>`;
export const note = `<p class="revenue-note">Chỉ tính đơn đã giao thành công, theo ngày hoàn thành. Doanh thu = tiền món − giảm giá quán − phí ship quán hỗ trợ (freeship) + phần giảm giá do Lâm Thao Ăn Gì chịu (quán vẫn nhận đủ), không cộng phí ship khách trả. Đây là doanh thu bán hàng, chưa trừ chi phí và không phải lợi nhuận.</p>`;
export const dailyView = r => {const m = new Map(); r.rows.forEach(o=>{const d=toDate(o.updatedAt||o.createdAt); if(d){const k=dateKey(d); const v=m.get(k)||{count:0,sum:0};v.count++;v.sum+=earned(o);m.set(k,v)}});return `<div class="card"><h3>Doanh thu theo ngày</h3><div class="table-scroll"><table><thead><tr><th>Ngày</th><th>Đơn</th><th>Doanh thu</th></tr></thead><tbody>${[...m].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,90).map(([k,v])=>`<tr><td>${esc(k.split('-').reverse().join('/'))}</td><td>${v.count}</td><td><b>${money(v.sum)}</b></td></tr>`).join('')||'<tr><td colspan="3">Chưa có đơn hoàn thành trong kỳ</td></tr>'}</tbody></table></div></div>`};

/* ---------- Thống kê Gọi ship (book ship) ----------
   Mỗi yêu cầu (tab GoiShip trong Google Sheet) tính theo ngày quán gửi yêu cầu.
   done     = Admin bấm "Hoàn thành" (không tạo đơn) HOẶC đơn giao shipper tạo từ yêu cầu đã giao xong
   shipping = đã tạo đơn cho shipper nhưng chưa giao xong
   pending  = quán mới gửi, Admin chưa xử lý
   cancelled= quán hủy / Admin bỏ / đơn giao shipper bị hủy
   Phí ship = phí của các đơn giao shipper đã giao xong (yêu cầu bấm Hoàn thành trực tiếp không có đơn nên không có phí). */
export const shipState = c => {
  if (c.status === 'cancelled') return 'cancelled';
  if (c.status === 'done') return 'done';
  if (c.status === 'ordered') return c.orderStatus === 'done' ? 'done' : c.orderStatus === 'cancelled' ? 'cancelled' : 'shipping';
  return 'pending';
};
export function shipReport(calls, period = 'month', shopId = 'all') {
  const now = new Date(), start = periodStart(period, now);
  const rows = (calls || []).filter(c => (shopId === 'all' || c.shopId === shopId)).map(c => ({ ...c, date: c.createdAtMs ? new Date(Number(c.createdAtMs)) : null }))
    .filter(c => c.date && c.date >= start && c.date <= now).map(c => ({ ...c, st: shipState(c) }));
  const n = st => rows.filter(c => c.st === st).length;
  return { rows, total: rows.length, done: n('done'), shipping: n('shipping'), pending: n('pending'), cancelled: n('cancelled'),
    fee: rows.reduce((t, c) => t + (c.st === 'done' && c.orderId ? Number(c.shipFee || 0) : 0), 0) };
}
export const shipMetrics = r => `<div class="stat revenue-stats"><div class="card"><span class="metric-icon">🛵</span><span class="muted">Yêu cầu Gọi ship</span><b>${r.total.toLocaleString('vi-VN')}</b></div><div class="card"><span class="metric-icon">✅</span><span class="muted">Hoàn thành</span><b>${r.done.toLocaleString('vi-VN')}</b></div><div class="card"><span class="metric-icon">⏳</span><span class="muted">Đang xử lý</span><b>${(r.pending + r.shipping).toLocaleString('vi-VN')}</b></div><div class="card"><span class="metric-icon">❌</span><span class="muted">Đã hủy</span><b>${r.cancelled.toLocaleString('vi-VN')}</b></div><div class="card"><span class="metric-icon">💵</span><span class="muted">Phí ship đơn hoàn thành</span><b>${money(r.fee)}</b></div></div>`;
export const shipNote = `<p class="revenue-note">Tính theo ngày quán gửi yêu cầu Gọi ship. <b>Hoàn thành</b> = Admin bấm Hoàn thành hoặc đơn giao shipper đã giao xong; <b>Đang xử lý</b> = chờ Admin xử lý hoặc shipper đang giao. Phí ship chỉ tính các đơn đã giao xong qua shipper (yêu cầu bấm Hoàn thành trực tiếp không có đơn nên không có phí trong hệ thống). Khoản này là phí giao hàng, không cộng vào doanh thu của quán.</p>`;
export const shipDailyView = r => {
  const m = new Map();
  r.rows.forEach(c => { const k = dateKey(c.date), v = m.get(k) || { n:0, done:0, fee:0 }; v.n++; if (c.st === 'done') { v.done++; if (c.orderId) v.fee += Number(c.shipFee || 0); } m.set(k, v); });
  return `<div class="card"><h3>Gọi ship theo ngày</h3><div class="table-scroll"><table><thead><tr><th>Ngày</th><th>Yêu cầu</th><th>Hoàn thành</th><th>Phí ship</th></tr></thead><tbody>${[...m].sort((a,b) => b[0].localeCompare(a[0])).slice(0,90).map(([k,v]) => `<tr><td>${esc(k.split('-').reverse().join('/'))}</td><td>${v.n}</td><td>${v.done}</td><td><b>${money(v.fee)}</b></td></tr>`).join('') || '<tr><td colspan="4">Chưa có yêu cầu Gọi ship trong kỳ</td></tr>'}</tbody></table></div></div>`;
};
