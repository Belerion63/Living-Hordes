/* =========================================================================
   Living Hordes documentation - density categories (density.html)
   Survoler, toucher ou atteindre au clavier une barre affiche ce que la
   categorie regroupe, d'apres l'infobulle du bac a sable du mod.
   ========================================================================= */
(function () {
  'use strict';
  var fig = document.getElementById('cat-fig');
  if (!fig) return;
  var lines = {
    fr: [document.getElementById('cat-desc-fr1'), document.getElementById('cat-desc-fr2')],
    en: [document.getElementById('cat-desc-en1'), document.getElementById('cat-desc-en2')]
  };
  var initial = {
    fr: [lines.fr[0].textContent, lines.fr[1].textContent],
    en: [lines.en[0].textContent, lines.en[1].textContent]
  };

  /* coupe une phrase en deux lignes d'au plus ~84 caracteres */
  function split(s) {
    if (s.length <= 84) return [s, ''];
    var cut = s.lastIndexOf(' ', 84);
    if (cut < 20) cut = 84;
    return [s.slice(0, cut), s.slice(cut + 1)];
  }
  function show(bar) {
    ['fr', 'en'].forEach(function (l) {
      var parts = split(bar.getAttribute('data-desc-' + l));
      lines[l][0].textContent = parts[0];
      lines[l][1].textContent = parts[1];
    });
    Array.prototype.forEach.call(fig.querySelectorAll('.catbar'), function (b) {
      b.classList.toggle('on', b === bar);
    });
  }
  function reset() {
    ['fr', 'en'].forEach(function (l) {
      lines[l][0].textContent = initial[l][0];
      lines[l][1].textContent = initial[l][1];
    });
    Array.prototype.forEach.call(fig.querySelectorAll('.catbar'), function (b) { b.classList.remove('on'); });
  }
  Array.prototype.forEach.call(fig.querySelectorAll('.catbar'), function (bar) {
    bar.addEventListener('pointerenter', function () { show(bar); });
    bar.addEventListener('focus', function () { show(bar); });
    bar.addEventListener('click', function () { show(bar); });
  });
  fig.querySelector('svg').addEventListener('pointerleave', reset);
})();
