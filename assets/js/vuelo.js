/*
 * Al Vuelo La Rioja · efectos de scroll de la portada
 * ------------------------------------------------------------------
 * Título letra a letra, vídeo que se abre, «Ven, siéntate y vuela»,
 * profundidad de las fotos, frase que se ilumina, lugares en 3D,
 * ruta de los pasos, aterrizaje y altímetro. El resto (menú, reserva,
 * WhatsApp, inclinación de tarjetas) lo hace main.js.
 */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smooth = function (t) { return t * t * (3 - 2 * t); };

  /* ---------- Título letra a letra ---------- */
  var ci = 0;
  $$('[data-chars]').forEach(function (line) {
    var text = line.textContent;
    line.textContent = '';
    text.split('').forEach(function (ch) {
      var s = doc.createElement('span');
      s.className = 'char';
      s.style.setProperty('--c', ci++);
      s.textContent = ch === ' ' ? ' ' : ch;
      line.appendChild(s);
    });
  });
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('is-loaded'); }); });

  /* ---------- Frase palabra a palabra ---------- */
  var words = [];
  $$('[data-words]').forEach(function (q) {
    var parts = q.textContent.split(/(\s+)/);
    q.textContent = '';
    parts.forEach(function (p) {
      if (/^\s+$/.test(p)) { q.appendChild(doc.createTextNode(p)); return; }
      var w = doc.createElement('span'); w.className = 'w'; w.textContent = p; q.appendChild(w); words.push(w);
    });
  });

  /* ---------- Vídeo del portal ---------- */
  var portal = $('.portal');
  var video = $('.portal__video');
  var vToggle = $('.video-toggle');
  var slow = (function () { var c = navigator.connection; return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))); })();
  if (video && !reduce.matches && !slow && 'IntersectionObserver' in window) {
    var loaded = false;
    new IntersectionObserver(function (en) {
      var on = en[0].isIntersecting;
      if (on && !loaded) { loaded = true; video.src = video.dataset.src; video.load(); }
      if (!loaded || video.dataset.userPaused) return;
      if (on) { var p = video.play(); if (p && p.catch) p.catch(function () {}); } else video.pause();
    }, { rootMargin: '300px 0px' }).observe(portal);
    video.addEventListener('playing', function () { video.classList.add('is-playing'); vToggle.classList.add('is-ready'); }, { once: true });
    vToggle.addEventListener('click', function () {
      var use = $('use', vToggle);
      if (video.paused) { video.play(); use.setAttribute('href', '#i-pause'); vToggle.setAttribute('aria-label', 'Pausar vídeo'); delete video.dataset.userPaused; }
      else { video.pause(); use.setAttribute('href', '#i-play'); vToggle.setAttribute('aria-label', 'Reproducir vídeo'); video.dataset.userPaused = '1'; }
    });
  }

  /* ---------- Contadores ---------- */
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window && !reduce.matches) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, end = parseInt(el.dataset.count, 10), t0 = performance.now(), dur = 1600;
        (function tick(now) {
          var t = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - t, 4);
          el.textContent = Math.round(end * e).toLocaleString('es-ES');
          if (t < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { c.textContent = '0'; cio.observe(c); });
  }

  /* ---------- Elementos que dependen del scroll ---------- */
  var lema = $('.lema'), lemaCards = $$('.lema__card'), lemaSteps = $$('.lema__step'), lemaMeter = $('.lema__meter');
  var depth = $('[data-depth]');
  var saying = $('.saying');
  var places = $('.places'), track = $('.places__track'), placeEls = $$('.place');
  var pilotPhoto = $('.pilot__photo');
  var tickets = $$('.ticket');
  var SIDES = [1, -1, 1]; // derecha, izquierda, derecha
  var route = $('.route'), routeSteps = $$('.route__steps li');
  var landing = $('.landing');
  var alti = $('.altimeter'), altiLinks = $$('.altimeter a'), altiRail = $('.altimeter__rail');
  var legTargets = altiLinks.map(function (a) { return $(a.getAttribute('href')); });

  /* Medidas: se toman al cargar y al cambiar el tamaño, nunca en cada fotograma */
  var vh = window.innerHeight, vw = window.innerWidth, trackW = 0, M = {}, placeC = [], placeImgs = [], ticketM = [], legTops = [], railH = 0;
  function absTop(el) { var r = el.getBoundingClientRect(); return { top: r.top + window.scrollY, h: r.height }; }
  function layout() {
    vh = window.innerHeight; vw = window.innerWidth;
    [['portal', portal], ['lema', lema], ['depth', depth], ['saying', saying], ['places', places], ['pilot', pilotPhoto], ['route', route], ['landing', landing]]
      .forEach(function (p) { if (p[1]) M[p[0]] = absTop(p[1]); });
    if (places && track) {
      trackW = track.scrollWidth;
      places.style.setProperty('--h', (vh + Math.max(0, trackW - vw) * 1.1) + 'px');
      M.places = absTop(places);
      placeC = placeEls.map(function (el) { return el.offsetLeft + el.offsetWidth / 2; });
      placeImgs = placeEls.map(function (el) { return el.querySelector('img'); });
    }
    ticketM = tickets.map(function (el) {
      var t = el.style.transform; el.style.transform = 'none';
      var m = absTop(el); el.style.transform = t; return m;
    });
    legTops = legTargets.map(function (t) { return t ? absTop(t).top : 0; });
    railH = altiRail ? altiRail.clientHeight : 0;
  }
  // progreso 0..1 de una sección «pegada» (más alta que la pantalla)
  function pinned(m, y) { return m ? clamp((y - m.top) / Math.max(1, m.h - vh), 0, 1) : 0; }
  // progreso 0..1 mientras una sección cruza la pantalla
  function passing(m, y) { return m ? clamp((y + vh - m.top) / (vh + m.h), 0, 1) : 0; }

  var lemaStep = -1, litCount = -1, legCur = -1, routeOn = -1;
  var ss = window.scrollY; // scroll suavizado (inercia ligera)
  var last = performance.now(), running = false;

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var sy = window.scrollY;
    var k = reduce.matches ? 1 : 1 - Math.exp(-dt * 13);
    ss += (sy - ss) * k;
    if (Math.abs(sy - ss) < 0.2) ss = sy;

    root.classList.toggle('is-flying', sy > vh * 0.6);

    if (portal) {
      var pp = pinned(M.portal, sy);
      portal.style.setProperty('--p', smooth(clamp(pp / 0.55, 0, 1)).toFixed(4));
      portal.style.setProperty('--t', clamp((pp - 0.5) / 0.25, 0, 1).toFixed(3));
    }

    if (lema) {
      var lp = pinned(M.lema, sy);
      lemaMeter.style.setProperty('--p', lp.toFixed(4));
      var step = Math.min(lemaSteps.length - 1, Math.floor(lp * lemaSteps.length * 0.999));
      if (step !== lemaStep) {
        lemaStep = step;
        [lemaCards, lemaSteps].forEach(function (list) {
          list.forEach(function (el, i) { el.classList.toggle('is-active', i === step); el.classList.toggle('is-past', i < step); });
        });
      }
    }

    if (depth) {
      var dp = passing(M.depth, ss);
      depth.style.setProperty('--d', ((dp - 0.5) * 2).toFixed(3));
      depth.style.setProperty('--a', smooth(clamp((dp - 0.2) / 0.35, 0, 1)).toFixed(3));
    }

    if (saying && words.length) {
      var lit = Math.round(clamp((passing(M.saying, sy) - 0.2) / 0.45, 0, 1) * words.length);
      if (lit !== litCount) { litCount = lit; words.forEach(function (w, i) { w.classList.toggle('is-lit', i < lit); }); }
    }

    if (places && track) {
      var shift = Math.max(0, trackW - vw) * pinned(M.places, ss);
      track.style.transform = 'translate3d(' + (-shift).toFixed(2) + 'px,0,0)';
      if (!reduce.matches) {
        for (var i = 0; i < placeEls.length; i++) {
          var dx = (placeC[i] - shift - vw / 2) / vw;
          if (Math.abs(dx) > 1.2) continue;
          placeEls[i].style.transform = 'rotateY(' + clamp(dx * -38, -30, 30).toFixed(2) + 'deg) translateZ(' + (-Math.abs(dx) * 160).toFixed(1) + 'px)';
          if (placeImgs[i]) placeImgs[i].style.transform = 'scale(1.12) translate3d(' + (dx * -6).toFixed(2) + '%,0,0)';
        }
      }
    }

    if (pilotPhoto) pilotPhoto.style.setProperty('--d', passing(M.pilot, ss).toFixed(3));

    // Tarjetas de vuelos: se van a un lado al alejarse del centro de la pantalla,
    // por arriba y por abajo, así que funciona igual al bajar y al subir
    if (tickets.length && !reduce.matches) {
      for (var j = 0; j < tickets.length; j++) {
        var tm = ticketM[j];
        // quieta mientras se ve entera; se desliza según la parte que ya ha salido de la pantalla
        var top = tm.top - ss, bottom = top + tm.h;
        if (bottom < -vh || top > vh * 2) continue;
        var margin = Math.min(60, vh * 0.06);
        var out = Math.max(0, margin - top, bottom - (vh - margin)) / tm.h;
        var e = clamp(out / 0.75, 0, 1);
        e = e * e * (3 - 2 * e);
        var side = SIDES[j % SIDES.length];
        tickets[j].style.transform = 'translate3d(' + (side * e * vw * 0.7).toFixed(1) + 'px,0,0) rotateY(' + (side * e * -16).toFixed(2) + 'deg) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))';
        tickets[j].style.opacity = (1 - e * 0.9).toFixed(3);
      }
    }

    if (route) {
      var rp = clamp((passing(M.route, ss) - 0.22) / 0.4, 0, 1);
      route.style.setProperty('--p', rp.toFixed(4));
      var on = rp === 1 ? routeSteps.length : Math.floor(rp * routeSteps.length + 0.98 - 0.02);
      if (on !== routeOn) { routeOn = on; routeSteps.forEach(function (li, i) { li.classList.toggle('is-on', i < on); }); }
    }

    if (landing && M.landing) {
      var l = clamp((M.landing.top - ss) / (vh * 0.85), 0, 1);
      landing.style.setProperty('--l', (reduce.matches ? 0 : smooth(l)).toFixed(4));
    }

    if (alti) {
      var total = doc.documentElement.scrollHeight - vh;
      var gp = clamp(ss / Math.max(1, total), 0, 1);
      alti.style.setProperty('--p', gp.toFixed(4));
      altiRail.style.setProperty('--y', (gp * railH).toFixed(1) + 'px');
      var cur = 0;
      legTops.forEach(function (t, i) { if (t - sy < vh * 0.5) cur = i; });
      if (cur !== legCur) {
        legCur = cur;
        altiLinks.forEach(function (a, i) {
          a.classList.toggle('is-current', i === cur);
          if (i === cur) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
        });
      }
    }

    // sigue animando mientras el valor suavizado no haya alcanzado al scroll real
    if (ss !== sy) requestAnimationFrame(frame); else running = false;
  }
  function request() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  layout(); request();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { layout(); request(); }, { passive: true });
  window.addEventListener('load', function () { layout(); request(); });
  if ('ResizeObserver' in window) {
    var rt; new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(function () { layout(); request(); }, 150); }).observe(doc.body);
  }
})();
