/* =========================================================================
   Living Hordes documentation - interactive dissolution diagram
   (simulation.html)

   Reprend le plan de dissolution du mod (ZM_BlobBuffer.lua,
   ZM_SeedPersonality.lua) : un ancrage parmi trois (centre, 8 points au
   hasard dans 70 tuiles, routes) et une forme parmi cinq (amas 15, dispersion
   40, large 85, bande 50 x 6, arc a 120 degres), puis le nuage est recentre
   sur la horde et plafonne a 90 tuiles. Couleurs du sonar de debogage.

   Le lecteur choisit l'ancrage et la forme avec des boutons, ou passe a la
   combinaison suivante (bouton, clic sur le panneau, Entree / Espace). L'arc
   ignorant l'ancrage, il n'y a que treize combinaisons distinctes.
   Sans animation, le nuage s'affiche directement depose.
   ========================================================================= */
(function () {
  'use strict';

  var svg = document.getElementById('dissolve-fig');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var layer = document.getElementById('dissolve-anim');
  var staticCloud = document.getElementById('dissolve-static');
  var cta = document.getElementById('dissolve-cta');
  var anchorLayer = document.getElementById('dissolve-anchors');
  var chipBox = document.getElementById('dissolve-chips');
  var chips = svg.querySelectorAll('.dchip');
  var ignoredFr = document.getElementById('dl-ignored-fr');
  var ignoredEn = document.getElementById('dl-ignored-en');
  var countFr = document.getElementById('dl-count-fr');
  var countEn = document.getElementById('dl-count-en');

  /* Geometrie : 1,6 px par tuile, horde au centre du panneau. */
  var S = 1.6, HX = 320, HY = 182;
  var HEAD = -30 * Math.PI / 180;                 /* cap de la horde */
  var FDX = Math.cos(HEAD), FDY = Math.sin(HEAD);
  var ROAD_Y = 0;                                  /* la route passe par la horde (tuiles) */
  var ROAD_X0 = -80, ROAD_X1 = 80;                 /* troncon de route (tuiles) */
  var SIZE = 60;

  var SHAPE_RADIUS = { compact: 15, spread: 40, large: 85 };
  var LINEAR_PARALLEL = 50, LINEAR_PERP = 6, MAX_RANGE = 90;
  var ARC_SPAN = Math.PI * 2 / 3, ARC_MIN_OFFSET = 20, ARC_OFFSET_RATIO = 0.4;
  var ARC_MIN_PERP = 12, ARC_PERP_RATIO = 0.2;
  var ARC_MEAN = Math.sin(ARC_SPAN / 2) / (ARC_SPAN / 2);
  var RANDOM_ANCHORS = 8, RANDOM_RADIUS = 70;

  var TARGETS = ['center', 'random', 'roads'];
  var SHAPES = ['compact', 'spread', 'large', 'linear', 'arc'];
  var NAMES = {
    center:  { fr: 'centre de la horde', en: 'horde centre' },
    random:  { fr: '8 points au hasard', en: '8 random points' },
    roads:   { fr: 'la route', en: 'the road' },
    compact: { fr: 'amas serré', en: 'tight cluster' },
    spread:  { fr: 'dispersion', en: 'spread' },
    large:   { fr: 'dispersion large', en: 'wide spread' },
    linear:  { fr: 'bande', en: 'band' },
    arc:     { fr: 'arc', en: 'arc' }
  };

  function blobR(size) { return 5 + 4 * Math.sqrt(Math.max(size, 0)); }   /* tuiles */

  function motionOn() {
    var a = root.getAttribute('data-motion');
    if (a === 'on') return true;
    if (a === 'off') return false;
    return !mq.matches;
  }
  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* --------------------------------------------------------- un plan -- */
  var plan, anchors, anchorMean, points;

  /* Les treize combinaisons distinctes, dans l'ordre du parcours. */
  var COMBOS = [];
  TARGETS.forEach(function (tg) {
    ['compact', 'spread', 'large', 'linear'].forEach(function (sh) { COMBOS.push([tg, sh]); });
  });
  COMBOS.push(['center', 'arc']);

  function comboIndex(t, s) {
    for (var i = 0; i < COMBOS.length; i++) {
      if (COMBOS[i][1] === s && (s === 'arc' || COMBOS[i][0] === t)) return i;
    }
    return 0;
  }

  function setPlan(t, s) {
    plan = { target: t, shape: s };
    anchors = [];
    if (t === 'random') {
      for (var i = 0; i < RANDOM_ANCHORS; i++) {
        var a = Math.random() * Math.PI * 2, d = Math.random() * RANDOM_RADIUS;
        anchors.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
      }
    } else if (t === 'roads') {
      for (var j = 1; j <= 5; j++) {               /* 5 ancrages le long du troncon */
        var tt = (j - 0.5) / 5;
        anchors.push({ x: ROAD_X0 + (ROAD_X1 - ROAD_X0) * tt, y: ROAD_Y, dx: 1, dy: 0 });
      }
    }
    anchorMean = null;
    if (anchors.length) {
      var sx = 0, sy = 0;
      anchors.forEach(function (p) { sx += p.x; sy += p.y; });
      anchorMean = { x: sx / anchors.length, y: sy / anchors.length };
    }

    var R = blobR(SIZE);
    points = [];
    for (var k = 0; k < SIZE; k++) points.push(spawnPoint(R));

    /* l'arc ignore l'ancrage : il se pose toujours devant la horde */
    var ignored = s === 'arc';
    ignoredFr.textContent = ignored ? "  (ignoré par l'arc)" : '';
    ignoredEn.textContent = ignored ? '  (ignored by the arc)' : '';
    Array.prototype.forEach.call(chips, function (c) {
      var kt = c.getAttribute('data-target'), ks = c.getAttribute('data-shape');
      var on = kt ? (!ignored && kt === t) : ks === s;
      c.classList.toggle('on', on);
      c.classList.toggle('off', !!kt && ignored);
      c.setAttribute('aria-pressed', String(on));
    });
    var n = (comboIndex(t, s) + 1) + ' / ' + COMBOS.length;
    countFr.textContent = n; countEn.textContent = n;

    while (anchorLayer.firstChild) anchorLayer.removeChild(anchorLayer.firstChild);
    if (!ignored) anchors.forEach(function (p) {
      anchorLayer.appendChild(el('path', {
        d: 'M ' + (HX + p.x * S - 4) + ' ' + (HY + p.y * S) + ' h 8 M ' + (HX + p.x * S) + ' ' + (HY + p.y * S - 4) + ' v 8',
        stroke: '#99ff80', 'stroke-width': '1.5', 'stroke-opacity': '0.8' }));
    });
  }

  /* dissolutionSpawn + dissolutionOffset + plafond, en tuiles relatives */
  function spawnPoint(R) {
    var shape = plan.shape, target = plan.target, ix, iy;
    if (shape === 'arc') {
      var off = Math.max(ARC_MIN_OFFSET, R * ARC_OFFSET_RATIO);
      var mid = R + off, perp = Math.max(ARC_MIN_PERP, R * ARC_PERP_RATIO);
      var ang = HEAD + (Math.random() - 0.5) * ARC_SPAN;
      var rad = mid + (Math.random() - 0.5) * 2 * perp;
      ix = Math.cos(ang) * rad; iy = Math.sin(ang) * rad;
    } else {
      var ax, ay, adx = null, ady = null;
      if (target === 'center') {
        if (shape === 'compact') { ax = FDX * R; ay = FDY * R; } else { ax = 0; ay = 0; }
      } else {
        var an = anchors[Math.floor(Math.random() * anchors.length)];
        ax = an.x; ay = an.y;
        if (an.dx !== undefined) { adx = an.dx; ady = an.dy; }
      }
      if (shape === 'linear') {
        var ldx = adx !== null ? adx : FDX, ldy = adx !== null ? ady : FDY;
        var par = (Math.random() - 0.5) * 2 * LINEAR_PARALLEL;
        var pp = (Math.random() - 0.5) * 2 * LINEAR_PERP;
        ix = ax + ldx * par - ldy * pp; iy = ay + ldy * par + ldx * pp;
      } else {
        var r = SHAPE_RADIUS[shape], a2 = Math.random() * Math.PI * 2, d2 = Math.random() * r;
        ix = ax + Math.cos(a2) * d2; iy = ay + Math.sin(a2) * d2;
      }
    }
    /* le nuage est recentre sur la horde */
    var ox = 0, oy = 0;
    if (shape === 'arc') {
      var off2 = Math.max(ARC_MIN_OFFSET, R * ARC_OFFSET_RATIO);
      ox = FDX * (R + off2) * ARC_MEAN; oy = FDY * (R + off2) * ARC_MEAN;
    } else if (target === 'center') {
      if (shape === 'compact') { ox = FDX * R; oy = FDY * R; }
    } else if (anchorMean) {
      ox = anchorMean.x; oy = anchorMean.y;
    }
    ix -= ox; iy -= oy;
    var dd = Math.hypot(ix, iy);
    if (dd > MAX_RANGE) { ix *= MAX_RANGE / dd; iy *= MAX_RANGE / dd; }
    return { x: ix, y: iy };
  }

  /* ------------------------------------------------------- le rendu -- */
  var blob, dots = [];

  function build() {
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    dots = [];
    blob = el('circle', { cx: HX, cy: HY, fill: '#ff2626', 'fill-opacity': '0.8',
      stroke: '#000', 'stroke-opacity': '0.35', 'stroke-width': '2' });
    layer.appendChild(blob);
    points.forEach(function () {
      var c = el('circle', { r: '2.6', fill: '#000', stroke: '#e666b3', 'stroke-width': '1.6' });
      c.style.display = 'none';
      layer.appendChild(c);
      dots.push(c);
    });
  }

  /* etat de 0 a 1 de chaque zombie : 0 dans la horde, 1 depose */
  function paint(shown, gather) {
    var inHorde = SIZE - shown;
    blob.setAttribute('r', inHorde > 0 ? (blobR(inHorde) * S).toFixed(1) : '0');
    blob.style.display = inHorde > 0 ? '' : 'none';
    for (var i = 0; i < SIZE; i++) {
      var c = dots[i], p = points[i];
      if (i >= shown) { c.style.display = 'none'; continue; }
      var k = 1 - gather;
      c.style.display = '';
      c.setAttribute('cx', (HX + p.x * S * k).toFixed(1));
      c.setAttribute('cy', (HY + p.y * S * k).toFixed(1));
    }
  }

  /* dissolution 2,5 s, pause 3 s, regroupement 1,5 s, pause 1 s */
  var T_DIS = 2.5, T_HOLD = 3, T_GATHER = 1.5, T_REST = 1;
  var CYCLE = T_DIS + T_HOLD + T_GATHER + T_REST;
  var t0 = 0, raf = 0, running = false, visible = true;

  function frame(now) {
    raf = 0;
    if (!running) return;
    if (!t0) t0 = now;
    var t = ((now - t0) / 1000) % CYCLE;
    if (t < T_DIS) {
      paint(Math.floor(SIZE * t / T_DIS), 0);
    } else if (t < T_DIS + T_HOLD) {
      paint(SIZE, 0);
    } else if (t < T_DIS + T_HOLD + T_GATHER) {
      var g = (t - T_DIS - T_HOLD) / T_GATHER;
      paint(SIZE, g * g);
      if (g > 0.85) paint(Math.floor(SIZE * (1 - (g - 0.85) / 0.15)), g * g);
    } else {
      paint(0, 0);
    }
    raf = requestAnimationFrame(frame);
  }

  function update() {
    var want = motionOn() && visible;
    if (want && !running) {
      running = true; t0 = 0;
      raf = requestAnimationFrame(frame);
    } else if (!want && running) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!running) paint(SIZE, 0);   /* sans animation : depose directement */
  }

  function show(t, s) {
    setPlan(t, s);
    build();
    t0 = 0;
    if (!running) paint(SIZE, 0);
  }
  function next() {
    var i = (comboIndex(plan.target, plan.shape) + 1) % COMBOS.length;
    show(COMBOS[i][0], COMBOS[i][1]);
  }

  /* --------------------------------------------------------- mise en route */
  if (staticCloud) staticCloud.style.display = 'none';
  if (cta) cta.style.display = '';
  if (chipBox) chipBox.style.display = '';

  function activate(e, fn) {
    e.stopPropagation();
    fn();
  }
  Array.prototype.forEach.call(chips, function (c) {
    var go = function () {
      var kt = c.getAttribute('data-target'), ks = c.getAttribute('data-shape');
      if (kt) {
        if (plan.shape === 'arc') return;          /* l'arc ignore l'ancrage */
        show(kt, plan.shape);
      } else {
        show(plan.target, ks);
      }
    };
    c.addEventListener('click', function (e) { activate(e, go); });
    c.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e, go); }
    });
  });
  cta.addEventListener('click', function (e) { activate(e, next); });
  cta.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e, next); }
  });
  /* un clic ailleurs sur le schema : combinaison suivante */
  svg.style.cursor = 'pointer';
  svg.addEventListener('click', next);

  setPlan('roads', 'linear');
  build();
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  if (mq.addEventListener) mq.addEventListener('change', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }).observe(svg);
  }
  update();
})();
