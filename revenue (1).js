/* Báo cáo doanh thu: chỉ đơn hoàn thành, không gồm phí giao hàng.
   Dùng updatedAt (thời điểm đơn hoàn thành), theo múi giờ trình duyệt. */
import { money, esc, toDate } from './panel.js?v=20261029d';
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const earned = o => o.status === 'done' && !['delivery','errand'].includes(o.type) ? Math.max(0, Number(o.subtotal || 0) - Number(o.discount || 0) - Number(o.shopShip || 0)) : 0;
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
export const note = `<p class="revenue-note">Chỉ tính đơn đã giao thành công, theo ngày hoàn thành. Doanh thu = tiền món − giảm giá − phí ship quán hỗ trợ (freeship), không cộng phí ship khách trả. Đây là doanh thu bán hàng, chưa trừ chi phí và không phải lợi nhuận.</p>`;
export const dailyView = r => {const m = new Map(); r.rows.forEach(o=>{const d=toDate(o.updatedAt||o.createdAt); if(d){const k=dateKey(d); const v=m.get(k)||{count:0,sum:0};v.count++;v.sum+=earned(o);m.set(k,v)}});return `<div class="card"><h3>Doanh thu theo ngày</h3><div class="table-scroll"><table><thead><tr><th>Ngày</th><th>Đơn</th><th>Doanh thu</th></tr></thead><tbody>${[...m].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,90).map(([k,v])=>`<tr><td>${esc(k.split('-').reverse().join('/'))}</td><td>${v.count}</td><td><b>${money(v.sum)}</b></td></tr>`).join('')||'<tr><td colspan="3">Chưa có đơn hoàn thành trong kỳ</td></tr>'}</tbody></table></div></div>`};
