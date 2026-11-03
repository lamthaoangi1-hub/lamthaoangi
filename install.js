/* ============================================================
   Nút "Tải App" – cài web lên màn hình chính của điện thoại (PWA)
   - Android/Chrome/Edge/Samsung: bấm là hiện hộp thoại cài đặt của máy → Cài đặt → icon ra màn hình chính.
   - iPhone (Safari): Apple không cho web tự cài → hiện hướng dẫn 2 bước (Chia sẻ → Thêm vào MH chính).
   - Mở trong Zalo/Facebook/Messenger: các trình duyệt này không cài được → hướng dẫn mở bằng Chrome/Safari.
   - Đã cài rồi (mở từ icon) → nút tự ẩn.
   Không đụng tới dữ liệu / đơn hàng / Firebase.
   ============================================================ */
(() => {
  'use strict';
  let deferred = null;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = /Zalo|FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|MicroMessenger|TikTok|Twitter/i.test(ua);
  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

  /* Chrome chỉ bắn sự kiện này 1 lần → phải bắt ngay từ đầu */
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; hideFab(); toastMsg('Đã cài ứng dụng ra màn hình chính 🎉'); });

  /* Đăng ký service worker sớm (cùng file với thông báo đẩy, không xin quyền gì) để Chrome nhận ra web là app cài được */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('firebase-messaging-sw.js', { updateViaCache: 'none' }).catch(() => {}); });
  }

  const $ = id => document.getElementById(id);
  const hideFab = () => { const f = $('install-fab'); if (f) f.hidden = true; };
  function toastMsg(msg) {
    const t = $('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastMsg._t); toastMsg._t = setTimeout(() => t.classList.remove('show'), 2400);
  }

  const SHARE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0a84ff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-4px"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  const row = (n, html) => `<div class="ia-step"><b>${n}</b><span>${html}</span></div>`;

  function sheetHtml() {
    let body;
    if (inApp) {
      body = isIOS
        ? `<div class="sub">Trình duyệt trong Zalo/Facebook không cài được app. Hãy mở bằng Safari:</div>${row(1, 'Bấm nút <b>⋯</b> hoặc <b>Chia sẻ</b> góc màn hình')}${row(2, 'Chọn <b>Mở bằng Safari</b>')}${row(3, `Trong Safari bấm ${SHARE_SVG} → <b>Thêm vào MH chính</b>`)}`
        : `<div class="sub">Trình duyệt trong Zalo/Facebook không cài được app. Hãy mở bằng Chrome:</div>${row(1, 'Bấm nút <b>⋮</b> hoặc <b>⋯</b> góc màn hình')}${row(2, 'Chọn <b>Mở bằng trình duyệt</b> / <b>Mở bằng Chrome</b>')}${row(3, 'Bấm lại <b>Tải App</b> để cài')}`;
    } else if (isIOS) {
      body = `<div class="sub">iPhone cài theo 2 bước (Apple không cho web tự cài):</div>${row(1, `Bấm nút <b>Chia sẻ</b> ${SHARE_SVG} ở thanh dưới của Safari`)}${row(2, 'Kéo xuống chọn <b>Thêm vào MH chính</b> → bấm <b>Thêm</b>')}<div class="ia-note">Icon “Lâm Thao Ăn Gì?” sẽ hiện ngay trên màn hình chính.</div>`;
    } else {
      body = `<div class="sub">Làm theo 2 bước:</div>${row(1, 'Bấm nút <b>⋮</b> (3 chấm) góc trên của trình duyệt')}${row(2, 'Chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b>')}<div class="ia-note">Nếu không thấy mục này, có thể ứng dụng đã được cài trên máy bạn.</div>`;
    }
    return `<div class="grab"></div><h3>Tải app Lâm Thao Ăn Gì?</h3>${body}<button class="sheet-btn" data-ia-close>Đã hiểu</button>`;
  }

  function openHelp() {
    const s = $('install-sheet'), b = $('install-backdrop'); if (!s || !b) return;
    s.innerHTML = sheetHtml(); s.hidden = false; b.hidden = false;
  }
  function closeHelp() { const s = $('install-sheet'), b = $('install-backdrop'); if (s) s.hidden = true; if (b) b.hidden = true; }

  async function onTap() {
    if (deferred) {                       // Android / Chrome / Edge: cài thẳng
      const p = deferred; deferred = null;
      try {
        p.prompt();
        const r = await p.userChoice;
        if (r && r.outcome === 'accepted') { hideFab(); toastMsg('Đang cài ứng dụng ra màn hình chính…'); }
      } catch (e) { openHelp(); }
      return;
    }
    openHelp();                           // iPhone / trình duyệt trong app / chưa có lời mời cài → hướng dẫn
  }

  function init() {
    const f = $('install-fab'); if (!f) return;
    if (isStandalone()) { f.hidden = true; return; }
    f.hidden = false;
    f.addEventListener('click', onTap);
    const b = $('install-backdrop'); if (b) b.addEventListener('click', closeHelp);
    const s = $('install-sheet'); if (s) s.addEventListener('click', e => { if (e.target.closest('[data-ia-close]')) closeHelp(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
