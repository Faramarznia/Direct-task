/* آیکون‌های خطی ۲۴×۲۴ و تصویرسازی‌ها — همه درون‌خطی، بدون وابستگی خارجی */
(function () {
  'use strict';

  const P = {
    home: '<path d="M3.5 10.2 12 3.5l8.5 6.7V19.5a1 1 0 0 1-1 1H15v-5.5H9v5.5H4.5a1 1 0 0 1-1-1z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>',
    message: '<path d="M20 4H4a1 1 0 0 0-1 1v15l4-3h13a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"/><path d="M7.5 9h9M7.5 12.5h6"/>',
    device: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><rect x="8.5" y="5" width="7" height="4" rx="1"/><path stroke-width="2.4" d="M9.3 12.6h.01M12 12.6h.01M14.7 12.6h.01M9.3 15.4h.01M12 15.4h.01M14.7 15.4h.01M9.3 18.2h.01M12 18.2h.01M14.7 18.2h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevL: '<path d="M14.5 18l-6-6 6-6"/>',
    chevR: '<path d="M9.5 18l6-6-6-6"/>',
    chevD: '<path d="M6 9.5l6 6 6-6"/>',
    back: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 2.8L16.2 9.6"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6h.01"/>',
    qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/><path d="M14 14h2.8v2.8M20.5 14v.01M14 20.5h.01M17.5 20.5h3v-3"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16"/>',
    store: '<path d="M4 9.5 5.6 4.5h12.8L20 9.5M4.5 10.5v9.5h15v-9.5"/><path d="M4 9.5c0 1.4 1.1 2.5 2.7 2.5s2.6-1.1 2.6-2.5c0 1.4 1.2 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1.1 2.5 2.6 2.5S20 10.9 20 9.5M10 20v-4.5h4V20"/>',
    layers: '<path d="M12 3.5 3.5 8 12 12.5 20.5 8z"/><path d="M3.5 12.5 12 17l8.5-4.5"/><path d="M3.5 16.5 12 21l8.5-4.5" opacity=".5"/>',
    tag: '<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.2 7.2a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.2-7.2a1 1 0 0 1-.3-.7z"/><circle cx="8.2" cy="8.2" r="1.5"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3z"/>',
    sparkle: '<path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    more: '<path stroke-width="2.8" d="M12 5.5h.01M12 12h.01M12 18.5h.01"/>',
    edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14 7l3 3"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    locate: '<circle cx="12" cy="12" r="2"/><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 4v4.5H8M12 7.5V12l3 2"/>',
    wifiOff: '<path d="M2.5 8.6a15 15 0 0 1 4-2.6M10.3 4.6A15 15 0 0 1 21.5 8.6M5.8 12a10 10 0 0 1 3-1.8M15 10.3a10 10 0 0 1 3.2 1.7M9 15.5a5 5 0 0 1 6 0M12 19h.01M3.5 3.5l17 17"/>',
    wifi: '<path d="M2.5 8.6a15 15 0 0 1 19 0M5.8 12a10 10 0 0 1 12.4 0M9 15.5a5 5 0 0 1 6 0M12 19h.01"/>',
    refresh: '<path d="M20 11.5a8 8 0 1 0-2.3 5.6"/><path d="M20 5v6.5h-6.5"/>',
    phone: '<path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .9-1 1.6v.5M12 17h.01"/>',
    flask: '<path d="M9 3.5h6M10 3.5v5.8L4.6 18.4A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5-2.6L14 9.3V3.5"/><path d="M7.4 15h9.2"/>',
    doc: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 16.5h4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
    userPlus: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.6 0 3 .5 4.2 1.4M18 14v6M15 17h6"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9v.2h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    flash: '<path d="M7 3h10l-2 6h3l-8 12 1.5-8.5H8z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    send: '<path d="M20.5 3.5 10 14M20.5 3.5l-6.5 17-4-6.5-6.5-4z"/>',
    swap: '<path d="M7 4 3.5 7.5 7 11M3.5 7.5h13M17 13l3.5 3.5L17 20M20.5 16.5h-13"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8S10.5 3.5 8 4.5 9 8 12 8zM12 8s1.5-4.5 4-3.5S15 8 12 8z"/>',
    star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>'
  };

  function icon(name, attrs) {
    const body = P[name] || P.info;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' +
      (attrs ? ' ' + attrs : '') + '>' + body + '</svg>';
  }

  /* دستگاه ثبت شماره (مشابه تصویر صفحه اصلی direct.ir) */
  function deviceArt(opts) {
    const o = Object.assign({ w: 132, screen: 'phone', check: false }, opts || {});
    const keys = ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const xs = [42, 70, 98];
    const ys = [96, 121, 146];
    let k = '';
    keys.forEach((d, i) => {
      const x = xs[i % 3];
      const y = ys[Math.floor(i / 3)];
      k += '<rect x="' + (x - 11) + '" y="' + (y - 10) + '" width="22" height="20" rx="6" fill="#1D212B"/>' +
        '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-family="Pinar,YekanBakh,sans-serif" font-weight="700" font-size="13" fill="#F4F6FA">' + d + '</text>';
    });
    const ly = 171;
    k += '<rect x="31" y="' + (ly - 10) + '" width="22" height="20" rx="6" fill="#1D212B"/><path d="M47 ' + ly + 'h-10m3.5-3.5L37 ' + ly + 'l3.5 3.5" stroke="#F4F6FA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    k += '<rect x="59" y="' + (ly - 10) + '" width="22" height="20" rx="6" fill="#1D212B"/><text x="70" y="' + (ly + 5) + '" text-anchor="middle" font-family="Pinar,YekanBakh,sans-serif" font-weight="700" font-size="13" fill="#F4F6FA">۰</text>';
    k += '<circle cx="98" cy="' + ly + '" r="11" fill="#2563EB"/><path d="M93.5 ' + ly + 'l3 3 6-6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';

    let screen;
    if (o.screen === 'phone') {
      screen = '<text x="106" y="34" text-anchor="end" font-family="YekanBakh,sans-serif" font-weight="700" font-size="7.5" fill="#5D6579">شماره موبایل شما</text>' +
        '<rect x="30" y="40" width="80" height="18" rx="5" fill="#fff" stroke="#D7DFEC"/>' +
        '<text x="70" y="53" text-anchor="middle" font-family="Pinar,YekanBakh,sans-serif" font-weight="700" font-size="9" fill="#121826" direction="ltr">۰۹۱۲ ۳۴۵ ۶۷۸۹</text>';
    } else {
      screen = '<circle cx="70" cy="44" r="12" fill="#14A05B"/><path d="M64.5 44l3.8 3.8 7-7" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    }
    return '<svg width="' + o.w + '" viewBox="0 0 140 200" style="direction:ltr" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="dvb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#262A35"/><stop offset="1" stop-color="#0F1218"/></linearGradient></defs>' +
      '<rect x="12" y="4" width="116" height="192" rx="24" fill="url(#dvb)"/>' +
      '<rect x="12.5" y="4.5" width="115" height="191" rx="23.5" fill="none" stroke="#3A4050" stroke-opacity=".6"/>' +
      '<rect x="24" y="18" width="92" height="50" rx="10" fill="#EEF2F8"/>' + screen + k +
      '</svg>';
  }

  /* پشت دستگاه با برچسب کد — برای «کد کجاست؟» */
  function stickerArt(code) {
    const c = code || '۴۸۲۱ ۷۷۳۰';
    let qr = '';
    const pattern = ['1110111', '1010101', '1110111', '0001000', '1101011', '0010101', '1101110'];
    pattern.forEach((row, y) => {
      row.split('').forEach((b, x) => {
        if (b === '1') qr += '<rect x="' + (80 + x * 4) + '" y="' + (78 + y * 4) + '" width="4" height="4" fill="#121826"/>';
      });
    });
    return '<svg width="260" viewBox="0 0 260 170" style="direction:ltr" aria-hidden="true" focusable="false">' +
      '<rect x="56" y="8" width="148" height="154" rx="24" fill="#1A1E27"/>' +
      '<circle cx="130" cy="30" r="4" fill="#2C313D"/>' +
      '<rect x="70" y="66" width="120" height="58" rx="8" fill="#fff"/>' +
      '<rect x="65" y="61" width="130" height="68" rx="12" fill="none" stroke="#3B7BF6" stroke-width="2.5" stroke-dasharray="5 4"><animate attributeName="stroke-dashoffset" from="0" to="18" dur="1.2s" repeatCount="indefinite"/></rect>' +
      qr +
      '<text x="182" y="86" text-anchor="end" font-family="YekanBakh,sans-serif" font-weight="700" font-size="7.5" fill="#8B92A3">کد دستگاه</text>' +
      '<text x="182" y="103" text-anchor="end" font-family="Pinar,YekanBakh,sans-serif" font-weight="800" font-size="12.5" fill="#121826">' + c + '</text>' +
      '<text x="182" y="117" text-anchor="end" font-family="YekanBakh,sans-serif" font-weight="700" font-size="6.5" fill="#B7BCC8" letter-spacing=".5">DIRECT 3</text>' +
      '<path d="M236 48c-12 4-20 12-24 26" stroke="#3B7BF6" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="3 4"/>' +
      '<path d="M207 69l5 6 5-7" stroke="#3B7BF6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<text x="256" y="40" text-anchor="end" font-family="YekanBakh,sans-serif" font-weight="800" font-size="10" fill="#2563EB">برچسب پشت</text>' +
      '</svg>';
  }

  window.ICONS = { icon, deviceArt, stickerArt };
})();
