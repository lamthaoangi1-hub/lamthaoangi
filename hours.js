/* Giờ mở/đóng cửa tự động của quán (giờ Việt Nam, UTC+7, không có giờ mùa hè).
   Dữ liệu lưu trên quán: autoHours (bật/tắt), openAt/closeAt ("HH:MM" để hiển thị), openMin/closeMin (số phút từ 0h, để so sánh và để Firestore Rules kiểm tra).
   Quy ước: open === false là công tắc TỔNG (đóng cả ngày). Khi autoHours bật, quán chỉ nhận đơn trong khung giờ. Giờ mở = giờ đóng nghĩa là mở cả ngày. */

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');

/* "6:30", "06:30", "6h30", "6h", 0.25 (ô giờ của Excel) → số phút từ 0h; sai định dạng → null */
export function toMin(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    if (v >= 0 && v < 1) return Math.round(v * 1440) % 1440;             // Excel lưu giờ dạng phân số của ngày
    return null;
  }
  const m = /^(\d{1,2})\s*(?:[:hH]|giờ)\s*(\d{1,2})?\s*(?:p|phút)?$/.exec(String(v).trim());
  if (!m) return null;
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  return h > 23 || mi > 59 ? null : h * 60 + mi;
}
export const fmtMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const nowMinVN = (now = new Date()) => Math.floor(((now.getTime() + 7 * 3600000) % 86400000) / 60000);
const inWindow = (n, o, c) => o === c ? true : o < c ? (n >= o && n < c) : (n >= o || n < c);

export const hoursOf = s => (s && s.autoHours && Number.isInteger(s.openMin) && Number.isInteger(s.closeMin)) ? { o:s.openMin, c:s.closeMin } : null;
export const isOpenNow = (s, now) => { if (!s || s.open === false) return false; const h = hoursOf(s); return h ? inWindow(nowMinVN(now), h.o, h.c) : true; };
export const hoursText = s => { const h = hoursOf(s); return h ? `${fmtMin(h.o)} – ${fmtMin(h.c)}` : ''; };

/* Trường lưu vào Firestore. Không bao giờ trả undefined (Firestore từ chối). */
export function hoursFields(openAt, closeAt, auto) {
  const o = toMin(openAt), c = toMin(closeAt);
  if (o == null || c == null) return { autoHours:false };
  return { autoHours:!!auto, openAt:fmtMin(o), closeAt:fmtMin(c), openMin:o, closeMin:c };
}

/* Khối nhập giờ dùng chung cho form quán của Admin và Nhà bán hàng (p = tiền tố id) */
export const hoursFormHtml = (s = {}, p = 'f') => `<div class="card" style="background:#f6faf7;margin:12px 0 0">
  <label class="sw" style="margin:0"><input type="checkbox" id="${p}-auto" ${s.autoHours ? 'checked' : ''}>⏰ Tự động mở/đóng cửa theo giờ</label>
  <div class="grid" style="margin-top:8px"><label class="f">Giờ mở cửa<input type="time" id="${p}-openat" value="${esc(s.openAt || '')}"></label><label class="f">Giờ đóng cửa<input type="time" id="${p}-closeat" value="${esc(s.closeAt || '')}"></label></div>
  <p class="muted" style="margin:6px 0 0">Ngoài khung giờ này, quán tự hiện “Đóng cửa” và khách không đặt được món (giờ Việt Nam). Có thể qua đêm, ví dụ 17:00 → 02:00. Công tắc “Đang mở cửa” bên dưới là công tắc tổng: tắt = đóng cả ngày.</p></div>`;

/* Đọc khối nhập giờ → { fields } hoặc { error } */
export function readHours(p = 'f', root = document) {
  const g = id => root.querySelector('#' + p + '-' + id);
  if (!g('auto')) return { fields:{} };
  const auto = g('auto').checked, o = g('openat').value, c = g('closeat').value;
  if (auto && (toMin(o) == null || toMin(c) == null)) return { error:'Bật tự động đóng cửa thì phải nhập đủ giờ mở và giờ đóng' };
  return { fields:hoursFields(o, c, auto) };
}
