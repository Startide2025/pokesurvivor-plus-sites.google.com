// PS Mod: Ability Display
// 1. Pokémon card: an "Ability" box under the Nature box, with a picker for unlocked
//    abilities (locked ones are shown greyed out with how to get them).
// 2. Pause menu stats panel: the ability active in this run, plus any stat stages.
// The card is detected through the game's own UI.sprite() call for its portrait
// canvas (#dex-big), which runs every time the card is (re)drawn.
// Requires mods/abilities.js (window.PS_ABILITIES).
(function () {
  'use strict';

  var IDX = { '0': 0, '1': 1, 'H': 2, 'S': 3 };
  var TAG = { H: 'hidden', S: 'special' };
  var STAT_SHORT = { atk: 'Atk', def: 'Def', spa: 'SpA', sdf: 'SpD', spe: 'Spe' };
  var cardDex = null, cardEl = null, open = false;

  function P() { return window.__PS; }
  function A() { return window.PS_ABILITIES; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function injectStyles() {
    if (document.getElementById('ps-ab-style')) return;
    var st = document.createElement('style');
    st.id = 'ps-ab-style';
    st.textContent = [
      '.ps-ab-box .ps-ab-desc{font-size:12px;margin:0 0 6px;line-height:1.35;color:var(--muted,#9fb1c9)}',
      '.ps-ab-box .ps-ab-desc b{color:inherit}',
      '.ps-ab-box .ps-ab-none{color:#c9a07a}',
      '.ps-ab-box .chip.ps-ab-lock{opacity:.45;cursor:help}',
      '.ps-ab-box .ps-ab-tag{font-size:11px;opacity:.7;margin-left:3px}',
      '.ps-ab-box .ps-ab-mega{font-size:12px;margin:4px 0 0;color:var(--muted,#9fb1c9)}',
      '#stats-panel .ps-ab-run{font-size:12px;line-height:1.35;margin:2px 0 4px}',
      '#stats-panel .ps-ab-run .ps-ab-none{color:#c9a07a}',
      '#stats-panel .ps-ab-run .ps-ab-st{margin-top:3px;color:#7fe0a0}',
      '#stats-panel .ps-ab-run .ps-ab-st i{font-style:normal;color:#ff8a96}',
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ── Pokémon card ───────────────────────────────────────────────────── */
  function skinOf(dex) {
    var G = P(), mon = G.monOf ? G.monOf(dex) : null;
    return mon && mon.skin ? mon.skin : null;
  }
  function boxHtml(dex) {
    var AB = A(), G = P();
    AB.ensure();
    var slots = AB.slots(dex, skinOf(dex));
    if (!slots) return '';
    var owned = AB.owned(dex), chosen = AB.chosen(dex);
    var cur = slots[IDX[chosen]] || slots[0];
    var inf = AB.info(cur);
    var total = slots.filter(function (x, i) { return x && slots.indexOf(x) === i; }).length;
    var have = owned.filter(function (k) { return slots[IDX[k]]; }).length;
    var chips = AB.SLOT_KEYS.map(function (k, i) {
      var id = slots[i];
      if (!id || slots.indexOf(id) !== i) return '';
      var info = AB.info(id), mine = owned.indexOf(k) >= 0;
      var tip = esc(info.name + ' — ' + (info.none ? 'No effect here: ' + info.none : info.desc));
      if (!mine) return '<button class="chip ps-ab-lock" disabled title="' + esc('Locked. Pull another ' + ((G.DEX_BY[dex] || {}).name || 'copy') + ' to unlock. ') + tip + '">' +
        esc(info.name) + '<span class="ps-ab-tag">' + (TAG[k] || 'locked') + '</span></button>';
      return '<button class="chip ps-abpick ' + (k === chosen ? 'on' : '') + '" data-k="' + k + '" title="' + tip + '"><span translate="no">' + esc(info.name) + '</span>' +
        (TAG[k] ? '<span class="ps-ab-tag">' + TAG[k] + '</span>' : '') + '</button>';
    }).join('');
    var megas = G.Mega && G.Mega.formsOf ? G.Mega.formsOf(dex) : [];
    var megaLine = megas.length ? '<p class="ps-ab-mega">' + megas.map(function (key) {
      var id = AB.DATA.megas[key];
      return id ? esc(G.Mega.nameOf(key)) + ': <b>' + esc(AB.info(id).name) + '</b>' : '';
    }).filter(Boolean).join(' · ') + '</p>' : '';
    return '<p style="font-size:14px;margin:6px 0 4px">Ability: <b class="gold"><span translate="no">' + esc(inf.name) + '</span></b>' +
      (TAG[chosen] ? ' <span style="font-size:12px;color:var(--muted)">(' + TAG[chosen] + ')</span>' : '') +
      ' <small style="color:var(--muted)">(' + have + '/' + total + ')</small></p>' +
      '<p class="ps-ab-desc">' + (inf.none ? '<span class="ps-ab-none">No effect here: ' + esc(inf.none) + '</span> <span>(' + esc(inf.desc) + ')</span>' : esc(inf.desc)) + '</p>' +
      '<div class="nat-btns"><button class="btn small ' + (open ? 'gold' : 'ghost') + '" data-abopen="1">Ability ▾</button></div>' +
      (open ? '<div class="chips nat-chips" style="margin-top:6px">' + chips + '</div>' : '') + megaLine;
  }
  function renderBox() {
    if (!cardEl || !cardEl.isConnected || cardDex == null) return;
    var box = cardEl.querySelector('.ps-ab-box');
    var html = boxHtml(cardDex);
    if (!html) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement('div');
      box.className = 'nat-box ps-ab-box';
      var nat = cardEl.querySelector('.nat-box:not(.ps-ab-box)');
      var moves = cardEl.querySelector('.move-icons');
      if (nat && nat.parentNode) nat.parentNode.insertBefore(box, nat.nextSibling);
      else if (moves && moves.parentNode) moves.parentNode.insertBefore(box, moves);
      else return;
    }
    box.innerHTML = html;
    var btn = box.querySelector('[data-abopen]');
    if (btn) btn.onclick = function () { open = !open; renderBox(); };
    box.querySelectorAll('.ps-abpick').forEach(function (b) {
      b.onclick = function () {
        if (A().choose(cardDex, b.dataset.k)) {
          if (P().Audio) P().Audio.sfx('select');
          open = false;
          renderBox();
        }
      };
    });
  }

  function hookCard() {
    var G = P(), _sprite = G.UI.sprite;
    G.UI.sprite = function (canvas, id, opts) {
      var r = _sprite.apply(this, arguments);
      try {
        if (canvas && canvas.id === 'dex-big') {
          var key = String(id);
          // Viewing a Mega in the card passes its key ("6_megax"); the card's own dex is unchanged.
          var isMega = G.Mega && G.Mega.FORMS && G.Mega.FORMS[key];
          var dex = isMega ? cardDex : parseInt(key, 10);
          if (dex !== cardDex) open = false;
          cardDex = dex;
          cardEl = canvas.parentElement;
          if (opts && opts.silhouette) { var b = cardEl && cardEl.querySelector('.ps-ab-box'); if (b) b.remove(); }
          else renderBox();
        }
      } catch (e) { console.warn('[AbilityDisplay] card', e); }
      return r;
    };
  }

  /* ── Pause menu stats panel ─────────────────────────────────────────── */
  function runHtml() {
    var a = A().active();
    if (!a) return '';
    var st = (a.stages || []).map(function (x) {
      var n = x[1];
      return n > 0 ? STAT_SHORT[x[0]] + ' +' + n : '<i>' + STAT_SHORT[x[0]] + ' ' + n + '</i>';
    }).join(' · ');
    return '<h4>Ability</h4><div class="ps-ab-run"><b class="gold" translate="no">' + esc(a.name) + '</b><br>' +
      (a.none ? '<span class="ps-ab-none">No effect here: ' + esc(a.none) + '</span>' : esc(a.desc)) +
      (st ? '<div class="ps-ab-st">Stages: ' + st + '</div>' : '') + '</div>';
  }
  function syncPanel() {
    var panel = document.getElementById('stats-panel');
    if (!panel || panel.classList.contains('hidden')) return;
    var html = runHtml();
    var el = panel.querySelector('.ps-ab-wrap');
    if (!html) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.className = 'ps-ab-wrap';
      var moves = panel.querySelector('h4');
      if (moves) panel.insertBefore(el, moves); else panel.appendChild(el);
    }
    if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  }
  function hookPanel() {
    var watched = null;
    var mo = new MutationObserver(function () { syncPanel(); });
    setInterval(function () {
      var panel = document.getElementById('stats-panel');
      if (panel && panel !== watched) { watched = panel; mo.disconnect(); mo.observe(panel, { childList: true }); }
      syncPanel();
    }, 400);
  }

  var waitId = setInterval(function () {
    var G = P();
    if (!G || !G.UI || !G.UI.sprite || !A()) return;
    clearInterval(waitId);
    injectStyles();
    hookCard();
    hookPanel();
    console.log('[AbilityDisplay] ready');
  }, 50);
})();
