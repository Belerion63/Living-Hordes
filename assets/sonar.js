/* =========================================================================
   Living Hordes documentation - animated layers diagram (simulation.html)

   Reprend le sonar de debogage du mod (ZM_MapOverlay.lua) : memes couleurs,
   memes couches. Une horde en migration arrive, ne se defait que sur la partie
   de son emprise qui franchit la ligne des 190 tuiles, a debit plafonne ; ses
   individus gardent leur place dans la formation, changent de couche en
   chemin, deviennent reels dans le carre charge, puis se reforment en horde
   au-dela de 250 tuiles, avec la meme graine.

   Le schema statique reste visible tel quel quand les animations sont
   coupees (bouton Anim., ou mouvement reduit du systeme), ou sans script.
   ========================================================================= */
(function () {
  'use strict';

  var svg = document.getElementById('sonar-layers');
  if (!svg) return;
  var layer = document.getElementById('sonar-anim');
  var staticMover = document.getElementById('sonar-static-mover');
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Geometrie : 180 px = 250 tuiles. */
  var CX = 240, CY = 215;
  var PX_PER_TILE = 180 / 250;
  var R_OUTER = 250 * PX_PER_TILE;          /* limite des individus */
  var R_REFORM = 260 * PX_PER_TILE;         /* sortie, avec la marge de 10 tuiles */
  var R_DISSOLVE = 192 * PX_PER_TILE;       /* les hordes se defont */
  var R_INNER = 90 * PX_PER_TILE;           /* couche interne */
  var SQ = 47;                              /* demi-cote du carre charge */
  var CLIP = { x0: 20, y0: 10, x1: 460, y1: 420 };

  /* Couleurs du sonar (ZM_MapOverlay.lua). */
  var COL_MIGRATING = '#ff2626';
  var RING_OUTER = '#e666b3', RING_INNER = '#00e6e6', RING_REAL = '#ffffff';

  var SIZE0 = 60;                 /* effectif de la horde qui arrive */
  var SPEED = 20;                 /* px par seconde */
  var EMIT_PER_S = 25;            /* debit plafonne de la dissolution */

  function blobRadius(size) {     /* BLOB_RADIUS_BASE + K * sqrt(taille), en tuiles */
    return (5 + 4 * Math.sqrt(Math.max(size, 0))) * PX_PER_TILE;
  }

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

  /* ------------------------------------------------------------ etat -- */
  var horde, reformed, inds, emitAcc, running = false, last = 0, raf = 0, visible = true;
  var dirX, dirY;

  function reset() {
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    var sx = 52, sy = 40;
    var tx = CX + 14, ty = CY + 6;
    var d = Math.hypot(tx - sx, ty - sy);
    dirX = (tx - sx) / d; dirY = (ty - sy) / d;
    horde = { x: sx, y: sy, size: SIZE0, node: el('circle', {
      fill: COL_MIGRATING, 'fill-opacity': '0.8', stroke: '#000',
      'stroke-opacity': '0.35', 'stroke-width': '2' }) };
    layer.appendChild(horde.node);
    reformed = null;
    inds = [];
    emitAcc = 0;
  }

  function ringFor(x, y) {
    if (Math.abs(x - CX) <= SQ && Math.abs(y - CY) <= SQ) return RING_REAL;
    return Math.hypot(x - CX, y - CY) <= R_INNER ? RING_INNER : RING_OUTER;
  }

  /* Un point tire dans la partie de la horde qui a franchi la ligne. */
  function pointInOverlap() {
    var R = blobRadius(horde.size);
    for (var i = 0; i < 40; i++) {
      var a = Math.random() * Math.PI * 2;
      var r = R * Math.sqrt(Math.random());
      var x = horde.x + Math.cos(a) * r, y = horde.y + Math.sin(a) * r;
      if (Math.hypot(x - CX, y - CY) < R_DISSOLVE) return { x: x, y: y };
    }
    return null;
  }

  function emit() {
    var p = pointInOverlap();
    if (!p) return;
    horde.size -= 1;
    var node = el('circle', { r: '2.6', fill: '#000', 'stroke-width': '1.6' });
    layer.appendChild(node);
    inds.push({
      /* place retenue dans la formation, relative au centre de la horde */
      ox: p.x - horde.x, oy: p.y - horde.y,
      x: p.x, y: p.y,
      jx: (Math.random() - 0.5) * 6, jy: (Math.random() - 0.5) * 6,
      node: node, gone: false
    });
  }

  function step(dt) {
    /* la horde avance tant qu'elle existe */
    if (horde && horde.size > 0) {
      horde.x += dirX * SPEED * dt;
      horde.y += dirY * SPEED * dt;
      var R = blobRadius(horde.size);
      var dist = Math.hypot(horde.x - CX, horde.y - CY);
      if (dist - R < R_DISSOLVE) {
        emitAcc += EMIT_PER_S * dt;
        while (emitAcc >= 1 && horde.size > 0) { emitAcc -= 1; emit(); }
      }
      if (horde.size > 0) {
        horde.node.setAttribute('cx', horde.x.toFixed(1));
        horde.node.setAttribute('cy', horde.y.toFixed(1));
        horde.node.setAttribute('r', blobRadius(horde.size).toFixed(1));
      } else {
        layer.removeChild(horde.node);
      }
    }

    /* la formation suit le centre de la horde, meme une fois defaite */
    var gx = horde.x, gy = horde.y;
    if (horde.size <= 0) {
      horde.x += dirX * SPEED * dt;
      horde.y += dirY * SPEED * dt;
      gx = horde.x; gy = horde.y;
    }
    for (var i = 0; i < inds.length; i++) {
      var ind = inds[i];
      if (ind.gone) continue;
      ind.x = gx + ind.ox + ind.jx;
      ind.y = gy + ind.oy + ind.jy;
      if (Math.hypot(ind.x - CX, ind.y - CY) > R_REFORM && ind.x > CX) {
        /* au-dela de 250 tuiles : il se reforme en horde, avec la meme graine */
        ind.gone = true;
        layer.removeChild(ind.node);
        if (!reformed) {
          reformed = { x: ind.x, y: ind.y, size: 0, node: el('circle', {
            fill: COL_MIGRATING, 'fill-opacity': '0.8', stroke: '#000',
            'stroke-opacity': '0.35', 'stroke-width': '2' }) };
          layer.appendChild(reformed.node);
        }
        reformed.size += 1;
        continue;
      }
      ind.node.setAttribute('cx', ind.x.toFixed(1));
      ind.node.setAttribute('cy', ind.y.toFixed(1));
      ind.node.setAttribute('stroke', ringFor(ind.x, ind.y));
    }
    if (reformed) {
      reformed.x = gx + dirX * 10; reformed.y = gy + dirY * 10;
      reformed.node.setAttribute('cx', reformed.x.toFixed(1));
      reformed.node.setAttribute('cy', reformed.y.toFixed(1));
      reformed.node.setAttribute('r', blobRadius(reformed.size).toFixed(1));
    }

    /* fin du passage : la horde reformee a quitte l'ecran du sonar */
    var allGone = horde.size <= 0 && inds.every(function (d) { return d.gone; });
    if (allGone && (gx > CLIP.x1 + 40 || gy > CLIP.y1 + 40)) reset();
  }

  function frame(t) {
    raf = 0;
    if (!running) return;
    var dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
    last = t;
    step(dt);
    raf = requestAnimationFrame(frame);
  }

  function update() {
    var want = motionOn() && visible;
    if (want && !running) {
      running = true;
      if (staticMover) staticMover.style.display = 'none';
      if (!horde) reset();
      last = 0;
      raf = requestAnimationFrame(frame);
    } else if (!want && running) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (!motionOn()) {
        /* animations coupees : retour au schema statique */
        while (layer.firstChild) layer.removeChild(layer.firstChild);
        horde = null;
        if (staticMover) staticMover.style.display = '';
      }
    }
  }

  /* bouton Anim. du site et reglage du systeme */
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  if (mq.addEventListener) mq.addEventListener('change', update);

  /* pas de calcul quand le schema est hors de l'ecran */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }).observe(svg);
  }
  update();
})();
