/* Nhập dữ liệu quán + thực đơn từ file Excel (Google Sheet) của website cũ.
   Cấu trúc đọc được: tab "Quán", tab "<Tên quán>.Q" (thực đơn từng quán), tab "Thực đơn" (nếu có),
   tab "Đánh giá" (tính điểm sao), tab "Cài đặt" (phí ship / mức freeship). */

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
const digits = v => clean(v).replace(/[^\d]/g, '');

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
    const h = rows[0] || [], cN = col(h, 'mon'), cP = col(h, 'gia'), cH = col(h, 'hien'), cI = col(h, 'anh'), cG = col(h, 'nhom', 'danh muc');
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
  const cName = col(h, 'ten quan'), cLogo = col(h, 'logo'), cDesc = col(h, 'mo ta'), cShow = col(h, 'hien'), cPhone = col(h, 'sdt chu quan'), cWait = col(h, 'cho duyet');
  const have = new Set(existingNames.map(norm));
  const shops = [];
  q.slice(1).forEach(r => {
    const name = clean(r?.[cName]); if (!name) return;
    let menu = [];
    const t = tabFor(name); if (t) menu = parseMenu(t.rows);
    if (common[norm(name)]) menu = menu.concat(parseMenu([ch, ...common[norm(name)]]));
    const desc = clean(r[cDesc]);
    const group = [...new Set(desc.split(/\s*[-·•,.]\s*/).map(x => x.trim()).filter(Boolean))].slice(0, 4);
    const rs = stars[norm(name)] || [];
    const data = {
      name, cat: group.join(' • '), group, desc: '', img: driveUrl(r[cLogo]),
      phone: digits(r[cPhone]), address: '', eta: '15 - 30 phút', shipFee, freeShipMin, sale: 0,
      rate: rs.length ? Math.round(rs.reduce((a, b) => a + b, 0) / rs.length * 10) / 10 : 0, rc: rs.length ? String(rs.length) : '',
      open: true, menu,
    };
    const hidden = norm(r[cShow]) === 'khong', pending = !!norm(r[cWait]);
    const demo = !data.img && !menu.some(m => m.img);
    const exists = have.has(norm(name));
    const notes = [];
    if (exists) notes.push('đã có trên web mới');
    if (hidden) notes.push('đang ẩn ở web cũ');
    if (pending) notes.push('chờ duyệt');
    if (demo && !exists) notes.push('không có ảnh – có thể là quán mẫu');
    if (!menu.length) notes.push('chưa có món');
    shops.push({ data, notes, on: !exists && !hidden && !pending && !demo });
  });
  return { shops, shipFee, freeShipMin };
}
