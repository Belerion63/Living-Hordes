/* =========================================================================
   Living Hordes documentation - interactive perimeter (defense.html)

   A partir de chaque element construit, le mod remonte de proche en proche
   le long des murs de la carte qui y sont raccordes, et les suit comme les
   siens. Quand une portion construite est retiree, les murs qui ne tiennent
   plus a rien sont relaches. Un clic pose ou retire un bout de cloture ; le
   raccordement progresse arete par arete (instantane sans animation).
   ========================================================================= */
(function () {
  'use strict';
  var fig = document.getElementById('perim-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var U = 26, OX = 40, OY = 46;
  var BUILT = '#e0703a', TRACKED = '#6fd17a', MAP = '#6b7480';

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

  /* ------------------------------------------------------ geometrie --- */
  /* batiments (en unites de grille) : leurs murs sont ceux de la carte */
  var BUILDINGS = [[2, 1, 7, 4], [12, 1, 17, 4], [2, 8, 17, 10], [10, 5, 12, 7]];
  /* emplacements de cloture : x1, y1, x2, y2 */
  var SLOTS = [
    { id: 'top',   seg: [7, 2, 12, 2],  built: true },
    { id: 'left',  seg: [6, 4, 6, 8],   built: true },
    { id: 'right', seg: [17, 4, 17, 8], built: true },
    { id: 'mid',   seg: [12, 6, 17, 6], built: false }
  ];
  function unitEdges(x1, y1, x2, y2) {
    var out = [];
    if (y1 === y2) for (var x = Math.min(x1, x2); x < Math.max(x1, x2); x++) out.push([x, y1, x + 1, y1]);
    else for (var y = Math.min(y1, y2); y < Math.max(y1, y2); y++) out.push([x1, y, x1, y + 1]);
    return out;
  }
  var mapEdges = [];
  BUILDINGS.forEach(function (b) {
    [[b[0], b[1], b[2], b[1]], [b[0], b[3], b[2], b[3]], [b[0], b[1], b[0], b[3]], [b[2], b[1], b[2], b[3]]]
      .forEach(function (s) { unitEdges.apply(null, s).forEach(function (e) { mapEdges.push({ e: e, on: false }); }); });
  });
  function pk(x, y) { return x + ',' + y; }

  /* ---------------------------------------------------------- dessin --- */
  var svg = el('svg', { viewBox: '0 0 900 330', role: 'img',
    'aria-label': 'Perimetre interactif : poser ou retirer une cloture, voir les murs raccordes.' });
  el('rect', { x: OX - 16, y: OY - 26, width: 17 * U + 32, height: 11 * U + 40, rx: 10, fill: '#101418' }, svg);
  BUILDINGS.forEach(function (b) {
    el('rect', { x: OX + b[0] * U, y: OY + b[1] * U, width: (b[2] - b[0]) * U, height: (b[3] - b[1]) * U,
      fill: '#1f252c' }, svg);
  });
  var wallLayer = el('g', { 'stroke-linecap': 'round' }, svg);
  mapEdges.forEach(function (m) {
    m.el = el('line', { x1: OX + m.e[0] * U, y1: OY + m.e[1] * U, x2: OX + m.e[2] * U, y2: OY + m.e[3] * U,
      'stroke-width': 4 }, wallLayer);
  });
  SLOTS.forEach(function (s) {
    var g = el('g', { class: 'rlink', tabindex: 0, role: 'button' }, svg);
    var x1 = OX + s.seg[0] * U, y1 = OY + s.seg[1] * U, x2 = OX + s.seg[2] * U, y2 = OY + s.seg[3] * U;
    el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: 'transparent', 'stroke-width': 22 }, g);
    s.line = el('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    s.mark = el('circle', { class: 'ctapulse', cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, r: 9, fill: 'var(--page)',
      'fill-opacity': 0.25, stroke: 'var(--page)', 'stroke-width': 1.5 }, g);
    function toggle() { s.built = !s.built; propagate(); }
    g.addEventListener('click', toggle);
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  /* panneau de droite */
  var R = 540;
  pair(svg, R, 40, 'PÉRIMÈTRE SUIVI', 'TRACKED PERIMETER', { 'font-size': 12, fill: 'var(--text-faint)', 'font-family': 'ui-monospace, monospace' });
  var counter = { fr: null, en: null };
  ['fr', 'en'].forEach(function (l) {
    counter[l] = el('text', { x: R, y: 66, 'data-lang': l, 'font-size': 15, 'font-weight': 700, fill: 'var(--text)' }, svg);
  });
  pair(svg, R, 98, 'Cliquer sur un emplacement de clôture', 'Click a fence spot (pulsing circle)', { 'font-size': 13.5, 'font-weight': 600, fill: 'var(--page)' });
  pair(svg, R, 116, '(cercle pulsant) pour la poser ou la retirer.', 'to build or remove it.', { 'font-size': 13.5, 'font-weight': 600, fill: 'var(--page)' });
  var lg = el('g', { 'font-size': 13, fill: 'var(--text)' }, svg);
  [[BUILT, 'clôture posée par le joueur', 'fence built by the player', ''],
   [TRACKED, 'mur de la carte raccordé, suivi', 'connected map wall, tracked', ''],
   [MAP, 'mur de la carte, ignoré', 'map wall, ignored', ''],
   ['var(--text-faint)', 'emplacement libre', 'free spot', '5 5']].forEach(function (r, i) {
    el('line', { x1: R, y1: 150 + i * 28, x2: R + 26, y2: 150 + i * 28, stroke: r[0], 'stroke-width': 5,
      'stroke-dasharray': r[3], 'stroke-linecap': 'round' }, lg);
    pair(lg, R + 38, 155 + i * 28, r[1], r[2]);
  });
  var reset = el('g', { class: 'dchip', tabindex: 0, role: 'button' }, svg);
  el('rect', { x: R, y: 272, width: 170, height: 30, rx: 15 }, reset);
  pair(reset, R + 85, 292, 'Recommencer', 'Start again', { 'text-anchor': 'middle', 'font-size': 13 });
  function doReset() { SLOTS.forEach(function (s, i) { s.built = i < 3; }); propagate(); }
  reset.addEventListener('click', doReset);
  reset.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doReset(); } });

  /* ----------------------------------------------- propagation BFS --- */
  var timer = 0;
  function propagate() {
    if (timer) { clearInterval(timer); timer = 0; }
    /* couches de distance depuis les clotures posees, arete par arete */
    var frontier = {}, layerOf = new Map();
    SLOTS.forEach(function (s) {
      if (!s.built) return;
      unitEdges.apply(null, s.seg).forEach(function (e) { frontier[pk(e[0], e[1])] = true; frontier[pk(e[2], e[3])] = true; });
    });
    var layer = 0, changed = true, reached = {};
    Object.keys(frontier).forEach(function (k) { reached[k] = true; });
    while (changed && layer < 120) {
      changed = false;
      var next = {};
      mapEdges.forEach(function (m) {
        if (layerOf.has(m)) return;
        var a = pk(m.e[0], m.e[1]), b = pk(m.e[2], m.e[3]);
        if (frontier[a] || frontier[b]) {
          layerOf.set(m, layer); changed = true;
          if (!reached[a]) next[a] = true;
          if (!reached[b]) next[b] = true;
        }
      });
      Object.keys(next).forEach(function (k) { reached[k] = true; });
      frontier = next; layer++;
    }
    var target = mapEdges.map(function (m) { return layerOf.has(m) ? layerOf.get(m) : -1; });
    paintSlots();
    var nTracked = target.filter(function (v) { return v >= 0; }).length;
    var nBuilt = SLOTS.filter(function (s) { return s.built; }).reduce(function (n, s) {
      return n + unitEdges.apply(null, s.seg).length; }, 0);
    counter.fr.textContent = 'construit : ' + nBuilt + '   ·   raccordé : ' + nTracked;
    counter.en.textContent = 'built: ' + nBuilt + '   ·   connected: ' + nTracked;

    if (!motionOn()) { paintWalls(target, Infinity); return; }
    /* retrait immediat de ce qui ne tient plus, puis le raccordement progresse */
    mapEdges.forEach(function (m, i) { if (target[i] < 0) m.on = false; });
    var shown = -1;
    paintWalls(target, shown);
    timer = setInterval(function () {
      shown++;
      paintWalls(target, shown);
      if (shown > 60) { clearInterval(timer); timer = 0; }
    }, 70);
  }
  function paintWalls(target, upTo) {
    mapEdges.forEach(function (m, i) {
      var on = target[i] >= 0 && target[i] <= upTo;
      m.el.setAttribute('stroke', on ? TRACKED : MAP);
    });
  }
  function paintSlots() {
    SLOTS.forEach(function (s) {
      s.line.setAttribute('stroke', s.built ? BUILT : 'var(--text-faint)');
      s.line.setAttribute('stroke-dasharray', s.built ? '' : '5 5');
      s.line.setAttribute('stroke-width', s.built ? 7 : 3);
    });
  }

  Array.prototype.forEach.call(fig.children, function (c) {
    if (c.tagName.toLowerCase() !== 'figcaption') c.style.display = 'none';
  });
  fig.insertBefore(svg, fig.firstChild);
  propagate();
})();
