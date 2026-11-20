/* =========================================================================
   Living Hordes documentation - interactive sound reach (sound.html)

   Un bruit a une seule portee. Au-dessus de 50 tuiles, les individus a
   l'interieur reagissent ; au-dessus de 71, les hordes a l'interieur aussi.
   Mais une horde n'existe comme horde qu'au-dela d'environ 190 tuiles du
   joueur : un bruit parti du joueur ne la touche que s'il porte plus loin.
   Portees : scripts du jeu (armes) et table du mod (helicoptere).
   Couleurs du sonar de debogage.
   ========================================================================= */
(function () {
  'use strict';
  var fig = document.getElementById('reach-fig');
  if (!fig) return;
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var S = 0.66, CX = 300, CY = 190;               /* px par tuile, joueur */
  var MIN_IND = 50, MIN_HORDE = 71, DISSOLVE = 192, OUTER = 250;

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

  var svg = el('svg', { viewBox: '0 0 900 380', role: 'img',
    'aria-label': 'Portee d\'un bruit selon l\'arme : individus et hordes atteints.' });
  el('clipPath', { id: 'reach-clip' }, el('defs', {}, svg))
    .appendChild(el('rect', { x: 20, y: 10, width: 560, height: 360, rx: 10 }));
  el('rect', { x: 20, y: 10, width: 560, height: 360, rx: 10, fill: '#101418' }, svg);
  var g = el('g', { 'clip-path': 'url(#reach-clip)' }, svg);

  /* couches */
  el('circle', { cx: CX, cy: CY, r: OUTER * S, fill: 'none', stroke: '#e666b3', 'stroke-opacity': 0.5, 'stroke-width': 1.5 }, g);
  el('circle', { cx: CX, cy: CY, r: DISSOLVE * S, fill: 'none', stroke: '#c9d1d9', 'stroke-opacity': 0.45,
    'stroke-width': 1.5, 'stroke-dasharray': '6 5' }, g);
  pair(g, CX, CY - DISSOLVE * S + 14, '~190 tuiles : les hordes commencent ici', '~190 tiles: hordes start here',
    { 'text-anchor': 'middle', 'font-size': 11.5, fill: '#c9d1d9', 'paint-order': 'stroke', stroke: '#101418', 'stroke-width': 4 });

  var HALF = 66;                                  /* demi-cote du carre charge, en tuiles */
  el('rect', { x: CX - HALF * S, y: CY - HALF * S, width: 2 * HALF * S, height: 2 * HALF * S, fill: 'none',
    stroke: '#ffffff', 'stroke-opacity': 0.6, 'stroke-width': 1.5 }, g);
  var wave = el('circle', { cx: CX, cy: CY, r: 0, fill: '#ffd166', 'fill-opacity': 0.08, stroke: '#ffd166', 'stroke-width': 2.5 }, g);

  /* individus (0..250 tuiles) et hordes (au-dela de 190) : positions fixes */
  var rnd = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  var inds = [];
  for (var i = 0; i < 56; i++) {
    /* les dix premiers pres du joueur, le reste reparti jusqu'a 245 tuiles */
    var a = rnd() * Math.PI * 2, d = i < 10 ? 25 + rnd() * 60 : 20 + Math.sqrt(rnd()) * 225;
    var px = Math.cos(a) * d, py = Math.sin(a) * d;
    var real = Math.abs(px) <= HALF && Math.abs(py) <= HALF;   /* dans le carre charge : zombie reel */
    inds.push({ d: d, real: real, x: CX + px * S, y: CY + py * S,
      c: el('circle', { r: 2.8, fill: '#000', 'stroke-width': 1.6,
        stroke: real ? '#ffffff' : (d <= 90 ? '#00e6e6' : '#e666b3') }, g) });
  }
  var HORDES = [[196, -0.4, 30], [215, 2.3, 50], [232, 1.2, 22], [270, 3.6, 60], [300, -1.6, 40],
                [320, 0.6, 70], [360, 2.8, 35], [390, -2.6, 55], [420, 1.7, 45], [470, -0.9, 60]];
  var hordes = HORDES.map(function (h) {
    var x = CX + Math.cos(h[1]) * h[0] * S, y = CY + Math.sin(h[1]) * h[0] * S;
    var r = (5 + 4 * Math.sqrt(h[2])) * S;
    var ring = el('circle', { cx: x, cy: y, r: r + 6, fill: 'none', stroke: '#ffd166', 'stroke-width': 2.5, opacity: 0 }, g);
    var c = el('circle', { cx: x, cy: y, r: r, fill: '#ff8c0d', 'fill-opacity': 0.8, stroke: '#000', 'stroke-opacity': 0.35, 'stroke-width': 2 }, g);
    return { d: h[0], ring: ring, c: c };
  });
  inds.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
  el('circle', { cx: CX, cy: CY, r: 6, fill: '#33ff33', stroke: '#000', 'stroke-width': 2 }, g);

  /* panneau de droite */
  var R = 600;
  pair(svg, R, 30, 'CHOISIR UN BRUIT', 'PICK A SOUND', { 'font-size': 12, fill: 'var(--text-faint)', 'font-family': 'ui-monospace, monospace' });
  var WEAPONS = [
    ['Petit pistolet', 'Small pistol', 70],
    ['Pistolet', 'Pistol', 100],
    ['Fusil', 'Rifle', 170],
    ['Fusil à pompe', 'Shotgun', 200],
    ['Hélicoptère', 'Helicopter', 500],
    ['Alarme de maison', 'House alarm', 600]
  ];
  var chips = [];
  WEAPONS.forEach(function (w, i) {
    var b = el('g', { class: 'dchip', tabindex: 0, role: 'button' }, svg);
    el('rect', { x: R, y: 40 + i * 32, width: 280, height: 26, rx: 13 }, b);
    pair(b, R + 16, 58 + i * 32, w[0], w[1], { 'font-size': 13.5 });
    el('text', { x: R + 264, y: 58 + i * 32, 'text-anchor': 'end', 'font-size': 12.5, 'data-lang': 'both',
      'font-family': 'ui-monospace, monospace' }, b).textContent = w[2] + ' t';
    function go() { fire(i); }
    b.addEventListener('click', go);
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    chips.push(b);
  });
  var out0 = pair(svg, R, 248, '', '', { 'font-size': 13.5, 'font-weight': 700, fill: 'var(--text)' });
  var out1 = pair(svg, R, 268, '', '', { 'font-size': 14, 'font-weight': 700, fill: 'var(--text)' });
  var out2 = pair(svg, R, 288, '', '', { 'font-size': 14, 'font-weight': 700, fill: 'var(--text)' });
  var out3 = pair(svg, R, 314, '', '', { 'font-size': 12.5, fill: 'var(--text-dim)' });
  var out4 = pair(svg, R, 331, '', '', { 'font-size': 12.5, fill: 'var(--text-dim)' });
  pair(svg, R, 360, 'Le bruit part du joueur (vert), au centre.', 'The sound starts at the player (green), in the centre.', { 'font-size': 12, fill: 'var(--text-faint)' });

  var anim = 0;
  function fire(i) {
    var w = WEAPONS[i], R0 = w[2];
    chips.forEach(function (c, j) { c.classList.toggle('on', j === i); });
    var nInd = 0, nH = 0, nReal = 0;
    inds.forEach(function (p) {
      /* reels : le jeu de base les fait reagir ; individus : seuil du mod */
      var hit = p.real ? p.d <= R0 : (R0 >= MIN_IND && p.d <= R0);
      if (hit) { if (p.real) nReal++; else nInd++; }
      p.c.setAttribute('fill', hit ? '#ffd166' : '#000');
    });
    hordes.forEach(function (h) {
      var hit = R0 >= MIN_HORDE && h.d <= R0;
      if (hit) nH++;
      h.ring.setAttribute('opacity', hit ? 1 : 0);
    });
    out0.fr.textContent = 'zombies réels (jeu de base) : ' + nReal;
    out0.en.textContent = 'real zombies (base game): ' + nReal;
    out1.fr.textContent = 'individus qui réagissent : ' + nInd;
    out1.en.textContent = 'individuals reacting: ' + nInd;
    out2.fr.textContent = 'hordes atteintes : ' + nH;
    out2.en.textContent = 'hordes reached: ' + nH;
    if (nH === 0) {
      out3.fr.textContent = 'Aucune horde : le bruit s\'arrête avant';
      out3.en.textContent = 'No horde: the sound stops before';
      out4.fr.textContent = 'les 190 tuiles où elles commencent.';
      out4.en.textContent = 'the 190 tiles where they start.';
    } else {
      out3.fr.textContent = 'Chaque horde atteinte tire au sort sa';
      out3.en.textContent = 'Each horde reached rolls for its';
      out4.fr.textContent = 'réaction (ouïe, volume, distance).';
      out4.en.textContent = 'reaction (hearing, volume, distance).';
    }
    var target = R0 * S;
    if (anim) cancelAnimationFrame(anim);
    if (!motionOn()) { wave.setAttribute('r', target); return; }
    var t0 = 0;
    (function step(now) {
      if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / 700);
      wave.setAttribute('r', (target * (1 - Math.pow(1 - k, 3))).toFixed(1));
      anim = k < 1 ? requestAnimationFrame(step) : 0;
    })(performance.now());
  }

  Array.prototype.forEach.call(fig.children, function (c) {
    if (c.tagName.toLowerCase() !== 'figcaption') c.style.display = 'none';
  });
  fig.insertBefore(svg, fig.firstChild);
  fire(1);
})();
