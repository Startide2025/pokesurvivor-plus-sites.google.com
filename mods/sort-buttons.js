// PS Mod: Sort Buttons
// Adds Sort A-Z / Sort by Type buttons to the Pokémon selection grid (#dex-grid).
// Works on desktop and mobile (44px touch targets, flex-wrap).
(function () {
  'use strict';

  var STORAGE_KEY = 'ps_sort_mode';
  var sortMode = 'default';
  try { sortMode = localStorage.getItem(STORAGE_KEY) || 'default'; } catch(e){}

  // ── Sort logic ────────────────────────────────────────────────────────────
  function getGrid() { return document.getElementById('dex-grid'); }

  function sortGrid(mode) {
    var grid = getGrid();
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.children);
    if (cards.length < 2) return;

    // Stamp original order on first sort
    cards.forEach(function (c, i) {
      if (!c.dataset.sortIdx) c.dataset.sortIdx = i;
    });

    var sorted;
    if (mode === 'alpha') {
      sorted = cards.slice().sort(function (a, b) {
        var na = (a.querySelector('.dex-name, [class*="name"]') || a).textContent.trim();
        var nb = (b.querySelector('.dex-name, [class*="name"]') || b).textContent.trim();
        return na.localeCompare(nb);
      });
    } else if (mode === 'type') {
      sorted = cards.slice().sort(function (a, b) {
        var ta = (a.querySelector('[class*="type-"], .type') || {className:''}).className;
        var tb = (b.querySelector('[class*="type-"], .type') || {className:''}).className;
        return ta.localeCompare(tb);
      });
    } else {
      sorted = cards.slice().sort(function (a, b) {
        return (parseInt(a.dataset.sortIdx)||0) - (parseInt(b.dataset.sortIdx)||0);
      });
    }

    var frag = document.createDocumentFragment();
    sorted.forEach(function (c) { frag.appendChild(c); });
    grid.appendChild(frag);
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────
  function injectToolbar() {
    var bar = document.getElementById('ps-sort-bar');
    var dexLeft = document.querySelector('.dex-left');
    var grid = getGrid();
    if (!dexLeft || !grid) return;
    if (bar) return; // already injected

    bar = document.createElement('div');
    bar.id = 'ps-sort-bar';
    bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;';

    function makeBtn(label, mode) {
      var b = document.createElement('button');
      b.textContent = label;
      b.dataset.sortMode = mode;
      b.className = 'btn small ghost';
      b.style.cssText = 'min-height:44px;padding:0 14px;font-size:13px;';
      b.setAttribute('aria-pressed', sortMode === mode ? 'true' : 'false');
      b.addEventListener('click', function () {
        sortMode = mode;
        try { localStorage.setItem(STORAGE_KEY, mode); } catch(e){}
        sortGrid(mode);
        bar.querySelectorAll('button').forEach(function (btn) {
          btn.setAttribute('aria-pressed', btn.dataset.sortMode === mode ? 'true' : 'false');
        });
      });
      return b;
    }

    bar.appendChild(makeBtn('A–Z', 'alpha'));
    bar.appendChild(makeBtn('By type', 'type'));
    bar.appendChild(makeBtn('Default', 'default'));

    // Insert before the grid
    dexLeft.insertBefore(bar, grid);

    if (sortMode !== 'default') sortGrid(sortMode);
  }

  // ── Watch for dex screen ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    new MutationObserver(function () {
      var grid = getGrid();
      if (grid && grid.children.length > 0) injectToolbar();
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
