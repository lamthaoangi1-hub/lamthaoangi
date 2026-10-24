/* Service worker nhận thông báo đẩy (FCM) khi khách đóng web / tắt màn hình. Phải nằm ở THƯ MỤC GỐC của website. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC9jqo52PyA3QT51XGCyWcOs0ViC1fL-a0",
  authDomain: "lamthaoangi1-c01cb.firebaseapp.com",
  projectId: "lamthaoangi1-c01cb",
  storageBucket: "lamthaoangi1-c01cb.firebasestorage.app",
  messagingSenderId: "1067058518240",
  appId: "1:1067058518240:web:9acd669be11b5061805885"
});

/* Có khởi tạo messaging thì trình duyệt tự hiện thông báo (tiêu đề, nội dung, biểu tượng) và mở đúng link khi khách bấm vào. */
firebase.messaging();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
