/**
 * LotoAI Pro — Lớp kiếm tiền (Monetization)
 *
 * Mô hình:
 *  - 7 ngày đầu: dùng thử miễn phí toàn bộ tính năng.
 *  - Sau 7 ngày: chỉ còn "Xem KQXS" miễn phí. Các tính năng soi cầu bị khóa. Mở khóa bằng:
 *      (A) Xem 1 quảng cáo thưởng (AdMob Rewarded)  -> mở đến hết ngày hôm nay (giờ VN)
 *      (B) Đăng ký gói VIP (Google Play Billing)      -> mở theo thời hạn gói, tắt quảng cáo
 *
 * Lưu ý quan trọng:
 *  - Thanh toán và quảng cáo thật chỉ chạy trong app Android đã đóng gói (Capacitor) và đã nối
 *    plugin. Xem HUONG_DAN_KIEM_TIEN.md. Trên web thường, nút mua/quảng cáo KHÔNG hoạt động
 *    (tránh việc ai đó vào web để nhận VIP miễn phí).
 *  - Chế độ mô phỏng chỉ bật khi mở http://localhost:PORT/?dev=1 (không bật trong app đã đóng gói).
 *  - Dữ liệu dùng thử lưu trên máy người dùng nên có thể bị xóa dữ liệu app để làm mới.
 *    Muốn chặt hơn, dùng "free trial" ngay trong gói đăng ký của Google Play.
 */
(function (global) {
  'use strict';

  var HOUR = 3600000;
  var DAY = 24 * HOUR;
  var VN_OFFSET = 7 * HOUR;

  var CONFIG = {
    TRIAL_DAYS: 7,
    // true: sau trial vẫn cho xem quảng cáo để mở khóa theo ngày. false: bắt buộc đăng ký VIP.
    ALLOW_AD_PASS_AFTER_TRIAL: true,
    STORAGE_KEY: 'LOTO_AI_MONETIZATION_V1',
    STORE_URL: '', // dán link CH Play khi app được xuất bản
    PLANS: [
      { id: 'vip_monthly', name: 'VIP 1 tháng', price: 39000, days: 30, tag: '' },
      { id: 'vip_quarterly', name: 'VIP 3 tháng', price: 99000, days: 90, tag: 'Tiết kiệm 15%', best: true },
      { id: 'vip_yearly', name: 'VIP 1 năm', price: 299000, days: 365, tag: 'Tiết kiệm 36%' }
    ],
    ADMOB: {
      // ID TEST chính thức của Google. Thay bằng ID thật trong AdMob trước khi phát hành.
      bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
      rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
      isTesting: true
    }
  };

  var state = { trialStart: 0, vip: null, adPassUntil: 0, lastSeen: 0 };
  var nowFn = function () { return Date.now(); };
  var memoryRaw = null;
  var changeHandler = null;
  var lastTier = null;
  var timerId = null;

  // ---------- Môi trường ----------
  function isNative() {
    try {
      return !!(global.Capacitor && typeof global.Capacitor.isNativePlatform === 'function' && global.Capacitor.isNativePlatform());
    } catch (_) { return false; }
  }

  function isDev() {
    try {
      if (isNative()) return false;
      var host = global.location && global.location.hostname;
      var search = (global.location && global.location.search) || '';
      return (host === 'localhost' || host === '127.0.0.1') && /[?&]dev=1(&|$)/.test(search);
    } catch (_) { return false; }
  }

  function canTransact() { return isNative() || isDev(); }

  // ---------- Lưu trữ ----------
  function loadState() {
    var raw = null;
    try { raw = global.localStorage ? global.localStorage.getItem(CONFIG.STORAGE_KEY) : null; } catch (_) {}
    if (!raw) raw = memoryRaw;
    if (!raw) return null;
    try {
      var o = JSON.parse(raw);
      return {
        trialStart: Number(o.trialStart) || 0,
        vip: (o.vip && o.vip.expiresAt) ? { planId: String(o.vip.planId || ''), expiresAt: Number(o.vip.expiresAt) } : null,
        adPassUntil: Number(o.adPassUntil) || 0,
        lastSeen: Number(o.lastSeen) || 0
      };
    } catch (_) { return null; }
  }

  function saveState() {
    var raw = JSON.stringify(state);
    memoryRaw = raw;
    try { if (global.localStorage) global.localStorage.setItem(CONFIG.STORAGE_KEY, raw); } catch (_) {}
  }

  // Thời gian hiệu lực không bao giờ lùi: chống chỉnh đồng hồ máy về quá khứ để kéo dài dùng thử.
  function nowMs() {
    var n = nowFn();
    if (n > state.lastSeen) state.lastSeen = n;
    return state.lastSeen;
  }

  function initState() {
    state = loadState() || { trialStart: 0, vip: null, adPassUntil: 0, lastSeen: 0 };
    var now = nowMs();
    if (!state.trialStart || state.trialStart > now) state.trialStart = now;
    saveState();
  }

  function endOfTodayVN(now) {
    var vn = now + VN_OFFSET;
    var dayStart = Math.floor(vn / DAY) * DAY;
    return dayStart + DAY - VN_OFFSET;
  }

  // ---------- Trạng thái quyền ----------
  function getStatus() {
    var now = nowMs();
    var trialEnd = state.trialStart + CONFIG.TRIAL_DAYS * DAY;
    if (state.vip && state.vip.expiresAt > now) {
      return { tier: 'vip', canUse: true, msLeft: state.vip.expiresAt - now, planId: state.vip.planId };
    }
    if (now < trialEnd) {
      return { tier: 'trial', canUse: true, msLeft: trialEnd - now, elapsedRatio: (now - state.trialStart) / (CONFIG.TRIAL_DAYS * DAY) };
    }
    if (CONFIG.ALLOW_AD_PASS_AFTER_TRIAL && state.adPassUntil > now) {
      return { tier: 'adpass', canUse: true, msLeft: state.adPassUntil - now };
    }
    return { tier: 'locked', canUse: false, msLeft: 0 };
  }

  function canUsePremium() { return getStatus().canUse; }

  function grantVip(planId, expiresAtOverride) {
    var plan = null;
    for (var i = 0; i < CONFIG.PLANS.length; i++) if (CONFIG.PLANS[i].id === planId) plan = CONFIG.PLANS[i];
    if (!plan) return false;
    var now = nowMs();
    var base = (state.vip && state.vip.expiresAt > now) ? state.vip.expiresAt : now;
    state.vip = { planId: planId, expiresAt: expiresAtOverride || (base + plan.days * DAY) };
    saveState();
    return true;
  }

  function grantAdPass() {
    state.adPassUntil = endOfTodayVN(nowMs());
    saveState();
  }

  // ---------- Định dạng ----------
  function fmtMoney(v) { return Number(v).toLocaleString('vi-VN') + 'đ'; }

  function fmtLeft(ms) {
    var d = Math.floor(ms / DAY);
    var h = Math.floor((ms % DAY) / HOUR);
    var m = Math.floor((ms % HOUR) / 60000);
    if (d > 0) return d + ' ngày ' + h + ' giờ';
    if (h > 0) return h + ' giờ ' + m + ' phút';
    return Math.max(1, m) + ' phút';
  }

  function hasDom() { return typeof document !== 'undefined' && !!document.body; }
  function byId(id) { return document.getElementById(id); }

  function toast(msg) {
    if (!hasDom()) return;
    var el = document.createElement('div');
    el.className = 'fixed left-1/2 -translate-x-1/2 bottom-20 z-[100] px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm font-semibold shadow-2xl max-w-[90vw] text-center';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
  }

  // ---------- Quảng cáo ----------
  var Ads = {
    _inited: false,
    _bannerOn: false,
    _wantedBanner: false,
    plugin: function () {
      return global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.AdMob;
    },
    ensureInit: function (AdMob) {
      if (Ads._inited) return Promise.resolve();
      return Promise.resolve(AdMob.initialize({})).then(function () { Ads._inited = true; });
    },
    syncBanner: function (show) {
      Ads._wantedBanner = !!show;
      if (isNative()) {
        var AdMob = Ads.plugin();
        if (!AdMob) return;
        Ads.ensureInit(AdMob).then(function () {
          if (Ads._wantedBanner && !Ads._bannerOn) {
            Ads._bannerOn = true;
            return AdMob.showBanner({ adId: CONFIG.ADMOB.bannerAdUnitId, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: CONFIG.ADMOB.isTesting }).then(function () {
              // Nếu vừa kích hoạt VIP trong lúc banner đang tải thì gỡ ngay
              if (!Ads._wantedBanner && Ads._bannerOn) {
                Ads._bannerOn = false;
                return AdMob.removeBanner();
              }
            });
          }
          if (!Ads._wantedBanner && Ads._bannerOn) {
            Ads._bannerOn = false;
            return AdMob.removeBanner();
          }
        }).catch(function (e) { console.warn('AdMob banner lỗi:', e); });
      } else if (isDev() && hasDom()) {
        var slot = byId('monetization-dev-banner');
        if (show && !slot) {
          slot = document.createElement('div');
          slot.id = 'monetization-dev-banner';
          slot.className = 'fixed bottom-0 left-0 right-0 z-40 h-12 flex items-center justify-center bg-slate-700/95 text-slate-200 text-xs font-mono border-t border-slate-500';
          slot.textContent = '📢 [DEV] Khu vực banner AdMob (chỉ hiện với người chưa là VIP)';
          document.body.appendChild(slot);
        } else if (!show && slot && slot.parentNode) {
          slot.parentNode.removeChild(slot);
        }
      }
    },
    showRewarded: function () {
      if (getStatus().tier === 'vip') return Promise.resolve(true);
      if (isNative()) {
        var AdMob = Ads.plugin();
        if (!AdMob) return Promise.reject(new Error('NO_ADS'));
        return Ads.ensureInit(AdMob).then(function () {
          return AdMob.prepareRewardVideoAd({ adId: CONFIG.ADMOB.rewardedAdUnitId, isTesting: CONFIG.ADMOB.isTesting });
        }).then(function () {
          return AdMob.showRewardVideoAd();
        }).then(function (reward) { return !!reward; });
      }
      if (isDev()) return simulateRewarded();
      return Promise.reject(new Error('NO_ADS'));
    }
  };

  function simulateRewarded() {
    return new Promise(function (resolve) {
      var secs = 5;
      var ov = document.createElement('div');
      ov.className = 'fixed inset-0 z-[120] bg-black/90 flex flex-col items-center justify-center gap-3 text-white';
      ov.innerHTML = '<div class="text-xs font-mono text-amber-300">[DEV] Mô phỏng quảng cáo video thưởng</div>' +
        '<div class="text-5xl font-extrabold font-mono" id="sim-ad-count">' + secs + '</div>' +
        '<div class="text-sm text-slate-300">Xem hết để nhận thưởng</div>';
      document.body.appendChild(ov);
      var iv = setInterval(function () {
        secs--;
        var c = byId('sim-ad-count');
        if (c) c.textContent = String(secs);
        if (secs <= 0) {
          clearInterval(iv);
          if (ov.parentNode) ov.parentNode.removeChild(ov);
          resolve(true);
        }
      }, 1000);
    });
  }

  // ---------- Thanh toán ----------
  // Cầu nối thanh toán: app Android cần cung cấp window.LotoBillingBridge = { purchase(planId), restore() }
  // purchase -> Promise<{ success: boolean, expiresAt?: number(ms) }>  (xem HUONG_DAN_KIEM_TIEN.md)
  var Billing = {
    bridge: function () {
      var b = global.LotoBillingBridge;
      return (b && typeof b.purchase === 'function') ? b : null;
    },
    purchase: function (planId) {
      var b = Billing.bridge();
      if (b) {
        return Promise.resolve(b.purchase(planId)).then(function (r) {
          return (r && r.success) ? { expiresAt: r.expiresAt || 0 } : null;
        });
      }
      if (isDev()) return Promise.resolve({ expiresAt: 0 }); // mô phỏng: dùng thời hạn gói
      return Promise.reject(new Error('NO_BILLING'));
    },
    restore: function () {
      var b = global.LotoBillingBridge;
      if (b && typeof b.restore === 'function') return Promise.resolve(b.restore());
      return Promise.reject(new Error('NO_BILLING'));
    }
  };

  function buyPlan(planId) {
    return Billing.purchase(planId).then(function (res) {
      if (!res) { toast('Giao dịch chưa hoàn tất.'); return false; }
      grantVip(planId, res.expiresAt || 0);
      closePaywall();
      toast('👑 Đã kích hoạt VIP. Cảm ơn bạn!');
      emitChange();
      return true;
    }).catch(function () {
      toast('Gói VIP chỉ đăng ký được trong ứng dụng LotoAI Pro trên CH Play.');
      return false;
    });
  }

  function watchAdForPass() {
    if (getStatus().tier === 'vip') return Promise.resolve(true);
    if (!CONFIG.ALLOW_AD_PASS_AFTER_TRIAL) return Promise.resolve(false);
    return Ads.showRewarded().then(function (ok) {
      if (ok) {
        grantAdPass();
        closePaywall();
        toast('🎬 Đã mở khóa tất cả tính năng đến hết hôm nay!');
        emitChange();
        return true;
      }
      toast('Bạn cần xem hết quảng cáo để mở khóa.');
      return false;
    }).catch(function () {
      toast('Chưa phát được quảng cáo. Thử lại sau hoặc đăng ký VIP.');
      return false;
    });
  }

  function restorePurchases() {
    return Billing.restore().then(function () {
      toast('Đã gửi yêu cầu khôi phục giao dịch.');
    }).catch(function () {
      toast('Khôi phục giao dịch chỉ khả dụng trong ứng dụng trên CH Play.');
    });
  }

  // ---------- Giao diện ----------
  function adButtonHtml(extraClass) {
    if (getStatus().tier === 'vip') return '';
    if (!(CONFIG.ALLOW_AD_PASS_AFTER_TRIAL && canTransact())) return '';
    return '<button onclick="Monetization.watchAdForPass()" class="' + (extraClass || '') + ' px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg transition">🎬 Xem 1 quảng cáo → mở khóa đến hết hôm nay</button>';
  }

  function vipButtonHtml() {
    var min = CONFIG.PLANS[0];
    return '<button onclick="Monetization.openPaywall()" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg transition">👑 Đăng ký VIP từ ' + fmtMoney(min.price) + '/tháng</button>';
  }

  function storeNoteHtml() {
    if (canTransact()) return '';
    var link = CONFIG.STORE_URL ? ' <a href="' + CONFIG.STORE_URL + '" class="text-blue-400 underline">Tải app trên CH Play</a>' : '';
    return '<p class="text-xs text-slate-400">Đăng ký VIP và xem quảng cáo mở khóa khả dụng trong ứng dụng Android LotoAI Pro.' + link + '</p>';
  }

  var FEATURES = [
    '❤️ Số Bạn Kết: chấm % nổ cho số bạn chọn',
    '🎯 Bạch thủ, ⚖️ Song thủ, 🔢 Dàn số, 🔗 Xiên',
    '✅ Kiểm chứng + 👑 gợi ý bộ thuật toán đang nổ nhiều nhất',
    '🚀 6 bộ thuật toán tổng và chi tiết 10 thuật toán'
  ];

  function renderLockedPanel() {
    return '<div class="p-6 sm:p-8 text-center space-y-4">' +
      '<div class="text-4xl">🔒</div>' +
      '<div class="font-extrabold text-lg text-white">Bạn đã hết ' + CONFIG.TRIAL_DAYS + ' ngày dùng thử miễn phí</div>' +
      '<p class="text-sm text-slate-300">Xem KQXS vẫn miễn phí. Các tính năng dưới đây dành cho thành viên:</p>' +
      '<ul class="inline-block text-left text-sm text-slate-200 space-y-1">' + FEATURES.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>' +
      '<div class="flex flex-col sm:flex-row items-center justify-center gap-2.5">' + vipButtonHtml() + adButtonHtml('') + '</div>' +
      storeNoteHtml() +
      '</div>';
  }

  function renderLockedCard() {
    return '<div class="flex flex-wrap items-center justify-between gap-3">' +
      '<div><div class="font-bold text-sm text-white">🔒 Chi tiết 10 thuật toán dành cho thành viên</div>' +
      '<div class="text-xs text-slate-400">Mở khóa để xem điểm từng thuật toán cho mọi con số.</div></div>' +
      '<button onclick="Monetization.openPaywall()" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs">👑 Mở khóa</button>' +
      '</div>';
  }

  function renderLockBanner() {
    return '<div class="flex items-center justify-between gap-2">' +
      '<div class="flex items-center gap-1.5"><span class="px-2 py-0.5 rounded-md bg-slate-700 text-white font-extrabold text-xs">🔒 VIP</span>' +
      '<span class="font-bold text-slate-200">Bộ thuật toán đang nổ nhiều nhất hôm nay</span></div>' +
      '<button onclick="Monetization.openPaywall()" class="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shrink-0 transition">Mở khóa</button>' +
      '</div>';
  }

  function openPaywall() {
    if (!hasDom()) return;
    closePaywall();
    var st = getStatus();
    var plans = CONFIG.PLANS.map(function (p) {
      var perMonth = fmtMoney(Math.round(p.price / p.days * 30));
      return '<button onclick="Monetization.buyPlan(\'' + p.id + '\')" class="relative p-4 rounded-2xl border-2 text-left transition hover:-translate-y-0.5 ' + (p.best ? 'border-emerald-400 bg-emerald-950/60' : 'border-slate-700 bg-slate-950') + '">' +
        (p.tag ? '<span class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold">' + p.tag + '</span>' : '') +
        '<div class="font-extrabold text-white">' + p.name + '</div>' +
        '<div class="text-2xl font-extrabold text-emerald-400 font-mono">' + fmtMoney(p.price) + '</div>' +
        '<div class="text-xs text-slate-400">≈ ' + perMonth + '/tháng</div></button>';
    }).join('');

    var statusLine = st.tier === 'trial'
      ? 'Bạn đang dùng thử miễn phí, còn <b>' + fmtLeft(st.msLeft) + '</b>.'
      : (st.tier === 'locked' ? 'Đã hết thời gian dùng thử miễn phí.' : 'Bạn đang có quyền truy cập.');

    var wrap = document.createElement('div');
    wrap.id = 'monetization-paywall';
    wrap.className = 'fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
    wrap.onclick = function (e) { if (e.target === wrap) closePaywall(); };
    wrap.innerHTML =
      '<div class="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border-2 border-emerald-500/60 p-5 space-y-4 shadow-2xl">' +
      '<div class="flex items-start justify-between gap-3"><div>' +
      '<div class="text-xl font-extrabold text-white">👑 Nâng cấp LotoAI Pro VIP</div>' +
      '<div class="text-xs text-slate-300 mt-0.5">' + statusLine + '</div></div>' +
      '<button onclick="Monetization.closePaywall()" class="text-slate-400 hover:text-white text-lg">✕</button></div>' +
      '<ul class="text-sm text-slate-200 space-y-1">' + FEATURES.concat(['🚫 Không quảng cáo']).map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>' +
      '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">' + plans + '</div>' +
      (adButtonHtml('w-full') ? '<div class="pt-1">' + adButtonHtml('w-full') + '</div>' : '') +
      storeNoteHtml() +
      '<div class="flex items-center justify-between text-xs text-slate-400 pt-1">' +
      '<button onclick="Monetization.restorePurchases()" class="underline hover:text-slate-200">Khôi phục giao dịch</button>' +
      '<span>Hủy bất cứ lúc nào trong Google Play</span></div>' +
      (isDev() ? '<div class="text-xs text-amber-300 font-mono">[DEV] Thanh toán đang được mô phỏng.</div>' : '') +
      '</div>';
    document.body.appendChild(wrap);
  }

  function closePaywall() {
    if (!hasDom()) return;
    var el = byId('monetization-paywall');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function refreshStatusBar() {
    if (!hasDom()) return;
    var el = byId('monetization-bar');
    if (!el) return;
    var st = getStatus();
    var html = '';
    if (st.tier === 'trial') {
      var pct = Math.min(100, Math.round(st.elapsedRatio * 100));
      html = '<div class="p-3 rounded-2xl border border-emerald-500/50 bg-gradient-to-r from-emerald-950/80 to-slate-900 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">' +
        '<div class="space-y-1 flex-1 min-w-[220px]"><div>🎁 <b>Dùng thử miễn phí</b> toàn bộ tính năng, còn <b class="text-emerald-300">' + fmtLeft(st.msLeft) + '</b></div>' +
        '<div class="h-1.5 rounded-full bg-slate-800 overflow-hidden"><div class="h-full bg-emerald-400" style="width:' + pct + '%"></div></div></div>' +
        '<button onclick="Monetization.openPaywall()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-bold text-emerald-300">👑 Lên VIP (Không QC)</button></div>';
    } else if (st.tier === 'vip') {
      html = '<div class="p-3 rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-950/60 to-slate-900 text-xs sm:text-sm">👑 <b>Thành viên VIP</b>, còn <b class="text-amber-300">' + fmtLeft(st.msLeft) + '</b>. Đã tắt toàn bộ quảng cáo.</div>';
    } else if (st.tier === 'adpass') {
      html = '<div class="p-3 rounded-2xl border border-amber-500/50 bg-slate-900 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">' +
        '<div>🎬 Đã mở khóa bằng quảng cáo, còn <b class="text-amber-300">' + fmtLeft(st.msLeft) + '</b> (đến hết hôm nay)</div>' +
        '<button onclick="Monetization.openPaywall()" class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">👑 Nâng cấp VIP, không quảng cáo</button></div>';
    } else {
      html = '<div class="p-3 rounded-2xl border border-rose-500/50 bg-gradient-to-r from-rose-950/60 to-slate-900 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">' +
        '<div>🔒 <b>Đã hết dùng thử.</b> Chỉ còn Xem KQXS miễn phí.</div>' +
        '<div class="flex gap-2">' + adButtonHtml('!py-1.5 !px-3 !text-xs') + '<button onclick="Monetization.openPaywall()" class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs">👑 Đăng ký VIP</button></div></div>';
    }
    el.innerHTML = html;
  }

  function emitChange() {
    lastTier = getStatus().tier;
    saveState();
    refreshStatusBar();
    Ads.syncBanner(lastTier !== 'vip');
    if (changeHandler) { try { changeHandler(getStatus()); } catch (e) { console.warn(e); } }
  }

  function tick() {
    saveState();
    var tier = getStatus().tier;
    if (tier !== lastTier) emitChange(); else refreshStatusBar();
  }

  // ---------- Công cụ dev (chỉ localhost + ?dev=1) ----------
  var dev = {
    expireTrial: function () {
      state.trialStart = nowMs() - (CONFIG.TRIAL_DAYS * DAY + 1000);
      state.vip = null; state.adPassUntil = 0;
      emitChange();
    },
    setTrialDaysLeft: function (n) {
      state.trialStart = nowMs() - (CONFIG.TRIAL_DAYS - n) * DAY;
      state.vip = null; state.adPassUntil = 0;
      emitChange();
    },
    reset: function () {
      state.trialStart = nowMs();
      state.vip = null; state.adPassUntil = 0;
      emitChange();
    }
  };

  function mountDevPanel() {
    if (!isDev() || !hasDom() || byId('monetization-dev-panel')) return;
    var p = document.createElement('div');
    p.id = 'monetization-dev-panel';
    p.className = 'fixed left-2 bottom-14 z-[95] p-2 rounded-xl bg-slate-900/95 border border-amber-500/60 text-xs space-y-1 shadow-xl';
    p.innerHTML = '<div class="font-mono text-amber-300">[DEV] Giả lập</div>' +
      '<div class="flex flex-wrap gap-1 max-w-[260px]">' +
      '<button onclick="Monetization.dev.reset()" class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Ngày 1</button>' +
      '<button onclick="Monetization.dev.setTrialDaysLeft(1)" class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Còn 1 ngày</button>' +
      '<button onclick="Monetization.dev.expireTrial()" class="px-2 py-1 rounded bg-rose-700 hover:bg-rose-600">Hết trial</button></div>';
    document.body.appendChild(p);
  }

  function init(opts) {
    changeHandler = (opts && opts.onChange) || null;
    initState();
    if (hasDom()) {
      mountDevPanel();
      emitChange();
      if (timerId) clearInterval(timerId);
      timerId = setInterval(tick, 30000);
    }
  }

  var api = {
    CONFIG: CONFIG,
    init: init,
    getStatus: getStatus,
    canUsePremium: canUsePremium,
    openPaywall: openPaywall,
    closePaywall: closePaywall,
    buyPlan: buyPlan,
    watchAdForPass: watchAdForPass,
    restorePurchases: restorePurchases,
    renderLockedPanel: renderLockedPanel,
    renderLockedCard: renderLockedCard,
    renderLockBanner: renderLockBanner,
    refreshStatusBar: refreshStatusBar,
    dev: dev,
    __test: {
      setNow: function (fn) { nowFn = fn; },
      initState: initState,
      reset: function () { state = { trialStart: 0, vip: null, adPassUntil: 0, lastSeen: 0 }; memoryRaw = null; },
      grantVip: grantVip,
      grantAdPass: grantAdPass,
      endOfTodayVN: endOfTodayVN,
      getState: function () { return JSON.parse(JSON.stringify(state)); }
    }
  };

  global.Monetization = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
