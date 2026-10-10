/* داده ساختگی سناریوها — همه‌چیز قطعی (seeded) تا هر بار همان اعداد دیده شود. */
(function () {
  'use strict';

  const DAY = 86400000;
  const HOUR = 3600000;
  const MIN = 60000;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const PREFIXES = ['0912', '0935', '0919', '0921', '0901', '0937', '0990', '0915', '0913', '0917', '0938', '0903', '0930', '0910'];

  function makePhone(r) {
    let s = PREFIXES[Math.floor(r() * PREFIXES.length)];
    for (let i = 0; i < 7; i++) s += Math.floor(r() * 10);
    return s;
  }

  /* زمان ثبت: بیشتر ثبت‌ها نزدیک به امروز، چندتایی هم همین امروز */
  function makeTime(r, now, maxDays, todayShare) {
    if (r() < todayShare) return now - Math.floor(r() * 9 * HOUR) - 4 * MIN;
    const d = Math.pow(r(), 1.6) * maxDays;
    return now - Math.floor(d * DAY) - Math.floor(r() * 10 * HOUR) - DAY * 0.4;
  }

  function base(now) {
    return {
      v: 3,
      business: { name: 'کافه‌قنادی نارنج', owner: 'مدیر' },
      branches: [{ id: 'b1', name: 'اصلی', color: 'blue', createdAt: now - 400 * DAY }],
      sections: [],
      devices: [],
      customers: [],
      regs: [],
      manualTags: [{ id: 'm1', name: 'مشتری وفادار' }, { id: 'm2', name: 'همکار سازمانی' }],
      seq: 100,
      ui: { coach: null, highlight: null, onboarded: false }
    };
  }

  function addCustomers(state, r, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const id = 'c' + (state.customers.length + 1);
      const c = { id, phone: makePhone(r), manual: [] };
      if (r() < 0.12) c.manual.push('m1');
      if (r() < 0.04) c.manual.push('m2');
      state.customers.push(c);
      out.push(c);
    }
    return out;
  }

  function register(state, customers, device, r, now, maxDays, todayShare) {
    customers.forEach((c) => {
      state.regs.push({
        c: c.id,
        d: device.id,
        b: device.branchId,
        s: device.sectionId || null,
        t: makeTime(r, now, maxDays, todayShare)
      });
    });
  }

  function device(id, code, name, branchId, sectionId, addedDaysAgo, now, extra) {
    return Object.assign({
      id,
      code,
      model: 'دایرکت ۳',
      name,
      branchId,
      sectionId: sectionId || null,
      addedAt: now - addedDaysAgo * DAY,
      lastSeenAt: now - Math.floor(2 + Math.random() * 6) * MIN,
      status: 'online',
      history: [{ t: now - addedDaysAgo * DAY, type: 'added', name }]
    }, extra || {});
  }

  const builders = {
    /* سناریو ۱: کسب‌وکار تک‌شعبه، هنوز دستگاهی ندارد */
    empty(now) {
      return base(now);
    },

    /* سناریو ۲: تک‌شعبه با یک دستگاه */
    single(now) {
      const s = base(now);
      s.ui.onboarded = true;
      const r = rng(7);
      const d1 = device('d1', '48217730', 'صندوق', 'b1', null, 72, now);
      s.devices.push(d1);
      register(s, addCustomers(s, r, 186), d1, r, now, 70, 0.05);
      return s;
    },

    /* سناریو ۳ تا ۵: دو شعبه — ونک (قنادی + کافه) و تجریش (یک دستگاه) */
    multi(now) {
      const s = base(now);
      s.ui.onboarded = true;
      const r = rng(42);
      s.branches = [
        { id: 'b1', name: 'ونک', color: 'blue', createdAt: now - 400 * DAY },
        { id: 'b2', name: 'تجریش', color: 'purple', createdAt: now - 120 * DAY }
      ];
      s.sections = [
        { id: 's1', name: 'قنادی', color: 'orange' },
        { id: 's2', name: 'کافه', color: 'pink' }
      ];
      const d1 = device('d1', '48217730', 'صندوق قنادی', 'b1', 's1', 140, now);
      const d2 = device('d2', '51936024', 'صندوق کافه', 'b1', 's2', 96, now, {
        history: [
          { t: now - 96 * DAY, type: 'added', name: 'دستگاه ۲' },
          { t: now - 95 * DAY, type: 'rename', from: 'دستگاه ۲', to: 'صندوق کافه' },
          { t: now - 95 * DAY + 5 * MIN, type: 'section', fromId: null, toId: 's2', fromName: null, toName: 'کافه', mode: 'retro', count: 3 }
        ]
      });
      const d3 = device('d3', '73048815', 'پیشخوان', 'b2', 's1', 118, now, {
        status: 'offline',
        lastSeenAt: now - 3 * HOUR - 12 * MIN
      });
      s.devices.push(d1, d2, d3);

      const bakery = addCustomers(s, r, 150);
      const cafe = addCustomers(s, r, 88);
      const tajrish = addCustomers(s, r, 86);
      register(s, bakery, d1, r, now, 138, 0.045);
      register(s, cafe.concat(bakery.slice(0, 22)), d2, r, now, 94, 0.06);
      register(s, tajrish.concat(bakery.slice(30, 39)), d3, r, now, 116, 0);
      return s;
    }
  };

  window.SEED = {
    build(name) {
      const now = Date.now();
      const s = (builders[name] || builders.empty)(now);
      s.ui.scenarioBase = name;
      s.seq = 100;
      return s;
    },
    makePhone() {
      return makePhone(Math.random);
    }
  };
})();
