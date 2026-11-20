/* =========================================================================
   Living Hordes documentation - immobility, interactive (immobility.html)

   Le joueur suit la souris (ou le doigt). Immobile un moment, il pose une
   ancre ; dans la zone de 64 tuiles, la pression monte (0 a 100 % en 72 h de
   jeu), dehors elle redescend six fois plus vite, et a zero l'ancre
   disparait. Au-dela de 5 %, les hordes les plus proches (dans 512 tuiles)
   convergent vers l'ancre, jusqu'a 400 zombies a 100 % ; une grosse horde
   n'envoie qu'un morceau ; s'il manque du monde, une horde nait au bord, hors
   de vue. S'arreter ailleurs deplace l'ancre et relache tout. Chaque zombie
   attire tue retire 0,25 %. Temps compresse : 1 seconde = 3 heures de jeu.
   Valeurs par defaut du mod (ZM_Config.IMMOBILITY_*).
   ========================================================================= */
(function () {
  'use strict';
  var fig = document.getElementById('immo-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  var S = 0.45;                                      /* px par tuile */
  var X0 = 20, Y0 = 10, PW = 560, PH = 380;
  var ZONE = 64, SEARCH = 512, START = 0.05, CAP_MAX = 400, KILL = 0.0025;
  var RISE_H = 72, FALL = 6, STOP_TILES = 10, STOP_S = 1.5, HOURS_PER_S = 3;
  var MIG = '#ff2626', SET = '#ff8c0d';

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
    var o = {};
    ['fr', 'en'].forEach(function (l) {
      var a = { x: x, y: y, 'data-lang': l };
      for (var k in attrs || {}) a[k] = attrs[k];
      o[l] = el('text', a, parent);
      o[l].textContent = l === 'fr' ? fr : en;
    });
    return o;
  }
  function radius(size) { return Math.max(4, (5 + 4 * Math.sqrt(Math.max(size, 0))) * S); }

  /* ---------------------------------------------------------- scene --- */
  var svg = el('svg', { viewBox: '0 0 900 400', role: 'img',
    'aria-label': 'Suivi d\'immobilite interactif : ancre, zone, pression, hordes attirees.' });
  svg.style.touchAction = 'none';
  el('clipPath', { id: 'immo-clip' }, el('defs', {}, svg)).appendChild(el('rect', { x: X0, y: Y0, width: PW, height: PH, rx: 10 }));
  el('rect', { x: X0, y: Y0, width: PW, height: PH, rx: 10, fill: '#101418' }, svg);
  var g = el('g', { 'clip-path': 'url(#immo-clip)' }, svg);
  var search = el('circle', { r: SEARCH * S, fill: 'none', stroke: '#c9d1d9', 'stroke-opacity': 0.3, 'stroke-dasharray': '4 6', opacity: 0 }, g);
  var zone = el('circle', { r: ZONE * S, fill: '#ffd166', 'fill-opacity': 0.12, stroke: '#ffd166', 'stroke-width': 2, 'stroke-dasharray': '6 4', opacity: 0 }, g);
  var anchorM = el('g', { opacity: 0 }, g);
  el('circle', { r: 6, fill: '#ffd166', stroke: '#000', 'stroke-width': 2 }, anchorM);
  var stopRing = el('circle', { r: 9, fill: 'none', stroke: '#ffffff', 'stroke-width': 2, opacity: 0 }, g);
  var hLayer = el('g', {}, g);
  var playerM = el('circle', { r: 6, fill: '#33ff33', stroke: '#000', 'stroke-width': 2 }, g);

  /* panneau de droite : sablier, compteurs, boutons */
  var R = 600;
  pair(svg, R, 30, 'SUIVI D\'IMMOBILITÉ', 'IMMOBILITY TRACKING', { 'font-size': 12, fill: 'var(--text-faint)', 'font-family': 'ui-monospace, monospace' });
  var glass = el('g', { transform: 'translate(' + (R + 8) + ',44)' }, svg);
  el('rect', { x: 0, y: 0, width: 46, height: 60, rx: 6, fill: '#1d232a', stroke: '#6b7480' }, glass);
  var sand = el('rect', { x: 8, y: 52, width: 30, height: 0 }, glass);
  el('path', { d: 'M 10 8 L 36 8 L 23 30 L 36 52 L 10 52 L 23 30 Z', fill: 'none', stroke: '#c9d1d9', 'stroke-width': 2 }, glass);
  var pTxt = pair(svg, R + 66, 70, '', '', { 'font-size': 20, 'font-weight': 700, fill: 'var(--text)' });
  var cTxt = pair(svg, R + 66, 94, '', '', { 'font-size': 13, fill: 'var(--text-dim)' });
  var state = pair(svg, R, 132, '', '', { 'font-size': 13.5, 'font-weight': 600, fill: 'var(--page)' });
  var state2 = pair(svg, R, 150, '', '', { 'font-size': 13.5, 'font-weight': 600, fill: 'var(--page)' });

  function button(y, fr, en, fn) {
    var b = el('g', { class: 'dchip', tabindex: 0, role: 'button' }, svg);
    el('rect', { x: R, y: y, width: 250, height: 30, rx: 15 }, b);
    pair(b, R + 125, y + 20, fr, en, { 'text-anchor': 'middle', 'font-size': 13 });
    b.addEventListener('click', fn);
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  }
  pair(svg, R, 184, 'Clic : tuer un zombie attiré proche', 'Click: kill a nearby drawn zombie', { 'font-size': 13, fill: 'var(--text)' });
  pair(svg, R, 201, '(− 0,25 % de pression)', '(− 0.25% pressure)', { 'font-size': 13, fill: 'var(--text-dim)' });
  button(214, 'Recommencer', 'Start again', reset);

  var L = el('g', { 'font-size': 12.5, fill: 'var(--text)' }, svg);
  [['#33ff33', 'le joueur', 'the player'], ['#ffd166', 'l\'ancre et sa zone (64 tuiles)', 'the anchor and its zone (64 tiles)'],
   [SET, 'horde posée', 'settled horde'], [MIG, 'horde attirée, en route vers l\'ancre', 'drawn horde, heading for the anchor']].forEach(function (r, i) {
    el('circle', { cx: R + 8, cy: 262 + i * 24, r: 6, fill: r[0] }, L);
    pair(L, R + 22, 266 + i * 24, r[1], r[2]);
  });
  pair(svg, R, 370, 'Temps accéléré : 1 s = 3 h de jeu.', 'Sped up: 1 s = 3 h of game time.', { 'font-size': 12, fill: 'var(--text-faint)' });

  /* ----------------------------------------------------------- etat --- */
  var player, still, stopO, anchor, pressure, hordes, nextId;
  var HORDES0 = [[120, 60, 30], [200, 300, 60], [430, 330, 25], [470, 80, 80], [300, 40, 15], [60, 250, 45], [520, 220, 35]];
  function reset() {
    player = { x: 250, y: 200 };
    still = 0; stopO = { x: player.x, y: player.y }; anchor = null; pressure = 0; nextId = 0;
    while (hLayer.firstChild) hLayer.removeChild(hLayer.firstChild);
    hordes = HORDES0.map(function (h) { return mk(h[0], h[1], h[2], false); });
  }
  function mk(x, y, size, attached) {
    var h = { id: nextId++, x: x, y: y, size: size, attached: attached,
      c: el('circle', { 'fill-opacity': 0.85, stroke: '#000', 'stroke-opacity': 0.35, 'stroke-width': 2 }, hLayer),
      t: el('text', { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#000' }, hLayer) };
    return h;
  }
  function tiles(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by) / S; }
  function cap() { return pressure <= START ? 0 : Math.round(CAP_MAX * (pressure - START) / (1 - START)); }
  function drawn() { return hordes.filter(function (h) { return h.attached; }).reduce(function (n, h) { return n + h.size; }, 0); }

  function release() { hordes.forEach(function (h) { h.attached = false; }); }

  /* une passe a intervalle regulier, au plus 3 accrochages (IMMOBILITY_ATTACH_PER_PASS) */
  var passT = 0;
  function attach() {
    var room = cap() - drawn();
    if (room < 5 || !anchor) return;                 /* plus petit morceau : 5 zombies */
    var free = hordes.filter(function (h) { return !h.attached && tiles(h.x, h.y, anchor.x, anchor.y) <= SEARCH; })
      .sort(function (a, b) { return tiles(a.x, a.y, anchor.x, anchor.y) - tiles(b.x, b.y, anchor.x, anchor.y); });
    var n = 0;
    for (var i = 0; i < free.length && room >= 5 && n < 3; i++, n++) {
      var h = free[i];
      if (h.size <= room) { h.attached = true; room -= h.size; }
      else {                                          /* trop grosse : un morceau seulement */
        var piece = mk(h.x, h.y, room, true);
        h.size -= room; room = 0;
        hordes.push(piece);
      }
    }
    if (!free.length && room >= 5 && n < 3) {         /* il manque du monde : une horde nait au bord, hors de vue */
      var ang = Math.random() * Math.PI * 2, d = Math.min(SEARCH * S, 420);
      hordes.push(mk(anchor.x + Math.cos(ang) * d, anchor.y + Math.sin(ang) * d, Math.min(room, 60), true));
    }
  }

  /* un clic tue un zombie de la horde attiree la plus proche du joueur, si elle est a portee */
  var REACH = 40;                                    /* px autour du joueur */
  var shot = el('circle', { r: REACH, fill: 'none', stroke: '#ffffff', 'stroke-width': 2, opacity: 0 }, g);
  function kill() {
    var best = null, bd = Infinity;
    hordes.forEach(function (h) {
      if (!h.attached || h.size <= 0) return;
      var d = Math.hypot(h.x - player.x, h.y - player.y) - radius(h.size);
      if (d < bd) { bd = d; best = h; }
    });
    shot.setAttribute('cx', player.x); shot.setAttribute('cy', player.y);
    shot.setAttribute('stroke', best && bd <= REACH ? '#ff5c5c' : '#6b7480');
    shot.setAttribute('opacity', 0.9);
    setTimeout(function () { shot.setAttribute('opacity', 0); }, 160);
    if (!best || bd > REACH) return;
    best.size -= 1;
    pressure = Math.max(0, pressure - KILL);
    if (pressure <= 0 && anchor && !inZone()) anchor = null;
  }
  function inZone() {
    return anchor && tiles(player.x, player.y, anchor.x, anchor.y) <= ZONE;
  }

  /* --------------------------------------------------------- boucle --- */
  var last = 0, raf = 0, visible = true;
  function step(dt) {
    var hours = dt * HOURS_PER_S;
    /* l'arret : rester dans 10 tuiles pendant le delai */
    still += dt;
    if (still >= STOP_S) {
      if (!anchor || !inZone()) {
        if (anchor) release();                        /* s'arreter ailleurs : l'ancre se deplace */
        anchor = { x: player.x, y: player.y };
      }
    }
    if (anchor) {
      if (inZone()) pressure = Math.min(1, pressure + hours / RISE_H);
      else {
        pressure = Math.max(0, pressure - FALL * hours / RISE_H);
        if (pressure <= 0) { anchor = null; release(); }
      }
    }
    passT += dt;
    if (anchor && passT >= 0.8) { passT = 0; attach(); }
    /* les hordes attirees vont vers l'ancre, pas vers le joueur */
    var move = motionOn() ? 60 * dt : 1e9;
    hordes = hordes.filter(function (h) {
      if (h.size <= 0) { hLayer.removeChild(h.c); hLayer.removeChild(h.t); return false; }
      if (h.attached && anchor) {
        var dx = anchor.x - h.x, dy = anchor.y - h.y, d = Math.hypot(dx, dy);
        var stop = ZONE * S * 0.55 + radius(h.size);
        if (d > stop) { var st = Math.min(move, d - stop); h.x += dx / d * st; h.y += dy / d * st; }
      }
      return true;
    });
    paint();
  }
  function paint() {
    playerM.setAttribute('cx', player.x); playerM.setAttribute('cy', player.y);
    stopRing.setAttribute('cx', player.x); stopRing.setAttribute('cy', player.y);
    stopRing.setAttribute('opacity', (!anchor || !inZone()) ? Math.min(1, still / STOP_S) : 0);
    var on = !!anchor;
    [zone, search, anchorM].forEach(function (e) { e.setAttribute('opacity', on ? 1 : 0); });
    if (on) {
      zone.setAttribute('cx', anchor.x); zone.setAttribute('cy', anchor.y);
      search.setAttribute('cx', anchor.x); search.setAttribute('cy', anchor.y);
      anchorM.setAttribute('transform', 'translate(' + anchor.x + ',' + anchor.y + ')');
    }
    hordes.forEach(function (h) {
      h.c.setAttribute('cx', h.x.toFixed(1)); h.c.setAttribute('cy', h.y.toFixed(1));
      h.c.setAttribute('r', radius(h.size).toFixed(1));
      h.c.setAttribute('fill', h.attached ? MIG : SET);
      h.t.setAttribute('x', h.x.toFixed(1)); h.t.setAttribute('y', (h.y + 3.5).toFixed(1));
      h.t.textContent = h.size;
    });
    /* sablier : du vert au jaune (50 %) puis au rouge (100 %) */
    var p = pressure, col;
    if (p < 0.5) col = 'rgb(' + Math.round(77 + p * 2 * 165) + ',' + Math.round(217 - p * 2 * 0) + ',77)';
    else col = 'rgb(242,' + Math.round(217 - (p - 0.5) * 2 * 179) + ',' + Math.round(51 - (p - 0.5) * 2 * 25) + ')';
    sand.setAttribute('y', 52 - 44 * p); sand.setAttribute('height', 44 * p); sand.setAttribute('fill', col);
    var pc = Math.round(p * 100);
    pTxt.fr.textContent = 'pression : ' + pc + ' %'; pTxt.en.textContent = 'pressure: ' + pc + '%';
    cTxt.fr.textContent = 'zombies attirés : ' + drawn() + ' / ' + cap();
    cTxt.en.textContent = 'zombies drawn: ' + drawn() + ' / ' + cap();
    var s1, s2;
    if (!anchor) { s1 = ['Laisser la souris immobile dans le', 'Keep the mouse still inside the']; s2 = ['schéma pour poser l\'ancre.', 'diagram to set the anchor.']; }
    else if (!inZone()) { s1 = ['Hors de la zone : la pression', 'Outside the zone: the pressure']; s2 = ['redescend six fois plus vite.', 'falls six times faster.']; }
    else if (pressure <= START) { s1 = ['Dans la zone : la pression monte.', 'In the zone: the pressure rises.']; s2 = ['Sous 5 % : le moodle avertit seulement.', 'Below 5%: the moodle only warns.']; }
    else { s1 = ['Au-delà de 5 % : les hordes', 'Above 5%: hordes head for']; s2 = ['convergent vers l\'ancre.', 'the anchor.']; }
    state.fr.textContent = s1[0]; state.en.textContent = s1[1];
    state2.fr.textContent = s2[0]; state2.en.textContent = s2[1];
  }
  function frame(t) {
    raf = 0;
    var dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
    last = t;
    step(dt);
    if (visible) raf = requestAnimationFrame(frame);
  }

  svg.addEventListener('pointerdown', function (e) {
    var r = svg.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width * 900, y = (e.clientY - r.top) / r.height * 400;
    if (x < X0 || x > X0 + PW || y < Y0 || y > Y0 + PH) return;
    kill();
  });
  svg.addEventListener('pointermove', function (e) {
    var r = svg.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width * 900, y = (e.clientY - r.top) / r.height * 400;
    if (x < X0 || x > X0 + PW || y < Y0 || y > Y0 + PH) return;
    player.x = x; player.y = y;
    /* sortir du petit rayon de l'arret fait repartir le decompte */
    if (Math.hypot(x - stopO.x, y - stopO.y) / S > STOP_TILES) { still = 0; stopO = { x: x, y: y }; }
  });

  Array.prototype.forEach.call(fig.children, function (c) {
    if (c.tagName.toLowerCase() !== 'figcaption') c.style.display = 'none';
  });
  fig.insertBefore(svg, fig.firstChild);
  reset();
  paint();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    }).observe(svg);
  } else { raf = requestAnimationFrame(frame); }
})();
