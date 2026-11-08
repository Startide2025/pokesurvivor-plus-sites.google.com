// PS Mod: Sort Buttons
// Adds Sort A-Z / Sort by Type buttons to the move-pick screen.
// Works on desktop and mobile (44px touch targets, flex-wrap).
(function () {
  'use strict';

  var STORAGE_KEY = 'ps_sort_mode';
  var sortMode = localStorage.getItem(STORAGE_KEY) || 'default';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getCardsContainer() {
    // The game renders move options into .cards inside the level-up screen
    return document.querySelector('#scr-lvl .cards, #scr-bond .cards, #scr-stone .cards');
  }

  function getCards() {
    var c = getCardsContainer();
    return c ? Array.prototype.slice.call(c.children) : [];
  }

  function sortCards(mode) {
    var container = getCardsContainer();
    if (!container) return;
    var cards = getCards();
    if (cards.length < 2) return;

    var sorted;
    if (mode === 'alpha') {
      sorted = cards.slice().sort(function (a, b) {
        var na = (a.querySelector('.card-name, h3, strong') || a).textContent.trim();
        var nb = (b.querySelector('.card-name, h3, strong') || b).textContent.trim();
        return na.localeCompare(nb);
      });
    } else if (mode === 'type') {
      sorted = cards.slice().sort(function (a, b) {
        // type badge has a class like "type-fire", "type-water", etc.
        var ta = (a.querySelector('[class*="type-"]') || {className: ''}).className;
        var tb = (b.querySelector('[class*="type-"]') || {className: ''}).className;
        return ta.localeCompare(tb);
      });
    } else {
      // 'default' — restore original DOM order via data-index
      sorted = cards.slice().sort(function (a, b) {
        return (parseInt(a.dataset.sortIdx) || 0) - (parseInt(b.dataset.sortIdx) || 0);
      });
    }

    // Stamp original indices if not set
    cards.forEach(function (c, i) {
      if (!c.dataset.sortIdx) c.dataset.sortIdx = i;
    });

    var frag = document.createDocumentFragment();
    sorted.forEach(function (c) { frag.appendChild(c); });
    container.appendChild(frag);
  }

  // ── Toolbar injection ─────────────────────────────────────────────────────
  function injectToolbar(screen) {
    if (screen.querySelector('#ps-sort-bar')) return;

    var bar = document.createElement('div');
    bar.id = 'ps-sort-bar';
    bar.style.cssText = [
      'display:flex',
      'flex-wrap:wrap',
      'gap:6px',
      'justify-content:center',
      'margin:6px 0 2px',
    ].join(';');

    function makeBtn(label, mode) {
      var b = document.createElement('button');
      b.textContent = label;
      b.dataset.sortMode = mode;
      b.className = 'btn small ghost';
      b.style.cssText = 'min-height:44px;padding:0 14px;font-size:13px';
      b.setAttribute('aria-pressed', sortMode === mode ? 'true' : 'false');
      b.addEventListener('click', function () {
        sortMode = mode;
        try { localStorage.setItem(STORAGE_KEY, mode); } catch(e){}
        // Stamp current order if switching to default
        if (mode === 'default') {
          getCards().forEach(function (c, i) { c.dataset.sortIdx = i; });
        }
        sortCards(mode);
        // Update aria-pressed
        bar.querySelectorAll('button').forEach(function (btn) {
          btn.setAttribute('aria-pressed', btn.dataset.sortMode === mode ? 'true' : 'false');
        });
      });
      return b;
    }

    bar.appendChild(makeBtn('A–Z', 'alpha'));
    bar.appendChild(makeBtn('By type', 'type'));
    bar.appendChild(makeBtn('Default', 'default'));

    // Insert before the cards container
    var container = screen.querySelector('.cards');
    if (container) {
      screen.querySelector('.box, div').insertBefore(bar, container);
    } else {
      screen.appendChild(bar);
    }

    // Sort immediately if a mode was remembered
    if (sortMode !== 'default') sortCards(sortMode);
  }

  function removeToolbar(screen) {
    var bar = screen && screen.querySelector('#ps-sort-bar');
    if (bar) bar.remove();
  }

  // ── Watch for level-up / bond / stone screens becoming visible ────────────
  var SCREEN_IDS = ['scr-lvl', 'scr-bond', 'scr-stone'];

  function checkScreens() {
    SCREEN_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (!el.classList.contains('hidden') && el.style.display !== 'none') {
        injectToolbar(el);
      } else {
        removeToolbar(el);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Watch the whole body for class / style changes on screens
    new MutationObserver(checkScreens)
      .observe(document.body, { attributes: true, subtree: true,
                                 attributeFilter: ['class', 'style'] });
    checkScreens();
  });
})();
