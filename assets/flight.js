/* ==========================================================================
   Simply Business Class, landing v2: behaviour.
   The form, the quote sheet, the claim switch and the video player live in sbc.js.

   Rules this file keeps (after Apple's "Designing Fluid Interfaces"):
   - The page scroll belongs to the device. No library smooths, pins or drives it,
     so wheel, trackpad and finger all keep their native momentum and rubber band.
   - Nothing is tied to the scroll position. Content appears once when it comes
     into view and then stays; a fast scroll or a jump can never leave it half done.
   - Galleries are native scroll rails with snap points: 1:1 under the finger,
     momentum from the OS, catchable mid-movement. The mouse gets the same by drag,
     released with its own velocity projected to the nearest slide.
   - Feedback on press, not on release.
   ========================================================================== */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = window.matchMedia('(min-width: 64rem)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;
  root.classList.add('js');

  /* ---- A native rail: which slide is centred, go to a slide, mouse drag --- */
  function rail(el, onActive) {
    var slides = Array.prototype.slice.call(el.children), now = -1;
    function set(i) { if (i === now || i < 0) return; now = i; slides.forEach(function (s, n) { s.classList.toggle('is-on', n === i); }); if (onActive) onActive(i, slides[i]); }
    function go(i, instant) {
      var s = slides[Math.max(0, Math.min(slides.length - 1, i))]; if (!s) return;
      var x = s.offsetLeft - (el.clientWidth - s.offsetWidth) / 2;
      el.scrollTo({ left: x, behavior: (instant || reduce) ? 'auto' : 'smooth' });
    }
    function nearest(x) {
      var best = 0, d = Infinity, mid = x + el.clientWidth / 2;
      slides.forEach(function (s, n) { var c = s.offsetLeft + s.offsetWidth / 2, dd = Math.abs(c - mid); if (dd < d) { d = dd; best = n; } });
      return best;
    }
    if (hasIO) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) set(slides.indexOf(e.target)); });
      }, { root: el, rootMargin: '0px -49% 0px -49%', threshold: 0 });
      slides.forEach(function (s) { io.observe(s); });
    }
    set(0);

    /* mouse: drag 1:1 from where it was grabbed, release with velocity, land on the projected slide */
    if (fine) {
      var down = false, x0 = 0, s0 = 0, moved = 0, hist = [];
      el.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; moved = 0; x0 = e.clientX; s0 = el.scrollLeft; hist = [{ x: e.clientX, t: performance.now() }];
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - x0; moved = Math.max(moved, Math.abs(dx));
        if (moved > 8) { el.classList.add('is-drag'); el.scrollLeft = s0 - dx; }
        hist.push({ x: e.clientX, t: performance.now() }); if (hist.length > 6) hist.shift();
      });
      window.addEventListener('pointerup', function () {
        if (!down) return; down = false;
        if (moved <= 8) return;
        var a = hist[0], b = hist[hist.length - 1], dt = Math.max(1, b.t - a.t);
        var v = -(b.x - a.x) / dt * 1000;                 /* px/s, in scroll direction */
        var proj = el.scrollLeft + (v / 1000) * 0.992 / (1 - 0.992); /* Apple's projection, snappier rate */
        var target = nearest(proj);
        el.classList.remove('is-drag');
        go(target);
      });
      el.addEventListener('click', function (e) { if (moved > 8) { e.preventDefault(); e.stopPropagation(); } }, true);
      el.addEventListener('dragstart', function (e) { e.preventDefault(); });
    }
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(now + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(now - 1); }
    });
    return { go: go, set: set, slides: slides };
  }

  /* ---- The seat gallery ---------------------------------------------------- */
  (function () {
    var el = $('.fl-seat-rail'), tabs = $$('.fl-tabs button'); if (!el) return;
    var r = rail(el, function (i) {
      tabs.forEach(function (b, n) { b.classList.toggle('is-on', n === i); b.setAttribute('aria-pressed', n === i ? 'true' : 'false'); });
    });
    tabs.forEach(function (b, i) { b.addEventListener('click', function () { r.go(i); }); });
  })();

  /* ---- Reviews ------------------------------------------------------------- */
  (function () { var el = $('.fl-notes-track'); if (el) { el.parentNode.classList.add('fl-rail-host'); railPlain($('.fl-notes-rail')); } })();
  function railPlain(el) {
    if (!el || !fine) return;
    var down = false, x0 = 0, s0 = 0, moved = 0;
    el.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = 0; x0 = e.clientX; s0 = el.scrollLeft; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - x0; moved = Math.max(moved, Math.abs(dx)); if (moved > 8) { el.classList.add('is-drag'); el.scrollLeft = s0 - dx; } });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; el.classList.remove('is-drag'); });
    el.addEventListener('click', function (e) { if (moved > 8) { e.preventDefault(); e.stopPropagation(); } }, true);
  }

  /* ---- The table: tap an object or an item, the lamp goes there ------------ */
  (function () {
    var fig = $('.fl-table-fig'), list = $('.fl-things'); if (!fig || !list) return;
    var items = Array.prototype.slice.call(list.children);
    items.forEach(function (li) { var p = $('p', li); if (p) p.innerHTML = '<span>' + p.innerHTML + '</span>'; });
    function light(i) {
      var li = items[i]; if (!li) return;
      items.forEach(function (o) { o.classList.toggle('is-on', o === li); });
      fig.style.setProperty('--sx', li.dataset.x + '%');
      fig.style.setProperty('--sy', li.dataset.y + '%');
      fig.classList.add('is-lit');
    }
    var r = null;
    if (!wide.matches) r = rail(list, function (i) { light(i); });
    items.forEach(function (li, i) {
      li.addEventListener('click', function (e) { if (e.target.closest('a')) return; light(i); if (r) r.go(i); });
      if (fine) li.addEventListener('pointerenter', function () { if (wide.matches) light(i); });
      li.addEventListener('focusin', function () { light(i); });
      /* the object itself is a target too */
      var hot = doc.createElement('button');
      hot.type = 'button'; hot.className = 'fl-hot';
      hot.style.left = li.dataset.x + '%'; hot.style.top = li.dataset.y + '%';
      hot.setAttribute('aria-label', ($('h3', li) || li).textContent);
      hot.addEventListener('click', function () { light(i); if (r) r.go(i); });
      if (fine) hot.addEventListener('pointerenter', function () { light(i); });
      fig.appendChild(hot);
    });
    light(0);
  })();

  /* ---- Living photographs: short silent loops, only when in view ----------- */
  (function () {
    var conn = navigator.connection || {};
    if (reduce || conn.saveData || !hasIO) return;
    $$('video[data-live]').forEach(function (v) {
      if (v.closest('.fl-hero') && !window.matchMedia('(min-width: 48rem)').matches) return; /* phone hero is a portrait still */
      v.addEventListener('playing', function () { v.classList.add('is-on'); });
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { if (!v.src) v.src = v.dataset.live; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          else if (v.src) { v.pause(); }
        });
      }, { rootMargin: '25% 0px 25% 0px' }).observe(v);
    });
  })();

  /* ---- The quote form: every field the CRM needs, visible at once ----------
     Same field names as Contact Form 7 form 5523 on simplybusinessclass.com.
     It sends through SBC.send (sbc.js, "CONNECT HERE"), the same function as the sheet.
     Multi-city needs more legs, so that choice opens the full sheet with what was typed. */
  (function () {
    var hosts = $$('[data-form]'); if (!hosts.length) return;
    var today = new Date(); today = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
    var countries = window.SBC_COUNTRIES || ['United States (+1)', 'Australia (+61)', 'United Kingdom (+44)'];
    var defC = (window.SBC && window.SBC.config && window.SBC.config.defaultCountry) || 'Australia (+61)';
    function esc(v) { return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
    function field(k, name, label, type, extra) { return '<div class="fl-fd fl-fd--' + (type === 'date' ? 'i' : 't') + '"><label for="' + k + name + '">' + label + '</label><input id="' + k + name + '" name="' + name + '" type="' + type + '" ' + (extra || '') + '></div>'; }
    function select(k, name, label, opts, def) {
      return '<div class="fl-fd fl-fd--t fl-fd--s"><label for="' + k + name + '">' + label + '</label><select id="' + k + name + '" name="' + name + '">' +
        opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (v === def ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>';
    }
    var forms = [];
    hosts.forEach(function (host) {
      var k = 'f' + host.dataset.form + '-';
      var form = doc.createElement('form');
      form.className = 'fl-f'; form.noValidate = true; form.setAttribute('aria-label', 'Request a free quote');
      form.innerHTML =
        '<div class="fl-f-top">' +
          '<fieldset class="fl-seg"><legend class="vh">Trip type</legend>' +
            ['One Way', 'Round Trip', 'Multi-City'].map(function (v) { return '<label><input type="radio" name="radio-trip-type" value="' + v + '"' + (v === 'Round Trip' ? ' checked' : '') + '><span>' + v.replace('Way', 'way').replace('Trip', 'trip').replace('-City', '-city') + '</span></label>'; }).join('') +
          '</fieldset>' +
          '<div class="fl-f-pair">' +
            select(k, 'num-pe', 'Travellers', [['1 Person', '1 traveller'], ['2 People', '2 travellers'], ['3 People', '3 travellers'], ['4 People', '4 travellers'], ['4+ People', 'More than 4']], '1 Person') +
            select(k, 'num-clas', 'Cabin', [['Business', 'Business'], ['First Class', 'First']], 'Business') +
          '</div>' +
        '</div>' +
        '<div class="fl-f-row fl-f-route">' +
          field(k, 'text-from-1', 'From', 'text', 'placeholder="From" autocomplete="off"') +
          field(k, 'text-to-1', 'To', 'text', 'placeholder="To" autocomplete="off"') +
          field(k, 'date-1', 'Depart', 'date', 'min="' + today + '"') +
          field(k, 'date-r1', 'Return', 'date', 'min="' + today + '"') +
        '</div>' +
        '<div class="fl-f-row fl-f-you">' +
          field(k, 'text-nm', 'Name', 'text', 'placeholder="Name" autocomplete="name"') +
          field(k, 'em-1', 'Email', 'email', 'placeholder="Email" autocomplete="email" inputmode="email"') +
          '<div class="fl-fd fl-fd--t fl-fd--phone"><label for="' + k + 'menu-zip">Country code</label><select id="' + k + 'menu-zip" name="menu-zip">' +
            countries.map(function (c) { var m = /^(.*) \((\+[\d-]+)\)$/.exec(c); return '<option value="' + esc(c) + '"' + (c === defC ? ' selected' : '') + '>' + esc(m ? m[2] + ' ' + m[1] : c) + '</option>'; }).join('') + '</select>' +
            '<label for="' + k + 'tl-cl">Phone</label><input id="' + k + 'tl-cl" name="tl-cl" type="tel" placeholder="Phone number" autocomplete="tel-national" inputmode="tel"></div>' +
        '</div>' +
        '<label class="fl-f-ok"><input type="checkbox" name="mailing-consent" value="yes"><span>Email me business class fare offers from Simply Business Class. You can unsubscribe at any time.</span></label>' +
        '<p class="fl-f-err" role="alert"></p>' +
        '<div class="fl-f-go"><button class="btn btn--big" type="submit">Get my free quote' +
          '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg></button>' +
          '<span>Free, no obligation. No payment details asked.</span></div>';
      var done = doc.createElement('div');
      done.className = 'fl-f-done'; done.hidden = true; done.setAttribute('role', 'status'); done.tabIndex = -1;
      host.appendChild(form); host.appendChild(done);
      forms.push(form);

      var el = function (n) { return form.elements[n]; };
      var trip = function () { return (form.querySelector('input[name="radio-trip-type"]:checked') || {}).value; };
      function values() {
        var o = {}; ['text-from-1', 'text-to-1', 'date-1', 'date-r1', 'text-nm', 'em-1', 'menu-zip', 'tl-cl', 'num-pe', 'num-clas'].forEach(function (n) { o[n] = (el(n).value || '').trim(); });
        o['radio-trip-type'] = trip(); o['mailing-consent'] = el('mailing-consent').checked ? 'yes' : ''; return o;
      }
      function syncTrip() {
        var t = trip(), r = el('date-r1');
        r.disabled = t === 'One Way'; r.closest('.fl-fd').classList.toggle('is-off', r.disabled);
        if (r.disabled) { r.value = ''; r.removeAttribute('aria-invalid'); }
        if (t === 'Multi-City' && window.SBC) {
          var v = values(), ctx = { trip: 'Multi-City', note: 'Multi-city trip' };
          ['text-from-1', 'text-to-1', 'date-1'].forEach(function (n) { if (v[n]) ctx[n] = v[n]; });
          window.SBC.open(ctx, form.querySelector('input[value="Multi-City"]'));
          form.querySelector('input[value="Round Trip"]').checked = true; syncTrip();
        }
      }
      form.addEventListener('change', function (e) {
        if (e.target.name === 'radio-trip-type') syncTrip();
        if (e.target.name === 'date-1' && e.target.value) el('date-r1').min = e.target.value;
      });
      /* what is typed in one copy of the form appears in the other */
      form.addEventListener('input', function (e) {
        var t = e.target; if (!t.name || t.type === 'radio') return;
        t.removeAttribute('aria-invalid');
        forms.forEach(function (o) { if (o === form || !o.elements[t.name]) return; if (t.type === 'checkbox') o.elements[t.name].checked = t.checked; else o.elements[t.name].value = t.value; });
      });
      var RULES = [
        ['text-from-1', function (v) { return v['text-from-1'] ? '' : 'Tell us where you are flying from.'; }],
        ['text-to-1', function (v) { return v['text-to-1'] ? '' : 'Tell us where you are flying to.'; }],
        ['date-1', function (v) { return !v['date-1'] ? 'Choose a departure date.' : (v['date-1'] < today ? 'The departure date is in the past.' : ''); }],
        ['date-r1', function (v) { return v['radio-trip-type'] !== 'Round Trip' ? '' : (!v['date-r1'] ? 'Choose a return date, or pick One way.' : (v['date-r1'] < v['date-1'] ? 'The return date is before the departure.' : '')); }],
        ['text-nm', function (v) { return v['text-nm'] ? '' : 'Add your name.'; }],
        ['em-1', function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v['em-1']) ? '' : 'Check the email address.'; }],
        ['tl-cl', function (v) { return v['tl-cl'].replace(/\D/g, '').length >= 6 ? '' : 'Add a phone number we can reach you on.'; }]
      ];
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = values(), first = null, msg = '';
        RULES.forEach(function (r) { var m = r[1](v), f = el(r[0]); if (m) { f.setAttribute('aria-invalid', 'true'); if (!first) { first = f; msg = m; } } else { f.removeAttribute('aria-invalid'); } });
        var err = form.querySelector('.fl-f-err'); err.textContent = msg;
        if (first) { first.focus(); return; }
        var btn = form.querySelector('button[type=submit]'); btn.setAttribute('aria-busy', 'true');
        try { v.utm_content = new URLSearchParams(location.search).get('utm_content') || ''; } catch (x) { v.utm_content = ''; }
        var send = (window.SBC && window.SBC.send) ? window.SBC.send(v) : Promise.resolve({ ok: false });
        send.then(function (res) {
          btn.removeAttribute('aria-busy');
          if (!res || !res.ok) { err.textContent = 'Sorry, that did not go through. Please try again, or call 1800 133 997.'; return; }
          /* LEAD EVENT: fire the Meta Pixel / Conversions API "Lead" here, once, after a confirmed send. */
          done.innerHTML = '<h3>Request received.</h3><p>' + esc(v['text-nm'].split(' ')[0]) + ', your request for ' + esc(v['text-from-1']) + ' to ' + esc(v['text-to-1']) +
            ' is with our advisors. We will reply to ' + esc(v['em-1']) + ' or call you within 24 hours.</p>' + (res.demo ? '<p class="fl-f-demo">Demonstration page: nothing was sent.</p>' : '');
          form.hidden = true; done.hidden = false; done.focus();
        });
      });
      syncTrip();
    });
  })();

  /* ---- Content arrives once as it comes into view, then stays --------------- */
  if (hasIO && !reduce) {
    root.classList.add('motion');
    var io = new IntersectionObserver(function (es) {
      var n = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--d', (n++ * 70) + 'ms');
        e.target.classList.add('is-in'); io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    $$('[data-rise]').forEach(function (el) { io.observe(el); });
    /* safety net: nothing may stay hidden */
    window.addEventListener('beforeprint', function () { $$('[data-rise]').forEach(function (el) { el.classList.add('is-in'); }); });
  }

  /* ---- The flight tracker: a passive read-out of how far down you are ------- */
  (function () {
    var bar = $('.fl-track'), phase = $('.fl-track-phase'), time = $('.fl-track-time'), end = $('.fl-quay');
    if (!bar || !end) return;
    root.classList.add('track');
    var TOTAL = 22 * 60 + 5; /* minutes, an ordinary Australia to Europe day; decorative */
    var secs = $$('[data-phase]'), ticking = false;
    function read() {
      ticking = false;
      var y = window.scrollY || 0, vh = window.innerHeight;
      var stop = end.getBoundingClientRect().top + y - vh * 0.45;
      var p = Math.max(0, Math.min(1, y / Math.max(1, stop)));
      bar.style.setProperty('--p', p.toFixed(4));
      var left = Math.round((1 - p) * TOTAL), h = Math.floor(left / 60), m = left % 60;
      time.textContent = left > 0 ? h + ' h ' + (m < 10 ? '0' : '') + m + ' min to landing' : 'Landed';
      bar.classList.toggle('is-on', p > 0.02 && p < 1);
      for (var i = secs.length - 1; i >= 0; i--) { if (secs[i].getBoundingClientRect().top < vh * 0.55) { phase.textContent = secs[i].dataset.phase; break; } }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(read); } }, { passive: true });
    window.addEventListener('resize', read);
    read();
  })();
})();
