import { report, periodControl, metrics, note, dailyView } from './revenue.js?v=20261027a';
import { fb, track, $, $$, esc, money, fmtTime, toDate, badge, payBadge, payText, STATUS, newestFirst, toast, menuEditorHtml, bindMenuEditor, readMenu, mapLink, imgUpHtml, bindImgUpload } from './panel.js?v=20261028a';
import { parseWorkbook, parseShopsText } from './import-sheet.js?v=20261023a';
import { readSheets, downloadShopTemplate } from './bulk.js?v=20261023a';
import { isOpenNow, hoursText, hoursFormHtml, readHours, hoursFields, toMin } from './hours.js?v=20261023a';

const SAMPLE = [
  { name:'Phở Bò Lâm Thao', cat:'Phở • Món Việt', group:['Phở', 'Món Việt'], desc:'Phở bò gia truyền.', img:'pho.jpg', eta:'15 - 25 phút', shipFee:15000, freeShipMin:100000, sale:0, open:true, menu:[{ name:'Phở bò tái nạm', price:55000, available:true }, { name:'Trà đá', price:10000, available:true }] },
  { name:'Cơm Tấm Minh Tâm', cat:'Cơm • Món Việt', group:['Cơm', 'Món Việt'], desc:'Cơm tấm sườn nướng.', img:'comtam.jpg', eta:'20 - 30 phút', shipFee:15000, freeShipMin:100000, sale:0, open:true, menu:[{ name:'Cơm tấm sườn nướng', price:50000, available:true }] },
];

export const panel = { key:'admin', title:'Quản trị', roles:['admin'], render(root, me) {
  let tab = 'orders', shops = [], orders = [], users = [], promos = [], settings = {}, edit = null, ofil = 'all', err = '', imp = null, impBusy = false, ufil = 'seller', mk = null, rp = null, period = 'month', revShop = 'all', paste = null, sel = new Set(), bh = { open:'06:00', close:'21:00' };
  const shopName = id => shops.find(s => s.id === id)?.name || '(đã xóa)';

  const revenueView = () => {
    const filtered = revShop === 'all' ? orders : orders.filter(o => o.shopId === revShop);
    const r = report(filtered, period);
    const rows = shops.map(s => ({ id:s.id, name:s.name, ...report(orders.filter(o => o.shopId === s.id), period) })).filter(x => x.count).sort((a,b) => b.revenue-a.revenue);
    const archived = report(orders.filter(o => o.shopId && !shops.some(s => s.id === o.shopId)), period);
    return `<div class="section-heading"><h2>Báo cáo doanh thu hệ thống</h2><p>Theo dõi từng quán và toàn bộ đơn hàng đã hoàn thành</p></div>${periodControl(period)}
      <div class="card"><label class="f">Xem báo cáo<select id="rev-shop"><option value="all">Toàn bộ cửa hàng</option>${shops.map(s => `<option value="${esc(s.id)}" ${revShop===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label></div>
      ${metrics(r, revShop === 'all' ? 'Tổng doanh thu các quán' : 'Doanh thu cửa hàng')}${note}
      ${revShop === 'all' ? `<div class="card"><h3>Bảng xếp hạng doanh thu theo quán</h3><div class="table-scroll"><table><thead><tr><th>Cửa hàng</th><th>Đơn hoàn thành</th><th>Doanh thu</th><th></th></tr></thead><tbody>${rows.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td>${s.count}</td><td><strong>${money(s.revenue)}</strong></td><td><button class="btn sm o" data-revshop="${esc(s.id)}">Chi tiết</button></td></tr>`).join('')}${archived.count ? `<tr><td>Quán đã xóa / không tồn tại</td><td>${archived.count}</td><td>${money(archived.revenue)}</td><td></td></tr>` : ''}${!rows.length&&!archived.count ? '<tr><td colspan="4">Chưa có doanh thu trong kỳ</td></tr>' : ''}</tbody></table></div></div>` : ''}
      ${dailyView(r)}`;
  };
  const ordersView = () => {
    const l = [...orders].sort(newestFirst).filter(o => ofil === 'all' || o.status === ofil);
    return `<div class="row" style="margin-bottom:10px"><select id="ofil" style="width:auto"><option value="all">Tất cả trạng thái</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${ofil === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select><span class="muted">${l.length} đơn (hiển thị 100 đơn gần nhất)</span></div>
      ${l.length ? l.slice(0, 100).map(o => `<div class="card"><div class="row sb"><b>#${esc(o.code)} · ${esc(o.shopName)}</b><span>${payBadge(o)} ${badge(o.status)}</span></div>
      <div class="muted">${fmtTime(o.createdAt)} · ${esc(o.customerName)} ${esc(o.customerPhone)} · ${esc(o.address)}</div>
      <ul class="items">${(o.items || []).map(i => `<li>${i.qty} x ${esc(i.name)}</li>`).join('')}</ul>
      ${o.payment === 'bank' ? `<div class="payrow">${o.payStatus === 'paid' ? `<button class="btn sm o" data-paid="${o.id}:0">Bỏ xác nhận</button>` : `<button class="btn sm" data-paid="${o.id}:1">Xác nhận đã nhận ${money(o.total)}</button><button class="btn sm o" data-tocash="${o.id}">Đổi sang tiền mặt</button>`}<span class="muted">Nội dung CK: <b>${esc(o.code)}</b>${o.customerPaid && o.payStatus !== 'paid' ? ' · khách báo đã chuyển' : ''}</span></div>` : ''}
      <div class="row sb"><span><b class="total">${money(o.total)}</b> <span class="muted">${o.shipperName ? '· Shipper: ' + esc(o.shipperName) + ' ' + esc(o.shipperPhone || '') : ''}</span></span>
      <select data-ost="${o.id}" style="width:auto">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div></div>`).join('') : '<div class="empty">Chưa có đơn</div>'}`;
  };

  const byOrder = (a, b) => (a.order ?? 9999) - (b.order ?? 9999) || String(a.name || '').localeCompare(String(b.name || ''), 'vi');
  const sellersOf = id => users.filter(u => u.shopId === id && u.role === 'seller').map(u => u.phone).join(', ');
  const importView = () => `<div class="card"><h3>Nhập nhiều quán cùng lúc</h3><p class="muted">Tick những quán muốn đưa vào web. Quán trùng tên với quán đã có được bỏ tick sẵn để tránh trùng.</p>
    <table><tr><th></th><th>Quán</th><th>Món</th><th>Ghi chú</th></tr>${imp.map((x, i) => `<tr><td><input type="checkbox" data-impck="${i}" ${x.on ? 'checked' : ''}></td><td><b>${esc(x.data.name)}</b></td><td>${x.data.menu.length}</td><td class="muted">${esc(x.notes.join('; '))}</td></tr>`).join('')}</table>
    <div class="row" style="margin-top:12px"><button class="btn" data-impgo ${impBusy ? 'disabled' : ''}>${impBusy ? 'Đang nhập…' : `Nhập ${imp.filter(x => x.on).length} quán đã chọn`}</button><button class="btn o" data-impcancel ${impBusy ? 'disabled' : ''}>Hủy</button></div></div>`;
  const stBadge = s => s.open === false ? '<span class="badge bad">Đóng cửa</span>' : isOpenNow(s) ? '<span class="badge ok">Mở cửa</span>' : '<span class="badge warn">Ngoài giờ · đóng</span>';
  const hrsLine = s => s.autoHours && hoursText(s) ? `<br><span class="muted">⏰ ${hoursText(s)}</span>` : '';
  const pasteView = () => `<div class="card"><h3>Dán danh sách quán</h3><p class="muted">Mỗi dòng 1 quán, các cột cách nhau bằng dấu <b>|</b> (hoặc copy từ Excel rồi dán):<br><code>Tên quán | Loại | SĐT | Địa chỉ | Giờ mở | Giờ đóng</code><br>Chỉ <b>Tên quán</b> là bắt buộc. Có đủ giờ mở và giờ đóng thì quán tự đóng cửa ngoài giờ. Món ăn thêm sau ở nút “Sửa” (có dán danh sách món / nhập Excel), hoặc dùng “Nhập quán từ Excel” để nhập quán kèm thực đơn.</p>
    <textarea id="paste-txt" rows="9" placeholder="Phở Bò Lâm Thao | Phở, Món Việt | 0912345678 | Thị trấn Lâm Thao | 06:00 | 21:00&#10;Trà Sữa Chill | Trà sữa | 0987654321">${esc(paste.text)}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn" data-pastego>Xem trước</button><button class="btn o" data-pasteclose>Hủy</button></div></div>`;
  const bulkBar = () => sel.size ? `<div class="card" style="background:#f6faf7"><b>Đã chọn ${sel.size} quán</b> – đặt giờ hoặc mở/đóng cùng lúc
    <div class="grid" style="margin-top:8px"><label class="f">Giờ mở cửa<input type="time" id="bh-open" value="${esc(bh.open)}"></label><label class="f">Giờ đóng cửa<input type="time" id="bh-close" value="${esc(bh.close)}"></label></div>
    <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px"><button class="btn sm" data-bhapply>⏰ Áp dụng giờ &amp; bật tự đóng cửa</button><button class="btn sm o" data-bhoff>Tắt tự đóng cửa</button><button class="btn sm o" data-bhopen>Mở cửa</button><button class="btn sm r" data-bhclose>Đóng cửa</button><button class="btn sm gray" data-bhclear>Bỏ chọn</button></div></div>` : '';
  const shopsView = () => edit ? shopForm() : mk ? mkForm() : paste ? pasteView() : imp ? importView() : `<div class="row sb" style="margin-bottom:10px"><b>${shops.length} cửa hàng</b><span class="row" style="flex-wrap:wrap;gap:6px"><input type="file" id="imp-file" accept=".xlsx,.xls,.csv" hidden><button class="btn sm o" data-pasteshop>📋 Dán danh sách quán</button><button class="btn sm o" data-impfile>⬆ Nhập quán từ Excel</button><button class="btn sm gray" data-tplshop>⬇ File Excel mẫu</button><button class="btn sm o" data-seed>+ Thêm 2 quán mẫu</button><button class="btn sm" data-newshop>+ Thêm cửa hàng</button></span></div>
    ${shops.length ? `<p class="muted" style="margin:0 0 8px">Dùng ▲ ▼ để đổi vị trí quán trên trang chủ. Quán bật <b>⭐ Nổi bật</b> hoặc có <b>Giảm giá</b> sẽ hiện trên banner đầu trang.</p>${bulkBar()}<div class="card" style="overflow-x:auto"><table><tr><th><input type="checkbox" data-selall title="Chọn tất cả" ${sel.size && sel.size === shops.length ? 'checked' : ''}></th><th>Thứ tự</th><th>Quán</th><th>Món</th><th>⭐ Nổi bật</th><th>Bán chạy</th><th>Quán mới</th><th>Giảm %</th><th>Trạng thái</th><th></th></tr>${[...shops].sort(byOrder).map((s, i, arr) => `<tr><td><input type="checkbox" data-sel="${s.id}" ${sel.has(s.id) ? 'checked' : ''}></td><td style="white-space:nowrap"><button class="btn sm o" data-mv="up" data-id="${s.id}" ${i === 0 ? 'disabled' : ''}>▲</button> <button class="btn sm o" data-mv="down" data-id="${s.id}" ${i === arr.length - 1 ? 'disabled' : ''}>▼</button></td><td><b>${esc(s.name)}</b><br><span class="muted">${esc(s.cat || '')}</span><br><span class="muted">${sellersOf(s.id) ? '🔑 TK bán hàng: ' + esc(sellersOf(s.id)) : '⚠ Chưa có tài khoản bán hàng'}</span></td><td>${(s.menu || []).length}</td><td><label class="sw" style="margin:0"><input type="checkbox" data-feat="${s.id}" ${s.featured ? 'checked' : ''}></label></td><td><label class="sw" style="margin:0"><input type="checkbox" data-hot="${s.id}" ${s.hot ? 'checked' : ''}></label><br><span class="muted">${s.sold || 0} đơn</span></td><td><label class="sw" style="margin:0"><input type="checkbox" data-isnew="${s.id}" ${s.isNew ? 'checked' : ''}></label>${(toDate(s.createdAt)?.getTime() || 0) > Date.now() - 30 * 864e5 ? '<br><span class="muted">tự động</span>' : ''}</td><td><input type="number" data-sale="${s.id}" min="0" max="90" value="${s.sale || 0}" style="width:64px"></td><td>${stBadge(s)}${hrsLine(s)}</td><td style="text-align:right"><button class="btn sm" data-mkseller="${s.id}">Cấp TK</button> <button class="btn sm o" data-editshop="${s.id}">Sửa</button> <button class="btn sm r" data-delshop="${s.id}">Xóa</button></td></tr>`).join('')}</table></div>` : '<div class="empty">Chưa có cửa hàng. Bấm “Thêm cửa hàng”.</div>'}`;

  /* Form cấp tài khoản nhà bán hàng: admin tự nhập tài khoản + mật khẩu rồi gửi cho chủ quán */
  const sellerUrl = () => location.origin + location.pathname.replace(/[^/]*$/, '') + 'quanly.html';
  const mkMsg = () => `Tài khoản nhà bán hàng - ${(shops.find(x => x.id === mk.shopId) || {}).name || ''}\nTrang đăng nhập: ${sellerUrl()}\nTài khoản: ${mk.phone}\n${mk.pass ? 'Mật khẩu: ' + mk.pass : '(dùng mật khẩu sẵn có của tài khoản này)'}`;
  function mkForm() {
    const s = shops.find(x => x.id === mk.shopId) || {};
    if (mk.done) return `<div class="card"><h3>✅ Đã cấp tài khoản nhà bán hàng</h3><p class="muted">Gửi thông tin dưới đây cho chủ quán “${esc(s.name)}”:</p>
      <div class="card" style="background:#f6faf7;line-height:1.9"><div>Trang đăng nhập: <b>${esc(sellerUrl())}</b></div><div>Tài khoản (SĐT): <b>${esc(mk.phone)}</b></div><div>Mật khẩu: <b>${mk.pass ? esc(mk.pass) : '(mật khẩu sẵn có của tài khoản)'}</b></div></div>
      <div class="row" style="margin-top:12px"><button class="btn" data-mkcopy>Sao chép tin nhắn</button><button class="btn o" data-mkclose>Xong</button></div></div>`;
    return `<div class="card"><h3>Cấp tài khoản nhà bán hàng</h3><p class="muted">Cho quán: <b>${esc(s.name)}</b>. Nhập tài khoản và mật khẩu, bấm Tạo, rồi gửi cho chủ quán.</p>
      <div class="grid"><label class="f">Tài khoản (số điện thoại đăng nhập) *<input type="tel" id="mk-phone" value="${esc(mk.phone)}" placeholder="09xxxxxxxx" inputmode="numeric" autocomplete="off"></label>
      <label class="f">Mật khẩu (tối thiểu 6 ký tự) *<input type="text" id="mk-pass" value="${esc(mk.pass)}" placeholder="Nhập mật khẩu cho chủ quán" autocomplete="off"></label>
      <label class="f">Zalo ID nhận báo đơn (không bắt buộc)<input type="text" id="mk-zalo" value="${esc(mk.zalo)}" autocomplete="off"></label></div>
      <p class="muted" style="margin-top:8px">Nếu số điện thoại đã có tài khoản, hệ thống chỉ gán quyền chủ quán (không đổi mật khẩu).</p>
      <div class="row" style="margin-top:12px"><button class="btn" data-mkgo ${mk.busy ? 'disabled' : ''}>${mk.busy ? 'Đang tạo…' : 'Tạo tài khoản'}</button><button class="btn sm o" data-mkrand>Tạo mật khẩu ngẫu nhiên</button><button class="btn o" data-mkclose>Hủy</button></div></div>`;
  }
  /* Form đặt lại mật khẩu: Admin nhập (hoặc tạo ngẫu nhiên) mật khẩu mới rồi gửi cho người dùng */
  const rpUrl = () => location.origin + location.pathname.replace(/[^/]*$/, '') + (rp.role === 'customer' ? '' : 'quanly.html');
  const rpMsg = () => `Mật khẩu mới - Lâm Thao Ăn Gì?\nTrang đăng nhập: ${rpUrl()}\nTài khoản (SĐT): ${rp.phone}\nMật khẩu mới: ${rp.pass}`;
  const rpForm = () => `<div class="card"><h3>Đặt lại mật khẩu</h3><p class="muted">Cho: <b>${esc(rp.name || '(chưa có tên)')}</b> · SĐT <b>${esc(rp.phone)}</b>. Mật khẩu cũ sẽ ngừng dùng được ngay sau khi đặt.</p>
    ${rp.done ? `<div class="card" style="background:#f6faf7;line-height:1.9"><div>Tài khoản (SĐT): <b>${esc(rp.phone)}</b></div><div>Mật khẩu mới: <b>${esc(rp.pass)}</b></div></div>
      <p class="muted">Hãy gửi mật khẩu này cho người dùng và nhắc họ không chia sẻ cho ai.</p>
      <div class="row" style="margin-top:12px"><button class="btn" data-rpcopy>Sao chép tin nhắn gửi người dùng</button><button class="btn o" data-rpclose>Xong</button></div>`
    : `<label class="f">Mật khẩu mới (tối thiểu 6 ký tự) *<input type="text" id="rp-pass" value="${esc(rp.pass)}" placeholder="Nhập mật khẩu mới" autocomplete="off"></label>
      <div class="row" style="margin-top:12px"><button class="btn" data-rpgo ${rp.busy ? 'disabled' : ''}>${rp.busy ? 'Đang đặt…' : 'Đặt mật khẩu'}</button><button class="btn sm o" data-rprand ${rp.busy ? 'disabled' : ''}>Tạo mật khẩu ngẫu nhiên</button><button class="btn o" data-rpclose ${rp.busy ? 'disabled' : ''}>Hủy</button></div>`}</div>`;
  const randPass = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
  const readMk = () => { if ($('#mk-phone')) { mk.phone = $('#mk-phone').value.replace(/\D/g, ''); mk.pass = $('#mk-pass').value.trim(); mk.zalo = $('#mk-zalo').value.trim(); } };
  function shopForm() {
    const s = edit, n = (k, d = '') => esc(s[k] ?? d);
    return `<div class="card"><h3>${s.id ? 'Sửa cửa hàng' : 'Thêm cửa hàng'}</h3>
      <div class="grid"><label class="f">Tên quán *<input type="text" id="f-name" value="${n('name')}"></label><label class="f">Loại (VD: Phở • Món Việt)<input type="text" id="f-cat" value="${n('cat')}"></label>
      <label class="f">Nhóm lọc (cách nhau dấu phẩy)<input type="text" id="f-group" value="${esc((s.group || []).join(', '))}" placeholder="Phở, Món Việt"></label><label class="f">SĐT quán<input type="tel" id="f-phone" value="${n('phone')}"></label>
      <label class="f">Địa chỉ<input type="text" id="f-address" value="${n('address')}"></label><label class="f">Thời gian giao<input type="text" id="f-eta" value="${n('eta', '15 - 30 phút')}"></label>
      <label class="f">Phí ship cố định (đ) – chỉ dùng khi quán chưa có GPS<input type="number" id="f-ship" min="0" step="1000" value="${s.shipFee ?? 15000}"></label><label class="f">Miễn phí ship cho đơn từ (đ, 0 = không áp dụng)<input type="number" id="f-free" min="0" step="1000" value="${s.freeShipMin ?? 0}"></label></div>
      <div class="f"><span>Chọn nhanh mức freeship cho quán này</span><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${[100000, 150000, 200000, 300000].map(v => `<button type="button" class="btn sm o" data-freeset="${v}">Từ ${v / 1000}K</button>`).join('')}<button type="button" class="btn sm o" data-freeset="0">Tắt freeship</button></div></div>
      <label class="sw"><input type="checkbox" id="f-freeall" ${s.freeShipAll ? 'checked' : ''}>Miễn phí TOÀN BỘ phí giao khi đạt mức trên (bỏ chọn = chỉ miễn phần phí cơ bản, khách vẫn trả km vượt)</label>
      <div class="grid">
      <label class="f">Giảm giá (%)<input type="number" id="f-sale" min="0" max="90" value="${s.sale ?? 0}"></label><label class="f">Điểm đánh giá (0–5, để 0 nếu quán mới)<input type="number" id="f-rate" min="0" max="5" step="0.1" value="${s.rate ?? 0}"></label>
      <label class="f">Số lượt đánh giá (VD: 120+)<input type="text" id="f-rc" value="${n('rc')}"></label></div>
      <label class="f">Ảnh / logo quán</label>${imgUpHtml(s.img || '', 'f-img')}
      <label class="f">Mô tả<textarea id="f-desc">${n('desc')}</textarea></label>
      ${s.id ? `<p class="muted" style="margin-top:10px">Vị trí bản đồ: ${s.lat != null ? `đã lưu · <a href="${mapLink(s.lat, s.lng)}" target="_blank" rel="noopener">xem</a> · <button type="button" class="btn sm r" data-resetloc>Đặt lại vị trí</button>` : 'chưa có (chủ quán tự chia sẻ ở trang Nhà bán hàng)'}</p>` : ''}
      ${hoursFormHtml(s, 'f')}
      <label class="sw"><input type="checkbox" id="f-open" ${s.open === false ? '' : 'checked'}>Đang mở cửa (công tắc tổng – tắt là đóng cả ngày)</label>
      <label class="sw"><input type="checkbox" id="f-feat" ${s.featured ? 'checked' : ''}>⭐ Nổi bật (hiện trên banner trang chủ)</label>
      <h3 style="margin-top:16px">Thực đơn</h3>${menuEditorHtml(s.menu)}
      <div class="row" style="margin-top:16px"><button class="btn" data-saveshop>Lưu</button><button class="btn gray" data-cancel>Hủy</button></div></div>`;
  }

  const ROLES = [['seller', 'Nhà bán hàng'], ['shipper', 'Shipper'], ['customer', 'Khách hàng'], ['admin', 'Admin']];
  const flat = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const roleSel = u => `<select data-urole="${u.uid}" style="width:auto">${ROLES.map(([r, l]) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  /* Giờ khách đăng ký tài khoản (tài khoản cũ chưa có ghi nhận thì hiện —) */
  const regAt = u => { const d = toDate(u.createdAt); return d ? d.toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' }) : ''; };
  const byNewest = (a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0);
  const userTable = (role, list) => {
    list = [...list].sort(byNewest);
    const isS = role === 'seller', hasZ = isS || role === 'shipper', cols = 5 + (isS ? 1 : 0) + (hasZ ? 1 : 0);
    const zalo = u => `<td><input type="text" data-uzalo="${u.uid}" value="${esc(u.zaloId || '')}" placeholder="Zalo ID (nhận báo đơn)" style="min-width:150px"></td>`;
    return `<div class="card" style="overflow:auto"><table><tr><th>Tên</th><th>SĐT</th><th>Đăng ký lúc</th>${isS ? '<th>Cửa hàng</th>' : ''}${hasZ ? '<th>Zalo ID</th>' : ''}<th>Vai trò</th><th>Mật khẩu</th></tr>${list.length ? list.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.phone)}</td><td style="white-space:nowrap">${regAt(u) ? esc(regAt(u)) : '<span class="muted">—</span>'}</td>${isS ? `<td><select data-ushop="${u.uid}" style="width:auto"><option value="">— chọn quán —</option>${shops.map(s => `<option value="${s.id}" ${u.shopId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>${!u.shopId ? '<br><span class="badge warn">Chưa gán quán</span>' : (shops.some(s => s.id === u.shopId) ? '' : '<br><span class="badge warn">Quán đã gán không còn tồn tại – hãy chọn lại</span>')}</td>` : ''}${hasZ ? zalo(u) : ''}<td>${roleSel(u)}</td><td><button class="btn sm o" data-rp="${u.uid}">Đặt lại MK</button></td></tr>`).join('') : `<tr><td colspan="${cols}" class="muted">Chưa có ai trong nhóm này</td></tr>`}</table></div>`;
  };
  /* Rà soát dữ liệu: số "Nhà bán hàng (n)" là số TÀI KHOẢN, không phải số quán. Thẻ này chỉ ra quán nào chưa có chủ, tài khoản nào gán sai quán, quán nào trùng tên */
  const auditCard = () => {
    if (!users.length || !shops.length) return '';
    const sellers = users.filter(u => u.role === 'seller');
    const noOwner = shops.filter(s => !sellers.some(u => u.shopId === s.id));
    const orphan = sellers.filter(u => !u.shopId || !shops.some(s => s.id === u.shopId));
    const names = {}; shops.forEach(s => { const k = flat(String(s.name || '').trim()); (names[k] = names[k] || []).push(s); });
    const dups = Object.values(names).filter(a => a.length > 1);
    const li = a => a.map(x => `<li>${x}</li>`).join('');
    const bad = noOwner.length || orphan.length || dups.length;
    return `<div class="card" style="${bad ? 'background:#fff8ec' : 'background:#f6faf7'}"><h3 style="margin-bottom:6px">Rà soát tài khoản – cửa hàng</h3>
      <p class="muted" style="margin:0 0 6px">Có <b>${shops.length}</b> cửa hàng và <b>${sellers.length}</b> tài khoản nhà bán hàng (số trên nút là số tài khoản).</p>
      ${bad ? '' : '<p style="margin:0">✅ Quán nào cũng có chủ quán, không có tài khoản gán sai.</p>'}
      ${noOwner.length ? `<p style="margin:6px 0 2px"><b>⚠ ${noOwner.length} quán chưa có tài khoản chủ quán</b> (vào tab Cửa hàng → “Cấp TK”):</p><ul style="margin:0 0 4px 18px">${li(noOwner.map(s => esc(s.name)))}</ul>` : ''}
      ${orphan.length ? `<p style="margin:6px 0 2px"><b>⚠ ${orphan.length} tài khoản nhà bán hàng chưa gán quán hoặc gán vào quán không còn tồn tại</b> (chọn lại quán ở bảng dưới):</p><ul style="margin:0 0 4px 18px">${li(orphan.map(u => esc(u.name || '') + ' · ' + esc(u.phone || '')))}</ul>` : ''}
      ${dups.length ? `<p style="margin:6px 0 2px"><b>⚠ Quán trùng tên</b> (có thể là quán nhập hai lần – nên xóa bản thừa):</p><ul style="margin:0 0 4px 18px">${li(dups.map(a => esc(a[0].name) + ' ×' + a.length))}</ul>` : ''}</div>`;
  };
  const usersView = () => {
    if (rp) return rpForm();
    const q = flat($('#uq')?.value.trim());
    const match = u => !q || flat(u.phone).includes(q) || flat(u.name).includes(q);
    const cnt = r => users.filter(u => u.role === r).length;
    const pills = [['all', 'Tất cả', users.length], ...ROLES.map(([r, l]) => [r, l, cnt(r)])];
    const groups = ufil === 'all' ? ROLES : ROLES.filter(([r]) => r === ufil);
    return auditCard() + `<div class="card"><div class="row"><input type="search" id="uq" placeholder="Tìm theo tên hoặc số điện thoại" style="max-width:280px;margin:0"><button class="btn sm" data-ureload>Tải lại danh sách</button></div>
    <p class="muted" style="margin-top:8px">Khách tự đăng ký trên website (vai trò “Khách hàng”). Đổi vai trò tại đây; <b>Nhà bán hàng</b> cần gán cửa hàng, hoặc dùng nút “Cấp TK” ở tab Cửa hàng. Người dùng quên mật khẩu: bấm <b>Đặt lại MK</b> ở cuối dòng.</p></div>
    <div class="tabs" style="position:static;border:0;padding:0;background:none;margin:2px 0 10px">${pills.map(([k, l, n]) => `<button class="${ufil === k ? 'on' : ''}" data-ufil="${k}">${l} (${n})</button>`).join('')}</div>
    ${groups.map(([r, l]) => `${ufil === 'all' ? `<h3 style="margin:14px 0 6px">${l} (${cnt(r)})</h3>` : ''}${userTable(r, users.filter(u => u.role === r && match(u)))}`).join('')}`;
  };

  const promosView = () => `<div class="card"><h3>Thêm mã giảm giá</h3><div class="grid"><label class="f">Mã<input type="text" id="p-code" placeholder="GIAM30K"></label><label class="f">Mô tả<input type="text" id="p-desc" placeholder="Giảm 30K cho đơn từ 100K"></label>
    <label class="f">Giảm (đ)<input type="number" id="p-off" min="0" step="1000"></label><label class="f">Đơn tối thiểu (đ)<input type="number" id="p-min" min="0" step="1000"></label></div><button class="btn" style="margin-top:12px" data-addpromo>Thêm</button>
    <p class="muted" style="margin-top:8px">Mã hiển thị cho khách ở mục “Mã giảm giá” và tab Thông báo. Khách nhập mã khi đặt đơn.</p></div>
    ${promos.map(p => `<div class="card row sb"><span><b>${esc(p.code)}</b> · ${esc(p.desc)}<br><span class="muted">Giảm ${money(p.off)} · đơn từ ${money(p.min)}</span></span><span class="row"><label class="sw" style="margin:0"><input type="checkbox" data-pact="${p.id}" ${p.active === false ? '' : 'checked'}>Bật</label><button class="btn sm r" data-delpromo="${p.id}">Xóa</button></span></div>`).join('') || '<div class="empty">Chưa có mã</div>'}`;

  const shipCfgView = () => `<div class="card" style="margin-top:12px"><h3>Phí giao hàng theo khoảng cách</h3><p class="muted">Khách thấy phí này trước khi bấm đặt đơn. Khoảng cách = đường chim bay từ quán đến khách × hệ số đường đi, làm tròn 0,1 km; km lẻ tính tròn lên.</p>
    <div class="grid"><label class="f">Phí cơ bản (đ)<input type="number" id="sh-base" min="0" step="1000" value="${settings.shipBase ?? 15000}"></label><label class="f">Số km đầu tính phí cơ bản<input type="number" id="sh-basekm" min="0" step="0.5" value="${settings.shipBaseKm ?? 3.5}"></label>
    <label class="f">Mỗi km tiếp theo (đ)<input type="number" id="sh-perkm" min="0" step="500" value="${settings.shipPerKm ?? 3000}"></label><label class="f">Hệ số đường đi (1,3 = đường thực dài hơn đường chim bay 30%)<input type="number" id="sh-road" min="1" max="2" step="0.05" value="${settings.shipRoad ?? 1.3}"></label></div>
    <h3 style="margin:16px 0 4px">Giao hàng &amp; Mua hộ</h3><p class="muted">Cộng thêm vào phí theo quãng đường ở trên.</p><div class="grid"><label class="f">Phụ phí hàng 5–10 kg (đ)<input type="number" id="sh-w2" min="0" step="1000" value="${settings.shipW2 ?? 5000}"></label><label class="f">Phụ phí hàng trên 10 kg (đ)<input type="number" id="sh-w3" min="0" step="1000" value="${settings.shipW3 ?? 15000}"></label><label class="f">Phí mua hộ (đ)<input type="number" id="sh-errand" min="0" step="1000" value="${settings.errandFee ?? 10000}"></label></div>
    <button class="btn" style="margin-top:12px" data-saveship>Lưu phí giao hàng</button></div>`;
  const custView = () => `<div class="card"><h3>Thông tin khách cho quán</h3><label class="sw" style="margin:8px 0"><input type="checkbox" id="c-shopcust" data-shopcust ${settings.shopSeeCustomer !== false ? 'checked' : ''}>Cho quán xem tên, SĐT, địa chỉ khách (bản đồ)</label><p class="muted">Bật: quán thấy thông tin khách trên trang quản lý và trong tin Zalo báo đơn, để tự giao hàng khi chưa có shipper. Tắt: quán chỉ thấy món và tiền, không thấy thông tin khách (khi đã có shipper). Có hiệu lực ngay, Admin vẫn luôn thấy đầy đủ.</p></div>`;
  const contactView = () => `<div class="card"><h3>Thông tin liên hệ hiển thị trên website</h3><div class="grid"><label class="f">Hotline<input type="tel" id="c-hot" value="${esc(settings.hotline || '')}"></label><label class="f">Email<input type="text" id="c-mail" value="${esc(settings.email || '')}"></label><label class="f">Zalo nhận tin khách (số điện thoại hoặc link zalo.me)<input type="text" id="c-zalo" placeholder="VD: 0912345678" value="${esc(settings.zalo || '')}"></label></div><button class="btn" style="margin-top:12px" data-savesettings>Lưu</button></div>`;
  /* Mã BIN ngân hàng theo danh mục VietQR (NAPAS). Chọn ngân hàng thì mã BIN tự điền; ngân hàng khác thì gõ tay mã BIN vào ô bên cạnh. */
  const BANKS = [['Vietcombank', '970436'], ['VietinBank', '970415'], ['BIDV', '970418'], ['Agribank', '970405'], ['MB Bank', '970422'], ['Techcombank', '970407'], ['ACB', '970416'], ['VPBank', '970432'], ['TPBank', '970423'], ['Sacombank', '970403'], ['VIB', '970441'], ['SHB', '970443'], ['HDBank', '970437'], ['OCB', '970448'], ['MSB', '970426'], ['SeABank', '970440'], ['LPBank', '970449'], ['Eximbank', '970431'], ['Nam A Bank', '970428'], ['Bac A Bank', '970409'], ['PVcomBank', '970412']];
  const bankView = () => {
    const bin = String(settings.bankBin || ''), acc = String(settings.bankAccount || '');
    const known = BANKS.find(b => b[1] === bin);
    const prev = bin && acc ? `https://img.vietqr.io/image/${encodeURIComponent(bin)}-${encodeURIComponent(acc)}-compact2.png?amount=10000&addInfo=${encodeURIComponent('TEST')}&accountName=${encodeURIComponent(settings.bankHolder || '')}` : '';
    return `<div class="card" style="margin-top:12px"><h3>Nhận tiền chuyển khoản</h3><p class="muted">Bật thì khách thấy thêm lựa chọn “Chuyển khoản” khi đặt đơn và nhận mã QR (nội dung chuyển khoản = mã đơn). Khi tiền về tài khoản, vào tab <b>Đơn hàng</b> bấm <b>Xác nhận đã nhận tiền</b> cho đơn đó.</p>
      <label class="sw" style="margin:8px 0"><input type="checkbox" id="bk-on" ${settings.bankEnabled === true ? 'checked' : ''}>Cho phép khách thanh toán chuyển khoản</label>
      <div class="grid"><label class="f">Ngân hàng<select id="bk-bank"><option value="">— Chọn ngân hàng —</option>${BANKS.map(([n, b]) => `<option value="${b}" ${known && known[1] === b ? 'selected' : ''}>${n}</option>`).join('')}<option value="other" ${bin && !known ? 'selected' : ''}>Khác (tự nhập mã BIN)</option></select></label>
      <label class="f">Mã BIN ngân hàng (6 số)<input type="text" id="bk-bin" inputmode="numeric" maxlength="6" value="${esc(bin)}"></label>
      <label class="f">Số tài khoản<input type="text" id="bk-acc" inputmode="numeric" value="${esc(acc)}"></label>
      <label class="f">Tên chủ tài khoản (không dấu, viết hoa)<input type="text" id="bk-holder" placeholder="NGUYEN VAN A" value="${esc(settings.bankHolder || '')}"></label></div>
      <button class="btn" style="margin-top:12px" data-savebank>Lưu thông tin ngân hàng</button>
      ${prev ? `<p class="muted" style="margin-top:12px">Mã QR thử (10.000đ). Hãy quét thử bằng app ngân hàng để chắc chắn đúng tài khoản trước khi bật:</p><img src="${prev}" alt="QR thử" style="width:100%;max-width:260px;border-radius:12px;border:1px solid var(--line)" onerror="this.outerHTML='<p class=muted>Không tạo được mã QR. Kiểm tra lại mã BIN và số tài khoản.</p>'">` : ''}</div>`;
  };
  const settingsView = () => custView() + contactView() + bankView() + shipCfgView();

  function draw() {
    const keep = $('#uq')?.value;
    if (sel.size) sel = new Set([...sel].filter(id => shops.some(s => s.id === id)));
    const pend = orders.filter(o => o.status === 'pending').length;
    const T = [['revenue', '📊 Doanh thu'], ['orders', `Đơn hàng${pend ? `<span class="n">${pend}</span>` : ''}`], ['shops', 'Cửa hàng'], ['users', 'Người dùng'], ['promos', 'Khuyến mãi'], ['settings', 'Liên hệ']];
    root.innerHTML = `<div class="tabs">${T.map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div><main>${err ? `<div class="card" style="color:var(--red)">${esc(err)}</div>` : ''}${{ revenue:revenueView, orders:ordersView, shops:shopsView, users:usersView, promos:promosView, settings:settingsView }[tab]()}</main>`;
    if (keep && $('#uq')) $('#uq').value = keep;
  }
  /* Ghi danh sách Zalo ID (chủ quán theo từng quán + shipper) để Apps Script biết gửi báo đơn cho ai */
  const syncNotify = async () => {
    const shopsMap = {}, shippers = [];
    users.forEach(u => {
      const ids = String(u.zaloId || '').split(',').map(x => x.trim()).filter(Boolean);
      if (u.role === 'seller' && u.shopId) shopsMap[u.shopId] = [...(shopsMap[u.shopId] || []), ...ids];
      if (u.role === 'shipper') shippers.push(...ids);
    });
    await fb.saveNotify({ shops:shopsMap, shippers });
  };
  const loadUsers = async () => { try { users = await fb.listUsers(); } catch (e) { err = fb.errMsg(e); } draw(); };

  track(fb.watchShops((l, e) => { shops = l.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi')); if (e) err = fb.errMsg(e); if (orders.length) syncSold(); if (!edit || !$('#f-name')) draw(); }));
  track(fb.watchAllOrders((l, e) => { orders = l; syncSold(); if (e) err = fb.errMsg(e); if (tab === 'orders' || tab === 'revenue') draw(); }));
  track(fb.watchPromos(l => { promos = l; if (tab === 'promos') draw(); }));
  track(fb.watchSettings(s => { settings = s; if (tab === 'settings') draw(); }));
  /* Đếm số đơn đã giao của từng quán và lưu vào quán (trường sold) để khách thấy mục “Bán chạy”. Chạy khi Admin mở trang quản lý. */
  let soldT; const syncSold = () => { clearTimeout(soldT); soldT = setTimeout(() => {
    if (!shops.length) return; const cnt = {};
    orders.forEach(o => { if (o.status === 'done' && !o.type && o.shopId) cnt[o.shopId] = (cnt[o.shopId] || 0) + 1; });
    shops.forEach(s => { const n = cnt[s.id] || 0; if ((s.sold || 0) !== n) fb.patchShop(s.id, { sold:n }).catch(() => {}); });
  }, 4000); };
  track(() => clearTimeout(soldT));
  loadUsers(); bindMenuEditor(root); bindImgUpload(root);
  /* Quán tự đóng/mở theo giờ: làm mới nhãn trạng thái mỗi phút khi đang xem danh sách cửa hàng */
  const clock = setInterval(() => { if (tab === 'shops' && !edit && !mk && !imp && !paste && !document.activeElement?.closest?.('input,textarea,select')) draw(); }, 60000);
  track(() => clearInterval(clock));

  root.addEventListener('input', e => { if (e.target.id === 'uq') draw(), $('#uq').focus(); if (e.target.id === 'paste-txt' && paste) paste.text = e.target.value; });
  root.addEventListener('change', async e => {
    const t = e.target;
    try {
      if (t.id === 'ofil') { ofil = t.value; draw(); }
      if (t.dataset.feat) { await fb.patchShop(t.dataset.feat, { featured:t.checked }); toast(t.checked ? 'Đã bật Nổi bật' : 'Đã tắt Nổi bật'); }
      if (t.dataset.hot) { await fb.patchShop(t.dataset.hot, { hot:t.checked }); toast(t.checked ? 'Đã ghim vào mục Bán chạy' : 'Đã bỏ ghim Bán chạy'); }
      if (t.dataset.isnew) { await fb.patchShop(t.dataset.isnew, { isNew:t.checked }); toast(t.checked ? 'Đã đánh dấu Quán mới' : 'Đã bỏ đánh dấu Quán mới'); }
      if (t.dataset.sale !== undefined) { await fb.patchShop(t.dataset.sale, { sale:Math.min(90, Math.max(0, +t.value || 0)) }); toast('Đã cập nhật giảm giá'); }
      if (t.dataset.impck !== undefined) { imp[+t.dataset.impck].on = t.checked; draw(); }
      if (t.id === 'bh-open') bh.open = t.value;
      if (t.id === 'bh-close') bh.close = t.value;
      if (t.dataset.sel !== undefined) { t.checked ? sel.add(t.dataset.sel) : sel.delete(t.dataset.sel); draw(); }
      if (t.dataset.selall !== undefined) { sel = t.checked ? new Set(shops.map(x => x.id)) : new Set(); draw(); }
      if (t.id === 'imp-file' && t.files[0]) {
        toast('Đang đọc file…');
        const sheets = await readSheets(t.files[0]);
        imp = parseWorkbook(sheets, shops.map(s => s.name)).shops;
        if (!imp.length) { imp = null; toast('Không thấy dữ liệu quán trong file (cần tab “Quán” có cột “Tên quán”). Bấm “File Excel mẫu” để xem mẫu.'); }
        t.value = ''; draw();
      }
      if (t.dataset.shopcust !== undefined) { await fb.saveSettings({ shopSeeCustomer:t.checked }); toast(t.checked ? 'Quán đã được xem thông tin khách' : 'Đã ẩn thông tin khách với quán'); return; }
      if (t.id === 'rev-shop') { revShop = t.value; draw(); return; }
      if (t.id === 'bk-bank') { if (t.value && t.value !== 'other') $('#bk-bin').value = t.value; return; }
      if (t.dataset.ost) await fb.patchOrder(t.dataset.ost, { status:t.value });
      if (t.dataset.urole) { await fb.patchUser(t.dataset.urole, { role:t.value }); users.find(u => u.uid === t.dataset.urole).role = t.value; if (ufil !== 'all') ufil = t.value; await syncNotify(); toast('Đã đổi vai trò' + (t.value === 'seller' ? ' – hãy chọn cửa hàng cho họ' : '')); draw(); }
      if (t.dataset.ushop) { await fb.patchUser(t.dataset.ushop, { shopId:t.value }); users.find(u => u.uid === t.dataset.ushop).shopId = t.value; await syncNotify(); toast('Đã gán cửa hàng'); }
      if (t.dataset.uzalo !== undefined) { const z = t.value.trim(); await fb.patchUser(t.dataset.uzalo, { zaloId:z }); users.find(u => u.uid === t.dataset.uzalo).zaloId = z; await syncNotify(); toast('Đã lưu Zalo ID'); }
      if (t.dataset.pact) { const { id, ...rest } = promos.find(p => p.id === t.dataset.pact); await fb.savePromo(id, { ...rest, active:t.checked }); toast('Đã cập nhật'); }
    } catch (er) { toast(fb.errMsg(er)); }
  });
  root.addEventListener('click', async e => {
    const g = s => e.target.closest(s);
    if (g('[data-period]')) { period = g('[data-period]').dataset.period; draw(); return; }
    if (g('[data-revshop]')) { revShop = g('[data-revshop]').dataset.revshop; draw(); return; }
    if (g('[data-t]')) { tab = g('[data-t]').dataset.t; edit = null; mk = null; rp = null; paste = null; draw(); return; }
    try {
      if (g('[data-newshop]')) { edit = { menu:[] }; draw(); }
      else if (g('[data-editshop]')) { edit = JSON.parse(JSON.stringify(shops.find(s => s.id === g('[data-editshop]').dataset.editshop))); draw(); }
      else if (g('[data-resetloc]')) { if (confirm('Đặt lại vị trí quán? Chủ quán sẽ chia sẻ lại được 1 lần.')) { await fb.patchShop(edit.id, { lat:null, lng:null, locAcc:null, locAt:null }); edit.lat = null; edit.lng = null; toast('Đã đặt lại vị trí'); draw(); } }
      else if (g('[data-cancel]')) { edit = null; draw(); }
      else if (g('[data-delshop]')) { const s = shops.find(x => x.id === g('[data-delshop]').dataset.delshop); if (confirm(`Xóa cửa hàng “${s.name}”?`)) { await fb.removeShop(s.id); toast('Đã xóa'); } }
      else if (g('[data-mv]')) {
        const b = g('[data-mv]'), list = [...shops].sort(byOrder), i = list.findIndex(s => s.id === b.dataset.id), j = i + (b.dataset.mv === 'up' ? -1 : 1);
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        await Promise.all(list.map((s, k) => s.order === (k + 1) * 10 ? null : fb.patchShop(s.id, { order:(k + 1) * 10 })));
        toast('Đã đổi thứ tự');
      }
      else if (g('[data-mkseller]')) {
        const s = shops.find(x => x.id === g('[data-mkseller]').dataset.mkseller);
        mk = { shopId:s.id, phone:String(s.phone || '').replace(/\D/g, ''), pass:'', zalo:'', busy:false, done:false }; draw();
      }
      else if (g('[data-mkclose]')) { mk = null; draw(); }
      else if (g('[data-mkrand]')) { readMk(); mk.pass = Array.from(crypto.getRandomValues(new Uint8Array(8)), x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join(''); draw(); }
      else if (g('[data-mkcopy]')) { try { await navigator.clipboard.writeText(mkMsg()); toast('Đã sao chép, hãy dán gửi cho chủ quán'); } catch { prompt('Sao chép nội dung dưới đây:', mkMsg()); } }
      else if (g('[data-mkgo]')) {
        readMk(); const s = shops.find(x => x.id === mk.shopId);
        if (mk.phone.length < 9) return toast('Nhập số điện thoại (tài khoản) hợp lệ');
        const old = users.find(u => u.phone === mk.phone);
        mk.busy = true; draw();
        try {
          if (old) {                                            // SĐT đã có tài khoản → chỉ gán quyền
            if (old.role === 'admin') throw new Error('Số này là tài khoản Admin, không thể đổi thành chủ quán');
            if (!confirm(`SĐT ${mk.phone} đã có tài khoản (${old.name}). Gán làm chủ quán “${s.name}”?`)) { mk.busy = false; return draw(); }
            await fb.patchUser(old.uid, { role:'seller', shopId:s.id, ...(mk.zalo ? { zaloId:mk.zalo } : {}) }); mk.pass = '';
          } else {
            if (mk.pass.length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự');
            await fb.createSellerAccount({ name:s.name, phone:mk.phone, pass:mk.pass, shopId:s.id, zaloId:mk.zalo });
          }
          await loadUsers(); await syncNotify().catch(() => {});
          mk.busy = false; mk.done = true; draw(); toast('Đã cấp tài khoản nhà bán hàng');
        } catch (er) { mk.busy = false; draw(); toast(er.code ? fb.errMsg(er) : er.message); }
      }
      else if (g('[data-rp]')) {
        const u = users.find(x => x.uid === g('[data-rp]').dataset.rp); if (!u) return;
        rp = { uid:u.uid, name:u.name, phone:u.phone, role:u.role, pass:'', busy:false, done:false }; draw();
      }
      else if (g('[data-rpclose]')) { rp = null, period = 'month', revShop = 'all'; draw(); }
      else if (g('[data-rprand]')) { rp.pass = randPass(); draw(); }
      else if (g('[data-rpcopy]')) { try { await navigator.clipboard.writeText(rpMsg()); toast('Đã sao chép, hãy dán gửi cho người dùng'); } catch { prompt('Sao chép nội dung dưới đây:', rpMsg()); } }
      else if (g('[data-rpgo]')) {
        rp.pass = $('#rp-pass').value.trim();
        if (rp.pass.length < 6) return toast('Mật khẩu tối thiểu 6 ký tự');
        if (!confirm(`Đặt mật khẩu mới cho ${rp.name || rp.phone} (${rp.phone})? Mật khẩu cũ sẽ không dùng được nữa.`)) return;
        rp.busy = true; draw();
        try { await fb.resetUserPassword(rp.uid, rp.pass); rp.busy = false; rp.done = true; draw(); toast('Đã đặt lại mật khẩu'); }
        catch (er) { rp.busy = false; draw(); toast(er.code ? fb.errMsg(er) : er.message); }
      }
      else if (g('[data-freeset]')) { $('#f-free').value = g('[data-freeset]').dataset.freeset; toast(+g('[data-freeset]').dataset.freeset ? 'Đã chọn mức freeship, nhớ bấm Lưu' : 'Đã tắt freeship, nhớ bấm Lưu'); }
      else if (g('[data-impfile]')) { $('#imp-file').click(); }
      else if (g('[data-tplshop]')) { await downloadShopTemplate(); }
      else if (g('[data-pasteshop]')) { paste = { text:'' }; draw(); }
      else if (g('[data-pasteclose]')) { paste = null; draw(); }
      else if (g('[data-pastego]')) {
        paste.text = $('#paste-txt').value;
        const r = parseShopsText(paste.text, shops.map(x => x.name));
        if (!r.shops.length) return toast('Chưa có dòng nào hợp lệ. Mỗi dòng bắt đầu bằng tên quán.');
        imp = r.shops; paste = null; draw();
        if (r.bad.length) toast(r.bad[0] + (r.bad.length > 1 ? ` (+${r.bad.length - 1} dòng khác)` : ''));
      }
      else if (g('[data-bhclear]')) { sel = new Set(); draw(); }
      else if (g('[data-bhapply]')) {
        const o = $('#bh-open').value, c = $('#bh-close').value; bh = { open:o, close:c };
        if (toMin(o) == null || toMin(c) == null) return toast('Nhập đủ giờ mở và giờ đóng');
        const f = hoursFields(o, c, true); await Promise.all([...sel].map(id => fb.patchShop(id, f)));
        toast(`Đã đặt giờ ${f.openAt} – ${f.closeAt} và bật tự đóng cửa cho ${sel.size} quán`);
      }
      else if (g('[data-bhoff]')) { await Promise.all([...sel].map(id => fb.patchShop(id, { autoHours:false }))); toast(`Đã tắt tự đóng cửa cho ${sel.size} quán`); }
      else if (g('[data-bhopen]')) { await Promise.all([...sel].map(id => fb.patchShop(id, { open:true }))); toast(`Đã mở cửa ${sel.size} quán`); }
      else if (g('[data-bhclose]')) { if (confirm(`Đóng cửa ${sel.size} quán đã chọn (đóng cả ngày, không nhận đơn)?`)) { await Promise.all([...sel].map(id => fb.patchShop(id, { open:false }))); toast(`Đã đóng cửa ${sel.size} quán`); } }
      else if (g('[data-impcancel]')) { imp = null; draw(); }
      else if (g('[data-impgo]')) {
        const pick = imp.filter(x => x.on); if (!pick.length) return toast('Chưa chọn quán nào');
        impBusy = true; let n = 0; draw();
        try { for (const x of pick) { await fb.createShop(x.data); toast(`Đang nhập ${++n}/${pick.length}…`); } }
        finally { impBusy = false; draw(); }
        imp = null; toast(`Đã nhập ${n} quán`); draw();
      }
      else if (g('[data-seed]')) { for (const s of SAMPLE) await fb.createShop(s); toast('Đã thêm quán mẫu'); }
      else if (g('[data-saveshop]')) {
        const v = id => $('#' + id).value.trim();
        if (!v('f-name')) return toast('Nhập tên quán');
        const hr = readHours('f', root); if (hr.error) return toast(hr.error);
        const d = { name:v('f-name'), cat:v('f-cat'), group:v('f-group').split(',').map(x => x.trim()).filter(Boolean), phone:v('f-phone'), address:v('f-address'), eta:v('f-eta'), shipFee:Math.max(0, +v('f-ship') || 0), freeShipMin:Math.max(0, +v('f-free') || 0), freeShipAll:$('#f-freeall').checked, sale:Math.min(90, Math.max(0, +v('f-sale') || 0)), rate:Math.min(5, Math.max(0, +v('f-rate') || 0)), rc:v('f-rc'), img:v('f-img'), desc:v('f-desc'), open:$('#f-open').checked, featured:$('#f-feat').checked, menu:readMenu(root), ...hr.fields };
        if (edit.id) await fb.patchShop(edit.id, d); else await fb.createShop(d);
        edit = null; toast('Đã lưu cửa hàng'); draw();
      }
      else if (g('[data-ufil]')) { ufil = g('[data-ufil]').dataset.ufil; draw(); }
      else if (g('[data-ureload]')) { await loadUsers(); toast('Đã tải lại'); }
      else if (g('[data-addpromo]')) {
        const v = id => $('#' + id).value.trim(); if (!v('p-code')) return toast('Nhập mã');
        await fb.savePromo(null, { code:v('p-code').toUpperCase(), desc:v('p-desc'), off:+v('p-off') || 0, min:+v('p-min') || 0, active:true }); toast('Đã thêm mã');
      }
      else if (g('[data-delpromo]')) { if (confirm('Xóa mã này?')) await fb.removePromo(g('[data-delpromo]').dataset.delpromo); }
      else if (g('[data-saveship]')) {
        const n = (id, d) => { const v = parseFloat($('#' + id).value); return isNaN(v) ? d : v; };
        const d = { shipBase:Math.max(0, n('sh-base', 15000)), shipBaseKm:Math.max(0, n('sh-basekm', 3.5)), shipPerKm:Math.max(0, n('sh-perkm', 3000)), shipRoad:Math.min(2, Math.max(1, n('sh-road', 1.3))), shipW2:Math.max(0, n('sh-w2', 5000)), shipW3:Math.max(0, n('sh-w3', 15000)), errandFee:Math.max(0, n('sh-errand', 10000)) };
        await fb.saveSettings(d); toast('Đã lưu phí giao hàng');
      }
      else if (g('[data-paid]')) {
        const [id, v] = g('[data-paid]').dataset.paid.split(':'), o = orders.find(x => x.id === id), on = v === '1';
        if (on && !confirm('Xác nhận ĐÃ NHẬN ' + money(o && o.total) + ' của đơn #' + (o && o.code) + '? Hãy kiểm tra tiền đã về tài khoản.')) return;
        await fb.patchOrder(id, on ? { payStatus:'paid', paidAt:fb.ts() } : { payStatus:'unpaid', paidAt:null }); toast(on ? 'Đã xác nhận nhận tiền' : 'Đã bỏ xác nhận');
      }
      else if (g('[data-tocash]')) {
        const o = orders.find(x => x.id === g('[data-tocash]').dataset.tocash);
        if (confirm('Đổi đơn #' + (o && o.code) + ' sang thanh toán TIỀN MẶT khi nhận hàng? (dùng khi khách không chuyển khoản)')) { await fb.patchOrder(o.id, { payment:'cash', payStatus:null }); toast('Đã đổi sang tiền mặt'); }
      }
      else if (g('[data-savebank]')) {
        const v = id => $('#' + id).value.trim(), on = $('#bk-on').checked;
        const bin = v('bk-bin').replace(/\D/g, ''), acc = v('bk-acc').replace(/\s/g, ''), holder = v('bk-holder').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();
        if (on) {
          if (!/^\d{6}$/.test(bin)) return toast('Mã BIN ngân hàng gồm 6 chữ số. Hãy chọn ngân hàng trong danh sách.');
          if (!/^[0-9A-Za-z]{4,25}$/.test(acc)) return toast('Số tài khoản không hợp lệ');
          if (holder.length < 3) return toast('Nhập tên chủ tài khoản');
        }
        const sel = $('#bk-bank'), name = sel.value && sel.value !== 'other' ? sel.options[sel.selectedIndex].text : (settings.bankName && bin === settings.bankBin ? settings.bankName : '');
        await fb.saveSettings({ bankEnabled:on, bankBin:bin, bankAccount:acc, bankHolder:holder, bankName:name }); toast(on ? 'Đã lưu và bật chuyển khoản' : 'Đã lưu (đang tắt chuyển khoản)');
      }
      else if (g('[data-savesettings]')) { await fb.saveSettings({ hotline:$('#c-hot').value.trim(), email:$('#c-mail').value.trim(), zalo:$('#c-zalo').value.trim() }); toast('Đã lưu'); }
    } catch (er) { toast(fb.errMsg(er)); }
  });
} };
