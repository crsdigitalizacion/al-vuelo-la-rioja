/* Al Vuelo La Rioja · interacción (sin dependencias) */
(function () {
  'use strict';

  var CFG = window.ALVUELO || {};
  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* Año del pie */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* Datos legales desde config.js (si faltan, se señalan como pendientes) */
  var legal = CFG.legal || {};
  $$('[data-legal]').forEach(function (el) {
    var v = legal[el.dataset.legal];
    if (v) { el.textContent = v; return; }
    var row = el.closest('[data-legal-row]');
    if (row) { row.hidden = true; return; }
    el.textContent = 'pendiente de publicación';
    el.className = 'legal-pending';
  });

  /* WhatsApp: solo si la empresa ha confirmado el número en config.js */
  if (CFG.whatsapp) {
    var waText = encodeURIComponent('Hola, me gustaría consultar disponibilidad para un vuelo en paratrike.');
    $$('[data-whatsapp]').forEach(function (a) {
      a.href = 'https://wa.me/' + CFG.whatsapp + '?text=' + waText;
      a.hidden = false;
    });
    var bar = $('.mobile-bar');
    if (bar) bar.classList.add('has-wa');
  }

  /* ---------- Cabecera ---------- */
  var header = $('.site-header');
  var hero = $('.hero') || $('.page-hero');
  var mobileBar = $('.mobile-bar');
  var lastY = window.scrollY;
  var bookingVisible = false;
  var bookingSection = $('#reserva');
  if (bookingSection && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { bookingVisible = en[0].isIntersecting; onScrollHeader(); }, { threshold: 0.15 }).observe(bookingSection);
  }
  function onScrollHeader() {
    var y = window.scrollY;
    var threshold = hero ? hero.offsetHeight * 0.25 : 40;
    header.classList.toggle('is-solid', y > 40);
    var goingDown = y > lastY && y > threshold + 200;
    header.classList.toggle('is-hidden', goingDown && !root.classList.contains('menu-open'));
    // la barra de contacto se oculta mientras el formulario de reserva está en pantalla
    if (mobileBar) mobileBar.classList.toggle('is-visible', y > (hero ? hero.offsetHeight * 0.6 : 200) && !bookingVisible);
    lastY = y;
  }

  /* ---------- Menú móvil ---------- */
  var toggle = $('.menu-toggle');
  var menu = $('#mobile-menu');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', String(!open));
    ['main', '.site-footer', '.mobile-bar'].forEach(function (s) { var el = $(s); if (el) el.inert = open; });
    if (open) { header.classList.remove('is-hidden'); var first = $('a', menu); if (first) first.focus({ preventScroll: true }); }
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
    });
  }

  /* Enlace activo de la navegación */
  // en páginas interiores, se marca el enlace de la página actual
  var page = location.pathname.split('/').pop();
  if (page) $$('.nav a, .mobile-menu a').forEach(function (a) { if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page'); });
  var navLinks = $$('.nav a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navIO.observe(s); });
  }

  /* ---------- Revelado al hacer scroll ---------- */
  var revealEls = $$('.reveal, .reveal-img, .split-line');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Vídeo del hero ---------- */
  var video = $('.hero__video');
  var vToggle = $('.video-toggle');
  function connectionIsSlow() {
    var c = navigator.connection;
    return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  }
  if (video && !reduceMotion.matches && !connectionIsSlow()) {
    var src = window.innerWidth < 760 ? video.dataset.srcSmall : video.dataset.srcLarge;
    var startVideo = function () {
      video.src = src;
      video.load();
      var p = video.play();
      if (p && p.then) p.then(function () {}, function () {});
    };
    video.addEventListener('playing', function () {
      video.classList.add('is-playing');
      if (vToggle) vToggle.classList.add('is-ready');
    }, { once: true });
    // Se carga después del contenido principal para no competir con el LCP
    if (doc.readyState === 'complete') setTimeout(startVideo, 300);
    else window.addEventListener('load', function () { setTimeout(startVideo, 300); }, { once: true });

    if (vToggle) {
      vToggle.addEventListener('click', function () {
        var use = $('use', vToggle);
        if (video.paused) { video.play(); use.setAttribute('href', '#i-pause'); vToggle.setAttribute('aria-label', 'Pausar vídeo de fondo'); video.dataset.userPaused = ''; }
        else { video.pause(); use.setAttribute('href', '#i-play'); vToggle.setAttribute('aria-label', 'Reproducir vídeo de fondo'); video.dataset.userPaused = '1'; }
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (!video.src || video.dataset.userPaused) return;
        if (en[0].isIntersecting) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
        else video.pause();
      }).observe(video);
    }
  }

  /* ---------- Parallax y profundidad ---------- */
  var heroMedia = $('.hero__media');
  var heroHaze = $('.hero__haze');
  var heroInner = $('[data-tilt-hero]');
  var speedEls = $$('[data-speed]');
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var motionOK = !reduceMotion.matches;

  if (motionOK && finePointer.matches && hero) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      pointer.tx = (e.clientX - r.left) / r.width - 0.5;
      pointer.ty = (e.clientY - r.top) / r.height - 0.5;
    });
    hero.addEventListener('pointerleave', function () { pointer.tx = 0; pointer.ty = 0; });
  }

  var ticking = false;
  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    if (motionOK) {
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      var sy = window.scrollY;
      if (heroMedia && sy < vh * 1.2) {
        heroMedia.style.transform = 'translate3d(' + (pointer.x * -18) + 'px,' + (sy * 0.28 + pointer.y * -12) + 'px,0) scale(1.06)';
        if (heroHaze) heroHaze.style.transform = 'translate3d(' + (pointer.x * 34) + 'px,' + (sy * -0.12 + pointer.y * 16) + 'px,0)';
        if (heroInner) heroInner.style.transform = 'translate3d(0,' + (sy * 0.18) + 'px,0) rotateY(' + (pointer.x * 4) + 'deg) rotateX(' + (pointer.y * -3) + 'deg)';
        if (heroInner) heroInner.style.opacity = String(Math.max(0, 1 - sy / (vh * 0.75)));
      }
      speedEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var center = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (center * parseFloat(el.dataset.speed)).toFixed(1) + 'px,0)';
      });
      if (Math.abs(pointer.tx - pointer.x) > 0.001 || Math.abs(pointer.ty - pointer.y) > 0.001) requestTick();
    }
    updateMotto();
  }
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', function () { onScrollHeader(); updateMotto(); requestTick(); }, { passive: true });
  window.addEventListener('resize', requestTick, { passive: true });
  if (hero) hero.addEventListener('pointermove', requestTick, { passive: true });

  /* ---------- Ven · siéntate · y vuela ---------- */
  var motto = $('.motto__track');
  var mottoFrames = $$('.motto__frame');
  var mottoWords = $$('.motto__word');
  var mottoCaps = $$('.motto__caption');
  var mottoBars = $$('.motto__progress i');
  var mottoStep = -1;
  function updateMotto() {
    if (!motto) return;
    var r = motto.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    var p = Math.min(1, Math.max(0, -r.top / total));
    var steps = mottoFrames.length;
    var step = Math.min(steps - 1, Math.floor(p * steps));
    mottoBars.forEach(function (b, i) {
      var local = Math.min(1, Math.max(0, p * steps - i));
      b.style.setProperty('--p', local.toFixed(3));
    });
    if (step === mottoStep) return;
    mottoStep = step;
    [mottoFrames, mottoWords, mottoCaps].forEach(function (list) {
      list.forEach(function (el, i) {
        el.classList.toggle('is-active', i === step);
        el.classList.toggle('is-past', i < step);
      });
    });
  }

  /* ---------- Tarjetas con inclinación 3D ---------- */
  if (motionOK && finePointer.matches) {
    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    /* Brillo de los botones siguiendo el cursor */
    $$('.btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        btn.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- Reserva ---------- */
  var form = $('#booking-form');
  if (form) initBooking(form);

  function initBooking(form) {
    var paxInput = $('#pax', form);
    var paxOut = $('#pax-out', form);
    var MAX_PAX = 10;
    var fecha = $('#fecha', form);
    var today = new Date();
    var iso = function (d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
    if (fecha) fecha.min = iso(today);

    var note = $('#form-mode-note');
    if (note && CFG.formEndpoint) note.textContent = 'Te responderemos lo antes posible para confirmar día y hora.';

    function selected() { return $('input[name="vuelo"]:checked', form); }
    function fmtEUR(n) { return n.toLocaleString('es-ES') + ' €'; }
    function fmtDate(v) {
      if (!v) return 'A convenir';
      var p = v.split('-');
      return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long' });
    }
    function summary() {
      var v = selected();
      var pax = parseInt(paxInput.value, 10) || 1;
      var video = $('#video', form).checked;
      var gift = $('#regalo', form).checked;
      var price = v.dataset.price ? parseInt(v.dataset.price, 10) : null;
      var total = price === null ? null : (price + (video ? 15 : 0)) * pax;
      return {
        label: v.dataset.label + (gift ? ' (vale regalo)' : ''),
        video: video, pax: pax, gift: gift,
        fecha: fecha.value, franja: $('#franja', form).value,
        totalText: total === null ? 'A presupuestar' : fmtEUR(total)
      };
    }
    function render() {
      var s = summary();
      $('#s-vuelo').textContent = s.label;
      $('#s-video').textContent = s.video ? 'Sí (+15 € por vuelo)' : 'No';
      $('#s-pax').textContent = String(s.pax);
      $('#s-fecha').textContent = s.gift && !s.fecha ? 'Vale sin caducidad' : fmtDate(s.fecha) + (s.franja !== 'Me adapto' && s.fecha ? ' · ' + s.franja.toLowerCase() : '');
      var t = $('#s-total');
      t.textContent = s.totalText;
      t.style.fontSize = s.totalText.length > 8 ? '2rem' : '';
      $$('.stepper button', form).forEach(function (b) {
        b.disabled = (b.dataset.step === '-1' && s.pax <= 1) || (b.dataset.step === '1' && s.pax >= MAX_PAX);
      });
    }
    form.addEventListener('change', render);
    $$('.stepper button', form).forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Math.min(MAX_PAX, Math.max(1, (parseInt(paxInput.value, 10) || 1) + parseInt(b.dataset.step, 10)));
        paxInput.value = n; paxOut.textContent = n; render();
      });
    });

    /* Desde la página de vuelos llega ?vuelo=20|40|carta y se preselecciona */
    var wanted = new URLSearchParams(location.search).get('vuelo');
    var wantedInput = wanted && $('input[name="vuelo"][value="' + wanted.replace(/[^a-z0-9]/gi, '') + '"]', form);
    if (wantedInput) wantedInput.checked = true;

    /* Los botones de las tarjetas preseleccionan el vuelo */
    $$('[data-flight]').forEach(function (a) {
      a.addEventListener('click', function () {
        var input = $('input[name="vuelo"][value="' + a.dataset.flight + '"]', form);
        if (input) { input.checked = true; render(); }
      });
    });

    /* Validación */
    var rules = {
      nombre: function (v) { return v.trim().length >= 2 ? '' : 'Escribe tu nombre para que sepamos a quién llamar.'; },
      telefono: function (v) { return /^[+()\d\s.-]{9,}$/.test(v.trim()) && v.replace(/\D/g, '').length >= 9 ? '' : 'Introduce un teléfono válido (mínimo 9 cifras).'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Introduce un email válido, por ejemplo nombre@correo.com.'; },
      fecha: function (v) { return !v || v >= iso(today) ? '' : 'Elige una fecha a partir de hoy.'; }
    };
    function check(name) {
      var input = form.elements[name];
      var msg = rules[name](input.value);
      var field = input.closest('.field');
      field.classList.toggle('has-error', !!msg);
      input.setAttribute('aria-invalid', String(!!msg));
      $('#' + name + '-error').textContent = msg;
      return !msg;
    }
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      input.addEventListener('blur', function () { if (input.value) check(name); });
      input.addEventListener('input', function () { if (input.closest('.field').classList.contains('has-error')) check(name); });
    });
    function checkPrivacy() {
      var ok = $('#privacidad', form).checked;
      $('#privacidad-wrap').classList.toggle('has-error', !ok);
      $('#privacidad', form).setAttribute('aria-invalid', String(!ok));
      $('#privacidad-error').textContent = ok ? '' : 'Necesitamos tu conformidad para responder a la solicitud.';
      return ok;
    }
    $('#privacidad', form).addEventListener('change', checkPrivacy);

    var status = $('#form-status');
    function showStatus(kind, html, moveFocus) {
      status.className = 'form-status is-visible form-status--' + kind;
      status.innerHTML = html;
      if (moveFocus === false) return;
      status.focus({ preventScroll: true });
      status.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
    }

    function buildMessage(s) {
      var f = form.elements;
      return [
        'Hola, me gustaría solicitar un vuelo:',
        '',
        '· Vuelo: ' + s.label,
        '· Vídeo y fotos: ' + (s.video ? 'Sí' : 'No'),
        '· Número de vuelos: ' + s.pax,
        '· Fecha preferida: ' + (s.fecha ? fmtDate(s.fecha) : 'A convenir'),
        '· Franja: ' + s.franja,
        '· Total estimado: ' + s.totalText.replace(' ', ' '),
        '',
        'Nombre: ' + f.nombre.value.trim(),
        'Teléfono: ' + f.telefono.value.trim(),
        'Email: ' + f.email.value.trim(),
        f.mensaje.value.trim() ? '\nMensaje: ' + f.mensaje.value.trim() : ''
      ].join('\n');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = ['nombre', 'telefono', 'email', 'fecha'].map(check).every(Boolean);
      ok = checkPrivacy() && ok;
      if (!ok) {
        showStatus('error', 'Revisa los campos marcados para poder enviar tu solicitud.', false);
        var firstBad = $('[aria-invalid="true"]', form);
        if (firstBad) firstBad.focus();
        return;
      }
      var s = summary();
      var body = buildMessage(s);
      var subject = 'Solicitud de vuelo · ' + s.label;
      var btn = $('button[type="submit"]', form);

      if (CFG.formEndpoint) {
        btn.setAttribute('aria-busy', 'true');
        var data = new FormData(form);
        data.append('resumen', body);
        data.append('_subject', subject);
        fetch(CFG.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error(r.status); })
          .then(function () {
            form.reset(); paxInput.value = 1; paxOut.textContent = '1'; render();
            showStatus('ok', '<strong>¡Solicitud enviada!</strong> Miguel Ángel te contactará para confirmar el día y la hora según la meteorología.');
          })
          .catch(function () {
            showStatus('error', 'No hemos podido enviar la solicitud. Llámanos al <a href="tel:+34629309090">629 30 90 90</a> o escribe a <a href="mailto:' + CFG.email + '">' + CFG.email + '</a>.');
          })
          .then(function () { btn.removeAttribute('aria-busy'); });
      } else {
        var href = 'mailto:' + (CFG.email || 'info@alvuelolarioja.com') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        window.location.href = href;
        showStatus('ok', '<strong>Tu solicitud está lista.</strong> Se ha abierto tu aplicación de correo con el mensaje redactado: solo tienes que pulsar enviar. Si no se ha abierto, escríbenos a <a href="mailto:' + (CFG.email || 'info@alvuelolarioja.com') + '">' + (CFG.email || 'info@alvuelolarioja.com') + '</a> o llama al <a href="tel:+34629309090">629 30 90 90</a>.');
      }
    });
    render();
  }

  /* ---------- Pestañas de galería ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = $('#' + t.getAttribute('aria-controls'));
      panel.hidden = !on;
      // al ocultar los vídeos, se detiene el que estuviera sonando
      if (!on) $$('iframe', panel).forEach(function (f) { if (f._button) f.replaceWith(f._button); });
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next); next.focus();
    });
  });

  /* ---------- Vídeos de YouTube bajo demanda (sin cookies hasta pulsar) ---------- */
  $$('[data-yt]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = doc.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.dataset.yt + '?autoplay=1&rel=0';
      f.title = b.getAttribute('aria-label').replace('Reproducir vídeo: ', '');
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f._button = b;
      b.replaceWith(f);
    });
  });

  /* ---------- Lightbox ---------- */
  var lb = $('#lightbox');
  var items = $$('[data-gallery] button[data-full]');
  if (lb && items.length) {
    var lbImg = $('#lb-img'), lbCap = $('#lb-caption'), lbCount = $('#lb-count');
    var current = 0, opener = null;
    var show = function (i) {
      current = (i + items.length) % items.length;
      var b = items[current];
      var img = $('img', b);
      lbImg.src = b.dataset.full;
      lbImg.alt = img.alt;
      lbCap.textContent = b.parentNode.querySelector('figcaption').textContent;
      lbCount.textContent = (current + 1) + ' / ' + items.length;
      // reinicia la animación de entrada
      lbImg.style.animation = 'none'; void lbImg.offsetWidth; lbImg.style.animation = '';
    };
    var open = function (i) {
      opener = items[i];
      show(i);
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
      root.style.overflow = 'hidden';
    };
    var close = function () {
      if (typeof lb.close === 'function') lb.close(); else lb.removeAttribute('open');
    };
    lb.addEventListener('close', function () { root.style.overflow = ''; if (opener) opener.focus(); });
    items.forEach(function (b, i) { b.addEventListener('click', function () { open(i); }); });
    lb.addEventListener('click', function (e) {
      var act = e.target.closest('[data-lb]');
      if (act) {
        if (act.dataset.lb === 'close') close();
        if (act.dataset.lb === 'prev') show(current - 1);
        if (act.dataset.lb === 'next') show(current + 1);
      } else if (e.target === lb || e.target.classList.contains('lightbox__stage')) close();
    });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(current + 1);
      if (e.key === 'ArrowLeft') show(current - 1);
    });
    var startX = null;
    lb.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  onScrollHeader();
  requestTick();
})();
