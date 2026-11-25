/* Đăng hàng loạt từ ảnh (cửa hàng Thời trang).
   Chọn nhiều ảnh -> mỗi ảnh = 1 sản phẩm. Hàng đợi chạy song song vừa phải:
   B1. aiProduct : lưu ảnh gốc lên Drive + AI nhìn ảnh, trả tên / nhóm / màu / chất liệu / mô tả (nhanh, 3-6 giây/ảnh)
   B2. aiEnhance : (tùy chọn) AI đặt sản phẩm lên nền thương hiệu (chậm, 15-30 giây/ảnh) */

/* Chạy tasks với tối đa `limit` việc cùng lúc; hỗ trợ hủy */
export async function pool(items, limit, worker, ctl = {}) {
  let i = 0;
  const run = async () => { while (!ctl.cancel) { const k = i++; if (k >= items.length) return; await worker(items[k], k); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

/* Gọi Apps Script, tự thử lại khi lỗi mạng / quá tải (tối đa 3 lần, chờ tăng dần) */
export async function callApi(url, payload, tries = 3) {
  let last;
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
      const j = await res.json().catch(() => null);
      if (!j) throw new Error('Máy chủ trả dữ liệu lạ');
      if (j.ok || j.quota) return j;                       // quota: không thử lại
      last = new Error(j.error || 'Lỗi không rõ');
      if (/quyền|hết hạn|đăng nhập/i.test(last.message)) throw last;
    } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 1500 * (t + 1)));
  }
  throw last;
}

/* Gom nhóm để đặt giá nhanh: { 'Áo len': [index, ...] } */
export const groupByCat = rows => rows.reduce((o, r, i) => ((o[r.cat || 'Khác'] ||= []).push(i), o), {});
