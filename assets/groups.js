/* =========================================================================
   Living Hordes documentation - interactive ground groups (sealing.html)

   Une grille de 4 x 3 morceaux de carte (8 x 8 cases chacun). Les murs et
   clotures sont des aretes entre cases. Pour chaque morceau lu, les cases se
   rejoignent sans rien traverser ; les morceaux se recollent par-dessus leurs
   bords. Un groupe qui touche du sol jamais lu reste en suspens ; un groupe
   qui touche le bord du monde est du dehors ; sinon, il est ferme.
   Clic sur un morceau non lu : il est lu. Clic sur le portail : il s'ouvre ou
   se ferme, et seul son morceau est redecoupe (il clignote).
   ========================================================================= */
(function () {
  'use strict';
  var fig = document.getElementById('groups-fig');
  if (!fig) return;
  var old = fig.querySelector('svg.groups-static');
  var NS = 'http://www.w3.org/2000/svg';

  var CW = 4, CH = 3, C = 8, T = 13;            /* morceaux, cases par morceau, px par case */
  var GW = CW * C, GH = CH * C, X0 = 24, Y0 = 44;
  var COL = { out: '#4a525c', pending: '#e0913a', closed: '#4f9c5c', unread: '#15191e' };

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pair(parent, x, y, fr, en, attrs) {
    var o = {};
    ['fr', 'en'].forEach(function (l) {
      var a = { x: x, y: y, 'data-lang': l };
      for (var k in attrs || {}) a[k] = attrs[k];
      o[l] = el('text', a, parent);
      o[l].textContent = l === 'fr' ? fr : en;
    });
    return o;
  }

  /* --------------------------------------------------------- le monde -- */
  var hW = {}, vW = {};                          /* hW[x,y] : arete au-dessus de (x,y) ; vW[x,y] : a gauche */
  function key(x, y) { return x + ',' + y; }
  function hLine(y, x0, x1, skip) { for (var x = x0; x <= x1; x++) if (!skip || skip.indexOf(x) < 0) hW[key(x, y)] = true; }
  function vLine(x, y0, y1) { for (var y = y0; y <= y1; y++) vW[key(x, y)] = true; }
  /* une cour cloturee sur trois morceaux, portail en bas */
  var GATE = [12, 13, 14], GATE_Y = 17;
  hLine(4, 5, 21); hLine(17, 5, 21, GATE); vLine(5, 4, 16); vLine(22, 4, 16);
  /* une courette fermee a cheval sur deux morceaux */
  hLine(19, 20, 27); hLine(23, 20, 27); vLine(20, 19, 22); vLine(28, 19, 22);
  var gateOpen = false;

  var read = [];
  function resetRead() {
    read = [];
    for (var cy = 0; cy < CH; cy++) { read.push([]); for (var cx = 0; cx < CW; cx++) read[cy].push(cx < 2); }
  }
  function isRead(x, y) { return read[Math.floor(y / C)][Math.floor(x / C)]; }
  function blocked(x, y, nx, ny) {
    if (nx === x + 1) return !!vW[key(nx, y)];
    if (nx === x - 1) return !!vW[key(x, y)];
    if (ny === y + 1) {
      if (!!hW[key(x, ny)]) return true;
      return ny === GATE_Y && GATE.indexOf(x) >= 0 && !gateOpen;
    }
    if (ny === y - 1) {
      if (!!hW[key(x, y)]) return true;
      return y === GATE_Y && GATE.indexOf(x) >= 0 && !gateOpen;
    }
    return false;
  }

  /* groupes de sol : composantes sur le sol lu */
  function groups() {
    var g = {}, status = {}, id = 0;
    for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) {
      if (!isRead(x, y) || g[key(x, y)] !== undefined) continue;
      var stack = [[x, y]], touchUnread = false, touchEdge = false;
      g[key(x, y)] = id;
      while (stack.length) {
        var p = stack.pop(), px = p[0], py = p[1];
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = px + d[0], ny = py + d[1];
          if (blocked(px, py, nx, ny)) return;
          if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) { touchEdge = true; return; }
          if (!isRead(nx, ny)) { touchUnread = true; return; }
          if (g[key(nx, ny)] === undefined) { g[key(nx, ny)] = id; stack.push([nx, ny]); }
        });
      }
      status[id] = touchEdge ? 'out' : (touchUnread ? 'pending' : 'closed');
      id++;
    }
    return { g: g, status: status };
  }

  /* ---------------------------------------------------------- dessin --- */
  var svg = el('svg', { viewBox: '0 0 900 380', role: 'img',
    'aria-label': 'Grille interactive : morceaux de carte, groupes de sol, portail.' });
  var tiles = el('g', {}, svg);
  var cells = {};
  for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) {
    cells[key(x, y)] = el('rect', { x: X0 + x * T, y: Y0 + y * T, width: T, height: T }, tiles);
  }
  /* bords des morceaux */
  var chunkLines = el('g', { stroke: '#9aa3ad', 'stroke-opacity': 0.5, 'stroke-width': 1, 'stroke-dasharray': '4 4', fill: 'none' }, svg);
  for (var cx = 0; cx <= CW; cx++) el('line', { x1: X0 + cx * C * T, y1: Y0, x2: X0 + cx * C * T, y2: Y0 + GH * T }, chunkLines);
  for (var cy = 0; cy <= CH; cy++) el('line', { x1: X0, y1: Y0 + cy * C * T, x2: X0 + GW * T, y2: Y0 + cy * C * T }, chunkLines);
  /* murs */
  var walls = el('g', { stroke: '#e8e1cf', 'stroke-width': 3, 'stroke-linecap': 'square' }, svg);
  /* un mur n'est connu que si l'une des cases qu'il borde a ete lue */
  var wallEls = [];
  Object.keys(hW).forEach(function (k) {
    var p = k.split(',').map(Number);
    wallEls.push({ e: el('line', { x1: X0 + p[0] * T, y1: Y0 + p[1] * T, x2: X0 + (p[0] + 1) * T, y2: Y0 + p[1] * T }, walls),
      a: [p[0], p[1] - 1], b: [p[0], p[1]] });
  });
  Object.keys(vW).forEach(function (k) {
    var p = k.split(',').map(Number);
    wallEls.push({ e: el('line', { x1: X0 + p[0] * T, y1: Y0 + p[1] * T, x2: X0 + p[0] * T, y2: Y0 + (p[1] + 1) * T }, walls),
      a: [p[0] - 1, p[1]], b: [p[0], p[1]] });
  });
  function known(c) { return c[0] >= 0 && c[1] >= 0 && c[0] < GW && c[1] < GH && isRead(c[0], c[1]); }
  /* le portail */
  var gate = el('g', { class: 'rlink', tabindex: 0, role: 'button' }, svg);
  el('rect', { x: X0 + GATE[0] * T, y: Y0 + GATE_Y * T - 10, width: GATE.length * T, height: 20, fill: 'transparent' }, gate);
  var gateLine = el('line', { x1: X0 + GATE[0] * T, y1: Y0 + GATE_Y * T, x2: X0 + (GATE[2] + 1) * T, y2: Y0 + GATE_Y * T,
    stroke: '#ffd166', 'stroke-width': 5 }, gate);
  el('circle', { class: 'ctapulse', cx: X0 + 13.5 * T, cy: Y0 + GATE_Y * T + 16, r: 8, fill: 'var(--page)', 'fill-opacity': 0.25,
    stroke: 'var(--page)', 'stroke-width': 1.5 }, gate);
  /* morceaux non lus : un point d'interrogation cliquable */
  var unreadLayer = el('g', {}, svg);
  var flash = el('rect', { fill: 'none', stroke: '#ffd166', 'stroke-width': 3, opacity: 0 }, svg);

  /* panneau de droite */
  var R = 470;
  pair(svg, R, 30, 'GROUPES DE SOL', 'GROUND GROUPS', { 'font-size': 12, fill: 'var(--text-faint)', 'font-family': 'ui-monospace, monospace' });
  var counter = pair(svg, R, 56, '', '', { 'font-size': 15, 'font-weight': 700, fill: 'var(--text)' });
  pair(svg, R, 86, 'Cliquer sur un morceau de carte jamais lu (?)', 'Click a map piece never read (?)', { 'font-size': 13.5, 'font-weight': 600, fill: 'var(--page)' });
  pair(svg, R, 104, 'pour le lire, ou sur le portail (cercle pulsant)', 'to read it, or on the gate (pulsing circle)', { 'font-size': 13.5, 'font-weight': 600, fill: 'var(--page)' });
  pair(svg, R, 122, 'pour l\'ouvrir ou le fermer.', 'to open or close it.', { 'font-size': 13.5, 'font-weight': 600, fill: 'var(--page)' });

  function button(y, fr, en, fn) {
    var b = el('g', { class: 'dchip', tabindex: 0, role: 'button' }, svg);
    el('rect', { x: R, y: y, width: 190, height: 30, rx: 15 }, b);
    pair(b, R + 95, y + 20, fr, en, { 'text-anchor': 'middle', 'font-size': 13 });
    b.addEventListener('click', fn);
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  }
  button(140, 'Tout lire', 'Read everything', function () { for (var a = 0; a < CH; a++) for (var b = 0; b < CW; b++) read[a][b] = true; paint(); });
  button(178, 'Recommencer', 'Start again', function () { resetRead(); gateOpen = false; paint(); });

  var lg = el('g', { 'font-size': 13, fill: 'var(--text)' }, svg);
  [['closed', 'groupe fermé : scellé', 'closed group: sealed'],
   ['pending', 'groupe en suspens : touche du sol jamais lu', 'pending group: touches ground never read'],
   ['out', 'dehors : touche le bord du monde', 'outside: touches the edge of the world'],
   ['unread', 'morceau jamais lu', 'piece never read']].forEach(function (r, i) {
    el('rect', { x: R, y: 236 + i * 26, width: 16, height: 16, fill: COL[r[0]], stroke: '#9aa3ad', 'stroke-width': 1 }, lg);
    pair(lg, R + 26, 249 + i * 26, r[1], r[2]);
  });
  el('line', { x1: R, y1: 352, x2: R + 18, y2: 352, stroke: '#e8e1cf', 'stroke-width': 3 }, lg);
  pair(lg, R + 26, 357, 'mur ou clôture', 'wall or fence');

  function paint() {
    var res = groups();
    for (var yy = 0; yy < GH; yy++) for (var xx = 0; xx < GW; xx++) {
      var k = key(xx, yy), c = cells[k];
      if (!isRead(xx, yy)) { c.setAttribute('fill', COL.unread); continue; }
      c.setAttribute('fill', COL[res.status[res.g[k]]]);
      c.setAttribute('fill-opacity', res.status[res.g[k]] === 'out' ? 0.55 : 0.75);
    }
    wallEls.forEach(function (w) { w.e.style.display = (known(w.a) || known(w.b)) ? '' : 'none'; });
    gateLine.setAttribute('stroke-opacity', gateOpen ? 0.15 : 1);
    gateLine.setAttribute('stroke-dasharray', gateOpen ? '4 4' : '');
    while (unreadLayer.firstChild) unreadLayer.removeChild(unreadLayer.firstChild);
    for (var a = 0; a < CH; a++) for (var b = 0; b < CW; b++) {
      if (read[a][b]) continue;
      (function (cy2, cx2) {
        var g = el('g', { class: 'rlink', tabindex: 0, role: 'button' }, unreadLayer);
        el('rect', { x: X0 + cx2 * C * T, y: Y0 + cy2 * C * T, width: C * T, height: C * T, fill: 'transparent' }, g);
        el('text', { x: X0 + (cx2 + 0.5) * C * T, y: Y0 + (cy2 + 0.5) * C * T + 10, 'text-anchor': 'middle',
          'font-size': 30, 'font-weight': 700, fill: '#6b7480', 'data-lang': 'both' }, g).textContent = '?';
        function go() { read[cy2][cx2] = true; paint(); }
        g.addEventListener('click', go);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      })(a, b);
    }
    var n = { closed: 0, pending: 0 };
    Object.keys(res.status).forEach(function (i) { if (n[res.status[i]] !== undefined) n[res.status[i]]++; });
    counter.fr.textContent = 'fermés : ' + n.closed + '   ·   en suspens : ' + n.pending;
    counter.en.textContent = 'closed: ' + n.closed + '   ·   pending: ' + n.pending;
  }

  function toggleGate() {
    gateOpen = !gateOpen;
    /* seul le morceau du portail est redecoupe : il clignote */
    var cx2 = Math.floor(GATE[1] / C), cy2 = Math.floor((GATE_Y - 1) / C);
    flash.setAttribute('x', X0 + cx2 * C * T); flash.setAttribute('y', Y0 + cy2 * C * T);
    flash.setAttribute('width', C * T); flash.setAttribute('height', C * T);
    flash.setAttribute('opacity', 1);
    setTimeout(function () { flash.setAttribute('opacity', 0); }, 450);
    paint();
  }
  gate.addEventListener('click', toggleGate);
  gate.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGate(); } });

  /* le schema statique et sa legende HTML laissent la place */
  Array.prototype.forEach.call(fig.children, function (c) {
    if (c.tagName.toLowerCase() !== 'figcaption') c.style.display = 'none';
  });
  fig.insertBefore(svg, fig.firstChild);
  resetRead();
  paint();
})();
