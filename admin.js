import { report, periodControl, metrics, note, dailyView, walletCredit } from './revenue.js?v=20261112a';
import { shopLink, copyText } from './shoplink.js?v=20261103d';
import { fb, track, $, $$, esc, money, fmtTime, toDate, badge, payBadge, payText, STATUS, newestFirst, toast, menuEditorHtml, bindMenuEditor, readMenu, mapLink, imgUpHtml, bindImgUpload } from './panel.js?v=20261112a';
import { parseWorkbook, parseShopsText } from './import-sheet.js?v=20261023a';
import { readSheets, downloadShopTemplate } from './bulk.js?v=20261023a';
import { isOpenNow, hoursText, hoursFormHtml, readHours, hoursFields, toMin } from './hours.js?v=20261023a';

const SAMPLE = [
  { name:'Phở Bò Lâm Thao', cat:'Phở • Món Việt', group:['Phở', 'Món Việt'], desc:'Phở bò gia truyền.', img:'pho.jpg', eta:'15 - 25 phút', shipFee:15000, freeShipMin:100000, sale:0, open:true, menu:[{ name:'Phở bò tái nạm', price:55000, available:true }, { name:'Trà đá', price:10000, available:true }] },
  { name:'Cơm Tấm Minh Tâm', cat:'Cơm • Món Việt', group:['Cơm', 'Món Việt'], desc:'Cơm tấm sườn nướng.', img:'comtam.jpg', eta:'20 - 30 phút', shipFee:15000, freeShipMin:100000, sale:0, open:true, menu:[{ name:'Cơm tấm sườn nướng', price:50000, available:true }] },
];

export const panel = { key:'admin', title:'Quản trị', roles:['admin'], render(root, me) {
  let tab = 'orders', shops = [], orders = [], live = [], hist = [], histDone = false, histBusy = false, histTotal = null, histErr = '', revRows = null, revBusy = false, revAt = 0, revErr = '', users = [], sync = {}, syncBusy = '', syncMsg = '', promos = [], allPayouts = [], settings = {}, edit = null, ofil = 'all', err = '', imp = null, impBusy = false, ufil = 'seller', mk = null, rp = null, period = 'month', revShop = 'all', paste = null, sel = new Set(), bh = { open:'06:00', close:'21:00' };
  const shopName = id => shops.find(s => s.id === id)?.name || '(đã xóa)';

  /* ===== Shipper ONLINE (presence/{uid}, shipper tự bật/tắt; realtime) ===== */
  let presence = [];
  let shipCalls = [], sf = null, savedLoc = {};   // Gọi ship: yêu cầu của quán (status new) + form tạo đơn đang mở
  const PRES_MAX = 12 * 3600 * 1000;   // bật online mà 12 giờ không hoạt động thì coi như đã offline (khớp với Apps Script)
  const presT = p => toDate(p.lastSeen)?.getTime() ?? Date.now();
  const presOn = p => p.online === true && Date.now() - presT(p) < PRES_MAX;
  const ago = t => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'vừa xong' : m < 60 ? m + ' phút trước' : m < 1440 ? Math.floor(m / 60) + ' giờ trước' : Math.floor(m / 1440) + ' ngày trước'; };
  const onlineView = () => {
    const on = presence.filter(presOn).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    const off = presence.filter(p => !presOn(p)).sort((a, b) => presT(b) - presT(a));
    const zalo = p => { const u = users.find(x => x.uid === (p.uid || p.id)); return u ? (String(u.zaloId || '').trim() ? '<span class="badge ok">Có Zalo ID</span>' : '<span class="badge warn">Chưa có Zalo ID</span>') : ''; };
    const row = (p, isOn) => `<tr><td><strong>${esc(p.name || '(chưa có tên)')}</strong></td><td>${p.phone ? `<a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ''}</td><td>${isOn ? '<span class="badge ok">🟢 Online</span>' : '<span class="badge">⚪ Offline</span>'}</td><td>${isOn && p.since ? fmtTime(p.since) : ''}</td><td>${ago(presT(p))}</td><td>${zalo(p)}</td></tr>`;
    const tbl = (list, isOn, empty) => list.length ? `<div class="table-scroll"><table><thead><tr><th>Shipper</th><th>SĐT</th><th>Trạng thái</th><th>Bật online lúc</th><th>Hoạt động gần nhất</th><th>Zalo</th></tr></thead><tbody>${list.map(p => row(p, isOn)).join('')}</tbody></table></div>` : `<p class="muted" style="margin-top:8px">${empty}</p>`;
    return `<div class="section-heading"><h2>Shipper đang online</h2><p>Chỉ shipper bật ONLINE mới được báo đơn mới qua Zalo</p></div>
      <div class="card"><h3>🟢 Đang online (${on.length})</h3>${tbl(on, true, 'Hiện chưa có shipper nào bật online – đơn mới sẽ KHÔNG báo qua Zalo cho shipper.')}</div>
      <div class="card"><h3>⚪ Đang offline (${off.length})</h3>${tbl(off, false, 'Chưa có shipper nào từng bật online.')}</div>`;
  };

  const revenueView = () => {
    const src = revRows || [];   // đơn hoàn thành lấy từ Google Sheet (không đọc Firestore)
    const filtered = revShop === 'all' ? src : src.filter(o => o.shopId === revShop);
    const r = report(filtered, period);
    const rows = shops.map(s => ({ id:s.id, name:s.name, ...report(src.filter(o => o.shopId === s.id), period) })).filter(x => x.count).sort((a,b) => b.revenue-a.revenue);
    const archived = report(src.filter(o => o.shopId && !shops.some(s => s.id === o.shopId)), period);
    return `<div class="section-heading"><h2>Báo cáo doanh thu hệ thống</h2><p>Theo dõi từng quán và toàn bộ đơn hàng đã hoàn thành</p></div>
      <div class="card row sb" style="gap:8px"><span class="muted">${revBusy ? 'Đang tải dữ liệu từ Google Sheet…' : revErr ? `<span style="color:var(--red)">${esc(revErr)}</span>` : revRows ? `Dữ liệu từ Google Sheet · ${revRows.length.toLocaleString('vi-VN')} đơn hoàn thành` : 'Chưa tải dữ liệu'}</span><button class="btn sm o" data-revreload ${revBusy ? 'disabled' : ''}>Tải lại</button></div>${periodControl(period)}
      <div class="card"><label class="f">Xem báo cáo<select id="rev-shop"><option value="all">Toàn bộ cửa hàng</option>${shops.map(s => `<option value="${esc(s.id)}" ${revShop===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label></div>
      ${metrics(r, revShop === 'all' ? 'Tổng doanh thu các quán' : 'Doanh thu cửa hàng')}${note}
      ${revShop === 'all' ? `<div class="card"><h3>Bảng xếp hạng doanh thu theo quán</h3><div class="table-scroll"><table><thead><tr><th>Cửa hàng</th><th>Đơn hoàn thành</th><th>Doanh thu</th><th></th></tr></thead><tbody>${rows.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td>${s.count}</td><td><strong>${money(s.revenue)}</strong></td><td><button class="btn sm o" data-revshop="${esc(s.id)}">Chi tiết</button></td></tr>`).join('')}${archived.count ? `<tr><td>Quán đã xóa / không tồn tại</td><td>${archived.count}</td><td>${money(archived.revenue)}</td><td></td></tr>` : ''}${!rows.length&&!archived.count ? '<tr><td colspan="4">Chưa có doanh thu trong kỳ</td></tr>' : ''}</tbody></table></div></div>` : ''}
      ${dailyView(r)}`;
  };
  const ordersView = () => {
    const l = [...orders].sort(newestFirst).filter(o => ofil === 'all' || o.status === ofil);
    return `<div class="row" style="margin-bottom:10px"><select id="ofil" style="width:auto"><option value="all">Tất cả trạng thái</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${ofil === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select><span class="muted">${l.length} đơn (hiển thị 100 đơn gần nhất)</span></div>
      ${l.length ? l.map(o => `<div class="card"><div class="row sb"><b>#${esc(o.code)} · ${esc(o.shopName)}</b><span>${payBadge(o)} ${badge(o.status)}</span></div>
      <div class="muted">${fmtTime(o.createdAt)} · ${esc(o.customerName)} ${esc(o.customerPhone)} · ${esc(o.address)}</div>
      <ul class="items">${(o.items || []).map(i => `<li>${i.qty} x ${esc(i.name)}</li>`).join('')}</ul>
      ${o.payment === 'bank' ? `<div class="payrow">${o.payStatus === 'paid' ? `<button class="btn sm o" data-paid="${o.id}:0">Bỏ xác nhận</button>` : `<button class="btn sm" data-paid="${o.id}:1">Xác nhận đã nhận ${money(o.total)}</button><button class="btn sm o" data-tocash="${o.id}">Đổi sang tiền mặt</button>`}<span class="muted">Nội dung CK: <b>${esc(o.code)}</b>${o.customerPaid && o.payStatus !== 'paid' ? ' · khách báo đã chuyển' : ''}</span></div>` : ''}
      <div class="row sb"><span><b class="total">${money(o.total)}</b> <span class="muted">${o.shipperName ? '· Shipper: ' + esc(o.shipperName) + ' ' + esc(o.shipperPhone || '') : ''}</span></span>
      <select data-ost="${o.id}" style="width:auto">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div></div>`).join('') : '<div class="empty">Chưa có đơn</div>'}
      ${syncBox('orders')}<div class="card" style="text-align:center"><p class="muted" style="margin:0 0 8px">Đơn <b>đang xử lý</b> cập nhật tức thì. Đơn đã hoàn thành / hủy lấy từ <b>Google Sheet</b> (không tốn lượt đọc Firestore).${histErr ? `<br><span style="color:var(--red)">${esc(histErr)}</span>` : ''}${histTotal != null ? `<br>Đã tải ${hist.length.toLocaleString('vi-VN')} / ${histTotal.toLocaleString('vi-VN')} đơn trong Sheet.` : ''}</p>
      ${histDone && !histErr ? '' : `<div class="row" style="justify-content:center"><button class="btn sm" data-histmore ${histBusy ? 'disabled' : ''}>${histBusy ? 'Đang tải…' : hist.length ? 'Tải thêm đơn cũ' : 'Tải lịch sử đơn'}</button><button class="btn sm o" data-histall ${histBusy ? 'disabled' : ''}>Tải tất cả</button></div>`}</div>`;
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
    ${shops.length ? `<p class="muted" style="margin:0 0 8px">Dùng ▲ ▼ để đổi vị trí quán trên trang chủ. Quán bật <b>⭐ Nổi bật</b> hoặc có <b>Giảm giá</b> sẽ hiện trên banner đầu trang. Chỉ quán được tick <b>🔥 Quán hot</b> mới hiện ở mục “Quán hot được yêu thích”.</p>${bulkBar()}<div class="card" style="overflow-x:auto"><table><tr><th><input type="checkbox" data-selall title="Chọn tất cả" ${sel.size && sel.size === shops.length ? 'checked' : ''}></th><th>Thứ tự</th><th>Quán</th><th>Món</th><th>⭐ Nổi bật</th><th>Bán chạy</th><th>🔥 Quán hot</th><th>Quán mới</th><th>Giảm %</th><th>Trạng thái</th><th></th></tr>${[...shops].sort(byOrder).map((s, i, arr) => `<tr><td><input type="checkbox" data-sel="${s.id}" ${sel.has(s.id) ? 'checked' : ''}></td><td style="white-space:nowrap"><button class="btn sm o" data-mv="up" data-id="${s.id}" ${i === 0 ? 'disabled' : ''}>▲</button> <button class="btn sm o" data-mv="down" data-id="${s.id}" ${i === arr.length - 1 ? 'disabled' : ''}>▼</button></td><td><b>${esc(s.name)}</b><br><span class="muted">${esc(s.cat || '')}${s.sector && s.sector !== 'food' ? ' · <b>' + ({ fresh:'Thực phẩm sống', fashion:'Thời trang', service:'Dịch vụ khác' }[s.sector] || '') + '</b>' : ''}</span><br><span class="muted">${sellersOf(s.id) ? '🔑 TK bán hàng: ' + esc(sellersOf(s.id)) : '⚠ Chưa có tài khoản bán hàng'}</span></td><td>${(s.menu || []).length}</td><td><label class="sw" style="margin:0"><input type="checkbox" data-feat="${s.id}" ${s.featured ? 'checked' : ''}></label></td><td><label class="sw" style="margin:0"><input type="checkbox" data-hot="${s.id}" ${s.hot ? 'checked' : ''}></label><br><span class="muted">${s.sold || 0} đơn</span></td><td><label class="sw" style="margin:0"><input type="checkbox" data-hothome="${s.id}" ${s.hotHome === true ? 'checked' : ''}></label></td><td><label class="sw" style="margin:0"><input type="checkbox" data-isnew="${s.id}" ${s.isNew ? 'checked' : ''}></label>${(toDate(s.createdAt)?.getTime() || 0) > Date.now() - 30 * 864e5 ? '<br><span class="muted">tự động</span>' : ''}</td><td><input type="number" data-sale="${s.id}" min="0" max="90" value="${s.sale || 0}" style="width:64px"></td><td>${stBadge(s)}${hrsLine(s)}</td><td style="text-align:right"><button class="btn sm o" data-copylink="${s.id}" title="Sao chép link đặt món riêng của quán này">🔗 Link</button> <button class="btn sm" data-mkseller="${s.id}">Cấp TK</button> <button class="btn sm o" data-editshop="${s.id}">Sửa</button> <button class="btn sm r" data-delshop="${s.id}">Xóa</button></td></tr>`).join('')}</table></div>` : '<div class="empty">Chưa có cửa hàng. Bấm “Thêm cửa hàng”.</div>'}`;

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
      <div class="row" style="margin-top:12px"><button class="btn" data-mkgo ${mk.busy ? 'disabled' : ''}>${mk.busy ? 'Đang tạo… ' + (mk.step || 'bắt đầu') : 'Tạo tài khoản'}</button><button class="btn sm o" data-mkrand>Tạo mật khẩu ngẫu nhiên</button><button class="btn o" data-mkclose>Hủy</button></div></div>`;
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
      <div class="grid"><label class="f">Hiển thị ở mục nào trên trang chủ<select id="f-sector">${[['food', 'Đồ ăn'], ['fresh', 'Thực phẩm sống'], ['fashion', 'Thời trang'], ['service', 'Dịch vụ khác']].map(([v, l]) => `<option value="${v}" ${(s.sector || 'food') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="f"><span data-lbl="name">Tên quán *</span><input type="text" id="f-name" value="${n('name')}"></label><label class="f"><span data-lbl="cat">Loại (VD: Phở • Món Việt)</span><input type="text" id="f-cat" value="${n('cat')}"></label>
      <label class="f"><span data-lbl="group">Nhóm lọc (cách nhau dấu phẩy)</span><input type="text" id="f-group" value="${esc((s.group || []).join(', '))}" placeholder="Phở, Món Việt"></label><label class="f"><span data-lbl="phone">SĐT quán</span><input type="tel" id="f-phone" value="${n('phone')}"></label>
      <label class="f">Địa chỉ<input type="text" id="f-address" value="${n('address')}"></label><label class="f" data-hide="service">Thời gian giao<input type="text" id="f-eta" value="${n('eta', '15 - 30 phút')}"></label>
      <label class="f" data-hide="service">Phí ship cố định (đ) – chỉ dùng khi quán chưa có GPS<input type="number" id="f-ship" min="0" step="1000" value="${s.shipFee ?? 15000}"></label><label class="f" data-hide="fashion service">Miễn phí ship cho đơn từ (đ, 0 = không áp dụng)<input type="number" id="f-free" min="0" step="1000" value="${s.freeShipMin ?? 0}"></label></div>
      <div class="f" data-hide="fashion service"><span>Chọn nhanh mức freeship cho quán này</span><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${[100000, 150000, 200000, 300000].map(v => `<button type="button" class="btn sm o" data-freeset="${v}">Từ ${v / 1000}K</button>`).join('')}<button type="button" class="btn sm o" data-freeset="0">Tắt freeship</button></div></div>
      <label class="sw" data-hide="fashion service"><input type="checkbox" id="f-freeall" ${s.freeShipAll ? 'checked' : ''}>Miễn phí TOÀN BỘ phí giao khi đạt mức trên (bỏ chọn = chỉ miễn phần phí cơ bản, khách vẫn trả km vượt)</label>
      <div class="grid">
      <label class="f" data-hide="service">Giảm giá (%)<input type="number" id="f-sale" min="0" max="90" value="${s.sale ?? 0}"></label><label class="f" data-hide="service">🎁 Admin tài trợ giảm giá cho khách (%, 0 = không tài trợ) – khách được giảm, quán vẫn nhận đủ, phần giảm cộng vào ví quán<input type="number" id="f-sponsor" min="0" max="50" step="0.5" value="${Number(s.sponsorPct) || 0}"></label><label class="f">Điểm đánh giá (0–5, để 0 nếu quán mới) – khách đánh giá sau sẽ cộng dồn tiếp trên số này<input type="number" id="f-rate" min="0" max="5" step="0.1" value="${s.rate ?? 0}"></label>
      <label class="f">Số lượt đánh giá (nhập SỐ, VD: 120)<input type="text" id="f-rc" value="${n('rc')}"></label></div>
      <label class="f">Ảnh / logo quán</label>${imgUpHtml(s.img || '', 'f-img')}
      <label class="f">Mô tả<textarea id="f-desc">${n('desc')}</textarea></label>
      ${s.id ? `<p class="muted" style="margin-top:10px">Vị trí bản đồ: ${s.lat != null ? `đã lưu · <a href="${mapLink(s.lat, s.lng)}" target="_blank" rel="noopener">xem</a> · <button type="button" class="btn sm r" data-resetloc>Đặt lại vị trí</button>` : 'chưa có (chủ quán tự chia sẻ ở trang Nhà bán hàng)'}</p>` : ''}
      ${hoursFormHtml(s, 'f')}
      <label class="sw"><input type="checkbox" id="f-open" ${s.open === false ? '' : 'checked'}>Đang mở cửa (công tắc tổng – tắt là đóng cả ngày)</label>
      <label class="sw"><input type="checkbox" id="f-feat" ${s.featured ? 'checked' : ''}><span data-lbl="feat">⭐ Nổi bật (hiện trên banner trang chủ)</span></label>
      <label class="sw"><input type="checkbox" id="f-hothome" ${s.hotHome === true ? 'checked' : ''}><span>🔥 Quán hot (hiện ở mục "Quán hot được yêu thích" trên trang chủ)</span></label>
      <h3 style="margin-top:16px" data-lbl="menu">Thực đơn</h3>${menuEditorHtml(s.menu)}
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
  /* ---- Zalo: danh sách người đã nhắn tin cho bot → gắn Zalo ID cho nhà bán hàng / shipper ngay trên web ---- */
  let zl = { list:null, busy:false, err:'', pick:{} };
  const splitZ = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
  const zaloCard = () => {
    if (!['all', 'seller', 'shipper'].includes(ufil)) return '';
    const staff = users.filter(u => u.role === 'seller' || u.role === 'shipper');
    const label = u => `${u.role === 'seller' ? '🏪' : '🛵'} ${esc(u.name || u.phone || '?')}${u.role === 'seller' && u.shopId ? ' – ' + esc(shops.find(x => x.id === u.shopId)?.name || '') : ''}${u.phone ? ' · ' + esc(u.phone) : ''}`;
    const owners = id => staff.filter(u => splitZ(u.zaloId).includes(id));
    const rows = (zl.list || []).map(c => {
      const own = owners(c.id), pk = zl.pick[c.id] || '';
      return `<tr><td><b>${esc(c.name || '(không tên)')}</b></td><td style="white-space:nowrap"><code>${esc(c.id)}</code></td><td class="muted">${esc(c.text || '')}${c.at ? `<br><small>${esc(fmtTime(c.at))}</small>` : ''}</td>
        <td>${own.length ? own.map(u => `<span class="badge ok" style="margin:0 4px 4px 0">${label(u)} <a href="#" data-zunlink="${u.uid}|${esc(c.id)}" title="Gỡ Zalo ID này khỏi tài khoản" style="margin-left:4px;color:inherit">✕</a></span>`).join('') : '<span class="badge warn">Chưa gắn</span>'}</td>
        <td><select data-zpick="${esc(c.id)}" style="width:auto;max-width:230px"><option value="">— chọn người nhận báo đơn —</option>${staff.map(u => `<option value="${u.uid}" ${pk === u.uid ? 'selected' : ''}>${label(u)}</option>`).join('')}</select></td>
        <td><button class="btn sm" data-zassign="${esc(c.id)}" ${pk ? '' : 'disabled'}>Gắn</button></td></tr>`;
    }).join('');
    return `<div class="card"><h3>💬 Zalo – gắn ID nhận báo đơn</h3>
      <p class="muted" style="margin:4px 0 8px">Nhờ chủ quán / shipper mở Zalo, <b>nhắn 1 tin bất kỳ</b> (VD: “xin chào”) cho bot của Lâm Thao Ăn Gì, rồi bấm <b>Làm mới danh sách</b>. Chọn người tương ứng ở cột “Gắn cho” và bấm <b>Gắn</b> – không cần vào Apps Script chạy lệnh nữa. Shipper chỉ nhận báo đơn khi đang bật Online.</p>
      <div class="row"><button class="btn sm" data-zload ${zl.busy ? 'disabled' : ''}>${zl.busy ? 'Đang lấy tin nhắn từ Zalo…' : 'Làm mới danh sách'}</button>${zl.list ? `<span class="muted">${zl.list.length} người đã nhắn bot</span>` : ''}</div>
      ${zl.err ? `<p style="color:var(--red);margin:8px 0 0">${esc(zl.err)}</p>` : ''}
      ${zl.list ? (zl.list.length ? `<div class="table-scroll" style="margin-top:8px"><table><thead><tr><th>Tên Zalo</th><th>Zalo ID</th><th>Tin nhắn gần nhất</th><th>Đang gắn cho</th><th>Gắn cho</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted" style="margin:8px 0 0">Chưa có ai nhắn tin cho bot. Hãy nhờ họ nhắn 1 tin rồi bấm Làm mới lại.</p>') : ''}
    </div>`;
  };
  const usersView = () => {
    if (rp) return rpForm();
    const q = flat($('#uq')?.value.trim());
    const match = u => !q || flat(u.phone).includes(q) || flat(u.name).includes(q);
    const cnt = r => users.filter(u => u.role === r).length;
    const pills = [['all', 'Tất cả', utotal != null ? users.length - cnt('customer') + utotal : users.length], ...ROLES.map(([r, l]) => [r, l, r === 'customer' && utotal != null ? utotal : cnt(r)])];
    const groups = ufil === 'all' ? ROLES : ROLES.filter(([r]) => r === ufil);
    return auditCard() + zaloCard() + syncBox('users') + `<div class="card"><div class="row"><input type="search" id="uq" placeholder="Tìm theo tên hoặc số điện thoại" style="max-width:280px;margin:0"><button class="btn sm" data-ureload>Tải lại danh sách</button></div>
    <p class="muted" style="margin-top:8px">Khách tự đăng ký trên website (vai trò “Khách hàng”). Đổi vai trò tại đây; <b>Nhà bán hàng</b> cần gán cửa hàng, hoặc dùng nút “Cấp TK” ở tab Cửa hàng. Người dùng quên mật khẩu: bấm <b>Đặt lại MK</b> ở cuối dòng.</p></div>
    <div class="tabs" style="position:static;border:0;padding:0;background:none;margin:2px 0 10px">${pills.map(([k, l, n]) => `<button class="${ufil === k ? 'on' : ''}" data-ufil="${k}">${l} (${n})</button>`).join('')}</div>
    ${groups.map(([r, l]) => `${ufil === 'all' ? `<h3 style="margin:14px 0 6px">${l} (${r === 'customer' && utotal != null ? utotal : cnt(r)})</h3>` : ''}${userTable(r, users.filter(u => u.role === r && match(u)))}`).join('')}
    ${(ufil === 'all' || ufil === 'customer') ? `<div class="card" style="text-align:center"><p class="muted" style="margin:0 0 8px">Đã tải <b>${cnt('customer')}</b>${utotal != null ? ' / <b>' + utotal + '</b>' : ''} khách hàng${udone ? ' (đã đủ)' : ''}.${q && !udone ? ' Chưa thấy người cần tìm? Bấm tải thêm rồi tìm lại.' : ''}</p>
      ${udone ? '' : `<div class="row" style="justify-content:center"><button class="btn sm" data-umore ${umore ? 'disabled' : ''}>${umore ? 'Đang tải…' : 'Tải thêm 300 khách'}</button><button class="btn sm o" data-uall ${umore ? 'disabled' : ''}>Tải tất cả</button></div>`}</div>` : ''}`;
  };

  const promosView = () => `<div class="card"><h3>Thêm mã giảm giá</h3><div class="grid"><label class="f">Mã<input type="text" id="p-code" placeholder="GIAM30K"></label><label class="f">Mô tả<input type="text" id="p-desc" placeholder="Giảm 30K cho đơn từ 100K"></label>
    <label class="f">Loại voucher<select id="p-type"><option value="discount">Giảm giá đơn hàng (trừ vào tiền món)</option><option value="ship">Vận chuyển (trừ vào phí ship)</option></select></label>
    <label class="f">Kiểu giảm<select id="p-mode"><option value="amt">Giảm số tiền (đ)</option><option value="pct">Giảm theo %</option></select></label>
    <label class="f">Giảm (đ) – nếu giảm số tiền<input type="number" id="p-off" min="0" step="1000"></label><label class="f">Giảm (%) – nếu giảm theo %<input type="number" id="p-pct" min="1" max="100" step="1" placeholder="VD: 10"></label><label class="f">Giảm tối đa (đ) – cho kiểu %, 0 = không giới hạn<input type="number" id="p-max" min="0" step="1000" placeholder="VD: 20000"></label><label class="f">Đơn tối thiểu (đ)<input type="number" id="p-min" min="0" step="1000"></label>
    <label class="sw f" style="margin:0;align-self:end"><input type="checkbox" id="p-full">Voucher vận chuyển: miễn phí ship toàn bộ</label></div><button class="btn" style="margin-top:12px" data-addpromo>Thêm</button>
    <p class="muted" style="margin-top:8px">Khách không cần nhập mã: voucher hiện thành danh sách để CHỌN ở bước Xác nhận đơn hàng (mỗi lần dùng được 1 voucher giảm giá + 1 voucher vận chuyển). Voucher vận chuyển do Lâm Thao Ăn Gì chịu: shipper vẫn nhận đủ phí ship, quán không bị trừ; tổng phần phí ship này nằm trong ví tài xế (tab Ví tài xế).</p></div>
    ${promos.map(p => `<div class="card row sb"><span>${p.type === 'ship' ? '🚚' : '🎟️'} <b>${esc(p.code)}</b> · ${esc(p.desc)}<br><span class="muted">${p.type === 'ship' ? 'Vận chuyển: ' : 'Giảm giá: '}${p.type === 'ship' && p.full ? 'miễn phí ship' : p.mode === 'pct' ? 'giảm ' + (+p.pct || 0) + '%' + (+p.max > 0 ? ' (tối đa ' + money(p.max) + ')' : '') : 'giảm ' + money(p.off)}${p.type === 'ship' && !p.full ? ' phí ship' : ''} · đơn từ ${money(p.min)}</span></span><span class="row"><label class="sw" style="margin:0"><input type="checkbox" data-pact="${p.id}" ${p.active === false ? '' : 'checked'}>Bật</label><button class="btn sm r" data-delpromo="${p.id}">Xóa</button></span></div>`).join('') || '<div class="empty">Chưa có mã</div>'}`;

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

  /* Ví tài xế: số dư = tổng phần ship Admin chịu (adminShip + voucher ship) của đơn đã giao (Google Sheet) − tiền đã rút/đang chờ rút */
  const walletView = () => {
    const payouts = allPayouts.filter(p => p.kind !== 'shop'), cr = o => Number(o.adminShip || 0) + Number(o.shipVoucherOff || 0), by = new Map();
    (revRows || []).forEach(o => { const c = cr(o); if (!(c > 0) || !o.shipperUid) return; const r = by.get(o.shipperUid) || { uid:o.shipperUid, name:'', earned:0, n:0 }; r.earned += c; r.n++; if (o.shipperName) r.name = o.shipperName; by.set(o.shipperUid, r); });
    payouts.forEach(p => { if (!by.has(p.uid)) by.set(p.uid, { uid:p.uid, name:p.name || '', earned:0, n:0 }); });
    const sum = (uid, st) => payouts.filter(p => p.uid === uid && p.status === st).reduce((a, p) => a + Number(p.amount || 0), 0);
    const rows = [...by.values()].map(r => { const paid = sum(r.uid, 'paid'), pend = sum(r.uid, 'pending'); return { ...r, paid, pend, bal:r.earned - paid - pend }; }).sort((a, b) => b.bal - a.bal);
    const earnedOf = uid => (by.get(uid) || { earned:0 }).earned, paidOf = uid => sum(uid, 'paid');
    const ts = p => (p.createdAt && p.createdAt.seconds) || 0;
    const pend = payouts.filter(p => p.status === 'pending').sort((a, b) => ts(a) - ts(b)), done = payouts.filter(p => p.status !== 'pending').sort((a, b) => ts(b) - ts(a)).slice(0, 30);
    const totalBal = rows.reduce((a, r) => a + Math.max(0, r.bal), 0);
    return `<div class="section-heading"><h2>Ví tài xế</h2><p>Phần phí ship do Lâm Thao Ăn Gì chịu (freeship quán, voucher ship) được cộng vào ví tài xế khi đơn giao xong. Tài xế gửi yêu cầu rút, bạn chuyển khoản rồi bấm xác nhận. Số liệu lấy từ Google Sheet (đơn vừa giao có thể chậm ~1 phút).</p></div>
      <div class="card row sb" style="gap:8px"><span class="muted">${revBusy ? 'Đang tải dữ liệu từ Google Sheet…' : revErr ? `<span style="color:var(--red)">${esc(revErr)}</span>` : revRows ? 'Đã tải dữ liệu đơn đã giao' : 'Chưa tải dữ liệu'}</span><button class="btn sm o" data-revreload>Tải lại</button></div>
      <div class="stat revenue-stats"><div class="card"><span class="metric-icon">👛</span><span class="muted">Tổng số dư các ví</span><b>${money(totalBal)}</b></div><div class="card"><span class="metric-icon">⏳</span><span class="muted">Yêu cầu chờ chuyển</span><b>${money(pend.reduce((a, p) => a + Number(p.amount || 0), 0))}</b></div></div>
      <div class="card"><h3>Yêu cầu rút tiền đang chờ</h3>${pend.length ? pend.map(p => { const over = Number(p.amount) > earnedOf(p.uid) - paidOf(p.uid); return `<div class="card" style="margin:8px 0 0;${over ? 'background:#fff7ed' : ''}"><div class="row sb"><span><b>${esc(p.name || p.uid)}</b> · ${esc(p.phone || '')}<br><span class="muted">${esc(fmtTime(p.createdAt))}</span></span><b style="font-size:18px">${money(p.amount)}</b></div><div style="margin:6px 0">🏦 ${esc(p.bankName || '')} · <b>${esc(p.bankAccount || '')}</b> · ${esc(p.bankHolder || '')}</div>${over ? '<div style="color:var(--red);font-weight:600;margin-bottom:6px">⚠ Vượt số dư tính được từ Sheet – hãy kiểm tra trước khi chuyển</div>' : ''}<div class="row"><button class="btn sm" data-payok="${p.id}">Đã chuyển khoản</button><button class="btn sm r" data-payno="${p.id}">Từ chối</button></div></div>`; }).join('') : '<div class="muted">Không có yêu cầu nào</div>'}</div>
      <div class="card"><h3>Số dư từng tài xế</h3><div class="table-scroll"><table><thead><tr><th>Tài xế</th><th>Đơn</th><th>Đã cộng vào ví</th><th>Đã chuyển</th><th>Đang chờ</th><th>Số dư</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name || r.uid)}</b></td><td>${r.n}</td><td>${money(r.earned)}</td><td>${money(r.paid)}</td><td>${money(r.pend)}</td><td><b>${money(r.bal)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Chưa có dữ liệu</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Lịch sử đã xử lý</h3>${done.length ? done.map(p => `<div class="row sb" style="padding:6px 0;border-top:1px solid #eef0f2"><span><b>${esc(p.name || p.uid)}</b> · ${money(p.amount)}<br><span class="muted">${esc(fmtTime(p.createdAt))} · ${esc(p.bankName || '')} ${esc(p.bankAccount || '')}</span></span><span class="badge">${p.status === 'paid' ? 'Đã chuyển khoản' : 'Từ chối'}</span></div>`).join('') : '<div class="muted">Chưa có</div>'}</div>`;
  };
  /* Ví nhà bán hàng: số dư = tổng phần Admin tài trợ giảm giá (platformOff) của đơn đã giao từ mốc SPONSOR_WALLET_FROM (Google Sheet) − tiền đã rút/đang chờ rút */
  const shopWalletView = () => {
    const payouts = allPayouts.filter(p => p.kind === 'shop'), by = new Map();
    (revRows || []).forEach(o => { const c = walletCredit(o); if (!(c > 0) || !o.shopId) return; const r = by.get(o.shopId) || { id:o.shopId, earned:0, n:0 }; r.earned += c; r.n++; by.set(o.shopId, r); });
    payouts.forEach(p => { if (p.shopId && !by.has(p.shopId)) by.set(p.shopId, { id:p.shopId, earned:0, n:0 }); });
    const sum = (id, st) => payouts.filter(p => p.shopId === id && p.status === st).reduce((a, p) => a + Number(p.amount || 0), 0);
    const rows = [...by.values()].map(r => { const paid = sum(r.id, 'paid'), pend = sum(r.id, 'pending'); return { ...r, paid, pend, bal:r.earned - paid - pend }; }).sort((a, b) => b.bal - a.bal);
    const earnedOf = id => (by.get(id) || { earned:0 }).earned, paidOf = id => sum(id, 'paid');
    const ts = p => (p.createdAt && p.createdAt.seconds) || 0;
    const pend = payouts.filter(p => p.status === 'pending').sort((a, b) => ts(a) - ts(b)), done = payouts.filter(p => p.status !== 'pending').sort((a, b) => ts(b) - ts(a)).slice(0, 30);
    const totalBal = rows.reduce((a, r) => a + Math.max(0, r.bal), 0), sponsored = shops.filter(x => Number(x.sponsorPct) > 0);
    return `<div class="section-heading"><h2>Ví quán</h2><p>Quán được bạn tài trợ giảm giá: khách trả ít hơn, quán vẫn nhận đủ tiền món, phần giảm được cộng vào ví quán khi đơn giao xong. Quán nhập tài khoản ngân hàng (hệ thống đã kiểm tra tên chủ TK) rồi gửi yêu cầu rút; bạn chuyển khoản và bấm xác nhận. Số liệu lấy từ Google Sheet (đơn vừa giao có thể chậm ~1 phút).</p></div>
      <div class="card row sb" style="gap:8px"><span class="muted">${revBusy ? 'Đang tải dữ liệu từ Google Sheet…' : revErr ? `<span style="color:var(--red)">${esc(revErr)}</span>` : revRows ? 'Đã tải dữ liệu đơn đã giao' : 'Chưa tải dữ liệu'}</span><button class="btn sm o" data-revreload>Tải lại</button></div>
      <div class="stat revenue-stats"><div class="card"><span class="metric-icon">👛</span><span class="muted">Tổng số dư các ví quán</span><b>${money(totalBal)}</b></div><div class="card"><span class="metric-icon">⏳</span><span class="muted">Yêu cầu chờ chuyển</span><b>${money(pend.reduce((a, p) => a + Number(p.amount || 0), 0))}</b></div></div>
      <div class="card"><h3>Quán đang được tài trợ</h3>${sponsored.length ? sponsored.map(x => `<div class="row sb" style="padding:4px 0"><span>${esc(x.name)}</span><b>${Number(x.sponsorPct)}%</b></div>`).join('') : '<div class="muted">Chưa quán nào. Vào tab Cửa hàng → Sửa → nhập “Tài trợ giảm giá (%)”.</div>'}</div>
      <div class="card"><h3>Yêu cầu rút tiền đang chờ</h3>${pend.length ? pend.map(p => { const over = Number(p.amount) > earnedOf(p.shopId) - paidOf(p.shopId); return `<div class="card" style="margin:8px 0 0;${over ? 'background:#fff7ed' : ''}"><div class="row sb"><span><b>${esc(p.name || shopName(p.shopId))}</b> · ${esc(p.phone || '')}<br><span class="muted">${esc(fmtTime(p.createdAt))}</span></span><b style="font-size:18px">${money(p.amount)}</b></div><div style="margin:6px 0">🏦 ${esc(p.bankName || '')} · <b>${esc(p.bankAccount || '')}</b> · ${esc(p.bankHolder || '')} <span class="badge ok">✓ Đã xác minh tên</span></div>${over ? '<div style="color:var(--red);font-weight:600;margin-bottom:6px">⚠ Vượt số dư tính được từ Sheet – hãy kiểm tra trước khi chuyển</div>' : ''}<div class="row"><button class="btn sm" data-payok="${p.id}">Đã chuyển khoản</button><button class="btn sm r" data-payno="${p.id}">Từ chối</button></div></div>`; }).join('') : '<div class="muted">Không có yêu cầu nào</div>'}</div>
      <div class="card"><h3>Số dư từng quán</h3><div class="table-scroll"><table><thead><tr><th>Quán</th><th>Đơn</th><th>Đã cộng vào ví</th><th>Đã chuyển</th><th>Đang chờ</th><th>Số dư</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(shopName(r.id))}</b></td><td>${r.n}</td><td>${money(r.earned)}</td><td>${money(r.paid)}</td><td>${money(r.pend)}</td><td><b>${money(r.bal)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Chưa có dữ liệu</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Lịch sử đã xử lý</h3>${done.length ? done.map(p => `<div class="row sb" style="padding:6px 0;border-top:1px solid #eef0f2"><span><b>${esc(p.name || shopName(p.shopId))}</b> · ${money(p.amount)}<br><span class="muted">${esc(fmtTime(p.createdAt))} · ${esc(p.bankName || '')} ${esc(p.bankAccount || '')}</span></span><span class="badge">${p.status === 'paid' ? 'Đã chuyển khoản' : 'Từ chối'}</span></div>`).join('') : '<div class="muted">Chưa có</div>'}</div>`;
  };
  /* Phụ phí thời tiết xấu: Admin bật/tắt + chỉnh mức. Khách thấy thêm dòng phụ phí khi đặt đơn, shipper nhận khoản này (kể cả đơn freeship). */
  const weatherView = () => {
    const on = settings.weatherOn === true && Number(settings.weatherFee) > 0, fee = Number(settings.weatherFee) || 0;
    return `<div class="card" style="margin-top:12px;${on ? 'background:#fff8ec' : ''}"><h3>🌧 Phụ phí thời tiết xấu</h3>
      <p class="muted">Trời mưa to, bão, rét đậm… bật lên để cộng thêm <b>phụ phí cho mỗi đơn</b> (đồ ăn, giao hàng, mua hộ). Khách thấy rõ dòng phụ phí trước khi đặt; <b>shipper nhận toàn bộ khoản này</b> (cộng vào tiền ship, kể cả đơn freeship). Chỉ áp dụng cho đơn đặt sau khi bạn lưu; tắt là hết thu ngay.</p>
      <label class="sw" style="margin:8px 0"><input type="checkbox" id="wx-on" data-wxon ${on ? 'checked' : ''}>Đang BẬT phụ phí thời tiết xấu</label>
      <div class="grid"><label class="f">Mức phụ phí mỗi đơn (đồng)<input type="number" id="wx-fee" min="0" max="100000" step="1000" value="${fee}"></label>
        <label class="f">Tên hiển thị cho khách<input type="text" id="wx-label" maxlength="40" placeholder="Phụ phí thời tiết xấu" value="${esc(settings.weatherLabel || '')}"></label></div>
      <p class="muted" style="margin:6px 0 0">${on ? `<b style="color:var(--green-d)">Đang bật:</b> +${money(fee)}/đơn${settings.weatherAt ? ' từ ' + esc(fmtTime(settings.weatherAt)) : ''}.` : 'Đang tắt – khách không bị tính phụ phí này.'} Tối đa 100.000đ/đơn.</p>
      <button class="btn" style="margin-top:12px" data-savewx>Lưu</button></div>`;
  };
  const saveWx = async onOverride => {
    const v = Math.round(Number($('#wx-fee').value)), fee = isNaN(v) ? 0 : Math.min(100000, Math.max(0, v));
    const on = onOverride !== undefined ? onOverride : $('#wx-on').checked;
    if (on && fee <= 0) { $('#wx-on').checked = false; toast('Hãy nhập mức phụ phí (đồng) lớn hơn 0 rồi mới bật'); return; }
    const was = settings.weatherOn === true && Number(settings.weatherFee) > 0;
    if (on && !was && !confirm(`Bật phụ phí thời tiết xấu +${money(fee)} cho MỖI đơn? Khách sẽ thấy phụ phí khi đặt.`)) { $('#wx-on').checked = false; return; }
    await fb.saveSettings({ weatherOn:on, weatherFee:fee, weatherLabel:$('#wx-label').value.trim().slice(0, 40), ...(on !== was ? { weatherAt:Date.now() } : {}) });
    toast(on ? `Đã bật phụ phí thời tiết xấu +${money(fee)}/đơn` : 'Đã tắt phụ phí thời tiết xấu');
  };
  /* Bảo trì hệ thống: bật thì khách vào web thấy thông báo và KHÔNG đặt được đơn (bị chặn cả ở máy chủ Firestore). Admin / quán / shipper vẫn dùng bình thường. */
  const maintView = () => {
    const on = settings.maintenanceOn === true;
    return `<div class="card" style="margin-top:12px;${on ? 'background:#fff1f0;border:2px solid #e5484d' : ''}"><h3>🛠 Bảo trì hệ thống</h3>
      <p class="muted">Bật khi cần sửa lỗi hoặc nâng cấp: khách vào website sẽ thấy <b>thông báo bảo trì</b> và <b>không đặt được đơn</b> (đồ ăn, giao hàng, mua hộ, link quán gửi). Các đơn đã đặt trước đó vẫn xem được. Trang Admin, quán và shipper vẫn hoạt động bình thường.</p>
      <label class="sw" style="margin:8px 0"><input type="checkbox" id="mt-on" ${on ? 'checked' : ''}>Đang BẬT chế độ bảo trì (khách không đặt được hàng)</label>
      <label class="f">Nội dung thông báo cho khách (để trống dùng câu mặc định)<textarea id="mt-msg" rows="3" maxlength="300" placeholder="Hệ thống đang bảo trì đến 15h hôm nay. Xin lỗi vì sự bất tiện này!">${esc(settings.maintenanceMsg || '')}</textarea></label>
      <button class="btn" style="margin-top:12px" data-savemaint>Lưu chế độ bảo trì</button></div>`;
  };
  const settingsView = () => maintView() + weatherView() + custView() + contactView() + bankView() + shipCfgView();

  /* Form thêm / sửa cửa hàng: ẩn các cài đặt không dùng và đổi nhãn theo mục đã chọn (Đồ ăn / Thực phẩm sống / Thời trang / Dịch vụ khác) */
  const SEC_TXT = {
    food:    { name:'Tên quán *', cat:'Loại (VD: Phở • Món Việt)', group:'Nhóm lọc (cách nhau dấu phẩy)', phone:'SĐT quán', menu:'Thực đơn', item:'Tên món', add:'+ Thêm món', feat:'⭐ Nổi bật (hiện trên banner trang chủ)', ph:'Phở, Món Việt' },
    fresh:   { name:'Tên cửa hàng *', cat:'Loại (VD: Thịt heo • Cá • Rau củ)', group:'Nhóm lọc (VD: Thịt, Cá, Rau củ, Trứng)', phone:'SĐT cửa hàng', menu:'Sản phẩm', item:'Tên sản phẩm', add:'+ Thêm sản phẩm', feat:'⭐ Nổi bật (hiện ở nhóm Nổi bật)', ph:'Thịt, Cá, Rau củ' },
    fashion: { name:'Tên cửa hàng *', cat:'Loại (VD: Quần áo nữ • Phụ kiện)', group:'Nhóm lọc (VD: Nữ, Nam, Trẻ em, Phụ kiện)', phone:'SĐT cửa hàng', menu:'Sản phẩm', item:'Tên sản phẩm', add:'+ Thêm sản phẩm', feat:'⭐ Nổi bật (hiện ở nhóm Nổi bật)', ph:'Nữ, Phụ kiện' },
    service: { name:'Tên nhà cung cấp / thương hiệu *', cat:'Loại dịch vụ (VD: Chụp ảnh cưới • Makeup)', group:'Nhóm lọc (VD: Chụp ảnh, Makeup, Cúng - Lễ, Khác)', phone:'SĐT liên hệ (nút Gọi / Zalo của khách) *', menu:'Các gói dịch vụ', item:'Tên dịch vụ', add:'+ Thêm dịch vụ', feat:'⭐ Nổi bật (hiện ở nhóm Nổi bật)', ph:'Chụp ảnh, Makeup' },
  };
  root.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-madd]')) setTimeout(applySector, 0); });
  function applySector() {
    const sel = $('#f-sector'); if (!sel) return;
    const k = sel.value, T = SEC_TXT[k] || SEC_TXT.food;
    root.dataset.msector = k;
    root.querySelectorAll('[data-hide]').forEach(el => { el.style.display = el.dataset.hide.split(' ').includes(k) ? 'none' : ''; });
    root.querySelectorAll('[data-lbl]').forEach(el => { if (T[el.dataset.lbl]) el.textContent = T[el.dataset.lbl]; });
    const g = $('#f-group'); if (g) g.placeholder = T.ph;
    const hd = root.querySelector('.mrow.hd span'); if (hd) hd.textContent = T.item;
    const add = root.querySelector('[data-madd]'); if (add) add.textContent = T.add;
    root.querySelectorAll('[data-k=name]').forEach(i => { i.placeholder = T.item; });
  }
  function draw() {
    const keep = $('#uq')?.value;
    if (sel.size) sel = new Set([...sel].filter(id => shops.some(s => s.id === id)));
    const pend = live.filter(o => o.status === 'pending').length;
    const pn = presence.filter(presOn).length;
    const T = [['revenue', '📊 Doanh thu'], ['shopwallet', `🏪 Ví quán${allPayouts.some(p => p.kind === 'shop' && p.status === 'pending') ? `<span class="n">${allPayouts.filter(p => p.kind === 'shop' && p.status === 'pending').length}</span>` : ''}`], ['wallet', `👛 Ví tài xế${allPayouts.some(p => p.kind !== 'shop' && p.status === 'pending') ? `<span class="n">${allPayouts.filter(p => p.kind !== 'shop' && p.status === 'pending').length}</span>` : ''}`], ['orders', `Đơn hàng${pend ? `<span class="n">${pend}</span>` : ''}`], ['shipcalls', `🛵 Gọi ship${shipCalls.length ? `<span class="n">${shipCalls.length}</span>` : ''}`], ['shops', 'Cửa hàng'], ['online', `🟢 Shipper online<span class="n" id="pres-n" style="background:var(--g);${pn ? '' : 'display:none'}">${pn}</span>`], ['users', 'Người dùng'], ['promos', 'Khuyến mãi'], ['settings', 'Liên hệ']];
    root.innerHTML = `<div class="tabs">${T.map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div><main>${err ? `<div class="card" style="color:var(--red)">${esc(err)}</div>` : ''}${{ shipcalls:shipView, revenue:revenueView, shopwallet:shopWalletView, wallet:walletView, orders:ordersView, shops:shopsView, users:usersView, online:onlineView, promos:promosView, settings:settingsView }[tab]()}</main>`;
    if (keep && $('#uq')) $('#uq').value = keep;
    applySector();
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
  let ucur = null, udone = true, utotal = null, umore = false, usT = 0;
  const loadUsers = async () => {
    try {
      const [staff, c] = await Promise.all([fb.listStaff(), fb.listCustomers(null)]);
      const n = await fb.countCustomers();   // lấy tổng từ lần đọc Sheet vừa xong, không tốn thêm lượt đọc
      users = [...staff, ...c.list]; ucur = c.cursor; udone = c.done; utotal = n; err = ''; if (!sync.users && histTotal != null) refreshCounts().catch(() => {});
    } catch (e) { err = fb.errMsg(e); }
    draw();
  };
  const loadMoreUsers = async (all) => {
    if (umore || udone) return; umore = true; draw();
    try {
      do { const c = await fb.listCustomers(ucur); users = [...users, ...c.list]; ucur = c.cursor; udone = c.done; } while (all && !udone);
    } catch (e) { toast(e.code ? fb.errMsg(e) : e.message); }
    umore = false; draw();
  };

  track(fb.watchShops((l, e) => { shops = l.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi')); if (e) err = fb.errMsg(e); if (revRows) syncSold(); if (!edit || !$('#f-name')) draw(); }));
  /* orders = đơn đang xử lý (Firestore, realtime) + lịch sử đã tải từ Google Sheet; trùng mã thì ưu tiên bản realtime */
  const mergeOrders = () => { const ids = new Set(live.map(o => o.id)); orders = [...live, ...hist.filter(o => !ids.has(o.id))]; };
  const loadHist = async (reset) => {
    if (histBusy) return; histBusy = true; histErr = ''; if (reset) { hist = []; histDone = false; } if (tab === 'orders') draw();
    try { const r = await fb.sheetOrders(hist.length, 100); hist = [...hist, ...r.rows]; histTotal = r.total; histDone = r.done; mergeOrders(); }
    catch (e) { histErr = fb.errMsg(e); }
    histBusy = false; if (tab === 'orders') draw(); if (!sync.orders && histTotal != null && utotal != null) refreshCounts().catch(() => {});
  };
  /* so số lượng Google Sheet với Firestore → báo thiếu bao nhiêu và có nút đồng bộ */
  const refreshCounts = async () => {
    const [cu, od] = await Promise.all([fb.fsCount('customers'), fb.fsCount('orders')]);
    sync = { users:{ fs:cu, sheet:utotal }, orders:{ fs:od, sheet:histTotal } }; draw();
  };
  const syncBox = k => {
    const s = sync[k], name = k === 'users' ? 'khách hàng' : 'đơn hàng'; if (!s) return '';
    const miss = s.fs != null && s.sheet != null ? s.fs - s.sheet : null;
    return `<div class="card" style="${miss > 0 ? 'background:#fff7ed;border:1px solid #fdba74' : ''}"><div class="row sb" style="gap:8px"><span>${miss > 0 ? `⚠️ Google Sheet đang thiếu <b>${miss.toLocaleString('vi-VN')}</b> ${name}` : '✅ Google Sheet đã đủ ' + name}<span class="muted"> (Firestore ${s.fs ?? '?'} · Sheet ${s.sheet ?? '?'})</span></span><button class="btn sm ${miss > 0 ? '' : 'o'}" data-sync="${k}" ${syncBusy ? 'disabled' : ''}>${syncBusy === k ? esc(syncMsg) : miss > 0 ? 'Đồng bộ ngay' : 'Kiểm tra lại'}</button></div></div>`;
  };
  const loadRev = async (force) => {
    if (revBusy || (!force && revRows && Date.now() - revAt < 60000)) return;
    revBusy = true; revErr = ''; if (tab === 'revenue' || tab === 'shopwallet' || tab === 'wallet') draw();
    try { revRows = await fb.sheetDoneOrders(); revAt = Date.now(); syncSold(); } catch (e) { revErr = fb.errMsg(e); }
    revBusy = false; if (tab === 'revenue' || tab === 'shopwallet' || tab === 'wallet') draw();
  };
  /* sửa bản đã tải từ Sheet ngay trên màn hình (đơn realtime tự cập nhật qua Firestore) */
  const patchLocal = (id, patch) => { const h = hist.find(o => o.id === id); if (h) { Object.assign(h, patch); mergeOrders(); draw(); } };
  track(fb.watchActiveOrders((l, e) => { live = l; mergeOrders(); if (e) err = fb.errMsg(e); else err = err === fb.QUOTA_MSG ? '' : err; if (tab === 'orders') draw(); }));
  loadHist(true);
  track(fb.watchPresence((l, e) => { presence = l; if (tab === 'online') draw(); else { const b = $('#pres-n'); const n = l.filter(presOn).length; if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; } } }));
  const presClock = setInterval(() => { if (tab === 'online') draw(); }, 60000);   // làm mới nhãn "x phút trước"
  track(() => clearInterval(presClock));
  track(fb.watchNewShipCalls((l, e) => { shipCalls = l.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)); shipCalls.forEach(c => { const k = fb.shipPhoneKey(c.customerPhone); if (k in savedLoc) return; savedLoc[k] = null; fb.getShipCustomer(c.customerPhone).then(d => { if (!d) return; savedLoc[k] = d; if (sf && sf.id === c.id && !sf.link.trim()) { sfInit(c); draw(); return; } if (tab === 'shipcalls' && !document.activeElement?.closest?.('input,textarea,select')) draw(); }).catch(e => { console.warn('Không đọc được vị trí khách đã lưu', e); delete savedLoc[k]; }); }); if (sf && !shipCalls.some(c => c.id === sf.id)) sf = null; if (!document.activeElement?.closest?.('input,textarea,select')) draw(); }));
  track(fb.watchPromos(l => { promos = l; if (tab === 'promos') draw(); }));
  track(fb.watchPayouts(l => { allPayouts = l; draw(); }));
  track(fb.watchSettings(s => { settings = s; if (tab === 'settings') draw(); }));
  /* Đếm số đơn đã giao của từng quán và lưu vào quán (trường sold) để khách thấy mục “Bán chạy”. Chạy khi Admin mở trang quản lý. */
  let soldT; const syncSold = () => { clearTimeout(soldT); soldT = setTimeout(() => {
    if (!shops.length || !revRows) return; const cnt = {};
    revRows.forEach(o => { if (o.status === 'done' && !o.type && o.shopId) cnt[o.shopId] = (cnt[o.shopId] || 0) + 1; });
    shops.forEach(s => { const n = cnt[s.id] || 0; if (n > (s.sold || 0)) fb.patchShop(s.id, { sold:n }).catch(() => {}); });   // chỉ tăng: tránh ghi đè về 0 khi Sheet chưa đủ dữ liệu cũ
  }, 4000); };
  track(() => clearTimeout(soldT));
  loadUsers(); bindMenuEditor(root); bindImgUpload(root);
  /* Quán tự đóng/mở theo giờ: làm mới nhãn trạng thái mỗi phút khi đang xem danh sách cửa hàng */
  const clock = setInterval(() => { if (tab === 'shops' && !edit && !mk && !imp && !paste && !document.activeElement?.closest?.('input,textarea,select')) draw(); }, 60000);
  track(() => clearInterval(clock));

  root.addEventListener('input', e => { if (e.target.id === 'uq') { draw(); $('#uq').focus(); clearTimeout(usT); const v = $('#uq').value.trim(); if (v.length >= 3) usT = setTimeout(async () => { try { const f = await fb.searchUsers(v); if (!f.length) return; const m = new Map(users.map(u => [u.uid, u])); f.forEach(u => m.set(u.uid, { ...m.get(u.uid), ...u })); users = [...m.values()]; if ($('#uq')?.value.trim() === v) { draw(); $('#uq').focus(); } } catch (er) { toast(fb.errMsg(er)); } }, 500); } if (e.target.id === 'paste-txt' && paste) paste.text = e.target.value; });
  root.addEventListener('change', async e => {
    const t = e.target;
    try {
      if (t.id === 'f-sector') applySector();
      if (t.id === 'ofil') { ofil = t.value; draw(); }
      if (t.dataset.feat) { await fb.patchShop(t.dataset.feat, { featured:t.checked }); toast(t.checked ? 'Đã bật Nổi bật' : 'Đã tắt Nổi bật'); }
      if (t.dataset.hothome) { await fb.patchShop(t.dataset.hothome, { hotHome:t.checked }); toast(t.checked ? 'Đã đưa vào mục Quán hot' : 'Đã gỡ khỏi mục Quán hot'); }
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
      if (t.dataset.zpick !== undefined) { zl.pick[t.dataset.zpick] = t.value; const b = $(`[data-zassign="${t.dataset.zpick}"]`); if (b) b.disabled = !t.value; return; }
      if (t.dataset.wxon !== undefined) { await saveWx(t.checked); return; }
      if (t.dataset.shopcust !== undefined) { await fb.saveSettings({ shopSeeCustomer:t.checked }); toast(t.checked ? 'Quán đã được xem thông tin khách' : 'Đã ẩn thông tin khách với quán'); return; }
      if (t.id === 'rev-shop') { revShop = t.value; draw(); return; }
      if (t.id === 'bk-bank') { if (t.value && t.value !== 'other') $('#bk-bin').value = t.value; return; }
      if (t.dataset.ost) { await fb.patchOrder(t.dataset.ost, { status:t.value }); patchLocal(t.dataset.ost, { status:t.value }); }
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
    if (g('[data-t]')) { tab = g('[data-t]').dataset.t; edit = null; mk = null; rp = null; paste = null; draw(); if (tab === 'revenue' || tab === 'shopwallet' || tab === 'wallet') loadRev(false); if (tab === 'orders' && !hist.length && !histDone && !histBusy) loadHist(true); return; }
    if (g('[data-revreload]')) { loadRev(true); return; }
    if (g('[data-histmore]')) { loadHist(false); return; }
    if (g('[data-histall]')) { (async () => { while (!histDone && !histErr) { const n = hist.length; await loadHist(false); if (hist.length === n) break; } })(); return; }
    if (g('[data-sync]')) {
      const k = g('[data-sync]').dataset.sync; if (syncBusy) return; syncBusy = k; syncMsg = 'Đang đồng bộ…'; draw();
      try {
        const n = await fb.sheetBackfill(k, (a, done) => { syncMsg = done ? 'Hoàn tất' : 'Đã thêm ' + a + ' dòng, đang làm tiếp…'; draw(); });
        toast(n ? 'Đã thêm ' + n + ' dòng vào Google Sheet' : 'Google Sheet đã đủ dữ liệu');
        sync = {}; if (k === 'users') await loadUsers(); else await loadHist(true);
      } catch (er) { toast(fb.errMsg(er)); }
      syncBusy = ''; syncMsg = ''; draw(); return;
    }
    try {
      if (g('[data-copylink]')) { const sh = shops.find(x => x.id === g('[data-copylink]').dataset.copylink); if (sh && await copyText(shopLink(sh, shops))) toast('Đã sao chép link của ' + sh.name + '. Dán gửi khách là xong.'); }
      else if (g('[data-zload]')) {
        if (zl.busy) return; zl.busy = true; zl.err = ''; draw();
        try { zl.list = await fb.zaloChats(); } catch (er) { zl.err = er.message || 'Không lấy được danh sách Zalo'; }
        zl.busy = false; draw();
      }
      else if (g('[data-zassign]')) {
        const id = g('[data-zassign]').dataset.zassign, uid = zl.pick[id], u = users.find(x => x.uid === uid); if (!u) { toast('Hãy chọn người cần gắn'); return; }
        const cur = splitZ(u.zaloId); if (cur.includes(id)) { toast('Người này đã có Zalo ID đó rồi'); return; }
        const z = [...cur, id].join(','); await fb.patchUser(uid, { zaloId:z }); u.zaloId = z; await syncNotify(); zl.pick[id] = ''; toast('Đã gắn Zalo ID cho ' + (u.name || u.phone)); draw();
      }
      else if (g('[data-zunlink]')) {
        e.preventDefault(); const [uid, id] = g('[data-zunlink]').dataset.zunlink.split('|'), u = users.find(x => x.uid === uid); if (!u) return;
        if (!confirm('Gỡ Zalo ID này khỏi ' + (u.name || u.phone) + '? Họ sẽ không nhận báo đơn qua Zalo nữa.')) return;
        const z = splitZ(u.zaloId).filter(x => x !== id).join(','); await fb.patchUser(uid, { zaloId:z }); u.zaloId = z; await syncNotify(); toast('Đã gỡ Zalo ID'); draw();
      }
      else if (g('[data-savemaint]')) {
        const on = $('#mt-on').checked, msg = $('#mt-msg').value.trim().slice(0, 300);
        if (on !== (settings.maintenanceOn === true) && !confirm(on ? 'BẬT bảo trì? Khách sẽ thấy thông báo và KHÔNG đặt được hàng cho đến khi bạn tắt.' : 'TẮT bảo trì? Khách sẽ đặt hàng lại bình thường.')) return;
        await fb.saveSettings({ maintenanceOn:on, maintenanceMsg:msg }); toast(on ? '🛠 Đã BẬT bảo trì – khách không đặt được hàng' : '✅ Đã TẮT bảo trì – khách đặt hàng bình thường');
      }
      else if (g('[data-savewx]')) { await saveWx(); }
      else if (g('[data-newshop]')) { edit = { menu:[] }; draw(); }
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
            await fb.createSellerAccount({ name:s.name, phone:mk.phone, pass:mk.pass, shopId:s.id, zaloId:mk.zalo, onStep:t => { mk.step = t; draw(); } });
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
        if (v('f-sector') === 'service' && !v('f-phone')) return toast('Dịch vụ cần có SĐT liên hệ để khách bấm Gọi / Zalo');
        const hr = readHours('f', root); if (hr.error) return toast(hr.error);
        const d = { name:v('f-name'), sector:v('f-sector') || 'food', cat:v('f-cat'), group:v('f-group').split(',').map(x => x.trim()).filter(Boolean), phone:v('f-phone'), address:v('f-address'), eta:v('f-eta'), shipFee:Math.max(0, +v('f-ship') || 0), freeShipMin:Math.max(0, +v('f-free') || 0), freeShipAll:$('#f-freeall').checked, sale:Math.min(90, Math.max(0, +v('f-sale') || 0)), sponsorPct:Math.min(50, Math.max(0, Math.round((+v('f-sponsor') || 0) * 10) / 10)), rate:Math.min(5, Math.max(0, +v('f-rate') || 0)), rc:v('f-rc'), img:v('f-img'), desc:v('f-desc'), open:$('#f-open').checked, featured:$('#f-feat').checked, hotHome:$('#f-hothome').checked, menu:readMenu(root), ...hr.fields };
        /* Admin chỉnh điểm / số lượt đánh giá → đặt lại mốc cộng dồn (rateSum, rateCount). Khách đánh giá sau đó sẽ cộng tiếp trên mốc này, không quay về số thật. */
        if (!edit.id || d.rate !== (+edit.rate || 0) || d.rc !== (edit.rc || '')) {
          const cnt = parseInt(d.rc, 10) || (d.rate > 0 ? 10 : 0);   // chưa nhập số lượt mà có điểm → coi như 10 lượt
          d.rateCount = cnt; d.rateSum = Math.round(d.rate * cnt);
          if (d.rate > 0 && !parseInt(d.rc, 10)) d.rc = String(cnt);
        }
        if (edit.id) await fb.patchShop(edit.id, d); else await fb.createShop(d);
        edit = null; toast('Đã lưu cửa hàng'); draw();
      }
      else if (g('[data-ufil]')) { ufil = g('[data-ufil]').dataset.ufil; draw(); }
      else if (g('[data-ureload]')) { await loadUsers(); toast('Đã tải lại'); }
      else if (g('[data-umore]')) { await loadMoreUsers(false); }
      else if (g('[data-uall]')) { await loadMoreUsers(true); }
      else if (g('[data-addpromo]')) {
        const v = id => $('#' + id).value.trim(); if (!v('p-code')) return toast('Nhập mã');
        const ship = $('#p-type').value === 'ship', full = ship && $('#p-full').checked, off = +v('p-off') || 0;
        const pct = $('#p-mode').value === 'pct' && !full, p = Math.round(+v('p-pct') || 0), mx = Math.max(0, Math.round(+v('p-max') || 0));
        if (pct && (p < 1 || p > 100)) return toast('Nhập % giảm từ 1 đến 100');
        if (!pct && !full && off <= 0) return toast(ship ? 'Nhập số tiền giảm phí ship hoặc tích "miễn phí ship toàn bộ"' : 'Nhập số tiền giảm');
        const min = +v('p-min') || 0, what = pct ? 'Giảm ' + p + '%' + (mx ? ' (tối đa ' + money(mx) + ')' : '') : 'Giảm ' + money(off), desc = v('p-desc') || (ship ? (full ? 'Miễn phí vận chuyển' : what + ' phí vận chuyển') : what) + (min ? ' cho đơn từ ' + money(min) : '');
        await fb.savePromo(null, { code:v('p-code').toUpperCase(), desc, type:ship ? 'ship' : 'discount', ...(ship && full ? { full:true } : {}), ...(pct ? { mode:'pct', pct:p, max:mx } : {}), off:pct ? 0 : off, min, active:true }); toast('Đã thêm voucher');
      }
      else if (g('[data-payok]')) { if (confirm('Xác nhận ĐÃ chuyển khoản cho người nhận?')) { await fb.setPayout(g('[data-payok]').dataset.payok, { status:'paid', paidAt:fb.ts() }); toast('Đã xác nhận chuyển khoản'); } }
      else if (g('[data-payno]')) { if (confirm('Từ chối yêu cầu này? Tiền được hoàn lại vào ví.')) { await fb.setPayout(g('[data-payno]').dataset.payno, { status:'rejected' }); toast('Đã từ chối'); } }
      else if (g('[data-delpromo]')) { if (confirm('Xóa mã này?')) await fb.removePromo(g('[data-delpromo]').dataset.delpromo); }
      else if (g('[data-saveship]')) {
        const n = (id, d) => { const v = parseFloat($('#' + id).value); return isNaN(v) ? d : v; };
        const d = { shipBase:Math.max(0, n('sh-base', 15000)), shipBaseKm:Math.max(0, n('sh-basekm', 3.5)), shipPerKm:Math.max(0, n('sh-perkm', 3000)), shipRoad:Math.min(2, Math.max(1, n('sh-road', 1.3))), shipW2:Math.max(0, n('sh-w2', 5000)), shipW3:Math.max(0, n('sh-w3', 15000)), errandFee:Math.max(0, n('sh-errand', 10000)) };
        await fb.saveSettings(d); toast('Đã lưu phí giao hàng');
      }
      else if (g('[data-paid]')) {
        const [id, v] = g('[data-paid]').dataset.paid.split(':'), o = orders.find(x => x.id === id), on = v === '1';
        if (on && !confirm('Xác nhận ĐÃ NHẬN ' + money(o && o.total) + ' của đơn #' + (o && o.code) + '? Hãy kiểm tra tiền đã về tài khoản.')) return;
        await fb.patchOrder(id, on ? { payStatus:'paid', paidAt:fb.ts() } : { payStatus:'unpaid', paidAt:null }); patchLocal(id, { payStatus:on ? 'paid' : 'unpaid' }); toast(on ? 'Đã xác nhận nhận tiền' : 'Đã bỏ xác nhận');
      }
      else if (g('[data-tocash]')) {
        const o = orders.find(x => x.id === g('[data-tocash]').dataset.tocash);
        if (confirm('Đổi đơn #' + (o && o.code) + ' sang thanh toán TIỀN MẶT khi nhận hàng? (dùng khi khách không chuyển khoản)')) { await fb.patchOrder(o.id, { payment:'cash', payStatus:null }); patchLocal(o.id, { payment:'cash', payStatus:'' }); toast('Đã đổi sang tiền mặt'); }
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
  /* ===== Gọi ship: quán gửi SĐT khách → Admin xin định vị Zalo → dán link Google Maps → tạo đơn "Giao hàng" cho shipper ===== */
  const digitsOnly = v => String(v || '').replace(/\D/g, '');
  const zaloPhone = v => digitsOnly(v).replace(/^0/, '84');
  const parseMaps = v => { v = String(v || '').trim(); for (const r of [/@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|ll|query|destination|center)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i, /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/]) { const m = v.match(r); if (m && +m[1] >= 8 && +m[1] <= 24 && +m[2] >= 102 && +m[2] <= 110) return { lat:+m[1], lng:+m[2] }; } return null; };   // chỉ nhận toạ độ trong Việt Nam
  const haverKm = (a, b) => { const R = 6371, rad = x => x * Math.PI / 180, dLa = rad(b.lat - a.lat), dLo = rad(b.lng - a.lng), h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  /* Phí Gọi ship = CÙNG phí web đang áp dụng: Admin → Liên hệ (shipBase / shipBaseKm / shipPerKm / shipRoad) + phụ phí đêm 22h–5h (+5.000đ) + phụ phí thời tiết xấu nếu Admin đang bật */
  const shipCfg = () => { const n = (k, d) => { const v = Number(settings[k]); return v > 0 ? v : d; }; return { base:n('shipBase', 15000), baseKm:n('shipBaseKm', 3.5), perKm:n('shipPerKm', 3000), road:Math.min(2, Math.max(1, n('shipRoad', 1.3))) }; };
  const shipKm = (c, p) => Math.round(haverKm({ lat:c.shopLat, lng:c.shopLng }, p) * shipCfg().road * 10) / 10;
  const shipQuote = (c, p) => {
    const g = shipCfg(), km = shipKm(c, p), extra = Math.max(0, Math.ceil(Math.round((km - g.baseKm) * 10) / 10)), h = new Date(Date.now() + 7 * 36e5).getUTCHours();
    const night = (h >= 22 || h < 5) ? 5000 : 0, wf = Math.round(Number(settings.weatherFee)), wx = settings.weatherOn === true && wf > 0 ? Math.min(wf, 100000) : 0, dist = g.base + extra * g.perKm;
    return { km, extra, dist, night, wx, fee:dist + night + wx, cfg:g };
  };
  const sfFeeHint = c => { if (!sf.pt) return ''; const q = shipQuote(c, sf.pt), k = v => String(v).replace('.', ','); return `Phí theo app: ${money(q.cfg.base)} cho ${k(q.cfg.baseKm)} km đầu${q.extra ? ' + ' + q.extra + ' km × ' + money(q.cfg.perKm) : ''}${q.night ? ' + phụ phí đêm ' + money(q.night) : ''}${q.wx ? ' + thời tiết xấu ' + money(q.wx) : ''} = <b>${money(q.fee)}</b>`; };
  const sfPtHtml = c => !sf.pt ? (sf.link.trim() ? '⚠ Chưa đọc được vị trí từ link này (link chỉ có địa chỉ chữ thì không dùng được — xin khách gửi lại ghim vị trí)' : 'Dán link Google Maps khách gửi qua Zalo (hoặc toạ độ 10.77,106.69)') : `✅ Vị trí khách: <a href="${mapLink(sf.pt.lat, sf.pt.lng)}" target="_blank" rel="noopener">${sf.pt.lat}, ${sf.pt.lng}</a> · cách quán ~<b>${shipKm(c, sf.pt)} km</b>`;
  const shipForm = () => {
    const c = shipCalls.find(x => x.id === sf.id); if (!c) return '';
    return `<div class="card" id="sf-form" style="border:2px solid var(--g)"><h3>Tạo đơn cho shipper · ${esc(c.shopName)}</h3>
      <label class="f">Link Google Maps của khách<input type="text" id="sf-link" value="${esc(sf.link)}" placeholder="https://maps.app.goo.gl/… hoặc 10.77,106.69"></label>
      <div class="muted" id="sf-pt" style="margin:4px 0 6px">${sfPtHtml(c)}</div>
      <div class="grid"><label class="f">SĐT khách<input type="tel" id="sf-phone" value="${esc(sf.phone)}"></label><label class="f">Thu hộ (đ)<input type="number" id="sf-cod" min="0" value="${esc(sf.cod)}"></label></div>
      <div class="grid"><label class="f">Phí ship (đ)<input type="number" id="sf-fee" min="0" max="300000" value="${esc(sf.fee)}"></label>
      <label class="f">Ai trả phí ship<select id="sf-payer"><option value="sender" ${sf.payer === 'sender' ? 'selected' : ''}>Quán trả</option><option value="receiver" ${sf.payer === 'receiver' ? 'selected' : ''}>Khách trả</option></select></label></div>
      <div class="muted" id="sf-fee-hint" style="margin:2px 0 6px">${sfFeeHint(c)}</div>
      <label class="f">Ghi chú / địa chỉ chữ (nếu có)<input type="text" id="sf-note" maxlength="250" value="${esc(sf.note)}"></label>
      <div class="row" style="margin-top:10px"><button class="btn" data-sfmake ${sf.busy ? 'disabled' : ''}>${sf.busy ? 'Đang tạo…' : '🛵 Tạo đơn & báo shipper'}</button><button class="btn o" data-sfclose>Đóng</button></div></div>`;
  };
  function shipView() {
    const rows = shipCalls.map(c => `<div class="card"${sf && sf.id === c.id ? ' style="border-color:var(--g)"' : ''}><div class="row sb"><b>${esc(c.shopName)}</b><span class="muted">${fmtTime(c.createdAtMs)}</span></div>
      <div>Khách: <b>${esc(c.customerPhone)}</b>${c.cod ? ' · Thu hộ <b>' + money(c.cod) + '</b>' : ''}</div>${shipSavedHtml(c)}${c.note ? `<div class="muted">${esc(c.note)}</div>` : ''}
      <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px"><a class="btn sm o" href="https://zalo.me/${zaloPhone(c.customerPhone)}" target="_blank" rel="noopener">${savedLoc[fb.shipPhoneKey(c.customerPhone)] ? '💬 Xin lại vị trí' : '💬 Xin vị trí qua Zalo'}</a><a class="btn sm o" href="${mapLink(c.shopLat, c.shopLng)}" target="_blank" rel="noopener">📍 Vị trí quán</a>${savedLoc[fb.shipPhoneKey(c.customerPhone)] ? `<button class="btn sm" data-sfquick="${esc(c.id)}">🚀 Gửi đơn ngay</button><button class="btn sm o" data-sfopen="${esc(c.id)}">Sửa</button>` : `<button class="btn sm" data-sfopen="${esc(c.id)}">Tạo đơn (đã có link)</button>`}<button class="btn sm" style="background:#2b8a3e" data-sfdone="${esc(c.id)}" title="Đã xử lý xong yêu cầu này, không cần link vị trí khách">✅ Hoàn thành</button><button class="btn sm r" data-sfdel="${esc(c.id)}">Bỏ</button></div></div>`).join('') || '<div class="empty">Chưa có yêu cầu gọi ship nào.</div>';
    return `<div class="row sb" style="margin-bottom:10px"><b>${shipCalls.length} yêu cầu chờ xử lý</b></div>${rows}${sf ? shipForm() : ''}`;
  }
  const sfInit = c => {
    sf = { id:c.id, link:'', pt:null, phone:c.customerPhone || '', cod:String(c.cod || ''), fee:'', payer:'sender', note:'', feeTouched:false, busy:false };
    const sv = savedLoc[fb.shipPhoneKey(c.customerPhone)];   // khách cũ: điền sẵn vị trí đã lưu + phí theo app
    if (sv && sv.lat != null) { sf.pt = { lat:sv.lat, lng:sv.lng }; sf.link = sv.link || mapLink(sv.lat, sv.lng); sf.fee = String(shipQuote(c, sf.pt).fee); }
    return sf;
  };
  const shipSavedHtml = c => {
    const sv = savedLoc[fb.shipPhoneKey(c.customerPhone)];
    if (!sv || sv.lat == null) return '<div style="color:var(--o,#e8590c);font-weight:600">🆕 Khách mới: nhắn Zalo xin vị trí, nhận link Google Maps rồi bấm Tạo đơn</div>';
    const q = shipQuote(c, { lat:sv.lat, lng:sv.lng });
    return `<div style="color:var(--g);font-weight:600">✅ Khách cũ · đã có vị trí (<a href="${mapLink(sv.lat, sv.lng)}" target="_blank" rel="noopener">xem bản đồ</a>) · ~${q.km} km · phí ${money(q.fee)}</div>`;
  };
  async function sfReadLink(resolve) {
    if (!sf) return; const v = sf.link.trim(), c = shipCalls.find(x => x.id === sf.id); if (!c) return;
    let p = parseMaps(v), el = $('#sf-pt');
    if (!p && resolve && /^https?:\/\//i.test(v)) { if (el) el.textContent = 'Đang đọc link…'; p = await fb.resolveMapLink(v); }
    if (!sf || sf.link.trim() !== v) return;   // đã sửa tiếp trong lúc chờ
    sf.pt = p; el = $('#sf-pt'); if (el) el.innerHTML = sfPtHtml(c);
    if (p && !sf.feeTouched) { sf.fee = String(shipQuote(c, p).fee); const fe = $('#sf-fee'); if (fe) fe.value = sf.fee; }
    const fh = $('#sf-fee-hint'); if (fh) fh.innerHTML = sfFeeHint(c);
  }
  async function sfMake() {
    if (!sf || sf.busy) return; const c = shipCalls.find(x => x.id === sf.id); if (!c) return;
    const phone = digitsOnly(sf.phone), fee = Math.round(+sf.fee || 0), cod = Math.max(0, Math.round(+sf.cod || 0));
    if (!sf.pt) return toast('Chưa có vị trí khách. Hãy dán link Google Maps');
    if (phone.length < 9) return toast('Số điện thoại khách chưa đúng');
    if (fee < 0 || fee > 300000) return toast('Phí ship phải từ 0 đến 300.000đ');
    const pt = { lat:sf.pt.lat, lng:sf.pt.lng };   // bản sao: sf có thể bị đặt null khi listener chạy giữa các await
    const q = shipQuote(c, pt), km = q.km, note = sf.note.trim();
    const o = { code:'LT' + Date.now().toString().slice(-6), uid:fb.currentUser().uid, customerName:c.shopName || 'Quán', customerPhone:c.shopPhone || '', type:'delivery', shopId:'svc-delivery', shopName:c.shopName || 'Quán', shopPhone:c.shopPhone || '', shopAddress:c.shopAddress || '',
      shopLat:c.shopLat, shopLng:c.shopLng, address:(note || ('Khách ' + phone + ' (xem vị trí trên bản đồ)')).slice(0, 300), note:('Gọi ship từ quán' + ([note, c.note].filter(Boolean).length ? ': ' + [note, c.note].filter(Boolean).join(' · ') : '')).slice(0, 300), lat:sf.pt.lat, lng:sf.pt.lng, locAcc:null,
      receiverName:'Khách', receiverPhone:phone, goods:'Đơn của quán', weight:'', codAmount:cod, feePayer:sf.payer, items:[{ name:'Giao hàng của quán (ngoài app)', price:0, qty:1 }],
      subtotal:0, discount:0, promoCode:'', shipFee:fee, ...(fee === q.fee ? { ...(q.night ? { nightFee:q.night } : {}), ...(q.wx ? { weatherFee:q.wx } : {}) } : {}), distanceKm:km, total:fee, payment:'cash', status:'pending', shipCallId:c.id };
    sf.busy = true; draw();
    try {
      const ref = await fb.placeOrder(o); fb.notifyNewOrder(ref.id, o);
      // Lưu vị trí khách NGAY (dùng bản sao tọa độ): patchShipCall bên dưới làm yêu cầu rời danh sách "new" → listener đặt sf = null → đọc sf.pt sau đó sẽ lỗi "reading 'pt'"
      try { const sv = { lat:pt.lat, lng:pt.lng, link:mapLink(pt.lat, pt.lng), lastShop:c.shopName || '' }; await fb.saveShipCustomer(phone, sv); savedLoc[fb.shipPhoneKey(phone)] = sv; } catch (e) { console.warn('Chưa lưu được vị trí khách', e); setTimeout(() => toast('Đơn đã tạo nhưng CHƯA lưu được vị trí khách (kiểm tra đã dán firestore.rules mới chưa): ' + fb.errMsg(e)), 2500); }   // lần sau cùng SĐT: có sẵn vị trí
      await fb.patchShipCall(c.id, { status:'ordered', orderId:ref.id, orderCode:o.code });
      toast('Đã tạo đơn ' + o.code + ' và báo shipper'); sf = null;
    } catch (er) { toast(fb.errMsg(er)); if (sf) sf.busy = false; }
    draw();
  }
  root.addEventListener('input', e => {
    if (!sf || !e.target.id || !e.target.id.startsWith('sf-')) return;
    const k = { 'sf-link':'link', 'sf-phone':'phone', 'sf-cod':'cod', 'sf-fee':'fee', 'sf-payer':'payer', 'sf-note':'note' }[e.target.id]; if (!k) return;
    sf[k] = e.target.value; if (k === 'fee') sf.feeTouched = true; if (k === 'link') sfReadLink(false);
  });
  root.addEventListener('change', e => { if (sf && e.target.id === 'sf-link') sfReadLink(true); if (sf && e.target.id === 'sf-payer') sf.payer = e.target.value; });
  root.addEventListener('click', async e => {
    const o = e.target.closest('[data-sfopen]');
    if (o) { const c = shipCalls.find(x => x.id === o.dataset.sfopen); if (!c) return; sfInit(c);
      draw(); setTimeout(() => { const f = $('#sf-form'); if (f) f.scrollIntoView({ behavior:'smooth', block:'start' }); }, 50); return; }
    const qk = e.target.closest('[data-sfquick]');
    if (qk) { const c = shipCalls.find(x => x.id === qk.dataset.sfquick); if (!c || (sf && sf.busy)) return; sfInit(c); await sfMake(); return; }   // khách cũ: 1 chạm là tạo đơn + báo shipper
    if (e.target.closest('[data-sfclose]')) { sf = null; draw(); return; }
    if (e.target.closest('[data-sfmake]')) { await sfMake(); return; }
    const dn = e.target.closest('[data-sfdone]');
    if (dn) {   // hoàn thành yêu cầu gọi ship NGAY, kể cả khi chưa có link vị trí khách (đã tự gọi shipper / quán tự giao...)
      if (!confirm('Đánh dấu HOÀN THÀNH yêu cầu gọi ship này?\n(Không tạo đơn cho shipper, yêu cầu sẽ rời danh sách chờ.)')) return;
      try { await fb.patchShipCall(dn.dataset.sfdone, { status:'done', doneAt:Date.now() }); if (sf && sf.id === dn.dataset.sfdone) sf = null; toast('Đã hoàn thành yêu cầu gọi ship'); } catch (er) { toast(fb.errMsg(er)); }
      return;
    }
    const d = e.target.closest('[data-sfdel]');
    if (d) { if (!confirm('Bỏ yêu cầu gọi ship này?')) return; try { await fb.patchShipCall(d.dataset.sfdel, { status:'cancelled' }); toast('Đã bỏ yêu cầu'); } catch (er) { toast(fb.errMsg(er)); } }
  });
} };
