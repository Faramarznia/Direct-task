/* ==========================================================================
   Direct · نمونه تعاملی «افزودن و مدیریت دستگاه»
   بدون فریم‌ورک و وابستگی خارجی؛ با باز کردن index.html اجرا می‌شود.
   ========================================================================== */
(function () {
  'use strict';

  const { icon, deviceArt, stickerArt } = window.ICONS;

  /* ------------------------------------------------------------------ utils */
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const DAY = 86400000;
  const HOUR = 3600000;
  const MIN = 60000;
  const fa = (v) => String(v).replace(/[0-9]/g, (d) => FA[d]);
  const toLatin = (s) => String(s || '')
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const nf = (x) => fa(Math.round(x).toLocaleString('en-US')).replace(/,/g, '٬');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const normKey = (s) => clean(s).replace(/‌/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s/g, '').toLowerCase();
  const stripPrefix = (s, p) => clean(s).replace(new RegExp('^' + p + '\\s*'), '');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const vibrate = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* noop */ } };
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const fmtCode = (c) => fa(c.slice(0, 4) + ' ' + c.slice(4));
  const maskPhone = (p) => fa(p.slice(0, 4) + ' ••• ' + p.slice(7));
  let dateFmt = null;
  try { dateFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { dateFmt = null; }
  const fmtDate = (t) => (dateFmt ? dateFmt.format(new Date(t)) : new Date(t).toLocaleDateString());

  function rel(t) {
    const s = (Date.now() - t) / 1000;
    if (s < 50) return 'همین الان';
    if (s < 3600) return fa(Math.max(1, Math.round(s / 60))) + ' دقیقه پیش';
    if (s < 86400) return fa(Math.floor(s / 3600)) + ' ساعت پیش';
    const d = Math.floor(s / 86400);
    if (d === 1) return 'دیروز';
    if (d < 30) return fa(d) + ' روز پیش';
    if (d < 365) return fa(Math.floor(d / 30)) + ' ماه پیش';
    return fa(Math.floor(d / 365)) + ' سال پیش';
  }

  const SEP = '<span class="sep" aria-hidden="true"></span>';
  const SECTION_COLORS = ['orange', 'pink', 'purple', 'green', 'yellow', 'blue'];
  const BRANCH_COLORS = ['blue', 'purple', 'green', 'orange', 'pink', 'yellow'];

  /* ------------------------------------------------------------------ store */
  const KEY = 'direct-devices-prototype-v3';
  let S = null;
  let saveTimer = null;
  const store = {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) { const s = JSON.parse(raw); if (s && s.v === 3) return s; }
      } catch (e) { /* private mode etc. */ }
      return null;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* noop */ } },
    snapshot() { return JSON.stringify(S); },
    restore(snap) { S = JSON.parse(snap); }
  };
  function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(store.save, 120); }
  function commit() { persist(); refresh(); }
  const uid = (p) => p + (++S.seq) + Math.floor(Math.random() * 1000);

  /* ------------------------------------------------------------- selectors */
  const Q = {
    multi: () => S.branches.length > 1,
    branch: (id) => S.branches.find((b) => b.id === id),
    section: (id) => S.sections.find((s) => s.id === id),
    device: (id) => S.devices.find((d) => d.id === id),
    devicesIn: (bid) => S.devices.filter((d) => d.branchId === bid),
    devicesInSection: (sid) => S.devices.filter((d) => d.sectionId === sid),
    uniq(regs, pred) { const set = new Set(); for (const r of regs) if (pred(r)) set.add(r.c); return set.size; },
    branchCount: (bid, regs) => Q.uniq(regs || S.regs, (r) => r.b === bid),
    sectionCount: (sid, regs) => Q.uniq(regs || S.regs, (r) => r.s === sid),
    totalCustomers: () => new Set(S.regs.map((r) => r.c)).size,
    todayRegs() { const t0 = startOfToday(); return S.regs.filter((r) => r.t >= t0).length; },
    deviceStats(id) {
      const set = new Set(); let today = 0; let last = 0; const t0 = startOfToday();
      for (const r of S.regs) if (r.d === id) { set.add(r.c); if (r.t >= t0) today++; if (r.t > last) last = r.t; }
      return { total: set.size, today, last };
    },
    branchLabel: (id) => { const b = Q.branch(id); return b ? 'شعبه ' + b.name : ''; },
    sectionLabel: (id) => { const s = Q.section(id); return s ? 'بخش ' + s.name : ''; },
    groupCount: () => (Q.multi() ? S.branches.length : 0) + S.sections.length,
    tagsForDevice(d) {
      const t = [];
      if (Q.multi() && Q.branch(d.branchId)) t.push({ kind: 'branch', id: d.branchId, label: Q.branchLabel(d.branchId), color: Q.branch(d.branchId).color });
      if (d.sectionId && Q.section(d.sectionId)) t.push({ kind: 'section', id: d.sectionId, label: Q.sectionLabel(d.sectionId), color: Q.section(d.sectionId).color });
      return t;
    },
    tagsForCustomer(cid) {
      const b = new Set(); const s = new Set();
      for (const r of S.regs) if (r.c === cid) { b.add(r.b); if (r.s) s.add(r.s); }
      const t = [];
      if (Q.multi()) b.forEach((id) => { const br = Q.branch(id); if (br) t.push({ kind: 'branch', id, label: 'شعبه ' + br.name, color: br.color }); });
      s.forEach((id) => { const se = Q.section(id); if (se) t.push({ kind: 'section', id, label: 'بخش ' + se.name, color: se.color }); });
      return t;
    }
  };

  /* ------------------------------------------------------------ components */
  function devTile(d, size) {
    const sec = d.sectionId ? Q.section(d.sectionId) : null;
    return '<span class="tile ' + (size ? 'tile--' + size + ' ' : '') + 'tile--' + (sec ? sec.color : 'blue') + '">' + icon('device') + '</span>';
  }

  function statusChip(d) {
    if (d.status === 'online') return '<span class="status status--online"><i></i>آنلاین</span>';
    if (d.status === 'pending') return '<span class="status status--pending"><i></i>در انتظار اتصال</span>';
    return '<span class="status status--offline"><i></i>آفلاین</span>';
  }

  function tagChip(t, extra) {
    return '<span class="chip chip--' + t.color + (extra ? ' ' + extra : '') + '">' + icon(t.kind === 'branch' ? 'store' : 'layers') + esc(t.label) + '</span>';
  }

  function appbar(o) {
    let lead = '';
    if (o.back === 'close') lead = '<button class="icon-btn" data-action="' + (o.backAction || 'back') + '" aria-label="بستن">' + icon('close') + '</button>';
    else if (o.back) lead = '<button class="icon-btn" data-action="' + (o.backAction || 'back') + '" aria-label="بازگشت">' + icon('back') + '</button>';
    return '<header class="appbar' + (o.collapsing ? ' appbar--collapsing' : '') + '">' + lead +
      '<h2 class="appbar__title">' + esc(o.title || '') + '</h2>' +
      '<div class="appbar__actions">' + (o.actions || '') + '</div></header>';
  }

  function sheetHTML(o) {
    return '<div class="sheet__grab" data-drag><i></i></div>' +
      '<div class="sheet__head" data-drag><div class="sheet__titles"><h2 class="sheet__title" id="sheet-title">' + o.title + '</h2>' +
      (o.sub ? '<p class="sheet__sub">' + o.sub + '</p>' : '') + '</div>' +
      (o.close === false ? '' : '<button class="icon-btn sheet__close" data-action="sheet-close" aria-label="بستن">' + icon('close') + '</button>') +
      '</div><div class="sheet__body">' + o.body + '</div>' +
      (o.footer ? '<div class="sheet__footer' + (o.footerRow ? ' sheet__footer--row' : '') + '">' + o.footer + '</div>' : '');
  }

  function fieldError(msg, id) {
    return msg ? '<p class="field__error" id="' + id + '" role="alert">' + icon('alert') + '<span>' + msg + '</span></p>' : '';
  }

  /* ------------------------------------------------------------------ toast */
  const Toast = {
    timer: null,
    show(msg, o) {
      o = o || {};
      const host = $toast;
      clearTimeout(this.timer);
      const ic = o.tone === 'info' ? 'info' : o.tone === 'warning' ? 'alert' : 'check';
      host.innerHTML = '<div class="toast toast--' + (o.tone || 'success') + '" role="status">' +
        '<span class="toast__icon">' + icon(ic) + '</span><span class="toast__msg">' + msg + '</span>' +
        (o.action ? '<button class="toast__action" data-action="toast-action">' + o.action.label + '</button>' : '') + '</div>';
      this.onAction = o.action ? o.action.fn : null;
      this.timer = setTimeout(() => this.hide(), o.duration || (o.action ? 6500 : 4200));
    },
    hide() {
      const t = $toast.querySelector('.toast');
      if (!t) return;
      t.classList.add('is-leaving');
      setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 230);
    }
  };
  const toast = (m, o) => Toast.show(m, o);

  function undoable(snap, msg, o) {
    toast(msg, Object.assign({}, o, {
      action: {
        label: 'بازگردانی',
        fn() { store.restore(snap); persist(); Sheets.closeAll(true); if (Nav.cur().name === 'device' && !Q.device(Nav.cur().id)) Nav.reset([{ name: 'devices' }], 'none'); refresh(); toast('تغییر بازگردانده شد', { tone: 'info' }); }
      }
    }));
  }

  /* ----------------------------------------------------------------- sheets */
  const Sheets = {
    stack: [],
    top() { return this.stack[this.stack.length - 1]; },
    open(def) {
      Toast.hide();
      const layer = document.createElement('div');
      layer.className = 'sheet-layer';
      layer.innerHTML = '<div class="sheet-backdrop" data-action="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1"></div>';
      $app.appendChild(layer);
      const sheet = {
        def, layer, el: layer.querySelector('.sheet'), st: def.state ? def.state() : {},
        ret: document.activeElement,
        render() { this.el.innerHTML = def.render(this); if (def.mount) def.mount(this); },
        refresh() {
          const body = this.el.querySelector('.sheet__body');
          const top = body ? body.scrollTop : 0;
          withFocus(this.el, () => this.render());
          const nb = this.el.querySelector('.sheet__body');
          if (nb) nb.scrollTop = top;
        },
        close(instant) {
          if (this.closed) return;
          this.closed = true;
          Sheets.stack = Sheets.stack.filter((s) => s !== this);
          const done = () => { if (layer.parentNode) layer.parentNode.removeChild(layer); };
          if (instant) done();
          else { layer.classList.remove('is-open'); setTimeout(done, 380); }
          if (def.onClose) def.onClose(this);
          if (this.ret && document.contains(this.ret) && !instant) { try { this.ret.focus({ preventScroll: true }); } catch (e) { /* noop */ } }
          refreshDemo();
        }
      };
      this.stack.push(sheet);
      sheet.render();
      enableDrag(sheet);
      requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('is-open')));
      setTimeout(() => {
        const af = def.autofocus && sheet.el.querySelector(def.autofocus);
        try { (af || sheet.el).focus({ preventScroll: true }); } catch (e) { /* noop */ }
      }, 60);
      refreshDemo();
      return sheet;
    },
    closeAll(instant) { this.stack.slice().reverse().forEach((s) => s.close(instant)); },
    refreshAll() { this.stack.forEach((s) => s.refresh()); }
  };

  function enableDrag(sheet) {
    const el = sheet.el;
    let y0 = null; let dy = 0; let pid = null;
    el.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('[data-drag]') || e.target.closest('button')) return;
      y0 = e.clientY; dy = 0; pid = e.pointerId; el.classList.add('is-dragging');
      try { el.setPointerCapture(pid); } catch (er) { /* noop */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (y0 === null || e.pointerId !== pid) return;
      dy = Math.max(0, e.clientY - y0);
      el.style.transform = 'translateY(' + dy + 'px)';
    });
    const end = () => {
      if (y0 === null) return;
      el.classList.remove('is-dragging');
      el.style.transform = '';
      if (dy > 90) sheet.close();
      y0 = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function withFocus(container, fn) {
    const a = document.activeElement;
    let key = null;
    if (a && container.contains(a)) key = focusKey(a);
    fn();
    if (key) {
      const n = Array.prototype.find.call(container.querySelectorAll('[data-action],[data-input],[id]'), (x) => focusKey(x) === key);
      if (n) { try { n.focus({ preventScroll: true }); } catch (e) { /* noop */ } }
    }
  }
  function focusKey(el) {
    if (el.id) return '#' + el.id;
    const d = el.dataset || {};
    if (d.action || d.input) return [d.action, d.input, d.id, d.v, d.branch].join('|');
    return null;
  }

  /* ----------------------------------------------------------------- router */
  const ADD_ROUTES = ['addCode', 'addDetails', 'addSuccess', 'scan'];
  const Nav = {
    stack: [{ name: 'home' }],
    cur() { return this.stack[this.stack.length - 1]; },
    push(r) { this.stack.push(r); render('fwd'); },
    back() {
      const cur = this.cur();
      if (Screens[cur.name] && Screens[cur.name].onBack && Screens[cur.name].onBack(cur) === false) return;
      if (this.stack.length > 1) { this.stack.pop(); render('back'); }
      else if (cur.name !== 'home') this.tab('home');
    },
    tab(name) { flowCleanup(); this.stack = [{ name }]; render('fade'); },
    reset(stack, dir) { this.stack = stack; render(dir || 'fade'); }
  };
  const routeKey = (r) => r.name + ':' + (r.id || '');

  let $app; let $screens; let $tabbar; let $toast; let $demoBody;
  let identifying = null;
  let identifyTimer = null;

  function render(dir) {
    const r = Nav.cur();
    const scr = Screens[r.name] || Screens.home;
    if (dir) Sheets.closeAll(true);
    const html = scr.render(r);
    const old = $screens.querySelector('.screen:not(.is-leaving)');

    if (!dir && old && old.dataset.key === routeKey(r)) {
      const body = old.querySelector('.screen__body');
      const top = body ? body.scrollTop : 0;
      withFocus(old, () => { old.innerHTML = html; });
      const nb = old.querySelector('.screen__body');
      if (nb) nb.scrollTop = top;
      if (scr.mount) scr.mount(old, r, true);
      after(old, scr);
      return;
    }

    const el = document.createElement('div');
    el.className = 'screen';
    el.dataset.key = routeKey(r);
    el.innerHTML = html;
    if (old) {
      if (dir === 'back') $screens.insertBefore(el, old); else $screens.appendChild(el);
      old.classList.add('is-leaving');
      if (dir === 'fwd') { el.classList.add('screen--enter-fwd'); old.classList.add('screen--exit-fwd'); }
      else if (dir === 'back') { el.classList.add('screen--enter-back'); old.classList.add('screen--exit-back'); }
      else el.classList.add('screen--fade');
      const kill = () => { if (old.parentNode) old.parentNode.removeChild(old); };
      if (dir === 'fwd' || dir === 'back') { old.addEventListener('animationend', kill, { once: true }); setTimeout(kill, 520); }
      else kill();
    } else {
      $screens.appendChild(el);
    }
    el.addEventListener('animationend', () => el.classList.remove('screen--enter-fwd', 'screen--enter-back', 'screen--fade'), { once: true });
    if (scr.mount) scr.mount(el, r, false);
    after(el, scr);
    const f = el.querySelector('[data-autofocus]') || el.querySelector('h1[tabindex]');
    if (f && dir) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { /* noop */ } }, 40);
  }

  function after(el, scr) {
    const body = el.querySelector('.screen__body');
    const bar = el.querySelector('.appbar');
    if (body && bar) {
      const upd = () => bar.classList.toggle('is-scrolled', body.scrollTop > 36);
      body.addEventListener('scroll', upd, { passive: true });
      upd();
    }
    renderTabbar(scr.tab);
    const footer = el.querySelector('.screen__footer');
    const off = (footer ? footer.offsetHeight : 0) + (scr.tab ? 64 : 0) + 12;
    $toast.style.setProperty('--toast-offset', off + 'px');
    refreshDemo();
  }

  function refresh() {
    render(null);
    Sheets.refreshAll();
  }

  function renderTabbar(active) {
    if (!active) { $tabbar.classList.add('is-hidden'); $tabbar.setAttribute('aria-hidden', 'true'); return; }
    $tabbar.classList.remove('is-hidden');
    $tabbar.removeAttribute('aria-hidden');
    const offline = S.devices.some((d) => d.status === 'offline');
    const tabs = [
      ['home', 'home', 'خانه'],
      ['customers', 'users', 'مشتریان'],
      ['messages', 'message', 'ارسال پیام'],
      ['devices', 'device', 'دستگاه‌ها']
    ];
    $tabbar.innerHTML = tabs.map(([k, ic, label]) =>
      '<button class="tab' + (active === k ? ' is-active' : '') + '" data-action="tab" data-v="' + k + '"' + (active === k ? ' aria-current="page"' : '') + '>' +
      icon(ic) + '<span>' + label + '</span>' + (k === 'devices' && offline ? '<i class="tab__badge" aria-label="دستگاه آفلاین"></i>' : '') + '</button>').join('');
  }

  /* -------------------------------------------------------------- add flow */
  let flow = null;
  let scanTimers = [];

  function startAdd(opts) {
    opts = opts || {};
    flow = {
      code: '', status: 'idle', error: null, found: null, showWhere: false, netFailed: {},
      name: '', nameEdited: false, nameError: null,
      branchId: opts.branchId || (Q.multi() ? null : S.branches[0].id), branchError: null, branchPreset: !!opts.branchId,
      sectionId: null, newSection: '', sectionError: null, optOpen: false, submitting: false, detailsFor: null
    };
    const base = Nav.stack.filter((r) => ADD_ROUTES.indexOf(r.name) < 0 && r.name !== 'device');
    Nav.reset((base.length ? base : [{ name: 'devices' }]).concat([{ name: 'addCode' }]), 'fwd');
  }

  function flowCleanup() {
    scanTimers.forEach(clearTimeout); scanTimers = [];
  }

  function exitAdd() {
    flowCleanup();
    flow = null;
    const base = Nav.stack.filter((r) => ADD_ROUTES.indexOf(r.name) < 0);
    Nav.reset(base.length ? base : [{ name: 'devices' }], 'back');
  }

  function hasProgress() { return flow && (flow.code.length > 0); }

  function defaultName(bid) {
    const pool = bid ? Q.devicesIn(bid) : S.devices;
    const used = new Set(pool.map((d) => normKey(d.name)));
    let n = pool.length + 1;
    while (used.has(normKey('دستگاه ' + fa(n)))) n++;
    return 'دستگاه ' + fa(n);
  }

  function nameProblem(name, bid, selfId) {
    const v = clean(name);
    if (!v) return 'یک نام برای دستگاه بنویسید؛ مثلاً جای قرارگیری آن.';
    if (v.length < 2) return 'نام باید دست‌کم ۲ حرف باشد.';
    const pool = (bid ? Q.devicesIn(bid) : S.devices).filter((d) => d.id !== selfId);
    const dup = pool.find((d) => normKey(d.name) === normKey(v));
    if (dup) return Q.multi() ? 'در ' + esc(Q.branchLabel(bid)) + ' دستگاهی با نام «' + esc(dup.name) + '» هست. نام دیگری بگذارید تا دو دستگاه از هم تشخیص داده شوند.'
      : 'دستگاهی با نام «' + esc(dup.name) + '» دارید. نام دیگری بگذارید تا دو دستگاه از هم تشخیص داده شوند.';
    return null;
  }

  function fakeVerify(code) {
    const netFailed = flow.netFailed;
    return sleep(950 + Math.random() * 450).then(() => {
      if (/^(\d)\1{7}$/.test(code) && code !== '22222222' && code !== '33333333') return { ok: false, error: 'not_found' };
      if (code === '22222222') return { ok: false, error: 'other_account' };
      if (code === '33333333' && !netFailed[code]) { netFailed[code] = 1; return { ok: false, error: 'network' }; }
      const dup = S.devices.find((d) => d.code === code);
      if (dup) return { ok: false, error: 'duplicate', device: dup };
      return { ok: true, model: 'دایرکت ۳' };
    });
  }

  async function verify() {
    if (!flow || flow.status === 'checking' || flow.code.length !== 8) return;
    if (flow.status === 'valid' && flow.found && flow.detailsFor === flow.code) { Nav.push({ name: 'addDetails' }); return; }
    const code = flow.code;
    flow.status = 'checking'; flow.error = null;
    updateCodeUI();
    const res = await fakeVerify(code);
    if (!flow || flow.code !== code || Nav.cur().name !== 'addCode') return;
    if (res.ok) {
      flow.status = 'valid'; flow.found = res;
      updateCodeUI(); vibrate(18);
      await sleep(520);
      if (!flow || Nav.cur().name !== 'addCode') return;
      initDetails();
      Nav.push({ name: 'addDetails' });
    } else {
      flow.status = 'error'; flow.error = res;
      updateCodeUI(); vibrate([30, 40, 30]);
    }
  }

  function initDetails() {
    if (flow.detailsFor === flow.code) return;
    flow.detailsFor = flow.code;
    flow.name = defaultName(flow.branchId);
    flow.nameEdited = false; flow.nameError = null; flow.sectionId = null; flow.newSection = ''; flow.sectionError = null;
  }

  function codeMessage() {
    if (!flow) return '';
    const e = flow.error;
    if (flow.status === 'checking') return '<p class="field__help" style="text-align:center">در حال بررسی کد…</p>';
    if (flow.status === 'valid') return '<p class="field__help" style="text-align:center;color:var(--success-ink);font-weight:700">دستگاه پیدا شد ✓</p>';
    if (flow.status !== 'error' || !e) return '<p class="field__help" style="text-align:center">ارقام فارسی یا انگلیسی فرقی ندارد.</p>';
    if (e.error === 'not_found') {
      return '<div class="callout callout--danger" role="alert">' + icon('alert') + '<div class="callout__body"><p class="callout__title">دستگاهی با این کد پیدا نشد</p>' +
        '<p>رقم‌ها را با برچسب پشت دستگاه یکی‌یکی مقایسه کنید.</p><div class="callout__actions"><button class="btn btn--xs btn--secondary" data-action="where-code">کد کجاست؟</button><button class="btn btn--xs btn--ghost" data-action="clear-code">پاک کردن کد</button></div></div></div>';
    }
    if (e.error === 'other_account') {
      return '<div class="callout callout--warning" role="alert">' + icon('alert') + '<div class="callout__body"><p class="callout__title">این دستگاه به حساب دیگری متصل است</p>' +
        '<p>اگر دستگاه را دست‌دوم خریده‌اید، مالک قبلی باید آن را از پنل خود حذف کند. در غیر این صورت پشتیبانی کمکتان می‌کند.</p>' +
        '<div class="callout__actions"><button class="btn btn--xs btn--secondary" data-action="oos" data-v="support">' + icon('phone') + 'تماس با پشتیبانی</button><button class="btn btn--xs btn--ghost" data-action="clear-code">وارد کردن کد دیگر</button></div></div></div>';
    }
    if (e.error === 'duplicate') {
      const d = e.device;
      return '<div class="callout callout--info" role="alert">' + icon('info') + '<div class="callout__body"><p class="callout__title">این دستگاه را قبلاً اضافه کرده‌اید</p>' +
        '<p>با نام «' + esc(d.name) + '»' + (Q.multi() ? ' در ' + esc(Q.branchLabel(d.branchId)) : '') + ' در فهرست دستگاه‌های شماست.</p>' +
        '<div class="callout__actions"><button class="btn btn--xs btn--secondary" data-action="open-device-from-add" data-id="' + d.id + '">مشاهده دستگاه</button><button class="btn btn--xs btn--ghost" data-action="clear-code">وارد کردن کد دیگر</button></div></div></div>';
    }
    return '<div class="callout callout--danger" role="alert">' + icon('wifiOff') + '<div class="callout__body"><p class="callout__title">ارتباط با سرور برقرار نشد</p>' +
      '<p>اینترنت گوشی را بررسی کنید. کدی که وارد کرده‌اید حفظ شده است.</p><div class="callout__actions"><button class="btn btn--xs btn--secondary" data-action="retry-verify">' + icon('refresh') + 'تلاش دوباره</button></div></div></div>';
  }

  function codeCells() {
    const c = flow ? flow.code : '';
    const cell = (i) => '<span class="code__cell' + (c[i] ? ' is-filled' : '') + '" data-i="' + i + '">' + (c[i] ? fa(c[i]) : '') + '</span>';
    let a = ''; let b = '';
    for (let i = 0; i < 4; i++) a += cell(i);
    for (let i = 4; i < 8; i++) b += cell(i);
    return '<span class="code__group">' + a + '</span><span class="code__sep"></span><span class="code__group">' + b + '</span>';
  }

  function updateCodeUI() {
    const scr = $screens.querySelector('.screen:not(.is-leaving)');
    if (!scr || !flow) return;
    const box = scr.querySelector('.code');
    if (!box) return;
    const input = box.querySelector('input');
    const focused = document.activeElement === input;
    box.className = 'code' + (flow.status === 'error' ? ' is-invalid' : flow.status === 'checking' ? ' is-checking' : flow.status === 'valid' ? ' is-valid' : '');
    const cells = box.querySelectorAll('.code__cell');
    cells.forEach((el, i) => {
      const ch = flow.code[i];
      const had = el.classList.contains('is-filled');
      el.textContent = ch ? fa(ch) : '';
      el.classList.toggle('is-filled', !!ch);
      if (ch && !had) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
      el.classList.toggle('is-active', focused && flow.status !== 'checking' && i === Math.min(flow.code.length, 7));
    });
    if (input.value !== flow.code) input.value = flow.code;
    input.disabled = flow.status === 'checking';
    const msg = scr.querySelector('#code-msg');
    if (msg) msg.innerHTML = codeMessage();
    const btn = scr.querySelector('[data-action="verify"]');
    if (btn) {
      btn.disabled = flow.code.length !== 8 && flow.status !== 'checking';
      btn.classList.toggle('is-loading', flow.status === 'checking');
    }
  }

  function createDevice() {
    const snap = store.snapshot();
    let sectionId = flow.sectionId;
    if (sectionId === '__new') sectionId = ensureSection(flow.newSection).id;
    const now = Date.now();
    const d = {
      id: uid('d'), code: flow.code, model: 'دایرکت ۳', name: clean(flow.name), branchId: flow.branchId, sectionId: sectionId || null,
      addedAt: now, lastSeenAt: null, status: 'pending', history: [{ t: now, type: 'added', name: clean(flow.name) }]
    };
    S.devices.push(d);
    S.ui.onboarded = true;
    S.ui.highlight = d.id;
    S.ui.coach = null;
    persist();
    const id = d.id;
    setTimeout(() => {
      const dv = Q.device(id);
      if (!dv || dv.status !== 'pending') return;
      dv.status = 'online'; dv.lastSeenAt = Date.now();
      dv.history.push({ t: Date.now(), type: 'online' });
      commit();
      vibrate(14);
    }, 3600);
    return { d, snap };
  }

  function ensureSection(name) {
    const v = stripPrefix(name, 'بخش');
    const found = S.sections.find((s) => normKey(s.name) === normKey(v));
    if (found) return found;
    const s = { id: uid('s'), name: v, color: SECTION_COLORS[S.sections.length % SECTION_COLORS.length] };
    S.sections.push(s);
    return s;
  }

  /* -------------------------------------------------------------- impact */
  function labelOf(kind, id, newName) {
    if (!id) return null;
    if (id === '__new') return 'بخش ' + (stripPrefix(newName, 'بخش') || '…');
    return kind === 'branch' ? Q.branchLabel(id) : Q.sectionLabel(id);
  }

  function impactInfo(kind, d, toId, newName) {
    const fromId = kind === 'branch' ? d.branchId : d.sectionId;
    const n = Q.deviceStats(d.id).total;
    const fromL = labelOf(kind, fromId);
    const toL = labelOf(kind, toId, newName);
    let A; let B; let rec;
    if (!fromId) {
      A = { title: 'فقط مشتریان جدید به «' + esc(toL) + '» اضافه شوند', desc: nf(n) + ' مشتری قبلی، بدون بخش می‌مانند.' };
      B = { title: 'مشتریان قبلی هم به «' + esc(toL) + '» اضافه شوند', desc: 'این دستگاه از اول در همین بخش بوده؛ ' + nf(n) + ' مشتری قبلی هم عضو این گروه می‌شوند.' };
      rec = 'retro';
    } else if (!toId) {
      A = { title: 'مشتریان قبلی در «' + esc(fromL) + '» بمانند', desc: nf(n) + ' مشتری قبلی واقعاً در این بخش ثبت شده‌اند.' };
      B = { title: 'مشتریان قبلی هم از «' + esc(fromL) + '» خارج شوند', desc: 'بخش را از اول اشتباه تعیین کرده بودم.' };
      rec = 'forward';
    } else if (kind === 'branch') {
      A = { title: 'مشتریان قبلی در «' + esc(fromL) + '» بمانند', desc: 'دستگاه را جابه‌جا کرده‌ام؛ ' + nf(n) + ' مشتری قبلی، مشتری ' + esc(fromL) + ' بوده‌اند.' };
      B = { title: 'مشتریان قبلی هم به «' + esc(toL) + '» منتقل شوند', desc: 'شعبه را اشتباه انتخاب کرده بودم؛ این دستگاه از اول در ' + esc(toL) + ' بوده است.' };
      rec = 'forward';
    } else {
      A = { title: 'مشتریان قبلی در «' + esc(fromL) + '» بمانند', desc: 'دستگاه را به بخش دیگری برده‌ام؛ ' + nf(n) + ' مشتری قبلی مربوط به بخش قبلی‌اند.' };
      B = { title: 'مشتریان قبلی هم به «' + esc(toL) + '» منتقل شوند', desc: 'بخش را از اول اشتباه انتخاب کرده بودم.' };
      rec = 'forward';
    }
    return { n, fromId, fromL, toL, A, B, rec };
  }

  function impactBlock(kind, d, toId, mode, newName) {
    const info = impactInfo(kind, d, toId, newName);
    if (!info.n) {
      return '<div class="callout callout--info impact">' + icon('info') + '<div class="callout__body">این دستگاه هنوز مشتری ثبت‌شده‌ای ندارد؛ از این به بعد مشتریانش ' +
        (toId ? 'به «' + esc(info.toL) + '» اضافه می‌شوند.' : 'بدون بخش ثبت می‌شوند.') + '</div></div>';
    }
    const opt = (key, o) => '<button class="choice' + (mode === key ? ' is-selected' : '') + '" data-action="impact-mode" data-v="' + key + '" role="radio" aria-checked="' + (mode === key) + '">' +
      '<span class="choice__radio"></span><span class="choice__body">' + (info.rec === key ? '<span class="badge-rec">پیشنهادی</span>' : '') + '<span class="choice__title">' + o.title + '</span>' +
      '<span class="choice__desc">' + o.desc + '</span></span></button>';

    const field = kind === 'branch' ? 'b' : 's';
    const sim = S.regs.map((r) => (r.d === d.id ? Object.assign({}, r, { [field]: toId || null }) : r));
    const count = (id, regs) => (kind === 'branch' ? Q.branchCount(id, regs) : Q.sectionCount(id, regs));
    const color = (id) => {
      if (id === '__new') return 'var(--t-' + SECTION_COLORS[S.sections.length % SECTION_COLORS.length] + ')';
      const o = kind === 'branch' ? Q.branch(id) : Q.section(id);
      return o ? 'var(--t-' + o.color + ')' : 'var(--ink-300)';
    };
    const rows = [info.fromId, toId].filter(Boolean).map((id) => {
      const before = id === '__new' ? 0 : count(id);
      const after = mode === 'retro' ? count(id, sim) : before;
      const cls = after > before ? ' is-up' : after < before ? ' is-down' : '';
      return '<div class="impact-viz__row"><span class="impact-viz__name"><i style="background:' + color(id) + '"></i>' + esc(labelOf(kind, id, newName)) + '</span>' +
        (after !== before ? '<span class="impact-viz__from">' + nf(before) + '</span><span class="impact-viz__arrow">' + icon('arrowL') + '</span>' : '') +
        '<span class="impact-viz__to' + cls + '">' + nf(after) + (after === before ? ' <small class="subtle">بدون تغییر</small>' : '') + '</span></div>';
    }).join('');

    return '<div class="impact" role="radiogroup" aria-labelledby="impact-t">' +
      '<p class="impact__title" id="impact-t">' + nf(info.n) + ' مشتری که قبلاً با این دستگاه ثبت شده‌اند…</p>' +
      '<p class="impact__sub">این تغییر به چه دلیل است؟ پاسخ شما تعیین می‌کند مشتریان قبلی در کدام گروه باشند.</p>' +
      '<div class="choices">' + opt('forward', info.A) + opt('retro', info.B) + '</div>' +
      '<div class="impact-viz" aria-live="polite"><div class="muted" style="font-size:12px;font-weight:700">پیش‌نمایش اعضای گروه پس از ذخیره</div>' + rows +
      '<div class="impact-viz__note">' + (toId ? 'مشتریان جدید این دستگاه در هر دو حالت به «' + esc(info.toL) + '» اضافه می‌شوند.' : 'مشتریان جدید این دستگاه در هر دو حالت بدون بخش ثبت می‌شوند.') + '</div></div></div>';
  }

  function applyChange(d, kind, toId, mode, newName) {
    const snap = store.snapshot();
    const n = Q.deviceStats(d.id).total;
    let target = toId || null;
    if (kind === 'section' && toId === '__new') target = ensureSection(newName).id;
    const fromId = kind === 'branch' ? d.branchId : d.sectionId;
    const fromName = fromId ? (kind === 'branch' ? Q.branch(fromId).name : Q.section(fromId).name) : null;
    const toName = target ? (kind === 'branch' ? Q.branch(target).name : Q.section(target).name) : null;
    const field = kind === 'branch' ? 'b' : 's';
    if (kind === 'branch') d.branchId = target; else d.sectionId = target;
    const effMode = n ? mode : null;
    if (effMode === 'retro') S.regs.forEach((r) => { if (r.d === d.id) r[field] = target; });
    d.history.push({ t: Date.now(), type: kind, fromId, toId: target, fromName, toName, mode: effMode, count: n });
    persist();
    Sheets.closeAll();
    refresh();
    let msg;
    if (kind === 'branch') {
      msg = effMode === 'retro' ? '«' + esc(d.name) + '» و ' + nf(n) + ' مشتری قبلی‌اش به شعبه ' + esc(toName) + ' منتقل شدند.'
        : '«' + esc(d.name) + '» به شعبه ' + esc(toName) + ' منتقل شد. مشتریان قبلی در شعبه ' + esc(fromName) + ' ماندند.';
      if (!n) msg = '«' + esc(d.name) + '» به شعبه ' + esc(toName) + ' منتقل شد.';
    } else if (target) {
      msg = effMode === 'retro' ? 'بخش «' + esc(toName) + '» برای این دستگاه و ' + nf(n) + ' مشتری قبلی‌اش ثبت شد.'
        : 'از این به بعد مشتریان «' + esc(d.name) + '» به بخش ' + esc(toName) + ' اضافه می‌شوند.';
    } else {
      msg = effMode === 'retro' ? 'بخش دستگاه و مشتریان قبلی‌اش حذف شد.' : 'بخش دستگاه حذف شد؛ مشتریان قبلی در گروه خود ماندند.';
    }
    undoable(snap, msg);
  }

  /* ---------------------------------------------------------------- screens */
  const Screens = {};

  /* Home --------------------------------------------------------------- */
  Screens.home = {
    tab: 'home',
    render() {
      const devs = S.devices;
      let h = '<div class="screen__body">' +
        '<div class="home-head"><span class="brand">دایرکت</span><span class="spacer"></span><span class="avatar" aria-hidden="true">ن</span></div>' +
        '<div class="page-head"><p class="page-head__eyebrow">سلام، وقت بخیر</p><h1 class="page-title" tabindex="-1">' + esc(S.business.name) + '</h1></div>' +
        '<div class="screen__body--pad stack gap-12">';
      if (!devs.length) {
        h += '<section class="setup-card" aria-labelledby="setup-t">' +
          '<p class="setup-card__eyebrow">راه‌اندازی باشگاه مشتریان، مرحله ۱ از ۲</p>' +
          '<h2 class="setup-card__title" id="setup-t">قدم آخر: دستگاه را وصل کنید</h2>' +
          '<div class="progress" role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" aria-label="پیشرفت راه‌اندازی"><i></i></div>' +
          '<ul class="setup-list" style="padding:0;margin-top:0"><li class="done"><span class="ck">' + icon('check') + '</span>ساخت حساب و پنل</li>' +
          '<li class="todo"><span class="ck"></span>اتصال دستگاه ثبت شماره مشتری</li></ul>' +
          '<button class="btn btn--block" data-action="add-device">' + icon('plus') + 'اتصال اولین دستگاه</button></section>' +
          '<div class="card card--pad row gap-12" style="align-items:flex-start"><span class="tile tile--yellow">' + icon('bulb') + '</span>' +
          '<div><p style="font-weight:800;font-size:14.5px">بعد از اتصال چه می‌شود؟</p><p class="muted" style="font-size:13px;line-height:1.85">هر مشتری که شماره‌اش را روی دستگاه وارد کند، به باشگاه شما اضافه می‌شود و آمار و فهرستش همین‌جا نمایش داده می‌شود.</p></div></div>';
      } else {
        const offline = devs.filter((d) => d.status === 'offline');
        h += '<div class="stat-grid"><div class="card stat"><div class="stat__label">' + icon('users') + 'کل مشتریان</div><div class="stat__value">' + nf(Q.totalCustomers()) + '</div></div>' +
          '<div class="card stat"><div class="stat__label">' + icon('userPlus') + 'ثبت امروز</div><div class="stat__value stat__value--orange">' + nf(Q.todayRegs()) + '</div></div></div>';
        offline.forEach((d) => {
          h += '<div class="callout callout--warning">' + icon('wifiOff') + '<div class="callout__body"><p class="callout__title">«' + esc(d.name) + '» آفلاین است</p>' +
            '<p>آخرین اتصال ' + rel(d.lastSeenAt) + '. شماره‌های ثبت‌شده تا وصل شدن دوباره روی دستگاه می‌مانند.</p>' +
            '<div class="callout__actions"><button class="btn btn--xs btn--secondary" data-action="open-device" data-id="' + d.id + '">بررسی دستگاه</button></div></div></div>';
        });
        h += '<section class="card"><div class="row" style="padding:12px 14px 2px"><h2 style="font-size:15px;font-weight:800">دستگاه‌ها</h2><span class="spacer"></span>' +
          '<button class="link-btn" data-action="tab" data-v="devices">مدیریت دستگاه‌ها' + icon('chevL') + '</button></div>';
        devs.slice(0, 4).forEach((d) => {
          const sub = [Q.multi() ? Q.branchLabel(d.branchId) : '', d.sectionId ? Q.sectionLabel(d.sectionId) : ''].filter(Boolean).join('، ') || ('امروز ' + nf(Q.deviceStats(d.id).today) + ' ثبت');
          h += '<button class="row-item row-item--btn" data-action="open-device" data-id="' + d.id + '">' + devTile(d, 'sm') +
            '<span class="row-item__body"><span class="row-item__title" style="display:block">' + esc(d.name) + '</span><span class="row-item__sub">' + esc(sub) + '</span></span>' + statusChip(d) + '</button>';
        });
        h += '</section>';
        const recent = S.regs.slice().sort((a, b) => b.t - a.t).slice(0, 5);
        if (recent.length) {
          h += '<section class="card"><div class="row" style="padding:12px 14px 2px"><h2 style="font-size:15px;font-weight:800">آخرین ثبت‌ها</h2><span class="spacer"></span>' +
            '<button class="link-btn" data-action="tab" data-v="customers">همه' + icon('chevL') + '</button></div>';
          recent.forEach((r) => {
            const c = S.customers.find((x) => x.id === r.c);
            const d = Q.device(r.d);
            h += '<div class="row-item"><span class="tile tile--sm tile--pink">' + icon('userPlus') + '</span><span class="row-item__body"><span class="row-item__title phone" style="display:block;text-align:right">' + maskPhone(c.phone) + '</span>' +
              '<span class="row-item__sub">با «' + esc(d ? d.name : 'دستگاه حذف‌شده') + '»' + (Q.multi() ? SEP + esc(Q.branchLabel(r.b)) : '') + '</span></span><span class="row-item__end">' + rel(r.t) + '</span></div>';
          });
          h += '</section>';
        }
      }
      return h + '</div></div>';
    }
  };

  /* Devices ------------------------------------------------------------ */
  function deviceCard(d) {
    const st = Q.deviceStats(d.id);
    const sec = d.sectionId ? Q.section(d.sectionId) : null;
    const hl = S.ui.highlight === d.id;
    return '<button class="card device-card' + (hl ? ' is-new' : '') + (identifying === d.id ? ' is-identifying' : '') + '" data-action="open-device" data-id="' + d.id + '">' +
      '<span class="device-card__top">' + devTile(d) +
      '<span class="device-card__main"><span class="device-card__name" style="display:block">' + esc(d.name) + '</span>' +
      '<span class="device-card__meta">' + (sec ? '<span class="chip chip--sm chip--' + sec.color + '">' + icon('layers') + esc(sec.name) + '</span>' : '') +
      '<span>شناسه <span class="phone">…' + fa(d.code.slice(4)) + '</span></span></span></span>' + statusChip(d) + '</span>' +
      '<span class="device-card__stats">' + (st.total ? '<span><b>' + nf(st.total) + '</b> مشتری</span><span class="sep"></span>' : '') +
      '<span>' + (d.status === 'offline' ? 'آخرین اتصال ' + rel(d.lastSeenAt) : st.last ? 'آخرین ثبت ' + rel(st.last) : d.status === 'pending' ? 'منتظر روشن شدن دستگاه' : 'هنوز مشتری‌ای ثبت نشده') + '</span>' +
      '<span class="spacer"></span><span class="device-card__chev">' + icon('chevL') + '</span></span></button>';
  }

  function emptyDevices() {
    return '<div class="screen__body"><div class="empty">' +
      '<div class="empty__art"><div class="float">' + deviceArt({ w: 116 }) + '</div>' +
      '<div class="notif-pill notif-pill--a"><span class="tile tile--pink">' + icon('userPlus') + '</span><span>مشتری جدید ثبت شد<small>همین الان</small></span></div>' +
      '<div class="notif-pill notif-pill--b"><span class="tile tile--yellow">' + icon('message') + '</span><span>پیام خوش‌آمد رفت<small>خودکار</small></span></div></div>' +
      '<h1 class="empty__title" tabindex="-1">اولین دستگاهتان را <span class="grad-text">وصل کنید</span></h1>' +
      '<p class="empty__desc">با اتصال دستگاه، شماره هر مشتری که در فروشگاه وارد می‌شود، مستقیم به باشگاه مشتریان شما اضافه می‌شود.</p>' +
      '<div class="steps">' +
      '<div class="step"><span class="step__num tile--blue">۱</span><span class="step__text">دستگاه را روشن و به اینترنت وصل کنید<small>با وای‌فای یا سیم‌کارت</small></span></div>' +
      '<div class="step"><span class="step__num tile--yellow">۲</span><span class="step__text">کد ۸ رقمی پشت دستگاه را وارد یا اسکن کنید<small>کمتر از یک دقیقه</small></span></div>' +
      '<div class="step"><span class="step__num tile--green">۳</span><span class="step__text">شماره مشتری‌ها خودکار ثبت می‌شود<small>و همین‌جا می‌بینیدشان</small></span></div>' +
      '</div></div></div>' +
      '<div class="screen__footer"><button class="btn btn--primary btn--block" data-action="add-device">' + icon('plus') + 'افزودن دستگاه</button>' +
      '<button class="btn btn--ghost btn--sm" data-action="oos" data-v="buy">' + icon('box') + 'هنوز دستگاه ندارید؟ خرید دستگاه دایرکت</button></div>';
  }

  Screens.devices = {
    tab: 'devices',
    render() {
      const devs = S.devices;
      const bar = appbar({ title: 'دستگاه‌ها', collapsing: true, actions: devs.length ? '<button class="icon-btn" data-action="add-device" aria-label="افزودن دستگاه">' + icon('plus') + '</button>' : '' });
      if (!devs.length) return bar + emptyDevices();
      const online = devs.filter((d) => d.status === 'online').length;
      const offline = devs.filter((d) => d.status === 'offline').length;
      const pending = devs.filter((d) => d.status === 'pending').length;
      let h = bar + '<div class="screen__body"><div class="page-head"><h1 class="page-title" tabindex="-1">دستگاه‌ها</h1>' +
        '<div class="summary-bar" style="margin-top:4px"><span>' + nf(devs.length) + ' دستگاه' + (Q.multi() ? ' در ' + nf(S.branches.length) + ' شعبه' : '') + '</span>' +
        (online ? '<span><i style="background:var(--success)"></i>' + nf(online) + ' آنلاین</span>' : '') +
        (offline ? '<span><i style="background:var(--warning)"></i>' + nf(offline) + ' آفلاین</span>' : '') +
        (pending ? '<span><i style="background:var(--blue-500)"></i>' + nf(pending) + ' در انتظار</span>' : '') + '</div></div>' +
        '<div class="screen__body--pad">';

      const coach = S.ui.coach;
      if (coach && coach.type === 'branch-added' && Q.branch(coach.branchId)) {
        h += '<div class="coach" style="margin-bottom:12px">' + icon('sparkle') + '<span>دستگاه‌ها حالا بر اساس شعبه دسته‌بندی شده‌اند و مشتریان هر شعبه جداگانه قابل انتخاب‌اند. حالا برای ' + esc(Q.branchLabel(coach.branchId)) + ' دستگاه اضافه کنید.</span>' +
          '<button class="coach__close" data-action="coach-close" aria-label="بستن راهنما">' + icon('close') + '</button></div>';
      } else if (coach && coach.type === 'sections') {
        h += '<div class="coach" style="margin-bottom:12px">' + icon('sparkle') + '<span>روی هر دستگاه بزنید و «بخش» آن را تعیین کنید تا مشتریان هر بخش جدا قابل انتخاب باشند.</span>' +
          '<button class="coach__close" data-action="coach-close" aria-label="بستن راهنما">' + icon('close') + '</button></div>';
      }

      if (Q.groupCount() > 0) {
        const chips = [];
        if (Q.multi()) S.branches.forEach((b) => chips.push(tagChip({ kind: 'branch', label: 'شعبه ' + b.name, color: b.color }, 'chip--sm')));
        S.sections.forEach((s) => chips.push(tagChip({ kind: 'section', label: 'بخش ' + s.name, color: s.color }, 'chip--sm')));
        h += '<button class="card groups-entry" data-action="open-groups" style="margin-bottom:6px"><span class="tile tile--blue">' + icon('target') + '</span>' +
          '<span class="groups-entry__body"><span class="groups-entry__title" style="display:block">' + nf(Q.groupCount()) + ' گروه مخاطب از دستگاه‌ها ساخته شده</span>' +
          '<span class="groups-entry__sub" style="display:block">برای ارسال پیام به مشتریان یک شعبه یا بخش</span><span class="stacked-chips">' + chips.join('') + '</span></span>' +
          '<span class="device-card__chev">' + icon('chevL') + '</span></button>';
      }

      if (!Q.multi()) {
        h += '<div class="list-gap" style="margin-top:6px">' + devs.map(deviceCard).join('') + '</div>' +
          '<button class="branch__add" style="margin-top:10px" data-action="add-device">' + icon('plus') + 'افزودن دستگاه</button>' +
          '<div class="upsell" style="margin-top:28px"><span class="tile tile--purple">' + icon('store') + '</span><div><p class="upsell__title">کسب‌وکارتان چند شعبه دارد؟</p>' +
          '<p class="upsell__desc">با افزودن شعبه، دستگاه‌ها و مشتریان هر شعبه جدا می‌شوند و می‌توانید فقط به مشتریان یک شعبه پیام بدهید.</p>' +
          '<button class="btn btn--tonal btn--sm" data-action="add-branch">' + icon('plus') + 'افزودن شعبه</button></div></div>';
      } else {
        S.branches.forEach((b) => {
          const list = Q.devicesIn(b.id);
          const attention = coach && coach.type === 'branch-added' && coach.branchId === b.id;
          h += '<section class="branch" aria-labelledby="br-' + b.id + '"><div class="branch__head"><span class="branch__icon" style="color:var(--t-' + b.color + ')">' + icon('store') + '</span>' +
            '<div class="branch__title"><h2 class="branch__name" id="br-' + b.id + '">شعبه ' + esc(b.name) + '</h2><div class="branch__meta">' + nf(list.length) + ' دستگاه' + SEP + nf(Q.branchCount(b.id)) + ' مشتری</div></div>' +
            '<button class="icon-btn" data-action="branch-menu" data-id="' + b.id + '" aria-label="گزینه‌های شعبه ' + esc(b.name) + '">' + icon('more') + '</button></div>' +
            '<div class="list-gap">' + (list.length ? list.map(deviceCard).join('') : '<div class="branch__empty">هنوز دستگاهی در این شعبه نیست.</div>') +
            '<button class="branch__add' + (attention ? ' is-attention' : '') + '" data-action="add-device" data-branch="' + b.id + '">' + icon('plus') + 'افزودن دستگاه به شعبه ' + esc(b.name) + '</button></div></section>';
        });
        h += '<button class="branch__add" style="margin-top:28px;border-color:var(--line-strong);color:var(--ink-700);background:var(--surface)" data-action="add-branch">' + icon('store') + 'افزودن شعبه</button>';
      }
      return h + '<div style="height:24px"></div></div></div>';
    },
    mount() {
      if (S.ui.highlight) setTimeout(() => { if (S.ui.highlight) { S.ui.highlight = null; persist(); } }, 2600);
    }
  };

  /* Device detail ------------------------------------------------------ */
  function historyText(e) {
    const nm = (kind, id, fallback) => {
      if (!id) return null;
      const o = kind === 'branch' ? Q.branch(id) : Q.section(id);
      return o ? o.name : fallback;
    };
    if (e.type === 'added') return 'به پنل اضافه شد' + (e.name ? ' با نام «' + esc(e.name) + '»' : '');
    if (e.type === 'online') return 'دستگاه برای اولین بار آنلاین شد';
    if (e.type === 'rename') return 'نام از «' + esc(e.from) + '» به «' + esc(e.to) + '» تغییر کرد';
    const kindFa = e.type === 'branch' ? 'شعبه' : 'بخش';
    const from = nm(e.type, e.fromId, e.fromName);
    const to = nm(e.type, e.toId, e.toName);
    let t;
    if (from && to) t = 'از ' + kindFa + ' ' + esc(from) + ' به ' + kindFa + ' ' + esc(to) + ' منتقل شد';
    else if (to) t = kindFa + ' ' + esc(to) + ' تعیین شد';
    else t = kindFa + ' ' + esc(from) + ' برداشته شد';
    let m = '';
    if (e.mode === 'retro') m = nf(e.count) + ' مشتری قبلی هم اعمال شد';
    else if (e.mode === 'forward') m = 'فقط برای مشتریان جدید؛ ' + nf(e.count) + ' مشتری قبلی دست نخورد';
    return t + (m ? '<small style="color:var(--ink-500)">' + m + '</small>' : '');
  }

  Screens.device = {
    render(r) {
      const d = Q.device(r.id);
      if (!d) {
        return appbar({ back: true, title: 'دستگاه' }) + '<div class="screen__body screen__body--pad"><div class="empty"><h1 class="empty__title" tabindex="-1">این دستگاه دیگر در پنل نیست</h1>' +
          '<p class="empty__desc">ممکن است حذف شده باشد.</p><button class="btn btn--primary" style="margin-top:16px" data-action="tab" data-v="devices">بازگشت به دستگاه‌ها</button></div></div>';
      }
      const st = Q.deviceStats(d.id);
      const sec = d.sectionId ? Q.section(d.sectionId) : null;
      const tags = Q.tagsForDevice(d);
      let h = appbar({ back: true, title: d.name, collapsing: true, actions: '<button class="icon-btn" data-action="device-menu" data-id="' + d.id + '" aria-label="گزینه‌های بیشتر">' + icon('more') + '</button>' }) +
        '<div class="screen__body"><div class="screen__body--pad stack gap-12">';

      h += '<section class="card detail-hero' + (identifying === d.id ? ' is-identifying' : '') + '"><div style="position:relative">' + devTile(d, 'lg') + '<span class="identify-ring"></span><span class="identify-ring"></span></div>' +
        '<h1 class="detail-hero__name" tabindex="-1">' + esc(d.name) + '</h1><div style="margin-top:4px">' + statusChip(d) + '</div>' +
        '<p class="detail-hero__meta">' + esc(d.model) + (Q.multi() ? SEP + esc(Q.branchLabel(d.branchId)) : '') + (sec ? SEP + 'بخش ' + esc(sec.name) : '') + '</p>' +
        '<div class="detail-hero__actions"><button class="btn btn--tonal btn--sm" data-action="identify" data-id="' + d.id + '"' + (d.status !== 'online' ? ' aria-disabled="true" style="opacity:.5"' : '') + '>' + icon('locate') + (identifying === d.id ? 'در حال چشمک زدن…' : 'پیدا کردن دستگاه') + '</button>' +
        '<button class="btn btn--secondary btn--sm" data-action="edit-name" data-id="' + d.id + '">' + icon('edit') + 'تغییر نام</button></div>' +
        '<div class="kpis" style="width:100%;border-top:1px solid var(--line);margin-top:16px"><div class="kpi"><div class="kpi__v">' + nf(st.total) + '</div><div class="kpi__l">مشتری ثبت‌شده</div></div>' +
        '<div class="kpi"><div class="kpi__v">' + nf(st.today) + '</div><div class="kpi__l">ثبت امروز</div></div>' +
        '<div class="kpi"><div class="kpi__v" style="font-size:15px;padding-top:4px">' + (st.last ? rel(st.last) : '—') + '</div><div class="kpi__l">آخرین ثبت</div></div></div></section>';

      if (d.status === 'offline') {
        h += '<div class="callout callout--warning">' + icon('wifiOff') + '<div class="callout__body"><p class="callout__title">دستگاه از ' + rel(d.lastSeenAt) + ' آفلاین است</p>' +
          '<p>شماره‌هایی که در این مدت وارد شوند روی دستگاه می‌مانند و بعد از اتصال ارسال می‌شوند.</p>' +
          '<details style="margin-top:6px"><summary style="cursor:pointer;font-weight:800;color:var(--warning-ink)">راهنمای رفع مشکل</summary>' +
          '<ol style="margin:6px 0 0;padding-right:18px;line-height:2"><li>مطمئن شوید دستگاه روشن است.</li><li>وای‌فای فروشگاه یا اعتبار سیم‌کارت دستگاه را بررسی کنید.</li><li>دستگاه را یک بار خاموش و روشن کنید.</li></ol></details></div></div>';
      } else if (d.status === 'pending') {
        h += '<div class="callout callout--info">' + icon('wifi') + '<div class="callout__body"><p class="callout__title">در انتظار اولین اتصال</p><p>دستگاه را روشن و به اینترنت وصل کنید؛ وضعیت به‌صورت خودکار به‌روز می‌شود.</p></div></div>';
      }

      h += '<div class="section-label"><h2>اطلاعات دستگاه</h2></div><div class="card">' +
        '<button class="prop prop--btn" data-action="edit-name" data-id="' + d.id + '"><span class="prop__icon">' + icon('edit') + '</span><span class="prop__body"><span class="prop__label" style="display:block">نام دستگاه</span><span class="prop__value" style="display:block">' + esc(d.name) + '</span></span><span class="prop__end prop__edit">ویرایش</span></button>' +
        (Q.multi() ? '<button class="prop prop--btn" data-action="edit-branch" data-id="' + d.id + '"><span class="prop__icon">' + icon('store') + '</span><span class="prop__body"><span class="prop__label" style="display:block">شعبه</span><span class="prop__value" style="display:block">' + esc(Q.branchLabel(d.branchId)) + '</span></span><span class="prop__end prop__edit">تغییر</span></button>' : '') +
        '<button class="prop prop--btn" data-action="edit-section" data-id="' + d.id + '"><span class="prop__icon">' + icon('layers') + '</span><span class="prop__body"><span class="prop__label" style="display:block">بخش <span class="subtle" style="font-weight:500">(اختیاری)</span></span><span class="prop__value' + (sec ? '' : ' is-empty') + '" style="display:block">' + (sec ? esc(sec.name) : 'تعیین نشده') + '</span></span><span class="prop__end prop__edit">' + (sec ? 'تغییر' : 'تعیین') + '</span></button>' +
        '<div class="prop"><span class="prop__icon">' + icon('hash') + '</span><span class="prop__body"><span class="prop__label" style="display:block">شناسه دستگاه</span><span class="prop__value phone" style="display:block;text-align:right">' + fmtCode(d.code) + '</span></span><button class="icon-btn" data-action="copy-code" data-id="' + d.id + '" aria-label="کپی شناسه">' + icon('copy') + '</button></div>' +
        '<div class="prop"><span class="prop__icon">' + icon('calendar') + '</span><span class="prop__body"><span class="prop__label" style="display:block">تاریخ افزودن</span><span class="prop__value" style="display:block">' + fmtDate(d.addedAt) + '</span></span></div></div>';

      h += '<div class="section-label"><h2>گروه‌بندی مشتریان این دستگاه</h2></div><section class="card audience-card">';
      if (tags.length) {
        h += '<div class="audience-card__head"><span class="tile tile--sm tile--blue">' + icon('bolt') + '</span><h3 class="audience-card__title">برچسب‌های خودکار</h3></div>' +
          '<div class="stacked-chips">' + tags.map((t) => tagChip(t)).join('') + '</div>' +
          '<p style="margin-top:10px">هر مشتری که با این دستگاه ثبت شود، این برچسب‌ها را خودکار می‌گیرد. هنگام ارسال پیام، با انتخاب هرکدام می‌توانید همین گروه را هدف بگیرید.</p>' +
          '<button class="link-btn" data-action="open-groups">مشاهده همه گروه‌ها' + icon('chevL') + '</button>';
      } else {
        h += '<div class="audience-card__head"><span class="tile tile--sm tile--gray">' + icon('users') + '</span><h3 class="audience-card__title">فعلاً در گروه «همه مشتریان»</h3></div>' +
          '<p>' + (S.devices.length > 1 ? 'اگر دستگاه‌ها در قسمت‌های مختلف کسب‌وکارتان هستند (مثلاً کافه و قنادی)، بخش این دستگاه را تعیین کنید تا مشتریانش جدا قابل انتخاب باشند.'
          : 'با یک دستگاه، همه مشتریان یک گروه‌اند و تنظیم بیشتری لازم نیست.') + '</p>' +
          (S.devices.length > 1 ? '<button class="btn btn--tonal btn--sm" style="margin-top:10px" data-action="edit-section" data-id="' + d.id + '">' + icon('layers') + 'تعیین بخش</button>' : '');
      }
      h += '</section>';

      h += '<div class="section-label"><h2>تاریخچه تغییرات</h2></div><div class="card card--pad"><div class="timeline">' +
        d.history.slice().reverse().map((e) => '<div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__text">' + historyText(e) + '<small>' + fmtDate(e.t) + SEP + rel(e.t) + '</small></div></div>').join('') +
        '</div></div>';

      h += '<button class="btn btn--danger-ghost btn--block" style="margin-top:8px" data-action="remove-device" data-id="' + d.id + '">' + icon('trash') + 'حذف دستگاه از پنل</button><div style="height:12px"></div>';
      return h + '</div></div>';
    }
  };

  /* Add — step 1: code ------------------------------------------------- */
  Screens.addCode = {
    render() {
      if (!flow) startAddSilently();
      return appbar({ back: 'close', backAction: 'add-close', title: 'افزودن دستگاه' }) +
        '<div class="flow-progress" aria-hidden="true"><i class="is-done"></i><i></i></div>' +
        '<div class="screen__body screen__body--pad"><div class="flow-head"><h1 class="flow-title" tabindex="-1">کد دستگاه را وارد کنید</h1>' +
        '<p class="flow-sub">کد ۸ رقمی روی برچسب پشت دستگاه و روی جعبه آن چاپ شده است.</p></div>' +
        '<label class="sr-only" for="code-input">کد ۸ رقمی دستگاه</label>' +
        '<div class="code">' + codeCells() + '<input class="code__input" id="code-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="16" spellcheck="false" aria-describedby="code-msg" data-input="code" value="' + esc(flow.code) + '"></div>' +
        '<div id="code-msg" aria-live="polite" style="margin-top:12px;min-height:30px">' + codeMessage() + '</div>' +
        '<div class="disclosure where-code' + (flow.showWhere ? ' is-open' : '') + '" style="margin-top:16px"><button class="disclosure__head" data-action="toggle-where" aria-expanded="' + flow.showWhere + '">' +
        '<span class="tile tile--yellow">' + icon('help') + '</span><span class="disclosure__title">کد را پیدا نمی‌کنید؟</span><span class="disclosure__chev">' + icon('chevD') + '</span></button>' +
        '<div class="disclosure__body"><div class="disclosure__inner"><div class="disclosure__content"><div class="where-code__art">' + stickerArt() + '</div>' +
        '<p class="field__help">دستگاه را برگردانید؛ کد زیر کد QR روی برچسب نوشته شده است. اگر برچسب آسیب دیده، کد روی جعبه دستگاه هم هست.</p></div></div></div></div>' +
        '<div class="or">یا</div>' +
        '<button class="btn btn--secondary btn--block" data-action="open-scan">' + icon('qr') + 'اسکن کد QR با دوربین</button></div>' +
        '<div class="screen__footer"><button class="btn btn--primary btn--block' + (flow.status === 'checking' ? ' is-loading' : '') + '" data-action="verify"' + (flow.code.length === 8 || flow.status === 'checking' ? '' : ' disabled') + '>ادامه</button></div>';
    },
    mount(el) {
      const input = el.querySelector('#code-input');
      if (!input) return;
      const upd = () => updateCodeUI();
      input.addEventListener('focus', upd);
      input.addEventListener('blur', upd);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); verify(); } });
      updateCodeUI();
    },
    onBack() { A['add-close'](); return false; }
  };

  function startAddSilently() {
    flow = {
      code: '', status: 'idle', error: null, found: null, showWhere: false, netFailed: {}, name: '', nameEdited: false, nameError: null,
      branchId: Q.multi() ? null : S.branches[0].id, branchError: null, sectionId: null, newSection: '', sectionError: null, optOpen: false, submitting: false, detailsFor: null
    };
  }

  /* Scanner ------------------------------------------------------------ */
  Screens.scan = {
    render() {
      return '<div class="scanner" role="dialog" aria-label="اسکن کد QR"><div class="scanner__cam"><div class="scanner__label">' +
        '<svg width="96" viewBox="0 0 28 28" aria-hidden="true">' + qrPattern() + '</svg></div></div>' +
        '<div class="scanner__top"><button class="icon-btn" data-action="back" aria-label="بستن دوربین">' + icon('close') + '</button><span class="demo-tag">' + icon('flask') + 'شبیه‌سازی دوربین</span>' +
        '<button class="icon-btn" data-action="oos" data-v="torch" aria-label="چراغ‌قوه">' + icon('flash') + '</button></div>' +
        '<div class="scanner__frame" aria-hidden="true"><b></b><b></b><b></b><b></b><span class="scanner__line"></span></div>' +
        '<div class="scanner__found">' + icon('check') + 'کد خوانده شد</div>' +
        '<div class="scanner__bottom"><p class="scanner__hint" aria-live="polite">کد QR پشت دستگاه را داخل کادر بگیرید<small>دستگاه را نزدیک‌تر بیاورید تا تصویر واضح شود</small></p>' +
        '<button class="btn btn--block" data-action="back">' + icon('hash') + 'وارد کردن دستی کد</button></div></div>';
    },
    mount(el) {
      flowCleanup();
      const sc = el.querySelector('.scanner');
      scanTimers.push(setTimeout(() => sc.classList.add('is-focused'), 900));
      scanTimers.push(setTimeout(() => {
        sc.classList.add('is-found'); vibrate([12, 40, 12]);
        const hint = sc.querySelector('.scanner__hint');
        if (hint) hint.innerHTML = 'کد دستگاه خوانده شد<small>در حال بررسی…</small>';
      }, 2300));
      scanTimers.push(setTimeout(() => {
        if (!flow || Nav.cur().name !== 'scan') return;
        flow.code = randomNewCode(); flow.status = 'idle'; flow.error = null;
        Nav.back();
        setTimeout(verify, 280);
      }, 3100));
    },
    onBack() { flowCleanup(); return true; }
  };

  function qrPattern() {
    let s = '<rect width="28" height="28" fill="#fff"/>';
    const r = (seed) => { let a = seed; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; };
    const rnd = r(11);
    const finder = (x, y) => '<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="#121826"/><rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="#121826"/>';
    for (let y = 2; y < 26; y++) for (let x = 2; x < 26; x++) {
      const inF = (x < 10 && y < 10) || (x > 17 && y < 10) || (x < 10 && y > 17);
      if (!inF && rnd() > 0.52) s += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="#121826"/>';
    }
    return s + finder(2, 2) + finder(19, 2) + finder(2, 19);
  }

  function randomNewCode() {
    let c;
    do {
      c = String(Math.floor(10000000 + Math.random() * 89999999));
    } while (/^(\d)\1{7}$/.test(c) || S.devices.some((d) => d.code === c));
    return c;
  }

  /* Add — step 2: details ---------------------------------------------- */
  function sectionVisible() {
    return S.sections.length > 0 || (flow.branchId && Q.devicesIn(flow.branchId).length > 0);
  }

  function nameSuggestions() {
    const out = [];
    const sec = flow.sectionId === '__new' ? stripPrefix(flow.newSection, 'بخش') : flow.sectionId ? (Q.section(flow.sectionId) || {}).name : '';
    if (sec) out.push('صندوق ' + sec);
    ['صندوق', 'پیشخوان', 'ورودی', 'طبقه دوم', 'صندوق ۲'].forEach((x) => out.push(x));
    const used = new Set((flow.branchId ? Q.devicesIn(flow.branchId) : S.devices).map((d) => normKey(d.name)));
    const seen = new Set();
    return out.filter((x) => { const k = normKey(x); if (used.has(k) || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 4);
  }

  function previewTags() {
    const t = [];
    if (Q.multi() && flow.branchId) { const b = Q.branch(flow.branchId); t.push({ kind: 'branch', label: 'شعبه ' + b.name, color: b.color }); }
    if (flow.sectionId === '__new' && clean(flow.newSection)) t.push({ kind: 'section', label: 'بخش ' + stripPrefix(flow.newSection, 'بخش'), color: SECTION_COLORS[S.sections.length % SECTION_COLORS.length] });
    else if (flow.sectionId && flow.sectionId !== '__new') { const s = Q.section(flow.sectionId); t.push({ kind: 'section', label: 'بخش ' + s.name, color: s.color }); }
    return t;
  }

  function previewHTML() {
    const t = previewTags();
    const show = Q.multi() || sectionVisible() || t.length;
    if (!show) return '';
    return '<div class="preview-tags" style="margin-top:20px"><p class="preview-tags__title">' + icon('bolt') + 'مشتریانی که با این دستگاه ثبت شوند، خودکار این برچسب‌ها را می‌گیرند:</p>' +
      '<div class="stacked-chips">' + (t.length ? t.map((x) => tagChip(x)).join('') : '<span class="chip chip--muted">' + icon('users') + 'فقط «همه مشتریان»</span>') + '</div>' +
      '<p class="preview-tags__note">هنگام ارسال پیام، با انتخاب همین برچسب‌ها می‌توانید این مشتریان را هدف بگیرید.</p></div>';
  }

  function sectionField() {
    const chips = '<div class="suggest" role="radiogroup" aria-label="بخش دستگاه">' +
      '<button class="suggest__chip' + (!flow.sectionId ? ' is-selected' : '') + '" data-action="flow-section" data-v="" role="radio" aria-checked="' + !flow.sectionId + '">بدون بخش</button>' +
      S.sections.map((s) => '<button class="suggest__chip' + (flow.sectionId === s.id ? ' is-selected' : '') + '" data-action="flow-section" data-v="' + s.id + '" role="radio" aria-checked="' + (flow.sectionId === s.id) + '">' + icon('layers') + esc(s.name) + '</button>').join('') +
      '<button class="suggest__chip suggest__chip--dashed' + (flow.sectionId === '__new' ? ' is-selected' : '') + '" data-action="flow-section" data-v="__new" role="radio" aria-checked="' + (flow.sectionId === '__new') + '">' + icon('plus') + 'بخش جدید</button></div>';
    const newInput = flow.sectionId === '__new'
      ? '<div class="input-wrap' + (flow.sectionError ? ' is-invalid' : '') + '" style="margin-top:4px"><span class="input-wrap__prefix">بخش</span><input class="input" id="new-section" data-input="flow-new-section" maxlength="20" placeholder="مثلاً کافه، طبقه دوم، بانوان" value="' + esc(flow.newSection) + '" aria-describedby="sec-err" autocomplete="off"></div>' + fieldError(flow.sectionError, 'sec-err')
      : '';
    return chips + newInput + '<p class="field__help">اگر دستگاه‌ها در قسمت‌های مختلف کسب‌وکارتان هستند (مثلاً کافه و قنادی)، بخش را مشخص کنید تا بعداً بتوانید فقط به مشتریان همان بخش پیام بدهید.</p>';
  }

  Screens.addDetails = {
    render() {
      if (!flow || !flow.found) return Screens.addCode.render();
      const first = S.devices.length === 0;
      const multi = Q.multi();
      const branchHasDevices = flow.branchId && Q.devicesIn(flow.branchId).length > 0;
      let title; let sub;
      if (first) { title = 'تقریباً تمام شد!'; sub = 'دستگاه پیدا شد. یک نام برایش بگذارید یا همین پیشنهاد را نگه دارید؛ بعداً هم قابل تغییر است.'; }
      else if (multi) { title = 'این دستگاه کجاست؟'; sub = 'شعبه را انتخاب کنید تا مشتریانی که با این دستگاه ثبت می‌شوند به گروه همان شعبه بروند.'; }
      else { title = 'این دستگاه را چه بنامیم؟'; sub = 'نامی بگذارید که جای دستگاه را نشان دهد تا دستگاه‌ها را راحت از هم تشخیص دهید.'; }

      let h = appbar({ back: true, backAction: 'back', title: 'افزودن دستگاه', actions: '<button class="icon-btn" data-action="add-close" aria-label="بستن">' + icon('close') + '</button>' }) +
        '<div class="flow-progress" aria-hidden="true"><i class="is-done"></i><i class="is-done"></i></div>' +
        '<div class="screen__body screen__body--pad"><div class="flow-head"><h1 class="flow-title" tabindex="-1">' + title + '</h1><p class="flow-sub">' + sub + '</p></div>' +
        '<div class="found-card">' + '<span class="tile tile--blue">' + icon('device') + '</span><div class="found-card__body"><p class="found-card__title">' + esc(flow.found.model) + '</p>' +
        '<p class="found-card__sub">شناسه <span class="phone">' + fmtCode(flow.code) + '</span></p></div><span class="found-card__ok">' + icon('check') + 'تأیید شد</span></div>';

      if (multi) {
        h += '<div class="field" style="margin-top:22px"><div class="field__label">شعبه<small>ضروری</small></div><div class="choices" role="radiogroup" aria-label="شعبه دستگاه">' +
          S.branches.map((b) => {
            const n = Q.devicesIn(b.id).length;
            return '<button class="choice choice--row' + (flow.branchId === b.id ? ' is-selected' : '') + '" data-action="flow-branch" data-v="' + b.id + '" role="radio" aria-checked="' + (flow.branchId === b.id) + '">' +
              '<span class="choice__radio"></span><span class="choice__body"><span class="choice__title" style="display:block">شعبه ' + esc(b.name) + '</span></span><span class="choice__meta">' + (n ? nf(n) + ' دستگاه' : 'بدون دستگاه') + '</span></button>';
          }).join('') + '</div>' + fieldError(flow.branchError, 'branch-err') + '</div>';
      }

      const sugg = nameSuggestions();
      h += '<div class="field" style="margin-top:22px"><label class="field__label" for="dev-name">نام دستگاه<small>' + (first ? 'اختیاری، ' : '') + 'قابل تغییر در هر زمان</small></label>' +
        '<div class="input-wrap' + (flow.nameError ? ' is-invalid' : '') + '"><input class="input" id="dev-name" data-input="flow-name" maxlength="24" autocomplete="off" value="' + esc(flow.name) + '" aria-describedby="name-err name-help" placeholder="مثلاً صندوق">' +
        '<span class="input-wrap__count" id="name-count">' + fa(clean(flow.name).length) + '/۲۴</span></div>' + '<div id="name-err-slot">' + fieldError(flow.nameError, 'name-err') + '</div>' +
        (sugg.length ? '<div class="suggest" id="name-sugg">' + sugg.map((x) => '<button class="suggest__chip' + (normKey(x) === normKey(flow.name) ? ' is-selected' : '') + '" data-action="flow-name-suggest" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' : '') +
        '<p class="field__help" id="name-help">' + (branchHasDevices ? 'برای تشخیص دستگاه‌ها، جای قرارگیری را در نام بیاورید.' : 'فقط برای شناختن دستگاه در پنل است و روی مشتریان اثری ندارد.') + '</p></div>';

      if (sectionVisible()) {
        h += '<div class="field" style="margin-top:22px"><div class="field__label">بخش<small>اختیاری</small></div>' + sectionField() + '</div>';
      } else {
        h += '<div class="disclosure' + (flow.optOpen ? ' is-open' : '') + '" style="margin-top:22px"><button class="disclosure__head" data-action="toggle-opt" aria-expanded="' + flow.optOpen + '">' +
          '<span class="tile tile--gray">' + icon('layers') + '</span><span class="disclosure__title">تنظیمات اختیاری<small>بخش دستگاه — اگر لازم نیست، رد شوید</small></span><span class="disclosure__chev">' + icon('chevD') + '</span></button>' +
          '<div class="disclosure__body"><div class="disclosure__inner"><div class="disclosure__content"><div class="field"><div class="field__label">بخش</div>' + sectionField() + '</div></div></div></div></div>';
      }

      h += '<div id="preview-slot">' + previewHTML() + '</div><div style="height:12px"></div></div>' +
        '<div class="screen__footer"><button class="btn btn--primary btn--block' + (flow.submitting ? ' is-loading' : '') + '" data-action="add-submit">' + icon('check') + 'افزودن دستگاه</button></div>';
      return h;
    },
    mount(el) {
      const input = el.querySelector('#dev-name');
      // validate on blur, but after a short delay so a tap on a suggestion chip lands before any layout shift
      if (input) input.addEventListener('blur', () => setTimeout(() => {
        if (flow && document.activeElement !== input) { flow.nameError = nameProblem(flow.name, flow.branchId); updateDetailsUI(); }
      }, 220));
    }
  };

  function updateDetailsUI() {
    const scr = $screens.querySelector('.screen:not(.is-leaving)');
    if (!scr || !flow) return;
    const count = scr.querySelector('#name-count');
    if (count) count.textContent = fa(clean(flow.name).length) + '/۲۴';
    const slot = scr.querySelector('#name-err-slot');
    if (slot) slot.innerHTML = fieldError(flow.nameError, 'name-err');
    const wrap = scr.querySelector('#dev-name');
    if (wrap) wrap.parentNode.classList.toggle('is-invalid', !!flow.nameError);
    const sg = scr.querySelector('#name-sugg');
    if (sg) {
      // rebuild only when the list itself changes, so a chip being tapped is never replaced mid-click
      const list = nameSuggestions();
      const cur = Array.prototype.map.call(sg.children, (b) => b.dataset.v);
      if (list.join('|') !== cur.join('|')) {
        sg.innerHTML = list.map((x) => '<button class="suggest__chip" data-action="flow-name-suggest" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('');
      }
      Array.prototype.forEach.call(sg.children, (b) => b.classList.toggle('is-selected', normKey(b.dataset.v) === normKey(flow.name)));
    }
    const pv = scr.querySelector('#preview-slot');
    if (pv) pv.innerHTML = previewHTML();
    const sec = scr.querySelector('#new-section');
    if (sec) sec.parentNode.classList.toggle('is-invalid', !!flow.sectionError);
  }

  /* Add — success ------------------------------------------------------ */
  Screens.addSuccess = {
    render(r) {
      const d = Q.device(r.id);
      if (!d) return Screens.devices.render();
      const online = d.status === 'online';
      const sec = d.sectionId ? Q.section(d.sectionId) : null;
      const tags = Q.tagsForDevice(d);
      const branchDevs = Q.devicesIn(d.branchId);
      const lacking = branchDevs.filter((x) => !x.sectionId);
      const needsSections = branchDevs.length >= 2 && lacking.length > 0;
      let confetti = '';
      const colors = ['#2563EB', '#FF6A2C', '#14A05B', '#DF4479', '#D29700', '#7356EE'];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const dist = 70 + (i % 3) * 22;
        confetti += '<i style="background:' + colors[i % colors.length] + ';--x:' + Math.round(Math.cos(a) * dist) + 'px;--y:' + Math.round(Math.sin(a) * dist) + 'px;animation-delay:' + (0.18 + (i % 4) * 0.03) + 's"></i>';
      }
      let h = appbar({ back: 'close', backAction: 'success-close', title: '' }) +
        '<div class="screen__body screen__body--pad"><div class="success' + (r.fresh === false ? ' is-static' : '') + '"><div class="success__badge"><div class="confetti" aria-hidden="true">' + (r.fresh !== false ? confetti : '') + '</div>' +
        '<div class="success__check">' + icon('check', 'stroke-width="2.6"') + '</div></div>' +
        '<h1 class="success__title" tabindex="-1">«' + esc(d.name) + '» اضافه شد</h1>' +
        '<p class="success__sub">از این به بعد شماره هر مشتری که روی این دستگاه وارد شود، مستقیم به باشگاه مشتریان شما می‌رسد.</p>' +
        '<div class="card conn' + (online ? ' is-online' : '') + '" aria-live="polite">' +
        (online ? '<span class="tile tile--green">' + icon('wifi') + '</span><span class="conn__body"><span class="conn__title" style="display:block">دستگاه آنلاین است</span><span class="conn__sub" style="display:block">آماده ثبت شماره مشتری‌ها</span></span>' + statusChip(d)
          : '<span class="spinner" aria-hidden="true"></span><span class="conn__body"><span class="conn__title" style="display:block">در انتظار اتصال دستگاه…</span><span class="conn__sub" style="display:block">دستگاه را روشن و به اینترنت وصل کنید.</span></span>') + '</div>' +
        '<div class="card summary-list">' +
        '<div class="prop"><span class="prop__icon">' + icon('edit') + '</span><span class="prop__body"><span class="prop__label" style="display:block">نام</span><span class="prop__value" style="display:block">' + esc(d.name) + '</span></span></div>' +
        (Q.multi() ? '<div class="prop"><span class="prop__icon">' + icon('store') + '</span><span class="prop__body"><span class="prop__label" style="display:block">شعبه</span><span class="prop__value" style="display:block">' + esc(Q.branchLabel(d.branchId)) + '</span></span></div>' : '') +
        (sec ? '<div class="prop"><span class="prop__icon">' + icon('layers') + '</span><span class="prop__body"><span class="prop__label" style="display:block">بخش</span><span class="prop__value" style="display:block">' + esc(sec.name) + '</span></span></div>' : '') +
        (tags.length ? '<div class="prop"><span class="prop__icon">' + icon('bolt') + '</span><span class="prop__body"><span class="prop__label" style="display:block">برچسب خودکار مشتریان جدید</span><span class="stacked-chips" style="margin-top:4px">' + tags.map((t) => tagChip(t, 'chip--sm')).join('') + '</span></span></div>' : '') +
        '</div>';
      if (needsSections) {
        const other = lacking.find((x) => x.id !== d.id) || lacking[0];
        const partial = lacking.length < branchDevs.length;
        h += '<div class="callout callout--info" style="margin-top:12px;text-align:right">' + icon('bulb') + '<div class="callout__body">' +
          (partial
            ? '<p class="callout__title">«' + esc(other.name) + '» هنوز بخش ندارد</p><p>اگر در قسمت دیگری از کسب‌وکار است، بخشش را هم تعیین کنید تا مشتریانش جدا قابل انتخاب باشند.</p>'
            : '<p class="callout__title">' + nf(branchDevs.length) + ' دستگاه در یک شعبه دارید</p><p>اگر در قسمت‌های مختلفی هستند (مثلاً کافه و قنادی)، برایشان «بخش» تعیین کنید تا بتوانید به مشتریان هر بخش جدا پیام بدهید. اگر فقط برای شلوغی است، لازم نیست.</p>') +
          '<div class="callout__actions"><button class="btn btn--xs btn--secondary" data-action="success-sections" data-id="' + other.id + '">' + icon('layers') + (partial ? 'تعیین بخش «' + esc(other.name) + '»' : 'تعیین بخش‌ها') + '</button></div></div></div>';
      }
      h += '</div></div><div class="screen__footer"><button class="btn btn--primary btn--block" data-action="success-close">مشاهده دستگاه‌ها</button>' +
        '<button class="btn btn--ghost btn--sm" data-action="add-another" data-branch="' + d.branchId + '">' + icon('plus') + 'افزودن دستگاه دیگر</button></div>';
      return h;
    },
    mount(el, r, inPlace) { if (!inPlace) r.fresh = false; },
    onBack() { A['success-close'](); return false; }
  };

  /* Customers (نمای ساده برای نمایش اثر ساختار) ------------------------ */
  Screens.customers = {
    tab: 'customers',
    render() {
      const f = S.ui.custFilter || 'all';
      const filters = [{ k: 'all', label: 'همه', n: Q.totalCustomers() }];
      if (Q.multi()) S.branches.forEach((b) => filters.push({ k: 'b:' + b.id, label: 'شعبه ' + b.name, n: Q.branchCount(b.id) }));
      S.sections.forEach((s) => filters.push({ k: 's:' + s.id, label: 'بخش ' + s.name, n: Q.sectionCount(s.id) }));
      const valid = filters.some((x) => x.k === f) ? f : 'all';
      const latest = new Map();
      S.regs.forEach((r) => {
        if (valid !== 'all') { const [t, id] = valid.split(':'); if ((t === 'b' && r.b !== id) || (t === 's' && r.s !== id)) return; }
        const cur = latest.get(r.c);
        if (!cur || r.t > cur.t) latest.set(r.c, r);
      });
      const rows = Array.from(latest.values()).sort((a, b) => b.t - a.t);
      let h = appbar({ title: 'مشتریان', collapsing: true }) + '<div class="screen__body"><div class="page-head"><h1 class="page-title" tabindex="-1">مشتریان</h1></div>' +
        '<div class="scope-note">' + icon('info') + '<span>نمای ساده برای دیدن اثر ساختار دستگاه‌ها روی گروه مشتریان. طراحی کامل این بخش در دامنه تمرین نیست.</span></div>';
      if (!rows.length && valid === 'all') {
        return h + '<div class="empty" style="padding-top:20px"><span class="tile tile--lg tile--pink">' + icon('users') + '</span><h2 class="empty__title" style="font-size:22px;margin-top:14px">هنوز مشتری‌ای ثبت نشده</h2>' +
          '<p class="empty__desc">بعد از اتصال دستگاه، هر شماره‌ای که ثبت شود اینجا نمایش داده می‌شود.</p>' + (S.devices.length ? '' : '<button class="btn btn--primary" style="margin-top:16px" data-action="add-device">' + icon('plus') + 'افزودن دستگاه</button>') + '</div></div>';
      }
      h += '<div class="filters" role="tablist" aria-label="فیلتر بر اساس برچسب خودکار">' + filters.map((x) => '<button class="filter' + (valid === x.k ? ' is-active' : '') + '" data-action="cust-filter" data-v="' + x.k + '" role="tab" aria-selected="' + (valid === x.k) + '">' + esc(x.label) + '<span>' + nf(x.n) + '</span></button>').join('') + '</div>' +
        '<div class="screen__body--pad"><div class="card">';
      rows.slice(0, 40).forEach((r) => {
        const c = S.customers.find((x) => x.id === r.c);
        const d = Q.device(r.d);
        const tags = Q.tagsForCustomer(c.id);
        const manual = (c.manual || []).map((m) => S.manualTags.find((t) => t.id === m)).filter(Boolean);
        h += '<div class="row-item" style="align-items:flex-start"><span class="tile tile--sm tile--gray" style="margin-top:2px">' + icon('users') + '</span><span class="row-item__body">' +
          '<span class="row-item__title phone" style="display:block;text-align:right">' + maskPhone(c.phone) + '</span>' +
          '<span class="row-item__sub" style="display:block">آخرین ثبت با «' + esc(d ? d.name : 'دستگاه حذف‌شده') + '»' + SEP + rel(r.t) + '</span>' +
          ((tags.length || manual.length) ? '<span class="stacked-chips" style="margin-top:6px">' + tags.map((t) => '<span class="chip chip--sm chip--' + t.color + '">' + icon('bolt') + esc(t.label) + '</span>').join('') +
            manual.map((m) => '<span class="chip chip--sm chip--muted">' + icon('tag') + esc(m.name) + '</span>').join('') + '</span>' : '') + '</span></div>';
      });
      h += '</div>' + (rows.length > 40 ? '<p class="muted" style="text-align:center;font-size:13px;margin-top:12px">و ' + nf(rows.length - 40) + ' مشتری دیگر</p>' : '') +
        '<p class="field__help" style="margin-top:12px;display:flex;gap:6px;align-items:center;justify-content:center">' + icon('bolt', 'style="width:14px;height:14px"') + 'برچسب خودکار از دستگاه' + SEP + icon('tag', 'style="width:14px;height:14px"') + 'برچسب دستی مدیر</p></div></div>';
      return h;
    }
  };

  /* Messages (خارج از دامنه) ------------------------------------------ */
  Screens.messages = {
    tab: 'messages',
    render() {
      let h = appbar({ title: 'ارسال پیام', collapsing: true }) + '<div class="screen__body"><div class="page-head"><h1 class="page-title" tabindex="-1">ارسال پیام</h1></div>' +
        '<div class="scope-note">' + icon('info') + '<span>طراحی جریان ارسال پیام و صفحه انتخاب مخاطب در دامنه این تمرین نیست.</span></div><div class="screen__body--pad stack gap-12">' +
        '<div class="card card--pad"><div class="row gap-12" style="align-items:flex-start"><span class="tile tile--blue">' + icon('target') + '</span><div><p style="font-weight:800">برچسب‌هایی که هنگام انتخاب مخاطب در دسترس‌اند</p>' +
        '<p class="muted" style="font-size:13px;line-height:1.85">برچسب‌های خودکار از ساختار دستگاه‌ها ساخته می‌شوند و کنار برچسب‌های دستی قرار می‌گیرند؛ صفحه انتخاب مخاطب فعلی بدون تغییر از آن‌ها استفاده می‌کند.</p></div></div>' +
        '<div class="stacked-chips" style="margin-top:12px">';
      const chips = [];
      if (Q.multi()) S.branches.forEach((b) => chips.push('<span class="chip chip--' + b.color + '">' + icon('bolt') + 'شعبه ' + esc(b.name) + '<b class="chip__count">' + nf(Q.branchCount(b.id)) + '</b></span>'));
      S.sections.forEach((s) => chips.push('<span class="chip chip--' + s.color + '">' + icon('bolt') + 'بخش ' + esc(s.name) + '<b class="chip__count">' + nf(Q.sectionCount(s.id)) + '</b></span>'));
      S.manualTags.forEach((m) => chips.push('<span class="chip chip--muted">' + icon('tag') + esc(m.name) + '<b class="chip__count">' + nf(S.customers.filter((c) => (c.manual || []).indexOf(m.id) >= 0 && S.regs.some((r) => r.c === c.id)).length) + '</b></span>'));
      h += (chips.length ? chips.join('') : '<span class="muted" style="font-size:13px">هنوز برچسبی ساخته نشده است.</span>') + '</div>' +
        '<button class="link-btn" style="margin-top:8px" data-action="open-groups">این گروه‌ها چطور ساخته می‌شوند؟' + icon('chevL') + '</button></div></div></div>';
      return h;
    }
  };

  /* ----------------------------------------------------------------- sheets */
  const SheetDefs = {
    groups: () => ({
      render() {
        const total = Q.totalCustomers() || 1;
        const row = (ic, color, name, src, count) => '<div class="group-row"><span class="tile tile--sm tile--' + color + '">' + icon(ic) + '</span><span class="group-row__body">' +
          '<span class="group-row__name">' + esc(name) + '</span><span class="group-row__src" style="display:block">' + src + '</span>' +
          '<span class="group-row__bar" style="display:block"><i style="width:' + Math.max(3, Math.round(count / total * 100)) + '%;background:var(--t-' + color + ')"></i></span></span>' +
          '<span class="group-row__count">' + nf(count) + '<small>نفر</small></span></div>';
        const devNames = (list) => list.length ? 'از ' + list.map((d) => '«' + esc(d.name) + '»').join('، ') : '<span class="subtle">دستگاه فعالی ندارد؛ مشتریان قبلی حفظ شده‌اند</span>';
        let body = row('users', 'gray', 'همه مشتریان', 'از همه دستگاه‌ها', Q.totalCustomers());
        if (Q.multi()) {
          body += '<div class="section-label" style="padding-top:14px"><span>بر اساس شعبه</span></div>' +
            S.branches.map((b) => row('store', b.color, 'شعبه ' + b.name, devNames(Q.devicesIn(b.id)), Q.branchCount(b.id))).join('');
        }
        if (S.sections.length) {
          body += '<div class="section-label" style="padding-top:14px"><span>بر اساس بخش</span></div>' +
            S.sections.map((s) => row('layers', s.color, 'بخش ' + s.name, devNames(Q.devicesInSection(s.id)), Q.sectionCount(s.id))).join('');
        }
        if (Q.groupCount() === 0) {
          body += '<div class="callout callout--info" style="margin-top:14px">' + icon('info') + '<div class="callout__body">فعلاً همه مشتریان در یک گروه‌اند. با افزودن شعبه یا تعیین بخش برای دستگاه‌ها، گروه‌های جدید خودکار ساخته می‌شوند.</div></div>';
        } else {
          const ex = [];
          if (Q.multi()) { const b = S.branches[0]; ex.push('<p><b>«شعبه ' + esc(b.name) + '» سه روز برای بازسازی تعطیل است.</b> با انتخاب برچسب «شعبه ' + esc(b.name) + '»، پیام فقط به ' + nf(Q.branchCount(b.id)) + ' مشتری این شعبه می‌رسد و بقیه پیام نامربوط نمی‌گیرند.</p>'); }
          if (S.sections.length) { const s = S.sections[0]; ex.push('<p><b>محصول جدید در «' + esc(s.name) + '».</b> با برچسب «بخش ' + esc(s.name) + '»، ' + nf(Q.sectionCount(s.id)) + ' مشتری' + (Q.multi() ? ' از همه شعبه‌ها' : '') + ' که در این بخش ثبت شده‌اند هدف قرار می‌گیرند.</p>'); }
          body += '<div class="example">' + '<p class="example__title">' + icon('bulb') + 'مثال استفاده هنگام ارسال پیام</p>' + ex.join('') + '</div>';
          const multiBranchCust = Q.multi() ? countMultiBranch() : 0;
          body += '<p class="field__help" style="margin-top:12px">مشتری می‌تواند عضو چند گروه باشد' + (multiBranchCust ? '؛ مثلاً ' + nf(multiBranchCust) + ' نفر در بیش از یک شعبه ثبت شده‌اند و عضو هر دو گروه‌اند.' : '.') + '</p>';
        }
        return sheetHTML({
          title: 'گروه‌های مخاطب',
          sub: 'هر مشتری بر اساس دستگاهی که با آن ثبت شده، برچسب خودکار می‌گیرد. هنگام ارسال پیام، با انتخاب برچسب همین گروه‌ها را هدف بگیرید.',
          body
        });
      }
    }),

    editName: (d) => ({
      autofocus: '#rename',
      state: () => ({ v: d.name, err: null }),
      render(sh) {
        const sugg = ['صندوق', 'پیشخوان', 'ورودی', 'طبقه دوم'];
        const sec = d.sectionId ? Q.section(d.sectionId) : null;
        if (sec) sugg.unshift('صندوق ' + sec.name);
        const used = new Set(Q.devicesIn(d.branchId).filter((x) => x.id !== d.id).map((x) => normKey(x.name)));
        const list = sugg.filter((x, i) => !used.has(normKey(x)) && sugg.indexOf(x) === i).slice(0, 4);
        return sheetHTML({
          title: 'تغییر نام دستگاه',
          body: '<div class="field"><label class="field__label" for="rename">نام دستگاه</label><div class="input-wrap' + (sh.st.err ? ' is-invalid' : '') + '"><input class="input" id="rename" maxlength="24" data-input="rename" value="' + esc(sh.st.v) + '" autocomplete="off" aria-describedby="rename-err rename-help">' +
            '<span class="input-wrap__count" id="rename-count">' + fa(clean(sh.st.v).length) + '/۲۴</span></div><div id="rename-err-slot">' + fieldError(sh.st.err, 'rename-err') + '</div>' +
            '<div class="suggest">' + list.map((x) => '<button class="suggest__chip" data-action="rename-suggest" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' +
            '<div class="callout callout--info" id="rename-help" style="margin-top:6px">' + icon('info') + '<div class="callout__body">نام فقط برای تشخیص دستگاه در پنل است. تغییر آن روی گروه‌بندی و برچسب مشتریان <b>هیچ اثری ندارد</b>.</div></div></div>',
          footer: '<button class="btn btn--primary btn--block" data-action="rename-save">ذخیره نام</button>'
        });
      }
    }),

    editBranch: (d) => ({
      state: () => ({ to: d.branchId, mode: null }),
      render(sh) {
        const changed = sh.st.to !== d.branchId;
        const body = '<div class="choices" role="radiogroup" aria-label="شعبه">' + S.branches.map((b) => {
          const n = Q.devicesIn(b.id).filter((x) => x.id !== d.id).length;
          return '<button class="choice choice--row' + (sh.st.to === b.id ? ' is-selected' : '') + '" data-action="eb-pick" data-v="' + b.id + '" role="radio" aria-checked="' + (sh.st.to === b.id) + '">' +
            '<span class="choice__radio"></span><span class="choice__body"><span class="choice__title" style="display:block">شعبه ' + esc(b.name) + (b.id === d.branchId ? ' <span class="subtle" style="font-weight:600;font-size:12.5px">(فعلی)</span>' : '') + '</span></span>' +
            '<span class="choice__meta">' + (n ? nf(n) + ' دستگاه دیگر' : 'بدون دستگاه دیگر') + '</span></button>';
        }).join('') + '</div>' + (changed ? impactBlock('branch', d, sh.st.to, sh.st.mode) : '');
        return sheetHTML({
          title: 'شعبه «' + esc(d.name) + '»',
          sub: 'مشتریانی که با این دستگاه ثبت می‌شوند، به گروه شعبه انتخاب‌شده اضافه می‌شوند.',
          body,
          footer: '<button class="btn btn--primary btn--block" data-action="eb-save"' + (changed ? '' : ' disabled') + '>' + (changed ? 'انتقال به ' + esc(Q.branchLabel(sh.st.to)) : 'ذخیره') + '</button>'
        });
      }
    }),

    editSection: (d) => ({
      state: () => ({ to: d.sectionId || '', mode: null, newName: '', err: null }),
      render(sh) {
        const to = sh.st.to || null;
        const changed = (to || null) !== (d.sectionId || null) && !(to === '__new' && !clean(sh.st.newName));
        let body = '<div class="suggest" role="radiogroup" aria-label="بخش">' +
          '<button class="suggest__chip' + (!to ? ' is-selected' : '') + '" data-action="es-pick" data-v="" role="radio" aria-checked="' + !to + '">بدون بخش</button>' +
          S.sections.map((s) => '<button class="suggest__chip' + (to === s.id ? ' is-selected' : '') + '" data-action="es-pick" data-v="' + s.id + '" role="radio" aria-checked="' + (to === s.id) + '">' + icon('layers') + esc(s.name) + '</button>').join('') +
          '<button class="suggest__chip suggest__chip--dashed' + (to === '__new' ? ' is-selected' : '') + '" data-action="es-pick" data-v="__new" role="radio" aria-checked="' + (to === '__new') + '">' + icon('plus') + 'بخش جدید</button></div>';
        if (to === '__new') {
          body += '<div class="input-wrap' + (sh.st.err ? ' is-invalid' : '') + '" style="margin-top:12px"><span class="input-wrap__prefix">بخش</span><input class="input" id="es-new" data-input="es-new" maxlength="20" placeholder="مثلاً کافه، طبقه دوم، بانوان" value="' + esc(sh.st.newName) + '" autocomplete="off" aria-describedby="es-err"></div>' + fieldError(sh.st.err, 'es-err');
        }
        body += '<p class="field__help" style="margin-top:10px">بخش، قسمتی از کسب‌وکار است که دستگاه در آن قرار دارد. مشتریان هر بخش جدا قابل انتخاب می‌شوند.</p>';
        body += '<div id="es-impact">' + (changed ? impactBlock('section', d, to, sh.st.mode, sh.st.newName) : '') + '</div>';
        return sheetHTML({
          title: 'بخش «' + esc(d.name) + '»',
          body,
          footer: '<button class="btn btn--primary btn--block" data-action="es-save" id="es-save"' + (changed ? '' : ' disabled') + '>ذخیره</button>'
        });
      }
    }),

    addBranch: () => ({
      autofocus: '#nb-new',
      state: () => ({ newName: '', curName: Q.multi() ? '' : (S.branches[0].name === 'اصلی' ? '' : S.branches[0].name), errNew: null, errCur: null }),
      render(sh) {
        const multi = Q.multi();
        const cur = S.branches[0];
        let body = '';
        if (!multi) body += '<div class="callout callout--info" style="margin-bottom:18px">' + icon('sparkle') + '<div class="callout__body">با افزودن شعبه، دستگاه‌ها و مشتریان بر اساس شعبه دسته‌بندی می‌شوند و برای هر شعبه یک گروه مخاطب خودکار ساخته می‌شود.</div></div>';
        body += '<div class="field"><label class="field__label" for="nb-new">نام شعبه جدید</label><div class="input-wrap' + (sh.st.errNew ? ' is-invalid' : '') + '"><span class="input-wrap__prefix">شعبه</span><input class="input" id="nb-new" data-input="nb-new" maxlength="20" placeholder="مثلاً تجریش" value="' + esc(sh.st.newName) + '" autocomplete="off" aria-describedby="nb-new-err"></div>' + fieldError(sh.st.errNew, 'nb-new-err') + '</div>';
        if (!multi) {
          const devs = Q.devicesIn(cur.id).length;
          body += '<div class="field"><label class="field__label" for="nb-cur">نام شعبه فعلی</label><div class="input-wrap' + (sh.st.errCur ? ' is-invalid' : '') + '"><span class="input-wrap__prefix">شعبه</span><input class="input" id="nb-cur" data-input="nb-cur" maxlength="20" placeholder="مثلاً ونک" value="' + esc(sh.st.curName) + '" autocomplete="off" aria-describedby="nb-cur-err nb-cur-help"></div>' + fieldError(sh.st.errCur, 'nb-cur-err') +
            '<p class="field__help" id="nb-cur-help">' + (devs ? nf(devs) + ' دستگاه و ' + nf(Q.branchCount(cur.id)) + ' مشتری فعلی در این شعبه قرار می‌گیرند و چیزی از دست نمی‌رود.' : 'برای تشخیص دو شعبه از هم، شعبه فعلی هم نام لازم دارد.') + '</p></div>';
        }
        return sheetHTML({ title: 'افزودن شعبه', body, footer: '<button class="btn btn--primary btn--block" data-action="nb-save">' + icon('plus') + 'افزودن شعبه</button>' });
      }
    }),

    renameBranch: (b) => ({
      autofocus: '#rb',
      state: () => ({ v: b.name, err: null }),
      render(sh) {
        return sheetHTML({
          title: 'تغییر نام شعبه',
          body: '<div class="field"><label class="field__label" for="rb">نام شعبه</label><div class="input-wrap' + (sh.st.err ? ' is-invalid' : '') + '"><span class="input-wrap__prefix">شعبه</span><input class="input" id="rb" data-input="rb" maxlength="20" value="' + esc(sh.st.v) + '" autocomplete="off" aria-describedby="rb-err"></div>' + fieldError(sh.st.err, 'rb-err') +
            '<div class="callout callout--info" style="margin-top:6px">' + icon('info') + '<div class="callout__body">نام شعبه همه‌جا، از جمله برچسب مشتریان، به‌روز می‌شود. <b>اعضای گروه تغییری نمی‌کنند</b>؛ ' + nf(Q.branchCount(b.id)) + ' مشتری این شعبه همچنان در همین گروه‌اند.</div></div></div>',
          footer: '<button class="btn btn--primary btn--block" data-action="rb-save">ذخیره</button>'
        });
      }
    }),

    branchMenu: (b) => ({
      render() {
        const empty = !Q.devicesIn(b.id).length && !Q.branchCount(b.id);
        const canDelete = empty && S.branches.length > 1;
        return sheetHTML({
          title: 'شعبه ' + esc(b.name),
          sub: nf(Q.devicesIn(b.id).length) + ' دستگاه' + SEP + nf(Q.branchCount(b.id)) + ' مشتری',
          body: '<div class="sheet-menu" style="padding:0">' +
            '<button class="sheet-menu__item" data-action="menu-add-device" data-branch="' + b.id + '">' + icon('plus') + '<span>افزودن دستگاه به این شعبه</span></button>' +
            '<button class="sheet-menu__item" data-action="menu-rename-branch" data-id="' + b.id + '">' + icon('edit') + '<span>تغییر نام شعبه</span></button>' +
            '<button class="sheet-menu__item is-danger" data-action="delete-branch" data-id="' + b.id + '"' + (canDelete ? '' : ' aria-disabled="true" data-reason="شعبه‌ای که دستگاه یا مشتری دارد قابل حذف نیست تا گروه مشتریانش از بین نرود."') + '>' + icon('trash') +
            '<span>حذف شعبه' + (canDelete ? '' : '<small>فقط شعبه بدون دستگاه و مشتری قابل حذف است</small>') + '</span></button></div>'
        });
      }
    }),

    deviceMenu: (d) => ({
      render() {
        return sheetHTML({
          title: esc(d.name),
          body: '<div class="sheet-menu" style="padding:0">' +
            '<button class="sheet-menu__item" data-action="identify" data-id="' + d.id + '"' + (d.status !== 'online' ? ' aria-disabled="true" data-reason="دستگاه آنلاین نیست؛ بعد از اتصال دوباره امتحان کنید."' : '') + '>' + icon('locate') + '<span>پیدا کردن دستگاه<small>صفحه دستگاه چند ثانیه چشمک می‌زند</small></span></button>' +
            '<button class="sheet-menu__item" data-action="edit-name" data-id="' + d.id + '">' + icon('edit') + '<span>تغییر نام</span></button>' +
            (Q.multi() ? '<button class="sheet-menu__item" data-action="edit-branch" data-id="' + d.id + '">' + icon('store') + '<span>تغییر شعبه</span></button>' : '') +
            '<button class="sheet-menu__item" data-action="edit-section" data-id="' + d.id + '">' + icon('layers') + '<span>' + (d.sectionId ? 'تغییر بخش' : 'تعیین بخش') + '</span></button>' +
            '<button class="sheet-menu__item is-danger" data-action="remove-device" data-id="' + d.id + '">' + icon('trash') + '<span>حذف دستگاه از پنل</span></button></div>'
        });
      }
    }),

    removeDevice: (d) => ({
      render() {
        const n = Q.deviceStats(d.id).total;
        const li = (ic, t) => '<div class="row gap-12" style="align-items:flex-start;padding:8px 0"><span class="tile tile--sm tile--gray">' + icon(ic) + '</span><p style="font-size:14px;line-height:1.85;padding-top:6px">' + t + '</p></div>';
        return sheetHTML({
          title: 'حذف «' + esc(d.name) + '» از پنل؟',
          body: li('device', 'دستگاه دیگر شماره‌ای در باشگاه شما ثبت نمی‌کند.') +
            li('users', '<b>' + nf(n) + ' مشتری</b> ثبت‌شده و برچسب‌هایشان حفظ می‌شوند.') +
            li('refresh', 'هر زمان بخواهید، می‌توانید با همان کد دوباره اضافه‌اش کنید.'),
          footer: '<button class="btn btn--secondary" data-action="sheet-close">انصراف</button><button class="btn btn--danger" data-action="remove-confirm" data-id="' + d.id + '">' + icon('trash') + 'حذف دستگاه</button>',
          footerRow: true
        });
      }
    }),

    discard: () => ({
      render() {
        return sheetHTML({
          title: 'از افزودن دستگاه خارج می‌شوید؟',
          sub: 'کدی که وارد کرده‌اید ذخیره نمی‌شود و باید دوباره واردش کنید.',
          body: '',
          footer: '<button class="btn btn--secondary" data-action="sheet-close">ادامه افزودن</button><button class="btn btn--danger" data-action="discard-confirm">خروج</button>',
          footerRow: true
        });
      }
    }),

    demo: () => ({
      render() { return sheetHTML({ title: 'راهنمای نمونه', sub: 'سناریوها، کدهای آزمایشی و یادداشت طراحی هر صفحه', body: '<div class="demo">' + demoHTML() + '</div>' }); }
    })
  };

  function countMultiBranch() {
    const m = new Map();
    S.regs.forEach((r) => { if (!m.has(r.c)) m.set(r.c, new Set()); m.get(r.c).add(r.b); });
    let n = 0; m.forEach((s) => { if (s.size > 1) n++; });
    return n;
  }

  const openSheet = (name, arg) => Sheets.open(SheetDefs[name](arg));

  /* ---------------------------------------------------------------- actions */
  const A = {
    'tab'(el) { Nav.tab(el.dataset.v); },
    'back'() { Nav.back(); },
    'oos'(el) {
      const m = { buy: 'خرید دستگاه خارج از دامنه این نمونه است.', support: 'در نسخه واقعی، تماس با پشتیبانی برقرار می‌شود.', torch: 'چراغ‌قوه دوربین در نسخه واقعی روشن می‌شود.' };
      toast(m[el.dataset.v] || 'این بخش خارج از دامنه این نمونه است.', { tone: 'info' });
    },
    'toast-action'() { const fn = Toast.onAction; Toast.hide(); if (fn) fn(); },
    'sheet-close'() { const t = Sheets.top(); if (t) t.close(); },
    'coach-close'() { S.ui.coach = null; commit(); },

    /* add flow */
    'add-device'(el) { startAdd({ branchId: el.dataset.branch }); },
    'add-another'(el) { startAdd({ branchId: Q.multi() ? el.dataset.branch : undefined }); },
    'menu-add-device'(el) { Sheets.closeAll(true); startAdd({ branchId: el.dataset.branch }); },
    'add-close'() { if (hasProgress()) openSheet('discard'); else exitAdd(); },
    'discard-confirm'() { Sheets.closeAll(true); exitAdd(); },
    'toggle-where'() { flow.showWhere = !flow.showWhere; const d = document.querySelector('.screen:not(.is-leaving) .where-code'); if (d) { d.classList.toggle('is-open', flow.showWhere); d.querySelector('.disclosure__head').setAttribute('aria-expanded', flow.showWhere); } },
    'where-code'() { flow.showWhere = true; const d = document.querySelector('.screen:not(.is-leaving) .where-code'); if (d) { d.classList.add('is-open'); setTimeout(() => d.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); } },
    'clear-code'() { flow.code = ''; flow.status = 'idle'; flow.error = null; updateCodeUI(); const i = document.getElementById('code-input'); if (i) i.focus(); },
    'retry-verify'() { flow.status = 'idle'; verify(); },
    'verify'() { verify(); },
    'open-scan'() { Nav.push({ name: 'scan' }); },
    'open-device-from-add'(el) { flow = null; Nav.reset([{ name: 'devices' }, { name: 'device', id: el.dataset.id }], 'fwd'); },
    'flow-branch'(el) {
      flow.branchId = el.dataset.v; flow.branchError = null;
      if (!flow.nameEdited) flow.name = defaultName(flow.branchId);
      if (flow.nameError) flow.nameError = nameProblem(flow.name, flow.branchId);
      render(null);
    },
    'flow-section'(el) {
      flow.sectionId = el.dataset.v || null; flow.sectionError = null;
      render(null);
      if (flow.sectionId === '__new') setTimeout(() => { const i = document.getElementById('new-section'); if (i) i.focus(); }, 30);
    },
    'flow-name-suggest'(el) {
      flow.name = el.dataset.v; flow.nameEdited = true; flow.nameError = nameProblem(flow.name, flow.branchId);
      const i = document.getElementById('dev-name'); if (i) i.value = flow.name;
      updateDetailsUI();
    },
    'toggle-opt'() { flow.optOpen = !flow.optOpen; const d = document.querySelector('.screen:not(.is-leaving) .disclosure'); if (d) { d.classList.toggle('is-open', flow.optOpen); d.querySelector('.disclosure__head').setAttribute('aria-expanded', flow.optOpen); } },
    async 'add-submit'() {
      if (!flow || flow.submitting) return;
      if (Q.multi() && !flow.branchId) flow.branchError = 'شعبه این دستگاه را انتخاب کنید.';
      flow.nameError = nameProblem(flow.name, flow.branchId);
      if (flow.sectionId === '__new') {
        const v = stripPrefix(flow.newSection, 'بخش');
        flow.sectionError = !v ? 'نام بخش را بنویسید یا «بدون بخش» را انتخاب کنید.' : null;
      }
      if (flow.branchError || flow.nameError || flow.sectionError) {
        render(null); vibrate([30, 40, 30]);
        const firstErr = document.querySelector('.screen:not(.is-leaving) .field__error');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      flow.submitting = true; render(null);
      await sleep(700);
      if (!flow) return;
      const { d } = createDevice();
      flow = null;
      Nav.reset([{ name: 'devices' }, { name: 'addSuccess', id: d.id }], 'fwd');
      vibrate([10, 30, 10]);
    },
    'success-close'() { flowCleanup(); Nav.reset([{ name: 'devices' }], 'back'); },
    'success-sections'(el) {
      S.ui.coach = { type: 'sections' }; persist();
      Nav.reset([{ name: 'devices' }, { name: 'device', id: el.dataset.id }], 'fwd');
      setTimeout(() => openSheet('editSection', Q.device(el.dataset.id)), 380);
    },

    /* devices */
    'open-device'(el) { Nav.push({ name: 'device', id: el.dataset.id }); },
    'open-groups'() { openSheet('groups'); },
    'device-menu'(el) { openSheet('deviceMenu', Q.device(el.dataset.id)); },
    'branch-menu'(el) { openSheet('branchMenu', Q.branch(el.dataset.id)); },
    'edit-name'(el) { Sheets.closeAll(true); openSheet('editName', Q.device(el.dataset.id)); },
    'edit-branch'(el) { Sheets.closeAll(true); openSheet('editBranch', Q.device(el.dataset.id)); },
    'edit-section'(el) { Sheets.closeAll(true); openSheet('editSection', Q.device(el.dataset.id)); },
    'remove-device'(el) { Sheets.closeAll(true); openSheet('removeDevice', Q.device(el.dataset.id)); },
    'copy-code'(el) {
      const d = Q.device(el.dataset.id);
      try { navigator.clipboard.writeText(d.code); } catch (e) { /* noop */ }
      toast('شناسه دستگاه کپی شد', { tone: 'info' });
    },
    'identify'(el) {
      const d = Q.device(el.dataset.id);
      Sheets.closeAll(true);
      if (!d || d.status !== 'online') { toast('دستگاه آنلاین نیست؛ بعد از اتصال دوباره امتحان کنید.', { tone: 'warning' }); return; }
      identifying = d.id; clearTimeout(identifyTimer);
      refresh();
      toast('صفحه «' + esc(d.name) + '» تا ۱۰ ثانیه چشمک می‌زند و یک بوق کوتاه پخش می‌کند.', { tone: 'info' });
      identifyTimer = setTimeout(() => { identifying = null; refresh(); }, 10000);
    },
    'rename-suggest'(el) {
      const sh = Sheets.top(); sh.st.v = el.dataset.v;
      sh.st.err = null;
      const i = sh.el.querySelector('#rename'); if (i) { i.value = sh.st.v; i.focus(); }
      updateRenameUI(sh);
    },
    'rename-save'() {
      const sh = Sheets.top(); const d = sh.def.device;
      const v = clean(sh.st.v);
      sh.st.err = nameProblem(v, d.branchId, d.id);
      if (sh.st.err) { updateRenameUI(sh); vibrate([30, 40, 30]); return; }
      if (v === d.name) { sh.close(); return; }
      const snap = store.snapshot();
      d.history.push({ t: Date.now(), type: 'rename', from: d.name, to: v });
      d.name = v; persist(); sh.close(); refresh();
      undoable(snap, 'نام دستگاه به «' + esc(v) + '» تغییر کرد. گروه‌بندی مشتریان دست نخورد.');
    },
    'eb-pick'(el) {
      const sh = Sheets.top(); const d = sh.def.device;
      sh.st.to = el.dataset.v;
      sh.st.mode = sh.st.to !== d.branchId ? impactInfo('branch', d, sh.st.to).rec : null;
      sh.refresh();
    },
    'es-pick'(el) {
      const sh = Sheets.top(); const d = sh.def.device;
      sh.st.to = el.dataset.v; sh.st.err = null;
      const to = sh.st.to || null;
      sh.st.mode = to !== (d.sectionId || null) ? impactInfo('section', d, to === '__new' ? '__new' : to, sh.st.newName).rec : null;
      sh.refresh();
      if (to === '__new') setTimeout(() => { const i = sh.el.querySelector('#es-new'); if (i) i.focus(); }, 30);
    },
    'impact-mode'(el) {
      const sh = Sheets.top(); sh.st.mode = el.dataset.v; sh.refresh();
    },
    'eb-save'() {
      const sh = Sheets.top(); const d = sh.def.device;
      if (sh.st.to === d.branchId) { sh.close(); return; }
      applyChange(d, 'branch', sh.st.to, sh.st.mode || 'forward');
    },
    'es-save'() {
      const sh = Sheets.top(); const d = sh.def.device;
      let to = sh.st.to || null;
      if (to === '__new') {
        const v = stripPrefix(sh.st.newName, 'بخش');
        if (!v) { sh.st.err = 'نام بخش را بنویسید.'; sh.refresh(); return; }
        const ex = S.sections.find((s) => normKey(s.name) === normKey(v));
        if (ex) to = ex.id;
      }
      if ((to || null) === (d.sectionId || null)) { sh.close(); return; }
      applyChange(d, 'section', to, sh.st.mode || 'forward', sh.st.newName);
    },
    'remove-confirm'(el) {
      const d = Q.device(el.dataset.id);
      const snap = store.snapshot();
      S.devices = S.devices.filter((x) => x.id !== d.id);
      persist();
      Sheets.closeAll(true);
      if (Nav.cur().name === 'device') Nav.back(); else refresh();
      undoable(snap, '«' + esc(d.name) + '» از پنل حذف شد. مشتریانش حفظ شدند.');
    },

    /* branches */
    'add-branch'() { openSheet('addBranch'); },
    'menu-rename-branch'(el) { Sheets.closeAll(true); openSheet('renameBranch', Q.branch(el.dataset.id)); },
    'nb-save'() {
      const sh = Sheets.top();
      const multi = Q.multi();
      const nv = stripPrefix(sh.st.newName, 'شعبه');
      const cv = stripPrefix(sh.st.curName, 'شعبه');
      sh.st.errNew = !nv ? 'نام شعبه جدید را بنویسید.' : S.branches.some((b) => (multi || b.id !== S.branches[0].id) && normKey(b.name) === normKey(nv)) ? 'شعبه‌ای با این نام دارید.' : null;
      sh.st.errCur = null;
      if (!multi) {
        if (!cv) sh.st.errCur = 'برای تشخیص دو شعبه، نام شعبه فعلی را هم بنویسید.';
        else if (nv && normKey(cv) === normKey(nv)) sh.st.errCur = 'نام دو شعبه نباید یکی باشد.';
      }
      if (sh.st.errNew || sh.st.errCur) { sh.refresh(); vibrate([30, 40, 30]); return; }
      const snap = store.snapshot();
      if (!multi) S.branches[0].name = cv;
      const b = { id: uid('b'), name: nv, color: BRANCH_COLORS[S.branches.length % BRANCH_COLORS.length], createdAt: Date.now() };
      S.branches.push(b);
      S.ui.coach = { type: 'branch-added', branchId: b.id };
      persist(); sh.close();
      if (Nav.cur().name !== 'devices') Nav.tab('devices'); else refresh();
      const body = $screens.querySelector('.screen:not(.is-leaving) .screen__body');
      if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
      undoable(snap, 'شعبه ' + esc(nv) + ' اضافه شد' + (!multi ? '؛ دستگاه‌های قبلی در شعبه ' + esc(cv) + ' هستند.' : '.'));
    },
    'rb-save'() {
      const sh = Sheets.top(); const b = sh.def.branch;
      const v = stripPrefix(sh.st.v, 'شعبه');
      sh.st.err = !v ? 'نام شعبه را بنویسید.' : S.branches.some((x) => x.id !== b.id && normKey(x.name) === normKey(v)) ? 'شعبه‌ای با این نام دارید.' : null;
      if (sh.st.err) { sh.refresh(); return; }
      const snap = store.snapshot();
      const old = b.name;
      b.name = v; persist(); sh.close(); refresh();
      undoable(snap, 'نام «شعبه ' + esc(old) + '» به «شعبه ' + esc(v) + '» تغییر کرد. اعضای گروه همان‌اند.');
    },
    'delete-branch'(el) {
      const b = Q.branch(el.dataset.id);
      const snap = store.snapshot();
      S.branches = S.branches.filter((x) => x.id !== b.id);
      if (S.ui.coach && S.ui.coach.branchId === b.id) S.ui.coach = null;
      persist(); Sheets.closeAll(); refresh();
      undoable(snap, 'شعبه ' + esc(b.name) + ' حذف شد.');
    },

    /* customers */
    'cust-filter'(el) { S.ui.custFilter = el.dataset.v; commit(); },

    /* demo */
    'demo-open'() { openSheet('demo'); },
    'demo-scenario'(el) { startScenario(+el.dataset.v); },
    'demo-code'(el) { demoFillCode(el.dataset.v); },
    'demo-register'(el) { simulateRegistration(el.dataset.id); },
    'demo-reset'() { startScenario(S.ui.scenario || 1); toast('داده‌های سناریو بازنشانی شد', { tone: 'info' }); }
  };

  /* inputs */
  const I = {
    code(el) {
      if (!flow) return;
      const v = toLatin(el.value).replace(/\D/g, '').slice(0, 8);
      if (v !== flow.code) { flow.code = v; if (flow.status !== 'checking') { flow.status = 'idle'; flow.error = null; } }
      el.value = v;
      updateCodeUI();
      if (v.length === 8) setTimeout(verify, 160);
    },
    'flow-name'(el) {
      flow.name = el.value; flow.nameEdited = true;
      if (flow.nameError) flow.nameError = nameProblem(flow.name, flow.branchId);
      updateDetailsUI();
    },
    'flow-new-section'(el) {
      flow.newSection = el.value; flow.sectionError = null;
      updateDetailsUI();
    },
    rename(el) { const sh = Sheets.top(); sh.st.v = el.value; if (sh.st.err) sh.st.err = nameProblem(el.value, sh.def.device.branchId, sh.def.device.id); updateRenameUI(sh); },
    'es-new'(el) {
      const sh = Sheets.top(); const d = sh.def.device;
      sh.st.newName = el.value; sh.st.err = null;
      if (!sh.st.mode) sh.st.mode = impactInfo('section', d, '__new', el.value).rec;
      const slot = sh.el.querySelector('#es-impact');
      const changed = !!clean(el.value);
      if (slot) slot.innerHTML = changed ? impactBlock('section', d, '__new', sh.st.mode, el.value) : '';
      const btn = sh.el.querySelector('#es-save'); if (btn) btn.disabled = !changed;
      el.parentNode.classList.remove('is-invalid');
      const err = sh.el.querySelector('#es-err'); if (err) err.remove();
    },
    'nb-new'(el) { const sh = Sheets.top(); sh.st.newName = el.value; if (sh.st.errNew) { sh.st.errNew = null; el.parentNode.classList.remove('is-invalid'); const e = sh.el.querySelector('#nb-new-err'); if (e) e.remove(); } },
    'nb-cur'(el) { const sh = Sheets.top(); sh.st.curName = el.value; if (sh.st.errCur) { sh.st.errCur = null; el.parentNode.classList.remove('is-invalid'); const e = sh.el.querySelector('#nb-cur-err'); if (e) e.remove(); } },
    rb(el) { const sh = Sheets.top(); sh.st.v = el.value; }
  };

  function updateRenameUI(sh) {
    const c = sh.el.querySelector('#rename-count'); if (c) c.textContent = fa(clean(sh.st.v).length) + '/۲۴';
    const s = sh.el.querySelector('#rename-err-slot'); if (s) s.innerHTML = fieldError(sh.st.err, 'rename-err');
    const i = sh.el.querySelector('#rename'); if (i) i.parentNode.classList.toggle('is-invalid', !!sh.st.err);
  }

  /* ------------------------------------------------------------------ demo */
  const SCENARIOS = [
    { n: 1, title: 'افزودن اولین دستگاه', desc: 'کسب‌وکار تک‌شعبه، بدون دستگاه', base: 'empty',
      start: () => Nav.tab('home'),
      tryText: 'از کارت آبی <b>«اتصال اولین دستگاه»</b> در خانه شروع کنید. یک کد ۸ رقمی دلخواه وارد کنید یا <b>اسکن QR</b> را بزنید. برای دیدن خطاها از کدهای آزمایشی پایین استفاده کنید.' },
    { n: 2, title: 'افزودن و مدیریت دستگاه دوم', desc: 'همان شعبه، یک دستگاه دارد', base: 'single',
      start: () => Nav.tab('devices'),
      tryText: 'دستگاه دوم را اضافه کنید؛ پیشنهاد نام و فیلد <b>«بخش»</b> حالا ظاهر می‌شوند. بعد روی هر دستگاه بزنید، نامش را عوض کنید یا <b>«پیدا کردن دستگاه»</b> را امتحان کنید. «افزودن شعبه» هم مسیر رشد به چندشعبه را نشان می‌دهد.' },
    { n: 3, title: 'مدیریت دستگاه‌ها در چند شعبه', desc: 'ونک با ۲ دستگاه، تجریش با ۱ دستگاه', base: 'multi',
      start: () => Nav.tab('devices'),
      tryText: 'دستگاه‌ها زیر هر شعبه دسته‌بندی شده‌اند. از «⋯» کنار شعبه نامش را عوض کنید یا به آن دستگاه اضافه کنید. «پیشخوان» تجریش آفلاین است. برای دیدن مسیر ساخت از صفر، سناریو ۲ ← «افزودن شعبه».' },
    { n: 4, title: 'پشتیبانی از انتخاب مخاطب هدف', desc: 'گروه‌هایی که از شعبه و بخش ساخته می‌شوند', base: 'multi',
      start: () => { Nav.tab('devices'); setTimeout(() => openSheet('groups'), 420); },
      tryText: 'نیاز فرضی: پیام به مشتریان <b>یک شعبه</b> (مثلاً تعطیلی ونک) یا <b>یک بخش</b> (مثلاً محصول جدید قنادی در هر دو شعبه). تب «مشتریان» هم برچسب‌های خودکار هر مشتری را نشان می‌دهد.' },
    { n: 5, title: 'تغییر اطلاعات و اثر آن', desc: 'جابه‌جایی یا اصلاح شعبه/بخش دستگاه', base: 'multi',
      start: () => Nav.reset([{ name: 'devices' }, { name: 'device', id: 'd2' }], 'fwd'),
      tryText: 'شعبه یا بخش «صندوق کافه» را تغییر دهید و دو گزینه را مقایسه کنید: <b>جابه‌جایی</b> (مشتریان قبلی می‌مانند) یا <b>اصلاح اشتباه</b> (منتقل می‌شوند). پیش‌نمایش اعداد را ببینید، بعد با «ثبت مشتری آزمایشی» نتیجه را روی مشتری جدید چک کنید. تغییر نام هیچ اثری بر گروه‌ها ندارد.' }
  ];

  function startScenario(n) {
    const sc = SCENARIOS.find((x) => x.n === n) || SCENARIOS[0];
    Sheets.closeAll(true);
    flowCleanup(); flow = null; identifying = null;
    S = window.SEED.build(sc.base);
    S.ui.scenario = sc.n;
    store.save();
    sc.start();
    refreshDemo();
  }

  function demoFillCode(code) {
    Sheets.closeAll(true);
    const go = () => {
      flow.code = code; flow.status = 'idle'; flow.error = null;
      updateCodeUI();
      setTimeout(verify, 200);
    };
    if (Nav.cur().name === 'addCode' && flow) go();
    else { startAdd(); setTimeout(go, 380); }
  }

  function simulateRegistration(id) {
    const d = Q.device(id);
    if (!d) return;
    const c = { id: uid('c'), phone: window.SEED.makePhone(), manual: [] };
    S.customers.push(c);
    S.regs.push({ c: c.id, d: d.id, b: d.branchId, s: d.sectionId || null, t: Date.now() });
    if (d.status !== 'online') { d.status = 'online'; d.history.push({ t: Date.now(), type: 'online' }); }
    d.lastSeenAt = Date.now();
    Sheets.closeAll(true);
    commit();
    const tags = Q.tagsForDevice(d).map((t) => '«' + esc(t.label) + '»');
    toast('مشتری <span class="phone">' + maskPhone(c.phone) + '</span> با «' + esc(d.name) + '» ثبت شد' + (tags.length ? '؛ برچسب: ' + tags.join('، ') : ''), { tone: 'success', duration: 5200 });
  }

  const NOTES = {
    home: () => (S.devices.length
      ? '<b>خانه</b> وضعیت دستگاه‌ها را خلاصه می‌کند و دستگاه آفلاین را همین‌جا هشدار می‌دهد تا مدیر مجبور نباشد دنبالش بگردد.'
      : '<b>نقطه شروع مسیر:</b> کارت راه‌اندازی در خانه، اولین کار ممکن را جلوی چشم می‌گذارد. مسیر دوم، تب «دستگاه‌ها» است که وضعیت خالی آموزشی دارد.'),
    devices: () => {
      if (!S.devices.length) return '<b>وضعیت خالی آموزشی:</b> سه قدم کوتاه + یک دکمه اصلی در دسترس شست. هیچ مفهومی از شعبه یا بخش نمایش داده نمی‌شود.';
      if (!Q.multi()) return '<b>سادگی برای تک‌شعبه:</b> کاربر تک‌شعبه مفهوم «شعبه» را نمی‌بیند؛ فقط فهرست دستگاه‌ها. «افزودن شعبه» یک پیشنهاد کم‌رنگ پایین صفحه است و فقط وقتی لازم شد استفاده می‌شود.<ul><li>هر کارت: نام، بخش، ۴ رقم آخر شناسه (مطابق برچسب پشت دستگاه)، وضعیت و تعداد مشتری.</li></ul>';
      return '<b>ساختار سلسله‌مراتبی فقط وقتی لازم است:</b> با ساخت شعبه دوم، فهرست خودکار بر اساس شعبه دسته‌بندی می‌شود.<ul><li>کارت «گروه‌های مخاطب» نشان می‌دهد این ساختار چه گروه‌هایی برای ارسال پیام می‌سازد.</li><li>رنگ کاشی هر دستگاه = رنگ بخش آن.</li></ul>';
    },
    addCode: () => '<b>تنها اطلاعات ضروری: کد دستگاه.</b><ul><li>ارقام فارسی، عربی و انگلیسی پذیرفته می‌شود؛ پیست هم کار می‌کند.</li><li>با کامل شدن ۸ رقم، بررسی خودکار شروع می‌شود.</li><li>هر خطا پیام مشخص و راه بعدی دارد (کد کجاست؟ / پشتیبانی / مشاهده دستگاه / تلاش دوباره).</li></ul>',
    scan: () => '<b>مسیر جایگزین:</b> اسکن QR برای کسانی که تایپ کد برایشان سخت است. اینجا شبیه‌سازی است و بعد از چند ثانیه کد خوانده می‌شود.',
    addDetails: () => '<b>همه‌چیز پیش‌فرض دارد.</b><ul><li>اولین دستگاه: فقط یک نام پیشنهادی و تنظیمات اختیاری بسته.</li><li>دستگاه دوم در همان شعبه: فیلد «بخش» باز می‌شود چون حالا معنا دارد.</li><li>چندشعبه: شعبه تنها فیلد ضروری اضافه است.</li><li>کارت برچسب‌ها، اثر انتخاب‌ها بر مخاطبان را همان لحظه نشان می‌دهد.</li></ul>',
    addSuccess: () => '<b>بازخورد دو مرحله‌ای:</b> «اضافه شد» و سپس «آنلاین شد» (شبیه‌سازی اتصال). اگر دو دستگاه در یک شعبه باشد، پیشنهاد تعیین بخش داده می‌شود — نه زودتر.',
    device: () => '<b>هویت ثابت، برچسب قابل تغییر:</b><ul><li>نام فقط برچسب نمایشی است و روی گروه‌ها اثر ندارد.</li><li>تغییر شعبه/بخش می‌پرسد: «جابه‌جا کرده‌اید یا اشتباه بوده؟» و اثرش را با عدد پیش‌نمایش می‌دهد.</li><li>«پیدا کردن دستگاه» برای تشخیص دو دستگاه یکسان در محل.</li><li>تاریخچه، هر تغییر و اثرش را ثبت می‌کند.</li></ul>',
    customers: () => '<b>اثر ساختار روی داده:</b> برچسب‌های ⚡ خودکار از محل ثبت هر مشتری می‌آیند و کنار برچسب‌های دستی قرار می‌گیرند. فیلترها همان گروه‌هایی‌اند که هنگام ارسال پیام انتخاب می‌شوند.',
    messages: () => '<b>بدون تغییر در جریان ارسال پیام:</b> چون گروه‌ها به‌شکل برچسب ساخته می‌شوند، صفحه انتخاب مخاطب فعلی بی‌تغییر از آن‌ها استفاده می‌کند.'
  };

  function demoHTML() {
    const curN = S.ui.scenario || 1;
    const r = Nav.cur();
    let h = '<h3>' + icon('flask') + 'سناریوهای تمرین</h3>' + SCENARIOS.map((s) =>
      '<button class="scn' + (curN === s.n ? ' is-active' : '') + '" data-action="demo-scenario" data-v="' + s.n + '"><span class="scn__num">' + fa(s.n) + '</span><span style="flex:1;min-width:0">' +
      '<span class="scn__title" style="display:block">' + s.title + '</span><span class="scn__desc" style="display:block">' + s.desc + '</span>' +
      '<span class="scn__try">' + s.tryText + '</span></span></button>').join('');

    h += '<h3>' + icon('hash') + 'کدهای آزمایشی دستگاه</h3><div class="codes">' +
      '<button class="code-row" data-action="demo-code" data-v="' + randomNewCode() + '"><code>هر کد دیگر</code><span>دستگاه جدید — موفق</span>' + icon('chevL') + '</button>' +
      '<button class="code-row" data-action="demo-code" data-v="11111111"><code>' + fmtCode('11111111') + '</code><span>کد اشتباه — پیدا نشد</span>' + icon('chevL') + '</button>' +
      '<button class="code-row" data-action="demo-code" data-v="22222222"><code>' + fmtCode('22222222') + '</code><span>متصل به حساب دیگر</span>' + icon('chevL') + '</button>' +
      '<button class="code-row" data-action="demo-code" data-v="33333333"><code>' + fmtCode('33333333') + '</code><span>قطع ارتباط — بار دوم موفق</span>' + icon('chevL') + '</button>' +
      (S.devices[0] ? '<button class="code-row" data-action="demo-code" data-v="' + S.devices[0].code + '"><code>' + fmtCode(S.devices[0].code) + '</code><span>تکراری — «' + esc(S.devices[0].name) + '»</span>' + icon('chevL') + '</button>' : '') +
      '</div>';

    if (S.devices.length) {
      const target = (r.name === 'device' && Q.device(r.id)) || S.devices.find((d) => d.status === 'online') || S.devices[0];
      h += '<h3>' + icon('userPlus') + 'ابزار دمو</h3><div class="demo-tools">' +
        '<button class="btn btn--secondary btn--sm btn--block" data-action="demo-register" data-id="' + target.id + '">' + icon('userPlus') + 'ثبت مشتری آزمایشی روی «' + esc(target.name) + '»</button></div>';
    }

    const note = NOTES[r.name] ? NOTES[r.name]() : '';
    if (note) h += '<h3>' + icon('bulb') + 'یادداشت طراحی این صفحه</h3><div class="note-card">' + note + '</div>';

    h += '<div class="demo-links"><a class="btn btn--tonal btn--sm" href="docs.html" target="_blank" rel="noopener">' + icon('doc') + 'مستند طراحی</a>' +
      '<button class="btn btn--ghost btn--sm" data-action="demo-reset">' + icon('refresh') + 'بازنشانی</button></div>';
    return h;
  }

  function refreshDemo() {
    if ($demoBody && getComputedStyle($demoBody.parentNode).display !== 'none') {
      const top = $demoBody.scrollTop;
      $demoBody.innerHTML = '<div class="demo">' + demoHTML() + '</div>';
      $demoBody.scrollTop = top;
    }
    const strip = document.getElementById('strip-scn');
    if (strip && S) {
      const sc = SCENARIOS.find((x) => x.n === (S.ui.scenario || 1));
      strip.textContent = 'سناریو ' + fa(sc.n) + ': ' + sc.title;
    }
    const demoSheet = Sheets.stack.find((s) => s.def.isDemo);
    if (demoSheet && !demoSheet._refreshing) { demoSheet._refreshing = true; demoSheet.refresh(); demoSheet._refreshing = false; }
  }

  /* ------------------------------------------------------------------- boot */
  function boot() {
    $app = document.getElementById('app');
    $screens = document.getElementById('screens');
    $tabbar = document.getElementById('tabbar');
    $toast = document.getElementById('toast');
    $demoBody = document.getElementById('demo-body');

    // sheets that act on a device/branch keep a reference to it
    const raw = Object.assign({}, SheetDefs);
    Object.keys(raw).forEach((k) => {
      SheetDefs[k] = (arg) => {
        const def = raw[k](arg);
        if (['editName', 'editBranch', 'editSection', 'removeDevice', 'deviceMenu'].indexOf(k) >= 0) def.device = arg;
        if (['renameBranch', 'branchMenu'].indexOf(k) >= 0) def.branch = arg;
        if (k === 'demo') def.isDemo = true;
        return def;
      };
    });

    const params = new URLSearchParams(location.search);
    const qs = parseInt(params.get('s'), 10);
    S = store.load();
    if (qs >= 1 && qs <= 5) { startScenario(qs); }
    else if (!S) { startScenario(1); }
    else {
      const startTab = S.devices.length ? 'devices' : 'home';
      Nav.stack = [{ name: startTab }];
      render('fade');
    }

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      if (t.getAttribute('aria-disabled') === 'true') { e.preventDefault(); if (t.dataset.reason) toast(t.dataset.reason, { tone: 'info' }); return; }
      const fn = A[t.dataset.action];
      if (fn) { e.preventDefault(); fn(t, e); }
    });
    document.addEventListener('input', (e) => {
      const t = e.target.closest('[data-input]');
      if (t && I[t.dataset.input]) I[t.dataset.input](t, e);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && Sheets.stack.length) { Sheets.top().close(); return; }
      if (e.key === 'Enter' && e.target.matches('.sheet input')) {
        const btn = e.target.closest('.sheet').querySelector('.sheet__footer .btn--primary');
        if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      }
      if (e.key === 'Enter' && e.target.id === 'dev-name') { e.preventDefault(); A['add-submit'](); }
    });

    // Android/browser back button → in-app back
    try {
      history.replaceState({ base: 1 }, '');
      history.pushState({ trap: 1 }, '');
      window.addEventListener('popstate', () => {
        if (Sheets.stack.length) { Sheets.top().close(); history.pushState({ trap: 1 }, ''); return; }
        if (Nav.stack.length > 1 || Nav.cur().name !== 'home') { Nav.back(); history.pushState({ trap: 1 }, ''); }
      });
    } catch (e) { /* file:// on some browsers */ }

    setInterval(() => {
      const a = document.activeElement;
      if (!Sheets.stack.length && !(a && a.matches && a.matches('input'))) render(null);
    }, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
