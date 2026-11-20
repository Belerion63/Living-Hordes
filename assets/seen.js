/* =========================================================================
   Living Hordes documentation - interactive "being seen" diagram
   (simulation.html)

   Le joueur suit la souris (ou le doigt) dans le panneau et regarde dans la
   direction ou il se deplace. Des individus passent sur la route et derriere
   la maison. Les regles sont celles du texte et du mod :
     - rien ne devient reel hors du carre charge (66 tuiles de demi-cote) ;
     - a moins de 22 tuiles, un individu devient reel quoi qu'il arrive ;
     - au-dela, seulement s'il est dans le cone de vision et qu'aucun mur ne
       le cache. Cone : 144 degres, la valeur du jeu a pied, de jour et
       repose (LightingJNI.calculateVisionCone). Une fenetre intacte laisse
       passer la vue.
     - un zombie devenu reel le reste, et quitte la file : il a perdu sa
       migration.
   Couleurs du sonar de debogage. Sans animation, la file est figee mais le
   joueur reste mobile. Sans script, le schema statique d'origine s'affiche.
   ========================================================================= */
(function () {
  'use strict';

  var fig = document.getElementById('seen-fig');
  if (!fig) return;
  var oldSvg = fig.querySelector('svg.seen-static');
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------- monde -- */
  var S = 2.6;                         /* px par tuile */
  var PX0 = 20, PY0 = 10, PW = 600, PH = 360;
  var W = PW / S, H = PH / S;          /* panneau en tuiles */
  var AMBIENT = 22, HALF_SQ = 66, CONE = 144 * Math.PI / 180, INNER = 90;

  /* Maison : murs (segments en tuiles). Porte ouverte a droite, fenetre en bas. */
  var HX0 = 70, HY0 = 28, HX1 = 118, HY1 = 62;
  var DOOR = [42, 49], WIN = [88, 98];
  var WALLS = [
    [HX0, HY0, HX1, HY0],                      /* haut */
    [HX0, HY0, HX0, HY1],                      /* gauche */
    [HX1, HY0, HX1, DOOR[0]], [HX1, DOOR[1], HX1, HY1],   /* droite, porte */
    [HX0, HY1, WIN[0], HY1], [WIN[1], HY1, HX1, HY1]      /* bas, fenetre */
  ];
  var ROAD_Y = 98;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, fr, en, attrs) {
    ['fr', 'en'].forEach(function (l) {
      var a = { x: x, y: y, 'data-lang': l };
      for (var k in attrs || {}) a[k] = attrs[k];
      var t = el('text', a, parent);
      t.textContent = l === 'fr' ? fr : en;
    });
  }
  function px(x) { return PX0 + x * S; }
  function py(y) { return PY0 + y * S; }

  function motionOn() {
    var a = root.getAttribute('data-motion');
    if (a === 'on') return true;
    if (a === 'off') return false;
    return !mq.matches;
  }

  /* ---------------------------------------------------- construction -- */
  var svg = el('svg', { viewBox: '0 0 900 380', role: 'img',
    'aria-label': 'Schema interactif : le joueur suit la souris ; un individu devient reel s\'il est a moins de 22 tuiles, ou dans le cone de vision sans mur entre eux.' });
  svg.style.touchAction = 'none';
  el('clipPath', { id: 'seen-clip' }, el('defs', {}, svg))
    .appendChild(el('rect', { x: PX0, y: PY0, width: PW, height: PH, rx: 10 }));
  el('rect', { x: PX0, y: PY0, width: PW, height: PH, rx: 10, fill: '#101418' }, svg);
  var g = el('g', { 'clip-path': 'url(#seen-clip)' }, svg);

  /* route */
  el('rect', { x: PX0, y: py(ROAD_Y - 5), width: PW, height: 10 * S, fill: '#3a4048' }, g);
  el('line', { x1: PX0, y1: py(ROAD_Y), x2: PX0 + PW, y2: py(ROAD_Y), stroke: '#8a929c',
    'stroke-width': 1, 'stroke-dasharray': '10 8' }, g);
  /* sol de la maison */
  el('rect', { x: px(HX0), y: py(HY0), width: (HX1 - HX0) * S, height: (HY1 - HY0) * S,
    fill: '#1d232a' }, g);

  var cone = el('path', { fill: '#ffffff', 'fill-opacity': 0.10 }, g);
  var coneClip = el('path', {}, el('clipPath', { id: 'seen-cone-clip' }, svg.querySelector('defs')));
  var shadows = el('g', { fill: '#101418', 'fill-opacity': 0.85, 'clip-path': 'url(#seen-cone-clip)' }, g);
  var square = el('rect', { fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.7, 'stroke-width': 2 }, g);
  var ambient = el('circle', { r: AMBIENT * S, fill: 'none', stroke: '#ff8c33',
    'stroke-opacity': 0.8, 'stroke-width': 2 }, g);

  /* murs, fenetre */
  WALLS.forEach(function (w) {
    el('line', { x1: px(w[0]), y1: py(w[1]), x2: px(w[2]), y2: py(w[3]),
      stroke: '#c9d1d9', 'stroke-width': 4, 'stroke-linecap': 'square' }, g);
  });
  el('line', { x1: px(WIN[0]), y1: py(HY1), x2: px(WIN[1]), y2: py(HY1),
    stroke: '#7fb8e6', 'stroke-width': 3 }, g);

  var zLayer = el('g', {}, g);
  var player = el('g', {}, g);
  el('circle', { r: 6, fill: '#33ff33', stroke: '#000', 'stroke-width': 2 }, player);

  /* legende */
  var L = el('g', { 'font-size': 12.5, fill: 'var(--text)' }, svg);
  var countLine = el('g', { 'font-size': 15, 'font-weight': 600, fill: 'var(--text)' }, svg);
  var cntFr = el('text', { x: 642, y: 36, 'data-lang': 'fr' }, countLine);
  var cntEn = el('text', { x: 642, y: 36, 'data-lang': 'en' }, countLine);

  var cta = el('g', {}, svg);
  el('rect', { class: 'ctapulse', x: 640, y: 54, width: 244, height: 52, rx: 14, fill: 'var(--page)',
    'fill-opacity': 0.16, stroke: 'var(--page)', 'stroke-width': 2 }, cta);
  txt(cta, 762, 76, 'Promener la souris dans le', 'Move the mouse inside the',
    { 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 600 });
  txt(cta, 762, 95, 'schéma pour guider le joueur', 'diagram to guide the player',
    { 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 600 });

  var ly = 136;
  function item(drawFn, fr, en) {
    drawFn(ly - 4);
    txt(L, 668, ly, fr, en);
    ly += 25;
  }
  item(function (y) { el('circle', { cx: 652, cy: y, r: 6, fill: '#33ff33', stroke: '#000', 'stroke-width': 2 }, L); },
    'le joueur', 'the player');
  item(function (y) { el('path', { d: 'M 645 ' + (y + 6) + ' L 652 ' + (y - 6) + ' L 659 ' + (y + 6) + ' Z', fill: '#ffffff', 'fill-opacity': 0.25 }, L); },
    'cône de vision, 144°', 'vision cone, 144°');
  item(function (y) { el('circle', { cx: 652, cy: y, r: 7, fill: 'none', stroke: '#ff8c33', 'stroke-width': 2 }, L); },
    '22 tuiles : réel quoi qu\'il arrive', '22 tiles: real no matter what');
  item(function (y) { el('rect', { x: 645, y: y - 7, width: 14, height: 14, fill: 'none', stroke: '#ffffff', 'stroke-width': 2 }, L); },
    'bord du carré chargé', 'edge of the loaded square');
  item(function (y) { el('circle', { cx: 648, cy: y, r: 2.8, fill: '#000', stroke: '#e666b3', 'stroke-width': 1.6 }, L);
                      el('circle', { cx: 657, cy: y, r: 2.8, fill: '#000', stroke: '#00e6e6', 'stroke-width': 1.6 }, L); },
    'individu, encore en route', 'individual, still on its way');
  item(function (y) { el('circle', { cx: 652, cy: y, r: 2.8, fill: '#000', stroke: '#ffffff', 'stroke-width': 1.6 }, L); },
    'zombie réel', 'real zombie');
  item(function (y) { el('line', { x1: 644, y1: y, x2: 660, y2: y, stroke: '#7fb8e6', 'stroke-width': 3 }, L); },
    'fenêtre : la vue passe', 'window: sight goes through');
  item(function (y) { el('line', { x1: 644, y1: y, x2: 660, y2: y, stroke: '#c9d1d9', 'stroke-width': 4 }, L); },
    'mur : la vue s\'arrête', 'wall: sight stops');

  /* ----------------------------------------------------------- etat -- */
  var P = { x: 104, y: 46, dir: 0 };                /* cache dans la maison, face a la porte */
  var zs = [];
  var time = 0;

  function spawnAll() {
    while (zLayer.firstChild) zLayer.removeChild(zLayer.firstChild);
    zs = [];
    var i;
    for (i = 0; i < 16; i++) {                       /* la file sur la route */
      zs.push({ x: 4 + i * 14.5, y: ROAD_Y + (Math.random() - 0.5) * 7, vx: 6, vy: 0, real: false });
    }
    for (i = 0; i < 6; i++) {                        /* quelques-uns derriere la maison */
      zs.push({ x: 10 + i * 38, y: 14 + (Math.random() - 0.5) * 6, vx: 5, vy: 0, real: false });
    }
    zs.forEach(function (z) {
      z.home = z.y;
      z.node = el('circle', { r: 2.8, fill: '#000', 'stroke-width': 1.6 }, zLayer);
    });
  }

  function cross(ax, ay, bx, by, cx, cy, dx, dy) {     /* les segments AB et CD se coupent */
    function o(px1, py1, px2, py2, px3, py3) {
      return (px2 - px1) * (py3 - py1) - (py2 - py1) * (px3 - px1);
    }
    var d1 = o(cx, cy, dx, dy, ax, ay), d2 = o(cx, cy, dx, dy, bx, by);
    var d3 = o(ax, ay, bx, by, cx, cy), d4 = o(ax, ay, bx, by, dx, dy);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }
  function blocked(x, y) {
    for (var i = 0; i < WALLS.length; i++) {
      var w = WALLS[i];
      if (cross(P.x, P.y, x, y, w[0], w[1], w[2], w[3])) return true;
    }
    return false;
  }
  function seen(z) {
    var dx = z.x - P.x, dy = z.y - P.y;
    if (Math.abs(dx) > HALF_SQ || Math.abs(dy) > HALF_SQ) return false;   /* hors du carre */
    var d = Math.hypot(dx, dy);
    if (d < AMBIENT) return true;                                          /* on l'entend */
    var a = Math.atan2(dy, dx) - P.dir;
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    if (Math.abs(a) > CONE / 2) return false;
    return !blocked(z.x, z.y);
  }

  function drawView() {
    var cx = px(P.x), cy = py(P.y), R = 900;
    var a0 = P.dir - CONE / 2, a1 = P.dir + CONE / 2, d = 'M ' + cx + ' ' + cy;
    for (var k = 0; k <= 16; k++) {
      var a = a0 + (a1 - a0) * k / 16;
      d += ' L ' + (cx + Math.cos(a) * R).toFixed(1) + ' ' + (cy + Math.sin(a) * R).toFixed(1);
    }
    cone.setAttribute('d', d + ' Z');
    coneClip.setAttribute('d', d + ' Z');
    /* ombres portees par les murs (pas par la fenetre) */
    while (shadows.firstChild) shadows.removeChild(shadows.firstChild);
    WALLS.forEach(function (w) {
      var ax = px(w[0]), ay = py(w[1]), bx = px(w[2]), by = py(w[3]);
      function far(x, y) {
        var vx = x - cx, vy = y - cy, n = Math.hypot(vx, vy) || 1;
        return [x + vx / n * 2000, y + vy / n * 2000];
      }
      var A = far(ax, ay), B = far(bx, by);
      el('path', { d: 'M ' + ax + ' ' + ay + ' L ' + bx + ' ' + by + ' L ' + B[0] + ' ' + B[1] +
        ' L ' + A[0] + ' ' + A[1] + ' Z' }, shadows);
    });
    square.setAttribute('x', px(P.x - HALF_SQ)); square.setAttribute('y', py(P.y - HALF_SQ));
    square.setAttribute('width', 2 * HALF_SQ * S); square.setAttribute('height', 2 * HALF_SQ * S);
    ambient.setAttribute('cx', cx); ambient.setAttribute('cy', cy);
    player.setAttribute('transform', 'translate(' + cx + ',' + cy + ')');
  }

  function step(dt) {
    var moving = motionOn();
    time += dt;
    var nReal = 0, nWay = 0;
    zs.forEach(function (z) {
      if (z.real && (Math.abs(z.x - P.x) > HALF_SQ + 10 || Math.abs(z.y - P.y) > HALF_SQ + 10)) {
        /* sorti du carre charge : il redevient un individu et reprend la route */
        z.real = false;
      }
      if (!z.real) {
        if (moving) {
          z.x += z.vx * dt;
          if (z.x > W + 6) z.x = -6;               /* la file continue */
        }
        if (seen(z)) z.real = true;
      } else if (moving) {
        /* devenu reel : il quitte la file et tourne sur place */
        z.x += Math.cos(time * 0.9 + z.home) * 0.6 * dt;
        z.y += Math.sin(time * 0.7 + z.home) * 0.6 * dt;
      }
      if (z.real) nReal++; else nWay++;
      z.node.setAttribute('cx', px(z.x).toFixed(1));
      z.node.setAttribute('cy', py(z.y).toFixed(1));
      var d = Math.hypot(z.x - P.x, z.y - P.y);
      z.node.setAttribute('stroke', z.real ? '#ffffff' : (d <= INNER ? '#00e6e6' : '#e666b3'));
    });
    cntFr.textContent = 'réels : ' + nReal + '   ·   encore en route : ' + nWay;
    cntEn.textContent = 'real: ' + nReal + '   ·   still on their way: ' + nWay;
  }

  /* --------------------------------------------------------- pointeur -- */
  function toWorld(e) {
    var r = svg.getBoundingClientRect();
    var sx = (e.clientX - r.left) / r.width * 900, sy = (e.clientY - r.top) / r.height * 380;
    return { x: (sx - PX0) / S, y: (sy - PY0) / S, inside: sx >= PX0 && sx <= PX0 + PW && sy >= PY0 && sy <= PY0 + PH };
  }
  svg.addEventListener('pointermove', function (e) {
    var w = toWorld(e);
    if (!w.inside) return;
    var dx = w.x - P.x, dy = w.y - P.y;
    if (Math.hypot(dx, dy) > 0.4) P.dir = Math.atan2(dy, dx);    /* il regarde ou il va */
    P.x = Math.max(2, Math.min(W - 2, w.x));
    P.y = Math.max(2, Math.min(H - 2, w.y));
    drawView();
    if (!running) step(0);
  });

  /* ------------------------------------------------------- mise en route */
  var running = false, raf = 0, last = 0, visible = true;
  function frame(t) {
    raf = 0;
    if (!running) return;
    var dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
    last = t;
    step(dt);
    raf = requestAnimationFrame(frame);
  }
  function update() {
    var want = visible;                  /* sans animation : file figee, joueur mobile */
    if (want && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
    else if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  }

  if (oldSvg) oldSvg.style.display = 'none';
  fig.insertBefore(svg, fig.firstChild);
  spawnAll();
  drawView();
  step(0);
  new MutationObserver(function () { step(0); }).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; update(); }).observe(svg);
  }
  update();
})();
