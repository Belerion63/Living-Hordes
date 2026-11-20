/* =========================================================================
   Living Hordes documentation - the four encounters, animated (hordes.html)

   Quatre petites scenes en boucle, aux couleurs du sonar de debogage
   (posee orange, en migration rouge). Elles suivent ZM_BlobInteraction :
     1. deux posees ne fusionnent pas, elles s'ecartent ;
     2. deux migrantes : la plus petite se vide zombie par zombie dans la plus
        grande, jusqu'a la taille limite de celle-ci ;
     3. une petite migrante contre une posee : decalee sur le cote, jamais
        renvoyee en arriere, elle contourne ;
     4. une grosse migrante contre une posee : chaque zombie de la posee est
        tire au sort, une partie seulement la suit.
   Sans animation, chaque scene s'arrete sur son image la plus parlante.
   ========================================================================= */
(function () {
  'use strict';
  var fig = document.getElementById('enc-fig');
  if (!fig) return;
  var oldSvg = fig.querySelector('svg.enc-static');
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  var SETTLED = '#ff8c0d', MIGRANT = '#ff2626';
  var PX = 0.9;                                    /* px par tuile */
  function rad(size) { return (5 + 4 * Math.sqrt(Math.max(size, 0))) * PX; }
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

  var svg = el('svg', { viewBox: '0 0 900 330', role: 'img',
    'aria-label': 'Les quatre rencontres entre hordes, animees.' });
  var PW = 210, PH = 170, PY = 44;
  var panels = [];
  var TITLES = [
    ['Deux hordes posées', 'Two settled hordes'],
    ['Deux migrantes', 'Two migrants'],
    ['Migrante plus petite', 'Smaller migrant'],
    ['Migrante plus grosse', 'Larger migrant']
  ];
  var CAPS = [
    [['pas de fusion :', 'elles s\'écartent'], ['no merge:', 'they move apart']],
    [['la plus petite se vide dans la', 'grande, jusqu\'à sa taille limite'], ['the smaller drains into the larger,', 'up to its size limit']],
    [['décalée sur le côté, jamais', 'renvoyée en arrière : elle contourne'], ['pushed sideways, never sent', 'back: it goes around']],
    [['chaque zombie est tiré au sort :', 'une partie seulement suit'], ['each zombie is drawn at random:', 'only part of them follow']]
  ];
  for (var i = 0; i < 4; i++) {
    var x0 = 12 + i * 222;
    pair(svg, x0 + PW / 2, 30, TITLES[i][0], TITLES[i][1],
      { 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 600, fill: 'var(--text)' });
    el('clipPath', { id: 'enc-clip' + i }, el('defs', {}, svg))
      .appendChild(el('rect', { x: x0, y: PY, width: PW, height: PH, rx: 8 }));
    el('rect', { x: x0, y: PY, width: PW, height: PH, rx: 8, fill: '#101418' }, svg);
    var g = el('g', { 'clip-path': 'url(#enc-clip' + i + ')' }, svg);
    pair(svg, x0 + PW / 2, PY + PH + 22, CAPS[i][0][0], CAPS[i][1][0],
      { 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--text-dim)' });
    pair(svg, x0 + PW / 2, PY + PH + 39, CAPS[i][0][1], CAPS[i][1][1],
      { 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--text-dim)' });
    panels.push({ x0: x0, g: g });
  }
  /* legende */
  var L = el('g', { 'font-size': 12.5, fill: 'var(--text)' }, svg);
  el('circle', { cx: 300, cy: 312, r: 7, fill: SETTLED }, L);
  pair(L, 313, 316, 'horde posée', 'settled horde');
  el('circle', { cx: 440, cy: 312, r: 7, fill: MIGRANT }, L);
  pair(L, 453, 316, 'horde en migration', 'migrating horde');
  el('circle', { cx: 600, cy: 312, r: 3, fill: '#ffe066' }, L);
  pair(L, 611, 316, 'zombie qui passe', 'zombie changing hordes');

  /* --------------------------------------------------- objets dessines -- */
  function blob(g, color) {
    var c = el('circle', { fill: color, 'fill-opacity': 0.8, stroke: '#000', 'stroke-opacity': 0.4, 'stroke-width': 2 }, g);
    var t = el('text', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: '#000' }, g);
    var cap = el('circle', { fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0, 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }, g);
    return { c: c, t: t, cap: cap, set: function (x, y, size, capSize) {
      var r = rad(size);
      c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', r.toFixed(1));
      t.setAttribute('x', x.toFixed(1)); t.setAttribute('y', (y + 4).toFixed(1));
      t.textContent = Math.round(size);
      c.style.display = size > 0.5 ? '' : 'none';
      t.style.display = size > 0.5 ? '' : 'none';
      if (capSize) {
        cap.setAttribute('cx', x.toFixed(1)); cap.setAttribute('cy', y.toFixed(1));
        cap.setAttribute('r', rad(capSize).toFixed(1)); cap.setAttribute('stroke-opacity', 0.5);
      }
    } };
  }
  function flyer(g) { return el('circle', { r: 2.6, fill: '#ffe066' }, g); }

  var P = panels.map(function (p) { return { x0: p.x0, g: p.g }; });
  var cy = PY + PH / 2;

  /* scene 1 : deux posees qui se chevauchent s'ecartent, masses ponderees */
  var s1a = blob(P[0].g, SETTLED), s1b = blob(P[0].g, SETTLED);
  function scene1(t) {
    var A = 40, B = 25, ra = rad(A), rb = rad(B);
    var gap0 = (ra + rb) * 0.55, gap1 = ra + rb + 2;
    var k = Math.min(1, t / 3); k = 1 - Math.pow(1 - k, 3);
    var d = gap0 + (gap1 - gap0) * k;
    var mid = P[0].x0 + 105;
    var wa = B / (A + B), wb = A / (A + B);        /* la plus grosse bouge moins */
    s1a.set(mid - d * wa, cy, A);
    s1b.set(mid + d * wb, cy, B);
  }

  /* scene 2 : deux migrantes, transfert jusqu'a la limite de la receveuse */
  var s2a = blob(P[1].g, MIGRANT), s2b = blob(P[1].g, MIGRANT);
  var s2f = [flyer(P[1].g), flyer(P[1].g), flyer(P[1].g)];
  function scene2(t) {
    var A0 = 38, B0 = 22, CAP = 50;
    var x0 = P[1].x0;
    var meet = 2.2, rate = 5;                      /* zombies par seconde */
    var moved = Math.min(B0, Math.min(CAP - A0, Math.max(0, (t - meet) * rate)));
    var A = A0 + moved, B = B0 - moved;
    var ax = x0 + 30 + Math.min(t, meet) * 22;
    var bx = x0 + 190 - Math.min(t, meet) * 22;
    var by = cy;
    var full = A >= CAP - 0.01;
    if (full) {                                    /* a sa limite : plus d'absorption, elles se separent */
      var tFull = meet + (CAP - A0) / rate;
      var u = Math.max(0, t - tFull);
      bx -= u * 14; by = cy + Math.min(u * 18, 50);
    }
    s2a.set(ax, cy, A, CAP);
    s2b.set(bx, by, B);
    s2f.forEach(function (f, i) {
      var on = t > meet && !full && B > 0;
      f.style.display = on ? '' : 'none';
      if (!on) return;
      var ph = ((t * 2.2) + i / 3) % 1;
      f.setAttribute('cx', (bx + (ax - bx) * ph).toFixed(1));
      f.setAttribute('cy', (by + (cy - by) * ph + Math.sin(ph * Math.PI) * -8).toFixed(1));
    });
  }

  /* scene 3 : petite migrante decalee sur le cote, jamais en arriere */
  var s3a = blob(P[2].g, SETTLED), s3b = blob(P[2].g, MIGRANT);
  var trail3 = el('path', { fill: 'none', stroke: MIGRANT, 'stroke-opacity': 0.5, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, P[2].g);
  function scene3(t) {
    var A = 45, B = 14, ra = rad(A), rb = rad(B);
    var cxA = P[2].x0 + 105, cyA = cy + 8;
    s3a.set(cxA, cyA, A);
    var x = P[2].x0 + 10 + t * 30;
    var y = cy - 10;
    /* au contact, elle glisse le long du bord : decalee vers le haut, jamais vers l'arriere */
    var dx = x - cxA, need = ra + rb + 1;
    if (Math.abs(dx) < need) {
      var dyNeed = Math.sqrt(Math.max(0, need * need - dx * dx));
      y = Math.min(y, cyA - dyNeed);
    }
    s3b.set(x, y, B);
    if (!scene3.d || t < 0.05) scene3.d = 'M ' + x.toFixed(1) + ' ' + y.toFixed(1);
    else scene3.d += ' L ' + x.toFixed(1) + ' ' + y.toFixed(1);
    trail3.setAttribute('d', scene3.d);
  }

  /* scene 4 : grosse migrante, tirage zombie par zombie */
  var s4a = blob(P[3].g, SETTLED), s4b = blob(P[3].g, MIGRANT);
  var s4f = [flyer(P[3].g), flyer(P[3].g), flyer(P[3].g)];
  var draw4 = null;
  function newDraw() {                              /* combien suivront, tire a chaque passage */
    var n = 0;
    for (var i = 0; i < 24; i++) if (Math.random() < 0.35) n++;
    draw4 = { follow: n };
  }
  function scene4(t) {
    if (!draw4) newDraw();
    var A0 = 24, B0 = 40;
    var cxA = P[3].x0 + 110, cyA = cy + 14;
    var x = P[3].x0 + 20 + t * 26;
    var ra0 = rad(A0), rb0 = rad(B0);
    var contact = Math.abs(x - cxA) < (ra0 + rb0) * 0.85;
    var t0 = (cxA - (ra0 + rb0) * 0.85 - (P[3].x0 + 20)) / 26;
    var t1 = (cxA + (ra0 + rb0) * 0.85 - (P[3].x0 + 20)) / 26;
    var k = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
    var moved = Math.round(draw4.follow * k);
    s4a.set(cxA, cyA, A0 - moved);
    s4b.set(x, cy - 22, B0 + moved);
    s4f.forEach(function (f, i) {
      var on = contact && moved < draw4.follow;
      f.style.display = on ? '' : 'none';
      if (!on) return;
      var ph = ((t * 2) + i / 3) % 1;
      f.setAttribute('cx', (cxA + (x - cxA) * ph).toFixed(1));
      f.setAttribute('cy', (cyA + (cy - 22 - cyA) * ph).toFixed(1));
    });
  }

  var SCENES = [scene1, scene2, scene3, scene4];
  var LOOP = 9;                                     /* secondes par boucle */
  var STILL = [4, 5.6, 3.6, 4.6];                   /* image arretee sans animation */

  var raf = 0, t0 = 0, running = false, visible = true, lastCycle = -1;
  function frame(now) {
    raf = 0;
    if (!running) return;
    if (!t0) t0 = now;
    var tt = (now - t0) / 1000;
    var cyc = Math.floor(tt / LOOP), t = tt % LOOP;
    if (cyc !== lastCycle) { lastCycle = cyc; newDraw(); scene3.d = null; }
    SCENES.forEach(function (fn) { fn(Math.min(t, LOOP - 1.5)); });
    raf = requestAnimationFrame(frame);
  }
  function still() {
    scene3.d = null;
    SCENES.forEach(function (fn, i) {
      if (i === 2) { for (var s = 0; s <= STILL[2]; s += 0.1) fn(s); } else fn(STILL[i]);
    });
  }
  function update() {
    var want = motionOn() && visible;
    if (want && !running) { running = true; t0 = 0; raf = requestAnimationFrame(frame); }
    else if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    if (!motionOn()) still();
  }

  if (oldSvg) oldSvg.style.display = 'none';
  fig.insertBefore(svg, fig.firstChild);
  still();
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  if (mq.addEventListener) mq.addEventListener('change', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; update(); }).observe(svg);
  }
  update();
})();
