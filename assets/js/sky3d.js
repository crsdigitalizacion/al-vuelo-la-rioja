/*
 * Al Vuelo La Rioja · escena 3D de fondo
 * ------------------------------------------------------------------
 * WebGL puro, sin librerías. Dibuja el cielo (con las sierras en el
 * horizonte y el sol), un mar de nubes que se atraviesa al hacer scroll
 * y la vela amarilla y carmesí del paratrike con su carro.
 *
 * Cada sección de la portada lleva data-scene="..." y define la luz del
 * cielo, la altitud y dónde vuela la vela (ver SCENES más abajo).
 * Si el navegador no tiene WebGL, se queda el fondo de CSS.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('sky');
  if (!canvas) return;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var gl = canvas.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) { root.classList.add('no-webgl'); return; }
  root.classList.add('has-webgl');

  /* ---------- Utilidades de matrices (columna mayor, como WebGL) ---------- */
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function translate(x, y, z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); }
  function rotZ(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function scale(s) { return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]); }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }

  /* ---------- Shaders ---------- */
  var HP = 'precision highp float;\n';
  var PREC = (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0) ? HP : 'precision mediump float;\n';
  var NOISE = [
    'float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
    'float h1(float x){ return fract(sin(x*127.1)*43758.5453); }',
    'float n1(float x){ float i=floor(x); float f=fract(x); f=f*f*(3.-2.*f); return mix(h1(i),h1(i+1.),f); }',
    'float fbm1(float x){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*n1(x); x*=2.07; a*=.5; } return v; }',
    'float n2(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.-2.*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }',
    'float fbm2(vec2 p){ float v=0.,a=.5; for(int i=0;i<4;i++){ v+=a*n2(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }'
  ].join('\n');

  var SKY_VS = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv=aPos; gl_Position=vec4(aPos,0.,1.); }';
  var SKY_FS = PREC + NOISE + [
    'varying vec2 vUv;',
    'uniform mat3 uRot; uniform float uTan; uniform float uAspect; uniform float uDip; uniform float uAlt;',
    'uniform vec3 uTop,uMid,uHor,uGround,uSun,uM1,uM2,uFog; uniform vec3 uSunDir;',
    'void main(){',
    '  vec3 d=normalize(uRot*vec3(vUv.x*uTan*uAspect, vUv.y*uTan, -1.));',
    '  float e=d.y+uDip;',
    '  float t=max(e,0.);',
    '  vec3 col=mix(uHor,uMid,smoothstep(0.,.22,t));',
    '  col=mix(col,uTop,smoothstep(.18,.75,t));',
    // suelo con bruma bajo el horizonte
    '  float g=clamp(-e*4.,0.,1.);',
    '  vec3 ground=mix(mix(uFog,uHor,.35),uGround,smoothstep(0.,1.,g));',
    '  col=mix(col,ground,smoothstep(.0,-.004,e));',
    // sierras: dos capas, más bajas cuanto más alto se vuela
    '  float az=atan(d.x,-d.z);',
    '  float k=1.-uAlt*.75;',
    '  float r2=(.006+fbm1(az*3.1+11.)*.05*k)-.004;',
    '  float r1=(.002+fbm1(az*6.3+3.)*.03*k)-.006;',
    '  float m2=smoothstep(r2+.0015,r2-.0015,e)*step(-.02,e+.02);',
    '  float m1=smoothstep(r1+.0012,r1-.0012,e);',
    '  vec3 far=mix(uM2,uFog,.35); vec3 near=uM1;',
    '  col=mix(col,far,m2*smoothstep(-.03,.0,e+.004));',
    '  col=mix(col,near,m1*smoothstep(-.05,-.0,e+.01));',
    // bruma de horizonte
    '  col=mix(col,uFog,exp(-abs(e)*55.)*.45);',
    // sol
    '  float sd=max(dot(d,uSunDir),0.);',
    '  col+=uSun*(pow(sd,900.)*2.4+pow(sd,60.)*.2+pow(sd,7.)*.1);',
    '  col+=(hash(gl_FragCoord.xy)-.5)/255.;',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  var CLOUD_VS = [
    'attribute vec3 aCenter; attribute vec2 aCorner; attribute vec3 aMeta;',
    'uniform mat4 uView; uniform mat4 uProj;',
    'varying vec2 vUv; varying float vSeed; varying float vAlpha; varying float vDepth;',
    'void main(){',
    '  vec4 vc=uView*vec4(aCenter,1.);',
    '  vc.xy+=aCorner*vec2(aMeta.x*1.7,aMeta.x*.8);',
    '  gl_Position=uProj*vc;',
    '  vUv=aCorner; vSeed=aMeta.y; vAlpha=aMeta.z; vDepth=-vc.z;',
    '}'
  ].join('\n');
  var CLOUD_FS = PREC + NOISE + [
    'varying vec2 vUv; varying float vSeed; varying float vAlpha; varying float vDepth;',
    'uniform vec3 uLit,uShadow,uFog; uniform float uTime;',
    'void main(){',
    '  vec2 p=vUv*vec2(1.,1.);',
    '  float n=fbm2(p*1.6+vSeed*17.3+vec2(uTime*.008,0.));',
    '  float n2v=fbm2(p*4.1-vSeed*5.1);',
    '  float d=length(vec2(p.x,(p.y+.1)*1.25));',
    '  float base=1.-smoothstep(.15,1.,d);',
    '  float bottom=smoothstep(-.8,-.25,p.y+(n-.5)*.35);',
    '  float dens=clamp(base*bottom*(.45+n*1.15+n2v*.25)-.42,0.,1.);',
    '  dens=smoothstep(0.,.55,dens);',
    '  float lt=clamp(p.y*.55+.55+(n-.5)*.7,0.,1.);',
    '  vec3 col=mix(uShadow,uLit,lt);',
    '  col=mix(col,uFog,smoothstep(30.,170.,vDepth)*.9);',
    '  float a=dens*vAlpha;',
    '  gl_FragColor=vec4(col*a,a);',
    '}'
  ].join('\n');

  var SPRITE_VS = [
    'attribute vec2 aPos;',
    'uniform mat4 uModel; uniform mat4 uView; uniform mat4 uProj;',
    'varying vec2 vUv; varying float vDepth;',
    'void main(){',
    '  vUv=vec2(aPos.x+.5,.5-aPos.y);',
    '  vec4 v=uView*uModel*vec4(aPos,0.,1.); vDepth=-v.z;',
    '  gl_Position=uProj*v;',
    '}'
  ].join('\n');
  var SPRITE_FS = PREC + [
    'varying vec2 vUv; varying float vDepth;',
    'uniform sampler2D uTex; uniform vec3 uTint; uniform vec3 uFog;',
    'void main(){',
    '  vec4 t=texture2D(uTex,vUv);',
    '  vec3 c=t.rgb*uTint;',
    '  c=mix(c,uFog*t.a,smoothstep(30.,150.,vDepth)*.75);',
    '  gl_FragColor=vec4(c,t.a);',
    '}'
  ].join('\n');

  var LINE_VS = 'attribute vec3 aPos; uniform mat4 uModel; uniform mat4 uView; uniform mat4 uProj; varying float vDepth; void main(){ vec4 v=uView*uModel*vec4(aPos,1.); vDepth=-v.z; gl_Position=uProj*v; }';
  var LINE_FS = PREC + 'varying float vDepth; uniform vec3 uCol; uniform vec3 uFog; uniform float uAlpha; void main(){ vec3 c=mix(uCol,uFog,smoothstep(25.,140.,vDepth)*.8); gl_FragColor=vec4(c*uAlpha,uAlpha); }';

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    var a = shader(gl.VERTEX_SHADER, vs), b = shader(gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); return null; }
    var info = { p: p, u: {}, a: {} };
    var nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < nu; i++) { var un = gl.getActiveUniform(p, i).name; info.u[un] = gl.getUniformLocation(p, un); }
    var na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (var j = 0; j < na; j++) { var an = gl.getActiveAttrib(p, j).name; info.a[an] = gl.getAttribLocation(p, an); }
    return info;
  }

  var skyP = program(SKY_VS, SKY_FS);
  var cloudP = program(CLOUD_VS, CLOUD_FS);
  var spriteP = program(SPRITE_VS, SPRITE_FS);
  var lineP = program(LINE_VS, LINE_FS);
  if (!skyP || !cloudP || !spriteP || !lineP) { root.classList.remove('has-webgl'); root.classList.add('no-webgl'); return; }

  function buffer(data, target) {
    var b = gl.createBuffer();
    gl.bindBuffer(target || gl.ARRAY_BUFFER, b);
    gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  }

  /* ---------- Cielo: un triángulo que cubre la pantalla ---------- */
  var skyBuf = buffer(new Float32Array([-1, -1, 3, -1, -1, 3]));

  /* ---------- El paratrike: foto real recortada ---------- */
  // assets/img/paratrike-recorte.webp es la foto del paratrike de Al Vuelo con el cielo
  // quitado (textura de 1024 x 1024). Se dibuja como un plano dentro de la escena y
  // recibe la luz y la bruma del cielo. El suspentaje se dibuja aparte con líneas finas:
  // coordenadas del plano (-0,5..0,5), de la vela a las bandas del carro.
  var SPRITE_SIZE = 14;
  var spriteBuf = buffer(new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]));
  var LINE_UV = [-0.357,0.058,-0.1977,-0.0877,-0.3352,0.0257,-0.1977,-0.0877,-0.1977,-0.0877,0.078,-0.3282,-0.3134,0.0118,-0.1693,-0.1078,-0.2916,0.01,-0.1693,-0.1078,-0.1693,-0.1078,0.078,-0.3282,-0.2698,0.0092,-0.1407,-0.0885,-0.2472,0.0719,-0.1407,-0.0885,-0.1407,-0.0885,0.078,-0.3282,-0.2254,0.1347,-0.1121,-0.014,-0.2036,0.1757,-0.1121,-0.014,-0.1121,-0.014,0.078,-0.3282,-0.1818,0.2114,-0.0837,0.0325,-0.16,0.2419,-0.0837,0.0325,-0.0837,0.0325,0.078,-0.3282,-0.1373,0.2707,-0.0548,0.069,-0.1155,0.2951,-0.0548,0.069,-0.0548,0.069,0.078,-0.3282,-0.0937,0.3178,-0.0265,0.0976,-0.0719,0.3361,-0.0265,0.0976,-0.0265,0.0976,0.078,-0.3282,-0.0501,0.3544,0.0021,0.1214,-0.0275,0.3727,0.0021,0.1214,0.0021,0.1214,0.078,-0.3282,-0.0057,0.3884,0.0236,0.1376,0.0236,0.1376,0.078,-0.3282,0.0161,0.4024,0.0592,0.1554,0.0379,0.4172,0.0592,0.1554,0.0592,0.1554,0.119,-0.3169,0.0606,0.4294,0.0881,0.1704,0.0824,0.4364,0.0881,0.1704,0.0881,0.1704,0.119,-0.3169,0.1042,0.4303,0.1165,0.1665,0.126,0.4233,0.1165,0.1665,0.1165,0.1665,0.119,-0.3169,0.1478,0.4146,0.1451,0.1551,0.1705,0.4041,0.1451,0.1551,0.1451,0.1551,0.119,-0.3169,0.1923,0.3919,0.1737,0.1393,0.214,0.3779,0.1737,0.1393,0.1737,0.1393,0.119,-0.3169,0.2358,0.3622,0.202,0.1186,0.2576,0.3439,0.202,0.1186,0.202,0.1186,0.119,-0.3169,0.2803,0.3256,0.2309,0.0951,0.3021,0.3082,0.2309,0.0951,0.2309,0.0951,0.119,-0.3169,0.3239,0.2916,0.2593,0.0767,0.3457,0.2855,0.2593,0.0767,0.2593,0.0767,0.119,-0.3169,0.3684,0.2855,0.2811,0.0747,0.2811,0.0747,0.119,-0.3169,0.078,-0.3282,0.0824,-0.35,0.119,-0.3169,0.1173,-0.3457];
  var lineBuf = buffer(new Float32Array(LINE_UV.reduce(function (o, v, k) { o.push(v); if (k % 2) o.push(0.001); return o; }, [])));
  var lineCount = LINE_UV.length / 2;
  var tex = null;
  (function () {
    var img = new Image();
    img.onload = function () {
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var an = gl.getExtension('EXT_texture_filter_anisotropic');
      if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, 4);
      introStart = performance.now(); // la entrada empieza cuando la foto está lista
    };
    img.src = 'assets/img/paratrike-recorte.webp';
  })();

  /* ---------- Nubes ---------- */
  var i;
  var mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
  var NC = mobile ? 70 : 140;
  var DEPTH = 190;
  var rnd = (function (seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; })(20261023);
  var clouds = [];
  for (i = 0; i < NC; i++) {
    var layer = rnd();
    clouds.push({
      x: (rnd() * 2 - 1) * 95,
      y: layer < 0.78 ? -1 - rnd() * 4.5 : 1.5 + rnd() * 7, // la mayoría forman el mar de nubes
      z: rnd() * DEPTH,
      size: layer < 0.78 ? 7 + rnd() * 12 : 4 + rnd() * 7,
      seed: rnd(),
      a: 0.55 + rnd() * 0.45,
      high: layer >= 0.78
    });
  }
  var cloudData = new Float32Array(NC * 4 * 8);
  var cloudBuf = gl.createBuffer();
  var cIdx = new Uint16Array(NC * 6);
  for (i = 0; i < NC; i++) { var o = i * 4; cIdx.set([o, o + 1, o + 2, o + 2, o + 1, o + 3], i * 6); }
  var cloudIdx = buffer(cIdx, gl.ELEMENT_ARRAY_BUFFER);
  var CORNERS = [-1, -1, 1, -1, -1, 1, 1, 1];

  /* ---------- Luz del cielo según la hora ---------- */
  function pal(o) { var r = {}; for (var k in o) r[k] = typeof o[k] === 'string' ? hex(o[k]) : o[k]; return r; }
  var PALETTES = {
    alba:   pal({ top: '#0b1a35', mid: '#35467a', hor: '#f2a46e', ground: '#3a3452', sun: '#ffb27a', lit: '#ffd9bd', shadow: '#5f5a80', fog: '#c9918a', m1: '#3f3a5e', m2: '#5d5679', amb: '#7c7aa8', el: 0.035 }),
    manana: pal({ top: '#0f3266', mid: '#3a69a6', hor: '#d9b393', ground: '#6a7c9b', sun: '#fff0dc', lit: '#fff7ef', shadow: '#8a98b8', fog: '#c9d5e5', m1: '#5b7293', m2: '#7d93b1', amb: '#9db4d6', el: 0.22 }),
    dia:    pal({ top: '#0c3a72', mid: '#2f68a8', hor: '#93b9d8', ground: '#5f7f9f', sun: '#f4f6ff', lit: '#e9f0f8', shadow: '#9cb0ca', fog: '#a9c3db', m1: '#4f6f90', m2: '#7290b0', amb: '#9db6d4', el: 0.32 }),
    oro:    pal({ top: '#14254b', mid: '#555584', hor: '#ec9a52', ground: '#5d4650', sun: '#ffc27a', lit: '#ffdcae', shadow: '#7a6a8a', fog: '#e3a47b', m1: '#4e3f5c', m2: '#76627c', amb: '#a38fb0', el: 0.06 }),
    ocaso:  pal({ top: '#070f22', mid: '#1e2650', hor: '#c9635b', ground: '#211d33', sun: '#ff8d5e', lit: '#e8a194', shadow: '#3d3b5e', fog: '#7c4c60', m1: '#1d1a30', m2: '#2f2a47', amb: '#55507c', el: -0.005 })
  };

  // Escenas: luz, altitud (0..1) y posición de la vela respecto a la cámara [x, y, z, guiñada, cabeceo]
  var SCENES = {
    despegue:   { pal: 'alba',   alt: 0.12, wing: [8.6, 0, -21, -0.95, 0.35], wingM: [0.9, 7.3, -30, -0.95, 0.35] },
    portal:     { pal: 'alba',   alt: 0.25, wing: [-9, 1.5, -36, 0.9, 0.3], wingM: [-2, 3.5, -38, 0.9, 0.3] },
    lema:       { pal: 'manana', alt: 0.4,  wing: [-7, 4.6, -46, 0.9, 0.4], wingM: [2, 7, -54, -1.1, 0.4] },
    experiencia:{ pal: 'manana', alt: 0.55, wing: [-10, 0.5, -34, 1.0, 0.35], wingM: [-1, 5, -42, 1.0, 0.35] },
    lugares:    { pal: 'dia',    alt: 0.8,  wing: [7, 4, -64, -1.3, 0.5], wingM: [1, 6, -64, -1.3, 0.5] },
    piloto:     { pal: 'dia',    alt: 0.75, wing: [-14, 6, -70, 1.0, 0.4], wingM: [2, 7, -60, -1.0, 0.35] },
    vuelos:     { pal: 'oro',    alt: 0.6,  wing: [-9, 2.5, -42, 0.9, 0.35], wingM: [-1, 5, -46, 0.9, 0.35] },
    pasos:      { pal: 'oro',    alt: 0.45, wing: [10, 5, -52, -1.0, 0.35], wingM: [1, 6, -52, -1.0, 0.35] },
    reserva:    { pal: 'oro',    alt: 0.35, wing: [-13, 5, -72, 0.8, 0.4], wingM: [-2, 7, -72, 0.8, 0.4] },
    contacto:   { pal: 'ocaso',  alt: 0.18, wing: [8, 0.5, -32, -0.95, 0.35], wingM: [1, 4, -38, -0.95, 0.35] },
    aterrizaje: { pal: 'ocaso',  alt: 0.02, wing: [3, -1, -22, -0.9, 0.3], wingM: [0.5, 2.5, -26, -0.9, 0.3] }
  };

  var anchors = [];
  function measure() {
    anchors = [];
    var els = document.querySelectorAll('[data-scene]');
    for (var k = 0; k < els.length; k++) {
      var sc = SCENES[els[k].getAttribute('data-scene')];
      if (!sc) continue;
      var r = els[k].getBoundingClientRect();
      anchors.push({ y: r.top + window.scrollY, h: r.height, sc: sc });
    }
  }

  function sceneAt(y) {
    var narrow = canvas.clientWidth / canvas.clientHeight < 0.85;
    if (!anchors.length) return null;
    var a = anchors[0], b = anchors[0], t = 0;
    for (var k = 0; k < anchors.length; k++) {
      if (y >= anchors[k].y - 1) { a = anchors[k]; b = anchors[k + 1] || anchors[k]; }
    }
    if (b !== a) {
      // el cambio ocurre mientras la sección siguiente sube por la pantalla
      var span = Math.min(window.innerHeight * 0.8, b.y - a.y);
      t = smooth(clamp((y - (b.y - span)) / Math.max(1, span), 0, 1));
    }
    var pa = PALETTES[a.sc.pal], pb = PALETTES[b.sc.pal];
    var o = {};
    for (var key in pa) o[key] = Array.isArray(pa[key]) ? lerp3(pa[key], pb[key], t) : lerp(pa[key], pb[key], t);
    o.alt = lerp(a.sc.alt, b.sc.alt, t);
    var wa = narrow && a.sc.wingM ? a.sc.wingM : a.sc.wing, wb = narrow && b.sc.wingM ? b.sc.wingM : b.sc.wing;
    o.wing = [0, 1, 2, 3, 4].map(function (n) { return lerp(wa[n], wb[n], t); });
    return o;
  }

  /* ---------- Estado ---------- */
  var introStart = performance.now();
  var cur = null, camZ = 0, last = performance.now(), time = 0;
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var scrollV = 0, lastScroll = window.scrollY, intro = 0;
  var visible = true, running = false;
  var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.6);
  var W = 0, H = 0;

  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === W && Math.abs(h - H) < 120 && W) return; // ignora la barra del navegador en móvil
    W = w; H = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    measure();
  }

  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  function bindAttr(prog, name, buf, size, stride, offset) {
    var loc = prog.a[name];
    if (loc === undefined || loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride || 0, offset || 0);
  }
  function disableAll() { for (var k = 0; k < 8; k++) gl.disableVertexAttribArray(k); }

  var order = new Array(NC);
  var FOV = 0.82;

  function draw(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (reduce.matches) dt = 0;
    time += dt;
    intro = clamp((now - introStart) / 2400, 0, 1);
    if (reduce.matches) intro = 1;

    var sy = window.scrollY;
    var target = sceneAt(sy);
    if (!target) return;
    if (!cur) cur = target;
    var k = reduce.matches ? 1 : 1 - Math.pow(0.0025, dt);
    for (var key in target) {
      if (Array.isArray(target[key])) cur[key] = cur[key].map(function (v, n) { return lerp(v, target[key][n], k); });
      else cur[key] = lerp(cur[key], target[key], k);
    }
    var dv = sy - lastScroll; lastScroll = sy;
    scrollV = lerp(scrollV, dv, 0.08);
    pointer.x = lerp(pointer.x, pointer.tx, 0.04);
    pointer.y = lerp(pointer.y, pointer.ty, 0.04);

    // la cámara avanza siempre; el scroll acelera el vuelo
    camZ -= dt * 7 + Math.abs(dv) * 0.03 * (reduce.matches ? 0 : 1);
    if (reduce.matches) camZ = -sy * 0.03;

    var aspect = canvas.width / canvas.height;
    var yaw = pointer.x * -0.06 + Math.sin(time * 0.11) * 0.015;
    var pitch = pointer.y * -0.035 - cur.alt * 0.1 + Math.sin(time * 0.17) * 0.008;
    var dip = cur.alt * 0.07;
    var camY = 0;
    var view = mul(mul(rotX(-pitch), rotY(-yaw)), translate(0, -camY, -camZ));
    var proj = perspective(FOV, aspect, 0.1, 400);

    // dirección del sol (a la derecha y de frente)
    var az = 0.42, el = cur.el;
    var sun = [Math.sin(az) * Math.cos(el), Math.sin(el) - dip, -Math.cos(az) * Math.cos(el)];
    var sl = Math.hypot(sun[0], sun[1], sun[2]); sun = sun.map(function (v) { return v / sl; });

    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND);

    /* cielo */
    gl.useProgram(skyP.p);
    disableAll(); bindAttr(skyP, 'aPos', skyBuf, 2);
    var cy = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    // rotación cámara→mundo: guiñada * cabeceo
    var rot = new Float32Array([cy, 0, -syw, syw * sp, cp, cy * sp, syw * cp, -sp, cy * cp]);
    gl.uniformMatrix3fv(skyP.u.uRot, false, rot);
    gl.uniform1f(skyP.u.uTan, Math.tan(FOV / 2));
    gl.uniform1f(skyP.u.uAspect, aspect);
    gl.uniform1f(skyP.u.uDip, dip);
    gl.uniform1f(skyP.u.uAlt, cur.alt);
    ['top', 'mid', 'hor', 'ground', 'sun', 'fog'].forEach(function (n) { gl.uniform3fv(skyP.u['u' + n[0].toUpperCase() + n.slice(1)], cur[n]); });
    gl.uniform3fv(skyP.u.uM1, cur.m1); gl.uniform3fv(skyP.u.uM2, cur.m2);
    gl.uniform3fv(skyP.u.uSunDir, sun);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* paratrike */
    var w = cur.wing;
    var enter = smooth(intro);
    var bob = Math.sin(time * 0.9) * 0.22 + Math.sin(time * 0.37) * 0.12;
    var drift = Math.sin(time * 0.21) * 0.5;
    var roll = clamp(scrollV * -0.003, -0.22, 0.22) + Math.sin(time * 0.53) * 0.035 + pointer.x * 0.06;
    var px = w[0] + drift + (1 - enter) * 10, py = w[1] + bob + (1 - enter) * 3, pz = camZ + w[2] - (1 - enter) * 34;
    var model = mul(translate(px, py, pz), mul(rotZ(roll), mul(rotX(Math.sin(time * 0.7) * 0.04), scale(SPRITE_SIZE * (canvas.clientWidth / canvas.clientHeight < 0.85 ? 0.62 : 1)))));
    var fog = cur.fog;
    var spriteRel = camZ - pz;
    var tint = [0, 1, 2].map(function (k) { return lerp(1, cur.sun[k] * 0.72 + cur.amb[k] * 0.4, 0.38); });

    /* nubes: se ordenan de lejos a cerca */
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    var layerY = lerp(1.2, -11, cur.alt);
    var n = 0;
    for (var ci = 0; ci < NC; ci++) {
      var cl = clouds[ci];
      var rel = ((cl.z + camZ) % DEPTH + DEPTH) % DEPTH; // 0..DEPTH por delante
      cl.wz = camZ - rel - 3;
      cl.wy = cl.high ? cl.y + lerp(2, -5, cur.alt) : layerY + cl.y;
      cl.rel = rel + 3;
      order[n++] = cl;
    }
    order.sort(function (p, q) { return q.rel - p.rel; });
    var f = 0, behind = 0;
    for (ci = 0; ci < NC; ci++) {
      var cc = order[ci];
      if (cc.rel > spriteRel) behind = ci + 1;
      var fadeNear = clamp((cc.rel - 7) / 14, 0, 1);
      var fadeFar = clamp((DEPTH - cc.rel) / 30, 0, 1);
      var alpha = cc.a * fadeNear * fadeFar * (cc.high ? 0.75 : 1);
      for (var v = 0; v < 4; v++) {
        cloudData[f++] = cc.x; cloudData[f++] = cc.wy; cloudData[f++] = cc.wz;
        cloudData[f++] = CORNERS[v * 2]; cloudData[f++] = CORNERS[v * 2 + 1];
        cloudData[f++] = cc.size; cloudData[f++] = cc.seed; cloudData[f++] = alpha;
      }
    }
    function drawClouds(from, to) {
      if (to <= from) return;
      gl.useProgram(cloudP.p);
      disableAll();
      gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuf);
      bindAttr(cloudP, 'aCenter', cloudBuf, 3, 32, 0);
      bindAttr(cloudP, 'aCorner', cloudBuf, 2, 32, 12);
      bindAttr(cloudP, 'aMeta', cloudBuf, 3, 32, 20);
      gl.uniformMatrix4fv(cloudP.u.uView, false, view);
      gl.uniformMatrix4fv(cloudP.u.uProj, false, proj);
      gl.uniform3fv(cloudP.u.uLit, cur.lit); gl.uniform3fv(cloudP.u.uShadow, cur.shadow);
      gl.uniform3fv(cloudP.u.uFog, fog); gl.uniform1f(cloudP.u.uTime, time);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cloudIdx);
      gl.drawElements(gl.TRIANGLES, (to - from) * 6, gl.UNSIGNED_SHORT, from * 12);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuf);
    gl.bufferData(gl.ARRAY_BUFFER, cloudData, gl.DYNAMIC_DRAW);
    drawClouds(0, behind);

    if (tex) {
      // suspentaje
      gl.useProgram(lineP.p);
      disableAll(); bindAttr(lineP, 'aPos', lineBuf, 3);
      gl.uniformMatrix4fv(lineP.u.uModel, false, model);
      gl.uniformMatrix4fv(lineP.u.uView, false, view);
      gl.uniformMatrix4fv(lineP.u.uProj, false, proj);
      gl.uniform3fv(lineP.u.uCol, [0.16, 0.16, 0.2]); gl.uniform3fv(lineP.u.uFog, fog);
      gl.uniform1f(lineP.u.uAlpha, 0.38 * enter);
      gl.drawArrays(gl.LINES, 0, lineCount);
      // la foto
      gl.useProgram(spriteP.p);
      disableAll(); bindAttr(spriteP, 'aPos', spriteBuf, 2);
      gl.uniformMatrix4fv(spriteP.u.uModel, false, model);
      gl.uniformMatrix4fv(spriteP.u.uView, false, view);
      gl.uniformMatrix4fv(spriteP.u.uProj, false, proj);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(spriteP.u.uTex, 0);
      gl.uniform3fv(spriteP.u.uTint, tint); gl.uniform3fv(spriteP.u.uFog, fog);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    drawClouds(behind, NC);

    // para la interfaz: altitud y progreso, por si alguien los quiere mostrar
    window.AV_FLIGHT = { alt: cur.alt };
  }

  function loop(now) {
    if (!visible) { running = false; return; }
    draw(now);
    if (reduce.matches) { running = false; return; }
    requestAnimationFrame(loop);
  }
  function start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('load', measure);
  if ('ResizeObserver' in window) new ResizeObserver(function () { measure(); }).observe(document.body);
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) start(); });
  // con movimiento reducido solo se redibuja al hacer scroll
  window.addEventListener('scroll', function () { if (reduce.matches) start(); }, { passive: true });
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); visible = false; root.classList.add('no-webgl'); });
  start();
  requestAnimationFrame(function () { root.classList.add('sky-ready'); });
})();
