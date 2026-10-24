/* Nhập hàng loạt: dán danh sách món / đọc file Excel, và tải file Excel mẫu.
   Dùng chung cho Admin và Nhà bán hàng (trình sửa thực đơn) và Admin (nhập nhiều quán). */
import { norm, driveUrl } from './import-sheet.js?v=20261024b';

export const loadXLSX = () => window.XLSX ? Promise.resolve(window.XLSX) : new Promise((ok, no) => {
  const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload = () => ok(window.XLSX); s.onerror = () => no(new Error('Không tải được thư viện đọc Excel, kiểm tra mạng')); document.head.appendChild(s);
});

/* Đọc file Excel/CSV → { tên tab: mảng dòng } */
export async function readSheets(file) {
  const X = await loadXLSX(), wb = X.read(await file.arrayBuffer(), { type:'array' }), sheets = {};
  wb.SheetNames.forEach(n => { sheets[n] = X.utils.sheet_to_json(wb.Sheets[n], { header:1, defval:null }); });
  return sheets;
}

/* Giá: 45000, "45.000đ", "45,000", "45k", "45.5k" → số nguyên (đ) */
export function parsePrice(v) {
  if (typeof v === 'number') return Math.max(0, Math.round(v));
  const s = String(v ?? '').trim().toLowerCase();
  const k = /^([\d.,]+)\s*(k|nghìn|ngàn)$/.exec(s);
  if (k) { const n = parseFloat(k[1].replace(',', '.')); return isNaN(n) ? 0 : Math.round(n * 1000); }
  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}
const hasPrice = v => typeof v === 'number' || /\d/.test(String(v ?? ''));

/* Dán danh sách món. Mỗi dòng 1 món, các dạng đều được:
     Phở bò tái | 55000 | Món chính      (| hoặc Tab hoặc ; – dán thẳng từ Excel được)
     Trà đá - 10k
     Cơm sườn 45.000                         */
export function parseMenuText(text) {
  const items = [], bad = [];
  String(text || '').split(/\r?\n/).forEach(raw => {
    const line = raw.trim(); if (!line) return;
    let parts = null;
    for (const sep of ['\t', '|', ';']) if (line.includes(sep)) { parts = line.split(sep).map(x => x.trim()); break; }
    if (!parts) {
      const m = /^(.+?)[\s:–—-]+(\d[\d.,]*\s*(?:k|nghìn|ngàn|đ|vnđ|vnd|d)?)\s*$/i.exec(line);
      parts = m ? [m[1].trim(), m[2].trim()] : [line];
    }
    const name = (parts[0] || '').slice(0, 80);
    if (!name || ['ten mon', 'mon'].includes(norm(name))) return;       // bỏ dòng tiêu đề nếu có
    if (!hasPrice(parts[1])) return bad.push(line);
    items.push({ name, price:parsePrice(parts[1]), available:true, cat:(parts[2] || '').slice(0, 40), img:'' });
  });
  return { items, bad };
}

const colOf = (head, ...names) => { const h = head.map(norm); for (const n of names) { const i = h.indexOf(n); if (i >= 0) return i; } return -1; };
const OFF = ['het', 'khong', 'x', '0', 'no', 'false', 'n', 'an'];

/* Đọc thực đơn từ các dòng của 1 tab Excel (có hoặc không có dòng tiêu đề) */
export function parseMenuRows(rows) {
  const items = [], bad = [];
  rows = (rows || []).filter(r => r && r.some(c => c != null && String(c).trim() !== ''));
  if (!rows.length) return { items, bad };
  let cN = colOf(rows[0], 'mon', 'ten mon', 'ten'), cP = colOf(rows[0], 'gia', 'gia ban', 'don gia');
  const hasHead = cN >= 0 && cP >= 0;
  const cC = hasHead ? colOf(rows[0], 'nhom', 'danh muc', 'nhom mon') : 2, cI = hasHead ? colOf(rows[0], 'anh') : -1, cA = hasHead ? colOf(rows[0], 'con ban', 'hien') : -1;
  if (!hasHead) { cN = 0; cP = 1; }
  rows.slice(hasHead ? 1 : 0).forEach(r => {
    const name = String(r[cN] ?? '').trim().slice(0, 80); if (!name) return;
    if (!hasPrice(r[cP])) return bad.push(name);
    items.push({ name, price:parsePrice(r[cP]), available:cA < 0 || !OFF.includes(norm(r[cA])), cat:cC >= 0 ? String(r[cC] ?? '').trim().slice(0, 40) : '', img:cI >= 0 ? driveUrl(r[cI]) : '' });
  });
  return { items, bad };
}

/* File Excel có nhiều tab → lấy tab đầu tiên có món */
export function parseMenuSheets(sheets) {
  for (const n of Object.keys(sheets)) { const r = parseMenuRows(sheets[n]); if (r.items.length || r.bad.length) return r; }
  return { items:[], bad:[] };
}

/* ---- Tải file Excel mẫu ---- */
async function saveAoa(file, tabs) {
  const X = await loadXLSX(), wb = X.utils.book_new();
  tabs.forEach(([name, aoa, widths]) => { const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = widths.map(w => ({ wch:w })); X.utils.book_append_sheet(wb, ws, name); });
  X.writeFile(wb, file);
}
export const downloadMenuTemplate = () => saveAoa('mau-thuc-don.xlsx', [['Thực đơn', [
  ['Món', 'Giá', 'Nhóm', 'Còn bán'], ['Phở bò tái', 55000, 'Món chính', 'có'], ['Phở bò chín', 55000, 'Món chính', 'có'], ['Trà đá', 5000, 'Đồ uống', 'có'], ['Quẩy', 10000, 'Ăn kèm', 'hết'],
], [30, 12, 18, 10]]]);
export const downloadShopTemplate = () => saveAoa('mau-nhap-quan.xlsx', [
  ['Quán', [
    ['Tên quán', 'Loại', 'SĐT', 'Địa chỉ', 'Thời gian giao', 'Phí ship', 'Freeship từ', 'Giảm giá', 'Giờ mở cửa', 'Giờ đóng cửa', 'Mô tả'],
    ['Phở Bò Lâm Thao', 'Phở, Món Việt', '0912345678', 'Thị trấn Lâm Thao', '15 - 25 phút', 15000, 100000, 0, '06:00', '21:00', 'Phở bò gia truyền'],
    ['Trà Sữa Chill', 'Trà sữa, Đồ uống', '0987654321', 'Khu 3, Lâm Thao', '15 - 30 phút', 15000, 0, 10, '09:00', '22:00', ''],
  ], [24, 22, 14, 28, 16, 10, 12, 10, 12, 13, 30]],
  ['Thực đơn', [
    ['Quán', 'Món', 'Giá', 'Nhóm', 'Còn bán'],
    ['Phở Bò Lâm Thao', 'Phở bò tái', 55000, 'Món chính', 'có'], ['Phở Bò Lâm Thao', 'Trà đá', 5000, 'Đồ uống', 'có'],
    ['Trà Sữa Chill', 'Trà sữa trân châu', 30000, 'Trà sữa', 'có'], ['Trà Sữa Chill', 'Hồng trà macchiato', 35000, 'Trà sữa', 'có'],
  ], [24, 28, 12, 16, 10]],
]);
