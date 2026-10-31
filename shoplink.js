/* Link riêng từng quán: https://lamthaoangi.io.vn/?quan=<tên-quán-không-dấu> – khách bấm vào là mở thẳng trang quán đó để đặt món. */
export const slugOf = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const siteBase = () => location.origin + location.pathname.replace(/[^/]*$/, '');
/* Dùng tên quán không dấu; nếu 2 quán trùng tên (hoặc tên rỗng) thì dùng mã quán để link không bị nhầm */
export function shopLink(shop, shops) {
  const sl = slugOf(shop.name), dup = !sl || shops.some(x => x.id !== shop.id && slugOf(x.name) === sl);
  return siteBase() + '?quan=' + encodeURIComponent(dup ? shop.id : sl);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) { try { prompt('Sao chép link dưới đây:', text); } catch (e2) {} return false; }
}
