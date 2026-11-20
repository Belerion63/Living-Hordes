/* =========================================================================
   Living Hordes documentation - interactive room graph (sealing.html)

   Un clic sur une porte, la fenetre ou la voiture change son etat. Le mod
   refait alors son parcours depuis le dehors, en suivant toutes les
   liaisons ouvertes : toute piece atteinte est ouverte, toute piece non
   atteinte est scellee. Le plan et le graphe se mettent a jour ensemble.

   La cour illustre le cas du texte : la porte du garage donne sur une cour
   fermee par une voiture garee dans un trou de cloture. Garage ouvert sur
   une cour close : le garage reste scelle.
   ========================================================================= */
(function () {
  'use strict';
  var fig = document.getElementById('rooms-fig');
  if (!fig) return;
  var old = fig.querySelector('svg.rooms-static');
  var NS = 'http://www.w3.org/2000/svg';

  var OPEN = '#e0913a', SEALED = '#4f9c5c', OUT = '#8a929c';

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

  /* ----------------------------------------------------------- modele -- */
  var NODES = {
    out:     { fr: 'Dehors',  en: 'Outside', gx: 600, gy: 205 },
    hall:    { fr: 'Couloir', en: 'Hallway', gx: 665, gy: 105 },
    living:  { fr: 'Salon',   en: 'Living room', gx: 820, gy: 105 },
    back:    { fr: 'Arrière', en: 'Back room', gx: 820, gy: 225 },
    garage:  { fr: 'Garage',  en: 'Garage', gx: 830, gy: 330 },
    yard:    { fr: 'Cour',    en: 'Yard', gx: 620, gy: 330 }
  };
  /* liaisons : de, a, type, etat ; passable selon l'etat */
  var LINKS = [
    { id: 'front',  a: 'hall',   b: 'out',    kind: 'door',   open: true,
      fr: ['porte d\'entrée', 'ouverte', 'fermée'], en: ['front door', 'open', 'closed'] },
    { id: 'hl',     a: 'hall',   b: 'living', kind: 'door',   open: true,
      fr: ['porte', 'ouverte', 'fermée'], en: ['door', 'open', 'closed'] },
    { id: 'lb',     a: 'living', b: 'back',   kind: 'door',   open: false,
      fr: ['porte', 'ouverte', 'fermée'], en: ['door', 'open', 'closed'] },
    { id: 'bg',     a: 'back',   b: 'garage', kind: 'door',   open: false,
      fr: ['porte', 'ouverte', 'fermée'], en: ['door', 'open', 'closed'] },
    { id: 'gdoor',  a: 'garage', b: 'yard',   kind: 'door',   open: true,
      fr: ['porte du garage', 'ouverte', 'fermée'], en: ['garage door', 'open', 'closed'] },
    { id: 'car',    a: 'yard',   b: 'out',    kind: 'car',    open: false,
      fr: ['trou de clôture', 'libre', 'voiture garée'], en: ['fence gap', 'clear', 'car parked'] },
    { id: 'window', a: 'living', b: 'out',    kind: 'window', open: false,
      fr: ['fenêtre', 'brisée', 'intacte'], en: ['window', 'broken', 'intact'] }
  ];

  function reach() {
    var seen = { out: true }, stack = ['out'];
    while (stack.length) {
      var n = stack.pop();
      LINKS.forEach(function (l) {
        if (!l.open) return;
        var o = l.a === n ? l.b : (l.b === n ? l.a : null);
        if (o && !seen[o]) { seen[o] = true; stack.push(o); }
      });
    }
    return seen;
  }

  /* ------------------------------------------------------------ plan --- */
  var svg = el('svg', { viewBox: '0 0 900 410', role: 'img',
    'aria-label': 'Plan interactif et graphe de pieces : un clic sur une porte, la fenetre ou la voiture.' });

  var plan = el('g', {}, svg);
  var ROOMS = {
    hall:   { x: 40,  y: 40,  w: 90,  h: 200 },
    living: { x: 130, y: 40,  w: 290, h: 90 },
    back:   { x: 130, y: 130, w: 170, h: 110 },
    garage: { x: 300, y: 130, w: 120, h: 110 },
    yard:   { x: 130, y: 240, w: 370, h: 120 }
  };
  var roomRect = {};
  Object.keys(ROOMS).forEach(function (k) {
    var r = ROOMS[k];
    roomRect[k] = el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, 'fill-opacity': 0.28 }, plan);
    var lbl = pair(plan, r.x + r.w / 2, r.y + r.h / 2 + (k === 'yard' ? 20 : 0), NODES[k].fr, NODES[k].en,
      { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 600, fill: 'var(--text)' });
    roomRect[k].lbl = lbl;
    roomRect[k].state = pair(plan, r.x + r.w / 2, r.y + r.h / 2 + (k === 'yard' ? 38 : 18), '', '',
      { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600 });
  });

  /* murs (les ouvertures sont laissees en trou, la liaison s'y dessine) */
  var W = '#c9d1d9';
  var WALLS = [
    'M 40 40 L 300 40', 'M 360 40 L 420 40',                 /* haut, fenetre 300-360 */
    'M 40 40 L 40 120', 'M 40 160 L 40 240',                 /* gauche, porte d'entree */
    'M 40 240 L 130 240', 'M 420 40 L 420 240',
    'M 130 40 L 130 70', 'M 130 105 L 130 240',              /* couloir / salon */
    'M 130 130 L 190 130', 'M 225 130 L 420 130',            /* salon / arriere */
    'M 300 130 L 300 170', 'M 300 205 L 300 240',            /* arriere / garage */
    'M 130 240 L 320 240', 'M 400 240 L 500 240',            /* porte du garage 320-400 */
    'M 130 240 L 130 360', 'M 130 360 L 500 360',
    'M 500 240 L 500 280', 'M 500 320 L 500 360'             /* trou de cloture 280-320 */
  ];
  WALLS.forEach(function (d) {
    el('path', { d: d, stroke: W, 'stroke-width': 4, 'stroke-linecap': 'square', fill: 'none' }, plan);
  });
  pair(plan, 315, 380, 'clôture', 'fence', { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--text-dim)' });

  /* les liaisons cliquables */
  var GEOM = {
    front:  { x1: 40,  y1: 120, x2: 40,  y2: 160 },
    hl:     { x1: 130, y1: 70,  x2: 130, y2: 105 },
    lb:     { x1: 190, y1: 130, x2: 225, y2: 130 },
    bg:     { x1: 300, y1: 170, x2: 300, y2: 205 },
    gdoor:  { x1: 320, y1: 240, x2: 400, y2: 240 },
    car:    { x1: 500, y1: 280, x2: 500, y2: 320 },
    window: { x1: 300, y1: 40,  x2: 360, y2: 40 }
  };
  var linkNodes = {};
  LINKS.forEach(function (l) {
    var g = GEOM[l.id];
    var grp = el('g', { class: 'rlink', tabindex: 0, role: 'button' }, plan);
    var horiz = g.y1 === g.y2;
    var pad = 12;
    el('rect', { x: Math.min(g.x1, g.x2) - (horiz ? 0 : pad), y: Math.min(g.y1, g.y2) - (horiz ? pad : 0),
      width: Math.abs(g.x2 - g.x1) + (horiz ? 0 : 2 * pad), height: Math.abs(g.y2 - g.y1) + (horiz ? 2 * pad : 0),
      fill: 'transparent' }, grp);
    var shut = el('line', { x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2, 'stroke-width': 5 }, grp);
    var car = null;
    if (l.kind === 'car') {
      car = el('g', {}, grp);
      el('rect', { x: -14, y: -26, width: 28, height: 52, rx: 7, fill: '#d9534f', stroke: '#1a1a1a', 'stroke-width': 2 }, car);
      el('rect', { x: -10, y: -14, width: 20, height: 14, rx: 2, fill: '#2b3138' }, car);
    }
    var mark = el('circle', { r: 9, fill: 'var(--page)', 'fill-opacity': 0.25, stroke: 'var(--page)', 'stroke-width': 1.5,
      class: 'ctapulse', cx: (g.x1 + g.x2) / 2 + (horiz ? 0 : (l.id === 'front' ? -18 : 18)),
      cy: (g.y1 + g.y2) / 2 + (horiz ? (l.id === 'window' ? -18 : 18) : 0) }, grp);
    linkNodes[l.id] = { grp: grp, shut: shut, car: car, mark: mark };
    function toggle(e) { if (e) e.stopPropagation(); l.open = !l.open; paint(); }
    grp.addEventListener('click', toggle);
    grp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  /* ----------------------------------------------------------- graphe -- */
  var graph = el('g', {}, svg);
  pair(graph, 560, 34, 'CE QUE LE MOD EN RETIENT', 'WHAT THE MOD KEEPS',
    { 'font-size': 12, fill: 'var(--text-faint)', 'font-family': 'ui-monospace, monospace' });
  var edges = {};
  /* etiquettes placees a la main, hors des traits, en deux lignes (nom, etat) */
  var LABEL = {
    front:  { x: 614, y: 140, a: 'end' },
    window: { x: 728, y: 178, a: 'middle' },
    hl:     { x: 742, y: 80,  a: 'middle', one: true },
    lb:     { x: 808, y: 158, a: 'end' },
    bg:     { x: 812, y: 272, a: 'end' },
    gdoor:  { x: 725, y: 316, a: 'middle', one: true },
    car:    { x: 596, y: 262, a: 'end' }
  };
  var HALO = { 'paint-order': 'stroke', stroke: 'var(--bg-raised)', 'stroke-width': 5, 'stroke-linejoin': 'round' };
  LINKS.forEach(function (l) {
    var A = NODES[l.a], B = NODES[l.b], P = LABEL[l.id];
    var line = el('line', { x1: A.gx, y1: A.gy, x2: B.gx, y2: B.gy, 'stroke-width': 3 }, graph);
    var base = { 'text-anchor': P.a, 'font-size': 13 };
    for (var k in HALO) base[k] = HALO[k];
    var name = pair(graph, P.x, P.y, '', '', Object.assign({ fill: 'var(--text-dim)' }, base));
    var state = P.one ? null : pair(graph, P.x, P.y + 16, '', '', Object.assign({ 'font-weight': 600 }, base));
    edges[l.id] = { line: line, name: name, state: state, one: !!P.one };
  });
  var nodeEls = {};
  Object.keys(NODES).forEach(function (k) {
    var n = NODES[k];
    var c = el('circle', { cx: n.gx, cy: n.gy, r: 32, 'stroke-width': 2.5 }, graph);
    pair(graph, n.gx, n.gy + 5, n.fr, n.en, { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#ffffff' });
    nodeEls[k] = c;
  });

  /* invitation et legende */
  var cta = el('g', {}, svg);
  pair(cta, 40, 398, 'Cliquer sur une porte, la fenêtre ou la voiture (cercles pulsants).',
    'Click a door, the window or the car (pulsing circles).', { 'font-size': 13.5, 'font-weight': 600, fill: 'var(--page)' });
  var lg = el('g', { 'font-size': 12.5, fill: 'var(--text)' }, svg);
  el('rect', { x: 600, y: 384, width: 14, height: 14, fill: OPEN, 'fill-opacity': 0.6 }, lg);
  pair(lg, 620, 396, 'ouverte', 'open');
  el('rect', { x: 700, y: 384, width: 14, height: 14, fill: SEALED, 'fill-opacity': 0.6 }, lg);
  pair(lg, 720, 396, 'scellée', 'sealed');

  /* ---------------------------------------------------------- rendu --- */
  function paint() {
    var r = reach();
    Object.keys(ROOMS).forEach(function (k) {
      var col = r[k] ? OPEN : SEALED;
      roomRect[k].setAttribute('fill', col);
      roomRect[k].state.fr.textContent = r[k] ? 'ouverte' : 'scellée';
      roomRect[k].state.en.textContent = r[k] ? 'open' : 'sealed';
      roomRect[k].state.fr.setAttribute('fill', col); roomRect[k].state.en.setAttribute('fill', col);
      nodeEls[k].setAttribute('fill', col); nodeEls[k].setAttribute('fill-opacity', 0.35);
      nodeEls[k].setAttribute('stroke', col);
    });
    nodeEls.out.setAttribute('fill', OUT); nodeEls.out.setAttribute('fill-opacity', 0.3); nodeEls.out.setAttribute('stroke', OUT);

    LINKS.forEach(function (l) {
      var n = linkNodes[l.id], e = edges[l.id];
      /* plan */
      if (l.kind === 'car') {
        n.shut.setAttribute('stroke', 'transparent');
        n.car.setAttribute('transform', l.open ? 'translate(540,300)' : 'translate(500,300)');
      } else if (l.kind === 'window') {
        n.shut.setAttribute('stroke', l.open ? '#d9534f' : '#7fb8e6');
        n.shut.setAttribute('stroke-dasharray', l.open ? '6 6' : '');
      } else {
        n.shut.setAttribute('stroke', l.open ? 'transparent' : '#e8d9a8');
      }
      /* graphe : une fenetre intacte ne relie rien, donc n'apparait pas */
      var visible = !(l.kind === 'window' && !l.open);
      var parts = [e.line, e.name.fr, e.name.en];
      if (e.state) parts.push(e.state.fr, e.state.en);
      parts.forEach(function (n2) { n2.style.display = visible ? '' : 'none'; });
      e.line.setAttribute('stroke', l.open ? 'var(--text)' : 'var(--text-faint)');
      e.line.setAttribute('stroke-dasharray', l.open ? '' : '6 5');
      var sFr = l.open ? l.fr[1] : l.fr[2], sEn = l.open ? l.en[1] : l.en[2];
      var col = l.open ? OPEN : 'var(--text-dim)';
      if (e.one) {
        e.name.fr.textContent = l.fr[0] + ' ' + sFr; e.name.en.textContent = l.en[0] + ' ' + sEn;
        e.name.fr.setAttribute('fill', col); e.name.en.setAttribute('fill', col);
      } else {
        e.name.fr.textContent = l.fr[0]; e.name.en.textContent = l.en[0];
        e.state.fr.textContent = sFr; e.state.en.textContent = sEn;
        e.state.fr.setAttribute('fill', col); e.state.en.setAttribute('fill', col);
      }
    });
  }

  if (old) old.style.display = 'none';
  fig.insertBefore(svg, fig.firstChild);
  paint();
})();
