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
  var route = $('.route'), routeSteps = $$('.route__steps li');
  var landing = $('.landing');
  var alti = $('.altimeter'), altiLinks = $$('.altimeter a'), altiRail = $('.altimeter__rail');
  var legTargets = altiLinks.map(function (a) { return $(a.getAttribute('href')); });

  var vh = window.innerHeight, trackW = 0;
  function layout() {
    vh = window.innerHeight;
    if (places && track) {
      trackW = track.scrollWidth;
      var extra = Math.max(0, trackW - window.innerWidth);
      places.style.setProperty('--h', (vh + extra * 1.1) + 'px');
    }
  }

  // progreso 0..1 de una sección «pegada» (alto mayor que la pantalla)
  function pinned(el) {
    var r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
  }
  // progreso 0..1 mientras una sección cruza la pantalla
  function passing(el) {
    var r = el.getBoundingClientRect();
    return clamp((vh - r.top) / (vh + r.height), 0, 1);
  }

  var lemaStep = -1;
  function update() {
    ticking = false;
    var sy = window.scrollY;
    root.classList.toggle('is-flying', sy > vh * 0.6);

    if (portal) {
      var pp = pinned(portal);
      portal.style.setProperty('--p', smooth(clamp(pp / 0.55, 0, 1)).toFixed(4));
      portal.style.setProperty('--t', clamp((pp - 0.5) / 0.25, 0, 1).toFixed(3));
    }

    if (lema) {
      var lp = pinned(lema);
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
      var dp = passing(depth);
      depth.style.setProperty('--d', ((dp - 0.5) * 2).toFixed(3));
      depth.style.setProperty('--a', smooth(clamp((dp - 0.2) / 0.35, 0, 1)).toFixed(3));
    }

    if (saying && words.length) {
      var sp = clamp((passing(saying) - 0.2) / 0.45, 0, 1);
      var lit = Math.round(sp * words.length);
      words.forEach(function (w, i) { w.classList.toggle('is-lit', i < lit); });
    }

    if (places && track) {
      var plp = pinned(places);
      var shift = Math.max(0, trackW - window.innerWidth) * plp;
      track.style.transform = 'translate3d(' + (-shift).toFixed(1) + 'px,0,0)';
      if (!reduce.matches) {
        var cx = window.innerWidth / 2;
        placeEls.forEach(function (el) {
          var r = el.getBoundingClientRect();
          var dx = (r.left + r.width / 2 - cx) / window.innerWidth; // -1..1
          el.style.setProperty('--ry', clamp(dx * -38, -30, 30).toFixed(2) + 'deg');
          el.style.setProperty('--tz', (-Math.abs(dx) * 160).toFixed(1) + 'px');
          el.style.setProperty('--px', (dx * -6).toFixed(2) + '%');
        });
      }
    }

    if (pilotPhoto) pilotPhoto.style.setProperty('--d', passing(pilotPhoto).toFixed(3));

    if (route) {
      var rp = clamp((passing(route) - 0.22) / 0.4, 0, 1);
      route.style.setProperty('--p', rp.toFixed(4));
      routeSteps.forEach(function (li, i) { li.classList.toggle('is-on', rp >= i / routeSteps.length + 0.02 || rp === 1); });
    }

    if (landing) {
      var lr = landing.getBoundingClientRect();
      var l = clamp(lr.top / (vh * 0.85), 0, 1);
      landing.style.setProperty('--l', (reduce.matches ? 0 : smooth(l)).toFixed(4));
    }

    if (alti) {
      var total = doc.documentElement.scrollHeight - vh;
      var gp = clamp(sy / Math.max(1, total), 0, 1);
      alti.style.setProperty('--p', gp.toFixed(4));
      altiRail.style.setProperty('--y', (gp * altiRail.clientHeight).toFixed(1) + 'px');
      var cur = 0;
      legTargets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top < vh * 0.5) cur = i; });
      altiLinks.forEach(function (a, i) {
        a.classList.toggle('is-current', i === cur);
        if (i === cur) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      });
    }
  }

  var ticking = false;
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  layout(); update();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { layout(); request(); }, { passive: true });
  window.addEventListener('load', function () { layout(); request(); });
})();
