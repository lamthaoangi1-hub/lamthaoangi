/* ============================================================
   Lâm Thao Ăn Gì? – Web app (HTML/CSS/JS thuần, không cần build)
   Chỉnh dữ liệu ở phần DATA bên dưới.
   ============================================================ */
(() => {
  'use strict';

  /* ---------------- ICONS ---------------- */
  const P = {
    chevDown:'<path d="M6 9l6 6 6-6"/>',
    chevRight:'<path d="M9 5l7 7-7 7"/>',
    chevLeft:'<path d="M15 5l-7 7 7 7"/>',
    arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    sliders:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    truck:'<path d="M2.5 7h10v9h-10zM12.5 10h4.2l3 3v3h-7.2"/><circle cx="6.5" cy="17.5" r="1.7"/><circle cx="16.5" cy="17.5" r="1.7"/>',
    heart:'<path d="M12 20s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.400 4.300 4.300 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10z"/>',
    home:'<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    clipboard:'<rect x="5" y="4" width="14" height="17" rx="2.500"/><path d="M9 4h6v3H9zM9 11h6M9 15h5"/>',
    chat:'<path d="M3.500 4.500h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.500 3v-3a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" transform="translate(0 -.5)"/><path d="M18.500 8.500h.5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2v3l-3.500-3H11"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.400 3.600-7 8-7s8 2.600 8 7"/>',
    bell:'<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.500 2h-15z"/><path d="M10 21h4"/>',
    clock:'<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
    list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.500" cy="6" r="1"/><circle cx="4.500" cy="12" r="1"/><circle cx="4.500" cy="18" r="1"/>',
    headset:'<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.500"/><rect x="17" y="13" width="4" height="6" rx="1.500"/><path d="M19 19c0 1.500-2 2-5 2"/>',
    shop:'<path d="M4 9l1.500-5h13L20 9M4 9v11h16V9M4 9c0 1.700 1.300 2.500 2.700 2.500S9.300 10.700 9.300 9c0 1.700 1.300 2.500 2.700 2.500s2.700-.8 2.700-2.500c0 1.700 1.300 2.500 2.700 2.500S20 10.700 20 9"/><path d="M10 20v-5h4v5"/>',
    pinS:'<path d="M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19.400 15a1.650 1.650 0 0 0 .33 1.820l.06.060a2 2 0 0 1-2.830 2.830l-.06-.06a1.650 1.650 0 0 0-1.820-.33 1.650 1.650 0 0 0-1 1.510V21a2 2 0 0 1-4 0v-.09A1.650 1.650 0 0 0 9 19.400a1.650 1.650 0 0 0-1.820.33l-.06.06a2 2 0 0 1-2.830-2.830l.06-.06a1.650 1.650 0 0 0 .33-1.820 1.650 1.650 0 0 0-1.510-1H3a2 2 0 0 1 0-4h.09A1.650 1.650 0 0 0 4.600 9a1.650 1.650 0 0 0-.33-1.820l-.06-.06a2 2 0 0 1 2.830-2.830l.06.06a1.650 1.650 0 0 0 1.820.33H9a1.650 1.650 0 0 0 1-1.510V3a2 2 0 0 1 4 0v.09a1.650 1.650 0 0 0 1 1.510 1.650 1.650 0 0 0 1.820-.33l.06-.06a2 2 0 0 1 2.830 2.830l-.06.06a1.650 1.650 0 0 0-.33 1.820V9a1.650 1.650 0 0 0 1.510 1H21a2 2 0 0 1 0 4h-.09a1.650 1.650 0 0 0-1.510 1z"/>',
    login:'<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M4 12h11M11 8l4 4-4 4"/>',
    logout:'<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M9 12h11M16 8l4 4-4 4"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.500 3 14.500 0 18M12 3c-3 3.500-3 14.500 0 18"/>',
    doc:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    check:'<path d="M5 12.500l4.500 4.500L19 7.500"/>',
    refresh:'<path d="M20 11a8 8 0 1 0-2.300 6.300"/><path d="M20 4v7h-7"/>',
    mapPin:'<path d="M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
    camera:'<path d="M4 8h3l1.500-2.500h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>',
    eye:'<path d="M2.500 12S6 6 12 6s9.500 6 9.500 6-3.500 6-9.500 6S2.500 12 2.500 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff:'<path d="M3 3l18 18"/><path d="M10.600 6.200A9.600 9.600 0 0 1 12 6c6 0 9.500 6 9.500 6a16 16 0 0 1-3.200 3.900M6.600 7.600C4 9.200 2.500 12 2.500 12S6 18 12 18c1.500 0 2.800-.3 4-.9"/><path d="M9.900 9.900a3 3 0 0 0 4.200 4.200"/>',
    phone:'<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2.500"/><path d="M3.500 7l8.500 6 8.500-6"/>',
    close:'<path d="M6 6l12 12M18 6L6 18"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
  };
  const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
  const fx = {
    star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.800l2.900 6 6.600.9-4.800 4.600 1.200 6.500L12 17.600 6.100 20.800l1.200-6.500L2.500 9.700l6.600-.9z"/></svg>',
    heartF:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-4.900-8-10.700A4.600 4.600 0 0 1 12 7.400a4.600 4.600 0 0 1 8 2.900C20 16.100 12 21 12 21z"/></svg>',
    pinF:'<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 22s8-6.500 8-12.200A8 8 0 0 0 4 9.800C4 15.500 12 22 12 22zm0-9.500a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>',
    bellF:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.500a6.500 6.500 0 0 0-6.500 6.500v4.200L3.600 16.300a1 1 0 0 0 .8 1.700h15.200a1 1 0 0 0 .8-1.700l-1.900-3.100V9A6.500 6.500 0 0 0 12 2.500zM9.500 19.500a2.500 2.500 0 0 0 5 0z"/></svg>',
    userF:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.500" r="4.500"/><path d="M3 21c0-4.800 4-7.500 9-7.500s9 2.700 9 7.500z"/></svg>',
    lockF:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7.500a5 5 0 0 1 10 0V10h.5A2.500 2.500 0 0 1 20 12.500v7a2.500 2.500 0 0 1-2.500 2.500h-11A2.500 2.500 0 0 1 4 19.500v-7A2.500 2.500 0 0 1 6.500 10zm2.500 0h5V7.500a2.500 2.500 0 0 0-5 0z"/></svg>',
    phoneF:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.900" stroke-linecap="round" stroke-linejoin="round"><rect x="6.500" y="2.500" width="11" height="19" rx="2.500"/><path d="M11 18.500h2"/></svg>',
    walletF:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6.500A2.500 2.500 0 0 1 6.500 4H18a1 1 0 0 1 0 2H6.500a.5.5 0 0 0 0 1H19a2 2 0 0 1 2 2v9a2.500 2.500 0 0 1-2.500 2.500h-12A2.500 2.500 0 0 1 4 18zM16.500 12.500a1.300 1.300 0 1 0 0 2.600 1.300 1.300 0 0 0 0-2.600z"/></svg>',
    ticketF:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7.500A1.500 1.500 0 0 1 4.500 6h15A1.500 1.500 0 0 1 21 7.500V10a2 2 0 0 0 0 4v2.500a1.500 1.500 0 0 1-1.500 1.500h-15A1.500 1.500 0 0 1 3 16.500V14a2 2 0 0 0 0-4zm5.500 1v7h1v-7z"/></svg>',
    crown:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.500 4L12 5l4.500 7L21 8l-2 10H5z"/><rect x="5" y="19" width="14" height="2" rx="1"/></svg>',
    shieldTag:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.500l8 3v6c0 5-3.300 8.800-8 10-4.700-1.200-8-5-8-10v-6z" fill="#12a150"/><path d="M12 8v6M9 11h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    flame:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 2c.5 3.500-2.500 5-2.500 8 0 1 .5 1.800 1.200 2.200C9.500 11.500 8 9.500 8 9.500 6 12 5 14 5 16a7 7 0 0 0 14 0c0-4-3.500-6-4-9-1.200 1-1.800 2-1.800 3.200C12 8 12.800 5 12 2z" fill="#e5322d"/><path d="M12 21a3.500 3.500 0 0 1-3.500-3.500c0-1.800 1.500-2.500 2.500-4 .5 1 1 1.500 1.500 1.500 1 0 1.500-1 1.500-2 1 1.200 1.500 2 1.500 3.500A3.500 3.500 0 0 1 12 21z" fill="#ffd9d6"/></svg>',
    clockF:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f08a1c"/><path d="M12 6.500V12l3.500 2" stroke="#fff" stroke-width="2.200" stroke-linecap="round" fill="none"/></svg>',
    checkF:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#5b616b"/><path d="M7.500 12.500l3 3 6-6.500" stroke="#fff" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
    scooterG:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.900" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.500" cy="17" r="2.500"/><circle cx="18.500" cy="17" r="2.500"/><path d="M8 17h5l2.500-6H12M15.500 11l1.200 6M16 7h-2"/><rect x="2" y="9" width="6" height="5" rx="1" fill="currentColor"/></svg>',
    guestUser:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.500"/><path d="M3.500 21c0-4.500 3.800-7 8.500-7s8.500 2.500 8.500 7z"/></svg>',
    spark:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M14 8l4 8M26 6l-2 9M36 14l-9 5"/></svg>',
    google:'<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.500c3.500 0 6.600 1.200 9.100 3.600l6.800-6.800C35.800 2.400 30.300 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z"/><path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.300 5.500-4.800 7.200l7.500 5.800c4.400-4.100 7.100-10.100 7.100-17.500z"/><path fill="#FBBC05" d="M10.500 28.700A14.500 14.500 0 0 1 9.500 24c0-1.600.3-3.200.9-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>',
    facebook:'<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#1877F2"/><path fill="#fff" d="M33 30.800l1.100-6.800H27.500v-4.400c0-1.900.9-3.700 3.900-3.700h3V10.100s-2.700-.5-5.300-.5c-5.400 0-8.900 3.300-8.900 9.200V24h-6v6.800h6V48h7.400V30.800z"/></svg>',
    apple:'<svg viewBox="0 0 24 24" fill="#000"><path d="M16.400 12.700c0-2.600 2.100-3.800 2.200-3.900-1.200-1.800-3.100-2-3.700-2-1.600-.2-3.100.9-3.900.9s-2-.9-3.300-.9c-1.700 0-3.300 1-4.200 2.500-1.800 3.100-.5 7.700 1.300 10.200.9 1.200 1.900 2.600 3.200 2.500 1.300-.1 1.800-.8 3.300-.8s2 .8 3.300.8c1.400 0 2.300-1.200 3.100-2.400 1-1.400 1.400-2.800 1.400-2.900-.1 0-2.700-1-2.700-4zM13.900 5c.7-.9 1.200-2 1.100-3.200-1 0-2.300.7-3 1.600-.7.800-1.300 2-1.100 3.100 1.200.1 2.300-.6 3-1.500z"/></svg>',
    giftBig:'<svg viewBox="0 0 120 110"><rect x="18" y="48" width="70" height="52" rx="6" fill="#e5322d"/><rect x="12" y="34" width="82" height="20" rx="5" fill="#f04343"/><rect x="47" y="34" width="12" height="66" fill="#ffc928"/><path d="M53 34c-8-18-28-14-22-4 4 6 14 4 22 4zM53 34c8-18 28-14 22-4-4 6-14 4-22 4z" fill="none" stroke="#ffc928" stroke-width="7" stroke-linecap="round"/><g transform="rotate(14 94 78)"><rect x="76" y="62" width="38" height="34" rx="6" fill="#ff8a1f"/><text x="95" y="87" text-anchor="middle" font-family="Arial" font-weight="800" font-size="24" fill="#fff">%</text></g></svg>',
    giftSm:'<svg viewBox="0 0 54 54"><rect x="6" y="22" width="42" height="28" rx="4" fill="#e5322d"/><rect x="3" y="14" width="48" height="12" rx="4" fill="#f04343"/><rect x="24" y="14" width="7" height="36" fill="#ffc928"/><path d="M27 14c-5-10-14-8-11-2 2 3 7 2 11 2zM27 14c5-10 14-8 11-2-2 3-7 2-11 2z" fill="none" stroke="#ffc928" stroke-width="4" stroke-linecap="round"/></svg>',
    coin:'<svg viewBox="0 0 54 54"><circle cx="27" cy="27" r="26" fill="#f6b21b"/><circle cx="27" cy="27" r="20" fill="#ffd45b"/><path d="M27 15l3.500 7.300 8 1.100-5.800 5.600 1.400 8L27 33.100 19.900 37l1.400-8-5.800-5.600 8-1.100z" fill="#f6a312"/></svg>',
    shieldBig:'<svg viewBox="0 0 64 64"><path d="M32 6l22 8v16c0 14-9 24-22 28C19 54 10 44 10 30V14z" fill="#12a150"/><path d="M21 32l8 8 15-16" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
    bellAlert:'<svg viewBox="0 0 64 64"><path d="M32 8a16 16 0 0 0-16 16v12l-5 8h42l-5-8V24A16 16 0 0 0 32 8z" fill="#12a150"/><path d="M26 50a6 6 0 0 0 12 0z" fill="#12a150"/><circle cx="46" cy="14" r="9" fill="#e5322d"/><path d="M46 9.500v6" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="46" cy="19" r="1.700" fill="#fff"/></svg>',
    gearBlue:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h8l5 5v13H6z"/><path d="M9 12h7M9 15.500h7M9 8.500h3" stroke="#fff" stroke-width="1.700" stroke-linecap="round"/></svg>',
    globeP:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.900" stroke-linecap="round"><circle cx="12" cy="12" r="9.500"/><path d="M2.500 12h19M12 2.500c3.500 4 3.500 15 0 19M12 2.500c-3.500 4-3.500 15 0 19"/></svg>',
    phoneO:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.500 3h3l1.500 4.500-2 1.500a11 11 0 0 0 6 6l1.500-2 4.500 1.500v3A2.500 2.500 0 0 1 18.500 20 16.500 16.500 0 0 1 4 5.500 2.500 2.500 0 0 1 6.500 3z"/></svg>',
    bellR:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.500a6.500 6.500 0 0 0-6.500 6.500v4.200L3.600 16.300a1 1 0 0 0 .8 1.700h15.200a1 1 0 0 0 .8-1.700l-1.900-3.100V9A6.500 6.500 0 0 0 12 2.500zM9.500 19.500a2.500 2.500 0 0 0 5 0z"/></svg>',
    // service icons (màu)
    svcScooter:'<svg viewBox="0 0 48 48" fill="#fff"><circle cx="24" cy="9" r="4.500"/><path d="M19 15l-4 8h5l3-3 4 4v7h4v-9l-4-5 2-2 4 2 1.500-3-6-3.500z"/><circle cx="12" cy="37" r="5" fill="none" stroke="#fff" stroke-width="3"/><circle cx="37" cy="37" r="5" fill="none" stroke="#fff" stroke-width="3"/><path d="M12 37h15l5-10" stroke="#fff" stroke-width="3" fill="none" stroke-linejoin="round"/><rect x="5" y="22" width="10" height="9" rx="1.500"/></svg>',
    svcMotorbike:'<svg viewBox="0 0 48 48" fill="none"><circle cx="11" cy="36" r="6" fill="#fff" stroke="#0d6c31" stroke-width="3"/><circle cx="37" cy="36" r="6" fill="#fff" stroke="#0d6c31" stroke-width="3"/><circle cx="24" cy="10" r="4" fill="#1fa24d"/><path d="M20 9a4 4 0 0 1 8 0z" fill="#ffc928"/><path d="M21 16l-5 9h8l4 5h5l-6-10 3-2 5 3 2-3-9-5z" fill="#1fa24d"/><path d="M10 36h15l7-12h3l2 12M8 25h10" stroke="#1fa24d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    svcBasket:'<svg viewBox="0 0 48 48"><circle cx="19" cy="12" r="5" fill="#2e9c3d"/><circle cx="29" cy="9" r="4" fill="#d9362b"/><path d="M33 8l8 3-3 5z" fill="#ffc928"/><path d="M8 20h32l-4 22H12z" fill="#2fa84a"/><rect x="5" y="17" width="38" height="6" rx="2" fill="#27923f"/><path d="M17 26v12M24 26v12M31 26v12" stroke="#a8e0b4" stroke-width="3" stroke-linecap="round"/></svg>',
    svcBox:'<svg viewBox="0 0 48 48"><path d="M24 6L6 14v22l18 8 18-8V14z" fill="#e2a24c"/><path d="M24 6l18 8-18 8-18-8z" fill="#f2bd6b"/><path d="M24 22v22l-18-8V14z" fill="#d18b36"/><path d="M15 10l18 8v7l-4-1.500v-4L11 12z" fill="#fff" opacity=".85"/></svg>',
    svcCar:'<svg viewBox="0 0 48 48"><path d="M5 30c0-4 2-6 4-7l4-8c1-2 3-3 5-3h12c2 0 4 1 5 3l4 8c2 1 4 3 4 7v5H5z" fill="#1fa24d"/><path d="M15 16h18l3.500 7H11.500z" fill="#c9eed4"/><circle cx="14" cy="36" r="5" fill="#0d6c31"/><circle cx="34" cy="36" r="5" fill="#0d6c31"/><circle cx="14" cy="36" r="2" fill="#dff"/><circle cx="34" cy="36" r="2" fill="#dff"/></svg>',
    svcMore:'<svg viewBox="0 0 48 48" fill="#5b616b"><circle cx="15" cy="15" r="6.500"/><circle cx="33" cy="15" r="6.500"/><circle cx="15" cy="33" r="6.500"/><circle cx="33" cy="33" r="6.500"/></svg>',
    fork:'<svg viewBox="0 0 44 64" fill="none"><path d="M12 4v18c0 5 3 8 8 8s8-3 8-8V4M20 4v22M36 6c2 14-4 24-12 30" stroke="#ffc928" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 30v28" stroke="#ffc928" stroke-width="6" stroke-linecap="round"/></svg>',
  };

  /* ---------------- DATA ---------------- */
  let SHOPS = [
    { id:'pho', name:'Phở Bò Lâm Thao', cat:'Phở • Món Việt', homeCat:'Phở • Việt Nam', img:'pho.jpg', rate:4.8, rc:'320+', eta:'15 - 25 phút', ship:'30K', sale:0, group:['Phở','Món Việt'], desc:'Phở bò gia truyền, nước dùng ninh xương 12 tiếng.', menu:[['Phở bò tái nạm',55000],['Phở bò chín',50000],['Phở gà',45000],['Trà đá',10000]] },
    { id:'comtam', name:'Cơm Tấm Minh Tâm', cat:'Cơm • Món Việt', homeCat:'Cơm • Món Việt', img:'comtam.jpg', rate:4.7, rc:'210+', eta:'20 - 30 phút', ship:'30K', sale:15, group:['Cơm','Món Việt'], desc:'Cơm tấm sườn nướng than hoa, bì chả đầy đủ.', menu:[['Cơm tấm sườn nướng',50000],['Cơm tấm sườn bì chả',60000],['Cơm tấm gà nướng',55000],['Trà tắc',10000]] },
    { id:'trasua', name:'Trà Sữa Tea & More', cat:'Đồ uống • Trà sữa', homeCat:'Đồ uống • Trà sữa', img:'trasua.jpg', rate:4.6, rc:'180+', eta:'15 - 25 phút', ship:'25K', sale:10, group:['Đồ uống','Trà sữa'], desc:'Trà sữa trân châu đường đen và các loại topping tự nấu.', menu:[['Trà sữa trân châu đường đen',45000],['Trà sữa matcha',48000],['Trà đào cam sả',42000],['Bánh flan',15000]] },
    { id:'banhmi', name:'Bánh Mì Sáu Hương', cat:'Bánh mì • Ăn vặt', homeCat:'Bánh mì • Ăn vặt', img:'banhmi.jpg', rate:4.5, rc:'120+', eta:'15 - 20 phút', ship:'20K', sale:0, group:['Ăn vặt','Bánh mì'], desc:'Bánh mì nóng giòn, pate nhà làm, nhân thịt nướng thơm lừng.', menu:[['Bánh mì thịt nướng',25000],['Bánh mì pate trứng',20000],['Bánh mì chả cá',22000]] },
  ];
  const shopBy = id => SHOPS.find(s => s.id === id) || GHOST[id] || { id, name:'Quán', cat:'', img:'hero.svg', group:['Quán'], menu:[] };

  let ORDERS = (() => {
    const list = [
      { code:'LT123456', shop:'pho', st:'proc', items:['1 x Phở bò tái nạm','1 x Trà đá'], total:65000, when:'Hôm nay, 09:30' },
      { code:'LT123457', shop:'banhmi', st:'proc', items:['2 x Bánh mì thịt nướng','1 x Trà đá'], total:60000, when:'Hôm nay, 09:35' },
      { code:'LT123455', shop:'comtam', st:'ship', items:['1 x Cơm tấm sườn nướng','1 x Trà tắc'], total:60000, when:'Hôm nay, 09:15' },
      { code:'LT123401', shop:'trasua', st:'done', items:['2 x Trà sữa trân châu đường đen','1 x Bánh flan'], total:105000, when:'Hôm qua, 18:20' },
    ];
    const fill = [['pho','1 x Phở bò chín','1 x Trà đá',60000],['comtam','1 x Cơm tấm sườn bì chả','1 x Trà tắc',70000],['banhmi','2 x Bánh mì pate trứng','',40000],['trasua','1 x Trà đào cam sả','',42000]];
    const days = ['Hôm qua, 12:05','2 ngày trước, 19:40','3 ngày trước, 11:50','4 ngày trước, 18:10','5 ngày trước, 12:30','6 ngày trước, 20:00','7 ngày trước, 09:20'];
    days.forEach((d, i) => {
      const f = fill[i % fill.length];
      list.push({ code:'LT1233' + (90 - i), shop:f[0], st:'done', items:[f[1], f[2]].filter(Boolean), total:f[3], when:d });
    });
    return list;
  })();

  let NOTICES = [
    { id:1, type:'order', title:'Đơn hàng đã được xác nhận', body:'<b>Phở Bò Lâm Thao</b> đã xác nhận đơn hàng của bạn. Món ăn đang được chuẩn bị!', time:'2 phút trước', img:'pho.jpg', unread:true },
    { id:2, type:'order', title:'Tài xế đang giao hàng', body:'Đơn hàng của bạn đang trên đường đến. Dự kiến giao trong 8 phút nữa.', time:'12 phút trước', img:'n-driver.jpg', unread:true },
    { id:3, type:'promo', title:'Ưu đãi dành riêng cho bạn', body:'Giảm 30K cho đơn từ 100K. Áp dụng cho tất cả quán ăn tại Lâm Thao. Đặt món ngay!', time:'1 giờ trước', img:'n-30k.jpg', unread:true },
    { id:4, type:'order', title:'Đơn hàng đã giao thành công', body:'Đơn hàng từ <b>Cơm Tấm Minh Tâm</b> đã được giao thành công. Cảm ơn bạn đã đặt món!', time:'3 giờ trước', img:'comtam.jpg' },
    { id:5, type:'promo', title:'Ưu đãi mới cho cuối tuần', body:'Nhập mã <b>CUOITUAN</b> giảm 20K cho đơn từ 80K. Thời gian áp dụng: 11/05 - 12/05.', time:'1 ngày trước', img:'n-gift.jpg' },
    { id:6, type:'system', title:'Cập nhật chính sách bảo mật', body:'Chúng tôi đã cập nhật Chính sách quyền riêng tư nhằm bảo vệ tốt hơn thông tin của bạn.', time:'2 ngày trước', svg:'shieldBig' },
    { id:7, type:'system', title:'Đăng nhập từ thiết bị mới', body:'Tài khoản của bạn vừa được đăng nhập trên thiết bị mới. Nếu không phải bạn, vui lòng đổi mật khẩu.', time:'3 ngày trước', svg:'bellAlert' },
  ];

  const AREAS = ['Lâm Thao, Phú Thọ','Thị trấn Lâm Thao','Thị trấn Hùng Sơn','Xã Cao Xá','Xã Tiên Kiên','Xã Xuân Lũng','Xã Thạch Sơn'];
  const DEMO = { name:'Nguyễn Thị Mai', phone:'0901234567', pass:'123456' };
  /* Chế độ LIVE = đã điền firebase-config.js → dùng dữ liệu thật; chưa điền → chạy DEMO với dữ liệu mẫu ở trên */
  let LIVE = false, FB = null, PROMOS = [], CONTACT = { hotline:'0900 000 000', email:'lamthaoangi1@gmail.com', zalo:'' };
  const GHOST = {};
  let shopsLoaded = false;
  const CART = { shop:null, q:{}, promo:'', note:'', address:null, loc:null };
  const SP = { id:null, cat:'Tất cả' };
  let shopPageOpen = false;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const telHot = () => CONTACT.hotline.replace(/\s/g, '');

  /* ---------------- STATE ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('lt_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('lt_' + k, JSON.stringify(v)); } catch {} },
  };
  const S = {
    tab:'home',
    area:store.get('area', AREAS[0]),
    favs:store.get('favs', ['pho','comtam','trasua','banhmi']),   // mới lưu nhất ở đầu
    user:store.get('user', { name:DEMO.name, phone:DEMO.phone }),
    users:store.get('users', [DEMO]),
    notices:store.get('notices', NOTICES.map(n => ({ id:n.id, unread:!!n.unread }))),
    home:{ cat:'Tất cả', q:'', sort:'default', slide:0 },
    orders:{ tab:'proc', q:'', search:false },
    fav:{ cat:'Tất cả', q:'', sort:'recent' },
    noti:{ tab:'all' },
    authTab:'login',
    points:0,
  };
  const saveFavs = () => store.set('favs', S.favs);
  const isFav = id => S.favs.includes(id);
  const toggleFav = id => {
    if (isFav(id)) { S.favs = S.favs.filter(x => x !== id); toast('Đã bỏ khỏi Yêu thích'); }
    else { S.favs.unshift(id); toast('Đã thêm vào Yêu thích'); }
    saveFavs();
  };
  const unreadCount = () => S.notices.filter(n => n.unread).length;

  /* ---------------- HELPERS ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => n.toLocaleString('vi-VN').replace(/,/g, '.') + 'đ';
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1900);
  }
  function openSheet(html) {
    $('#sheet').innerHTML = '<div class="grab"></div>' + html;
    $('#sheet').hidden = false; $('#sheet-backdrop').hidden = false;
    $('#sheet').scrollTop = 0;
  }
  function closeSheet() { $('#sheet').hidden = true; $('#sheet-backdrop').hidden = true; }
  $('#sheet-backdrop').addEventListener('click', closeSheet);

  const bellBtn = () => `<button class="bell" data-go="notifications" aria-label="Thông báo">${fx.bellF}${unreadCount() ? '<i></i>' : ''}</button>`;
  const locBtn = () => `<button class="loc" data-act="area">${fx.pinF}<span>${S.area}</span>${ic('chevDown')}</button>`;
  const logo = (size = '') => `<span class="logo-wrap"><span class="logo ${size}"><span class="l1">Lâm Thao</span><span class="l2">Ăn Gì?</span></span><span class="logo-fork" style="${size === 'sm' ? 'width:28px;height:42px;right:-24px' : ''}">${fx.fork}</span></span>`;

  const shopTags = s => `<div class="tags">${s.open === false ? '<span class="tag sale">Đóng cửa</span>' : ''}${s.featured ? '<span class="tag feat">⭐ Nổi bật</span>' : ''}${s.ship ? `<span class="tag ship">${fx.shieldTag.replace('<svg','<svg width="16" height="16"')}Freeship từ ${s.ship}</span>` : ''}${s.sale ? `<span class="tag sale">${fx.flame.replace('<svg','<svg width="16" height="16"')}Giảm ${s.sale}%</span>` : ''}</div>`;
  const shopMeta = s => `<div class="meta"><span class="rate">${fx.star}${s.rate ? s.rate.toFixed(1) + (s.rc ? ' (' + s.rc + ')' : '') : 'Mới'}</span><span class="sep"></span><span class="eta">${ic('truck')}${s.eta}</span></div>`;

  /* ---------------- HOME ---------------- */
  const HOME_CATS = ['Tất cả','Cơm','Phở','Bún','Đồ uống','Ăn vặt','Lẩu'];
  const SERVICES = [
    { k:'food', t:'Đồ ăn', svg:'svcScooter', active:true },
    { k:'ride', t:'Xe ôm', svg:'svcMotorbike', tint:true },
    { k:'ship', t:'Giao hàng', svg:'svcBox' },
    { k:'market', t:'Mua hộ', svg:'svcBasket', tint:true },
  ];
  const SLIDES = [
    ['Món ngon quê mình','Giao nhanh tận nơi'],
    ['Ưu đãi mỗi ngày','Freeship từ 20K'],
    ['Ăn ngon – Giá tốt','Đặt là có ngay'],
    ['Quán quen gần nhà','Mở cửa cả ngày'],
  ];

  /* Banner trang chủ: slide chào mừng + các quán Nổi bật / đang Giảm giá (admin chọn) */
  const bannerSlides = () => {
    const promo = SHOPS.filter(s => s.open !== false && (s.featured || s.sale))
      .sort((a, b) => (b.featured - a.featured) || (a.order - b.order))
      .slice(0, 6)
      .map(s => ({ shop:s.id, img:s.img, off:s.sale, l1:s.name, l2:s.sale ? `Giảm ${s.sale}% toàn thực đơn` : (s.ship ? `Freeship từ ${s.ship}` : (s.homeCat || 'Quán nổi bật')) }));
    return promo.length ? [{ l1:SLIDES[0][0], l2:SLIDES[0][1] }, ...promo] : SLIDES.map(([l1, l2]) => ({ l1, l2 }));
  };
  const bannerInner = () => {
    const L = bannerSlides(), i = S.home.slide % L.length, s = L[i];
    return `<div class="txt"><div class="b-logo">Lâm Thao<span>Ăn Gì?</span></div><p id="b-text"><span>${s.l1}</span><span>${s.l2}</span></p></div>
        <button class="cta" ${s.shop ? `data-shop="${s.shop}"` : 'data-act="order-now"'}>Đặt món ngay →</button>
        <div class="pic" style="background-image:url(banner-food.jpg)"></div>
        ${s.shop ? `<img class="shoplogo" src="${s.img}" alt="">${s.off ? `<span class="off">-${s.off}%</span>` : ''}` : ''}
        <div class="dots">${L.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>`;
  };

  function filteredShops() {
    let list = SHOPS.filter(s => S.home.cat === 'Tất cả' || s.group.includes(S.home.cat) || norm(s.cat).includes(norm(S.home.cat)));
    const q = norm(S.home.q.trim());
    if (q) list = list.filter(s => norm(s.name + ' ' + s.cat + ' ' + s.menu.map(m => m[0]).join(' ')).includes(q));
    if (S.home.sort === 'rate') list = [...list].sort((a, b) => b.rate - a.rate);
    if (S.home.sort === 'sale') list = list.filter(s => s.sale).sort((a, b) => b.sale - a.sale);
    if (S.home.sort === 'fast') list = [...list].sort((a, b) => parseInt(a.eta) - parseInt(b.eta));
    return list;
  }
  function shopCard(s, i = 0) {
    return `<article class="shop" data-shop="${s.id}" style="animation-delay:${i * 60}ms">
      <img class="img" src="${s.img}" alt="${s.name}" loading="lazy">
      <div class="info"><h3>${s.name}</h3><div class="cat">${s.homeCat}</div>${shopMeta(s)}${shopTags(s)}</div>
      <button class="heart ${isFav(s.id) ? 'on' : ''}" data-heart="${s.id}" aria-label="Yêu thích">${ic('heart')}</button>
    </article>`;
  }
  function shopListHtml() {
    const l = filteredShops();
    if (LIVE && !SHOPS.length) return `<div class="empty"><b>${shopsLoaded ? 'Chưa có quán nào' : 'Đang tải danh sách quán…'}</b>${shopsLoaded ? 'Các quán sẽ sớm có mặt ở đây.' : ''}</div>`;
    return l.length ? l.map(shopCard).join('') : `<div class="empty"><b>Chưa tìm thấy quán phù hợp</b>Hãy thử từ khoá hoặc danh mục khác nhé.</div>`;
  }
  function renderHome() {
    const el = $('#view-home');
    const scroll = el.scrollTop;
    el.innerHTML = `
      <div class="hero tall hung compact">
        <img class="hero-photo" src="den-hung.jpg" alt="Cổng Đền Hùng, Phú Thọ" fetchpriority="high" decoding="async">
        <div class="hero-top">${locBtn()}${bellBtn()}</div>
        <div style="margin-top:8px">${logo('sm')}</div>
        <p class="tagline">Đặt món dễ dàng – Ngon gần nhà</p>
      </div>
      <div class="search-float"><label class="search">${ic('search')}<input id="home-q" type="search" placeholder="Bạn muốn ăn gì hôm nay?" value="${S.home.q.replace(/"/g, '&quot;')}" autocomplete="off"><button class="filter-btn" data-act="filter" aria-label="Bộ lọc">${ic('sliders')}</button></label></div>
      <div class="services">${SERVICES.map(s => `<button class="service ${s.active ? 'active' : ''} ${s.tint ? 'tint' : ''}" data-svc="${s.k}"><span class="ic">${fx[s.svg]}</span>${s.t}</button>`).join('')}</div>
      <div class="banner-wrap"><div class="banner" id="banner">${bannerInner()}</div></div>
      <div class="section-head" id="shops-anchor"><h2>Quán ngon gần bạn</h2><button class="see-all" data-act="see-all">Xem tất cả ${ic('chevRight')}</button></div>
      <div class="chips" id="home-chips">${HOME_CATS.map(c => `<button class="chip ${c === S.home.cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
      <div class="shop-list" id="home-list">${shopListHtml()}</div>`;
    el.scrollTop = scroll;
    const q = $('#home-q');
    q.addEventListener('input', e => { S.home.q = e.target.value; $('#home-list').innerHTML = shopListHtml(); });
  }
  let slideTimer;
  function startSlider() {
    clearInterval(slideTimer);
    slideTimer = setInterval(() => {
      if (S.tab !== 'home') return;
      const b = $('#banner'); if (!b) return;
      S.home.slide = (S.home.slide + 1) % bannerSlides().length;
      b.innerHTML = bannerInner();
    }, 3800);
  }

  /* ---------------- ORDERS ---------------- */
  const ST = {
    proc:{ cls:'proc', label:'Đang xử lý', icon:fx.clockF },
    ship:{ cls:'ship', label:'Đang giao', icon:ic('truck') },
    done:{ cls:'done', label:'Hoàn thành', icon:fx.checkF },
  };
  const orderTotal = st => ORDERS.filter(o => o.st === st).length;
  function ordersListHtml() {
    const q = norm(S.orders.q.trim());
    const l = ORDERS.filter(o => o.st === S.orders.tab && (!q || norm(shopBy(o.shop).name + ' ' + o.code + ' ' + o.items.join(' ')).includes(q)));
    if (!l.length) return `<div class="empty"><b>Chưa có đơn hàng</b>Các đơn hàng của bạn sẽ hiển thị ở đây.</div>`;
    return l.map((o, i) => {
      const s = shopBy(o.shop), st = ST[o.st];
      const second = o.st === 'proc' ? (o.status === 'pending' ? `<button class="btn-soft plain" data-cancelorder="${o.code}" style="color:var(--red)">Hủy đơn</button>` : `<button class="btn-soft plain" data-contact="${o.code}">${ic('headset')}Liên hệ quán</button>`)
        : o.st === 'ship' ? `<button class="btn-soft" data-track="${o.code}">${fx.pinF.replace('<svg','<svg width="24" height="24"')}Theo dõi đơn</button>`
        : `<button class="btn-soft" data-reorder="${o.code}">${ic('refresh')}Đặt lại</button>`;
      return `<article class="order" style="animation-delay:${i * 50}ms">
        <div class="row"><img class="img" src="${s.img}" alt="${s.name}" loading="lazy">
          <div class="body"><span class="status ${st.cls}">${st.icon}${o.label || st.label}</span>
            <h3>${s.name}</h3><div class="code">Mã đơn: #${o.code}</div>
            <div class="items">${o.items.join('<br>')}</div><div class="price">${money(o.total)}</div>
            <div class="foot"><span>${ic('shop')}${s.group[0]} • Lâm Thao</span><span>${ic('clock')}${o.when}</span>${o.st === 'ship' ? `<span>${ic('truck')}Dự kiến 15 - 25 phút</span>` : ''}</div></div></div>
        <div class="actions"><button class="btn-soft" data-detail="${o.code}">${ic('list')}Xem chi tiết</button>${second}</div></article>`;
    }).join('');
  }
  function renderOrders() {
    const el = $('#view-orders');
    el.innerHTML = `
      <div class="hero short"><div class="hero-top">${locBtn()}${bellBtn()}</div><div style="margin-top:14px">${logo('md')}</div></div>
      <div class="sheet-top">
        <div class="title-row"><h1>Đơn hàng</h1><button class="round-btn" data-act="orders-search" aria-label="Tìm kiếm">${ic('search')}</button></div>
        ${S.orders.search ? `<label class="search" style="margin-top:12px;box-shadow:none;background:var(--chip)">${ic('search')}<input id="orders-q" type="search" placeholder="Tìm theo tên quán, mã đơn..." value="${S.orders.q}" autocomplete="off"></label>` : ''}
        <div class="seg">${[['proc','Đang xử lý'],['ship','Đang giao'],['done','Hoàn thành']].map(([k, t]) => `<button class="${S.orders.tab === k ? 'on' : ''}" data-otab="${k}">${t} (${orderTotal(k)})</button>`).join('')}</div>
      </div>
      <div class="order-list" id="orders-list">${ordersListHtml()}</div>`;
    const q = $('#orders-q');
    if (q) { q.addEventListener('input', e => { S.orders.q = e.target.value; $('#orders-list').innerHTML = ordersListHtml(); }); }
  }
  const orderByCode = c => ORDERS.find(o => o.code === c);
  function orderDetail(o) {
    const s = shopBy(o.shop);
    openSheet(`<h3>Chi tiết đơn #${o.code}</h3><div class="sub">${s.name} • ${o.when}</div>
      <div style="margin-top:12px">${o.items.map(i => `<div class="row-kv"><span>${i}</span></div>`).join('')}
      <div class="row-kv"><span>Phí giao hàng</span><b>${money(o.shipFee ?? 15000)}</b></div>
      <div class="row-kv"><span>Tổng thanh toán</span><b style="color:var(--green-d)">${money(o.total)}</b></div>
      <div class="row-kv"><span>Thanh toán</span><b>Tiền mặt</b></div>
      <div class="row-kv"><span>Địa chỉ</span><b>${o.address || S.area}</b></div></div>
      <button class="sheet-btn" onclick="document.getElementById('sheet-backdrop').click()">Đóng</button>`);
  }
  function trackSheet(o) {
    const s = shopBy(o.shop);
    const idx = o.status ? ({ pending:0, confirmed:1, preparing:1, ready:1, delivering:2, done:3, cancelled:-1 }[o.status] ?? 0) : ({ proc:1, ship:2, done:3 }[o.st] ?? 0);
    const steps = [['Đã đặt đơn', o.when], ['Đã báo cho quán và tài xế', 'Đang chờ tài xế nhận đơn'], ['Tài xế đang giao hàng', o.shipperName ? 'Tài xế: ' + o.shipperName : 'Đang trên đường đến bạn'], ['Giao thành công', 'Cảm ơn bạn đã đặt món']];
    openSheet(`<h3>Theo dõi đơn #${o.code}</h3><div class="sub">${s.name}${o.status === 'cancelled' ? ' • Đơn đã hủy' : ''}</div>
      <div class="track">${steps.map((st, i) => `<div class="st ${i <= idx ? 'done' : ''}"><i></i><b>${st[0]}</b><small>${st[1]}</small></div>`).join('')}</div>
      <button class="sheet-btn" onclick="document.getElementById('sheet-backdrop').click()">Đóng</button>`);
  }
  function contactSheet(o) {
    const s = shopBy(o.shop);
    openSheet(`<h3>Liên hệ ${s.name}</h3><div class="sub">Đơn #${o.code}</div>
      <a class="opt" href="tel:${(s.phone || CONTACT.hotline).replace(/\s/g, '')}">${ic('phone')}Gọi điện cho quán<span class="tick">${ic('chevRight')}</span></a>
      ${LIVE ? '' : `<button class="opt" data-sheetmsg="Đã gửi tin nhắn tới quán">${ic('chat')}Nhắn tin cho quán<span class="tick">${ic('chevRight')}</span></button>`}`);
  }

  /* ---------------- FAVORITES ---------------- */
  const FAV_CATS = [['Tất cả',null],['Món Việt','bowl'],['Phở','pho'],['Đồ uống','cup'],['Ăn vặt','cake'],['Khác','basket']];
  const favIcons = {
    bowl:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11h18a9 9 0 0 1-18 0zM9 4c0 1.500 1.500 1.500 1.500 3M13 3c0 1.500 1.500 1.500 1.500 4M17 4c0 1.500 1.500 1.500 1.500 3" stroke="currentColor" stroke-width="1.700" fill="none" stroke-linecap="round"/></svg>',
    pho:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M8 4c0 1.500 1.500 1.500 1.500 3.500M12 3c0 1.500 1.500 1.500 1.500 4M16 4c0 1.500 1.500 1.500 1.500 3.500" stroke="currentColor" stroke-width="1.700" fill="none" stroke-linecap="round"/></svg>',
    cup:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 8h9v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3zM15 10h2a2.500 2.500 0 0 1 0 5h-2z"/><rect x="5" y="5" width="11" height="2.500" rx="1.200"/></svg>',
    cake:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 14h18v6H3z"/><path d="M5 14c0-3 3-6 7-6s7 3 7 6zM12 4c.8 1.200 1.800 1.800 1.800 3S13 8 12 8s-1.800-.5-1.800-1.800S11.200 5.200 12 4z"/></svg>',
    basket:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 10h18l-1.500 10h-15zM8 10l3-6M16 10l-3-6" stroke="currentColor" stroke-width="1.700" stroke-linecap="round"/></svg>',
  };
  function favShops() {
    let l = S.favs.map(id => SHOPS.find(s => s.id === id)).filter(Boolean);
    const main = ['Món Việt','Phở','Đồ uống','Ăn vặt'];
    if (S.fav.cat === 'Khác') l = l.filter(s => !s.group.some(g => main.includes(g)));
    else if (S.fav.cat !== 'Tất cả') l = l.filter(s => s.group.includes(S.fav.cat));
    const q = norm(S.fav.q.trim());
    if (q) l = l.filter(s => norm(s.name + ' ' + s.cat + ' ' + s.menu.map(m => m[0]).join(' ')).includes(q));
    if (S.fav.sort === 'rate') l = [...l].sort((a, b) => b.rate - a.rate);
    if (S.fav.sort === 'name') l = [...l].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return l;
  }
  function favRow(s, i) {
    return `<article class="shop" data-shop="${s.id}" style="animation-delay:${i * 50}ms">
      <img class="img" src="${s.img}" alt="${s.name}" loading="lazy" style="width:100px;height:100px">
      <div class="info"><h3>${s.name}</h3><div class="cat">${s.cat}</div>${shopMeta(s)}${shopTags(s)}</div>
      <button class="heart on" data-heart="${s.id}" aria-label="Bỏ yêu thích">${ic('heart')}</button></article>`;
  }
  function favBody() {
    const l = favShops();
    const recent = S.favs.map(id => SHOPS.find(s => s.id === id)).filter(Boolean).slice(0, 3);
    return `
      ${recent.length && S.fav.cat === 'Tất cả' && !S.fav.q ? `<div class="row-head"><h2 class="h2" style="font-size:20px">Đã lưu gần đây</h2><button class="see-all" data-act="fav-all">Xem tất cả ${ic('chevRight')}</button></div>
      <div class="recent">${recent.map(s => `<div class="rcard" data-shop="${s.id}"><div class="ph"><img src="${s.img}" alt="${s.name}"><button class="hb" data-heart="${s.id}" aria-label="Bỏ yêu thích">${fx.heartF}</button></div>
        <div class="in"><h4>${s.name}</h4><div class="cat">${s.cat}</div>${shopMeta(s).replace('class="meta"','class="meta" style="flex-wrap:wrap;gap:4px 10px"')}${shopTags(s)}</div></div>`).join('')}</div>` : ''}
      <div class="row-head"><h2 class="h2" style="font-size:20px">Tất cả quán yêu thích</h2>
        <label class="sort"><select id="fav-sort"><option value="recent" ${S.fav.sort === 'recent' ? 'selected' : ''}>Mới lưu nhất</option><option value="rate" ${S.fav.sort === 'rate' ? 'selected' : ''}>Đánh giá cao</option><option value="name" ${S.fav.sort === 'name' ? 'selected' : ''}>Tên A - Z</option></select>${ic('chevDown')}</label></div>
      <div class="shop-list" style="padding-top:12px">${l.length ? l.map(favRow).join('') : `<div class="empty"><b>Chưa có quán yêu thích</b>Nhấn vào biểu tượng trái tim ở mỗi quán để lưu lại.</div>`}</div>`;
  }
  function renderFavorites() {
    const el = $('#view-favorites'); const sc = el.scrollTop;
    el.innerHTML = `
      <div class="hero mid"><div class="hero-top" style="justify-content:flex-end">${bellBtn().replace('class="bell"','class="bell" style="opacity:0;pointer-events:none"')}</div>
        <div class="page-title" style="margin-top:-6px;display:flex;align-items:center;gap:8px;font-size:30px;font-family:var(--font-h);letter-spacing:-1px;text-shadow:-2px -2px 0 #0b6a33,2px -2px 0 #0b6a33,-2px 2px 0 #0b6a33,2px 2px 0 #0b6a33">Yêu thích <span style="width:46px;height:46px;color:var(--yellow);filter:drop-shadow(0 2px 0 #0b6a33)">${fx.heartF}</span></div>
        <p class="page-sub">Những quán ngon bạn yêu thích<br>luôn ở đây <span style="color:var(--yellow)">💛</span></p></div>
      <div class="fav-search"><label class="search">${ic('search')}<input id="fav-q" type="search" placeholder="Tìm quán ăn, món ăn trong danh sách yêu thích..." value="${S.fav.q}" autocomplete="off"><button class="filter-btn" data-act="filter-fav" aria-label="Bộ lọc">${ic('sliders')}</button></label></div>
      <div class="chips sm">${FAV_CATS.map(([c, i]) => `<button class="chip ${S.fav.cat === c ? 'on' : ''}" data-fcat="${c}">${i ? favIcons[i] : ''}${c}</button>`).join('')}</div>
      <div id="fav-body">${favBody()}</div><div class="pad-bottom"></div>`;
    el.scrollTop = sc;
    $('#fav-q').addEventListener('input', e => { S.fav.q = e.target.value; $('#fav-body').innerHTML = favBody(); bindFavSort(); });
    bindFavSort();
  }
  function bindFavSort() { const s = $('#fav-sort'); if (s) s.addEventListener('change', e => { S.fav.sort = e.target.value; $('#fav-body').innerHTML = favBody(); bindFavSort(); }); }

  /* ---------------- NOTIFICATIONS ---------------- */
  const NTABS = [['all','Tất cả'],['order','Đơn hàng'],['promo','Ưu đãi'],['system','Hệ thống']];
  function noticesHtml() {
    const l = NOTICES.filter(n => S.noti.tab === 'all' || n.type === S.noti.tab);
    if (!l.length) return `<div class="empty"><b>Chưa có thông báo</b></div>`;
    return l.map((n, i) => {
      const un = S.notices.find(x => x.id === n.id)?.unread;
      const pic = n.img ? `<img src="${n.img}" alt="" loading="lazy">` : fx[n.svg];
      return `<article class="notice" data-notice="${n.id}" style="animation-delay:${i * 50}ms"><div class="pic">${pic}</div>
        <div class="bd"><h3>${n.title}</h3><p>${n.body}</p><div class="time">${ic('clock')}${n.time}</div></div>
        <div class="side"><span class="unread ${un ? '' : 'off'}"></span>${ic('chevRight', 'chev')}</div></article>`;
    }).join('');
  }
  function renderNotifications() {
    $('#view-notifications').innerHTML = `
      <div class="hero short" style="padding-bottom:40px"><div class="hero-top" style="justify-content:flex-end">${bellBtn()}</div>
        <div class="page-title" style="margin-top:-30px">Thông báo</div><p class="page-sub" style="font-size:14px">Cập nhật mới nhất về đơn hàng, ưu đãi<br>và hoạt động của bạn</p></div>
      <div class="sheet-top" style="margin-top:-20px"><div class="seg" style="margin-top:6px;gap:10px">${NTABS.map(([k, t]) => `<button style="height:54px;font-size:15px" class="${S.noti.tab === k ? 'on' : ''}" data-ntab="${k}">${t}</button>`).join('')}</div></div>
      <div class="notice-list" id="notice-list">${noticesHtml()}</div>`;
  }

  /* ---------------- PROFILE ---------------- */
  const menuItem = (act, icon, color, t, sub, extra = '') => `<button class="mi ${extra}" data-menu="${act}"><span class="mic ${color}">${icon}</span><span class="mt"><b>${t}</b><small>${sub}</small></span>${ic('chevRight', 'ch')}</button>`;
  const fmtPhone = p => p.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  function panelMenu() {
    const r = S.user && S.user.role;
    if (r === 'admin') return menuItem('open-admin', ic('gear'), '', 'Trang Admin', 'Quản lý cửa hàng, đơn hàng, người dùng') + menuItem('open-seller', ic('shop'), '', 'Trang Nhà bán hàng', 'Đơn và thực đơn của cửa hàng') + menuItem('open-shipper', ic('truck'), '', 'Trang Shipper', 'Nhận và giao đơn');
    if (r === 'seller') return menuItem('open-seller', ic('shop'), '', 'Trang Nhà bán hàng', 'Nhận đơn, sửa thực đơn');
    if (r === 'shipper') return menuItem('open-shipper', ic('truck'), '', 'Trang Shipper', 'Nhận và giao đơn');
    return '';
  }
  function renderProfile() {
    const el = $('#view-profile');
    if (S.user) {
      el.innerHTML = `
        <div class="hero" style="padding-bottom:110px"><div style="padding-top:34px"><div class="page-title" style="font-size:28px">Cá nhân</div><p class="page-sub">Quản lý tài khoản của bạn</p></div></div>
        <div class="profile-card" style="margin-top:-96px">
          <div class="pc-top" data-menu="account"><div class="avatar"><img src="avatar.jpg" alt="${S.user.name}"><span class="cam">${ic('camera')}</span></div>
            <div class="pc-info"><h2>${S.user.name}</h2><div class="phone">${fmtPhone(S.user.phone)}</div><span class="member">${fx.crown.replace('<svg','<svg width="24" height="24"')}${LIVE ? 'Thành viên' : 'Thành viên bạc'} ${ic('chevRight')}</span></div></div>
          <div class="stats"><button class="stat pts" data-menu="points"><span class="ic">${fx.coin}</span><span style="text-align:left"><small>Điểm tích lũy</small><b>${LIVE ? S.points : 820} điểm</b></span>${ic('chevRight', 'ch')}</button>
            <button class="stat cp" data-menu="coupons"><span class="ic">${fx.giftSm}</span><span style="text-align:left"><small>Ưu đãi của bạn</small><b>${LIVE ? PROMOS.length : 3} mã giảm giá</b></span>${ic('chevRight', 'ch')}</button></div>
        </div>
        <div class="group-title">Tài khoản &amp; Tiện ích</div>
        <div class="menu">
          ${menuItem('account', fx.userF, '', 'Thông tin tài khoản', 'Xem và chỉnh sửa thông tin cá nhân')}
          ${menuItem('address', fx.pinF, '', 'Địa chỉ đã lưu', 'Quản lý các địa chỉ giao hàng')}
          ${menuItem('payment', fx.walletF, '', 'Phương thức thanh toán', 'Thẻ ngân hàng, Ví điện tử, Tiền mặt')}
          ${menuItem('coupons', fx.ticketF, '', 'Mã giảm giá', 'Xem và sử dụng các ưu đãi của bạn')}
          ${panelMenu()}
        </div>
        <div class="group-title">Hỗ trợ &amp; Cài đặt</div>
        <div class="menu">
          ${menuItem('help', ic('headset'), '', 'Trung tâm hỗ trợ', 'Giải đáp thắc mắc, liên hệ chúng tôi')}
          ${menuItem('settings', ic('gear'), '', 'Cài đặt', 'Ngôn ngữ, thông báo, quyền riêng tư')}
          ${menuItem('logout', ic('logout'), '', 'Đăng xuất', 'Thoát khỏi tài khoản hiện tại', 'danger')}
        </div><div class="pad-bottom"></div>`;
    } else {
      el.innerHTML = `
        <div class="hero" style="padding-bottom:50px"><div style="padding-top:34px"><div class="page-title" style="font-size:28px">Cá nhân</div><p class="page-sub">Đăng nhập để quản lý đơn hàng,<br>địa chỉ và ưu đãi của bạn</p></div></div>
        <div class="guest-card"><div class="guest-top"><div class="ghost">${fx.guestUser}<span class="spark">${fx.spark}</span></div>
          <div><h2>Bạn chưa đăng nhập</h2><p>Đăng nhập hoặc đăng ký để trải nghiệm đầy đủ tính năng và nhận nhiều ưu đãi hấp dẫn từ Lâm Thao Ăn Gì!</p></div></div>
          <div class="guest-btns"><button class="btn primary" data-auth="login">${ic('login')}Đăng nhập</button><button class="btn outline" data-auth="register">${ic('user')}Đăng ký</button></div></div>
        <button class="promo" data-auth="register" style="display:block;width:calc(100% - 32px);text-align:left"><span class="gift">${fx.giftBig}</span><h3>Đăng ký ngay<br>nhận nhiều ưu đãi hấp dẫn!</h3><p>Khám phá quán ngon, nhận mã giảm giá và nhiều tiện ích khác.</p><span class="go">${ic('arrowRight')}</span></button>
        <div class="group-title">Tiện ích khác</div>
        <div class="menu">
          ${menuItem('help', ic('headset'), '', 'Trung tâm hỗ trợ', 'Giải đáp thắc mắc, liên hệ chúng tôi')}
          ${menuItem('policy', fx.gearBlue, 'blue', 'Chính sách &amp; Điều khoản', 'Xem các chính sách, điều khoản sử dụng')}
          ${menuItem('lang', fx.globeP, 'purple', 'Ngôn ngữ', 'Lựa chọn ngôn ngữ ứng dụng')}
          ${menuItem('contact', fx.phoneO, 'orange', 'Liên hệ', 'Kết nối với Lâm Thao Ăn Gì')}
          ${menuItem('notif', fx.bellR, 'red', 'Cài đặt thông báo', 'Quản lý thông báo và nhận ưu đãi')}
        </div><div class="pad-bottom"></div>`;
    }
  }

  /* ---------------- AUTH ---------------- */
  const field = (icon, ph, type = 'text', name = '', pw = false) => `<div class="field" data-f="${name}">${icon}<input name="${name}" type="${type}" placeholder="${ph}" ${type === 'tel' ? 'inputmode="numeric" maxlength="11"' : ''} autocomplete="${pw ? 'current-password' : 'off'}">${pw ? `<button type="button" class="eye" data-eye aria-label="Hiện mật khẩu">${ic('eyeOff')}</button>` : ''}</div><div class="err-msg" data-e="${name}"></div>`;
  function renderAuth() {
    $('#view-auth').innerHTML = `
      <div class="hero auth-hero"><button class="back" data-go="profile" aria-label="Quay lại">${ic('chevLeft')}Quay lại</button>${logo('sm')}
        <div class="auth-title">Chào mừng bạn</div><div class="auth-sub">Đăng nhập hoặc tạo tài khoản để tiếp tục</div></div>
      <div class="auth-card">
        <div class="tabs"><button data-atab="login" class="${S.authTab === 'login' ? 'on' : ''}">Đăng nhập</button><button data-atab="register" class="${S.authTab === 'register' ? 'on' : ''}">Đăng ký</button></div>
        <form class="form on" id="login-form" novalidate>
          ${field(fx.phoneF, 'Số điện thoại', 'tel', 'phone')}
          ${field(fx.lockF, 'Mật khẩu', 'password', 'pass', true)}
          <a class="forgot" href="#" data-act="forgot">Quên mật khẩu?</a>
          <button class="btn-main" type="submit">Đăng nhập</button>
          <div class="or">Hoặc tiếp tục với</div>
          <div class="social"><button type="button" data-social="Google">${fx.google}Google</button><button type="button" data-social="Facebook">${fx.facebook}Facebook</button><button type="button" data-social="Apple">${fx.apple}Apple</button></div>
        </form>
      </div>
      <div class="reg-card" id="reg-card"><h2>Đăng ký tài khoản</h2><p>Tạo tài khoản để khám phá nhiều món ngon tại Lâm Thao</p>
        <form id="reg-form" novalidate>
          ${field(fx.userF, 'Họ và tên', 'text', 'rname')}
          ${field(fx.phoneF, 'Số điện thoại', 'tel', 'rphone')}
          ${field(fx.lockF, 'Mật khẩu', 'password', 'rpass', true)}
          ${field(fx.lockF, 'Nhập lại mật khẩu', 'password', 'rpass2', true)}
          <div class="agree"><label><input type="checkbox" id="agree" checked><span>Tôi đồng ý với <a href="#" data-act="terms">Điều khoản sử dụng</a> và <a href="#" data-act="privacy">Chính sách bảo mật</a></span></label></div>
          <button class="btn-main" type="submit" style="margin-top:16px;height:60px">Tạo tài khoản</button>
        </form></div><div style="height:28px"></div>`;
    bindAuth();
  }
  function setErr(form, name, msg) {
    const f = $(`[data-f="${name}"]`, form), e = $(`[data-e="${name}"]`, form);
    if (f) f.classList.toggle('err', !!msg); if (e) e.textContent = msg || '';
    return !!msg;
  }
  const validPhone = p => /^0\d{9}$/.test(p);
  function bindAuth() {
    const lf = $('#login-form'), rf = $('#reg-form');
    lf.addEventListener('submit', e => {
      e.preventDefault();
      const phone = lf.phone.value.trim(), pass = lf.pass.value;
      let bad = setErr(lf, 'phone', validPhone(phone) ? '' : 'Số điện thoại gồm 10 số, bắt đầu bằng 0');
      bad = setErr(lf, 'pass', pass.length >= 6 ? '' : 'Mật khẩu tối thiểu 6 ký tự') || bad;
      if (bad) return;
      if (LIVE) { FB.login(phone, pass).then(() => { toast('Đăng nhập thành công'); go('profile'); }).catch(er => setErr(lf, 'pass', FB.errMsg(er))); return; }
      const u = S.users.find(x => x.phone === phone);
      if (!u) return void setErr(lf, 'phone', 'Số điện thoại chưa được đăng ký');
      if (u.pass !== pass) return void setErr(lf, 'pass', 'Mật khẩu không đúng');
      loginAs(u);
    });
    rf.addEventListener('submit', e => {
      e.preventDefault();
      const n = rf.rname.value.trim(), p = rf.rphone.value.trim(), a = rf.rpass.value, b = rf.rpass2.value;
      let bad = setErr(rf, 'rname', n.length >= 2 ? '' : 'Vui lòng nhập họ và tên');
      bad = setErr(rf, 'rphone', validPhone(p) ? '' : 'Số điện thoại gồm 10 số, bắt đầu bằng 0') || bad;
      bad = setErr(rf, 'rpass', a.length >= 6 ? '' : 'Mật khẩu tối thiểu 6 ký tự') || bad;
      bad = setErr(rf, 'rpass2', a === b ? '' : 'Mật khẩu nhập lại không khớp') || bad;
      if (bad) return;
      if (!$('#agree').checked) return toast('Vui lòng đồng ý Điều khoản & Chính sách');
      if (LIVE) { FB.register(n, p, a).then(() => { toast('Tạo tài khoản thành công 🎉'); go('profile'); }).catch(er => setErr(rf, 'rphone', FB.errMsg(er))); return; }
      if (S.users.some(x => x.phone === p)) return void setErr(rf, 'rphone', 'Số điện thoại đã được đăng ký');
      const u = { name:n, phone:p, pass:a }; S.users.push(u); store.set('users', S.users);
      toast('Tạo tài khoản thành công 🎉'); loginAs(u);
    });
  }
  function loginAs(u) {
    S.user = { name:u.name, phone:u.phone }; store.set('user', S.user);
    toast('Xin chào, ' + u.name + '!'); go('profile');
  }

  /* ---------------- SHOP DETAIL ---------------- */
  /* ---------------- TRANG QUÁN (toàn màn hình) ---------------- */
  function menuGroups(s) {
    const g = new Map();
    s.menu.forEach((m, i) => { const c = m[3] || 'Món khác'; if (!g.has(c)) g.set(c, []); g.get(c).push(i); });
    return g;
  }
  function spCtl(s, i) {
    const m = s.menu[i];
    if (m[2] === false) return '<span class="sp-out">Hết món</span>';
    if (s.open === false) return '';
    const q = CART.q[i] || 0;
    return q ? `<span class="qty"><button data-qty="${i}" data-d="-1" aria-label="Bớt">−</button><i>${q}</i><button data-qty="${i}" data-d="1" aria-label="Thêm">+</button></span>`
      : `<button class="sp-add" data-qty="${i}" data-d="1" aria-label="Thêm món">+</button>`;
  }
  function spItem(s, i) {
    const m = s.menu[i];
    return `<div class="sp-item ${m[2] === false ? 'off' : ''}">${m[4] ? `<img src="${m[4]}" alt="${m[0]}" loading="lazy">` : `<div class="ph">${(m[0] || '?').trim().charAt(0).toUpperCase()}</div>`}
      <div class="in"><b>${m[0]}</b><span>${money(m[1])}</span></div><div id="ctl-${i}">${spCtl(s, i)}</div></div>`;
  }
  function renderShopPage() {
    const s = SHOPS.find(x => x.id === SP.id), page = $('#shop-page'); if (!s) return;
    const sc = page.scrollTop, groups = menuGroups(s), names = [...groups.keys()];
    if (SP.cat !== 'Tất cả' && !groups.has(SP.cat)) SP.cat = 'Tất cả';
    const shown = names.filter(n => SP.cat === 'Tất cả' || n === SP.cat);
    page.innerHTML = `<div class="sp-top"><button class="sp-back" data-shopback>${ic('chevLeft')}Tất cả quán</button>
        <button class="heart ${isFav(s.id) ? 'on' : ''}" data-heart="${s.id}" data-sheet="1" aria-label="Yêu thích">${ic('heart')}</button></div>
      <div class="sp-card"><div class="sp-head"><img class="sp-logo" src="${s.img}" alt="${s.name}">
        <div><h2>${s.name}${s.open === false ? '<span class="sp-closed">Đóng cửa</span>' : ''}</h2><div class="sp-cat">${s.cat}</div>
        ${s.address ? `<div class="sp-addr">${ic('mapPin')}<span>${s.address}</span></div>` : ''}</div></div>
        <div class="sp-info">${s.rate ? `<div class="sp-rate">${fx.star}Đánh giá quán (${s.rate.toFixed(1)}${s.rc ? ' · ' + s.rc + ' lượt' : ''})</div>` : ''}
          ${shopMeta(s)}${shopTags(s)}${s.desc ? `<p class="sp-desc">${s.desc}</p>` : ''}</div></div>
      ${names.length > 1 ? `<div class="sp-chips">${['Tất cả', ...names].map(n => `<button class="${n === SP.cat ? 'on' : ''}" data-spcat="${n}">${n}</button>`).join('')}</div>` : ''}
      ${shown.map(n => `<div class="sp-group"><h3>${n}<small>(${groups.get(n).length})</small></h3>${groups.get(n).map(i => spItem(s, i)).join('')}</div>`).join('') || '<div class="empty">Quán chưa cập nhật thực đơn</div>'}
      <div class="sp-spacer"></div>
      <button class="sp-cartbar empty" id="cart-bar" data-cart><span id="cb-l">Giỏ hàng (0 món)</span><b id="cb-t">0đ</b></button>`;
    page.scrollTop = sc;
    updateCartUI();
  }
  function openShopPage(s) {
    if (!s || !s.menu) return;
    if (LIVE && CART.shop !== s.id) { CART.shop = s.id; CART.q = {}; CART.promo = ''; }
    SP.id = s.id; SP.cat = 'Tất cả';
    const page = $('#shop-page');
    renderShopPage(); page.classList.add('open'); page.scrollTop = 0;
    if (!shopPageOpen) history.pushState({ sp:1 }, '', '#shop');
    shopPageOpen = true;
  }
  function hideShopPage() { shopPageOpen = false; $('#shop-page').classList.remove('open'); closeSheet(); }

  /* ---------------- GIỎ HÀNG & ĐẶT ĐƠN (chế độ LIVE) ---------------- */
  function cartData() {
    const s = SHOPS.find(x => x.id === CART.shop);
    if (!s) return { s:null, lines:[] };
    const lines = Object.entries(CART.q).filter(([i, q]) => q > 0 && s.menu[i] && s.menu[i][2] !== false)
      .map(([i, q]) => ({ name:s.menu[i][0], raw:s._d.menu[i].name, price:s.menu[i][1], qty:q }));
    return { s, lines };
  }
  function findPromo(code, sub) {
    if (!code) return null;
    const p = PROMOS.find(x => String(x.code).toUpperCase() === code.toUpperCase());
    return p && sub >= (p.min || 0) ? p : null;
  }
  function calc(s, lines, code) {
    const sub = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const disc = Math.round(sub * (s.sale || 0) / 100);
    const promo = findPromo(code, sub);
    const promoOff = promo ? Math.min(promo.off || 0, sub - disc) : 0;
    const ship = (s.freeShipMin && sub >= s.freeShipMin) ? 0 : (s.shipFee ?? 15000);
    return { sub, disc, promo, promoOff, ship, total:sub - disc - promoOff + ship };
  }
  function updateCartUI() {
    const bar = $('#cart-bar'), { s, lines } = cartData(); if (!bar || !s) return;
    const n = lines.reduce((a, l) => a + l.qty, 0);
    if (s.open === false) { $('#cb-l').textContent = 'Quán đang đóng cửa'; $('#cb-t').textContent = ''; bar.classList.add('empty'); bar.disabled = true; return; }
    $('#cb-l').textContent = `Giỏ hàng (${n} món)`; $('#cb-t').textContent = money(calc(s, lines, '').sub);
    bar.classList.toggle('empty', !n); bar.disabled = false;
  }
  function checkoutSheet() {
    const { s, lines } = cartData(); if (!s || !lines.length) return toast('Giỏ hàng đang trống');
    if (!S.user) { closeSheet(); toast('Vui lòng đăng nhập để đặt món'); S.authTab = 'login'; return go('auth'); }
    const c = calc(s, lines, CART.promo);
    const addr = CART.address ?? S.user.address ?? '';
    const qtyN = lines.reduce((n, l) => n + l.qty, 0);
    openSheet(`<div class="co">
      <div class="co-head"><h3>Xác nhận đơn hàng</h3><div class="co-shop">🏪 ${esc(s.name)}</div></div>

      <section class="co-card"><div class="co-title">Món đã chọn <span>${qtyN} món</span></div>
        ${lines.map(l => `<div class="co-item"><span class="co-qty">${l.qty}×</span><span class="co-name">${esc(l.name)}</span><b>${money(l.price * l.qty)}</b></div>`).join('')}
      </section>

      <section class="co-card"><div class="co-title">Thông tin giao hàng</div>
        <label class="co-f"><span>Địa chỉ nhận hàng <i>*</i></span><input id="co-addr" placeholder="Số nhà, thôn/xóm…" value="${esc(addr)}" autocomplete="street-address"></label>
        <div class="co-hint">Khu vực: ${esc(S.area)}</div>
        <label class="co-f"><span>Ghi chú cho quán</span><input id="co-note" placeholder="Ít cay, không hành… (không bắt buộc)" value="${esc(CART.note)}"></label>
      </section>

      <section class="co-card"><div class="co-title">Mã giảm giá</div>
        <div class="co-promo"><input id="co-promo" placeholder="Nhập mã" value="${esc(CART.promo)}"><button type="button" data-applypromo>Áp dụng</button></div>
      </section>

      <section class="co-card co-loc ${CART.loc ? 'ok' : 'need'}">
        <div class="co-loc-ic">${CART.loc ? '✓' : '📍'}</div>
        <div class="co-loc-tx"><b>${CART.loc ? 'Đã chia sẻ vị trí giao hàng' : 'Cần chia sẻ vị trí giao hàng'}</b><span>${CART.loc ? 'Shipper sẽ thấy đúng vị trí của bạn trên bản đồ.' : 'Bắt buộc để gửi đơn. Bấm 1 lần để lưu.'}</span></div>
        ${CART.loc ? '' : '<button type="button" class="co-loc-btn" data-shareloc>Chia sẻ vị trí</button>'}
      </section>

      <section class="co-card co-sum">
        <div class="co-row"><span>Tạm tính</span><b>${money(c.sub)}</b></div>
        ${c.disc ? `<div class="co-row off"><span>Giảm giá quán (${s.sale}%)</span><b>-${money(c.disc)}</b></div>` : ''}
        ${c.promoOff ? `<div class="co-row off"><span>Mã ${esc(c.promo.code)}</span><b>-${money(c.promoOff)}</b></div>` : ''}
        <div class="co-row"><span>Phí giao hàng</span><b>${c.ship ? money(c.ship) : 'Miễn phí'}</b></div>
        <div class="co-total"><span>Tổng thanh toán</span><b>${money(c.total)}</b></div>
        <div class="co-pay">💵 Thanh toán tiền mặt khi nhận hàng</div>
      </section>

      <div class="co-foot"><button class="sheet-btn" data-placeorder ${CART.loc ? '' : 'disabled'}>${CART.loc ? 'Đặt đơn · ' + money(c.total) : 'Chia sẻ vị trí để đặt đơn'}</button></div>
    </div>`);
  }
  const readCheckout = () => { CART.address = $('#co-addr')?.value ?? CART.address; CART.note = $('#co-note')?.value ?? CART.note; CART.promo = ($('#co-promo')?.value ?? CART.promo).trim(); };
  async function placeOrderNow(btn) {
    readCheckout();
    const { s, lines } = cartData(); if (!s || !lines.length) return;
    if (s.open === false) return toast('Quán đang đóng cửa');
    if (!CART.loc) return toast('Vui lòng chia sẻ vị trí giao hàng để gửi đơn');
    const addr = (CART.address || '').trim();
    if (addr.length < 5) return toast('Vui lòng nhập địa chỉ nhận hàng');
    const c = calc(s, lines, CART.promo);
    btn.disabled = true;
    try {
      const ref = await FB.placeOrder({
        code:'LT' + Date.now().toString().slice(-6), uid:S.user.uid, customerName:S.user.name, customerPhone:S.user.phone,
        address:`${addr}, ${S.area}`, note:(CART.note || '').trim(), shopId:s.id, shopName:s._d.name, shopPhone:s._d.phone || '', shopAddress:s._d.address || '', shopLat:s.lat ?? null, shopLng:s.lng ?? null, lat:CART.loc.lat, lng:CART.loc.lng, locAcc:CART.loc.acc,
        items:lines.map(l => ({ name:l.raw, price:l.price, qty:l.qty })), subtotal:c.sub, discount:c.disc + c.promoOff, promoCode:c.promo ? c.promo.code : '',
        shipFee:c.ship, total:c.total, payment:'cash', status:'pending',
      });
      FB.notifyNewOrder(ref.id);   // Gmail admin + Zalo quán/admin (chạy nền)
      FB.updateMyProfile(S.user.uid, { address:addr }).catch(() => {}); S.user.address = addr;
      CART.q = {}; CART.promo = ''; CART.note = ''; CART.address = null; CART.loc = null;
      closeSheet(); S.orders.tab = 'proc'; go('orders'); toast('Đặt đơn thành công! Đang chờ tài xế nhận đơn.');
    } catch (e) { btn.disabled = false; toast(FB.errMsg(e)); }
  }
  function shareLoc(btn) {
    if (CART.loc) return;
    if (!navigator.geolocation) return toast('Thiết bị không hỗ trợ định vị');
    btn.disabled = true; btn.textContent = 'Đang lấy vị trí…';
    navigator.geolocation.getCurrentPosition(p => {
      CART.loc = { lat:+p.coords.latitude.toFixed(6), lng:+p.coords.longitude.toFixed(6), acc:Math.round(p.coords.accuracy) };
      readCheckout(); checkoutSheet(); toast('Đã lưu vị trí của bạn');
    }, e => {
      btn.disabled = false; btn.textContent = '📍 Chia sẻ vị trí giao hàng (bắt buộc)';
      toast(e.code === 1 ? 'Bạn đã chặn quyền vị trí. Hãy cho phép "Vị trí" cho trang web rồi thử lại.' : 'Không lấy được vị trí, hãy bật GPS rồi thử lại.');
    }, { enableHighAccuracy:true, timeout:20000, maximumAge:0 });
  }
  function reorder(o) {
    if (!LIVE) return toast('Đã thêm món vào giỏ hàng');
    const s = SHOPS.find(x => x.id === o.shop); if (!s) return toast('Quán này hiện không còn bán');
    CART.shop = s.id; CART.q = {};
    (o.raw.items || []).forEach(it => { const i = s._d.menu.findIndex(m => m.name === it.name && m.available !== false); if (i >= 0) CART.q[i] = (CART.q[i] || 0) + it.qty; });
    if (!Object.keys(CART.q).length) return toast('Các món này hiện không còn bán');
    checkoutSheet();
  }

  /* ---------------- ROUTER ---------------- */
  const TABS = [
    ['home','Trang chủ','home'], ['orders','Đơn hàng','clipboard'], ['favorites','Yêu thích','heart'],
    ['notifications','Thông báo','chat'], ['profile','Cá nhân','user'],
  ];
  const renderers = { home:renderHome, orders:renderOrders, favorites:renderFavorites, notifications:renderNotifications, profile:renderProfile, auth:renderAuth };
  function renderNav() {
    $('#nav').innerHTML = TABS.map(([k, t, i]) => {
      const on = S.tab === k;
      let svg = ic(i);
      if (on) {
        if (k === 'home') svg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.800L2.500 11.200a1 1 0 0 0 .7 1.800H5v7a1 1 0 0 0 1 1h3.500v-6h5v6H18a1 1 0 0 0 1-1v-7h1.800a1 1 0 0 0 .7-1.800z"/></svg>';
        if (k === 'orders') svg = '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M8.500 3a2 2 0 0 0-2 2H6a2.500 2.500 0 0 0-2.500 2.500v11A2.500 2.500 0 0 0 6 21h12a2.500 2.500 0 0 0 2.500-2.500v-11A2.500 2.500 0 0 0 18 5h-.5a2 2 0 0 0-2-2zm.5 2.500h6V4.500H9zM8 11h8v1.700H8zm0 4h6v1.700H8z"/></svg>';
        if (k === 'favorites') svg = fx.heartF;
        if (k === 'notifications') svg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.500a6.500 6.500 0 0 0-6.500 6.500v4.200L3.600 16.300a1 1 0 0 0 .8 1.700h15.200a1 1 0 0 0 .8-1.700l-1.900-3.100V9A6.500 6.500 0 0 0 12 2.500zM9.500 19.500a2.500 2.500 0 0 0 5 0z"/></svg>';
        if (k === 'profile') svg = fx.userF;
      }
      const badge = k === 'notifications' && unreadCount() ? '<span class="badge"></span>' : '';
      return `<button class="${on ? 'on' : ''}" data-go="${k}" aria-label="${t}">${svg}${t}${badge}</button>`;
    }).join('');
  }
  function go(tab, push = true) {
    if (!renderers[tab]) tab = 'home';
    S.tab = tab; hideShopPage();
    $$('.view').forEach(v => v.classList.remove('active'));
    renderers[tab]();
    const v = $('#view-' + tab); v.classList.add('active');
    if (tab !== 'home' || true) v.scrollTop = 0;
    $('#app').classList.toggle('no-nav', tab === 'auth');
    $('#nav').style.display = tab === 'auth' ? 'none' : 'flex';
    $('#views').style.bottom = tab === 'auth' ? '0' : 'var(--nav-h)';
    renderNav();
    if (push && location.hash !== '#' + tab) history.pushState(null, '', '#' + tab);
  }
  window.addEventListener('popstate', () => { if (shopPageOpen) { hideShopPage(); return; } go(location.hash.slice(1) || 'home', false); });
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));

  /* ---------------- EVENTS ---------------- */
  document.addEventListener('click', e => {
    const t = e.target;
    const qb = t.closest('[data-qty]');
    if (qb) { if (!LIVE) return toast('Đây là bản demo, chưa đặt món được'); const i = +qb.dataset.qty, s0 = SHOPS.find(x => x.id === CART.shop); CART.q[i] = Math.max(0, (CART.q[i] || 0) + +qb.dataset.d); const c = $('#ctl-' + i); if (c && s0) c.innerHTML = spCtl(s0, i); updateCartUI(); return; }
    if (t.closest('[data-shopback]')) { history.back(); return; }
    const spc = t.closest('[data-spcat]'); if (spc) { SP.cat = spc.dataset.spcat; renderShopPage(); return; }
    if (t.closest('[data-cart]')) { if (!LIVE) return toast('Đây là bản demo, chưa đặt món được'); return checkoutSheet(); }
    const ap = t.closest('[data-applypromo]');
    if (ap) { readCheckout(); const { s, lines } = cartData(); if (CART.promo && !calc(s, lines, CART.promo).promo) toast('Mã không hợp lệ hoặc chưa đủ điều kiện'); return checkoutSheet(); }
    const po = t.closest('[data-placeorder]'); if (po) return placeOrderNow(po);
    const sl = t.closest('[data-shareloc]'); if (sl) return shareLoc(sl);
    const heart = t.closest('[data-heart]');
    if (heart) {
      e.stopPropagation(); toggleFav(heart.dataset.heart);
      if (heart.dataset.sheet) heart.classList.toggle('on', isFav(heart.dataset.heart));
      if (S.tab === 'home') { $$('#home-list [data-heart]').forEach(h => h.classList.toggle('on', isFav(h.dataset.heart))); }
      else if (S.tab === 'favorites') { const sc = $('#view-favorites').scrollTop; renderFavorites(); $('#view-favorites').scrollTop = sc; }
      return;
    }
    const sm = t.closest('[data-sheetmsg]'); if (sm) { toast(sm.dataset.sheetmsg); closeSheet(); return; }
    const goBtn = t.closest('[data-go]'); if (goBtn) { go(goBtn.dataset.go); return; }
    const shop = t.closest('[data-shop]'); if (shop) { openShopPage(SHOPS.find(x => x.id === shop.dataset.shop)); return; }

    const cat = t.closest('[data-cat]');
    if (cat) { S.home.cat = cat.dataset.cat; $$('#home-chips .chip').forEach(c => c.classList.toggle('on', c === cat)); $('#home-list').innerHTML = shopListHtml(); return; }
    const fcat = t.closest('[data-fcat]');
    if (fcat) { S.fav.cat = fcat.dataset.fcat; renderFavorites(); return; }
    const svc = t.closest('[data-svc]');
    if (svc) {
      if (svc.dataset.svc === 'food') return;
      return toast(svc.querySelector('.ic').nextSibling.textContent + ' – sắp ra mắt');
    }
    const otab = t.closest('[data-otab]'); if (otab) { S.orders.tab = otab.dataset.otab; renderOrders(); return; }
    const ntab = t.closest('[data-ntab]'); if (ntab) { S.noti.tab = ntab.dataset.ntab; renderNotifications(); return; }
    const det = t.closest('[data-detail]'); if (det) return orderDetail(orderByCode(det.dataset.detail));
    const trk = t.closest('[data-track]'); if (trk) return trackSheet(orderByCode(trk.dataset.track));
    const cx = t.closest('[data-cancelorder]');
    if (cx) {
      const o = orderByCode(cx.dataset.cancelorder);
      if (!o || !LIVE) return toast('Không hủy được đơn này');
      if (!confirm('Hủy đơn #' + o.code + '?')) return;
      cx.disabled = true;
      FB.patchOrder(o.id, { status:'cancelled' }).then(() => toast('Đã hủy đơn')).catch(e => { cx.disabled = false; toast(FB.errMsg(e) + ' (có thể shipper vừa nhận đơn)'); });
      return;
    }
    const ctc = t.closest('[data-contact]'); if (ctc) return contactSheet(orderByCode(ctc.dataset.contact));
    const re = t.closest('[data-reorder]'); if (re) { reorder(orderByCode(re.dataset.reorder)); return; }
    const nt = t.closest('[data-notice]');
    if (nt) {
      const n = S.notices.find(x => String(x.id) === nt.dataset.notice);
      if (n && n.unread) { n.unread = false; store.set('notices', S.notices); store.set('readn', S.notices.filter(x => !x.unread).map(x => x.id)); $('.unread', nt).classList.add('off'); renderNav(); $$('.bell i').forEach(i => { if (!unreadCount()) i.remove(); }); }
      const d = NOTICES.find(x => String(x.id) === nt.dataset.notice);
      if (d.type === 'order') return go('orders');
      return openSheet(`<h3>${d.title}</h3><div class="sub">${d.time}</div><p style="margin-top:12px;font-size:15px;line-height:1.5">${d.body}</p><button class="sheet-btn" onclick="document.getElementById('sheet-backdrop').click()">Đã hiểu</button>`);
    }
    const at = t.closest('[data-atab]');
    if (at) { S.authTab = at.dataset.atab; $$('[data-atab]').forEach(b => b.classList.toggle('on', b === at)); if (S.authTab === 'register') { $('#reg-card').scrollIntoView({ behavior:'smooth', block:'start' }); setTimeout(() => $('#reg-form input').focus({ preventScroll:true }), 400); } else { $('#view-auth').scrollTo({ top:0, behavior:'smooth' }); } return; }
    const au = t.closest('[data-auth]'); if (au) { S.authTab = au.dataset.auth; go('auth'); if (S.authTab === 'register') setTimeout(() => $('#reg-card')?.scrollIntoView({ behavior:'smooth' }), 120); return; }
    const eye = t.closest('[data-eye]');
    if (eye) { const inp = eye.parentElement.querySelector('input'); const show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; eye.innerHTML = ic(show ? 'eye' : 'eyeOff'); return; }
    const soc = t.closest('[data-social]'); if (soc) { toast('Đăng nhập bằng ' + soc.dataset.social + ' (demo)'); loginAs({ name:DEMO.name, phone:DEMO.phone }); return; }
    const menu = t.closest('[data-menu]'); if (menu) return menuAction(menu.dataset.menu);

    const act = t.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'forgot' && LIVE) { e.preventDefault(); return openSheet(`<h3>Quên mật khẩu?</h3><div class="sub">Vui lòng gọi hotline <b>${CONTACT.hotline}</b> để được đặt lại mật khẩu.</div><a class="sheet-btn" style="display:block;text-align:center;text-decoration:none" href="tel:${telHot()}">Gọi hotline</a>`); }
    if (a === 'forgot') { e.preventDefault(); return openSheet(`<h3>Quên mật khẩu?</h3><div class="sub">Nhập số điện thoại để nhận mã đặt lại mật khẩu.</div><div class="sheet-input">${fx.phoneF.replace('<svg','<svg width="24" height="24"')}<input type="tel" placeholder="Số điện thoại" inputmode="numeric"></div><button class="sheet-btn" data-sheetmsg="Đã gửi mã xác nhận (demo)">Gửi mã xác nhận</button>`); }
    if (a === 'terms' || a === 'privacy') { e.preventDefault(); return openSheet(`<h3>${a === 'terms' ? 'Điều khoản sử dụng' : 'Chính sách bảo mật'}</h3><p style="margin-top:12px;color:var(--ink-2);line-height:1.55;font-size:14px">Nội dung mẫu. Hãy thay bằng ${a === 'terms' ? 'điều khoản sử dụng' : 'chính sách bảo mật'} chính thức của Lâm Thao Ăn Gì.</p><button class="sheet-btn" onclick="document.getElementById('sheet-backdrop').click()">Đóng</button>`); }
    if (a === 'area') return openSheet(`<h3>Chọn khu vực giao hàng</h3>${AREAS.map(x => `<button class="opt ${x === S.area ? 'sel' : ''}" data-setarea="${x}">${ic('mapPin')}${x}${x === S.area ? `<span class="tick">${ic('check')}</span>` : ''}</button>`).join('')}`);
    if (a === 'filter') return openSheet(`<h3>Sắp xếp &amp; lọc</h3>${[['default','Mặc định'],['rate','Đánh giá cao nhất'],['fast','Giao nhanh nhất'],['sale','Đang giảm giá']].map(([k, l]) => `<button class="opt ${S.home.sort === k ? 'sel' : ''}" data-setsort="${k}">${l}${S.home.sort === k ? `<span class="tick">${ic('check')}</span>` : ''}</button>`).join('')}`);
    if (a === 'filter-fav') return openSheet(`<h3>Sắp xếp yêu thích</h3>${[['recent','Mới lưu nhất'],['rate','Đánh giá cao'],['name','Tên A - Z']].map(([k, l]) => `<button class="opt ${S.fav.sort === k ? 'sel' : ''}" data-setfsort="${k}">${l}${S.fav.sort === k ? `<span class="tick">${ic('check')}</span>` : ''}</button>`).join('')}`);
    if (a === 'order-now') return $('#shops-anchor').scrollIntoView({ behavior:'smooth', block:'start' });
    if (a === 'see-all') { S.home.cat = 'Tất cả'; S.home.q = ''; S.home.sort = 'default'; renderHome(); return toast('Đang hiển thị tất cả quán'); }
    if (a === 'fav-all') { $('#fav-body').scrollIntoView({ behavior:'smooth' }); return; }
    if (a === 'orders-search') { S.orders.search = !S.orders.search; if (!S.orders.search) S.orders.q = ''; renderOrders(); if (S.orders.search) $('#orders-q').focus(); return; }
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-setarea]'); if (a) { S.area = a.dataset.setarea; store.set('area', S.area); closeSheet(); renderers[S.tab](); toast('Đã chọn: ' + S.area); }
    const s = e.target.closest('[data-setsort]'); if (s) { S.home.sort = s.dataset.setsort; closeSheet(); $('#home-list').innerHTML = shopListHtml(); }
    const f = e.target.closest('[data-setfsort]'); if (f) { S.fav.sort = f.dataset.setfsort; closeSheet(); renderFavorites(); }
  });

  function menuAction(k) {
    if (k.startsWith('open-')) { location.href = k.slice(5) + '.html'; return; }
    if (k === 'logout') {
      return openSheet(`<h3>Đăng xuất?</h3><div class="sub">Bạn có chắc muốn thoát khỏi tài khoản hiện tại?</div>
        <button class="sheet-btn" style="background:var(--red)" data-dologout>Đăng xuất</button><button class="sheet-btn" style="background:var(--chip);color:var(--ink)" onclick="document.getElementById('sheet-backdrop').click()">Hủy</button>`);
    }
    if (k === 'account') return openSheet(`<h3>Thông tin tài khoản</h3><div class="row-kv" style="margin-top:12px"><span>Họ và tên</span><b>${S.user.name}</b></div><div class="row-kv"><span>Số điện thoại</span><b>${fmtPhone(S.user.phone)}</b></div><div class="row-kv"><span>Hạng thành viên</span><b>${LIVE ? 'Thành viên' : 'Thành viên bạc'}</b></div>`);
    if (k === 'address') return openSheet(`<h3>Địa chỉ đã lưu</h3><button class="opt">${ic('mapPin')}<span><b>Nhà</b><br><small style="color:var(--ink-2)">${S.area}</small></span></button><button class="sheet-btn" data-sheetmsg="Thêm địa chỉ mới (demo)">+ Thêm địa chỉ mới</button>`);
    if (k === 'payment') return openSheet(`<h3>Phương thức thanh toán</h3>${['Tiền mặt','Thẻ ngân hàng','Ví điện tử'].map((x, i) => `<button class="opt ${i === 0 ? 'sel' : ''}">${ic('check')}${x}</button>`).join('')}`);
    if (k === 'coupons') return openSheet(`<h3>Mã giảm giá của bạn</h3>${(LIVE ? PROMOS.map(p => [esc(p.code), esc(p.desc)]) : [['GIAM30K','Giảm 30K cho đơn từ 100K'],['CUOITUAN','Giảm 20K cho đơn từ 80K'],['FREESHIP','Miễn phí giao hàng đơn từ 60K']]).map(([c, d]) => `<div class="row-kv"><span><b>${c}</b><br><small style="color:var(--ink-2)">${d}</small></span><button style="color:var(--green-d);font-weight:700" data-copy="${c}">Sao chép</button></div>`).join('')}`);
    if (k === 'points') return openSheet(`<h3>Điểm tích lũy</h3><div style="font-family:var(--font-h);font-weight:700;font-size:28px;color:var(--green-d);margin-top:10px">${LIVE ? S.points : 820} điểm</div><div class="sub">${LIVE ? 'Tích 1 điểm cho mỗi 1.000đ của đơn đã hoàn thành' : 'Còn 180 điểm để lên hạng Vàng'}</div>`);
    if (k === 'lang') return openSheet(`<h3>Ngôn ngữ</h3><button class="opt sel">Tiếng Việt<span class="tick">${ic('check')}</span></button><button class="opt" data-sheetmsg="English – sắp ra mắt">English</button>`);
    if (k === 'contact') return openSheet(`<h3>Liên hệ Lâm Thao Ăn Gì</h3><a class="opt" href="tel:${telHot()}">${ic('phone')}Hotline: ${esc(CONTACT.hotline)}</a><a class="opt" href="mailto:${esc(CONTACT.email)}">${ic('mail')}${esc(CONTACT.email)}</a>${CONTACT.zalo ? `<div class="row-kv"><span>Zalo</span><b>${esc(CONTACT.zalo)}</b></div>` : ''}`);
    if (k === 'notif' || k === 'settings') return openSheet(`<h3>${k === 'notif' ? 'Cài đặt thông báo' : 'Cài đặt'}</h3>${['Thông báo đơn hàng','Thông báo ưu đãi','Thông báo hệ thống'].map(x => `<div class="row-kv"><span>${x}</span><b style="color:var(--green-d)">Bật</b></div>`).join('')}`);
    if (k === 'policy') return openSheet(`<h3>Chính sách &amp; Điều khoản</h3><p style="margin-top:12px;color:var(--ink-2);line-height:1.55">Nội dung mẫu – hãy thay bằng chính sách chính thức.</p>`);
    if (k === 'help') return openSheet(`<h3>Trung tâm hỗ trợ</h3><a class="opt" href="tel:${telHot()}">${ic('headset')}Gọi hotline hỗ trợ</a><button class="opt" data-sheetmsg="Câu hỏi thường gặp – sắp ra mắt">${ic('doc')}Câu hỏi thường gặp</button>`);
  }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-dologout]')) { if (LIVE) FB.logout(); S.user = null; store.set('user', null); closeSheet(); toast('Đã đăng xuất'); renderProfile(); }
    const c = e.target.closest('[data-copy]');
    if (c) { navigator.clipboard?.writeText(c.dataset.copy).catch(() => {}); toast('Đã sao chép mã ' + c.dataset.copy); }
  });

  /* ---------------- INIT ---------------- */
  /* ---------------- LIVE: dữ liệu thật từ Firebase ---------------- */
  const fmtWhen = d => {
    const hm = d.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' });
    const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
    return days <= 0 ? `Hôm nay, ${hm}` : days === 1 ? `Hôm qua, ${hm}` : `${d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' })}, ${hm}`;
  };
  const ST_MAP = { pending:'proc', confirmed:'proc', preparing:'proc', ready:'proc', delivering:'ship', done:'done', cancelled:'done' };
  const ST_LABEL = { pending:'Chờ tài xế nhận đơn', confirmed:'Quán đã nhận đơn', preparing:'Đang chuẩn bị', ready:'Chờ tài xế', delivering:'Đang giao', done:'Hoàn thành', cancelled:'Đã hủy' };
  const ST_NOTE = {
    pending:['Đã gửi đơn hàng', 'đang chờ tài xế nhận đơn của bạn.'], confirmed:['Quán đã xác nhận đơn', 'đã xác nhận đơn hàng của bạn.'],
    preparing:['Quán đang chuẩn bị món', 'đang chuẩn bị món cho bạn.'], ready:['Món đã sẵn sàng', 'đã làm xong, đang chờ tài xế đến lấy.'],
    delivering:['Tài xế đang giao hàng', 'Đơn hàng của bạn đang trên đường đến.'], done:['Đơn hàng đã giao thành công', 'Cảm ơn bạn đã đặt món!'], cancelled:['Đơn hàng đã bị hủy', 'đơn hàng đã bị hủy.'],
  };
  let RAW = [], ordersUnsub = null;

  function mapShop(d) {
    const free = +d.freeShipMin || 0, cat = d.cat || '';
    return {
      id:d.id, _d:d, name:esc(d.name), cat:esc(cat), homeCat:esc(cat), img:esc(d.img || 'hero.svg'), rate:+d.rate || 0, rc:esc(d.rc || ''),
      eta:esc(d.eta || '15 - 30 phút'), ship:free ? Math.round(free / 1000) + 'K' : '', shipFee:d.shipFee ?? 15000, freeShipMin:free, sale:+d.sale || 0, order:(d.order == null || isNaN(+d.order)) ? 9999 : +d.order, featured:!!d.featured,
      group:((d.group && d.group.length) ? d.group : [cat.split('•')[0].trim()]).map(esc), desc:esc(d.desc || ''),
      menu:(d.menu || []).map(m => [esc(m.name), +m.price || 0, m.available !== false, esc(m.cat || ''), esc(m.img || '')]), lat:d.lat ?? null, lng:d.lng ?? null, open:d.open !== false, phone:esc(d.phone || ''), address:esc(d.address || ''),
    };
  }
  function mapOrder(o) {
    const t = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate() : new Date();
    if (!SHOPS.some(s => s.id === o.shopId)) GHOST[o.shopId] = { id:o.shopId, name:esc(o.shopName), cat:'', img:'hero.svg', group:['Quán'], menu:[] };
    return { id:o.id, code:esc(o.code), shop:o.shopId, st:ST_MAP[o.status] || 'proc', status:o.status, label:ST_LABEL[o.status], items:(o.items || []).map(i => `${i.qty} x ${esc(i.name)}`),
      total:o.total || 0, shipFee:o.shipFee || 0, address:esc(o.address), when:fmtWhen(t), t:t.getTime(), shipperName:esc(o.shipperName || ''), raw:o };
  }
  function rebuildNotices() {
    const read = new Set(store.get('readn', []));
    NOTICES = [
      ...ORDERS.slice(0, 20).map(o => ({ id:o.id + ':' + o.status, type:'order', title:ST_NOTE[o.status][0], time:o.when, img:shopBy(o.shop).img,
        body:o.status === 'delivering' || o.status === 'done' ? `Đơn #${o.code}: ${ST_NOTE[o.status][1]}` : `<b>${shopBy(o.shop).name}</b> ${ST_NOTE[o.status][1]}` })),
      ...PROMOS.map(p => ({ id:'p:' + p.id, type:'promo', title:'Ưu đãi: ' + esc(p.code), body:esc(p.desc), time:'', svg:'giftSm' })),
    ];
    S.notices = NOTICES.map(n => ({ id:n.id, unread:!read.has(n.id) }));
    if (S.tab === 'notifications') renderNotifications();
    renderNav();
  }
  function rebuildOrders() {
    ORDERS = RAW.map(mapOrder).sort((a, b) => b.t - a.t);
    S.points = Math.floor(ORDERS.filter(o => o.status === 'done').reduce((a, o) => a + o.total, 0) / 1000);
    rebuildNotices();
    if (S.tab === 'orders') { if (S.orders.search && document.activeElement && document.activeElement.id === 'orders-q') $('#orders-list').innerHTML = ordersListHtml(); else renderOrders(); }
    if (S.tab === 'profile') renderProfile();
  }
  function prepareLive() {
    SHOPS = []; ORDERS = []; NOTICES = [];
    S.user = null; S.users = []; S.notices = []; S.favs = store.get('favs', []);
    $('#app').classList.add('live');
  }
  function connectLive() {
    import('./fb.js?v=20261012b').then(m => {
      FB = m;
      FB.watchShops((l, err) => {
        if (err) return toast('Không tải được danh sách quán');
        shopsLoaded = true;
        SHOPS = l.map(mapShop).sort((a, b) => (b.open !== false) - (a.open !== false) || a.order - b.order || a.name.localeCompare(b.name, 'vi'));
        if (S.tab === 'home' && $('#banner')) $('#banner').innerHTML = bannerInner();
        if (shopPageOpen) { if (SHOPS.some(x => x.id === SP.id)) renderShopPage(); }
        if (S.tab === 'home' && $('#home-list')) $('#home-list').innerHTML = shopListHtml();
        else if (S.tab === 'favorites' && $('#fav-body')) { $('#fav-body').innerHTML = favBody(); bindFavSort(); }
        else if (S.tab === 'orders') rebuildOrders();
      });
      FB.watchPromos(l => { PROMOS = l.filter(p => p.active !== false); rebuildNotices(); if (S.tab === 'profile') renderProfile(); });
      FB.watchSettings(c => { CONTACT = { ...CONTACT, ...Object.fromEntries(Object.entries(c).filter(([, v]) => v)) }; });
      FB.onAuth((u, p) => {
        if (ordersUnsub) { ordersUnsub(); ordersUnsub = null; }
        RAW = [];
        if (u && p) {
          S.user = { uid:u.uid, name:p.name, phone:p.phone, role:p.role, address:p.address || '' };
          ordersUnsub = FB.watchMyOrders(u.uid, l => { RAW = l; rebuildOrders(); });
        } else S.user = null;
        rebuildOrders();
        if (S.tab === 'profile') renderProfile();
      });
    }).catch(() => toast('Không kết nối được máy chủ dữ liệu'));
  }

  function boot() {
    const first = location.hash.slice(1);
    go(renderers[first] ? first : 'home', false);
    history.replaceState(null, '', '#' + S.tab);
    startSlider();
  }
  import('./firebase-config.js?v=20261012b')
    .then(m => { LIVE = !!m.firebaseConfig.apiKey && !/^(DAN_|YOUR_)/.test(m.firebaseConfig.apiKey); })
    .catch(() => {})
    .then(() => { if (LIVE) prepareLive(); boot(); if (LIVE) connectLive(); });
})();
