/* =========================================================================
   Living Hordes documentation - before / after comparator (hordes.html)

   L'image du simulateur porte deux panneaux cote a cote, sur la meme carte :
   la 0.8 (x 0..800) et la 0.9 (x 816..1616). Le comparateur les
   superpose : a gauche de la poignee, la 0.8 ; a droite, la 0.9. La
   poignee se tire a la souris, au doigt, ou aux fleches du clavier.
   ========================================================================= */
(function () {
  'use strict';
  var fig = document.getElementById('day30-fig');
  if (!fig) return;
  var old = fig.querySelector('svg.day30-static');
  var NS = 'http://www.w3.org/2000/svg';
  var IMG = 'assets/img/hordes_day30.png';
  var W = 800, H = 806;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function label(parent, x, fr, en, anchor) {
    ['fr', 'en'].forEach(function (l) {
      el('text', { x: x, y: 54, 'data-lang': l, 'text-anchor': anchor, 'font-size': 30, 'font-weight': 700,
        fill: '#1a1a1a' }, parent).textContent = l === 'fr' ? fr : en;
    });
  }

  var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'slider', tabindex: 0,
    'aria-label': 'Comparateur : la 0.8 a gauche de la poignee, la 0.9 a droite.',
    'aria-valuemin': 0, 'aria-valuemax': 100 });
  svg.style.cursor = 'ew-resize';
  svg.style.touchAction = 'none';
  var clip = el('rect', { x: 0, y: 0, width: W / 2, height: H }, el('clipPath', { id: 'day30-left' }, el('defs', {}, svg)));

  /* fond : le panneau avec taille limite ; dessus, rogne : le panneau sans */
  el('image', { href: IMG, x: -816, y: 0, width: 1616, height: 870 }, svg);
  /* son etiquette d'origine (0.9) est recouverte par la notre, visible quand la poignee est a gauche */
  el('rect', { x: 10, y: 10, width: 336, height: 70, rx: 6, fill: '#fefefe', stroke: '#8c8c8c', 'stroke-width': 1.5 }, svg);
  label(svg, 28, 'Après : 0.9', 'After: 0.9', 'start');
  var left = el('g', { 'clip-path': 'url(#day30-left)' }, svg);
  el('image', { href: IMG, x: 0, y: 0, width: 1616, height: 870 }, left);

  /* les etiquettes d'origine sont recouvertes, puis redessinees aux coins */
  el('rect', { x: 10, y: 10, width: 336, height: 70, rx: 6, fill: '#fefefe', stroke: '#8c8c8c', 'stroke-width': 1.5 }, left);
  label(left, 28, 'Avant : 0.8', 'Before: 0.8', 'start');
  var rightTag = el('g', {}, svg);
  el('rect', { x: W - 346, y: 10, width: 336, height: 70, rx: 6, fill: '#fefefe', stroke: '#8c8c8c', 'stroke-width': 1.5 }, rightTag);
  label(rightTag, W - 28, 'Après : 0.9', 'After: 0.9', 'end');

  var line = el('line', { y1: 0, y2: H, stroke: '#ffffff', 'stroke-width': 4 }, svg);
  var knob = el('g', {}, svg);
  el('circle', { r: 30, fill: '#ffffff', stroke: '#1a1a1a', 'stroke-width': 3 }, knob);
  el('path', { d: 'M -8 -10 L -18 0 L -8 10 M 8 -10 L 18 0 L 8 10', fill: 'none', stroke: '#1a1a1a',
    'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, knob);

  var pos = W / 2;
  function set(x) {
    pos = Math.max(0, Math.min(W, x));
    clip.setAttribute('width', pos);
    line.setAttribute('x1', pos); line.setAttribute('x2', pos);
    knob.setAttribute('transform', 'translate(' + pos + ',' + (H / 2) + ')');
    rightTag.style.display = (pos > W - 360 || pos < 350) ? 'none' : '';
    svg.setAttribute('aria-valuenow', Math.round(pos / W * 100));
  }
  function fromEvent(e) {
    var r = svg.getBoundingClientRect();
    return (e.clientX - r.left) / r.width * W;
  }
  var dragging = false;
  svg.addEventListener('pointerdown', function (e) {
    dragging = true; svg.setPointerCapture(e.pointerId); set(fromEvent(e));
  });
  svg.addEventListener('pointermove', function (e) { if (dragging) set(fromEvent(e)); });
  svg.addEventListener('pointerup', function () { dragging = false; });
  svg.addEventListener('pointercancel', function () { dragging = false; });
  svg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); set(pos - 40); }
    if (e.key === 'ArrowRight') { e.preventDefault(); set(pos + 40); }
  });

  if (old) old.style.display = 'none';
  fig.insertBefore(svg, fig.firstChild);
  set(W / 2);
})();
