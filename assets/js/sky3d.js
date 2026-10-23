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

  var WING_VS = [
    'attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol; attribute float aSpec;',
    'uniform mat4 uModel; uniform mat4 uView; uniform mat4 uProj;',
    'varying vec3 vNor; varying vec3 vCol; varying float vDepth; varying vec3 vW; varying float vSpec;',
    'void main(){',
    '  vec4 w=uModel*vec4(aPos,1.);',
    '  vNor=mat3(uModel)*aNor; vCol=aCol; vW=w.xyz; vSpec=aSpec;',
    '  vec4 v=uView*w; vDepth=-v.z;',
    '  gl_Position=uProj*v;',
    '}'
  ].join('\n');
  var WING_FS = PREC + [
    'varying vec3 vNor; varying vec3 vCol; varying float vDepth; varying vec3 vW; varying float vSpec;',
    'uniform vec3 uSunDir,uSun,uAmb,uFog; uniform vec3 uCam;',
    'void main(){',
    '  vec3 n=normalize(vNor); if(!gl_FrontFacing) n=-n;',
    '  vec3 v=normalize(uCam-vW);',
    '  float dif=max(dot(n,uSunDir),0.);',
    '  float back=max(dot(-n,uSunDir),0.);',
    '  float rim=pow(1.-max(dot(n,v),0.),3.);',
    '  vec3 h=normalize(uSunDir+v); float sp=pow(max(dot(n,h),0.),48.)*vSpec;',
    '  float sky=n.y*.5+.5;',
    '  vec3 c=vCol*(uAmb*(.45+.3*sky)+uSun*dif*.95)+vCol*uSun*back*.5+uSun*(sp*.8+rim*.1);',
    '  c=mix(c,uFog,smoothstep(25.,140.,vDepth)*.8);',
    '  gl_FragColor=vec4(c,1.);',
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
  var wingP = program(WING_VS, WING_FS);
  var lineP = program(LINE_VS, LINE_FS);
  if (!skyP || !cloudP || !wingP || !lineP) { root.classList.remove('has-webgl'); root.classList.add('no-webgl'); return; }

  function buffer(data, target) {
    var b = gl.createBuffer();
    gl.bindBuffer(target || gl.ARRAY_BUFFER, b);
    gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  }

  /* ---------- Cielo: un triángulo que cubre la pantalla ---------- */
  var skyBuf = buffer(new Float32Array([-1, -1, 3, -1, -1, 3]));

  /* ---------- La vela ---------- */
  // s va de punta a punta (-1..1); t recorre la cuerda (0 borde de ataque, 1 borde de salida).
  // El arco se integra con una curvatura que crece hacia las puntas, como una vela real:
  // centro casi plano y puntas que caen.
  var SPAN = 182, CHORD = 17, CELLS = 26, HALF = 5.3, ARC = 1.3, TOPY = 5;
  var YELLOW = hex('#f6c816'), YELLOW_D = hex('#c99a0a'), CRIMSON = hex('#b10f2c'), CRIMSON_D = hex('#7c0a1f'), INLET = hex('#2a1408');
  var arcX = [], arcY = [], arcPhi = [];
  (function () {
    var x = 0, y = 0, n = SPAN / 2, ds = 1 / n;
    for (var k = 0; k <= n; k++) {
      var s = k / n, phi = ARC * Math.pow(s, 1.7);
      arcX[k] = x; arcY[k] = y; arcPhi[k] = phi;
      x += Math.cos(phi) * HALF * ds; y -= Math.sin(phi) * HALF * ds;
    }
  })();
  function arcAt(s) { // posición en el arco y ángulo, por interpolación
    var n = SPAN / 2, f = Math.abs(s) * n, k = Math.min(n - 1, Math.floor(f)), u = f - k;
    var x = lerp(arcX[k], arcX[k + 1], u), y = lerp(arcY[k], arcY[k + 1], u), p = lerp(arcPhi[k], arcPhi[k + 1], u);
    var sg = s < 0 ? -1 : 1;
    return { x: sg * x, y: TOPY + y, nx: sg * Math.sin(p), ny: Math.cos(p) };
  }
  function chordAt(s) { return 2.35 * Math.sqrt(Math.max(0.0001, 1 - Math.pow(Math.abs(s), 2.6))) + 0.18; }
  function sweepAt(s) { return 0.55 * Math.pow(Math.abs(s), 2.4); } // borde de ataque hacia atrás en las puntas
  function cellAt(s) { return ((s + 1) / 2 * CELLS) % 1; }
  function airfoil(t) {
    var yt = 5 * 0.15 * (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1036 * t * t * t * t);
    var yc = 0.055 * Math.sin(Math.PI * Math.min(1, t * 1.05));
    return [yc + yt, yc - yt];
  }
  function wingPoint(s, t, upper) {
    var a = arcAt(s), c = chordAt(s), cell = cellAt(s), bump = Math.sin(Math.PI * cell);
    var af = airfoil(t), off = (upper ? af[0] : af[1]) * c;
    // celdas infladas arriba y abajo, con las costillas marcadas
    if (upper) off += 0.075 * c * bump * Math.sin(Math.PI * Math.min(1, t * 1.15));
    else off -= 0.03 * c * bump * Math.sin(Math.PI * t);
    var z = (t - 0.28) * c + sweepAt(s) + (t > 0.9 ? 0.04 * c * bump * (t - 0.9) * 10 : 0); // borde de salida festoneado
    return [a.x + a.nx * off, a.y + a.ny * off, z];
  }
  function wingColor(s, t, upper) {
    var a = Math.abs(s), cell = cellAt(s);
    var flame = 0.7 - 0.12 * Math.sin(t * 2.6) - (t < 0.22 ? (0.22 - t) * 1.1 : 0);
    var red = a > flame;
    var c = red ? (upper ? CRIMSON : CRIMSON_D) : (upper ? YELLOW : YELLOW_D);
    // bocas de las celdas en el borde de ataque, por debajo
    if (!upper && t < 0.075 && Math.abs(cell - 0.5) < 0.33 && a < 0.94) c = lerp3(c, INLET, 0.82);
    var seam = Math.pow(Math.abs(cell - 0.5) * 2, 12) * 0.28;
    var k = 1 - seam;
    return [c[0] * k, c[1] * k, c[2] * k];
  }
  function computeNormals(pos, idx) {
    var nor = new Array(pos.length).fill(0);
    for (var q = 0; q < idx.length; q += 3) {
      var ia = idx[q] * 3, ib = idx[q + 1] * 3, ic = idx[q + 2] * 3;
      var ux = pos[ib] - pos[ia], uy = pos[ib + 1] - pos[ia + 1], uz = pos[ib + 2] - pos[ia + 2];
      var vx = pos[ic] - pos[ia], vy = pos[ic + 1] - pos[ia + 1], vz = pos[ic + 2] - pos[ia + 2];
      var fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      [ia, ib, ic].forEach(function (k) { nor[k] += fx; nor[k + 1] += fy; nor[k + 2] += fz; });
    }
    return nor;
  }
  var wPos = [], wCol = [], wIdx = [], wSpec = [];
  var ring = CHORD * 2;
  for (var i = 0; i <= SPAN; i++) {
    var s = -1 + 2 * i / SPAN;
    for (var j = 0; j < ring; j++) {
      var upper = j < CHORD;
      var t = upper ? j / (CHORD - 1) : 1 - (j - CHORD) / (CHORD - 1);
      t = 0.5 - 0.5 * Math.cos(t * Math.PI);
      var p = wingPoint(s, t, upper);
      wPos.push(p[0], p[1], p[2]);
      var col = wingColor(s, t, upper);
      wCol.push(col[0], col[1], col[2]);
      wSpec.push(upper ? 0.55 : 0.25);
    }
  }
  for (i = 0; i < SPAN; i++) for (var j2 = 0; j2 < ring; j2++) {
    var a0 = i * ring + j2, a1 = i * ring + (j2 + 1) % ring, b0 = a0 + ring, b1 = a1 + ring;
    wIdx.push(a0, b0, a1, a1, b0, b1);
  }
  // tapas de las puntas
  [0, SPAN].forEach(function (st) {
    var base = wPos.length / 3;
    var cx0 = 0, cy0 = 0, cz0 = 0;
    for (var q = 0; q < ring; q++) { cx0 += wPos[(st * ring + q) * 3]; cy0 += wPos[(st * ring + q) * 3 + 1]; cz0 += wPos[(st * ring + q) * 3 + 2]; }
    wPos.push(cx0 / ring, cy0 / ring, cz0 / ring); wCol.push(CRIMSON_D[0], CRIMSON_D[1], CRIMSON_D[2]); wSpec.push(0.2);
    for (q = 0; q < ring; q++) wIdx.push(base, st * ring + q, st * ring + (q + 1) % ring);
  });

  /* ---------- Carro (paratrike) con piloto y pasajero ---------- */
  var tPos = [], tCol = [], tIdx = [], tSpec = [];
  var T = [0, -3.75, 0.05]; // origen del carro respecto a la vela
  function addTri(pos, col, idx, spec, verts, cols, tris, sp) {
    var base = pos.length / 3;
    verts.forEach(function (v, k) { pos.push(v[0] + T[0], v[1] + T[1], v[2] + T[2]); var c = cols[k] || cols[0]; col.push(c[0], c[1], c[2]); spec.push(sp); });
    tris.forEach(function (v) { idx.push(base + v); });
  }
  function cyl(p0, p1, r, color, seg, sp, r1) {
    seg = seg || 10; r1 = r1 === undefined ? r : r1;
    var d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], L = Math.hypot(d[0], d[1], d[2]);
    d = d.map(function (v) { return v / L; });
    var up = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    var u = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]];
    var ul = Math.hypot(u[0], u[1], u[2]); u = u.map(function (v) { return v / ul; });
    var w = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
    var verts = [], tris = [];
    for (var k = 0; k <= seg; k++) {
      var a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      var o = [u[0] * ca + w[0] * sa, u[1] * ca + w[1] * sa, u[2] * ca + w[2] * sa];
      verts.push([p0[0] + o[0] * r, p0[1] + o[1] * r, p0[2] + o[2] * r]);
      verts.push([p1[0] + o[0] * r1, p1[1] + o[1] * r1, p1[2] + o[2] * r1]);
      if (k < seg) { var b = k * 2; tris.push(b, b + 1, b + 2, b + 2, b + 1, b + 3); }
    }
    addTri(tPos, tCol, tIdx, tSpec, verts, [color], tris, sp || 0.2);
  }
  function sphere(c, r, color, sp, sy) {
    var verts = [], tris = [], la = 10, lo = 14;
    sy = sy || 1;
    for (var a = 0; a <= la; a++) for (var b = 0; b <= lo; b++) {
      var th = a / la * Math.PI, ph = b / lo * Math.PI * 2;
      verts.push([c[0] + r * Math.sin(th) * Math.cos(ph), c[1] + r * sy * Math.cos(th), c[2] + r * Math.sin(th) * Math.sin(ph)]);
      if (a < la && b < lo) { var q = a * (lo + 1) + b; tris.push(q, q + lo + 1, q + 1, q + 1, q + lo + 1, q + lo + 2); }
    }
    addTri(tPos, tCol, tIdx, tSpec, verts, [color], tris, sp || 0.3);
  }
  function box(c, sz, color, sp) {
    var x = sz[0] / 2, y = sz[1] / 2, z = sz[2] / 2, verts = [], tris = [];
    var F = [[[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]],
      [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]],
      [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]];
    F.forEach(function (f, k) { f.forEach(function (v) { verts.push([c[0] + v[0], c[1] + v[1], c[2] + v[2]]); }); var b = k * 4; tris.push(b, b + 1, b + 2, b, b + 2, b + 3); });
    addTri(tPos, tCol, tIdx, tSpec, verts, [color], tris, sp || 0.15);
  }
  var METAL = hex('#c9ced6'), DARK = hex('#23262d'), TYRE = hex('#141518'), SEAT = hex('#2b2f3a'), YEL = hex('#e8b90f');
  var RED = hex('#c8202f'), BLUE = hex('#2257a8'), JEANS = hex('#2a3550'), HELMET = hex('#f1f2f4'), SKIN = hex('#d9a27d');
  // ruedas
  [[0, -0.93, -1.3], [-0.72, -0.93, 0.55], [0.72, -0.93, 0.55]].forEach(function (w) {
    cyl([w[0] - 0.07, w[1], w[2]], [w[0] + 0.07, w[1], w[2]], 0.22, TYRE, 14, 0.1);
    cyl([w[0] - 0.08, w[1], w[2]], [w[0] + 0.08, w[1], w[2]], 0.09, METAL, 10, 0.6);
  });
  // chasis
  cyl([0, -0.82, -1.3], [0, -0.76, 0.55], 0.045, YEL, 8, 0.5);
  cyl([0, -0.93, -1.3], [0, -0.55, -1.12], 0.035, METAL, 8, 0.6);
  cyl([-0.72, -0.93, 0.55], [0.72, -0.93, 0.55], 0.04, METAL, 8, 0.6);
  cyl([-0.72, -0.93, 0.55], [-0.2, -0.78, -0.1], 0.035, YEL, 8, 0.5);
  cyl([0.72, -0.93, 0.55], [0.2, -0.78, -0.1], 0.035, YEL, 8, 0.5);
  cyl([-0.35, -0.78, 0.45], [-0.32, 0.75, 0.45], 0.04, YEL, 8, 0.5);
  cyl([0.35, -0.78, 0.45], [0.32, 0.75, 0.45], 0.04, YEL, 8, 0.5);
  cyl([-0.42, 0.75, 0.45], [0.42, 0.75, 0.45], 0.04, METAL, 8, 0.6);
  // asientos en tándem
  box([0, -0.62, -0.45], [0.5, 0.1, 0.55], SEAT); box([0, -0.25, -0.18], [0.5, 0.65, 0.08], SEAT);
  box([0, -0.42, 0.18], [0.52, 0.1, 0.5], SEAT); box([0, -0.02, 0.42], [0.52, 0.7, 0.08], SEAT);
  // piloto (chaqueta roja) y pasajero (azul), con casco
  cyl([0, -0.52, -0.38], [0, 0.12, -0.3], 0.19, RED, 12, 0.15, 0.17);
  sphere([0, 0.33, -0.3], 0.15, HELMET, 0.8); sphere([0, 0.28, -0.42], 0.07, SKIN, 0.1);
  [-1, 1].forEach(function (sd) {
    cyl([sd * 0.1, -0.56, -0.5], [sd * 0.13, -0.6, -0.95], 0.075, JEANS, 8, 0.1);
    cyl([sd * 0.13, -0.6, -0.95], [sd * 0.14, -0.82, -1.08], 0.065, JEANS, 8, 0.1);
    cyl([sd * 0.19, 0.05, -0.32], [sd * 0.24, -0.25, -0.6], 0.06, RED, 8, 0.15);
  });
  cyl([0, -0.36, 0.22], [0, 0.32, 0.3], 0.19, BLUE, 12, 0.15, 0.17);
  sphere([0, 0.53, 0.3], 0.15, HELMET, 0.8); sphere([0, 0.48, 0.18], 0.07, SKIN, 0.1);
  [-1, 1].forEach(function (sd) {
    cyl([sd * 0.12, -0.38, 0.1], [sd * 0.3, -0.45, -0.3], 0.075, JEANS, 8, 0.1);
    cyl([sd * 0.3, -0.45, -0.3], [sd * 0.3, -0.66, -0.5], 0.065, JEANS, 8, 0.1);
  });
  // motor y depósito
  box([0, -0.12, 0.72], [0.36, 0.42, 0.3], DARK, 0.4);
  cyl([0, -0.5, 0.62], [0, -0.5, 0.82], 0.16, hex('#e9e9e2'), 12, 0.3);
  // jaula de la hélice: anillo de tubo y radios
  var CAGE = [0, -0.05, 0.98], CR = 0.78, segs = 36;
  for (i = 0; i < segs; i++) {
    var q0 = i / segs * Math.PI * 2, q1 = (i + 1) / segs * Math.PI * 2;
    cyl([CAGE[0] + Math.cos(q0) * CR, CAGE[1] + Math.sin(q0) * CR, CAGE[2]], [CAGE[0] + Math.cos(q1) * CR, CAGE[1] + Math.sin(q1) * CR, CAGE[2]], 0.022, METAL, 6, 0.7);
  }
  for (i = 0; i < 8; i++) {
    var qa = i / 8 * Math.PI * 2;
    cyl([CAGE[0] + Math.cos(qa) * 0.12, CAGE[1] + Math.sin(qa) * 0.12, CAGE[2] - 0.12], [CAGE[0] + Math.cos(qa) * CR, CAGE[1] + Math.sin(qa) * CR, CAGE[2]], 0.012, METAL, 5, 0.6);
  }
  cyl([-0.32, 0.6, 0.45], [-0.45, 0.45, CAGE[2]], 0.025, METAL, 6, 0.6);
  cyl([0.32, 0.6, 0.45], [0.45, 0.45, CAGE[2]], 0.025, METAL, 6, 0.6);
  // hélice (malla aparte para hacerla girar)
  var pPos = [], pCol = [], pIdx = [], pSpec = [];
  (function () {
    var save = [tPos, tCol, tIdx, tSpec];
    tPos = pPos; tCol = pCol; tIdx = pIdx; tSpec = pSpec;
    var hub = [CAGE[0], CAGE[1], CAGE[2] - 0.08];
    box([hub[0], hub[1] + 0.33, hub[2]], [0.09, 0.62, 0.025], hex('#3b2a1c'), 0.5);
    box([hub[0], hub[1] - 0.33, hub[2]], [0.09, 0.62, 0.025], hex('#3b2a1c'), 0.5);
    cyl([hub[0], hub[1], hub[2] - 0.06], [hub[0], hub[1], hub[2] + 0.04], 0.06, DARK, 10, 0.5);
    tPos = save[0]; tCol = save[1]; tIdx = save[2]; tSpec = save[3];
  })();
  var PROP_HUB = [CAGE[0] + T[0], CAGE[1] + T[1], CAGE[2] - 0.08 + T[2]];

  function mesh(pos, col, idx, spec) {
    var nor = computeNormals(pos, idx);
    return { pos: buffer(new Float32Array(pos)), nor: buffer(new Float32Array(nor)), col: buffer(new Float32Array(col)), spec: buffer(new Float32Array(spec)), idx: buffer(new Uint16Array(idx), gl.ELEMENT_ARRAY_BUFFER), count: idx.length };
  }
  var wingMesh = mesh(wPos, wCol, wIdx, wSpec);
  var trikeMesh = mesh(tPos, tCol, tIdx, tSpec);
  var propMesh = mesh(pPos, pCol, pIdx, pSpec);

  /* ---------- Suspentaje en cascada ---------- */
  var L = [];
  var HANG = [[-0.42 + T[0], 0.75 + T[1], 0.45 + T[2]], [0.42 + T[0], 0.75 + T[1], 0.45 + T[2]]];
  var RISER = HANG.map(function (h) { return [h[0] * 0.8, h[1] + 0.55, h[2] - 0.05]; });
  var BRAKE = HANG.map(function (h) { return [h[0] * 1.05, h[1] + 0.2, h[2] + 0.12]; });
  function seg(a, b) { L.push(a[0], a[1], a[2], b[0], b[1], b[2]); }
  RISER.forEach(function (r, k) { seg(r, HANG[k]); });
  var STN = [0.06, 0.18, 0.3, 0.42, 0.54, 0.66, 0.77, 0.87, 0.95];
  [-1, 1].forEach(function (sd) {
    var riser = RISER[sd < 0 ? 0 : 1], brake = BRAKE[sd < 0 ? 0 : 1];
    [0.07, 0.3, 0.55, 0.985].forEach(function (t, row) {
      var target = row === 3 ? brake : riser;
      var mains = [];
      for (var k = 0; k < STN.length; k += 3) {
        var group = STN.slice(k, k + 3).map(function (s) { var p = wingPoint(sd * s, t, false); return p; });
        var mid = group.reduce(function (m, p) { return [m[0] + p[0] / group.length, m[1] + p[1] / group.length, m[2] + p[2] / group.length]; }, [0, 0, 0]);
        var cas = [lerp(mid[0], target[0], 0.32), lerp(mid[1], target[1], 0.32), lerp(mid[2], target[2], 0.32)];
        group.forEach(function (p) { seg(p, cas); });
        mains.push(cas);
      }
      mains.forEach(function (m) { seg(m, target); });
    });
  });
  var lineBuf = buffer(new Float32Array(L));
  var lineCount = L.length / 3;

  /* ---------- Nubes ---------- */
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
    despegue:   { pal: 'alba',   alt: 0.12, wing: [8.2, -1.4, -20, -0.95, 0.35], wingM: [1.2, 3.6, -26, -0.95, 0.35] },
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
  var cur = null, camZ = 0, last = performance.now(), time = 0;
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var scrollV = 0, lastScroll = window.scrollY, intro = 0;
  var visible = true, running = false;
  var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6);
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
    intro = Math.min(1, intro + dt * 0.45);
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

    /* vela */
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
    var w = cur.wing;
    var wp = w[4];
    var enter = smooth(intro);
    var bob = Math.sin(time * 0.9) * 0.18;
    var roll = clamp(scrollV * -0.004, -0.35, 0.35) + Math.sin(time * 0.53) * 0.05 + pointer.x * 0.12;
    var model = mul(translate(w[0] + (1 - enter) * 9, w[1] + bob + (1 - enter) * 2.5, camZ + w[2] - (1 - enter) * 30),
      mul(rotY(w[3]), mul(rotZ(roll), mul(rotX(wp + Math.sin(time * 0.7) * 0.03), scale(0.95)))));
    var camPos = [0, camY, camZ];
    var fog = cur.fog;

    gl.useProgram(wingP.p);
    gl.uniformMatrix4fv(wingP.u.uView, false, view);
    gl.uniformMatrix4fv(wingP.u.uProj, false, proj);
    gl.uniform3fv(wingP.u.uSunDir, sun); gl.uniform3fv(wingP.u.uSun, cur.sun);
    gl.uniform3fv(wingP.u.uAmb, cur.amb); gl.uniform3fv(wingP.u.uFog, fog);
    gl.uniform3fv(wingP.u.uCam, camPos);
    var spin = time * 38;
    var propModel = mul(model, mul(translate(PROP_HUB[0], PROP_HUB[1], PROP_HUB[2]), mul(rotZ(spin), translate(-PROP_HUB[0], -PROP_HUB[1], -PROP_HUB[2]))));
    [[wingMesh, model], [trikeMesh, model], [propMesh, propModel]].forEach(function (m) {
      var g = m[0];
      disableAll();
      bindAttr(wingP, 'aPos', g.pos, 3); bindAttr(wingP, 'aNor', g.nor, 3); bindAttr(wingP, 'aCol', g.col, 3); bindAttr(wingP, 'aSpec', g.spec, 1);
      gl.uniformMatrix4fv(wingP.u.uModel, false, m[1]);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idx);
      gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_SHORT, 0);
    });

    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(lineP.p);
    disableAll(); bindAttr(lineP, 'aPos', lineBuf, 3);
    gl.uniformMatrix4fv(lineP.u.uModel, false, model);
    gl.uniformMatrix4fv(lineP.u.uView, false, view);
    gl.uniformMatrix4fv(lineP.u.uProj, false, proj);
    gl.uniform3fv(lineP.u.uCol, [0.12, 0.13, 0.2]); gl.uniform3fv(lineP.u.uFog, fog);
    gl.uniform1f(lineP.u.uAlpha, 0.42);
    gl.drawArrays(gl.LINES, 0, lineCount);

    /* nubes: se ordenan de lejos a cerca */
    gl.depthMask(false);
    var layerY = lerp(1.2, -11, cur.alt);
    var n = 0;
    for (var ci = 0; ci < NC; ci++) {
      var cl = clouds[ci];
      var rel = ((cl.z + camZ) % DEPTH + DEPTH) % DEPTH; // 0..DEPTH por delante
      cl.wz = camZ - rel - 3;
      cl.wy = cl.high ? cl.y + lerp(2, -5, cur.alt) : layerY + cl.y;
      cl.rel = rel;
      order[n++] = cl;
    }
    order.sort(function (p, q) { return q.rel - p.rel; });
    var f = 0;
    for (ci = 0; ci < NC; ci++) {
      var cc = order[ci];
      var fadeNear = clamp((cc.rel - 4) / 14, 0, 1);
      var fadeFar = clamp((DEPTH - cc.rel) / 30, 0, 1);
      var alpha = cc.a * fadeNear * fadeFar * (cc.high ? 0.75 : 1);
      for (var v = 0; v < 4; v++) {
        cloudData[f++] = cc.x; cloudData[f++] = cc.wy; cloudData[f++] = cc.wz;
        cloudData[f++] = CORNERS[v * 2]; cloudData[f++] = CORNERS[v * 2 + 1];
        cloudData[f++] = cc.size; cloudData[f++] = cc.seed; cloudData[f++] = alpha;
      }
    }
    gl.useProgram(cloudP.p);
    disableAll();
    gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuf);
    gl.bufferData(gl.ARRAY_BUFFER, cloudData, gl.DYNAMIC_DRAW);
    bindAttr(cloudP, 'aCenter', cloudBuf, 3, 32, 0);
    bindAttr(cloudP, 'aCorner', cloudBuf, 2, 32, 12);
    bindAttr(cloudP, 'aMeta', cloudBuf, 3, 32, 20);
    gl.uniformMatrix4fv(cloudP.u.uView, false, view);
    gl.uniformMatrix4fv(cloudP.u.uProj, false, proj);
    gl.uniform3fv(cloudP.u.uLit, cur.lit); gl.uniform3fv(cloudP.u.uShadow, cur.shadow);
    gl.uniform3fv(cloudP.u.uFog, fog); gl.uniform1f(cloudP.u.uTime, time);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cloudIdx);
    gl.drawElements(gl.TRIANGLES, NC * 6, gl.UNSIGNED_SHORT, 0);

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
