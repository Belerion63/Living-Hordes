/* =========================================================================
   Living Hordes documentation - shared behaviour
   1. theme toggle, remembered across pages
   2. sidebar table of contents follows the scroll
   ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------- theme ---- */
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem('lh-theme');
    if (saved) root.setAttribute('data-theme', saved);
  } catch (e) {}

  /* ----------------------------------------------------------- language - */
  /* The <head> of every page sets data-sitelang before paint, so there is no
     flash of the wrong language. This only wires the buttons. */
  var langButtons = document.querySelectorAll('.langtoggle button[data-setlang]');
  function paintLang(lang) {
    root.setAttribute('data-sitelang', lang);
    root.setAttribute('lang', lang);
    /* Le titre d'onglet ne peut pas etre masque par CSS : chaque page porte ses
       deux versions sur <html>, et on choisit ici. */
    var t = root.getAttribute('data-title-' + lang);
    if (t) document.title = t;
    Array.prototype.forEach.call(langButtons, function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-setlang') === lang));
    });
  }
  if (langButtons.length) {
    paintLang(root.getAttribute('data-sitelang') === 'fr' ? 'fr' : 'en');
    Array.prototype.forEach.call(langButtons, function (b) {
      b.addEventListener('click', function () {
        var lang = b.getAttribute('data-setlang');
        paintLang(lang);
        paintMotion();          /* l'infobulle des animations suit la langue */
        try { localStorage.setItem('lh-lang', lang); } catch (e) {}
      });
    });
  }

  /* ---------------------------------------------------------- mouvement - */
  /* Sans choix explicite, on suit le syst&egrave;me. Avec, on l'emporte. */
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mBtn = document.getElementById('motion-toggle');

  function motionOn() {
    var a = root.getAttribute('data-motion');
    if (a === 'on') return true;
    if (a === 'off') return false;
    return !mq.matches;
  }
  var MOTION_TITLE = {
    fr: ['Animations activées', 'Animations désactivées'],
    en: ['Animations on', 'Animations off']
  };
  function paintMotion() {
    if (!mBtn) return;
    var on = motionOn();
    var lang = root.getAttribute('data-sitelang') === 'fr' ? 'fr' : 'en';
    mBtn.setAttribute('aria-pressed', String(on));
    mBtn.title = MOTION_TITLE[lang][on ? 0 : 1];
  }
  try {
    var savedM = localStorage.getItem('lh-motion');
    if (savedM === 'on' || savedM === 'off') root.setAttribute('data-motion', savedM);
  } catch (e) {}
  paintMotion();
  if (mBtn) {
    mBtn.addEventListener('click', function () {
      var next = motionOn() ? 'off' : 'on';
      root.setAttribute('data-motion', next);
      try { localStorage.setItem('lh-motion', next); } catch (e) {}
      paintMotion();
    });
  }

  var btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') === 'dark' ||
        (!root.getAttribute('data-theme') &&
         window.matchMedia('(prefers-color-scheme: dark)').matches);
      var next = dark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('lh-theme', next); } catch (e) {}
    });
  }

  /* ------------------------------------------------------------ toc ---- */
  var links = document.querySelectorAll('.toc a[href^="#"]');
  if (!links.length || !('IntersectionObserver' in window)) return;

  var byId = {};
  var targets = [];
  Array.prototype.forEach.call(links, function (a) {
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) { byId[el.id] = a; targets.push(el); }
  });
  if (!targets.length) return;

  var visible = {};
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      visible[entry.target.id] = entry.isIntersecting;
    });
    var current = null;
    for (var i = 0; i < targets.length; i++) {
      if (visible[targets[i].id]) { current = targets[i].id; break; }
    }
    Array.prototype.forEach.call(links, function (a) { a.classList.remove('active'); });
    if (current && byId[current]) byId[current].classList.add('active');
  }, { rootMargin: '-80px 0px -70% 0px' });

  targets.forEach(function (el) { observer.observe(el); });
})();
