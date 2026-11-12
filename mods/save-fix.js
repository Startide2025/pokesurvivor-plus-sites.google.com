// PS Mod: Save fix
// Fixes two base-game bugs with saved runs (Save & Quit, and the crash-recovery autosave):
//
// 1. Stat points were lost. The run snapshot only keeps the player's plain values (numbers,
//    booleans, strings); stat points live in the object p.add = {atk, spa, def, sdf, spe, ...},
//    so a resumed run went back to the Pokémon's base stats. statsTaken (which cards were
//    picked) was restored, but nothing rebuilt the points from it.
//    Fix: expose p.add to the snapshot as a JSON string (a getter, so it's always current
//    whenever either save path takes a snapshot) and put it back on resume.
//
// 2. Saving during a Mega Evolution kept its timer, name and bonus HP but not its form or
//    stat multipliers, so the run resumed in base form with no Mega boost until the timer
//    ran out. Fix: on resume, re-apply the form with Mega.sync and rebuild the multipliers
//    with the same formula the game uses (MEGA_STATS vs base stats).
(function () {
  'use strict';
  function P() { return window.__PS; }

  // Make p.add part of every snapshot (Object.keys sees it; the snapshot reads the value).
  function expose(p) {
    if (!p || p.remote || Object.getOwnPropertyDescriptor(p, 'psAdd') && Object.getOwnPropertyDescriptor(p, 'psAdd').get) return;
    Object.defineProperty(p, 'psAdd', {
      enumerable: true, configurable: true,
      get: function () { return JSON.stringify(this.add || {}); },
      set: function () {},
    });
  }

  function restoreAdd(p) {
    var d = Object.getOwnPropertyDescriptor(p, 'psAdd');
    if (!d || typeof d.value !== 'string') return false; // not a resumed run, or an older save
    try {
      var add = JSON.parse(d.value);
      Object.keys(add).forEach(function (k) { if (typeof add[k] === 'number' && isFinite(add[k])) p.add[k] = add[k]; });
    } catch (e) { console.warn('[SaveFix] could not read saved stat points', e); return false; }
    // baseSpd / spdMul / spdPerm already came back as plain numbers with Speed points included.
    return true;
  }

  function restoreMega(p) {
    var G = P(), key = p.megaKey;
    if (!key || p.megaK || !G.Mega || !G.Mega.sync) return false;
    var T = p.megaT;
    p.megaKey = null;          // sync only applies a form when the key differs
    G.Mega.sync(p, key);       // form, types, sprite (no HP or timer changes)
    p.megaT = T;
    var mega = G.MEGA_STATS && G.MEGA_STATS[key], b = p.bs;
    if (mega && b) {
      var base = [b.hp, b.atk, b.def, b.spa, b.sdf, b.spe];
      var d = mega.map(function (v, i) { return Math.max(-50, v - base[i]); });
      p.megaK = { atk: 1 + d[1] / 100, def: 1 + d[2] / 100, spa: 1 + d[3] / 100, sdf: 1 + d[4] / 100, spe: 1 + d[5] / 100 };
    }
    return true; // megaHp and the boosted maxHp were saved as plain numbers already
  }

  var waitId = setInterval(function () {
    var G = P();
    if (!G || !G.Game || !G.Game.startRun || !G.Game.resumeRun) return;
    clearInterval(waitId);

    var _start = G.Game.startRun;
    G.Game.startRun = function () {
      var r = _start.apply(this, arguments);
      try { expose(G.Game.player); } catch (e) { console.warn('[SaveFix] start', e); }
      return r;
    };

    var _resume = G.Game.resumeRun;
    G.Game.resumeRun = function () {
      var r = _resume.apply(this, arguments);
      try {
        var p = G.Game.player;
        if (p) {
          var a = restoreAdd(p), m = restoreMega(p);
          expose(p);
          console.log('[SaveFix] resumed run' + (a ? ': stat points restored' : '') + (m ? ', Mega restored' : ''));
        }
      } catch (e) { console.error('[SaveFix] resume failed', e); }
      return r;
    };
    console.log('[SaveFix] ready');
  }, 50);
})();
