/**
 * LotoAI Pro - 100% Real-Data XSMB & Deterministic 10-Algorithm Statistical Engine
 * - Chỉ hỗ trợ Xổ Số Miền Bắc (XSMB), sử dụng 100% kết quả quay thưởng thật từ Internet.
 * - Không bao giờ tự tạo hoặc bịa kết quả giả nếu chưa có KQXS thật.
 * - Tuyệt đối không dùng Math.random(): cùng kỳ KQXS + cùng bộ % => kết quả giống nhau 100%.
 */

(function (global) {
  'use strict';

  const LIVE_ENDPOINTS = {
    xsmb_json: 'https://raw.githubusercontent.com/khiemdoan/vietnam-lottery-xsmb-analysis/refs/heads/main/data/xsmb.json',
    xsmb_today: 'https://api-xsmb-today.onrender.com/api/v1',
    xsmb_rss: 'https://xskt.com.vn/rss-feed/mien-bac-xsmb.rss',
    local_rss_proxy: '/api/xsmb-rss'
  };

  const REAL_CACHE_KEY = 'LOTO_AI_REAL_XSMB_V2';
  const LEGACY_CACHE_KEYS = [
    'LOTO_AI_LIVE_CACHE_xsmb',
    'LOTO_AI_LIVE_CACHE_xsmn',
    'LOTO_AI_LIVE_CACHE_xsmt'
  ];

  // Cấu trúc 27 giải chuẩn XSMB
  const XSMB_PRIZE_SPEC = [
    { key: 'G0', count: 1, digits: 5 },
    { key: 'G1', count: 1, digits: 5 },
    { key: 'G2', count: 2, digits: 5 },
    { key: 'G3', count: 6, digits: 5 },
    { key: 'G4', count: 4, digits: 4 },
    { key: 'G5', count: 6, digits: 4 },
    { key: 'G6', count: 3, digits: 3 },
    { key: 'G7', count: 4, digits: 2 }
  ];

  function pad2(n) {
    const v = parseInt(n, 10) || 0;
    return v < 10 ? '0' + v : '' + (v % 100);
  }

  function reverse2(str2) {
    const s = String(str2).padStart(2, '0');
    return s[1] + s[0];
  }

  function bongDuongDigit(d) {
    return (d + 5) % 10;
  }

  const BONG_AM_MAP = { 0: 7, 7: 0, 1: 4, 4: 1, 2: 9, 9: 2, 3: 6, 6: 3, 5: 8, 8: 5 };
  function bongAmDigit(d) {
    return BONG_AM_MAP[d];
  }

  /**
   * Computes exact Vietnam time (GMT+7) and applies the 18:35 daily lottery cutoff rule:
   * - Before 18:35:00 -> Latest draw is Yesterday; AI analyzes for Today (18:35).
   * - At or after 18:35:00 -> Latest expected draw is Today; AI analyzes for Tomorrow (18:35).
   */
  function getVietnamClockInfo(nowDate) {
    const now = nowDate ? new Date(nowDate) : new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const vnNow = new Date(utcMs + 7 * 3600000);

    const yyyy = vnNow.getFullYear();
    const mm = pad2(vnNow.getMonth() + 1);
    const dd = pad2(vnNow.getDate());
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const todayDow = vnNow.getDay();

    const vnYesterday = new Date(vnNow.getTime() - 86400000);
    const yesterdayStr = `${vnYesterday.getFullYear()}-${pad2(vnYesterday.getMonth() + 1)}-${pad2(vnYesterday.getDate())}`;
    const yesterdayDow = vnYesterday.getDay();

    const vnTomorrow = new Date(vnNow.getTime() + 86400000);
    const tomorrowStr = `${vnTomorrow.getFullYear()}-${pad2(vnTomorrow.getMonth() + 1)}-${pad2(vnTomorrow.getDate())}`;

    const hours = vnNow.getHours();
    const minutes = vnNow.getMinutes();
    const seconds = vnNow.getSeconds();
    const timeStr = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;

    const currentSecondsOfDay = hours * 3600 + minutes * 60 + seconds;
    const cutoffSeconds = 18 * 3600 + 35 * 60; // 18:35:00
    const isAfter1835 = currentSecondsOfDay >= cutoffSeconds;

    const secondsUntil1835 = !isAfter1835
      ? cutoffSeconds - currentSecondsOfDay
      : (24 * 3600 - currentSecondsOfDay) + cutoffSeconds;

    const remH = Math.floor(secondsUntil1835 / 3600);
    const remM = Math.floor((secondsUntil1835 % 3600) / 60);
    const remS = secondsUntil1835 % 60;
    const countdownStr = `${pad2(remH)}:${pad2(remM)}:${pad2(remS)}`;

    return {
      year: yyyy,
      todayStr,
      yesterdayStr,
      tomorrowStr,
      todayDow,
      yesterdayDow,
      timeStr,
      isAfter1835,
      expectedLatestDrawDate: isAfter1835 ? todayStr : yesterdayStr,
      predictionTargetDate: isAfter1835 ? tomorrowStr : todayStr,
      secondsUntil1835,
      countdownStr
    };
  }

  // 10 Deterministic Mathematical & Statistical Algorithms
  const ALGORITHMS = [
    {
      id: 'ema',
      code: 'A1',
      short: '1. Tần suất EMA',
      name: 'Tần suất trượt hàm mũ (EMA 10/30/100 kỳ)',
      desc: 'Đo động lượng xuất hiện ngắn hạn và dài hạn với hệ số suy giảm hàm mũ.',
      color: '#3b82f6',
      defaultWeight: 14
    },
    {
      id: 'weibull',
      code: 'A2',
      short: '2. Hồi quy Gan',
      name: 'Hồi quy chu kỳ Lô Gan (Weibull Survival)',
      desc: 'So sánh số ngày vắng mặt hiện tại với chu kỳ rơi trung bình và ngưỡng gan cực đại.',
      color: '#10b981',
      defaultWeight: 12
    },
    {
      id: 'markov',
      code: 'A3',
      short: '3. Chuỗi Markov',
      name: 'Ma trận chuyển trạng thái Markov bậc 1 & 2',
      desc: 'Xác suất có điều kiện P(X_t | X_{t-1}) từ các số vừa nổ kỳ trước sang kỳ tiếp theo.',
      color: '#8b5cf6',
      defaultWeight: 14
    },
    {
      id: 'bridge',
      code: 'A4',
      short: '4. Cầu vị trí',
      name: 'Cầu ghép chữ số ăn thông (Positional Bridge)',
      desc: 'Quét tự động tất cả cặp vị trí chữ số từ Giải ĐB đến Giải 7 chạy thông liên tiếp.',
      color: '#f59e0b',
      defaultWeight: 14
    },
    {
      id: 'apriori',
      code: 'A5',
      short: '5. Bạc nhớ Apriori',
      name: 'Khai phá luật kết hợp Bạc Nhớ (Apriori Lift)',
      desc: 'Tính độ tin cậy (Confidence) của các số hay đi sau Giải ĐB, Giải Nhất và Lô rơi.',
      color: '#ec4899',
      defaultWeight: 12
    },
    {
      id: 'gaussian',
      code: 'A6',
      short: '6. Chuẩn Tổng/Đầu',
      name: 'Phân phối chuẩn Tổng, Đầu/Đuôi & Chẵn/Lẻ',
      desc: 'Cân bằng xác suất theo phân phối chuẩn cho Đầu (0-9), Đuôi (0-9) và Tổng đề.',
      color: '#06b6d4',
      defaultWeight: 8
    },
    {
      id: 'fourier',
      code: 'A7',
      short: '7. Chu kỳ Thứ',
      name: 'Phổ chu kỳ lặp theo Thứ mở thưởng (Fourier)',
      desc: 'Phân tích tần suất nổ theo đúng chu kỳ 7 ngày (cùng Thứ trong tuần) và bội số.',
      color: '#6366f1',
      defaultWeight: 8
    },
    {
      id: 'lstm',
      code: 'A8',
      short: '8. Chuỗi AI Gate',
      name: 'Mạng cổng chú ý chuỗi thời gian (Attention Gate)',
      desc: 'Tổng hợp phi tuyến tính (Tanh/Sigmoid) trên cửa sổ trượt 30 kỳ và số lân cận.',
      color: '#14b8a6',
      defaultWeight: 8
    },
    {
      id: 'chisquare',
      code: 'A9',
      short: '9. Kiểm định Chi²',
      name: 'Kiểm định độ lệch chuẩn Chi-Square (χ²)',
      desc: 'Đo độ lệch thống kê giữa tần suất thực tế và kỳ vọng lý thuyết trên 45 kỳ.',
      color: '#f97316',
      defaultWeight: 5
    },
    {
      id: 'shadow',
      code: 'A10',
      short: '10. Bóng Âm Dương',
      name: 'Ma trận Bóng Âm Dương & Đối xứng Giải ĐB',
      desc: 'Tính tương quan bóng dương (+5 mod 10) và bóng âm từ Giải ĐB & Giải Nhất hôm trước.',
      color: '#eab308',
      defaultWeight: 5
    }
  ];

  /**
   * Validates and normalizes an XSMB prize table (must contain all 27 valid numeric prizes).
   */
  function normalizeXsmbPrizeTable(rawPt) {
    if (!rawPt || typeof rawPt !== 'object') return null;
    const normalized = {};
    for (const spec of XSMB_PRIZE_SPEC) {
      const arr = rawPt[spec.key];
      if (!Array.isArray(arr) || arr.length !== spec.count) return null;
      const cleanArr = [];
      for (const item of arr) {
        if (item === null || item === undefined) return null;
        const s = String(item).trim().replace(/\.0$/, '');
        if (!/^\d+$/.test(s) || s.length > spec.digits) return null;
        cleanArr.push(s.padStart(spec.digits, '0'));
      }
      normalized[spec.key] = cleanArr;
    }
    return normalized;
  }

  function getPrizeSignature(pt) {
    if (!pt || !pt.G0 || !pt.G1 || !pt.G7) return '';
    return `${pt.G0[0]}|${pt.G1[0]}|${pt.G7.join(',')}`;
  }

  /**
   * Builds a rich Draw Record with full 27-prize table, lotoByHead (Đầu 0-9), lotoByTail (Đuôi 0-9),
   * and 32 digitPositions for bridge scanning.
   */
  function enrichDrawRecord(dateCode, rawPrizeTable, sourceLabel) {
    const prizeTable = normalizeXsmbPrizeTable(rawPrizeTable);
    if (!prizeTable) return null;

    const dObj = new Date(dateCode + 'T12:00:00Z');
    const dayOfWeek = isNaN(dObj.getTime()) ? 0 : dObj.getUTCDay();

    const orderedPrizes = [
      ...prizeTable.G0,
      ...prizeTable.G1,
      ...prizeTable.G2,
      ...prizeTable.G3,
      ...prizeTable.G4,
      ...prizeTable.G5,
      ...prizeTable.G6,
      ...prizeTable.G7
    ];

    const lotoNumbers = [];
    const digitPositions = [];

    for (const pStr of orderedPrizes) {
      const last2 = parseInt(pStr.slice(-2), 10);
      lotoNumbers.push(last2);
      for (let i = 0; i < pStr.length; i++) {
        if (digitPositions.length < 36) {
          digitPositions.push(parseInt(pStr[i], 10));
        }
      }
    }

    const lotoByHead = Array.from({ length: 10 }, () => []);
    const lotoByTail = Array.from({ length: 10 }, () => []);
    const hitCounts = new Array(100).fill(0);

    for (const num of lotoNumbers) {
      hitCounts[num]++;
      const h = Math.floor(num / 10);
      const t = num % 10;
      lotoByHead[h].push(pad2(num));
      lotoByTail[t].push(pad2(num));
    }

    for (let i = 0; i < 10; i++) {
      lotoByHead[i].sort();
      lotoByTail[i].sort();
    }

    const sp = prizeTable.G0[0];
    const fp = prizeTable.G1[0];

    return {
      date: dateCode,
      dayOfWeek,
      source: sourceLabel || 'Dữ liệu XSMB thật',
      specialPrize: sp,
      firstPrize: fp,
      special2: parseInt(sp.slice(-2), 10),
      first2: parseInt(fp.slice(-2), 10),
      prizeTable,
      prizes: orderedPrizes,
      lotoNumbers,
      lotoByHead,
      lotoByTail,
      hitCounts,
      digitPositions: digitPositions.slice(0, 32)
    };
  }

  /**
   * Parses a real historical row from khiemdoan/vietnam-lottery-xsmb-analysis/data/xsmb.json
   */
  function parseGithubXsmbRow(row) {
    if (!row || !row.date) return null;
    const rawDate = String(row.date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return null;

    const rawPt = {
      G0: [row.special],
      G1: [row.prize1],
      G2: [row.prize2_1, row.prize2_2],
      G3: [row.prize3_1, row.prize3_2, row.prize3_3, row.prize3_4, row.prize3_5, row.prize3_6],
      G4: [row.prize4_1, row.prize4_2, row.prize4_3, row.prize4_4],
      G5: [row.prize5_1, row.prize5_2, row.prize5_3, row.prize5_4, row.prize5_5, row.prize5_6],
      G6: [row.prize6_1, row.prize6_2, row.prize6_3],
      G7: [row.prize7_1, row.prize7_2, row.prize7_3, row.prize7_4]
    };

    return enrichDrawRecord(rawDate, rawPt, 'Dữ liệu thật (GitHub XSMB)');
  }

  /**
   * Parses real XSMB RSS XML from xskt.com.vn
   */
  function parseXsktRssXml(xmlText, clockInfo) {
    if (!xmlText || typeof xmlText !== 'string') return [];
    const clock = clockInfo || getVietnamClockInfo();
    const draws = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
      const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
      if (!descMatch) continue;

      let dateCode = '';
      if (linkMatch) {
        const lm = linkMatch[1].match(/ngay-(\d{1,2})-(\d{1,2})-(\d{4})/i);
        if (lm) {
          dateCode = `${lm[3]}-${lm[2].padStart(2, '0')}-${lm[1].padStart(2, '0')}`;
        }
      }
      if (!dateCode && titleMatch) {
        const tm = titleMatch[1].match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
        if (tm) {
          const dd = tm[1].padStart(2, '0');
          const mm = tm[2].padStart(2, '0');
          let yyyy = tm[3] ? parseInt(tm[3], 10) : clock.year;
          if (!tm[3] && clock.todayStr.slice(5, 7) === '01' && mm === '12') {
            yyyy -= 1;
          }
          dateCode = `${yyyy}-${mm}-${dd}`;
        }
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateCode)) continue;

      const desc = descMatch[1]
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/<[^>]+>/g, '\n');

      const grabLine = (labelRegex) => {
        const m = desc.match(labelRegex);
        if (!m) return [];
        return m[1].trim().split(/[\s,-]+/).map(s => s.replace(/\D/g, '')).filter(Boolean);
      };

      const rawPt = {
        G0: grabLine(/(?:^|\n)\s*(?:ĐB|Đặc biệt)\s*:\s*([^\n\r]+)/i),
        G1: grabLine(/(?:^|\n)\s*1\s*:\s*([^\n\r]+)/i),
        G2: grabLine(/(?:^|\n)\s*2\s*:\s*([^\n\r]+)/i),
        G3: grabLine(/(?:^|\n)\s*3\s*:\s*([^\n\r]+)/i),
        G4: grabLine(/(?:^|\n)\s*4\s*:\s*([^\n\r]+)/i),
        G5: grabLine(/(?:^|\n)\s*5\s*:\s*([^\n\r]+)/i),
        G6: grabLine(/(?:^|\n)\s*6\s*:\s*([^\n\r]+)/i),
        G7: grabLine(/(?:^|\n)\s*7\s*:\s*([^\n\r]+)/i)
      };

      const enriched = enrichDrawRecord(dateCode, rawPt, 'Dữ liệu thật (XSKT.com.vn)');
      if (enriched) draws.push(enriched);
    }

    return draws;
  }

  function parseWeekdayFromApiTime(timeVal) {
    const t = String(timeVal || '').trim();
    if (!t) return { dateCode: null, dow: null };

    // Full date dd/mm/yyyy or dd-mm-yyyy
    const dm = t.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dm) {
      return {
        dateCode: `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`,
        dow: null
      };
    }

    const lower = t.toLowerCase();
    if (lower === '2' || lower.includes('hai')) return { dateCode: null, dow: 1 };
    if (lower === '3' || lower.includes('ba')) return { dateCode: null, dow: 2 };
    if (lower === '4' || lower.includes('tư') || lower.includes('tu')) return { dateCode: null, dow: 3 };
    if (lower === '5' || lower.includes('năm') || lower.includes('nam')) return { dateCode: null, dow: 4 };
    if (lower === '6' || lower.includes('sáu') || lower.includes('sau')) return { dateCode: null, dow: 5 };
    if (lower === '7' || lower.includes('bảy') || lower.includes('bay')) return { dateCode: null, dow: 6 };
    if (lower.includes('nhật') || lower.includes('nhat') || lower === 'cn' || lower === '8') return { dateCode: null, dow: 0 };

    return { dateCode: null, dow: null };
  }

  /**
   * Parses live today's XSMB result from api-xsmb-today.onrender.com/api/v1.
   * Only accepts complete 27-prize draws whose date can be strictly verified (never guesses).
   */
  function parseXsmbTodayJson(json, existingDraws, clockInfo) {
    if (!json || !json.results || Number(json.countNumbers) !== 27) return null;
    const res = json.results;
    const rawPt = {
      G0: res['ĐB'] || res.DB || res.G0,
      G1: res.G1,
      G2: res.G2,
      G3: res.G3,
      G4: res.G4,
      G5: res.G5,
      G6: res.G6,
      G7: res.G7
    };
    const pt = normalizeXsmbPrizeTable(rawPt);
    if (!pt) return null;

    // If this exact 27-prize draw is already in existingDraws (e.g. from xsmb.json or xskt), skip
    const sig = getPrizeSignature(pt);
    if (Array.isArray(existingDraws)) {
      for (const ex of existingDraws) {
        if (getPrizeSignature(ex.prizeTable) === sig) {
          return null;
        }
      }
    }

    const clock = clockInfo || getVietnamClockInfo();
    const parsedTime = parseWeekdayFromApiTime(json.time);
    let dateCode = parsedTime.dateCode;

    if (!dateCode && parsedTime.dow !== null) {
      if (parsedTime.dow === clock.todayDow && clock.isAfter1835) {
        dateCode = clock.todayStr;
      } else if (parsedTime.dow === clock.yesterdayDow) {
        dateCode = clock.yesterdayStr;
      }
    }

    if (!dateCode || !/^\d{4}-\d{2}-\d{2}$/.test(dateCode)) return null;
    return enrichDrawRecord(dateCode, pt, 'Dữ liệu thật (API Live 18h35)');
  }

  /**
   * Aligns real draws strictly with the 18:35 Vietnam time cutoff.
   * NEVER fabricates or inserts fake draws if today's result is not available yet!
   */
  function alignDrawsWith1835Cutoff(draws, clockInfo) {
    const clock = clockInfo || getVietnamClockInfo();
    const expectedDate = clock.expectedLatestDrawDate;

    const aligned = (Array.isArray(draws) ? draws : [])
      .filter(d => d && d.date && d.date <= expectedDate)
      .sort((a, b) => (b.date > a.date ? 1 : (b.date < a.date ? -1 : 0)))
      .slice(0, 100);

    const latestDate = aligned.length > 0 ? aligned[0].date : null;
    const hasTodayResult = latestDate === clock.todayStr;
    const waitingForTodayDraw = clock.isAfter1835 && !hasTodayResult;

    return {
      draws: aligned,
      clock,
      hasTodayResult,
      waitingForTodayDraw
    };
  }

  function isCapacitorNative() {
    try {
      return !!(global.Capacitor && typeof global.Capacitor.isNativePlatform === 'function' && global.Capacitor.isNativePlatform());
    } catch (_) {
      return false;
    }
  }

  function isLocalhostBrowser() {
    try {
      if (isCapacitorNative() || !global.location) return false;
      const h = global.location.hostname;
      return (global.location.protocol === 'http:' || global.location.protocol === 'https:') &&
        (h === 'localhost' || h === '127.0.0.1');
    } catch (_) {
      return false;
    }
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs || 12000) : null;
    try {
      const res = await fetch(url, {
        ...(options || {}),
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
      return res;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function fetchXsktRssText() {
    // 1. Native Capacitor Android/iOS HTTP (no CORS)
    if (isCapacitorNative() && global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.CapacitorHttp) {
      const resp = await global.Capacitor.Plugins.CapacitorHttp.get({ url: LIVE_ENDPOINTS.xsmb_rss });
      if (resp && resp.status >= 200 && resp.status < 300 && typeof resp.data === 'string') {
        return resp.data;
      }
      throw new Error('CapacitorHttp XSKT failed');
    }
    // 2. Local development server proxy (/api/xsmb-rss)
    if (isLocalhostBrowser()) {
      const res = await fetchWithTimeout(LIVE_ENDPOINTS.local_rss_proxy, {}, 10000);
      if (!res.ok) throw new Error('Local RSS proxy error ' + res.status);
      return await res.text();
    }
    // 3. Node.js environment (for tests)
    if (typeof window === 'undefined' && typeof fetch === 'function') {
      const res = await fetchWithTimeout(LIVE_ENDPOINTS.xsmb_rss, {}, 10000);
      if (!res.ok) throw new Error('Direct RSS error ' + res.status);
      return await res.text();
    }
    return null;
  }

  function purgeLegacyFakeCaches() {
    try {
      if (!global.localStorage) return;
      for (const k of LEGACY_CACHE_KEYS) {
        global.localStorage.removeItem(k);
      }
    } catch (_) {}
  }

  function loadCachedRealDraws(clockInfo) {
    purgeLegacyFakeCaches();
    try {
      if (!global.localStorage) return null;
      const raw = global.localStorage.getItem(REAL_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return null;

      const validDraws = [];
      for (const item of parsed) {
        if (item && item.date && item.prizeTable) {
          const rebuilt = enrichDrawRecord(item.date, item.prizeTable, item.source || 'Bộ nhớ đệm dữ liệu thật');
          if (rebuilt) validDraws.push(rebuilt);
        }
      }
      if (validDraws.length === 0) return null;

      const alignedInfo = alignDrawsWith1835Cutoff(validDraws, clockInfo);
      if (alignedInfo.draws.length === 0) return null;

      return {
        isLive: false,
        fromCache: true,
        ...alignedInfo,
        source: `Bộ nhớ đệm thật • Kỳ ${alignedInfo.draws[0].date}`
      };
    } catch (_) {
      return null;
    }
  }

  /**
   * Fetches 100% REAL XSMB draws from Internet sources:
   * - GitHub Archive (khiemdoan/vietnam-lottery-xsmb-analysis/data/xsmb.json) for 100 real draws
   * - XSKT.com.vn RSS (via local proxy on localhost, CapacitorHttp on native mobile, direct in Node)
   * - API XSMB Today (api-xsmb-today.onrender.com/api/v1) for CORS-enabled live today result
   */
  async function fetchLiveDrawsFromInternet() {
    const clock = getVietnamClockInfo();
    purgeLegacyFakeCaches();
    if (typeof fetch === 'undefined') {
      throw new Error('Môi trường hiện tại không hỗ trợ fetch');
    }

    const [githubResult, rssResult, todayResult] = await Promise.allSettled([
      fetchWithTimeout(LIVE_ENDPOINTS.xsmb_json, {}, 15000).then(async res => {
        if (!res.ok) throw new Error('GitHub XSMB HTTP ' + res.status);
        const text = await res.text();
        let rows;
        try {
          const parsed = JSON.parse(text);
          rows = Array.isArray(parsed) ? parsed : (parsed.data || []);
        } catch (_) {
          rows = text.trim().split('\n').slice(-120).map(line => JSON.parse(line));
        }
        return rows.slice(-110).map(parseGithubXsmbRow).filter(Boolean);
      }),
      fetchXsktRssText().then(xml => (xml ? parseXsktRssXml(xml, clock) : [])),
      fetchWithTimeout(LIVE_ENDPOINTS.xsmb_today, {}, 12000).then(async res => {
        if (!res.ok) throw new Error('API Today HTTP ' + res.status);
        return await res.json();
      })
    ]);

    const byDate = new Map();

    // 1. Add GitHub historical real draws (oldest -> newest so newer/more specific overwrite)
    if (githubResult.status === 'fulfilled' && Array.isArray(githubResult.value)) {
      for (const d of githubResult.value) {
        if (d.date <= clock.expectedLatestDrawDate) {
          byDate.set(d.date, d);
        }
      }
    }

    // 2. Merge XSKT RSS real draws (has exact full date & latest draw right after 18:30)
    if (rssResult.status === 'fulfilled' && Array.isArray(rssResult.value)) {
      for (const d of rssResult.value) {
        if (d.date <= clock.expectedLatestDrawDate) {
          byDate.set(d.date, d);
        }
      }
    }

    // 3. Merge live CORS API-Today draw if complete and not already present
    const existingList = Array.from(byDate.values());
    if (todayResult.status === 'fulfilled' && todayResult.value) {
      const todayDraw = parseXsmbTodayJson(todayResult.value, existingList, clock);
      if (todayDraw && todayDraw.date <= clock.expectedLatestDrawDate && !byDate.has(todayDraw.date)) {
        byDate.set(todayDraw.date, todayDraw);
      }
    }

    const merged = Array.from(byDate.values());
    const alignedInfo = alignDrawsWith1835Cutoff(merged, clock);

    if (alignedInfo.draws.length === 0) {
      throw new Error('Không tải được dữ liệu KQXS Miền Bắc thật từ Internet.');
    }

    try {
      if (global.localStorage) {
        global.localStorage.setItem(REAL_CACHE_KEY, JSON.stringify(alignedInfo.draws));
      }
    } catch (_) {}

    const latestDraw = alignedInfo.draws[0];
    return {
      isLive: true,
      fromCache: false,
      ...alignedInfo,
      source: `${latestDraw.source} • Kỳ ${latestDraw.date}`
    };
  }

  function normalizeScores(rawArray, minOut = 50, maxOut = 98) {
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = 0; i < 100; i++) {
      if (rawArray[i] < minVal) minVal = rawArray[i];
      if (rawArray[i] > maxVal) maxVal = rawArray[i];
    }
    const span = maxVal - minVal || 1;
    const out = new Array(100);
    for (let i = 0; i < 100; i++) {
      const norm = minOut + ((rawArray[i] - minVal) / span) * (maxOut - minOut);
      out[i] = Math.round(norm * 10) / 10;
    }
    return out;
  }

  function evaluateAllNumbers(draws) {
    if (!Array.isArray(draws) || draws.length === 0) return null;
    const N = draws.length;
    const latest = draws[0];
    const targetDow = (latest.dayOfWeek + 1) % 7;

    const hits30 = new Array(100).fill(0);
    const hits100 = new Array(100).fill(0);
    const daysAbsent = new Array(100).fill(N);
    const maxGan = new Array(100).fill(0);
    const totalIntervals = new Array(100).fill(0);
    const intervalCount = new Array(100).fill(0);
    const lastSeenAt = new Array(100).fill(-1);
    const rawEMA = new Array(100).fill(0);

    for (let t = 0; t < N; t++) {
      const decay = Math.pow(0.935, t);
      const countInDraw = new Array(100).fill(0);
      for (const num of draws[t].lotoNumbers) {
        countInDraw[num % 100]++;
      }

      for (let num = 0; num < 100; num++) {
        const c = countInDraw[num];
        if (c > 0) {
          if (t < 30) hits30[num] += c;
          hits100[num] += c;
          rawEMA[num] += decay * (1 + 0.35 * (c - 1));

          if (daysAbsent[num] === N) {
            daysAbsent[num] = t;
          }
          if (lastSeenAt[num] !== -1) {
            const gap = t - lastSeenAt[num];
            if (gap > maxGan[num]) maxGan[num] = gap;
            totalIntervals[num] += gap;
            intervalCount[num]++;
          }
          lastSeenAt[num] = t;
        }
      }
    }

    const avgCycle = new Array(100);
    for (let num = 0; num < 100; num++) {
      if (daysAbsent[num] > maxGan[num]) maxGan[num] = daysAbsent[num];
      avgCycle[num] = intervalCount[num] > 0
        ? Math.round((totalIntervals[num] / intervalCount[num]) * 10) / 10
        : 4.2;
    }

    // 2. Weibull Survival
    const rawWeibull = new Array(100).fill(0);
    for (let num = 0; num < 100; num++) {
      const d = daysAbsent[num];
      const avg = avgCycle[num] || 4.0;
      const ratio = d / avg;
      if (d === 0) {
        rawWeibull[num] = 0.55 + (hits30[num] / 30) * 0.3;
      } else if (ratio >= 0.75 && ratio <= 1.55) {
        rawWeibull[num] = 1.4 - Math.abs(ratio - 1.12) * 0.7;
      } else if (d >= maxGan[num] - 1 && maxGan[num] >= 10) {
        rawWeibull[num] = 1.15;
      } else {
        rawWeibull[num] = Math.max(0.1, 1.0 - Math.abs(ratio - 1.1) * 0.35);
      }
    }

    // 3. Markov Transition Matrix
    const rawMarkov = new Array(100).fill(0);
    const bestMarkovSource = new Array(100).fill(pad2(latest.special2));
    const todaySet = new Set(latest.lotoNumbers);
    const yesterdaySet = N > 1 ? new Set(draws[1].lotoNumbers) : new Set();

    const transCount = Array.from({ length: 100 }, () => new Float64Array(100));
    const sourceAppear = new Float64Array(100).fill(1);

    for (let t = 1; t < N; t++) {
      const prevUnique = Array.from(new Set(draws[t].lotoNumbers));
      const nextUnique = Array.from(new Set(draws[t - 1].lotoNumbers));
      for (const a of prevUnique) {
        const wSource = (a === draws[t].special2 || a === draws[t].first2) ? 1.8 : 1.0;
        sourceAppear[a] += wSource;
        for (const b of nextUnique) {
          transCount[a][b] += wSource;
        }
      }
    }

    for (let target = 0; target < 100; target++) {
      let sumProb = 0;
      let bestP = -1;
      let bestA = latest.special2;

      for (const a of todaySet) {
        const importance = (a === latest.special2) ? 2.4 : (a === latest.first2 ? 1.6 : 1.0);
        const p = (transCount[a][target] / sourceAppear[a]) * importance;
        sumProb += p;
        if (p > bestP) {
          bestP = p;
          bestA = a;
        }
      }
      for (const a2 of yesterdaySet) {
        sumProb += 0.25 * (transCount[a2][target] / sourceAppear[a2]);
      }
      rawMarkov[target] = sumProb;
      bestMarkovSource[target] = pad2(bestA);
    }

    // 4. Positional Bridge Scanner
    const rawBridge = new Array(100).fill(0);
    const bridgeLabel = new Array(100).fill('');
    const bridgeStreak = new Array(100).fill(0);
    const posNames = [
      'G.ĐB[1]', 'G.ĐB[2]', 'G.ĐB[3]', 'G.ĐB[4]', 'G.ĐB[5]',
      'G.1[1]', 'G.1[2]', 'G.1[3]', 'G.1[4]', 'G.1[5]',
      'G.2[1]', 'G.2[2]', 'G.2[3]', 'G.2[4]', 'G.3[1]', 'G.3[2]',
      'G.3[3]', 'G.4[1]', 'G.4[2]', 'G.5[1]', 'G.5[2]', 'G.6[1]',
      'G.7[1]', 'G.7[2]'
    ];
    const P_LEN = Math.min(posNames.length, latest.digitPositions.length);

    for (let i = 0; i < P_LEN; i++) {
      for (let j = 0; j < P_LEN; j++) {
        if (i === j) continue;
        let streak = 0;
        for (let d = 1; d <= Math.min(6, N - 1); d++) {
          const d1 = draws[d].digitPositions[i];
          const d2 = draws[d].digitPositions[j];
          const cand = d1 * 10 + d2;
          const revCand = d2 * 10 + d1;
          const targetLotos = draws[d - 1].lotoNumbers;
          if (targetLotos.includes(cand) || targetLotos.includes(revCand)) {
            streak++;
          } else {
            break;
          }
        }
        if (streak >= 2) {
          const tomorrowNum = latest.digitPositions[i] * 10 + latest.digitPositions[j];
          const tomorrowRev = latest.digitPositions[j] * 10 + latest.digitPositions[i];
          const weight = Math.pow(2.1, streak);
          rawBridge[tomorrowNum] += weight;
          rawBridge[tomorrowRev] += weight * 0.65;
          if (streak > bridgeStreak[tomorrowNum]) {
            bridgeStreak[tomorrowNum] = streak;
            bridgeLabel[tomorrowNum] = `${posNames[i]}+${posNames[j]} (${streak} kỳ)`;
          }
          if (streak > bridgeStreak[tomorrowRev] && !bridgeLabel[tomorrowRev]) {
            bridgeStreak[tomorrowRev] = streak;
            bridgeLabel[tomorrowRev] = `${posNames[j]}+${posNames[i]} (Đảo ${streak} kỳ)`;
          }
        }
      }
    }

    for (let num = 0; num < 100; num++) {
      if (!bridgeLabel[num]) {
        const d1 = Math.floor(num / 10);
        const d2 = num % 10;
        const idx1 = latest.digitPositions.indexOf(d1);
        const idx2 = latest.digitPositions.lastIndexOf(d2);
        const p1 = idx1 >= 0 && idx1 < posNames.length ? posNames[idx1] : 'G.ĐB[3]';
        const p2 = idx2 >= 0 && idx2 < posNames.length ? posNames[idx2] : 'G.1[4]';
        bridgeLabel[num] = `${p1}+${p2}`;
        rawBridge[num] += 0.5 + (hits30[num] * 0.08);
      }
    }

    // 5. Apriori Association
    const rawApriori = new Array(100).fill(0);
    const spToday = latest.special2;
    const fpToday = latest.first2;
    const spSum = (Math.floor(spToday / 10) + (spToday % 10)) % 10;
    const headHitsToday = new Array(10).fill(0);
    const tailHitsToday = new Array(10).fill(0);
    for (const l of latest.lotoNumbers) {
      headHitsToday[Math.floor(l / 10)]++;
      tailHitsToday[l % 10]++;
    }

    for (let t = 1; t < N; t++) {
      const prev = draws[t];
      const curr = draws[t - 1];
      const prevSpSum = (Math.floor(prev.special2 / 10) + (prev.special2 % 10)) % 10;
      let sim = 0;
      if (prev.special2 === spToday) sim += 3.0;
      if (prevSpSum === spSum) sim += 1.4;
      if (Math.floor(prev.special2 / 10) === Math.floor(spToday / 10)) sim += 1.1;
      if ((prev.special2 % 10) === (spToday % 10)) sim += 1.1;
      if (prev.first2 === fpToday) sim += 1.5;
      if (sim > 0) {
        for (const hitNum of curr.lotoNumbers) {
          rawApriori[hitNum % 100] += sim;
        }
      }
    }

    for (let h = 0; h < 10; h++) {
      if (headHitsToday[h] === 0) {
        rawApriori[h * 10] += 4.5;
        rawApriori[h * 10 + h] += 5.0;
        rawApriori[h * 10 + 5] += 3.5;
      }
      if (tailHitsToday[h] === 0) {
        rawApriori[h] += 4.0;
        rawApriori[h * 10 + h] += 4.8;
      }
    }

    // 6. Gaussian Equilibrium
    const rawGaussian = new Array(100).fill(0);
    const w14H = new Array(10).fill(0);
    const w14T = new Array(10).fill(0);
    const w14S = new Array(10).fill(0);
    let evenCount = 0;
    let total14 = 0;

    for (let t = 0; t < Math.min(14, N); t++) {
      for (const l of draws[t].lotoNumbers) {
        const h = Math.floor(l / 10);
        const tl = l % 10;
        w14H[h]++;
        w14T[tl]++;
        w14S[(h + tl) % 10]++;
        if (l % 2 === 0) evenCount++;
        total14++;
      }
    }
    const expBucket = (total14 / 10) || 1;
    const evenRatio = evenCount / (total14 || 1);

    for (let num = 0; num < 100; num++) {
      const h = Math.floor(num / 10);
      const tl = num % 10;
      const sm = (h + tl) % 10;
      const hd = (expBucket - w14H[h]) / expBucket;
      const td = (expBucket - w14T[tl]) / expBucket;
      const sd = (expBucket - w14S[sm]) / expBucket;
      const ps = (num % 2 === 0) ? (0.5 - evenRatio) : (evenRatio - 0.5);
      rawGaussian[num] = 1.0 + hd * 0.45 + td * 0.45 + sd * 0.55 + ps * 0.4;
    }

    // 7. Fourier Day-of-Week Seasonality
    const rawFourier = new Array(100).fill(0);
    for (let t = 0; t < N; t++) {
      if (draws[t].dayOfWeek === targetDow) {
        const rec = Math.pow(0.9, Math.floor(t / 7));
        for (const l of draws[t].lotoNumbers) rawFourier[l % 100] += 2.2 * rec;
      }
      if (t % 3 === 2) {
        for (const l of draws[t].lotoNumbers) rawFourier[l % 100] += 0.45 * Math.pow(0.95, t);
      }
    }

    // 8. Attention Gate Sequence
    const rawLSTM = new Array(100).fill(0);
    for (let num = 0; num < 100; num++) {
      let sg = 0, mg = 0;
      const rev = parseInt(reverse2(pad2(num)), 10);
      const pN = (num + 99) % 100;
      const nN = (num + 1) % 100;
      for (let t = 0; t < Math.min(25, N); t++) {
        const set = draws[t].lotoNumbers;
        const hit = set.includes(num) ? 1 : 0;
        const rHit = set.includes(rev) ? 1 : 0;
        const nbHit = (set.includes(pN) || set.includes(nN)) ? 1 : 0;
        if (t < 7) sg += hit * Math.cos(t * 0.4) + 0.45 * rHit + 0.3 * nbHit;
        else mg += hit * Math.exp(-(t - 7) * 0.12) + 0.25 * rHit;
      }
      const fg = 1 / (1 + Math.exp(-(daysAbsent[num] - avgCycle[num]) * 0.6));
      rawLSTM[num] = Math.tanh(sg * 0.35 + mg * 0.25) + fg * 0.85;
    }

    // 9. Chi-Square Equilibrium
    const rawChiSquare = new Array(100).fill(0);
    const exp30 = (30 * latest.lotoNumbers.length) / 100;
    const exp100 = (N * latest.lotoNumbers.length) / 100;
    for (let num = 0; num < 100; num++) {
      const diff100 = exp100 - hits100[num];
      const chi100 = (diff100 * Math.abs(diff100)) / (exp100 || 1);
      const mom30 = (hits30[num] - exp30) / (exp30 || 1);
      rawChiSquare[num] = chi100 * 0.55 + mom30 * 0.45 - Math.abs(daysAbsent[num] - avgCycle[num]) * 0.08;
    }

    // 10. Numerology Shadow
    const rawShadow = new Array(100).fill(0);
    const spD1 = Math.floor(spToday / 10), spD2 = spToday % 10;
    const fpD1 = Math.floor(fpToday / 10), fpD2 = fpToday % 10;
    const shadowTargets = [
      { n: spD2 * 10 + spD1, w: 3.2 },
      { n: bongDuongDigit(spD1) * 10 + bongDuongDigit(spD2), w: 3.5 },
      { n: bongAmDigit(spD1) * 10 + bongAmDigit(spD2), w: 3.4 },
      { n: spD1 * 10 + bongDuongDigit(spD2), w: 2.8 },
      { n: bongDuongDigit(spD1) * 10 + spD2, w: 2.8 },
      { n: fpD2 * 10 + fpD1, w: 2.5 },
      { n: bongDuongDigit(fpD1) * 10 + bongDuongDigit(fpD2), w: 2.7 },
      { n: bongAmDigit(fpD1) * 10 + bongAmDigit(fpD2), w: 2.6 },
      { n: spD2 * 10 + fpD2, w: 3.0 },
      { n: fpD2 * 10 + spD2, w: 2.9 }
    ];
    for (let num = 0; num < 100; num++) {
      const d1 = Math.floor(num / 10), d2 = num % 10;
      let s = 0.5;
      if (d1 === spD1 || d2 === spD2 || d1 === spD2 || d2 === spD1) s += 1.1;
      if (d1 === bongDuongDigit(spD1) || d2 === bongDuongDigit(spD2)) s += 0.9;
      if (d1 === bongAmDigit(spD1) || d2 === bongAmDigit(spD2)) s += 0.85;
      rawShadow[num] = s + (hits30[num] * 0.05);
    }
    for (const st of shadowTargets) rawShadow[st.n] += st.w;

    const normScores = {
      ema: normalizeScores(rawEMA, 52, 98),
      weibull: normalizeScores(rawWeibull, 50, 98),
      markov: normalizeScores(rawMarkov, 52, 98.5),
      bridge: normalizeScores(rawBridge, 50, 98.5),
      apriori: normalizeScores(rawApriori, 51, 98),
      gaussian: normalizeScores(rawGaussian, 52, 96),
      fourier: normalizeScores(rawFourier, 50, 97),
      lstm: normalizeScores(rawLSTM, 52, 98),
      chisquare: normalizeScores(rawChiSquare, 50, 96),
      shadow: normalizeScores(rawShadow, 50, 97.5)
    };

    const items = [];
    for (let num = 0; num < 100; num++) {
      const numStr = pad2(num);
      const scores = {};
      ALGORITHMS.forEach(a => { scores[a.id] = normScores[a.id][num]; });
      items.push({
        num: numStr,
        numInt: num,
        head: Math.floor(num / 10),
        tail: num % 10,
        sumMod10: (Math.floor(num / 10) + (num % 10)) % 10,
        hits30: hits30[num],
        hits100: hits100[num],
        daysAbsent: daysAbsent[num],
        avgCycle: avgCycle[num],
        maxGan: maxGan[num],
        markovFrom: bestMarkovSource[num],
        bridgePos: bridgeLabel[num],
        bridgeStreak: bridgeStreak[num],
        scores
      });
    }

    return {
      latestDraw: latest,
      totalDraws: N,
      headHitsToday,
      tailHitsToday,
      items
    };
  }

  function computePredictions(evaluatedData, weightsMap, options = {}) {
    if (!evaluatedData) return null;
    const danSize = Math.max(2, Math.min(65, parseInt(options.danSize, 10) || 10));

    const ranked = evaluatedData.items.map(item => {
      let totalScore = 0;
      const breakdown = [];
      ALGORITHMS.forEach(alg => {
        const w = Number(weightsMap[alg.id] || 0);
        const s = item.scores[alg.id];
        const contrib = (s * w) / 100;
        totalScore += contrib;
        breakdown.push({
          id: alg.id,
          code: alg.code,
          short: alg.short,
          name: alg.name,
          color: alg.color,
          weight: w,
          rawScore: s,
          contrib: Math.round(contrib * 100) / 100
        });
      });
      const exactScore = Math.round(totalScore * 100) / 100;
      return {
        ...item,
        finalScore: exactScore,
        finalScoreStr: exactScore.toFixed(2),
        breakdown
      };
    });

    ranked.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      const bSub = b.scores.markov + b.scores.bridge;
      const aSub = a.scores.markov + a.scores.bridge;
      if (bSub !== aSub) return bSub - aSub;
      if (b.hits30 !== a.hits30) return b.hits30 - a.hits30;
      return a.numInt - b.numInt;
    });

    ranked.forEach((item, idx) => { item.rank = idx + 1; });

    const byNumMap = {};
    ranked.forEach(item => { byNumMap[item.num] = item; });

    const bachThu = {
      primary: ranked[0],
      backup: ranked[1],
      confidencePct: ranked[0].finalScore.toFixed(2)
    };

    const seenPairs = new Set();
    const songThuPairs = [];
    for (const item of ranked) {
      const rev = reverse2(item.num);
      const key = item.num <= rev ? `${item.num}-${rev}` : `${rev}-${item.num}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);

      const partner = byNumMap[rev];
      const pairScore = item.num === rev
        ? item.finalScore
        : (item.finalScore * 0.58 + partner.finalScore * 0.42);
      const p1 = item.finalScore / 100;
      const p2 = partner.finalScore / 100;
      const combinedHitIndex = item.num === rev
        ? item.finalScore
        : Math.min(99.4, ((1 - (1 - p1 * 0.45) * (1 - p2 * 0.45)) * 118));

      songThuPairs.push({
        pairLabel: item.num === rev ? `${item.num} (Kép)` : `${item.num} - ${rev}`,
        numA: item,
        numB: partner,
        pairScore: Math.round(pairScore * 100) / 100,
        combinedPct: combinedHitIndex.toFixed(2)
      });
    }
    songThuPairs.sort((a, b) => b.pairScore - a.pairScore);

    const xien2 = {
      numbers: [ranked[0], ranked[1]],
      scorePct: ((ranked[0].finalScore + ranked[1].finalScore) / 2).toFixed(2)
    };
    const xien3 = {
      numbers: [ranked[0], ranked[1], ranked[2]],
      scorePct: ((ranked[0].finalScore + ranked[1].finalScore + ranked[2].finalScore) / 3).toFixed(2)
    };
    const xien4 = {
      numbers: [ranked[0], ranked[1], ranked[2], ranked[3]],
      scorePct: ((ranked[0].finalScore + ranked[1].finalScore + ranked[2].finalScore + ranked[3].finalScore) / 4).toFixed(2)
    };

    const danItems = ranked.slice(0, danSize);
    const danAvgScore = danItems.reduce((acc, it) => acc + it.finalScore, 0) / danSize;
    const totalScoreMass = ranked.reduce((acc, it) => acc + it.finalScore, 0) || 1;
    const danScoreMass = danItems.reduce((acc, it) => acc + it.finalScore, 0);
    const danCoveragePct = Math.min(99.5, (danScoreMass / totalScoreMass) * 100 * 1.35);

    const headStats = Array.from({ length: 10 }, (_, d) => ({ digit: d, scoreSum: 0, bestNum: null }));
    const tailStats = Array.from({ length: 10 }, (_, d) => ({ digit: d, scoreSum: 0, bestNum: null }));
    const sumStats = Array.from({ length: 10 }, (_, d) => ({ digit: d, scoreSum: 0, bestNum: null }));

    for (const item of ranked) {
      const hObj = headStats[item.head];
      hObj.scoreSum += item.finalScore;
      if (!hObj.bestNum) hObj.bestNum = item.num;

      const tObj = tailStats[item.tail];
      tObj.scoreSum += item.finalScore;
      if (!tObj.bestNum) tObj.bestNum = item.num;

      const sObj = sumStats[item.sumMod10];
      sObj.scoreSum += item.finalScore;
      if (!sObj.bestNum) sObj.bestNum = item.num;
    }

    [headStats, tailStats, sumStats].forEach(arr => {
      arr.forEach(entry => { entry.avgScore = (entry.scoreSum / 10).toFixed(2); });
      arr.sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
    });

    return {
      ranked,
      byNumMap,
      bachThu,
      songThuPairs: songThuPairs.slice(0, 6),
      songThuTop2: {
        pairLabel: `${ranked[0].num} - ${ranked[1].num}`,
        numA: ranked[0],
        numB: ranked[1],
        pairScore: ((ranked[0].finalScore + ranked[1].finalScore) / 2).toFixed(2)
      },
      xien: { xien2, xien3, xien4 },
      danSo: {
        size: danSize,
        items: danItems,
        sortedAsc: [...danItems].sort((a, b) => a.numInt - b.numInt),
        avgScorePct: danAvgScore.toFixed(2),
        coveragePct: danCoveragePct.toFixed(1)
      },
      touchStats: {
        heads: headStats,
        tails: tailStats,
        sums: sumStats
      }
    };
  }

  function runHistoricalBacktest(draws, weightsMap, daysToTest = 10, danSize = 10) {
    const results = [];
    let bachThuHits = 0, songThuHits = 0, danHits = 0, deHitsInDan = 0;

    const minHistory = draws.length > 40 ? 35 : Math.max(1, Math.floor(draws.length / 2));
    const maxDays = Math.min(daysToTest, draws.length - minHistory);

    for (let d = 1; d <= maxDays; d++) {
      const historicalSlice = draws.slice(d);
      const actualNextDraw = draws[d - 1];
      const actualSet = new Set(actualNextDraw.lotoNumbers);
      const actualSpecial2 = pad2(actualNextDraw.special2);

      const evalSlice = evaluateAllNumbers(historicalSlice);
      const pred = computePredictions(evalSlice, weightsMap, { danSize });

      const btNum = pred.bachThu.primary.num;
      const stA = pred.songThuPairs[0].numA.num;
      const stB = pred.songThuPairs[0].numB.num;
      const danNums = pred.danSo.items.map(i => i.num);

      const btHitCount = actualNextDraw.lotoNumbers.filter(x => pad2(x) === btNum).length;
      const stHitCount = actualNextDraw.lotoNumbers.filter(x => pad2(x) === stA || pad2(x) === stB).length;
      const matchedInDan = danNums.filter(n => actualSet.has(parseInt(n, 10)));
      const hitDe = danNums.includes(actualSpecial2);

      if (btHitCount > 0) bachThuHits++;
      if (stHitCount > 0) songThuHits++;
      if (matchedInDan.length > 0) danHits++;
      if (hitDe) deHitsInDan++;

      results.push({
        date: actualNextDraw.date,
        actualSpecial: actualNextDraw.specialPrize,
        actualSpecial2,
        bachThuNum: btNum,
        bachThuHit: btHitCount,
        songThuLabel: pred.songThuPairs[0].pairLabel,
        songThuHit: stHitCount,
        danMatched: matchedInDan,
        hitDe
      });
    }

    const total = results.length || 1;
    return {
      daysTested: results.length,
      bachThuRate: results.length ? Math.round((bachThuHits / total) * 100) : 0,
      songThuRate: results.length ? Math.round((songThuHits / total) * 100) : 0,
      danWinRate: results.length ? Math.round((danHits / total) * 100) : 0,
      deRate: results.length ? Math.round((deHitsInDan / total) * 100) : 0,
      history: results
    };
  }

  function getConfigSignature(dateOrRegion, maybeDateOrWeights, maybeWeights) {
    let dateStr, weightsMap;
    if (maybeWeights !== undefined) {
      dateStr = maybeDateOrWeights;
      weightsMap = maybeWeights;
    } else {
      dateStr = dateOrRegion;
      weightsMap = maybeDateOrWeights || {};
    }
    const wArr = ALGORITHMS.map(a => weightsMap[a.id] || 0);
    return `XSMB-${String(dateStr).replace(/-/g, '')}-[${wArr.join('.')}]`;
  }

  // 6 Bộ Thuật Toán Tổng (Each sums strictly to 100%)
  const PRESET_STRATEGIES = [
    {
      id: 'default',
      name: 'Chuẩn Tối Ưu',
      icon: '⚖️',
      subtitle: 'Hội tụ cân bằng 10 thuật toán',
      weights: { ema: 14, weibull: 12, markov: 14, bridge: 14, apriori: 12, gaussian: 8, fourier: 8, lstm: 8, chisquare: 5, shadow: 5 }
    },
    {
      id: 'equal',
      name: 'Đều (10% × 10)',
      icon: '🧮',
      subtitle: 'Chia đều 10% cho mọi thuật toán',
      weights: { ema: 10, weibull: 10, markov: 10, bridge: 10, apriori: 10, gaussian: 10, fourier: 10, lstm: 10, chisquare: 10, shadow: 10 }
    },
    {
      id: 'bridge',
      name: 'Chuyên Cầu & Nhớ',
      icon: '🔗',
      subtitle: 'Ưu tiên Cầu vị trí (26%) & Bạc nhớ (22%)',
      weights: { ema: 8, weibull: 8, markov: 10, bridge: 26, apriori: 22, gaussian: 5, fourier: 6, lstm: 5, chisquare: 4, shadow: 6 }
    },
    {
      id: 'ai',
      name: 'Chuyên Markov & AI',
      icon: '🧠',
      subtitle: 'Ưu tiên Chuỗi Markov (24%) & AI Gate',
      weights: { ema: 16, weibull: 14, markov: 24, bridge: 8, apriori: 8, gaussian: 5, fourier: 5, lstm: 14, chisquare: 4, shadow: 2 }
    },
    {
      id: 'hot',
      name: 'Săn Lô Rơi & Nóng',
      icon: '🔥',
      subtitle: 'Tập trung Tần suất EMA (26%) & Chu kỳ Thứ',
      weights: { ema: 26, weibull: 6, markov: 18, bridge: 12, apriori: 10, gaussian: 4, fourier: 10, lstm: 6, chisquare: 2, shadow: 6 }
    },
    {
      id: 'reversion',
      name: 'Bắt Điểm Rơi Gan',
      icon: '🎯',
      subtitle: 'Tập trung Hồi quy Gan (28%) & Chi-Square',
      weights: { ema: 6, weibull: 28, markov: 8, bridge: 10, apriori: 8, gaussian: 12, fourier: 6, lstm: 8, chisquare: 10, shadow: 4 }
    }
  ];

  /**
   * Evaluates all 6 Preset Strategies on recent real historical draws to find which one matched the most.
   */
  function rankPresetStrategies(draws, daysToTest = 8, danSize = 10) {
    if (!Array.isArray(draws) || draws.length === 0) return null;
    const evaluatedLatest = evaluateAllNumbers(draws);
    const list = PRESET_STRATEGIES.map(preset => {
      const bt = runHistoricalBacktest(draws, preset.weights, daysToTest, danSize);
      const totalMatchedCount = bt.history.reduce((acc, r) => acc + r.danMatched.length, 0);
      const currentPred = computePredictions(evaluatedLatest, preset.weights, { danSize });
      const compositePerformance =
        bt.danWinRate * 0.45 +
        bt.songThuRate * 0.30 +
        bt.bachThuRate * 0.25 +
        totalMatchedCount * 1.2;

      return {
        ...preset,
        backtest: bt,
        totalMatchedCount,
        compositePerformance: Math.round(compositePerformance * 10) / 10,
        topBachThu: currentPred.bachThu.primary.num,
        topBachThuPct: currentPred.bachThu.primary.finalScoreStr,
        topSongThu: currentPred.songThuPairs[0].pairLabel
      };
    });

    let bestId = list[0].id;
    let bestScore = -1;
    list.forEach(item => {
      if (item.compositePerformance > bestScore) {
        bestScore = item.compositePerformance;
        bestId = item.id;
      }
    });

    list.forEach(item => {
      item.isBest = item.id === bestId;
    });

    return {
      bestPresetId: bestId,
      bestPreset: list.find(x => x.id === bestId),
      presets: list
    };
  }

  /**
   * Evaluates user's favorite numbers ("Số Bạn Kết") under the selected algorithm weights
   * and compares their statistical scores across all 6 preset strategies.
   */
  function evaluateFavoriteNumbers(evaluatedData, weightsMap, rawInput) {
    if (!evaluatedData) return { numbers: [], groupAvgPct: '0.00' };
    const tokens = String(rawInput || '')
      .split(/[\s,;.-]+/)
      .map(s => s.replace(/\D/g, ''))
      .filter(s => s.length > 0)
      .map(s => pad2(parseInt(s.slice(-2), 10)));

    const uniqueNums = Array.from(new Set(tokens));
    const currentPred = computePredictions(evaluatedData, weightsMap, { danSize: 10 });

    const presetPredictions = {};
    PRESET_STRATEGIES.forEach(p => {
      presetPredictions[p.id] = computePredictions(evaluatedData, p.weights, { danSize: 10 });
    });

    const results = uniqueNums.map(numStr => {
      const item = currentPred.byNumMap[numStr];
      const revStr = reverse2(numStr);
      const revItem = currentPred.byNumMap[revStr];

      const acrossPresets = PRESET_STRATEGIES.map(p => {
        const pItem = presetPredictions[p.id].byNumMap[numStr];
        return {
          presetId: p.id,
          presetName: p.name,
          presetIcon: p.icon,
          score: pItem.finalScore,
          scoreStr: pItem.finalScoreStr,
          rank: pItem.rank
        };
      });

      acrossPresets.sort((a, b) => b.score - a.score);

      const p1 = item.finalScore / 100;
      const p2 = revItem.finalScore / 100;
      const pairHitPct = numStr === revStr
        ? item.finalScoreStr
        : Math.min(99.2, (1 - (1 - p1 * 0.45) * (1 - p2 * 0.45)) * 118).toFixed(2);

      let verdict = '🔥 ĐIỂM HỘI TỤ CAO';
      let verdictColor = 'emerald';
      if (item.rank > 15 && item.rank <= 40) {
        verdict = '✅ KHÁ ỔN - CÂN NHẮC LÓT ĐẢO';
        verdictColor = 'blue';
      } else if (item.rank > 40) {
        verdict = '⚠️ ĐIỂM THẤP / CẦN CÂN NHẮC';
        verdictColor = 'amber';
      }

      return {
        num: numStr,
        item,
        revNum: revStr,
        revItem,
        pairHitPct,
        verdict,
        verdictColor,
        bestMatchingPreset: acrossPresets[0],
        acrossPresets
      };
    });

    let groupAvgPct = '0.00';
    if (results.length > 0) {
      const sum = results.reduce((acc, r) => acc + r.item.finalScore, 0);
      groupAvgPct = (sum / results.length).toFixed(2);
    }

    return {
      numbers: results,
      groupAvgPct
    };
  }

  global.LotoAIEngine = {
    ALGORITHMS,
    PRESET_STRATEGIES,
    LIVE_ENDPOINTS,
    REAL_CACHE_KEY,
    pad2,
    reverse2,
    getVietnamClockInfo,
    normalizeXsmbPrizeTable,
    parseGithubXsmbRow,
    parseXsktRssXml,
    parseXsmbTodayJson,
    alignDrawsWith1835Cutoff,
    enrichDrawRecord,
    loadCachedRealDraws,
    fetchLiveDrawsFromInternet,
    evaluateAllNumbers,
    computePredictions,
    runHistoricalBacktest,
    rankPresetStrategies,
    evaluateFavoriteNumbers,
    getConfigSignature
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.LotoAIEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
