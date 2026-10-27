/* Service worker nhận thông báo đẩy (FCM) khi khách ĐÃ THOÁT WEB / đóng tab / tắt màn hình.
   Phải nằm ở THƯ MỤC GỐC của website (cạnh index.html).
   Bản cập nhật 27/10/2026: tự hiển thị thông báo bằng onBackgroundMessage (không phụ thuộc
   cách trình duyệt tự suy diễn payload) + bấm vào thông báo thì mở đúng trang Đơn hàng,
   đang mở sẵn web thì chỉ chuyển tab tới, không mở thêm tab mới. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDTEnwNynk64jo16itXPPLFv3Bj-XOIMSk",
  authDomain: "lamthaoangi1-c01cb.firebaseapp.com",
  projectId: "lamthaoangi1-c01cb",
  storageBucket: "lamthaoangi1-c01cb.firebasestorage.app",
  messagingSenderId: "1067058518240",
  appId: "1:1067058518240:web:9acd669be11b5061805885"
});

const messaging = firebase.messaging();

/* Tin đẩy tới khi web đang đóng: tự hiện thông báo hệ thống.
   Nội dung (tiêu đề + thân tin, gồm tên/SĐT shipper khi shipper nhận đơn) do Apps Script
   đặt trong payload.notification; tag + link mở đơn nằm trong payload.data. */
messaging.onBackgroundMessage(payload => {
  const n = (payload && payload.notification) || {};
  const d = (payload && payload.data) || {};
  const title = n.title || 'Lâm Thao Ăn Gì?';
  const body = n.body || d.body || '';
  return self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.tag || 'order-update',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: d.url || '/#orders' }
  });
});

/* Bấm vào thông báo: mở / chuyển tới trang đơn hàng */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/#orders';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      try {
        const u = new URL(c.url);
        if (u.origin === self.location.origin) {
          if (u.hash !== '#orders' && 'navigate' in c) { try { await c.navigate(url); } catch (err) {} }
          return c.focus();
        }
      } catch (err) {}
    }
    return self.clients.openWindow(url);
  })());
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
