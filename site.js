/* Etmar-Website: Suche, Filter der Funktionsseite, Sprachwahl, Inhaltsverzeichnis.
   Kein Abruf, keine Cookies: Der Suchindex liegt als Datei neben der Seite
   (search-de.js / search-en.js), die Sprachwahl im localStorage. */
(function () {
  'use strict';

  function klein(s) { return (s || '').toLowerCase(); }

  // ---- Sprachwahl merken und die Sprungmarke mitnehmen
  document.querySelectorAll('[data-sprache]').forEach(function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('etmar-lang', a.getAttribute('data-sprache')); } catch (e) {}
      if (location.hash) a.href = a.href.split('#')[0] + location.hash;
    });
  });

  // ---- Inhaltsverzeichnis: schmal eingeklappt, breit immer offen; aktueller Abschnitt markiert
  var inhalt = document.querySelector('nav.inhalt details');
  if (inhalt) {
    var breit = window.matchMedia('(min-width: 62rem)');
    if (!breit.matches) inhalt.open = false;
    var gleich = function () { if (breit.matches) inhalt.open = true; };
    if (breit.addEventListener) breit.addEventListener('change', gleich); else breit.addListener(gleich);
    inhalt.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { if (!breit.matches) inhalt.open = false; });
    });
    if ('IntersectionObserver' in window) {
      var links = {};
      inhalt.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
      var seher = new IntersectionObserver(function (e) {
        e.forEach(function (x) {
          if (!x.isIntersecting) return;
          Object.keys(links).forEach(function (k) { links[k].classList.remove('hier'); });
          if (links[x.target.id]) links[x.target.id].classList.add('hier');
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      Object.keys(links).forEach(function (k) { var el = document.getElementById(k); if (el) seher.observe(el); });
    }
  }

  // ---- Suche über alle Seiten
  var feld = document.querySelector('[data-suche]');
  var liste = document.querySelector('[data-suche-liste]');
  if (feld && liste && window.ETMAR_INDEX) {
    var index = window.ETMAR_INDEX.map(function (e) { return { e: e, t: klein(e.t), x: klein(e.t + ' ' + e.x) }; });
    var aktiv = -1;
    var zeige = function () {
      var w = klein(feld.value).split(/\s+/).filter(Boolean);
      aktiv = -1;
      if (!w.length) { liste.hidden = true; liste.innerHTML = ''; feld.setAttribute('aria-expanded', 'false'); return; }
      var treffer = [];
      index.forEach(function (i) {
        var p = 0;
        for (var n = 0; n < w.length; n++) {
          if (i.x.indexOf(w[n]) < 0) return;
          if (i.t.indexOf(w[n]) === 0) p += 6; else if (i.t.indexOf(w[n]) > 0) p += 4; else p += 1;
        }
        if (i.e.k !== 'h') p += 1;
        treffer.push({ p: p, e: i.e });
      });
      treffer.sort(function (a, b) { return b.p - a.p; });
      liste.innerHTML = '';
      if (!treffer.length) {
        var p = document.createElement('p'); p.textContent = liste.getAttribute('data-leer'); liste.appendChild(p);
      }
      treffer.slice(0, 12).forEach(function (t) {
        var a = document.createElement('a'); a.href = t.e.u; a.setAttribute('role', 'option');
        var i = document.createElement('i'); i.textContent = liste.getAttribute('data-k-' + t.e.k) || '';
        var b = document.createElement('b'); b.textContent = t.e.t;
        var s = document.createElement('span'); s.textContent = t.e.x.length > 130 ? t.e.x.slice(0, 127) + '…' : t.e.x;
        a.appendChild(i); a.appendChild(b); a.appendChild(s); liste.appendChild(a);
      });
      liste.hidden = false; feld.setAttribute('aria-expanded', 'true');
    };
    feld.addEventListener('input', zeige);
    feld.addEventListener('focus', zeige);
    feld.addEventListener('keydown', function (ev) {
      var a = liste.querySelectorAll('a');
      if (ev.key === 'Escape') { liste.hidden = true; return; }
      if (!a.length) return;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        aktiv = (aktiv + (ev.key === 'ArrowDown' ? 1 : -1) + a.length) % a.length;
        a.forEach(function (x, n) { x.classList.toggle('aktiv', n === aktiv); });
        a[aktiv].scrollIntoView({ block: 'nearest' });
      } else if (ev.key === 'Enter') {
        ev.preventDefault(); location.href = a[aktiv < 0 ? 0 : aktiv].href;
      }
    });
    document.addEventListener('click', function (ev) {
      if (!liste.contains(ev.target) && ev.target !== feld) liste.hidden = true;
    });
  }

  // ---- Filter der Funktionsseite
  var filter = document.querySelector('[data-filter]');
  if (filter) {
    var eingabe = filter.querySelector('input');
    var knoepfe = filter.querySelectorAll('button[data-wahl]');
    var zeilen = document.querySelectorAll('.zeilen li');
    var leer = document.querySelector('.filter-leer');
    var wahl = 'alle';
    var anwenden = function () {
      var w = klein(eingabe.value).split(/\s+/).filter(Boolean);
      var sichtbar = 0;
      zeilen.forEach(function (li) {
        var ok = true;
        if (wahl === 'free') ok = li.getAttribute('data-stufe') !== 'pro';
        else if (wahl === 'pro') ok = li.getAttribute('data-stufe') !== 'free';
        else if (wahl === 'ohne') ok = li.getAttribute('data-ohne') === '1';
        else if (wahl === 'mit') ok = li.getAttribute('data-bord') === '1';
        var text = klein(li.textContent);
        for (var n = 0; ok && n < w.length; n++) if (text.indexOf(w[n]) < 0) ok = false;
        li.hidden = !ok; if (ok) sichtbar++;
      });
      document.querySelectorAll('.seite-inhalt section').forEach(function (s) {
        s.hidden = !s.querySelector('.zeilen li:not([hidden])');
      });
      if (leer) leer.hidden = sichtbar > 0;
    };
    knoepfe.forEach(function (b) {
      b.addEventListener('click', function () {
        wahl = b.getAttribute('data-wahl');
        knoepfe.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        anwenden();
      });
    });
    eingabe.addEventListener('input', anwenden);
  }
})();
