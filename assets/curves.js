/* =========================================================================
   Living Hordes documentation - fill-level curves (migration.html)

   Un curseur partage : survoler (ou toucher) l'une des deux courbes place une
   ligne verticale au meme remplissage sur les deux, avec une lecture en clair.
   Courbes du mod (ZM_Config.WEIGHT_CURVE et CHRONO_CURVE), interpolees en
   ligne droite comme ZM_Config.curveAt.
   ========================================================================= */
(function () {
  'use strict';
  var a = document.getElementById('curve-attr');
  var s = document.getElementById('curve-stay');
  if (!a || !s) return;
  var NS = 'http://www.w3.org/2000/svg';

  var XS = [0, 25, 50, 75, 90, 100, 110, 125, 150];
  var ATTR = [40, 60, 85, 100, 60, 15, 8, 5, 3];
  var SPEED = [1, 2, 5, 15, 40, 100, 250, 500, 800];
  var RAW_STAY_H = 24;                 /* exemple : milieu de la plage par defaut */

  function curveAt(ys, x) {
    if (x <= XS[0]) return ys[0];
    for (var i = 1; i < XS.length; i++) {
      if (x <= XS[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - XS[i - 1]) / (XS[i] - XS[i - 1]);
    }
    return ys[ys.length - 1];
  }
  function fx(fill) { return 80 + fill * 3.4; }
  function yAttr(v) { return 250 - v * 2; }
  function ySpeed(v) { return 250 - Math.log(v) / Math.LN10 * 66.667; }

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }
  function pair(svg, attrs) {
    var o = {};
    ['fr', 'en'].forEach(function (l) {
      var at = { 'data-lang': l };
      for (var k in attrs) at[k] = attrs[k];
      o[l] = el('text', at, svg);
    });
    return o;
  }

  function overlay(svg) {
    var g = el('g', { 'pointer-events': 'none' }, svg);
    var line = el('line', { y1: 46, y2: 250, stroke: 'var(--text)', 'stroke-width': 1.2,
      'stroke-dasharray': '3 3', opacity: 0 }, g);
    var dot = el('circle', { r: 6, fill: 'none', stroke: 'var(--text)', 'stroke-width': 2, opacity: 0 }, g);
    var read = pair(svg, { x: 620, y: 20, 'text-anchor': 'end', 'font-size': 12.5, 'font-weight': 600,
      fill: 'var(--page)' });
    var hint = pair(svg, { x: 620, y: 38, 'text-anchor': 'end', 'font-size': 11.5, fill: 'var(--text-dim)' });
    svg.style.cursor = 'crosshair';
    svg.style.touchAction = 'none';
    return { line: line, dot: dot, read: read, hint: hint };
  }
  var oa = overlay(a), os = overlay(s);

  function hours(h) {
    var fr, en;
    if (h < 48) {
      var r = Math.round(h);
      fr = r + ' h'; en = r + ' h';
    } else {
      var d = h / 24;
      var t = d < 10 ? (Math.round(d * 10) / 10) : Math.round(d);
      fr = String(t).replace('.', ',') + ' jours'; en = t + ' days';
    }
    return { fr: fr, en: en };
  }

  function idle() {
    [oa, os].forEach(function (o) {
      o.line.setAttribute('opacity', 0); o.dot.setAttribute('opacity', 0);
      o.read.fr.textContent = ''; o.read.en.textContent = '';
      o.hint.fr.textContent = 'Survoler la courbe pour lire une valeur';
      o.hint.en.textContent = 'Hover over the curve to read a value';
    });
  }

  function show(fill) {
    fill = Math.max(0, Math.min(150, fill));
    var at = curveAt(ATTR, fill), sp = curveAt(SPEED, fill);
    var x = fx(fill);
    oa.line.setAttribute('x1', x); oa.line.setAttribute('x2', x); oa.line.setAttribute('opacity', 0.8);
    os.line.setAttribute('x1', x); os.line.setAttribute('x2', x); os.line.setAttribute('opacity', 0.8);
    oa.dot.setAttribute('cx', x); oa.dot.setAttribute('cy', yAttr(at)); oa.dot.setAttribute('opacity', 1);
    os.dot.setAttribute('cx', x); os.dot.setAttribute('cy', ySpeed(sp)); os.dot.setAttribute('opacity', 1);
    var f = Math.round(fill);
    var dur = hours(RAW_STAY_H * 100 / sp);
    oa.read.fr.textContent = 'À ' + f + ' % : attrait ' + Math.round(at) + ' %';
    oa.read.en.textContent = 'At ' + f + '%: attraction ' + Math.round(at) + '%';
    os.read.fr.textContent = 'À ' + f + ' % : un séjour de 24 h y dure ' + dur.fr;
    os.read.en.textContent = 'At ' + f + '%: a 24 h stay lasts ' + dur.en;
    [oa, os].forEach(function (o) { o.hint.fr.textContent = ''; o.hint.en.textContent = ''; });
  }

  function onMove(svg) {
    return function (e) {
      var r = svg.getBoundingClientRect();
      var vx = (e.clientX - r.left) / r.width * 640;
      show((vx - 80) / 3.4);
    };
  }
  [a, s].forEach(function (svg) {
    svg.addEventListener('pointermove', onMove(svg));
    svg.addEventListener('pointerdown', onMove(svg));
    svg.addEventListener('pointerleave', idle);
  });
  idle();
})();
