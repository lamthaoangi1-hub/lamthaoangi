/* Nhập dữ liệu quán + thực đơn từ file Excel (Google Sheet) của website cũ.
   Cấu trúc đọc được: tab "Quán", tab "<Tên quán>.Q" (thực đơn từng quán), tab "Thực đơn" (nếu có),
   tab "Đánh giá" (tính điểm sao), tab "Cài đặt" (phí ship / mức freeship). */

import { hoursFields, toMin } from './hours.js?v=20261022a';

const clean = v => (v == null ? '' : String(v)).trim();
export const norm = s => clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ');

/* Link Google Drive (…/file/d/ID/view) → link ảnh hiển thị được, cùng dạng với ảnh tải lên từ web mới */
export const driveUrl = u => {
  u = clean(u);
  const m = u.match(/\/d\/([\w-]{15,})|[?&]id=([\w-]{15,})/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1] || m[2]}=w900`;
  return /^https?:\/\//.test(u) ? u : '';
};

const col = (head, ...names) => { const h = (head || []).map(norm); for (const n of names) { const i = h.indexOf(n); if (i >= 0) return i; } return -1; };
const num = v => { if (typeof v === 'number') return v; const n = parseFloat(clean(v).replace(/[^\d.]/g, '')); return isNaN(n) ? 0 : n; };
const digits = v => { const d = clean(v).replace(/[^\d]/g, ''); return d.length === 9 ? '0' + d : d; };   // Excel hay làm mất số 0 đầu

export function parseWorkbook(sheets, existingNames = []) {
  const names = Object.keys(sheets);
  const sheetOf = n => sheets[names.find(k => norm(k) === norm(n))] || [];

  /* Cài đặt chung */
  const cfg = {};
  sheetOf('Cài đặt').slice(1).forEach(r => { if (r && r[0]) cfg[norm(r[0])] = r[1]; });
  const shipFee = num(cfg.ship) || 15000, freeShipMin = num(cfg.free) || 0;

  /* Đánh giá → điểm trung bình + số lượt theo quán */
  const rv = sheetOf('Đánh giá'), rh = rv[0] || [], cQ = col(rh, 'quan'), cS = col(rh, 'so sao'), cK = col(rh, 'khach');
  const byCust = {};                                   // mỗi khách chỉ tính 1 lượt cho mỗi quán (giống web cũ)
  rv.slice(1).forEach(r => { const q = norm(r?.[cQ]), s = num(r?.[cS]); if (q && s > 0) (byCust[q] ||= {})[norm(r?.[cK]) || 'an danh'] = s; });
  const stars = Object.fromEntries(Object.entries(byCust).map(([q, o]) => [q, Object.values(o)]));

  /* Thực đơn từng quán: tab "<tên quán>.Q" (Google Sheet cắt tên tab tối đa 31 ký tự) */
  const parseMenu = rows => {
    const h = rows[0] || [], cN = col(h, 'mon'), cP = col(h, 'gia'), cH = col(h, 'hien', 'con ban'), cI = col(h, 'anh'), cG = col(h, 'nhom', 'danh muc');
    return rows.slice(1).map(r => {
      const name = clean(r?.[cN]); if (!name) return null;
      const st = norm(r?.[cH]); if (['khong', 'an', 'x'].includes(st)) return null;       // món đang ẩn → bỏ
      return { name, price: Math.max(0, Math.round(num(r?.[cP]))), available: st !== 'het', cat: clean(r?.[cG]), img: driveUrl(r?.[cI]) };
    }).filter(Boolean);
  };
  /* Tab thực đơn = tab nào có cột "Món" + "Giá" (tên tab đôi khi bị Google cắt mất đuôi ".Q") */
  const tabs = names.filter(n => norm(n) !== 'thuc don' && col(sheets[n]?.[0], 'mon') >= 0 && col(sheets[n]?.[0], 'gia') >= 0)
    .map(n => ({ base: norm(n.replace(/\.q$/i, '')), rows: sheets[n] }));
  const tabFor = name => { const k = norm(name); return tabs.find(t => t.base === k) || tabs.find(t => t.base.length >= 25 && k.startsWith(t.base)); };

  /* Tab "Thực đơn" chung (cột Quán, Món, Giá, Mô tả, Emoji, Hiện, Ảnh) */
  const common = {};
  const cm = sheetOf('Thực đơn'), ch = cm[0] || [], cmQ = col(ch, 'quan');
  if (cmQ >= 0) cm.slice(1).forEach(r => { const k = norm(r?.[cmQ]); if (k) (common[k] ||= []).push(r); });

  /* Danh sách quán */
  const q = sheetOf('Quán'), h = q[0] || [];
  const cName = col(h, 'ten quan', 'quan'), cLogo = col(h, 'logo'), cDesc = col(h, 'mo ta'), cShow = col(h, 'hien'), cPhone = col(h, 'sdt chu quan'), cWait = col(h, 'cho duyet');
  /* Cột tùy chọn của file mẫu mới (tải ở nút “File mẫu”) */
  const cType = col(h, 'loai', 'nhom loc'), cPh2 = col(h, 'sdt', 'sdt quan'), cAddr = col(h, 'dia chi'), cEta = col(h, 'thoi gian giao'), cShip = col(h, 'phi ship'),
    cFree = col(h, 'freeship tu', 'mien phi ship tu'), cSale = col(h, 'giam gia', 'giam'), cOpen = col(h, 'gio mo cua', 'gio mo'), cClose = col(h, 'gio dong cua', 'gio dong');
  const have = new Set(existingNames.map(norm));
  const shops = [];
  q.slice(1).forEach(r => {
    const name = clean(r?.[cName]); if (!name) return;
    let menu = [];
    const t = tabFor(name); if (t) menu = parseMenu(t.rows);
    if (common[norm(name)]) menu = menu.concat(parseMenu([ch, ...common[norm(name)]]));
    const typeTxt = cType >= 0 ? clean(r[cType]) : '';
    const desc = clean(r[cDesc]);
    const group = [...new Set((typeTxt || desc).split(/\s*[-·•,.]\s*/).map(x => x.trim()).filter(Boolean))].slice(0, 4);
    const rs = stars[norm(name)] || [];
    const data = {
      name, cat: group.join(' • '), group, desc: cType >= 0 ? desc : '', img: driveUrl(r[cLogo]),
      phone: digits(cPh2 >= 0 && clean(r[cPh2]) ? r[cPh2] : r[cPhone]), address: cAddr >= 0 ? clean(r[cAddr]) : '', eta: (cEta >= 0 && clean(r[cEta])) || '15 - 30 phút',
      shipFee: cShip >= 0 && clean(r[cShip]) !== '' ? num(r[cShip]) : shipFee, freeShipMin: cFree >= 0 && clean(r[cFree]) !== '' ? num(r[cFree]) : freeShipMin,
      sale: cSale >= 0 ? Math.min(90, Math.max(0, Math.round(num(r[cSale])))) : 0,
      rate: rs.length ? Math.round(rs.reduce((a, b) => a + b, 0) / rs.length * 10) / 10 : 0, rc: rs.length ? String(rs.length) : '',
      open: true, menu,
      ...(cOpen >= 0 && cClose >= 0 ? hoursFields(r[cOpen], r[cClose], toMin(r[cOpen]) != null && toMin(r[cClose]) != null) : {}),
    };
    const hidden = norm(r[cShow]) === 'khong', pending = !!norm(r[cWait]);
    const demo = cType < 0 && !data.img && !menu.some(m => m.img);   // file mẫu mới thì không coi quán không ảnh là quán mẫu
    const exists = have.has(norm(name));
    const notes = [];
    if (exists) notes.push('đã có trên web mới');
    if (hidden) notes.push('đang ẩn ở web cũ');
    if (pending) notes.push('chờ duyệt');
    if (demo && !exists) notes.push('không có ảnh – có thể là quán mẫu');
    if (!menu.length) notes.push('chưa có món');
    if (data.autoHours) notes.push(`tự đóng cửa ngoài giờ ${data.openAt}–${data.closeAt}`);
    shops.push({ data, notes, on: !exists && !hidden && !pending && !demo });
  });
  return { shops, shipFee, freeShipMin };
}


/* Dán danh sách quán: mỗi dòng 1 quán, các cột cách nhau bằng | hoặc Tab (dán thẳng từ Excel được):
   Tên quán | Loại (VD: Phở, Món Việt) | SĐT | Địa chỉ | Giờ mở | Giờ đóng     – chỉ tên quán là bắt buộc */
export function parseShopsText(text, existingNames = [], shipFee = 15000) {
  const have = new Set(existingNames.map(norm)), seen = new Set(), shops = [], bad = [];
  String(text || '').split(/\r?\n/).forEach(raw => {
    const line = raw.trim(); if (!line) return;
    const p = (line.includes('\t') ? line.split('\t') : line.split('|')).map(x => x.trim());
    const name = p[0].slice(0, 80);
    if (!name || norm(name) === 'ten quan') return;                       // bỏ dòng tiêu đề nếu có
    const hf = (p[4] || p[5]) ? hoursFields(p[4], p[5], toMin(p[4]) != null && toMin(p[5]) != null) : {};
    const badHours = !!(p[4] || p[5]) && !hf.autoHours;
    if (badHours) bad.push(`${name}: giờ mở/đóng không hợp lệ (nhập dạng 06:00)`);
    const group = [...new Set((p[1] || '').split(/\s*[-·•,]\s*/).map(x => x.trim()).filter(Boolean))].slice(0, 4);
    const exists = have.has(norm(name)) || seen.has(norm(name)); seen.add(norm(name));
    const notes = ['chưa có món (thêm ở nút “Sửa”)']; if (exists) notes.unshift('đã có / trùng tên'); if (hf.autoHours) notes.push(`tự đóng cửa ngoài giờ ${hf.openAt}–${hf.closeAt}`); if (badHours) notes.push('giờ mở/đóng không hợp lệ nên bỏ qua (dạng đúng: 06:00)');
    shops.push({ data:{ name, cat:group.join(' • '), group, desc:'', img:'', phone:digits(p[2]), address:(p[3] || '').slice(0, 200), eta:'15 - 30 phút', shipFee, freeShipMin:0, sale:0, rate:0, rc:'', open:true, menu:[], ...hf }, notes, on:!exists });
  });
  return { shops, bad };
}
