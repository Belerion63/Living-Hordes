/* =========================================================================
   Living Hordes documentation - how a horde reacts to a sound (sound.html)

   Quatre scenes en boucle, aux couleurs du sonar (migration rouge, posee
   orange, errance jaune) :
     1. en migration : le chemin passe par un point proche du bruit, puis
        reprend la destination d'origine ;
     2. posee : un morceau se detache, passe par la zone du bruit, puis part
        vers sa propre destination ; le reste demeure ;
     3. en errance : elle tourne, mais sa derive penche vers le bruit ;
     4. detour refuse : de l'autre cote d'une riviere sans pont, le chemin
        serait plus de deux fois plus long que la ligne droite ; la horde garde
        son trajet.
   Sans animation, chaque scene montre son trajet entier, horde a l'arrivee.
   ========================================================================= */
(function () {
  'use strict';
  var fig = document.getElementById('react-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var MIG = '#ff2626', SET = '#ff8c0d', ROAM = '#ffe619', SOUND = '#ffd166';

  function motionOn() {
    var a = root.getAttribute('data-motion');
    if (a === 'on') return true;
    if (a === 'off') return false;
    return !mq.matches;
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pair(parent, x, y, fr, en, attrs) {
    ['fr', 'en'].forEach(function (l) {
      var a = { x: x, y: y, 'data-lang': l };
      for (var k in attrs || {}) a[k] = attrs[k];
      el('text', a, parent).textContent = l === 'fr' ? fr : en;
    });
  }

  var svg = el('svg', { viewBox: '0 0 900 330', role: 'img', 'aria-label': 'Ce que fait une horde qui entend un bruit, selon son etat.' });
  var PW = 210, PH = 190, PY = 40;
  var TITLES = [['En migration', 'Migrating'], ['Posée', 'Settled'], ['En errance', 'Roaming'], ['Détour trop long', 'Detour too long']];
  var CAPS = [
    [['un détour par le bruit,', 'puis elle reprend sa route'], ['a detour through the sound,', 'then back on its route']],
    [['un morceau y passe, puis part', 'ailleurs ; le reste demeure'], ['a piece passes through, then', 'leaves; the rest stays']],
    [['elle tourne, mais sa dérive', 'penche vers le bruit'], ['it circles, but its drift', 'leans towards the sound']],
    [['plus de deux fois la ligne droite :', 'refusé, elle garde son trajet'], ['more than twice the straight line:', 'refused, it keeps its route']]
  ];
  var P = [];
  for (var i = 0; i < 4; i++) {
    var x0 = 12 + i * 222;
    pair(svg, x0 + PW / 2, 28, TITLES[i][0], TITLES[i][1], { 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 600, fill: 'var(--text)' });
    el('rect', { x: x0, y: PY, width: PW, height: PH, rx: 8, fill: '#101418' }, svg);
    pair(svg, x0 + PW / 2, PY + PH + 22, CAPS[i][0][0], CAPS[i][1][0], { 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--text-dim)' });
    pair(svg, x0 + PW / 2, PY + PH + 39, CAPS[i][0][1], CAPS[i][1][1], { 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--text-dim)' });
    P.push({ x0: x0, g: el('g', {}, svg) });
  }
  function sound(g, x, y) {
    el('circle', { cx: x, cy: y, r: 26, fill: SOUND, 'fill-opacity': 0.08, stroke: SOUND, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, g);
    el('circle', { cx: x, cy: y, r: 5, fill: SOUND }, g);
    pair(g, x, y - 32, 'bruit', 'sound', { 'text-anchor': 'middle', 'font-size': 12, fill: SOUND });
  }
  function route(g, d, color, dash) {
    return el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-opacity': 0.55, 'stroke-dasharray': dash || '' }, g);
  }
  function horde(g, color, r) {
    return el('circle', { r: r, fill: color, 'fill-opacity': 0.85, stroke: '#000', 'stroke-opacity': 0.4, 'stroke-width': 2 }, g);
  }
  function dest(g, x, y, fr, en) {
    el('rect', { x: x - 6, y: y - 6, width: 12, height: 12, fill: 'none', stroke: 'var(--text-dim)', 'stroke-width': 1.5 }, g);
    pair(g, x, y + 20, fr, en, { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--text-dim)' });
  }

  /* 1. migration */
  var a = P[0].x0, y0 = PY;
  sound(P[0].g, a + 105, y0 + 58);
  dest(P[0].g, a + 185, y0 + 150, 'destination', 'destination');
  route(P[0].g, 'M ' + (a + 22) + ' ' + (y0 + 150) + ' L ' + (a + 185) + ' ' + (y0 + 150), 'var(--text-faint)', '3 4');
  var p1 = route(P[0].g, 'M ' + (a + 22) + ' ' + (y0 + 150) + ' C ' + (a + 50) + ' ' + (y0 + 60) + ', ' + (a + 90) + ' ' + (y0 + 70) +
    ', ' + (a + 112) + ' ' + (y0 + 76) + ' S ' + (a + 175) + ' ' + (y0 + 110) + ', ' + (a + 185) + ' ' + (y0 + 150), MIG);
  var h1 = horde(P[0].g, MIG, 11);

  /* 2. posee : le morceau devient une migrante */
  var b = P[1].x0;
  sound(P[1].g, b + 120, y0 + 55);
  horde(P[1].g, SET, 20).setAttribute('transform', 'translate(' + (b + 45) + ',' + (y0 + 140) + ')');
  pair(P[1].g, b + 45, y0 + 176, 'le reste demeure', 'the rest stays', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--text-dim)' });
  dest(P[1].g, b + 185, y0 + 135, 'sa destination', 'its destination');
  var p2 = route(P[1].g, 'M ' + (b + 58) + ' ' + (y0 + 125) + ' C ' + (b + 80) + ' ' + (y0 + 60) + ', ' + (b + 110) + ' ' + (y0 + 48) +
    ', ' + (b + 128) + ' ' + (y0 + 62) + ' S ' + (b + 180) + ' ' + (y0 + 100) + ', ' + (b + 185) + ' ' + (y0 + 135), MIG);
  var h2 = horde(P[1].g, MIG, 8);

  /* 3. errance : boucles qui derivent vers le bruit */
  var c = P[2].x0;
  sound(P[2].g, c + 165, y0 + 60);
  var d3 = 'M ' + (c + 30) + ' ' + (y0 + 160);
  for (var k = 1; k <= 36; k++) {
    var t = k / 36, ang = t * Math.PI * 7;
    var cx = c + 30 + t * 110, cy = y0 + 160 - t * 80;
    d3 += ' L ' + (cx + Math.cos(ang) * 14).toFixed(1) + ' ' + (cy + Math.sin(ang) * 14).toFixed(1);
  }
  var p3 = route(P[2].g, d3, ROAM);
  var h3 = horde(P[2].g, ROAM, 10);

  /* 4. detour refuse : riviere sans pont */
  var e = P[3].x0;
  el('path', { d: 'M ' + (e + 120) + ' ' + y0 + ' C ' + (e + 100) + ' ' + (y0 + 60) + ', ' + (e + 140) + ' ' + (y0 + 120) +
    ', ' + (e + 118) + ' ' + (y0 + PH), fill: 'none', stroke: '#4f86c6', 'stroke-width': 18, 'stroke-opacity': 0.8 }, P[3].g);
  sound(P[3].g, e + 175, y0 + 75);
  route(P[3].g, 'M ' + (e + 60) + ' ' + (y0 + 100) + ' L ' + (e + 175) + ' ' + (y0 + 75), 'var(--text-faint)', '3 4');
  pair(P[3].g, e + 60, y0 + 70, 'pas de pont', 'no bridge', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--text-dim)' });
  dest(P[3].g, e + 60, y0 + 172, 'sa route', 'its route');
  var p4 = route(P[3].g, 'M ' + (e + 60) + ' ' + (y0 + 100) + ' L ' + (e + 60) + ' ' + (y0 + 172), MIG);
  var h4 = horde(P[3].g, MIG, 11);
  var cross = el('g', { stroke: '#ff5c5c', 'stroke-width': 3 }, P[3].g);
  el('line', { x1: e + 110, y1: y0 + 80, x2: e + 126, y2: y0 + 96 }, cross);
  el('line', { x1: e + 126, y1: y0 + 80, x2: e + 110, y2: y0 + 96 }, cross);

  /* legende */
  var L = el('g', { 'font-size': 12.5, fill: 'var(--text)' }, svg);
  [[MIG, 'en migration', 'migrating', 250], [SET, 'posée', 'settled', 410], [ROAM, 'en errance', 'roaming', 530]].forEach(function (r) {
    el('circle', { cx: r[3], cy: 316, r: 7, fill: r[0] }, L);
    pair(L, r[3] + 13, 320, r[1], r[2]);
  });

  var paths = [[p1, h1, 0], [p2, h2, 0.15], [p3, h3, 0], [p4, h4, 0]];
  function place(k) {
    paths.forEach(function (q) {
      var len = q[0].getTotalLength();
      var f = Math.max(0, Math.min(1, (k - q[2]) / (1 - q[2])));
      var pt = q[0].getPointAtLength(len * f);
      q[1].setAttribute('cx', pt.x); q[1].setAttribute('cy', pt.y);
    });
  }
  var LOOP = 6, raf = 0, t0 = 0, running = false, visible = true;
  function frame(now) {
    raf = 0;
    if (!running) return;
    if (!t0) t0 = now;
    var tt = ((now - t0) / 1000) % (LOOP + 1.2);
    place(Math.min(1, tt / LOOP));
    raf = requestAnimationFrame(frame);
  }
  function update() {
    var want = motionOn() && visible;
    if (want && !running) { running = true; t0 = 0; raf = requestAnimationFrame(frame); }
    else if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    if (!motionOn()) place(1);
  }

  Array.prototype.forEach.call(fig.children, function (ch) {
    if (ch.tagName.toLowerCase() !== 'figcaption') ch.style.display = 'none';
  });
  fig.insertBefore(svg, fig.firstChild);
  place(motionOn() ? 0 : 1);
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  if (mq.addEventListener) mq.addEventListener('change', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; update(); }).observe(svg);
  }
  update();
})();
