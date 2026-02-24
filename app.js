/*
  Forex Widget - Static replica
  - No backend calls
  - Loads data from ./data/cities.json, ./data/currencies.json, ./data/rates.json
  - Replicates the Replit UI structure closely using the same Tailwind CSS output
*/

(function () {
  const ROOT_ID = 'fx-widget-root';

  /** ---------- helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function fmtINR(value) {
    const full = '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    if (value >= 10000000) {
      const crores = value / 10000000;
      return { display: '₹' + crores.toFixed(2) + ' Cr', full };
    }
    return { display: full, full };
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function nextDeliveryDate(now) {
    // basic weekend handling: if Sat after cutoff, deliver Monday; if Sun, deliver Monday.
    const cutoffHour = 13;
    const day = now.getDay(); // 0 Sun .. 6 Sat
    const beforeCutoff = now.getHours() < cutoffHour;

    if (day === 0) {
      return { date: addDays(now, 1), isSameDay: false, note: 'Sunday delivery not available' };
    }
    if (day === 6 && !beforeCutoff) {
      return { date: addDays(now, 2), isSameDay: false, note: 'Weekend cutoff' };
    }

    if (beforeCutoff) {
      return { date: now, isSameDay: true, note: 'Order before 1 PM for same-day delivery' };
    }

    return { date: addDays(now, 1), isSameDay: false, note: 'Order before 1 PM for same-day delivery' };
  }

  function getDeliveryTatText() {
    const now = new Date();
    const info = nextDeliveryDate(now);
    // Mobile: keep it shorter to avoid collision with the city selector
    const isMobile = (typeof window !== 'undefined') && window.matchMedia && window.matchMedia('(max-width: 639px)').matches;
    const formatted = info.date.toLocaleDateString(
      'en-IN',
      isMobile ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric', month: 'short' }
    );

    if (info.isSameDay) {
      return {
        text: `Order before 1 PM & get it today!`,
        sub: `Delivery: ${formatted} (today)`,
        isSameDay: true,
      };
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = info.date.toDateString() === tomorrow.toDateString();

    return {
      text: `Delivery by ${formatted}${isTomorrow ? ' (tomorrow)' : ''}`,
      sub: `Tip: Order before 1 PM for faster delivery`,
      isSameDay: false,
    };
  }

  function showToast(msg, variant) {
    const el = document.createElement('div');
    el.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-md shadow-lg border text-sm ' +
      (variant === 'destructive'
        ? 'bg-red-50 border-red-200 text-red-700'
        : 'bg-white border-gray-200 text-gray-700');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  /** ---------- lucide icons (minimal subset) ---------- */
  const ICONS = {
    chevronDown: '<path d="m6 9 6 6 6-6"/>' ,
    trendingDown: '<path d="M22 17l-7.1-7.1a2 2 0 0 0-2.8 0L2 20"/><path d="M22 17V7"/><path d="M22 17H12"/>',
    truck: '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-5h-3l-2-4h-3v9h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    inr: '<path d="M6 3h12"/><path d="M6 7h12"/><path d="M6 11h8"/><path d="M10 11c4 0 7 2 7 5v5"/><path d="M6 21h12"/>',
    creditCard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/><circle cx="12" cy="12" r="2"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>',
    refreshCw: '<path d="M21 12a9 9 0 0 0-15.5-6.4"/><path d="M3 4v6h6"/><path d="M3 12a9 9 0 0 0 15.5 6.4"/><path d="M21 20v-6h-6"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    tag: '<path d="M20.59 13.41 12 22 2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    mapPin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>' ,
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'
    ,
    x: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>'
  };

  function svgIcon(name, className, extraAttrs = '') {
    const paths = ICONS[name] || '';
    return `<svg ${extraAttrs} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">${paths}</svg>`;
  }

  /** ---------- data loading ---------- */
  async function loadJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load ' + url);
    return res.json();
  }

  function detectContextFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const ctx = {};
    const productParam = (params.get('product') || '').toLowerCase();
    if (productParam === 'card') ctx.product = 'card';
    else if (productParam === 'note') ctx.product = 'note';
    else if (productParam === 'both') ctx.product = 'both';

    const city = (params.get('city') || '').toUpperCase();
    if (city) ctx.city = city;

    const currency = (params.get('currency') || '').toUpperCase();
    if (currency) ctx.currency = currency;

    // coupon/cashback (static simulation)
    const coupon = (params.get('coupon') || params.get('code') || '').toUpperCase();
    if (coupon) ctx.coupon = coupon;
    const cashback = (params.get('cashback') || params.get('cashback_amount') || '').toString();
    if (cashback) ctx.cashback = cashback;
    const rateOld = (params.get('rate_old') || '').toString();
    if (rateOld) ctx.rateOld = rateOld;


    const showCoupon = (params.get('show_coupon') || '').toString();
    // Show a demo applied-coupon state by default (static-only), to match the Replit widget UI.
    // Set show_coupon=0 in the URL to hide it.
    if (!ctx.coupon && showCoupon !== '0') {
      ctx.coupon = 'FOREXCASHBACK';
      if (!ctx.cashback) ctx.cashback = '100';
    }

    return ctx;
  }

  /** ---------- render ---------- */
  function renderBase(root) {
    root.innerHTML = `
      <div class="w-full max-w-md mx-auto">
        <div class="bg-white rounded-md shadow-lg border border-gray-200 overflow-visible relative">
          <div class="bg-[#093562] px-4 sm:px-5 pt-4 pb-3 rounded-t-md relative" data-testid="header">
            <div class="relative flex items-center justify-center" data-testid="header-top">
              <img src="./images/bmf-logo.png" alt="BookMyForex" class="h-8 sm:h-9 w-auto object-contain" />
              <button type="button" id="fx-close-widget" class="absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-2 text-white opacity-80 hover:opacity-100" aria-label="Close" data-testid="button-close">
                <span class="sr-only">Close</span>
                ${svgIcon('x', 'w-4 h-4')}
              </button>
            </div>

            <div class="mt-3" data-testid="title-row">
              <h2 class="fx-header-title text-2xl font-semibold text-white leading-tight" data-testid="text-widget-title">Buy Forex Online</h2>
              <div class="mt-1 inline-flex items-center bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap" data-testid="badge-limited">Limited Time Offer</div>
            </div>

<div id="fx-header-callouts" class="fx-header-callouts mt-3" data-testid="header-callouts">
              <div class="flex items-center gap-2">
                ${svgIcon('trendingDown', 'w-3.5 h-3.5 text-[#FFB427] flex-shrink-0')}
                <span class="text-[11px] sm:text-[13px] text-white font-semibold whitespace-nowrap">Best Rates</span>
              </div>
              <div class="flex items-center gap-2">
                ${svgIcon('truck', 'w-3.5 h-3.5 text-[#FFB427] flex-shrink-0')}
                <span class="text-[11px] sm:text-[13px] text-white font-semibold whitespace-nowrap">Doorstep Delivery</span>
              </div>
              <div class="flex items-center gap-2">
                ${svgIcon('inr', 'w-3.5 h-3.5 text-[#FFB427] flex-shrink-0')}
                <span class="text-[11px] sm:text-[13px] text-white font-semibold whitespace-nowrap">Pay on Delivery</span>
              </div>
            </div>
          </div>

          <div class="p-4 sm:p-5">
            <form id="fx-form" class="space-y-3 sm:space-y-4">
              <div id="fx-tabs" class="flex rounded-md border border-gray-300 overflow-hidden" data-testid="tabs-product">
                <button type="button" id="tab-notes" class="flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center bg-[#093562] text-white" data-testid="tab-notes">
                  ${svgIcon('banknote', 'w-4 h-4 mr-1.5 flex-shrink-0')}
                  Currency Notes
                </button>
                <button type="button" id="tab-card" class="flex-1 py-2.5 text-sm font-medium transition-colors border-l border-gray-300 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100" data-testid="tab-card">
                  ${svgIcon('creditCard', 'w-4 h-4 mr-1.5 flex-shrink-0')}
                  Forex Card
                </button>
              </div>

              <div class="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-md px-3 py-2" data-testid="delivery-tat-bar">
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-2">
                    ${svgIcon('truck', 'w-4 h-4 text-blue-600 flex-shrink-0')}
                    <span class="text-[11px] sm:text-[12px] text-blue-800 font-semibold truncate" data-testid="delivery-tat">...</span>
                  </div>
                  <div class="text-[10px] text-blue-700 ml-6" data-testid="delivery-tat-sub">...</div>
                </div>

                <!-- City selector (compact) -->
                <div class="relative" id="city-selector">
                  <button type="button" id="city-trigger" class="flex items-center gap-1 text-blue-600 font-semibold text-[12px] sm:text-[13px] hover:text-blue-700 transition-colors flex-shrink-0" data-testid="select-city" aria-expanded="false">
                    <span id="city-trigger-label">Select City</span>
                    ${svgIcon('chevronDown', 'w-3.5 h-3.5')}
                  </button>

                  <div id="city-popover" class="hidden absolute right-0 mt-2 w-[280px] p-0 rounded-md shadow-lg border border-gray-200 bg-white z-50">
                    <div class="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
                      <div class="flex items-center border-b px-3" cmdk-input-wrapper="">
                        ${svgIcon('search', 'mr-2 h-4 w-4 shrink-0 opacity-50')}
                        <input id="city-search" class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" placeholder="Search city..." />
                      </div>
                      <div id="city-list" class="max-h-[260px] overflow-y-auto overflow-x-hidden"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Currency</label>

                <div class="relative" id="currency-selector">
                  <button type="button" id="currency-trigger" class="inline-flex items-center justify-between w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-none font-normal" aria-expanded="false" data-testid="select-currency">
                    <span class="flex items-center gap-2" id="currency-trigger-label">
                      <span class="text-gray-400">Select currency...</span>
                    </span>
                    ${svgIcon('chevronDown', 'ml-2 h-3.5 w-3.5 shrink-0 text-gray-400')}
                  </button>

                  <div id="currency-popover" class="hidden absolute left-0 mt-2 w-full sm:w-[340px] p-0 rounded-md shadow-lg border border-gray-200 bg-white z-50">
                    <div class="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
                      <div class="flex items-center border-b px-3" cmdk-input-wrapper="">
                        ${svgIcon('search', 'mr-2 h-4 w-4 shrink-0 opacity-50')}
                        <input id="currency-search" class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" placeholder="Search currency..." />
                      </div>
                      <div id="currency-list" class="max-h-[280px] overflow-y-auto overflow-x-hidden"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block" data-testid="label-amount">AMOUNT (<span id="amount-currency">USD</span>)</label>
                <div data-testid="amount-row">
                  <input id="amount-input" type="text" inputmode="numeric" pattern="[0-9,]*" maxlength="11" placeholder="Enter amount" class="w-full h-12 rounded-md bg-white border border-gray-300 text-base font-semibold pl-3 pr-3 focus:outline-none focus:ring-2 focus:ring-[#093562]/30 focus:border-[#093562]" data-testid="input-amount" />
                  <span id="amount-max" class="hidden text-[11px] text-gray-400 mt-1 block" data-testid="text-max-limit"></span>

                  <div id="rate-display" class="hidden flex items-center justify-between mt-2 min-w-0" data-testid="rate-display">
                    <div class="text-[13px] leading-[18px] text-gray-400" data-testid="text-rate">
                      <span>Rate: </span>
                      <span id="rate-text" class="text-gray-600">₹0.00/USD</span>
                    </div>
                    <div class="flex items-baseline gap-1.5" data-testid="text-converted-amount">
                      <span class="text-[13px] font-bold text-[#093562] flex-shrink-0">Total:</span>
                      <span id="total-text" class="text-[20px] font-extrabold text-[#093562] whitespace-nowrap" data-testid="text-total-value">₹0</span>
                    </div>
                  </div>
                </div>
              </div>

              <div id="brg-inline" class="hidden fx-brg-inline" data-testid="brg-inline">
                ${svgIcon('shield','w-4 h-4')}
                <span>Best Rate Guarantee</span>
              </div>

              <div id="coupon-banner" class="hidden flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-2 justify-between bg-emerald-50 border border-emerald-200 border-dashed rounded-md px-3 py-2" data-testid="coupon-banner">
                <div class="flex items-start gap-2 min-w-0">
                  <span class="mt-0.5 text-emerald-700 flex-shrink-0">${svgIcon('tag','w-4 h-4','')}</span>
                  <div class="min-w-0">
                    <div class="text-[13px] font-semibold text-emerald-800" id="coupon-title">Cashback applied</div>
                    <div class="text-[12px] text-emerald-700" id="coupon-subtitle">Discount applied on checkout</div>
                  </div>
                </div>
                <button type="button" id="coupon-copy-btn" class="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-100 border border-emerald-200 px-3 py-2 text-[12px] font-semibold text-emerald-800 hover:bg-emerald-200/40 whitespace-nowrap" data-testid="coupon-copy">
                  ${svgIcon('copy','w-4 h-4','')}
                  <span id="coupon-copy-text">Copy Code</span>
                </button>
              </div>

              
              <div id="savings-banner" class="hidden fx-savings-line" data-testid="savings-banner">
                ${svgIcon('trendingDown', 'w-3.5 h-3.5 text-green-600 flex-shrink-0')}
                <span class="fx-savings-text"><span class="fx-savings-strong">You save up to <span class="font-semibold" id="savings-text">₹0</span></span><span class="fx-savings-muted"> vs other banks &amp; airports</span></span>
              </div>

<div class="space-y-2">
                <div class="flex flex-col gap-3 items-stretch">
                  <button type="submit" id="submit-btn" class="w-full h-11 rounded-md text-[14px] font-bold bg-[#FFB427] hover:bg-[#e6a223] text-white uppercase tracking-wider border-0 shadow-none ring-0 outline-none focus:ring-0 focus-visible:ring-0 whitespace-nowrap flex items-center justify-center gap-2 flex-nowrap px-3" data-testid="button-submit">
                    <span>Book This Order</span>
                    ${svgIcon('arrowRight', 'w-4 h-4 shrink-0')}
                  </button>

                  <a id="wa-btn" href="#" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" class="w-full h-11 rounded-md flex items-center justify-center gap-2 text-[14px] font-semibold text-[#25D366] border border-[#25D366]/40 hover:bg-[#25D366]/5 transition-colors" data-testid="button-whatsapp">
                    <img src="./assets/whatsapp.png" alt="" class="w-5 h-5 flex-shrink-0" />
                    <span class="whitespace-nowrap">Forex on WhatsApp</span>
                  </a>
                </div>

                <div class="flex items-center justify-center gap-2 sm:gap-3 pt-0.5" data-testid="trust-badges">
                  <div class="flex items-center gap-1 flex-shrink-0">
                    ${svgIcon('zap', 'w-3 h-3 text-[#FFB427] flex-shrink-0')}
                    <span class="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Zero Forex Markup</span>
                  </div>
                  <div class="w-px h-3 bg-gray-300 flex-shrink-0"></div>
                  <div class="flex items-center gap-1 min-w-0" data-testid="persuasion-text">
                    ${svgIcon('shield', 'w-3 h-3 text-green-500 flex-shrink-0')}
                    <span id="persuasion-text" class="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap truncate">RBI Authorized Dealers</span>
                  </div>
                </div>
              </div>

              
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function setupWidget({ cities, currencies, ratesData }) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    renderBase(root);

    // ---------- close behavior (X button, click outside, Esc key) ----------
    const overlayEl = document.getElementById('fx-page-overlay');
    const closeBtn = $('#fx-close-widget', root);

    function localClose() {
      // Hide wrapper (if present) and clear widget root
      if (overlayEl) overlayEl.style.display = 'none';
      root.innerHTML = '';
    }

    function emitClose() {
      try {
        window.dispatchEvent(new CustomEvent('fxWidget:close'));
      } catch (_) {}

      // Close inside this document (useful for full-page demo and widget.html)
      localClose();

      // Notify parent if this widget is inside an iframe popup
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'FXW_CLOSE' }, '*');
        }
      } catch (_) {}
    }

    if (closeBtn) closeBtn.addEventListener('click', emitClose);

    if (overlayEl) {
      overlayEl.addEventListener('click', (e) => {
        // Close only when clicking the overlay area (outside the widget)
        if (e.target === overlayEl) emitClose();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') emitClose();
    });

    // ---------- state ----------
    const ctx = detectContextFromUrl();

    const showOnlyCard = ctx.product === 'card';
    const showOnlyNote = ctx.product === 'note';
    const showBoth = !showOnlyCard && !showOnlyNote;

    let product = showOnlyCard ? 'card' : 'note';
    if (showBoth && (ctx.product === 'card' || ctx.product === 'note')) product = ctx.product;

    let city = (ctx.city || 'DEL').toUpperCase();
    let currency = (ctx.currency || 'USD').toUpperCase();
    let amount = 1000;

    // coupon simulation (static-only)
    let couponCode = (ctx.coupon || '').toUpperCase();
    let cashbackAmount = Number(ctx.cashback || 0);
    let rateOldOverride = Number(ctx.rateOld || 0);

    // rates: base rates list; we simulate slight city variation
    const baseRateByCurrency = new Map();
    (ratesData.rates || []).forEach(r => baseRateByCurrency.set(r.currency, r));

    function getRate(currencyCode) {
      const r = baseRateByCurrency.get(currencyCode);
      if (!r) return null;
      const cityNudge = ((hashCode(city) % 9) - 4) * 0.05; // -0.20..+0.20
      const cardRate = Math.max(0, r.cardRate + cityNudge);
      const notesRate = Math.max(0, r.notesRate + cityNudge);
      return {
        ...r,
        cardRate,
        notesRate,
      };
    }

    function getServiceableCities() {
      return cities.filter(c => product === 'card' ? c.serviceableCard : c.serviceableNotes);
    }

    function ensureServiceableCity() {
      const svc = getServiceableCities();
      if (!svc.length) return;
      if (!svc.some(c => c.code === city)) {
        const firstTop = svc.find(c => c.isTopCity);
        city = (firstTop ? firstTop.code : svc[0].code);
      }
    }

    function ensureCurrencyExists() {
      if (!baseRateByCurrency.has(currency)) currency = 'USD';
    }

    // ---------- UI refs ----------
    const tabNotes = $('#tab-notes', root);
    const tabCard = $('#tab-card', root);
    const tabsWrap = $('#fx-tabs', root);

    const tatText = $('[data-testid="delivery-tat"]', root);
    const tatSub = $('[data-testid="delivery-tat-sub"]', root);

    const cityTrigger = $('#city-trigger', root);
    const cityTriggerLabel = $('#city-trigger-label', root);
    const cityPopover = $('#city-popover', root);
    const citySearch = $('#city-search', root);
    const cityList = $('#city-list', root);

    const currencyTrigger = $('#currency-trigger', root);
    const currencyTriggerLabel = $('#currency-trigger-label', root);
    const currencyPopover = $('#currency-popover', root);
    const currencySearch = $('#currency-search', root);
    const currencyList = $('#currency-list', root);

    const amountInput = $('#amount-input', root);
    const amountCurrency = $('#amount-currency', root);
    const maxText = $('#amount-max', root);

    const rateDisplay = $('#rate-display', root);
    const rateText = $('#rate-text', root);
    const totalText = $('#total-text', root);

    const brgInline = $('#brg-inline', root);

    const savingsBanner = $('#savings-banner', root);
    const savingsText = $('#savings-text', root);


    const couponBanner = $('#coupon-banner', root);
    const couponTitle = $('#coupon-title', root);
    const couponSubtitle = $('#coupon-subtitle', root);
    const couponCopyBtn = $('#coupon-copy-btn', root);
    const couponCopyText = $('#coupon-copy-text', root);

    if (couponCopyBtn) {
      couponCopyBtn.addEventListener('click', async () => {
        if (!couponCode) return;
        try {
          await navigator.clipboard.writeText(couponCode);
          if (couponCopyText) couponCopyText.textContent = 'Copied';
          setTimeout(() => { if (couponCopyText) couponCopyText.textContent = 'Copy Code'; }, 1500);
        } catch (e) {
          // fallback
          try {
            const ta = document.createElement('textarea');
            ta.value = couponCode;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand('copy');
            ta.remove();
            if (couponCopyText) couponCopyText.textContent = 'Copied';
            setTimeout(() => { if (couponCopyText) couponCopyText.textContent = 'Copy Code'; }, 1500);
          } catch (_) {}
        }
      });
    }

    const persuasionText = $('#persuasion-text', root);


    const waBtn = $('#wa-btn', root);

    // ---------- init visibility based on context ----------
    if (!showBoth) {
      // replace tabs with static label like React does
      tabsWrap.outerHTML = `
        <div class="flex items-center justify-center gap-2 bg-[#093562] text-white rounded-md py-2.5 text-sm font-medium" data-testid="tabs-product">
          ${showOnlyCard
            ? `${svgIcon('creditCard', 'w-4 h-4 flex-shrink-0')} Forex Card`
            : `${svgIcon('banknote', 'w-4 h-4 flex-shrink-0')} Currency Notes`
          }
        </div>
      `;
    }

    // ---------- popover mechanics ----------
    function resetPopoverStyles(popover) {
      popover.style.position = '';
      popover.style.top = '';
      popover.style.left = '';
      popover.style.right = '';
      popover.style.bottom = '';
      popover.style.width = '';
      popover.style.maxHeight = '';
      popover.style.overflow = '';
      popover.style.marginTop = '';
    }

    let activePopover = null;

    function hidePopover(popover, trigger) {
      popover.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
      resetPopoverStyles(popover);
    }

    function closeAllPopovers() {
      hidePopover(cityPopover, cityTrigger);
      hidePopover(currencyPopover, currencyTrigger);
      activePopover = null;
    }

    function getVisibleViewport() {
      const vv = window.visualViewport;
      if (vv) {
        return {
          top: vv.offsetTop || 0,
          left: vv.offsetLeft || 0,
          width: vv.width || window.innerWidth,
          height: vv.height || window.innerHeight,
        };
      }
      return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function positionPopover(popover, trigger, listEl, mode) {
      const vp = getVisibleViewport();
      const gap = 8;
      const margin = 10;
      const rect = trigger.getBoundingClientRect();

      // Fixed positioning prevents clipping inside the widget container.
      popover.style.position = 'fixed';
      popover.style.zIndex = '99999';
      popover.style.right = 'auto';
      popover.style.bottom = '';
      popover.style.marginTop = '0';

      // Width
      let width;
      if (mode === 'city') {
        width = Math.min(280, vp.width - margin * 2);
      } else {
        // match trigger width on both mweb & dweb
        width = Math.min(rect.width, vp.width - margin * 2);
      }
      popover.style.width = width + 'px';

      // Horizontal position
      let left = (mode === 'city') ? (rect.right - width) : rect.left;
      left = clamp(left, margin, vp.width - width - margin);
      popover.style.left = (left + vp.left) + 'px';

      // Available space within the *visible* viewport (handles mobile keyboard)
      const visibleTop = vp.top;
      const visibleBottom = vp.top + vp.height;
      const below = visibleBottom - rect.bottom;
      const above = rect.top - visibleTop;

      // Choose direction: prefer below unless keyboard/space makes it cramped
      const preferAbove = (below < 220 && above > below);
      const placeAbove = preferAbove;

      const maxH = Math.max(180, Math.floor((placeAbove ? above : below) - gap - margin));
      popover.style.maxHeight = maxH + 'px';
      popover.style.overflow = 'hidden';

      // Apply scroll constraints to the list inside popover
      if (listEl) {
        // header is the search row (approx 44px)
        const headerEl = popover.querySelector('[cmdk-input-wrapper]') || popover.querySelector('.border-b');
        const headerH = headerEl ? headerEl.getBoundingClientRect().height : 44;
        const listMax = Math.max(140, Math.floor(maxH - headerH - 8));
        listEl.style.maxHeight = listMax + 'px';
        listEl.style.overflowY = 'auto';
        listEl.style.overflowX = 'hidden';
        listEl.style.webkitOverflowScrolling = 'touch';
        listEl.style.overscrollBehavior = 'contain';
        listEl.style.touchAction = 'pan-y';
      }

      // Vertical position
      let top;
      if (!placeAbove) {
        top = rect.bottom + gap;
        top = Math.min(top, (visibleBottom - maxH - margin));
        top = Math.max(top, visibleTop + margin);
      } else {
        top = rect.top - gap - maxH;
        top = Math.max(top, visibleTop + margin);
      }
      popover.style.top = top + 'px';
    }

    function openPopover(popover, trigger, focusEl, listEl, mode) {
      closeAllPopovers();
      popover.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');

      // Render/measure then position
      requestAnimationFrame(() => {
        positionPopover(popover, trigger, listEl, mode);
      });

      activePopover = { popover, trigger, listEl, mode };
      setTimeout(() => { focusEl && focusEl.focus(); }, 0);
    }

    function togglePopover(popover, trigger, focusEl, listEl, mode) {
      const isHidden = popover.classList.contains('hidden');
      if (isHidden) openPopover(popover, trigger, focusEl, listEl, mode);
      else closeAllPopovers();
    }

    function repositionActivePopover() {
      if (!activePopover) return;
      // if it got closed somehow
      if (activePopover.popover.classList.contains('hidden')) { activePopover = null; return; }
      positionPopover(activePopover.popover, activePopover.trigger, activePopover.listEl, activePopover.mode);
    }

    window.addEventListener('resize', repositionActivePopover, { passive: true });
    window.addEventListener('scroll', repositionActivePopover, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', repositionActivePopover);
      window.visualViewport.addEventListener('scroll', repositionActivePopover);
    }

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t) return;
      const insideCity = t.closest && (t.closest('#city-selector') || t.closest('#city-popover'));
      const insideCurrency = t.closest && (t.closest('#currency-selector') || t.closest('#currency-popover'));
      if (!insideCity && !insideCurrency) closeAllPopovers();
    });

    // ---------- rendering lists ----------
    function renderCityList() {
      const svcCities = getServiceableCities();
      const query = (citySearch.value || '').toLowerCase().trim();

      const top = svcCities.filter(c => c.isTopCity);
      const other = svcCities.filter(c => !c.isTopCity);

      function matches(c) {
        if (!query) return true;
        const hay = (c.name + ' ' + (c.aliases || []).join(' ')).toLowerCase();
        return hay.includes(query);
      }

      const topFiltered = top.filter(matches);
      const otherFiltered = other.filter(matches);

      if (!topFiltered.length && !otherFiltered.length) {
        cityList.innerHTML = `<div class="py-6 text-center text-sm">No city found.</div>`;
        return;
      }

      const group = (heading, items, showDivider) => {
        if (!items.length) return '';
        const rows = items.map(c => {
          const isSel = c.code === city;
          return `
            <div class="relative flex cursor-pointer gap-2 select-none items-center rounded-sm px-2 py-2 text-sm hover:bg-gray-50" data-code="${c.code}">
              <span class="mr-2 h-3.5 w-3.5 text-[#009688] ${isSel ? 'opacity-100' : 'opacity-0'}">${svgIcon('check','h-3.5 w-3.5','')}</span>
              ${escapeHtml(c.name)}
            </div>
          `;
        }).join('');

        return `
          ${showDivider ? '<div class="h-px bg-gray-100 mx-2 my-1"></div>' : ''}
          <div class="overflow-hidden p-1 text-foreground">
            <div class="px-2 py-1.5 text-xs font-medium text-gray-500">${heading}</div>
            ${rows}
          </div>
        `;
      };

      cityList.innerHTML = group('Top Cities', topFiltered, false) + group('Other Cities', otherFiltered, topFiltered.length > 0);

      // bind clicks
      $$('[data-code]', cityList).forEach(row => {
        row.addEventListener('click', () => {
          city = row.getAttribute('data-code');
          closeAllPopovers();
          updateAll();
        });
      });
    }

    function currencyFuzzyMatch(meta, query) {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      const hay = (meta.searchTerms || (meta.code + ' ' + meta.name)).toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      return tokens.every(t => hay.includes(t));
    }

    function renderCurrencyList() {
      const query = (currencySearch.value || '').toLowerCase().trim();

      // only show currencies that exist in rates
      const availableCodes = new Set(Array.from(baseRateByCurrency.keys()));
      const all = currencies.filter(c => availableCodes.has(c.code));

      const popular = all.filter(c => c.popular);
      const other = all.filter(c => !c.popular);

      const filtered = query
        ? all.filter(c => currencyFuzzyMatch(c, query))
        : null;

      const list = filtered || null;

      if (list && !list.length) {
        currencyList.innerHTML = `<div class="py-6 text-center text-sm">No currency found.</div>`;
        return;
      }

      function itemRow(meta) {
        const r = getRate(meta.code);
        const img = r && r.image ? `<img src="${escapeHtml(r.image)}" alt="" class="w-5 h-3.5 object-cover rounded-sm border border-gray-200" />` : '';
        const isSel = meta.code === currency;
        const right = meta.rightLabel ? `<span class="ml-auto text-[11px] text-gray-400 whitespace-nowrap">${escapeHtml(meta.rightLabel)}</span>` : '';

        return `
          <div class="relative flex cursor-pointer gap-2 select-none items-center rounded-sm px-2 py-2 text-sm hover:bg-gray-50" data-code="${meta.code}">
            <span class="mr-2 h-3.5 w-3.5 text-[#009688] ${isSel ? 'opacity-100' : 'opacity-0'}">${svgIcon('check','h-3.5 w-3.5','')}</span>
            ${img}
            <span class="font-medium text-gray-900">${escapeHtml(meta.name)}</span>
            ${right}
          </div>
        `;
      }

      function group(heading, items, withDivider) {
        if (!items.length) return '';
        return `
          ${withDivider ? '<div class="h-px bg-gray-100 mx-2 my-1"></div>' : ''}
          <div class="overflow-hidden p-1 text-foreground">
            <div class="px-2 py-1.5 text-xs font-medium text-gray-500">${heading}</div>
            ${items.map(itemRow).join('')}
          </div>
        `;
      }

      if (query) {
        currencyList.innerHTML = group('Search Results', list, false);
      } else {
        // Keep popular at top, and show others (sorted by name) below
        const otherSorted = [...other].sort((a, b) => a.name.localeCompare(b.name));
        currencyList.innerHTML = group('Popular Currencies', popular, false) + group('All Currencies', otherSorted, popular.length > 0);
      }

      $$('[data-code]', currencyList).forEach(row => {
        row.addEventListener('click', () => {
          currency = row.getAttribute('data-code');
          closeAllPopovers();
          updateAll();
        });
      });
    }

    // ---------- update UI ----------
    function updateTabsUI() {
      if (!showBoth) return;
      if (product === 'note') {
        tabNotes.className = 'flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center bg-[#093562] text-white';
        tabCard.className = 'flex-1 py-2.5 text-sm font-medium transition-colors border-l border-gray-300 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100';
      } else {
        tabCard.className = 'flex-1 py-2.5 text-sm font-medium transition-colors border-l border-gray-300 flex items-center justify-center bg-[#093562] text-white';
        tabNotes.className = 'flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100';
      }
    }

    function updateTatUI() {
      const tat = getDeliveryTatText();
      tatText.textContent = tat.text;
      tatSub.textContent = tat.sub;
    }

    function updateSelectorsUI() {
      const cityObj = cities.find(c => c.code === city);
      cityTriggerLabel.textContent = cityObj ? cityObj.name : city;

      const meta = currencies.find(c => c.code === currency);
      const rate = getRate(currency);

      if (!meta) {
        currencyTriggerLabel.innerHTML = `<span class="text-gray-400">Select currency...</span>`;
      } else {
        const img = rate && rate.image ? `<img src="${escapeHtml(rate.image)}" alt="" class="w-5 h-3.5 object-cover rounded-sm border border-gray-200" />` : '';
        currencyTriggerLabel.innerHTML = `${img}<span class="font-semibold">${escapeHtml(meta.code)}</span><span class="text-gray-600">${escapeHtml(meta.name)}</span>`;
      }

      amountCurrency.textContent = currency;

      persuasionText.textContent = (product === 'card')
        ? ( {
            USD: 'Start with just 10 USD',
            AED: 'Start with just 40 AED',
            THB: 'Start with just 350 THB',
            EUR: 'Start with just 10 EUR',
            SGD: 'Start with just 15 SGD',
            GBP: 'Start with just 10 GBP',
            HKD: 'Start with just 75 HKD',
            CHF: 'Start with just 10 CHF',
            SAR: 'Start with just 40 SAR',
            CAD: 'Start with just 15 CAD',
            ZAR: 'Start with just 150 ZAR',
            AUD: 'Start with just 15 AUD',
            JPY: 'Start with just 10,000 JPY',
            NZD: 'Start with just 15 NZD',
          }[currency] || '' )
        : 'RBI Authorized Dealers';

      // ensure search list updates checkmarks
      renderCityList();
      renderCurrencyList();
    }

    function updateAmountUI() {
      const MAX = 9999999;
      // amount input formatting (en-IN)
      amountInput.value = amount ? Number(amount).toLocaleString('en-IN') : '';

      if (amount > MAX) {
        maxText.classList.remove('hidden');
        maxText.textContent = `Max: ${MAX.toLocaleString('en-IN')} ${currency}`;
      } else {
        maxText.classList.add('hidden');
      }

      const r = getRate(currency);
      const activeRate = r ? (product === 'card' ? r.cardRate : r.notesRate) : 0;

      if (amount && activeRate > 0) {
        const total = Number(amount) * activeRate;
        const formatted = fmtINR(total);
        rateDisplay.classList.remove('hidden');
        if (brgInline) brgInline.classList.remove('hidden');
        if (couponCode) {
          const oldRate = rateOldOverride > 0 ? rateOldOverride : (activeRate + 0.10);
          rateText.innerHTML = `<span class=\"line-through mr-2 text-gray-400\">₹${oldRate.toFixed(2)}/${currency}</span><span class=\"text-gray-600\">₹${activeRate.toFixed(2)}/${currency}</span>`;
        } else {
          rateText.innerHTML = `₹${activeRate.toFixed(2)}/${currency}`;
        }
        totalText.textContent = formatted.display;
        totalText.title = formatted.full;

        // coupon banner
        if (couponBanner) {
          if (couponCode) {
            couponBanner.classList.remove('hidden');
            const title = cashbackAmount > 0 ? `₹${cashbackAmount.toLocaleString('en-IN')} cashback applied` : 'Coupon applied';
            couponTitle.textContent = title;
            couponSubtitle.textContent = 'Discount applied on checkout';
            couponCopyBtn.disabled = false;
          } else {
            couponBanner.classList.add('hidden');
          }
        }

        const savings = Math.round(total * 0.035);
        if (savings > 0) {
          savingsBanner.classList.remove('hidden');
          savingsText.textContent = '₹' + savings.toLocaleString('en-IN');
        } else {
          savingsBanner.classList.add('hidden');
        }
      } else {
        rateDisplay.classList.add('hidden');
        if (brgInline) brgInline.classList.add('hidden');
        savingsBanner.classList.add('hidden');

        // Show applied coupon state even before amount entry (static demo)
        if (couponBanner) {
          if (couponCode) {
            couponBanner.classList.remove('hidden');
            const title = cashbackAmount > 0 ? `₹${cashbackAmount.toLocaleString('en-IN')} cashback applied` : 'Coupon applied';
            couponTitle.textContent = title;
            couponSubtitle.textContent = 'Discount applied on checkout';
            couponCopyBtn.disabled = false;
          } else {
            couponBanner.classList.add('hidden');
          }
        }
      }

      // whatsapp deeplink
      const cityObj = cities.find(c => c.code === city);
      const cityName = cityObj ? cityObj.name : city;
      const msg = `Hi, I want to buy ${amount ? Number(amount).toLocaleString('en-IN') : ''} ${currency} ${product === 'card' ? 'Forex Card' : 'Currency Notes'} in ${cityName}. Please share the best rate.`;
      waBtn.href = `https://wa.me/919212219191?text=${encodeURIComponent(msg)}`;
    }


    function updateAll() {
      ensureServiceableCity();
      ensureCurrencyExists();
      updateTabsUI();
      updateTatUI();
      updateSelectorsUI();
      updateAmountUI();
    }

    // ---------- event bindings ----------
    if (showBoth) {
      tabNotes.addEventListener('click', () => {
        product = 'note';
        updateAll();
      });
      tabCard.addEventListener('click', () => {
        product = 'card';
        updateAll();
      });
    }

    cityTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      togglePopover(cityPopover, cityTrigger, citySearch, cityList, 'city');
      renderCityList();
    });

    citySearch.addEventListener('input', renderCityList);

    currencyTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      togglePopover(currencyPopover, currencyTrigger, currencySearch, currencyList, 'currency');
      renderCurrencyList();
    });

    currencySearch.addEventListener('input', renderCurrencyList);

    amountInput.addEventListener('input', () => {
      const raw = amountInput.value.replace(/[^0-9]/g, '');
      if (!raw) {
        amount = 0;
        updateAmountUI();
        return;
      }
      const num = Math.min(Number(raw), 9999999);
      amount = num;
      updateAmountUI();
    });

    $('#fx-form', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const r = getRate(currency);
      const activeRate = r ? (product === 'card' ? r.cardRate : r.notesRate) : 0;
      if (!amount || !activeRate) {
        showToast('Please select currency and enter amount.', 'destructive');
        return;
      }
      // Static demo behaviour:
      showToast('Static demo: wire this button to your lead API.', 'default');
    });

    // keep TAT fresh every minute
    setInterval(updateTatUI, 60000);

    // ---------- initial ----------
    ensureServiceableCity();
    ensureCurrencyExists();

    // set initial amount
    amountInput.value = Number(amount).toLocaleString('en-IN');

    updateAll();
  }


  function boot() {
      Promise.all([
        loadJson('./data/cities.json'),
        loadJson('./data/currencies.json'),
        loadJson('./data/rates.json')
      ])
        .then(([cities, currencies, rates]) => {
          setupWidget({ cities, currencies, ratesData: rates });
        })
        .catch((e) => {
          console.error(e);
          const root = document.getElementById(ROOT_ID);
          if (root) {
            root.innerHTML = `<div class=\"bg-white rounded-md border border-gray-200 p-4 text-sm text-red-600\">Failed to load widget data. Ensure this is served via a web server (e.g., GitHub Pages) and that ./data/*.json exist.</div>`;
          }
        });
    }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
