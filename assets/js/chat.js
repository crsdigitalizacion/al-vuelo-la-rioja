/*
 * Al Vuelo La Rioja · asistente de preguntas
 * ------------------------------------------------------------------
 * Asistente automático por palabras clave: no usa ningún servicio externo
 * ni inteligencia artificial. Solo responde con información publicada por
 * la empresa; si no reconoce la pregunta, ofrece llamar o escribir.
 * Para añadir o cambiar respuestas, edita la lista INTENTS.
 */
(function () {
  'use strict';

  var CFG = window.ALVUELO || {};
  var PHONE = CFG.phoneDisplay || '629 30 90 90';
  var TEL = 'tel:+34' + (CFG.phone || '629309090');
  var EMAIL = CFG.email || 'info@alvuelolarioja.com';
  var doc = document;

  var callLink = '<a href="' + TEL + '">' + PHONE + '</a>';
  var mailLink = '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>';

  // Cada intención: palabras clave (sin tildes, en minúscula) y respuesta en HTML
  var INTENTS = [
    {
      id: 'reservar', label: 'Cómo reservar',
      keys: ['reserv', 'cita', 'apunt', 'contratar', 'quiero volar', 'disponib', 'fecha libre', 'hueco'],
      answer: 'Puedes reservar de tres formas:<ul><li>Desde el <a href="./#reserva">formulario de reserva</a>.</li><li>Llamando a Miguel Ángel al ' + callLink + '.</li><li>Escribiendo a ' + mailLink + '.</li></ul>Se atiende de lunes a domingo, de 9:00 a 20:00. Las salidas por día son limitadas, así que conviene reservar con unos días de antelación.'
    },
    {
      id: 'precio', label: 'Precios',
      keys: ['precio', 'cuesta', 'cuanto vale', 'cuanto es', 'tarifa', 'euro', 'barato', 'coste', 'cobr', 'presupuesto'],
      answer: 'Según la tarifa publicada por Al Vuelo:<ul><li>Vuelo de 20 minutos: <b>85 €</b> por persona.</li><li>Vuelo de 40 minutos: <b>130 €</b> por persona.</li><li>Vídeo y fotos del vuelo: <b>+15 €</b>.</li><li>Vuelos a la carta: presupuesto a medida.</li></ul>El precio final se confirma al reservar. <a href="vuelos.html">Ver vuelos y precios</a>.'
    },
    {
      id: 'duracion', label: 'Duración',
      keys: ['dura', 'cuanto tiempo', 'minuto', 'hora de vuelo', 'largo'],
      answer: 'El vuelo dura <b>20 o 40 minutos</b>, según la modalidad. A eso se suma la preparación en tierra, que el piloto te indica al concretar la reserva. Si quieres algo más largo, el paratrike tiene una autonomía aproximada de 2 h 30 min: pide presupuesto para un vuelo a la carta.'
    },
    {
      id: 'ropa', label: 'Qué llevar',
      keys: ['ropa', 'llevar', 'vestir', 'calzado', 'zapat', 'frio', 'abrig', 'chancla', 'casco', 'guante'],
      answer: 'Ven con <b>ropa deportiva de abrigo</b> y <b>calzado cerrado</b> (zapatillas o botas de montaña; nunca chanclas). El casco y los guantes los pone el piloto. En el aire hace más frío que en tierra, así que mejor sal bien abrigado.'
    },
    {
      id: 'experiencia', label: '¿Necesito experiencia?',
      keys: ['experiencia', 'curso', 'nunca he', 'primera vez', 'saber volar', 'forma fisica', 'condicion fisica', 'preparacion fisica'],
      answer: 'No necesitas experiencia ni ningún curso, ni una condición física concreta. El piloto lleva el paratrike y tú vas sentado detrás disfrutando del vuelo.'
    },
    {
      id: 'requisitos', label: 'Edad y requisitos',
      keys: ['edad', 'anos', 'nino', 'nina', 'menor', 'hijo', 'peso', 'kilo', 'altura', 'mido', 'discapac', 'silla de ruedas', 'mayor', 'abuel', 'embaraz', 'requisit'],
      answer: 'Al Vuelo explica que en el paratrike puede volar casi cualquier persona, sin importar su edad, su condición física o su estatura, también personas con discapacidad, y que el motor tiene potencia de sobra para cualquier peso.<br><br>Si es para un menor o tienes dudas sobre tu caso, coméntalo con el piloto al reservar: ' + callLink + '.'
    },
    {
      id: 'meteo', label: 'Si hace mal tiempo',
      keys: ['mal tiempo', 'meteo', 'lluvia', 'llueve', 'viento', 'nubl', 'tormenta', 'cancel', 'aplaz', 'cambiar la fecha', 'cambiar fecha', 'clima'],
      answer: 'El vuelo depende siempre de la meteorología. Si el viento u otras condiciones no permiten volar el día previsto, <b>se vuela otro día acordado entre ambas partes</b>. Por seguridad, la empresa puede modificar la ruta o cancelar el vuelo si fuera necesario.'
    },
    {
      id: 'despues', label: 'Después de reservar',
      keys: ['despues de', 'confirm', 'que pasa cuando', 'me llama', 'respuesta', 'cuando me'],
      answer: 'Cuando envías tu solicitud, Miguel Ángel se pone en contacto contigo para concretar <b>día, hora y lugar de salida</b> según la previsión meteorológica, y te da las indicaciones para el día del vuelo. La reserva queda cerrada cuando lo acordáis.'
    },
    {
      id: 'donde', label: '¿Dónde se vuela?',
      keys: ['donde', 'lugar', 'zona', 'ubicacion', 'direccion', 'despeg', 'logrono', 'sitio', 'pueblo', 'sobrevol', 'mapa'],
      answer: 'La mayoría de los vuelos se hacen por las <b>inmediaciones de Logroño</b>, desde el lugar de salida habitual, que te indicamos al confirmar la reserva. Como el paratrike despega desde cualquier terreno llano, también se puede plantear volar sobre una población concreta: consúltalo y te dirán si es posible.'
    },
    {
      id: 'regalo', label: 'Regalar un vuelo',
      keys: ['regal', 'vale', 'cumple', 'sorpresa', 'aniversario', 'bono', 'tarjeta regalo'],
      answer: 'Sí, puedes regalar un vuelo. El vale es para <b>una persona</b>, <b>no caduca</b> y es válido una vez abonado; el vuelo puede ser de 20 o 40 minutos. <a href="regalo-parapente-la-rioja.html">Ver el vale regalo</a>.'
    },
    {
      id: 'movil', label: 'Móvil, fotos y vídeo',
      keys: ['movil', 'camara', 'gopro', 'grabar', 'foto', 'video', 'recuerdo', 'telefono en vuelo'],
      answer: 'Durante el vuelo <b>no se pueden llevar móviles ni cámaras</b>: cualquier objeto que cayera podría causar lesiones graves. Si quieres un recuerdo, puedes contratar el <b>vídeo y las fotos del vuelo por 15 €</b>, grabados con una cámara de 180º. Pídelo al reservar o al piloto antes de despegar.'
    },
    {
      id: 'paratrike', label: '¿Qué es un paratrike?',
      keys: ['que es', 'paratrike', 'trike', 'diferencia', 'paramotor', 'motor', 'como funciona', 'parapente'],
      answer: 'Un paratrike es un <b>parapente biplaza con un carro y un motor</b>. Gracias a la hélice despega desde un terreno llano, sin necesidad de ladera, y el vuelo es estable y cómodo. Vas sentado detrás del piloto, con 180º de visión. <a href="que-es-un-paratrike.html">Más sobre el paratrike</a>.'
    },
    {
      id: 'seguridad', label: 'Seguridad',
      keys: ['segur', 'peligro', 'riesgo', 'miedo', 'homolog', 'titulac', 'licencia', 'paracaidas', 'accidente'],
      answer: 'Todo el equipo está <b>homologado</b>: el trike, el parapente, el paracaídas de emergencia y los cascos con intercomunicador. La actividad cuenta con las titulaciones pertinentes y con <b>seguro de responsabilidad civil y de accidentes</b>, y la empresa está registrada en Turismo La Rioja (TA-LR-32). Si la meteorología no acompaña, no se vuela.'
    },
    {
      id: 'piloto', label: 'El piloto',
      keys: ['piloto', 'miguel', 'quien', 'instructor', 'cuantos anos lleva'],
      answer: 'Tu piloto es <b>Miguel Ángel Ordóñez Molina</b>. Vuela desde 1994: empezó con siete años de vuelo libre en parapente y después se formó como piloto PL2 (trike biplaza con motor). Acumula más de 1.500 horas de vuelo por toda España.'
    },
    {
      id: 'personas', label: '¿Podemos volar dos?',
      keys: ['dos personas', 'juntos', 'pareja', 'amigos', 'grupo', 'familia', 'cuantas personas', 'acompan', 'despedida'],
      answer: 'El paratrike es <b>biplaza</b>: vuelan el piloto y un pasajero, así que cada vuelo es para una persona. Si sois varios, podéis reservar varios vuelos; en el formulario indicas el número. Las salidas por día son limitadas, así que para grupos es mejor consultarlo antes: ' + callLink + '.'
    },
    {
      id: 'pago', label: 'Forma de pago',
      keys: ['pagar', 'pago', 'tarjeta', 'bizum', 'efectivo', 'transferencia', 'senal', 'adelant'],
      answer: 'La forma de pago no está publicada en la web. Consúltala con Miguel Ángel al reservar: ' + callLink + ' o ' + mailLink + '.'
    },
    {
      id: 'contacto', label: 'Contacto',
      keys: ['telefono', 'contact', 'llamar', 'email', 'correo', 'horario', 'whatsapp', 'hablar con'],
      answer: function () {
        return 'Puedes hablar directamente con el piloto, Miguel Ángel:<ul><li>Teléfono: ' + callLink + '</li><li>Email: ' + mailLink + '</li>' +
          (CFG.whatsapp ? '<li><a href="https://wa.me/' + CFG.whatsapp + '" target="_blank" rel="noopener">WhatsApp</a></li>' : '') +
          '</ul>Horario de reservas: lunes a domingo, de 9:00 a 20:00.';
      }
    },
    {
      id: 'hora', label: '¿A qué hora se vuela?',
      keys: ['a que hora', 'que hora', 'manana', 'tarde', 'atardecer', 'amanecer', 'cuando se vuela', 'epoca', 'invierno', 'verano'],
      answer: 'Normalmente se vuela a <b>primera hora de la mañana o a última de la tarde</b>, que es cuando las condiciones son más tranquilas y agradables. La hora exacta se acuerda con el piloto según la previsión.'
    }
  ];

  var SMALLTALK = [
    { keys: ['hola', 'buenas', 'buenos dias', 'hey', 'saludos'], answer: '¡Hola! ¿En qué te puedo ayudar? Puedes preguntarme por precios, cómo reservar, qué llevar o qué pasa si hace mal tiempo.' },
    { keys: ['gracias', 'genial', 'perfecto', 'vale', 'ok'], answer: '¡A ti! Si quieres, puedes <a href="./#reserva">reservar tu vuelo</a> o llamar al ' + callLink + '. ¡Nos vemos en el aire!' }
  ];

  var FALLBACK = 'No tengo una respuesta segura para eso. Para no darte información incorrecta, lo mejor es que lo consultes directamente con Miguel Ángel: ' + callLink + ' o ' + mailLink + ' (lunes a domingo, de 9:00 a 20:00).';

  var SUGGESTED = ['precio', 'reservar', 'ropa', 'requisitos', 'meteo', 'regalo'];

  function norm(s) {
    return (' ' + s + ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ');
  }

  function match(text) {
    var q = norm(text);
    var best = null, bestScore = 0;
    INTENTS.forEach(function (it) {
      var score = 0;
      it.keys.forEach(function (k) { if (q.indexOf(k) !== -1) score += k.length > 5 ? 2 : 1; });
      if (score > bestScore) { bestScore = score; best = it; }
    });
    if (best) return best;
    for (var i = 0; i < SMALLTALK.length; i++) {
      if (SMALLTALK[i].keys.some(function (k) { return q.indexOf(' ' + k + ' ') !== -1; })) return SMALLTALK[i];
    }
    return null;
  }

  function byId(id) { for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].id === id) return INTENTS[i]; }
  function answerOf(it) { return typeof it.answer === 'function' ? it.answer() : it.answer; }

  /* ---------- Interfaz ---------- */
  var root = doc.createElement('div');
  root.className = 'assist';
  root.innerHTML =
    '<p class="assist__nudge" hidden>¿Tienes dudas? <b>Pregúntame</b></p>' +
    '<button class="assist__fab" type="button" aria-expanded="false" aria-controls="assist-panel" aria-label="Abrir asistente de preguntas">' +
      '<svg class="assist__ico-open" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M8 12h.01M12 12h.01M16 12h.01"/></svg>' +
      '<svg class="assist__ico-close" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M18 6 6 18M6 6l12 12"/></svg>' +
    '</button>' +
    '<section class="assist__panel" id="assist-panel" role="dialog" aria-modal="false" aria-labelledby="assist-title" hidden>' +
      '<header class="assist__head">' +
        '<span class="assist__avatar" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M12 33c9-11 20-20 34-25-2 11-6 21-12 28-6-3-14-4-22-3z" fill="#f39a1e"/><path d="M52 31c-9 11-20 20-34 25 2-11 6-21 12-28 6 3 14 4 22 3z" fill="#2ea3dc"/></svg></span>' +
        '<div><h2 id="assist-title">Asistente de Al Vuelo</h2><p>Respuestas rápidas sobre tu vuelo</p></div>' +
        '<button class="assist__x" type="button" aria-label="Cerrar asistente"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '</header>' +
      '<div class="assist__log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<div class="assist__chips" aria-label="Preguntas sugeridas"></div>' +
      '<form class="assist__form" autocomplete="off">' +
        '<label class="visually-hidden" for="assist-input">Escribe tu pregunta</label>' +
        '<input id="assist-input" type="text" maxlength="200" placeholder="Escribe tu pregunta…" enterkeyhint="send">' +
        '<button type="submit" aria-label="Enviar pregunta"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
      '</form>' +
      '<p class="assist__foot">Asistente automático con la información publicada por Al Vuelo. Para cualquier otra duda: <a href="' + TEL + '">' + PHONE + '</a></p>' +
    '</section>';
  doc.body.appendChild(root);

  var fab = root.querySelector('.assist__fab');
  var panel = root.querySelector('.assist__panel');
  var log = root.querySelector('.assist__log');
  var chips = root.querySelector('.assist__chips');
  var form = root.querySelector('.assist__form');
  var input = root.querySelector('#assist-input');
  var nudge = root.querySelector('.assist__nudge');
  var started = false;

  function add(who, html) {
    var m = doc.createElement('div');
    m.className = 'assist__msg assist__msg--' + who;
    if (who === 'user') m.textContent = html; else m.innerHTML = html;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function reply(html) {
    var typing = add('bot', '<span class="assist__typing" aria-label="Escribiendo"><i></i><i></i><i></i></span>');
    var delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    setTimeout(function () { typing.innerHTML = html; log.scrollTop = log.scrollHeight; }, delay);
  }

  function renderChips(exclude) {
    chips.innerHTML = '';
    SUGGESTED.concat(['duracion', 'donde', 'experiencia', 'movil', 'seguridad', 'contacto'])
      .filter(function (id, i, arr) { return id !== exclude && arr.indexOf(id) === i; })
      .slice(0, 6)
      .forEach(function (id) {
        var it = byId(id);
        var b = doc.createElement('button');
        b.type = 'button';
        b.textContent = it.label;
        b.addEventListener('click', function () { ask(it.label, it); });
        chips.appendChild(b);
      });
  }

  function ask(text, forced) {
    add('user', text);
    var it = forced || match(text);
    reply(it ? answerOf(it) : FALLBACK);
    renderChips(it && it.id);
  }

  function open() {
    panel.hidden = false;
    root.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', 'Cerrar asistente de preguntas');
    nudge.hidden = true;
    if (!started) {
      started = true;
      add('bot', '¡Hola! Soy el asistente de <b>Al Vuelo La Rioja</b>. Pregúntame lo que quieras sobre los vuelos en paratrike o elige una de estas preguntas:');
      renderChips();
    }
    setTimeout(function () { input.focus({ preventScroll: true }); }, 50);
  }
  function close(returnFocus) {
    panel.hidden = true;
    root.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', 'Abrir asistente de preguntas');
    if (returnFocus) fab.focus();
  }

  fab.addEventListener('click', function () { panel.hidden ? open() : close(true); });
  root.querySelector('.assist__x').addEventListener('click', function () { close(true); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(true); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!v) return;
    input.value = '';
    ask(v);
  });
  // Un enlace dentro del chat que lleva a otra parte de la página cierra el panel
  log.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && /#/.test(a.getAttribute('href') || '') && window.innerWidth < 700) close(false);
  });

  // Aviso discreto una sola vez por sesión
  var seen = false;
  try { seen = sessionStorage.getItem('alvuelo-nudge') === '1'; } catch (e) {}
  if (!seen) {
    setTimeout(function () {
      if (!panel.hidden || doc.documentElement.classList.contains('menu-open')) return;
      nudge.hidden = false;
      try { sessionStorage.setItem('alvuelo-nudge', '1'); } catch (e) {}
      setTimeout(function () { nudge.hidden = true; }, 7000);
    }, 9000);
  }
  nudge.addEventListener('click', open);

  // Exponer el buscador de respuestas para pruebas
  window.ALVUELO_ASSIST = { match: function (t) { var it = match(t); return it ? (it.id || 'smalltalk') : null; } };
})();
