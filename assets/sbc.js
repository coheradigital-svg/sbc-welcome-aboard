/* ==========================================================================
   Simply Business Class landing pages: shared behaviour
   No network requests, no third parties, no tracking. GSAP and Lenis are
   optional: every feature below works without them.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. CONFIG. The only place the savings claim in the headline is set.
     ------------------------------------------------------------------------
     To run the headline test, change `claim` here, or set
     <html data-claim="40"> on a page, or open the page with ?claim=40.
       "none"   no percentage (default, safe for every visitor)
       "40"     "up to 40%"
       "50"     "up to 50%"   (as on simplybusinessclass.com today)
       "30-50"  "30 to 50%"   (as on simplybusinessclass.com today)
     Every element with class "claim" on the page receives the chosen line.
  ------------------------------------------------------------------------ */
  var CONFIG = {
    claim: 'none',
    claims: {
      'none': null, /* keeps the line written in the HTML */
      '40': 'For up to 40% less than the published fare.',
      '50': 'For up to 50% less than the published fare.',
      '30-50': 'For 30 to 50% less than the published fare.'
    },
    /* the matching sentence in the body copy (elements with class "claim-body") */
    claimsBody: {
      'none': null,
      '40': 'Savings run up to 40% on the published fare, depending on your route, your dates and how far ahead you ask.',
      '50': 'Savings run up to 50% on the published fare, depending on your route, your dates and how far ahead you ask.',
      '30-50': 'Savings run from 30 to 50% on the published fare, depending on your route, your dates and how far ahead you ask.'
    },
    defaultCountry: 'Australia (+61)'
  };

  /* ------------------------------------------------------------------------
     2. CONNECT HERE (for Georgi / K D at SBC)
     ------------------------------------------------------------------------
     This is a demonstration: nothing is sent anywhere. `payload` is a plain
     object whose keys are the SAME field names as the Contact Form 7 form on
     simplybusinessclass.com (form id 5523):
       radio-trip-type, text-from-1, text-to-1, date-1, date-r1,
       text-from-2, text-to-2, date-2, text-from-3, text-to-3, date-3,
       text-nm, em-1, menu-zip, tl-cl, num-pe, num-clas, utm_content
     Replace the body of this function with the POST to your own endpoint
     (the PHP handler that writes to the CRM) and resolve { ok: true } on
     success or { ok: false } on failure. Fire the Meta Pixel "Lead" event
     in the success branch below (search for LEAD EVENT).
  ------------------------------------------------------------------------ */
  function sendToSBC(payload) {
    return new Promise(function (resolve) {
      window.setTimeout(function () { resolve({ ok: true, demo: true, payload: payload }); }, 900);
    });
  }

  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  root.classList.add('js');

  /* ---- Claim variant ---------------------------------------------------- */
  (function () {
    var q = null;
    try { q = new URLSearchParams(location.search).get('claim'); } catch (e) {}
    var v = q || root.getAttribute('data-claim') || CONFIG.claim;
    if (!Object.prototype.hasOwnProperty.call(CONFIG.claims, v)) v = 'none';
    root.setAttribute('data-claim', v);
    var line = CONFIG.claims[v];
    if (line) $$('.claim').forEach(function (el) { el.textContent = line; });
    var body = CONFIG.claimsBody[v];
    if (body) $$('.claim-body').forEach(function (el) { el.textContent = body; });
  })();

  /* ---- Header state and flight progress --------------------------------- */
  var top = $('.top'), dock = $('.dock'), hero = $('.hero'), finale = $('.finale');
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || 0;
      var max = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
      root.style.setProperty('--flight', Math.min(1, y / max).toFixed(4));
      if (top) top.classList.toggle('is-stuck', y > 24);
      if (dock) {
        var pastHero = hero ? y > hero.offsetHeight * 0.7 : y > 400;
        var atFinale = finale ? finale.getBoundingClientRect().top < window.innerHeight * 0.55 : false;
        dock.classList.toggle('is-on', pastHero && !atFinale);
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---- Boarding: reveal on scroll --------------------------------------- */
  (function () {
    var items = $$('[data-board]');
    $$('[data-board-group]').forEach(function (g) {
      $$('[data-board]', g).forEach(function (el, i) { el.style.setProperty('--i', i); });
    });
    if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
    /* safety: nothing may stay hidden if the observer never fires (print, odd embeds) */
    window.addEventListener('beforeprint', function () { items.forEach(function (el) { el.classList.add('is-in'); }); });
  })();

  /* ---- The window: dusk sky above a cloud deck, drawn on canvas ---------- */
  (function () {
    var canvas = $('.window canvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d'), w = 0, h = 0, dpr = 1, clouds = [], stars = [], raf = 0, visible = true, last = 0, t0 = 0;
    function sprite(r, g, b) {
      var c = doc.createElement('canvas'); c.width = c.height = 128;
      var x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
      gr.addColorStop(0.45, 'rgba(' + r + ',' + g + ',' + b + ',0.55)');
      gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return c;
    }
    var sWarm = sprite(246, 190, 140), sRose = sprite(170, 130, 150), sBlue = sprite(52, 82, 132), sDeep = sprite(14, 28, 56);
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function build() {
      clouds = []; stars = []; seed = 7;
      var horizon = h * 0.66, n = Math.round(Math.max(26, Math.min(70, w / 22)));
      for (var i = 0; i < n; i++) {
        var depth = rnd();                       /* 0 far (at horizon) to 1 near (bottom) */
        var y = horizon + depth * depth * (h - horizon) * 1.05;
        var size = (0.10 + depth * 0.42) * Math.max(w, 700) * (0.6 + rnd() * 0.8);
        clouds.push({ x: rnd() * (w + size) - size / 2, y: y, sx: size, sy: size * (0.20 + rnd() * 0.12), depth: depth,
          sp: (4 + depth * 22) * (0.7 + rnd() * 0.6), a: 0.55 + rnd() * 0.4,
          img: depth < 0.16 ? sWarm : depth < 0.34 ? sRose : depth < 0.7 ? sBlue : sDeep });
      }
      clouds.sort(function (a, b) { return a.depth - b.depth; });
      for (var j = 0; j < Math.round(w / 14); j++) stars.push({ x: rnd() * w, y: rnd() * horizon * 0.62, r: 0.4 + rnd() * 1.1, p: rnd() * 6.28, s: 0.4 + rnd() * 1.4 });
    }
    function size() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); build(); draw(t0);
    }
    function draw(t) {
      var horizon = h * 0.66, g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#050d1d'); g.addColorStop(0.3, '#0c1f40'); g.addColorStop(0.52, '#213d6c');
      g.addColorStop(0.61, '#5d6f9a'); g.addColorStop(0.655, '#d99a78'); g.addColorStop(0.67, '#f2c591');
      g.addColorStop(0.70, '#6f6f95'); g.addColorStop(0.8, '#162a50'); g.addColorStop(1, '#070f20');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      /* last light on the horizon, right of centre */
      var sx = w * 0.72, sg = ctx.createRadialGradient(sx, horizon, 0, sx, horizon, Math.max(w, h) * 0.55);
      sg.addColorStop(0, 'rgba(255,214,160,0.75)'); sg.addColorStop(0.18, 'rgba(244,170,120,0.32)'); sg.addColorStop(1, 'rgba(244,170,120,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
      for (var j = 0; j < stars.length; j++) {
        var s = stars[j]; ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(s.p + t * 0.001 * s.s));
        ctx.fillStyle = '#eaf1ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      for (var i = 0; i < clouds.length; i++) {
        var c = clouds[i], span = w + c.sx, x = ((c.x - t * 0.001 * c.sp) % span + span) % span - c.sx / 2;
        ctx.globalAlpha = c.a; ctx.drawImage(c.img, x - c.sx / 2, c.y - c.sy / 2, c.sx, c.sy);
      }
      ctx.globalAlpha = 1;
    }
    function frame(t) {
      raf = 0; if (!visible) return;
      if (t - last > 32) { last = t; t0 = t; draw(t); }
      raf = window.requestAnimationFrame(frame);
    }
    function start() { if (!raf && !reduce && visible) raf = window.requestAnimationFrame(frame); }
    size();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 150); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }).observe(canvas);
    doc.addEventListener('visibilitychange', function () { visible = !doc.hidden; if (visible) start(); });
    start();
  })();

  /* ---- Video player: nothing loads until the visitor presses play -------- */
  $$('.pod-video').forEach(function (pod) {
    var v = $('video', pod), startBtn = $('.pv-start', pod), play = $('.pv-play', pod), mute = $('.pv-mute', pod),
      seek = $('.pv-seek', pod), time = $('.pv-time', pod), full = $('.pv-full', pod), idle;
    if (!v) return;
    function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
    function wake() { pod.classList.remove('is-idle'); clearTimeout(idle); if (!v.paused) idle = setTimeout(function () { pod.classList.add('is-idle'); }, 2600); }
    function toggle() { if (v.paused) v.play(); else v.pause(); }
    startBtn.addEventListener('click', function () {
      if (!v.getAttribute('src')) { v.src = v.getAttribute('data-src'); v.load(); }
      pod.classList.add('is-started'); v.muted = false;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      play.focus({ preventScroll: true });
    });
    play.addEventListener('click', toggle);
    v.addEventListener('click', toggle);
    v.addEventListener('play', function () { pod.classList.add('is-playing'); play.setAttribute('aria-label', 'Pause'); wake(); });
    v.addEventListener('pause', function () { pod.classList.remove('is-playing'); play.setAttribute('aria-label', 'Play'); wake(); });
    v.addEventListener('ended', function () { pod.classList.remove('is-started', 'is-playing'); v.currentTime = 0; });
    v.addEventListener('timeupdate', function () {
      var d = v.duration || 0, p = d ? (v.currentTime / d) * 100 : 0;
      seek.value = p; seek.style.setProperty('--p', p + '%');
      seek.setAttribute('aria-valuetext', fmt(v.currentTime) + ' of ' + fmt(d));
      time.textContent = fmt(v.currentTime) + ' / ' + fmt(d);
    });
    seek.addEventListener('input', function () { if (v.duration) v.currentTime = (seek.value / 100) * v.duration; seek.style.setProperty('--p', seek.value + '%'); });
    mute.addEventListener('click', function () { v.muted = !v.muted; pod.classList.toggle('is-muted', v.muted); mute.setAttribute('aria-label', v.muted ? 'Turn sound on' : 'Turn sound off'); });
    if (full) full.addEventListener('click', function () {
      if (doc.fullscreenElement) doc.exitFullscreen(); else if (pod.requestFullscreen) pod.requestFullscreen(); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    });
    ['pointermove', 'keydown', 'focusin', 'touchstart'].forEach(function (ev) { pod.addEventListener(ev, wake, { passive: true }); });
  });

  /* ---- The quote sheet --------------------------------------------------- */
  var TODAY = (function () { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); })();
  var arrow = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';

  function field(o) {
    var id = 'q-' + o.name, err = id + '-err';
    return '<div class="f' + (o.cls ? ' ' + o.cls : '') + '" data-field="' + o.name + '">' +
      '<label for="' + id + '">' + o.label + '</label>' +
      '<input id="' + id + '" name="' + o.name + '" type="' + (o.type || 'text') + '"' +
      (o.ac ? ' autocomplete="' + o.ac + '"' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') +
      (o.ph ? ' placeholder="' + o.ph + '"' : '') + (o.type === 'date' ? ' min="' + TODAY + '"' : '') +
      (o.req ? ' aria-required="true"' : '') + ' aria-describedby="' + err + '">' +
      '<span class="f-err" id="' + err + '" role="alert"></span></div>';
  }
  function seg(name, label, opts, checked) {
    return '<fieldset class="f no-tick" data-field="' + name + '"><legend>' + label + '</legend><div class="seg">' +
      opts.map(function (o) {
        return '<label><input type="radio" name="' + name + '" value="' + o[0] + '"' + (o[0] === checked ? ' checked' : '') + '>' + o[1] + '</label>';
      }).join('') + '</div><span class="f-err" id="q-' + name + '-err" role="alert"></span></fieldset>';
  }

  var sheet = doc.createElement('dialog');
  sheet.className = 'sheet';
  sheet.setAttribute('aria-labelledby', 'q-title');
  sheet.innerHTML =
    '<div class="sheet-panel">' +
      '<div class="sheet-head"><div><h2 id="q-title" tabindex="-1">Your free quote</h2><p id="q-sub">Two short steps. An advisor replies within 24 hours.</p></div>' +
        '<button class="sheet-x" type="button" aria-label="Close the quote form"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      '<ol class="sheet-prog" aria-hidden="true"><li class="is-on">1. Your trip</li><li>2. Your details</li></ol>' +
      '<form class="sheet-form" novalidate style="display:contents">' +
      '<div class="sheet-body">' +
        '<div class="step is-on" data-step="1" role="group" aria-label="Step 1 of 2: your trip">' +
          seg('radio-trip-type', 'Trip type', [['One Way', 'One way'], ['Round Trip', 'Round trip'], ['Multi-City', 'Multi-city']], 'Round Trip') +
          '<div class="f-row f-row--stack">' + field({ name: 'text-from-1', label: 'From', ph: 'City or airport', req: 1 }) + field({ name: 'text-to-1', label: 'To', ph: 'City or airport', req: 1 }) + '</div>' +
          '<div class="f-row f-row--stack">' + field({ name: 'date-1', label: 'Depart', type: 'date', req: 1, cls: 'no-tick' }) + field({ name: 'date-r1', label: 'Return', type: 'date', req: 1, cls: 'no-tick' }) + '</div>' +
          '<div class="leg" data-multi hidden><p>Flight 2</p><div class="f-row f-row--stack">' + field({ name: 'text-from-2', label: 'From', ph: 'City or airport' }) + field({ name: 'text-to-2', label: 'To', ph: 'City or airport' }) + '</div>' + field({ name: 'date-2', label: 'Depart', type: 'date', cls: 'no-tick' }) + '</div>' +
          '<div class="leg" data-multi hidden><p>Flight 3, if there is one</p><div class="f-row f-row--stack">' + field({ name: 'text-from-3', label: 'From', ph: 'City or airport' }) + field({ name: 'text-to-3', label: 'To', ph: 'City or airport' }) + '</div>' + field({ name: 'date-3', label: 'Depart', type: 'date', cls: 'no-tick' }) + '</div>' +
          seg('num-pe', 'Travellers', [['1 Person', '1'], ['2 People', '2'], ['3 People', '3'], ['4 People', '4'], ['4+ People', '4+']], '') +
          /* num-clas keeps both options of the live SBC form so the CRM receives the values it expects */
          seg('num-clas', 'Cabin', [['Business', 'Business'], ['First Class', 'First']], 'Business') +
        '</div>' +
        '<div class="step" data-step="2" role="group" aria-label="Step 2 of 2: your details">' +
          '<div class="summary"><span>Your trip</span><b id="q-sum"></b><span id="q-sum2"></span><button type="button" data-back>Change the trip</button></div>' +
          field({ name: 'text-nm', label: 'Name', ac: 'name', req: 1 }) +
          field({ name: 'em-1', label: 'Email', type: 'email', ac: 'email', mode: 'email', ph: 'name@example.com', req: 1 }) +
          '<div class="f-row f-row--phone">' +
            '<div class="f no-tick" data-field="menu-zip"><label for="q-menu-zip">Country code</label><select id="q-menu-zip" name="menu-zip" autocomplete="tel-country-code" aria-required="true"></select><span class="f-err" id="q-menu-zip-err" role="alert"></span></div>' +
            field({ name: 'tl-cl', label: 'Phone number', type: 'tel', ac: 'tel-national', mode: 'tel', req: 1 }) +
          '</div>' +
          '<input type="hidden" name="utm_content" value="">' +
        '</div>' +
        '<div class="step done" data-step="3" role="status" aria-live="polite">' +
          '<svg class="done-mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30"/><path d="M20 33l8 8 16-17"/></svg>' +
          '<h2 tabindex="-1" id="q-done-title">Request received.</h2>' +
          '<p class="soft" id="q-done-sub"></p>' +
          '<ol class="next">' +
            '<li><b>An advisor reads your request</b><span>A real person looks at your dates and your route before they contact you.</span></li>' +
            '<li><b>You hear from them within 24 hours</b><span>By phone or email, to go over the trip and anything the form could not ask.</span></li>' +
            '<li><b>You choose, or you don\'t</b><span>You see the options and the fare for each. The quote is free and there is nothing to pay until you decide to book.</span></li>' +
          '</ol>' +
          '<p class="soft">Rather talk now? Call <a class="textlink" href="tel:1800133997">1800 133 997</a>, Tuesday to Saturday, 6am to 5pm AEDT.</p>' +
          '<p class="demo-note">Demonstration page: this request was not sent anywhere.</p>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-foot">' +
        '<button class="btn btn--ghost" type="button" data-back hidden>Back</button>' +
        '<button class="btn btn--block only" type="submit" data-next><span>Continue</span>' + arrow + '</button>' +
        '<p class="sheet-reassure" id="q-reassure">Free quote. No payment details asked.</p>' +
      '</div>' +
      '</form>' +
    '</div>';
  doc.body.appendChild(sheet);

  var form = $('form', sheet), panel = $('.sheet-panel', sheet), stepNow = 1, lastTrigger = null, lenis = null;
  var sel = $('#q-menu-zip', sheet);
  (function () {
    var list = window.SBC_COUNTRIES || ['United States (+1)', 'Australia (+61)', 'United Kingdom (+44)'];
    var html = '';
    list.forEach(function (c) { html += '<option value="' + c.replace(/"/g, '&quot;') + '"' + (c === CONFIG.defaultCountry ? ' selected' : '') + '>' + c + '</option>'; });
    sel.innerHTML = html;
    try { var u = new URLSearchParams(location.search).get('utm_content'); if (u) form.elements['utm_content'].value = u; } catch (e) {}
  })();

  function val(name) { var el = form.elements[name]; if (!el) return ''; return (el.value !== undefined ? el.value : '').trim(); }
  function setVal(name, v) { var el = form.elements[name]; if (el && v) { el.value = v; } }
  function tripType() { return val('radio-trip-type'); }
  function niceDate(s) {
    if (!s) return ''; var p = s.split('-'); if (p.length !== 3) return s;
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  var RULES = {
    'text-from-1': function (v) { return v.length > 1 ? '' : 'Tell us the city or airport you are leaving from.'; },
    'text-to-1': function (v) { return v.length > 1 ? '' : 'Tell us where you are flying to.'; },
    'date-1': function (v) { return !v ? 'Choose a departure date.' : v < TODAY ? 'That date has passed. Choose a later one.' : ''; },
    'date-r1': function (v) {
      if (tripType() !== 'Round Trip') return '';
      return !v ? 'Choose a return date.' : (val('date-1') && v < val('date-1')) ? 'Your return is before your departure. Choose a later date.' : '';
    },
    'text-from-2': function (v) { return tripType() !== 'Multi-City' || v.length > 1 ? '' : 'Tell us where flight 2 leaves from.'; },
    'text-to-2': function (v) { return tripType() !== 'Multi-City' || v.length > 1 ? '' : 'Tell us where flight 2 goes.'; },
    'date-2': function (v) { return tripType() !== 'Multi-City' ? '' : !v ? 'Choose a date for flight 2.' : (val('date-1') && v < val('date-1')) ? 'Flight 2 is before flight 1. Choose a later date.' : ''; },
    'num-pe': function (v) { return v ? '' : 'Choose how many of you are travelling.'; },
    'text-nm': function (v) { return v.length > 1 ? '' : 'Enter your name, so your advisor knows who to ask for.'; },
    'em-1': function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter an email address like name@example.com.'; },
    'menu-zip': function (v) { return v ? '' : 'Choose your country code.'; },
    'tl-cl': function (v) { return v.replace(/\D/g, '').length >= 6 ? '' : 'Enter a phone number your advisor can reach you on.'; }
  };
  var STEP_FIELDS = { 1: ['text-from-1', 'text-to-1', 'date-1', 'date-r1', 'text-from-2', 'text-to-2', 'date-2', 'num-pe'], 2: ['text-nm', 'em-1', 'menu-zip', 'tl-cl'] };

  function check(name, quiet) {
    var box = $('[data-field="' + name + '"]', sheet); if (!box || box.closest('[hidden]')) return true;
    var msg = RULES[name] ? RULES[name](val(name)) : '';
    var input = $('input:not([type=radio]), select', box) || $('input', box), err = $('.f-err', box);
    if (msg && quiet) return false;
    box.classList.remove('has-error');
    if (msg) { void box.offsetWidth; box.classList.add('has-error'); box.classList.remove('is-ok'); err.textContent = msg; if (input) input.setAttribute('aria-invalid', 'true'); return false; }
    err.textContent = ''; if (input) input.removeAttribute('aria-invalid');
    box.classList.toggle('is-ok', !!val(name));
    return true;
  }
  function checkStep(n) {
    var firstBad = null;
    STEP_FIELDS[n].forEach(function (name) { if (!check(name) && !firstBad) firstBad = name; });
    if (firstBad) {
      var box = $('[data-field="' + firstBad + '"]', sheet), el = $('input, select', box);
      if (el) el.focus(); return false;
    }
    return true;
  }
  function syncTrip() {
    var t = tripType();
    $('[data-field="date-r1"]', sheet).hidden = t !== 'Round Trip';
    $$('[data-multi]', sheet).forEach(function (el) { el.hidden = t !== 'Multi-City'; });
    $('[data-field="text-from-1"] label', sheet).textContent = t === 'Multi-City' ? 'Flight 1 from' : 'From';
    $('[data-field="text-to-1"] label', sheet).textContent = t === 'Multi-City' ? 'Flight 1 to' : 'To';
  }
  function summary() {
    var t = tripType(), a = val('text-from-1'), b = val('text-to-1');
    var line = a + (t === 'Round Trip' ? ' ⇄ ' : ' → ') + b;
    if (t === 'Multi-City') { line += ' → ' + val('text-to-2'); if (val('text-to-3')) line += ' → ' + val('text-to-3'); }
    $('#q-sum', sheet).textContent = line;
    var pe = val('num-pe').replace(' People', ' travellers').replace(' Person', ' traveller');
    var cab = val('num-clas') === 'Business' ? 'business class' : val('num-clas').toLowerCase();
    $('#q-sum2', sheet).textContent = niceDate(val('date-1')) + (t === 'Round Trip' ? ' to ' + niceDate(val('date-r1')) : '') + ', ' + pe + ', ' + cab;
  }
  function go(n, dir) {
    stepNow = n;
    $$('.step', sheet).forEach(function (s) { var on = +s.getAttribute('data-step') === n; s.classList.toggle('is-on', on); s.style.setProperty('--dir', dir || 1); });
    var prog = $$('.sheet-prog li', sheet);
    prog[0].className = n === 1 ? 'is-on' : 'is-done'; prog[1].className = n >= 2 ? 'is-on' : '';
    $('.sheet-prog', sheet).hidden = n === 3;
    var next = $('[data-next]', sheet), back = $('.sheet-foot [data-back]', sheet);
    back.hidden = n !== 2; next.classList.toggle('only', n !== 2);
    $('span', next).textContent = n === 1 ? 'Continue' : n === 2 ? 'Send my request' : 'Back to the page';
    $('.arrow', next).style.display = n === 3 ? 'none' : '';
    $('#q-reassure', sheet).hidden = n === 3;
    $('#q-sub', sheet).hidden = n === 3;
    $('#q-title', sheet).textContent = n === 3 ? 'Thank you' : 'Your free quote';
    if (n === 2) summary();
    $('.sheet-body', sheet).scrollTop = 0;
    var target = n === 3 ? $('#q-done-title', sheet) : n === 2 ? form.elements['text-nm'] : null;
    if (target && (n === 3 || finePointer)) target.focus({ preventScroll: true });
    else if (n === 2) $('#q-title', sheet).focus({ preventScroll: true });
  }

  function openSheet(ctx, trigger) {
    ctx = ctx || {}; lastTrigger = trigger || doc.activeElement;
    if (stepNow === 3) resetForm();
    $$('.f.has-error', sheet).forEach(function (b) { b.classList.remove('has-error'); var i = $('input, select', b); if (i) i.removeAttribute('aria-invalid'); });
    ['text-from-1', 'text-to-1', 'date-1'].forEach(function (k) { if (ctx[k]) { setVal(k, ctx[k]); check(k, true) && check(k); } });
    if (ctx.trip) { $$('input[name="radio-trip-type"]', sheet).forEach(function (r) { r.checked = r.value === ctx.trip; }); }
    syncTrip();
    $('#q-sub', sheet).textContent = ctx.note || 'Two short steps. An advisor replies within 24 hours.';
    if (stepNow !== 2) go(1);
    if (typeof sheet.showModal === 'function') { if (!sheet.open) sheet.showModal(); } else sheet.setAttribute('open', '');
    if (lenis) lenis.stop();
    root.style.overflow = 'hidden';
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { sheet.classList.add('is-open'); }); });
    if (stepNow === 1) {
      var firstEmpty = ['text-from-1', 'text-to-1', 'date-1'].filter(function (k) { return !val(k); })[0];
      if (finePointer && firstEmpty) form.elements[firstEmpty].focus({ preventScroll: true });
      else $('#q-title', sheet).focus({ preventScroll: true });
    }
  }
  function closeSheet() {
    if (!sheet.open) return;
    sheet.classList.add('is-closing'); sheet.classList.remove('is-open');
    window.setTimeout(function () {
      sheet.classList.remove('is-closing'); sheet.close();
      root.style.overflow = ''; if (lenis) lenis.start();
      if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
    }, reduce ? 0 : 300);
  }
  function resetForm() {
    form.reset(); sel.value = CONFIG.defaultCountry;
    $$('.f', sheet).forEach(function (b) { b.classList.remove('is-ok', 'has-error'); });
    stepNow = 1; go(1);
  }

  sheet.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(); });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
  $('.sheet-x', sheet).addEventListener('click', closeSheet);
  $$('[data-back]', sheet).forEach(function (b) { b.addEventListener('click', function () { go(1, -1); }); });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'radio-trip-type') syncTrip();
    if (e.target.type === 'radio' || e.target.tagName === 'SELECT' || e.target.type === 'date') check(e.target.name);
  });
  form.addEventListener('focusout', function (e) { var n = e.target.name; if (n && RULES[n] && e.target.type !== 'radio' && val(n)) check(n); });
  form.addEventListener('input', function (e) { var box = e.target.closest('.f'); if (box && box.classList.contains('has-error')) check(e.target.name); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var next = $('[data-next]', sheet);
    if (stepNow === 1) { if (checkStep(1)) go(2, 1); return; }
    if (stepNow === 3) { closeSheet(); return; }
    if (!checkStep(2) || next.getAttribute('aria-busy') === 'true') return;
    var payload = {};
    ['radio-trip-type', 'text-from-1', 'text-to-1', 'date-1', 'date-r1', 'text-from-2', 'text-to-2', 'date-2', 'text-from-3', 'text-to-3', 'date-3', 'text-nm', 'em-1', 'menu-zip', 'tl-cl', 'num-pe', 'num-clas', 'utm_content'].forEach(function (k) { payload[k] = val(k); });
    next.setAttribute('aria-busy', 'true');
    sendToSBC(payload).then(function (res) {
      next.removeAttribute('aria-busy');
      if (!res || !res.ok) {
        $('#q-reassure', sheet).textContent = 'That did not go through. Please try again, or call 1800 133 997.';
        return;
      }
      /* LEAD EVENT: fire the Meta Pixel / Conversions API "Lead" here, once, after a confirmed send. */
      var first = payload['text-nm'].split(' ')[0];
      $('#q-done-sub', sheet).textContent = first + ', your request for ' + payload['text-from-1'] + ' to ' + payload['text-to-1'] + ' is with our advisors. We will reply to ' + payload['em-1'] + ' or call you on the number you gave.';
      go(3, 1);
    });
  });

  /* every [data-quote] control opens the same sheet and carries its context */
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-quote]'); if (!b) return;
    e.preventDefault();
    var ctx = {};
    if (b.dataset.to) ctx['text-to-1'] = b.dataset.to;
    if (b.dataset.from) ctx['text-from-1'] = b.dataset.from;
    if (b.dataset.note) ctx.note = b.dataset.note;
    var st = b.closest('.starter');
    if (st) $$('input', st).forEach(function (i) { if (i.value) ctx[i.name] = i.value.trim(); });
    openSheet(ctx, b);
  });
  $$('.starter').forEach(function (st) {
    st.addEventListener('submit', function (e) { e.preventDefault(); $('[data-quote]', st).click(); });
    $$('input[type=date]', st).forEach(function (i) { i.min = TODAY; });
  });

  /* press feedback on pointerdown, not on release */
  doc.addEventListener('pointerdown', function (e) { var b = e.target.closest('.btn'); if (b) { b.classList.add('is-pressed'); window.setTimeout(function () { b.classList.remove('is-pressed'); }, 160); } }, { passive: true });

  /* ---- Optional polish: Lenis smooth scroll and GSAP parallax ------------ */
  window.addEventListener('load', function () {
    if (reduce) return;
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (window.Lenis && finePointer) {
      try {
        lenis = new window.Lenis({ lerp: 0.16, wheelMultiplier: 1.05, smoothWheel: true, anchors: true });
        if (gsap && ST) { lenis.on('scroll', ST.update); gsap.ticker.add(function (t) { lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
        else { (function loop(t) { lenis.raf(t); window.requestAnimationFrame(loop); })(0); }
      } catch (err) { lenis = null; }
    }
    if (!gsap || !ST) return;
    gsap.registerPlugin(ST);
    if (hero) {
      gsap.to('.window canvas', { yPercent: 10, scale: 1.08, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-in', { yPercent: -6, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }
    if (window.innerWidth >= 1152) {
      $$('.moment').forEach(function (m, i) {
        gsap.fromTo(m, { y: 40 + i * 26 }, { y: -(i * 10), ease: 'none', scrollTrigger: { trigger: '.moments', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      });
    }
    $$('.sc').forEach(function (s) {
      gsap.fromTo(s, { opacity: 0.35 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: s, start: 'top 96%', end: 'top 66%', scrub: true } });
    });
  });

  /* small test hook, used by the automated checks only */
  window.SBC = { open: openSheet, close: closeSheet, config: CONFIG, send: sendToSBC };
})();
