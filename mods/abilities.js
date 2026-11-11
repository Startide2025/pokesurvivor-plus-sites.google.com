// PS Mod: Abilities — engine
//
// Every Pokémon has its real ability slots (ability 1, ability 2, hidden), unlocked
// per species the same way natures are, and abilities run on the game's own systems:
//   stats       -> Player.mk()             (the hook natures and Megas already use)
//   move power  -> Player.dmgK()           (every damage path multiplies by it)
//   STAB        -> Player.stabOf()
//   taking hits -> Player.hurt()           (attacker type, phys/spec, contact attacker)
//   dealing hits-> Enemy.hurt(), Stats.dmg() (crit/super/weak label, move id)
//   statuses    -> Player.triStatus(), Enemy.apply*()
//   weather     -> Weather.force/mult/speedFor/update
//   KOs         -> Enemy.die()
// Everything is driven from Player.update(), so it pauses with the game.
//
// Requires window.__PS (exposed in js/app.min.js) and mods/ability-data.js.
// UI lives in mods/ability-display.js; it talks to window.PS_ABILITIES.
(function boot(tries) {
  'use strict';
  var DATA = window.PS_ABILITY_DATA;
  // The mod loader injects scripts without ordering them, so wait for the data file.
  if (!DATA) {
    if ((tries || 0) > 400) console.warn('[Abilities] mods/ability-data.js did not load');
    else setTimeout(function () { boot((tries || 0) + 1); }, 25);
    return;
  }

  /* ── Mainline → game conversions ────────────────────────────────────────────
   * Each constant is taken from how the game already translates the same
   * mainline mechanic, so abilities stay on the game's scale.                    */
  var TURN        = 2;           // seconds per "turn" = the game's weather tick
  var RESID       = 1.2 / 6.25;  // HP fractions per turn: sandstorm 1/16 (6.25%) -> 1.2%
  var STAGE_STEP  = 0.6;         // one stat stage: Liechi/Apicot +1 -> x1.3 (mainline x1.5)
  var STAGE_TIME  = 8;           // seconds a triggered stage lasts: Liechi/Apicot last 8 s
  var CRIT_STAGE  = 0.2;         // +1 crit stage: Scope Lens -> +20% crit chance
  var HELMET_K    = 0.2 * 6;     // attacker HP fractions: Rocky Helmet 1/6 -> 20%
  var HELMET_BOSS = 0.25;        // bosses take a quarter of that (Rocky Helmet 5%)
  var HELMET_CD   = 2.5;         // once per 2.5 s per attacker (Rocky Helmet)
  var FOE_RESID   = (2 * 0.01 / 0.6) / (1 / 16); // foe HP per turn: burn 1/16 -> 3.33%
  var FLINCH      = 2;           // flinch -> fear 2 s (King's Rock)
  var PARA        = 1;           // paralysis or sleep on a foe -> stun 1 s (moves' paraP)
  var SPEED_DROP  = 0.35;        // -1 Speed on a foe -> slow 0.35 (Bulldoze)
  // Ability weather lasts until replaced (Gen 3-5 rule). 1e7 s (~115 days) outlasts any endless
  // run; it must stay finite because co-op sends it as JSON, where Infinity becomes null.
  var ABILITY_WEATHER = 1e7;
  var MISS_EVADE  = 0.2;         // +1 evasion -> foes hit 80% of the time
  var HUSTLE_MISS = 0.2;         // Hustle: physical moves hit 80% of the time

  var STATS = ['atk', 'def', 'spa', 'sdf', 'spe'];
  var STAT_NAME = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', sdf: 'Sp. Def', spe: 'Speed' };
  // Ability 1, ability 2, hidden, special (Zygarde's Power Construct, Greninja's Battle Bond, Rockruff's Own Tempo).
  var SLOT_KEYS = ['0', '1', 'H', 'S'];
  var SLOT_IDX = { '0': 0, '1': 1, 'H': 2, 'S': 3 };
  var WEATHERS = { sun: 1, rain: 1, sand: 1, snow: 1, hail: 1, harsh: 1, storm: 1, winds: 1, fog: 1, curse: 1 };
  var TERRAINS = { electric: 1, grassy: 1, misty: 1, psychic: 1 };
  var LIQUID_TYPE = { lava: 'fire', poison: 'poison', spark: 'electric' };
  var BULLET_PROJ = { ball: 1, blob: 1, shadow: 1 }; // the game's Aura Sphere / Sludge-Mud Bomb / Shadow Ball shots
  var ABILITY_COLOR = '#ffd27a';

  // Move flags by game move id (mapped through the game's English move names).
  var MF = {};
  var NOFLAGS = { bp: 0 };
  Object.keys(DATA.moves).forEach(function (id) {
    var m = DATA.moves[id], o = { bp: m.bp };
    (m.f ? m.f.split(' ') : []).forEach(function (f) { o[f] = true; });
    MF[id] = o;
  });

  function P() { return window.__PS; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd() { return Math.random(); }

  /* ── Run state ─────────────────────────────────────────────────────────── */
  var S = {
    p: null, ab: null, def: null, slot: '0', baseDex: 0,
    t: 0, turnT: 0, frame: 0,
    stages: {}, perm: {}, statK: {},
    v: {},
    said: {},
    striker: null, outRec: null, dmgkMove: null, dmgkFrame: -1,
    lastHit: null, hitSeq: 0, missFrame: -1,
    inUpdate: false, ghost: 0, lastSlowT: 0,
  };
  function resetStages() {
    STATS.forEach(function (s) { S.stages[s] = { n: 0, t: 0 }; S.perm[s] = 0; S.statK[s] = 1; });
  }
  resetStages();

  /* ── Small helpers ─────────────────────────────────────────────────────── */
  function say(p, text, color) {
    if (!p || !P().FX) return;
    if (S.said[text] && S.t - S.said[text] < 1.2) return;
    S.said[text] = S.t;
    P().FX.dmgText(p.x, p.y - p.bodyH - 26, text, color || ABILITY_COLOR, true);
  }
  function sayOn(e, text, color) { if (P().FX) P().FX.dmgText(e.x, e.y - e.bodyH - 12, text, color || '#c9d1dc'); }
  function heal(p, amt) { if (amt > 0 && !p.dead) p.heal(amt); }
  function hpf(p) { return p.hp / Math.max(1, p.maxHp); }
  function isDamaging(m) { return !!m && m.dmg > 0 && m.kind !== 'buff' && m.kind !== 'decoy' && !(m.def && m.def.passive); }
  function catOf(m) { var c = P().Moves.CAT; return c && c[m.id] != null ? c[m.id] : 0; }
  // Power multiplier k applied only to the special share of a move (mixed moves get part of it).
  function specPower(m, k) { return 1 + (k - 1) * (1 - catOf(m)); }
  function natK(p, s) { var N = P().Natures; return p.nat && N ? N.k(p.nat, s) : 1; }
  // Raw stat (base + points + nature), ignoring boosts — what Beast Boost and Protosynthesis read.
  function rawStat(p, s) {
    var Pl = P().Player;
    var base = s === 'spe' ? p.bs.spe + (p.add.spe || 0) : Pl.soft(p.bs[s] + (p.add[s] || 0));
    return base * natK(p, s);
  }
  function highestStat(p) {
    var best = 'atk', v = -1;
    STATS.forEach(function (s) { var x = rawStat(p, s); if (x > v) { v = x; best = s; } });
    return best;
  }

  // Weather / terrain (ramped like the game: active once its intensity reaches 0.3)
  function rawKind() {
    var Wx = P().Weather, c = Wx && Wx.current;
    if (!c) return null;
    return Math.min(1, c.t / 3, (c.dur - c.t) / 3) >= 0.3 ? c.kind : null;
  }
  function cloudNine() { return S.ab === 'cloudnine' || S.ab === 'airlock'; }
  function weather() { var k = rawKind(); return k && WEATHERS[k] && !cloudNine() ? k : null; }
  function terrain() { var k = rawKind(); return k && TERRAINS[k] ? k : null; }
  function rainy() { var k = weather(); return k === 'rain' || k === 'storm'; }
  function sunny() { var k = weather(); return k === 'sun' || k === 'harsh'; }
  function sandy() { return weather() === 'sand'; }
  function snowy() { var k = weather(); return k === 'snow' || k === 'hail'; }
  // Co-op: the game only lets the host send weather, so the host's weather is the shared one.
  // A guest's setter only fills an empty slot (it never overrides the host's weather); strong
  // weathers still override normal ones, like in mainline.
  var STRONG_WX = { storm: 1, harsh: 1, winds: 1 };
  function coopRole() { // 'host' | 'guest' | null  (S.coopRole lets tests simulate a role)
    if (S.coopRole) return S.coopRole;
    var C = P().Coop;
    return C && C.active ? (C.isHost ? 'host' : 'guest') : null;
  }
  function coopGuest() { return coopRole() === 'guest'; }
  function setWeather(kind, strong) {
    var Wx = P().Weather; if (!Wx) return;
    var c = Wx.current;
    S.v.wx = kind;
    if (c && c.kind === kind && c.left > 60) return;
    if (c && coopGuest() && !strong) return;
    if (coopRole() === 'host' && Wx.debugStart) Wx.debugStart(kind, ABILITY_WEATHER);
    else Wx.force(kind, ABILITY_WEATHER);
  }
  // Weather setters keep their weather: when the slot empties (a rift arena or Arceus fight
  // cleared it, or a co-op host's weather ran out) it's summoned again, like re-entering battle.
  // Strong weathers (Primal / Mega Rayquaza) can't be replaced at all while the form lasts.
  function keepWeather(strong) {
    var Wx = P().Weather, G = P();
    if (!S.v.wx || !Wx || (G.Game && G.Game.training)) return;
    var c = Wx.current;
    // Host: repeat our weather every 5 s so a guest who missed the message (their run start
    // wipes weather) catches up. Guests ignore repeats of weather they already have.
    if (c && c.kind === S.v.wx && coopRole() === 'host' && S.t - (S.v.wxSent || -99) >= 5) {
      S.v.wxSent = S.t;
      G.Coop.broadcast(['wx', c.kind, c.left]);
    }
    // Two strong weathers (e.g. Primal Kyogre and Primal Groudon in co-op) accept each other.
    if (c && strong && c.kind !== S.v.wx && STRONG_WX[c.kind]) { S.v.wxEmpty = null; return; }
    if (c && (!strong || c.kind === S.v.wx)) { S.v.wxEmpty = null; return; }
    // Weather that was just forced reads as empty for a frame (its fade-in starts at 0),
    // so only act once the slot has stayed empty (or wrong, for strong weather) for 0.5 s.
    if (S.v.wxEmpty == null) { S.v.wxEmpty = S.t; return; }
    if (S.t - S.v.wxEmpty < 0.5 || S.t - (S.v.wxRetry || -99) < 3) return;
    S.v.wxRetry = S.t; S.v.wxEmpty = null;
    setWeather(S.v.wx, strong);
  }
  function clearOwnWeather() {
    var Wx = P().Weather, c = Wx && Wx.current;
    if (c && S.v.wx && c.kind === S.v.wx && Wx.clear) Wx.clear();
  }

  // Player status as the game models it.
  function burned(p) { return p.burnT > 0; }
  function frozen(p) { return (S.v.freezeUntil || 0) > S.t && p.slowT > 0; }
  function paralyzed(p) { return p.sleepT > 0; }
  function poisoned(p) { return !!S.v.inPoison; }
  function statused(p) { return burned(p) || frozen(p) || paralyzed(p) || poisoned(p); }
  function cure(p) {
    var any = statused(p);
    p.burnT = 0; p.sleepT = 0;
    if (frozen(p)) { p.slowT = 0; S.v.freezeUntil = 0; }
    return any;
  }

  // Stat stages (mainline formula, scaled by STAGE_STEP). Triggered stages expire after
  // STAGE_TIME like the game's own temporary boosts; on-entry stages last the run.
  function stageMult(n) { return n >= 0 ? 1 + STAGE_STEP * n / 2 : 1 / (1 + STAGE_STEP * -n / 2); }
  function stageOf(s) { return clamp(S.perm[s] + S.stages[s].n, -6, 6); }
  function boost(p, s, n, permanent) {
    if (!n) return;
    if (S.ab === 'simple') n *= 2;
    else if (S.ab === 'contrary') n = -n;
    var before = stageOf(s);
    if (permanent) S.perm[s] = clamp(S.perm[s] + n, -6, 6);
    else {
      var st = S.stages[s];
      st.n = clamp(st.n + n, -6 - S.perm[s], 6 - S.perm[s]);
      st.t = STAGE_TIME;
    }
    var after = stageOf(s);
    if (after !== before) say(p, STAT_NAME[s] + (after > before ? (after - before > 1 ? ' ↑↑' : ' ↑') : ' ↓'), after > before ? '#7fe0a0' : '#ff8a96');
    recalc(p);
  }
  function recalc(p) {
    var d = S.def;
    STATS.forEach(function (s) {
      var k = d && d.stat ? d.stat(p, s) : 1;
      S.statK[s] = (k || 1) * stageMult(stageOf(s));
    });
  }

  // Contact recoil and statuses on foes, using the game's own conversions.
  function recoil(e, frac) {
    if (!e || e.dead) return;
    var now = performance.now();
    if (now < (e._abRecoilAt || 0)) return;
    e._abRecoilAt = now + HELMET_CD * 1000;
    var base = e.pctBase ? e.pctBase() : e.maxHp;
    e.hurt(base * frac * HELMET_K * (e.boss || e.legend ? HELMET_BOSS : 1), '#c9a07a', e.x - S.p.x, e.y - S.p.y, 60);
  }
  function foeStatus(e, kind) {
    if (!e || e.dead) return;
    if (kind === 'burn') e.applyBurn(1);
    else if (kind === 'poison') e.applyPoison(1);
    else if (kind === 'para' || kind === 'sleep') e.applyStun(PARA);
    else if (kind === 'flinch') e.applyFear(FLINCH);
    else if (kind === 'speed') e.applySlow(SPEED_DROP, STAGE_TIME);
  }

  // Swapping looks/forms the way Mega Evolution does.
  function setMon(p, patch) { p.mon = Object.assign({}, p.mon, patch); }
  function setSkin(p, skin) {
    var G = P();
    if (!G.SPRITE_META || !G.SPRITE_META[skin] || p.megaKey) return false;
    var dir = p.anim.dir, sh = p.shiny && G.Sprites.hasShiny(skin);
    p.anim = new G.Sprites.Animator(skin, 1, sh); p.anim.dir = dir;
    p.r = G.Sprites.playerRadius(skin); p.bodyH = G.Sprites.bodyHeight(skin);
    G.Sprites.preload([skin], 8000, sh);
    return true;
  }
  function setForm(p, dex, form) {
    var mon = P().monOf(dex, form || null);
    if (!mon) return;
    p.mon = Object.assign({}, mon);
    setSkin(p, mon.skin || dex);
  }
  // Replace base stats the way the game's form evolution does (keeps upgrades and speed bonuses).
  function setBaseStats(p, arr, hpMode) {
    var Pl = P().Player, oldSpd = p.baseSpd, k = p.spdMul / (p.spdPerm || p.spdMul || 1);
    var dHp = arr[0] - p.bs.hp;
    p.maxHp = Math.max(1, p.maxHp + dHp);
    p.hp = hpMode === 'add' ? clamp(p.hp + dHp, 1, p.maxHp) : Math.min(p.hp, p.maxHp);
    p.bs = { hp: arr[0], atk: arr[1], def: arr[2], spa: arr[3], sdf: arr[4], spe: arr[5] };
    p.baseSpd = Pl.moveSpeed(p.bs.spe + (p.add.spe || 0));
    p.spdPerm = (oldSpd * (p.spdPerm || 1) - oldSpd + p.baseSpd) / p.baseSpd;
    p.spdMul = p.spdPerm * k;
  }
  function sameStats(p, arr) { return p.bs.atk === arr[1] && p.bs.def === arr[2] && p.bs.spa === arr[3] && p.bs.sdf === arr[4] && p.bs.spe === arr[5]; }

  // Move-instance edits (type changes, Serene Grace), re-applied every frame so level-ups and
  // move evolutions can't undo them, and reverted when the ability ends.
  function touch(m) { S.v.touched = S.v.touched || []; if (S.v.touched.indexOf(m) < 0) S.v.touched.push(m); }
  function baseType(m) { return m._abOrigType !== undefined ? m._abOrigType : m.type; }
  function retype(test, to) {
    return function (p) {
      (p.moves || []).forEach(function (m) {
        if (!isDamaging(m) || !test(m) || m.type === to) return;
        if (m._abOrigType === undefined) m._abOrigType = m.type;
        m.type = to; m._abAte = true; touch(m);
      });
    };
  }
  var CHANCE_FIELDS = ['burnP', 'paraP', 'para', 'freeze'];
  function sereneMoves(p) {
    (p.moves || []).forEach(function (m) {
      CHANCE_FIELDS.forEach(function (k) {
        if (typeof m[k] !== 'number') return;
        m._sg = m._sg || {};
        var rec = m._sg[k];
        if (rec && m[k] === rec[1]) return;              // still the value we doubled
        m._sg[k] = [m[k], Math.min(1, m[k] * 2)];          // first time, or a level-up changed it
        m[k] = m._sg[k][1]; touch(m);
      });
    });
  }
  function undoMoves() {
    (S.v.touched || []).forEach(function (m) {
      if (m._abOrigType !== undefined) { m.type = m._abOrigType; delete m._abOrigType; }
      delete m._abAte;
      if (m._sg) { Object.keys(m._sg).forEach(function (k) { if (m[k] === m._sg[k][1]) m[k] = m._sg[k][0]; }); delete m._sg; }
    });
    S.v.touched = [];
  }

  // Held-berry bookkeeping (the game's berries recharge instead of being used up).
  function berryCooling(p) {
    var now = performance.now();
    return (p.item === 'sitrusberry' && now - (p.sitrusAt || -1e12) < 30000) ||
      ((p.item === 'liechiberry' || p.item === 'apicotberry') && now - (p.heldBerryAt || -1e12) < 60000);
  }
  function itemSpent(p) {
    var now = performance.now();
    if (S.v.hadItem && !p.item) return true;
    if (berryCooling(p)) return true;
    if (p.item === 'focussash' && now - (p.sashT || -1e12) < 30000) return true;
    if (p.item === 'ejectbutton' && now - (p.ejectAt || -1e12) < 30000) return true;
    return false;
  }
  function triggerHeldBerry(p) { // same effect the game applies, used by Gluttony at 1/2 HP
    var k = p.item === 'liechiberry' ? 'atk' : p.item === 'apicotberry' ? 'def' : null;
    if (!k || p.heldBerryT > 0 || performance.now() - (p.heldBerryAt || -1e12) <= 60000) return;
    p.heldBerryAt = performance.now(); p.heldBerryT = 8; p.heldBerryK = k;
    if (k === 'atk') p.atkMul *= 1.3; else p.defBonus = (p.defBonus || 0) + 0.3;
    say(p, k === 'atk' ? 'Liechi Berry!' : 'Apicot Berry!', k === 'atk' ? '#ff6b4d' : '#7fb0ff');
  }

  /* ── Ability catalog ─────────────────────────────────────────────────────
   * d     what it does in this game          none  why it has no effect here
   * Hooks: start end tick turn stat power out dealt in hit contact status
   *        chip shot ko faint cast spawn fuse float                         */
  var AB = {};
  function def(ids, o) { ids.split(' ').forEach(function (id) { AB[id] = o; }); }
  function none(why, d) { return { none: why, d: d }; }

  function weatherSetter(kind, label) {
    return {
      d: 'Summons ' + label + ' for the rest of the run. If other weather replaces it, ' + label + ' returns once that ends.',
      start: function () { setWeather(kind); },
      tick: function () { keepWeather(false); },
    };
  }
  function terrainSetter(kind, d) {
    return { d: d + ' Lasts the whole run, and returns if other weather replaces it.', start: function () { setWeather(kind); }, tick: function () { keepWeather(false); } };
  }
  function strongWeather(kind, d) {
    return { d: d + ' No other weather can replace it. Ends with the form.', start: function () { setWeather(kind, true); }, tick: function () { keepWeather(true); }, end: clearOwnWeather };
  }
  // Type immunity: blocks attacks of that type (and pools of that type, silently).
  function immuneTo(type, label, then, extra) {
    return Object.assign({
      immune: type,
      in: function (p, h) {
        if (h.type !== type || h.env) return false;
        say(p, label);
        if (then) then(p, h);
        return true;
      },
    }, extra);
  }
  function absorb(p, frac) {
    if (S.t - (S.v.absorbAt || -9) < 0.45) return; // the game's own hit window
    S.v.absorbAt = S.t;
    heal(p, p.maxHp * frac * RESID);
  }
  function typePower(type, k) { return function (p, m) { return m.type === type ? k : 1; }; }
  function flagPower(flag, k) { return function (p, m, f) { return f[flag] ? k : 1; }; }
  function pinch(type) { return function (p, m) { return m.type === type && hpf(p) <= 1 / 3 ? 1.5 : 1; }; }
  function contactProc(chance, fn) { return function (p, e) { if (rnd() < chance) fn(p, e); }; }
  function blocks(kinds) { var set = {}; kinds.split(' ').forEach(function (k) { set[k] = 1; }); return function (p, kind) { return !!set[kind]; }; }
  var IS_STATUS = { burn: 1, freeze: 1, para: 1, sleep: 1, poison: 1 };
  var ALL_STATUS = blocks('burn freeze para sleep poison');
  function statusWhen(cond) { return function (p, kind) { return !!IS_STATUS[kind] && cond(p); }; }

  // ── Weather and terrain setters ──
  def('drizzle', weatherSetter('rain', 'rain'));
  def('drought', weatherSetter('sun', 'harsh sunlight'));
  def('sandstream', weatherSetter('sand', 'a sandstorm'));
  def('snowwarning', weatherSetter('snow', 'snow'));
  def('electricsurge', terrainSetter('electric', 'Sets Electric Terrain: Electric moves x1.3 and nobody can fall asleep.'));
  def('grassysurge', terrainSetter('grassy', 'Sets Grassy Terrain: Grass moves x1.3 and everyone slowly heals.'));
  def('mistysurge', terrainSetter('misty', 'Sets Misty Terrain: Dragon moves x0.5 and nobody gets statused.'));
  def('psychicsurge', terrainSetter('psychic', 'Sets Psychic Terrain: Psychic moves x1.3.'));
  def('primordialsea', strongWeather('storm', 'Heavy rain while in this form: Water x1.5, Fire almost does nothing.'));
  def('desolateland', strongWeather('harsh', 'Extremely harsh sunlight while in this form: Fire x1.5, Water almost does nothing.'));
  def('deltastream', strongWeather('winds', 'Strong winds while in this form: Flying-types lose their weaknesses.'));
  def('orichalcumpulse', Object.assign(weatherSetter('sun', 'harsh sunlight'), {
    d: 'Summons harsh sunlight for the rest of the run (it returns if replaced). In sun, Attack x1.33.',
    stat: function (p, s) { return s === 'atk' && sunny() ? 4 / 3 : 1; },
  }));
  def('sandspit', { d: 'Summons a sandstorm whenever it is hit by an attack.', hit: function (p, h) { if (!h.env) setWeather('sand'); } });
  def('seedsower', { d: 'Sets Grassy Terrain whenever it is hit by an attack.', hit: function (p, h) { if (!h.env) setWeather('grassy'); } });

  // ── Weather / terrain dependent ──
  def('swiftswim', { d: 'Speed x2 in rain.', stat: function (p, s) { return s === 'spe' && rainy() ? 2 : 1; } });
  def('chlorophyll', { d: 'Speed x2 in harsh sunlight.', stat: function (p, s) { return s === 'spe' && sunny() ? 2 : 1; } });
  def('sandrush', { d: 'Speed x2 in a sandstorm. Immune to sandstorm damage.', stat: function (p, s) { return s === 'spe' && sandy() ? 2 : 1; }, chip: function (k) { return k === 'sand'; } });
  def('slushrush', { d: 'Speed x2 in snow or hail.', stat: function (p, s) { return s === 'spe' && snowy() ? 2 : 1; } });
  def('sandforce', { d: 'Rock, Ground and Steel moves x1.3 in a sandstorm. Immune to sandstorm damage.', power: function (p, m) { return sandy() && (m.type === 'rock' || m.type === 'ground' || m.type === 'steel') ? 1.3 : 1; }, chip: function (k) { return k === 'sand'; } });
  def('sandveil', { d: 'In a sandstorm, foes\' attacks miss 20% of the time. Immune to sandstorm damage.', in: function (p, h) { if (!h.env && sandy() && rnd() < MISS_EVADE) { say(p, 'Miss!', '#c9d1dc'); return true; } }, chip: function (k) { return k === 'sand'; } });
  def('snowcloak', { d: 'In snow or hail, foes\' attacks miss 20% of the time. Immune to snow and hail damage.', in: function (p, h) { if (!h.env && snowy() && rnd() < MISS_EVADE) { say(p, 'Miss!', '#c9d1dc'); return true; } }, chip: function (k) { return k === 'snow' || k === 'hail'; } });
  def('icebody', { d: 'Heals 1/16 of max HP each turn in snow or hail (1.2% every 2 s). Immune to their damage.', chip: function (k) { return k === 'snow' || k === 'hail'; }, turn: function (p) { if (snowy()) heal(p, p.maxHp / 16 * RESID); } });
  def('raindish', { d: 'Heals 1/16 of max HP each turn in rain (1.2% every 2 s).', turn: function (p) { if (rainy()) heal(p, p.maxHp / 16 * RESID); } });
  def('dryskin', {
    d: 'Water attacks heal it instead of hurting. Heals 1/8 each turn in rain, loses 1/8 in sun. Fire damage x1.25.',
    in: function (p, h) {
      if (h.type === 'water' && !h.env) { say(p, 'Dry Skin'); absorb(p, 1 / 4); return true; }
      if (h.type === 'fire' && !h.env) h.dmg *= 1.25;
    },
    turn: function (p) { if (rainy()) heal(p, p.maxHp / 8 * RESID); else if (sunny()) p.hp = Math.max(1, p.hp - p.maxHp / 8 * RESID); },
  });
  def('solarpower', { d: 'In harsh sunlight, Sp. Atk x1.5 but loses 1/8 of max HP each turn.', stat: function (p, s) { return s === 'spa' && sunny() ? 1.5 : 1; }, turn: function (p) { if (sunny()) p.hp = Math.max(1, p.hp - p.maxHp / 8 * RESID); } });
  def('hydration', { d: 'Cures its status at the end of each turn in rain.', turn: function (p) { if (rainy() && cure(p)) say(p, 'Hydration'); } });
  def('leafguard', { d: 'Can\'t be statused in harsh sunlight.', status: statusWhen(sunny) });
  def('flowergift', {
    d: 'In harsh sunlight, Attack and Sp. Def x1.5 (Cherrim blooms into Sunshine Form).',
    stat: function (p, s) { return (s === 'atk' || s === 'sdf') && sunny() ? 1.5 : 1; },
    tick: function (p) {
      if (p.mon.dex !== 421 || p.megaKey) return;
      var want = sunny() ? 'sunshine' : '';
      if ((p.mon.form || '') !== want) setForm(p, 421, want);
    },
  });
  def('forecast', {
    d: 'Castform changes type and form with the weather: Fire in sun, Water in rain, Ice in snow or hail.',
    tick: function (p) {
      if (p.mon.dex !== 351 || p.megaKey) return;
      var want = sunny() ? 'sunny' : rainy() ? 'rainy' : snowy() ? 'snowy' : '';
      if ((p.mon.form || '') !== want) setForm(p, 351, want);
    },
  });
  function boosterStat(cond) {
    return {
      stat: function (p, s) { return S.v.pq === s ? (s === 'spe' ? 1.5 : 1.3) : 1; },
      tick: function (p) {
        var on = cond();
        if (on && !S.v.pq) { S.v.pq = highestStat(p); say(p, STAT_NAME[S.v.pq] + ' boosted'); }
        else if (!on && S.v.pq) S.v.pq = null;
      },
    };
  }
  def('protosynthesis', Object.assign({ d: 'In harsh sunlight, its highest stat x1.3 (Speed x1.5).' }, boosterStat(sunny)));
  def('quarkdrive', Object.assign({ d: 'On Electric Terrain, its highest stat x1.3 (Speed x1.5).' }, boosterStat(function () { return terrain() === 'electric'; })));
  def('cloudnine airlock', { d: 'Negates all weather effects (boosts, chip damage, slowdowns) while it\'s in battle. Terrains still work.', start: function (p) { say(p, 'Weather negated'); }, chip: function () { return true; } });
  def('grasspelt', { d: 'Defense x1.5 on Grassy Terrain.', stat: function (p, s) { return s === 'def' && terrain() === 'grassy' ? 1.5 : 1; } });
  def('overcoat', { d: 'Immune to weather damage (sandstorm, snow, hail).', chip: function () { return true; } });
  def('harvest', {
    d: 'A used Berry may grow back at the end of each turn: 50% chance, 100% in sun (resets its recharge).',
    turn: function (p) {
      if (!berryCooling(p) || (!sunny() && rnd() >= 0.5)) return;
      p.sitrusAt = -1e12; p.heldBerryAt = -1e12;
      say(p, 'Harvest');
    },
  });
  def('windrider', {
    d: 'Immune to wind attacks (Flying-type shots); being targeted by one raises Attack.',
    shot: function (p, q) { if (q.mtype !== 'flying') return false; say(p, 'Wind Rider'); boost(p, 'atk', 1); return true; },
  });
  def('windpower', { d: 'Being hit by a wind attack (Flying-type shot) charges it: its next Electric move deals x2.', hit: function (p, h) { if (h.type === 'flying' && h.cat === 'spec' && !h.env) { S.v.charged = true; say(p, 'Charged'); } } });

  // ── Status ──
  def('waterveil', { d: 'Can\'t be burned.', status: blocks('burn') });
  def('magmaarmor', { d: 'Can\'t be frozen.', status: blocks('freeze') });
  def('limber', { d: 'Can\'t be paralyzed.', status: blocks('para') });
  def('insomnia vitalspirit sweetveil', { d: 'Can\'t fall asleep (immune to Jigglypuff\'s Sing).', status: blocks('sleep') });
  def('immunity pastelveil', { d: 'Can\'t be poisoned: poison pools don\'t hurt it.', status: blocks('poison') });
  def('comatose', { d: 'Counts as asleep and can\'t be statused.', status: ALL_STATUS });
  def('purifyingsalt', { d: 'Can\'t be statused. Ghost damage x0.5.', status: ALL_STATUS, in: function (p, h) { if (h.type === 'ghost' && !h.env) h.dmg *= 0.5; } });
  def('goodasgold', { d: 'Immune to status moves (Jigglypuff\'s Sing).', status: blocks('sleep') });
  def('soundproof', { d: 'Immune to sound moves (Jigglypuff\'s Sing).', status: blocks('sleep') });
  def('magicbounce', { d: 'Bounces status moves back: immune to Sing and to sticky traps\' Speed drop.', status: blocks('sleep sticky') });
  def('shielddust', { d: 'Blocks the added effects of attacks: foes\' shots can\'t burn, freeze or paralyze it.', secondary: true });
  def('flowerveil', {
    d: 'Grass-types can\'t be statused or have stats lowered.',
    status: function (p, kind) { return (IS_STATUS[kind] || kind === 'sticky') && p.mon.types.indexOf('grass') >= 0; },
  });
  def('shedskin', { d: 'Each turn, 1/3 chance to cure its status.', turn: function (p) { if (statused(p) && rnd() < 1 / 3 && cure(p)) say(p, 'Shed Skin'); } });
  def('guts', { d: 'Attack x1.5 while statused.', stat: function (p, s) { return s === 'atk' && statused(p) ? 1.5 : 1; } });
  def('marvelscale', { d: 'Defense x1.5 while statused.', stat: function (p, s) { return s === 'def' && statused(p) ? 1.5 : 1; } });
  def('quickfeet', { d: 'Speed x1.5 while statused.', stat: function (p, s) { return s === 'spe' && statused(p) ? 1.5 : 1; } });
  def('flareboost', { d: 'Special attacks x1.5 while burned.', stat: function (p, s) { return s === 'spa' && burned(p) ? 1.5 : 1; } });
  def('toxicboost', { d: 'Physical attacks x1.5 while poisoned (standing in a poison pool).', stat: function (p, s) { return s === 'atk' && poisoned(p) ? 1.5 : 1; } });
  def('poisonheal', {
    d: 'Poison heals it instead: in a poison pool it recovers 1/8 of max HP each turn.',
    status: blocks('poisondmg'),
    turn: function (p) { if (poisoned(p)) heal(p, p.maxHp / 8 * RESID); },
  });
  def('magicguard', { d: 'Only takes damage from attacks: no weather, burn, lava/pool or Life Orb damage.', chip: function () { return true; }, indirect: true });
  def('heatproof', { d: 'Fire damage x0.5 and burn damage halved.', in: function (p, h) { if (h.type === 'fire' && !h.env) h.dmg *= 0.5; }, halfBurn: true });
  def('thermalexchange', { d: 'Can\'t be burned. Being hit by a Fire attack raises Attack.', status: blocks('burn'), hit: function (p, h) { if (h.type === 'fire' && !h.env) boost(p, 'atk', 1); } });
  def('waterbubble', {
    d: 'Can\'t be burned. Fire damage x0.5. Its Water moves x2.',
    status: blocks('burn'),
    in: function (p, h) { if (h.type === 'fire' && !h.env) h.dmg *= 0.5; },
    power: typePower('water', 2),
  });
  def('clearbody whitesmoke fullmetalbody', { d: 'Foes can\'t lower its stats (immune to sticky traps\' Speed drop).', status: blocks('sticky') });
  def('mirrorarmor', { d: 'Bounces back stat drops (immune to sticky traps\' Speed drop).', status: blocks('sticky') });
  def('defiant', { d: 'When a foe lowers its stats (sticky traps), Attack +2 stages.', dropped: function (p) { boost(p, 'atk', 2); } });
  def('competitive', { d: 'When a foe lowers its stats (sticky traps), Sp. Atk +2 stages.', dropped: function (p) { boost(p, 'spa', 2); } });

  // ── Taking hits ──
  def('levitate', immuneTo('ground', 'Levitate', null, { d: 'Floats: immune to Ground attacks, and passes over pools, lava and traps like an Air Balloon.', float: true }));
  def('eelevate', immuneTo('ground', 'Eelevate', null, { d: 'Immune to Ground attacks. Knocking out a foe raises its highest stat.', ko: function (p) { boost(p, highestStat(p), 1); } }));
  def('flashfire', immuneTo('fire', 'Flash Fire', function () { S.v.flashFire = true; }, {
    d: 'Absorbs Fire attacks (and lava); after absorbing one, its Fire moves deal x1.5.',
    power: function (p, m) { return S.v.flashFire && m.type === 'fire' ? 1.5 : 1; },
  }));
  def('voltabsorb', immuneTo('electric', 'Volt Absorb', function (p) { absorb(p, 1 / 4); }, { d: 'Electric attacks heal it by 1/4 of max HP instead of hurting.' }));
  def('waterabsorb', immuneTo('water', 'Water Absorb', function (p) { absorb(p, 1 / 4); }, { d: 'Water attacks heal it by 1/4 of max HP instead of hurting.' }));
  def('eartheater', immuneTo('ground', 'Earth Eater', function (p) { absorb(p, 1 / 4); }, { d: 'Ground attacks heal it by 1/4 of max HP instead of hurting.' }));
  def('motordrive', immuneTo('electric', 'Motor Drive', function (p) { boost(p, 'spe', 1); }, { d: 'Electric attacks raise its Speed instead of hurting.' }));
  def('lightningrod', immuneTo('electric', 'Lightning Rod', function (p) { boost(p, 'spa', 1); }, { d: 'Electric attacks raise its Sp. Atk instead of hurting.' }));
  def('stormdrain', immuneTo('water', 'Storm Drain', function (p) { boost(p, 'spa', 1); }, { d: 'Water attacks raise its Sp. Atk instead of hurting.' }));
  def('sapsipper', immuneTo('grass', 'Sap Sipper', function (p) { boost(p, 'atk', 1); }, { d: 'Grass attacks raise its Attack instead of hurting.' }));
  def('wellbakedbody', immuneTo('fire', 'Well-Baked Body', function (p) { boost(p, 'def', 2); }, { d: 'Fire attacks raise its Defense by 2 stages instead of hurting.' }));
  def('thickfat', { d: 'Fire and Ice damage x0.5.', in: function (p, h) { if ((h.type === 'fire' || h.type === 'ice') && !h.env) h.dmg *= 0.5; } });
  def('fluffy', { d: 'Contact damage x0.5, but Fire damage x2.', in: function (p, h) { if (h.contact) h.dmg *= 0.5; if (h.type === 'fire' && !h.env) h.dmg *= 2; } });
  def('icescales', { d: 'Special damage (shots, beams, zones) x0.5.', in: function (p, h) { if (h.cat === 'spec' && !h.env) h.dmg *= 0.5; } });
  def('multiscale shadowshield', { d: 'At full HP, damage from attacks x0.5.', in: function (p, h) { if (!h.env && p.hp >= p.maxHp) h.dmg *= 0.5; } });
  def('filter solidrock prismarmor', { d: 'Super-effective damage x0.75.', in: function (p, h) { if (!h.env && h.eff > 1.05) h.dmg *= 0.75; } });
  def('wonderguard', { d: 'Only super-effective attacks can hurt it.', in: function (p, h) { if (h.type && !h.env && h.eff <= 1.05) { say(p, 'Wonder Guard'); return true; } } });
  def('furcoat', { d: 'Defense x2.', stat: function (p, s) { return s === 'def' ? 2 : 1; } });
  def('disguise', {
    d: 'Mimikyu\'s disguise takes the first hit for it; it loses 1/8 of max HP instead and becomes Busted.',
    start: function (p) { S.v.busted = (p.mon.form === 'busted'); },
    in: function (p, h) {
      if (S.v.busted || h.env || p.mon.dex !== 778) return false;
      S.v.busted = true;
      p.hp = Math.max(1, p.hp - p.maxHp / 8);
      p.invuln = 0.45; p.flash = 0.14;
      say(p, 'Disguise busted!');
      setForm(p, 778, 'busted');
      return true;
    },
  });
  def('iceface', {
    d: 'Eiscue\'s ice head blocks the first physical hit. It reforms when snow or hail starts.',
    start: function () { S.v.ice = true; },
    in: function (p, h) {
      if (!S.v.ice || h.cat !== 'phys' || h.env) return false;
      S.v.ice = false; p.invuln = 0.45; say(p, 'Ice Face broke!');
      return true;
    },
    tick: function (p) { var sn = snowy(); if (sn && !S.v.wasSnow && !S.v.ice) { S.v.ice = true; say(p, 'Ice Face restored'); } S.v.wasSnow = sn; },
  });
  def('bulletproof', { d: 'Immune to ball and bomb attacks (the round Fighting, Poison, Ground and Ghost shots).', shot: function (p, q) { if (!(q.vis && BULLET_PROJ[q.vis.proj])) return false; say(p, 'Bulletproof'); return true; } });
  def('damp', { d: 'Nobody can explode: self-destructing foes fizzle out.', fuse: true });
  def('intimidate', { d: 'Lowers every foe\'s Attack one stage on entry: contact damage you take x0.77.', start: function (p) { say(p, 'Intimidate'); }, in: function (p, h) { if (h.cat === 'phys' && !h.env && h.type) h.dmg *= stageMult(-1); } });
  def('stamina', { d: 'Being hit raises its Defense.', hit: function (p, h) { if (!h.env) boost(p, 'def', 1); } });
  def('weakarmor', { d: 'Physical hits lower its Defense one stage and raise Speed two.', hit: function (p, h) { if (h.cat === 'phys' && !h.env) { boost(p, 'def', -1); boost(p, 'spe', 2); } } });
  def('justified', { d: 'Being hit by a Dark attack raises its Attack.', hit: function (p, h) { if (h.type === 'dark' && !h.env) boost(p, 'atk', 1); } });
  def('rattled', { d: 'Being hit by a Bug, Ghost or Dark attack raises its Speed.', hit: function (p, h) { if ((h.type === 'bug' || h.type === 'ghost' || h.type === 'dark') && !h.env) boost(p, 'spe', 1); } });
  def('watercompaction', { d: 'Being hit by a Water attack raises its Defense by 2 stages.', hit: function (p, h) { if (h.type === 'water' && !h.env) boost(p, 'def', 2); } });
  def('berserk', { d: 'Dropping to half HP or below from a hit raises its Sp. Atk.', hit: function (p, h) { if (h.hp0 > p.maxHp / 2 && p.hp <= p.maxHp / 2 && !p.dead) boost(p, 'spa', 1); } });
  def('cottondown', {
    d: 'Being hit scatters cotton: nearby foes are slowed (Speed -1).',
    hit: function (p, h) { if (h.env) return; P().EnemyMgr.queryCircle(p.x, p.y, 360).forEach(function (e) { foeStatus(e, 'speed'); }); },
  });
  def('electromorphosis', { d: 'Being hit charges it: its next Electric move deals x2.', hit: function (p, h) { if (!h.env) { S.v.charged = true; say(p, 'Charged'); } } });
  def('toxicdebris', {
    d: 'Physical hits scatter Toxic Spikes (up to 2 layers): grounded foes that arrive later are poisoned.',
    hit: function (p, h) { if (h.cat === 'phys' && !h.env && (S.v.spikes || 0) < 2) { S.v.spikes = (S.v.spikes || 0) + 1; say(p, 'Toxic Spikes'); } },
    spawn: function (p, e) { if (S.v.spikes && !e.flying && e.types.indexOf('poison') < 0 && e.types.indexOf('steel') < 0) e.applyPoison(S.v.spikes); },
  });
  def('colorchange', { d: 'Its type changes to the type of the attack that hits it.', hit: function (p, h) { if (h.type && !h.env && (p.mon.types.length !== 1 || p.mon.types[0] !== h.type)) { setMon(p, { types: [h.type] }); say(p, 'Color Change'); } } });
  def('cursedbody', { d: 'A foe that hits it by contact may be disabled (30%): it won\'t attack for 4 turns.', contact: contactProc(0.3, function (p, e) { if (e.applyFear) e.applyFear(4 * TURN); }) });
  def('static', { d: 'Foes that touch it may be paralyzed (30%).', contact: contactProc(0.3, function (p, e) { foeStatus(e, 'para'); }) });
  def('flamebody', { d: 'Foes that touch it may be burned (30%).', contact: contactProc(0.3, function (p, e) { foeStatus(e, 'burn'); }) });
  def('poisonpoint', { d: 'Foes that touch it may be poisoned (30%).', contact: contactProc(0.3, function (p, e) { foeStatus(e, 'poison'); }) });
  def('effectspore', { d: 'Foes that touch it may be poisoned, paralyzed or put to sleep (30%).', contact: contactProc(0.3, function (p, e) { foeStatus(e, ['poison', 'para', 'sleep'][Math.floor(rnd() * 3)]); }) });
  def('cutecharm', { d: 'Foes that touch it may fall in love (30%) and stop attacking for a moment.', contact: contactProc(0.3, function (p, e) { foeStatus(e, 'flinch'); }) });
  def('roughskin ironbarbs', { d: 'Foes that touch it lose 1/8 of their max HP (15%, bosses 3.75%).', contact: function (p, e) { recoil(e, 1 / 8); } });
  def('gooey tanglinghair', { d: 'Foes that touch it have their Speed lowered.', contact: function (p, e) { foeStatus(e, 'speed'); } });
  def('aftermath', { d: 'If knocked out by contact, the attacker loses 1/4 of its max HP.', fainted: function (p, h) { if (h.contact) recoil(h.striker, 1 / 4); } });
  def('innardsout', { d: 'If knocked out by contact, the attacker loses as much HP as it had left.', fainted: function (p, h) { if (h.contact && h.striker && !h.striker.dead) h.striker.hurt(h.hp0, '#c9a07a'); } });

  // ── Dealing hits: power ──
  def('hugepower purepower', { d: 'Attack x2.', stat: function (p, s) { return s === 'atk' ? 2 : 1; } });
  def('hustle', {
    d: 'Attack x1.5, but its physical moves miss 20% of the time.',
    stat: function (p, s) { return s === 'atk' ? 1.5 : 1; },
    out: function (p, e, o) { if (o.move && rnd() < HUSTLE_MISS * catOf(o.move)) return false; },
  });
  def('technician', { d: 'Moves with 60 base power or less x1.5.', power: function (p, m, f) { return f.bp > 1 && f.bp <= 60 ? 1.5 : 1; } });
  def('ironfist', { d: 'Punching moves x1.2.', power: flagPower('punch', 1.2) });
  def('strongjaw', { d: 'Biting moves x1.5.', power: flagPower('bite', 1.5) });
  def('megalauncher', { d: 'Pulse and aura moves x1.5.', power: flagPower('pulse', 1.5) });
  def('sharpness', { d: 'Slicing moves x1.5.', power: flagPower('slicing', 1.5) });
  def('toughclaws', { d: 'Contact moves x1.3.', power: flagPower('contact', 1.3) });
  def('punkrock', { d: 'Sound moves x1.3.', power: flagPower('sound', 1.3) });
  def('skilllink', { d: 'Multi-hit moves always land all 5 hits (x1.61 versus the usual 3.1).', power: flagPower('multi25', 5 / 3.1) });
  def('parentalbond', { d: 'Every attack hits a second time for 1/4 damage (x1.25).', power: function (p, m) { return isDamaging(m) ? 1.25 : 1; } });
  def('sheerforce', {
    d: 'Moves with added effects x1.3, but those effects (burn, poison, slow, stun, flinch...) never happen.',
    power: flagPower('sec', 1.3),
    noSec: true,
  });
  def('serenegrace', { d: 'Doubles the chance of its moves\' added effects.', tick: sereneMoves });
  def('steelworker steelyspirit', { d: 'Steel moves x1.5.', power: typePower('steel', 1.5) });
  def('transistor', { d: 'Electric moves x1.3.', power: typePower('electric', 1.3) });
  def('dragonsmaw', { d: 'Dragon moves x1.5.', power: typePower('dragon', 1.5) });
  def('overgrow', { d: 'At 1/3 HP or less, Grass moves x1.5.', power: pinch('grass') });
  def('blaze', { d: 'At 1/3 HP or less, Fire moves x1.5.', power: pinch('fire') });
  def('torrent', { d: 'At 1/3 HP or less, Water moves x1.5.', power: pinch('water') });
  def('swarm', { d: 'At 1/3 HP or less, Bug moves x1.5.', power: pinch('bug') });
  function ate(type, label) {
    return {
      d: 'Normal moves become ' + label + '-type and deal x1.2.',
      tick: retype(function (m) { return baseType(m) === 'normal'; }, type),
      power: function (p, m) { return m._abAte ? 1.2 : 1; },
    };
  }
  def('aerilate', ate('flying', 'Flying'));
  def('pixilate', ate('fairy', 'Fairy'));
  def('refrigerate', ate('ice', 'Ice'));
  def('galvanize', ate('electric', 'Electric'));
  def('normalize', {
    d: 'All its moves become Normal-type and deal x1.2.',
    tick: retype(function () { return true; }, 'normal'),
    power: function (p, m) { return isDamaging(m) ? 1.2 : 1; },
  });
  def('liquidvoice', { d: 'Sound moves become Water-type.', tick: retype(function (m) { return !!(MF[m.id] || NOFLAGS).sound; }, 'water') });
  def('adaptability', { d: 'Doubles its STAB bonus.' });
  def('protean libero', {
    d: 'Becomes the type of each move it uses, so every attack gets STAB (and its weaknesses shift with it).',
    cast: function (p, m) { if (isDamaging(m) && (p.mon.types.length !== 1 || p.mon.types[0] !== m.type)) setMon(p, { types: [m.type] }); },
  });
  def('darkaura', { d: 'Dark moves deal x1.33 — including foes\' Dark attacks on it.', power: typePower('dark', 4 / 3), in: function (p, h) { if (h.type === 'dark' && !h.env) h.dmg *= 4 / 3; } });
  def('fairyaura', { d: 'Fairy moves deal x1.33 — including foes\' Fairy attacks on it.', power: typePower('fairy', 4 / 3), in: function (p, h) { if (h.type === 'fairy' && !h.env) h.dmg *= 4 / 3; } });
  def('beadsofruin', { d: 'Lowers every foe\'s Sp. Def: its special attacks deal x1.33.', power: function (p, m) { return specPower(m, 4 / 3); } });
  def('defeatist', { d: 'Attack and Sp. Atk x0.5 at half HP or less.', stat: function (p, s) { return (s === 'atk' || s === 'spa') && hpf(p) <= 0.5 ? 0.5 : 1; } });
  def('slowstart', { d: 'Attack and Speed x0.5 for the first 5 turns (10 s) of the run.', stat: function (p, s) { return (s === 'atk' || s === 'spe') && S.t < 5 * TURN ? 0.5 : 1; }, tick: function (p) { if (S.t >= 5 * TURN && !S.v.done) { S.v.done = true; say(p, 'Got its act together!'); } } });
  def('truant', { d: 'Loafs around every other turn: its moves only fire on alternate 2 s turns.', turn: function (p) { S.v.loaf = !S.v.loaf; if (S.v.loaf) say(p, 'Loafing around', '#c9d1dc'); } });
  def('klutz', {
    d: 'Can\'t use held items: any item it holds does nothing.',
    start: function (p) { if (p.item) { S.v.held = p.item; equipRaw(p, null); say(p, 'Klutz'); } },
    end: function (p) { if (S.v.held && !p.item) equipRaw(p, S.v.held); },
  });

  // ── Dealing hits: targets ──
  def('sniper', { d: 'Critical hits deal x1.5 more (x2.25 instead of x1.5).', out: function (p, e, o) { if (o.label === 'crit' || o.label === 'critsuper') o.dmg *= 1.5; } });
  def('superluck', { d: 'Critical hit chance +1 stage (+20%, like a Scope Lens).', start: function (p) { p.critChance += CRIT_STAGE; S.v.crit = true; }, end: function (p) { if (S.v.crit) p.critChance -= CRIT_STAGE; } });
  def('merciless', {
    d: 'Always lands critical hits on poisoned foes.',
    out: function (p, e, o) {
      if (!(e.poison > 0) || o.label === 'crit' || o.label === 'critsuper') return;
      o.dmg *= 1.5 + Math.min(1, Math.max(0, (p.critChance || 0) - 1));
      o.label = o.label === 'super' ? 'critsuper' : 'crit';
    },
  });
  def('tintedlens', { d: 'Not-very-effective attacks deal x2.', out: function (p, e, o) { if (o.eff < 0.95) o.dmg *= 2; } });
  def('neuroforce', { d: 'Super-effective attacks deal x1.25.', out: function (p, e, o) { if (o.eff > 1.05) o.dmg *= 1.25; } });
  def('scrappy', { d: 'Normal and Fighting moves hit Ghost-types normally.' });
  def('infiltrator', { d: 'Its attacks go straight through foes\' shields.', out: function (p, e, o) { o.bypassShield = true; } });
  def('stakeout', { d: 'Deals x2 damage to foes that arrived this turn (spawned within 2 s).', out: function (p, e, o) { if (e._abBorn != null && S.t - e._abBorn <= TURN) o.dmg *= 2; } });
  def('poisontouch', { d: 'Its contact moves may poison the target (30%).', dealt: function (p, e, id, f) { if (f.contact && rnd() < 0.3) foeStatus(e, 'poison'); } });
  def('stench', { d: 'Its attacks may make the target flinch (10%).', dealt: function (p, e) { if (rnd() < 0.1) foeStatus(e, 'flinch'); } });
  def('toxicchain', { d: 'Its attacks may badly poison the target (30%).', dealt: function (p, e) { if (rnd() < 0.3 && e.applyPoison) e.applyPoison(2); } });
  def('baddreams', {
    d: 'Sleeping (stunned) foes nearby lose 1/8 of their max HP each turn.',
    turn: function (p) {
      P().EnemyMgr.queryCircle(p.x, p.y, 520).forEach(function (e) {
        if (!e.dead && !e.remote && e.stunT > 0 && e.dotHurt) e.dotHurt(e.pctBase() * FOE_RESID / 8, '#9a7fd8', 'baddreams');
      });
    },
  });

  // ── Stat stages ──
  def('moxie chillingneigh', { d: 'Knocking out a foe raises its Attack.', ko: function (p) { boost(p, 'atk', 1); } });
  def('grimneigh', { d: 'Knocking out a foe raises its Sp. Atk.', ko: function (p) { boost(p, 'spa', 1); } });
  def('beastboost', { d: 'Knocking out a foe raises its highest stat.', ko: function (p) { boost(p, highestStat(p), 1); } });
  def('soulheart', { d: 'Whenever any foe faints, its Sp. Atk rises.', faint: function (p) { boost(p, 'spa', 1); } });
  def('battlebond', { d: 'The first time it knocks out a foe, Attack, Sp. Atk and Speed rise one stage for the whole run.', ko: function (p) { if (S.v.bonded) return; S.v.bonded = true; say(p, 'Battle Bond!'); boost(p, 'atk', 1, true); boost(p, 'spa', 1, true); boost(p, 'spe', 1, true); } });
  def('intrepidsword', { d: 'Attack +1 stage on entry, for the whole run.', start: function (p) { if (!S.v.once) { S.v.once = true; boost(p, 'atk', 1, true); } } });
  def('dauntlessshield', { d: 'Defense +1 stage on entry, for the whole run.', start: function (p) { if (!S.v.once) { S.v.once = true; boost(p, 'def', 1, true); } } });
  def('download', { d: 'On entry, raises Sp. Atk for the whole run (foes here have no separate Defense, so it picks Sp. Atk).', start: function (p) { if (!S.v.once) { S.v.once = true; boost(p, 'spa', 1, true); } } });
  def('speedboost', { d: 'Speed +1 stage at the end of every turn (2 s), up to +6, for the whole run.', turn: function (p) { if (stageOf('spe') < 6) boost(p, 'spe', 1, true); } });
  def('moody', {
    d: 'Each turn, one random stat +2 and another -1.',
    turn: function (p) {
      var up = STATS[Math.floor(rnd() * 5)], dn;
      do { dn = STATS[Math.floor(rnd() * 5)]; } while (dn === up);
      boost(p, up, 2); boost(p, dn, -1);
    },
  });
  def('simple', { d: 'Doubles its stat changes, including Swords Dance and other stat moves.' });
  def('contrary', { d: 'Inverts its stat changes: Swords Dance and other stat moves lower its stats instead.' });

  // ── Forms ──
  def('schooling', {
    d: 'Wishiwashi forms a School (huge stats) while above 1/4 HP, from level 20 of the run.',
    tick: function (p) {
      if (p.mon.dex !== 746) return;
      var A = DATA.altStats, want = p.level >= 20 && hpf(p) > 0.25 ? A.wishiwashiSchool : A.wishiwashiSolo;
      if (!sameStats(p, want)) { setBaseStats(p, want); say(p, want === A.wishiwashiSchool ? 'Schooling!' : 'School broke up'); }
    },
  });
  def('stancechange', {
    d: 'Aegislash takes Blade Forme (Atk/Sp. Atk 140) while attacking and Shield Forme (Def/Sp. Def 140) when idle for a turn.',
    tick: function (p) {
      if (p.mon.dex !== 681) return;
      var A = DATA.altStats, want = S.t - (S.v.lastAttackT == null ? -99 : S.v.lastAttackT) <= TURN ? A.aegislashBlade : A.aegislashShield;
      if (!sameStats(p, want)) setBaseStats(p, want);
    },
  });
  def('shieldsdown', {
    d: 'Minior stays in its shell (can\'t be statused) above half HP; below it breaks into Core form (Atk/Sp. Atk 100, Speed 120).',
    status: statusWhen(function (p) { return hpf(p) > 0.5; }),
    tick: function (p) {
      if (p.mon.dex !== 774) return;
      var A = DATA.altStats, want = hpf(p) > 0.5 ? A.miniorMeteor : A.miniorCore;
      if (!sameStats(p, want)) { setBaseStats(p, want); if (want === A.miniorCore) say(p, 'Shields Down!'); }
    },
  });
  def('powerconstruct', {
    d: 'Zygarde transforms into its Complete Forme the first time it drops to half HP or below.',
    tick: function (p) {
      if (p.mon.dex !== 718 || p.mon.form === 'complete' || p.megaKey || hpf(p) > 0.5 || p.dead) return;
      var bs = P().BASE_STATS && P().BASE_STATS['718_complete'];
      if (!bs) return;
      setBaseStats(p, bs, 'add');
      setForm(p, 718, 'complete');
      say(p, 'Power Construct!');
    },
  });

  // ── Berries ──
  def('cheekpouch', { d: 'Eating a Berry also heals 1/3 of max HP.', berry: function (p) { heal(p, p.maxHp / 3); } });
  def('ripen', {
    d: 'Berry effects are doubled.',
    berry: function (p, kind) {
      if (kind === 'sitrus') heal(p, p.maxHp * 0.25);
      else if (kind === 'liechi') { S.v.ripeAtk = (1 + STAGE_STEP) / (1 + STAGE_STEP / 2); p.atkMul *= S.v.ripeAtk; }
      else if (kind === 'apicot') { S.v.ripeDef = 0.3; p.defBonus = (p.defBonus || 0) + 0.3; }
    },
    tick: function (p) {
      if (!(p.heldBerryT > 0)) {
        if (S.v.ripeAtk) { p.atkMul /= S.v.ripeAtk; S.v.ripeAtk = 0; }
        if (S.v.ripeDef) { p.defBonus -= S.v.ripeDef; S.v.ripeDef = 0; }
      }
    },
  });
  def('cudchew', {
    d: 'Eats each Berry a second time one turn later.',
    berry: function (p, kind) { if (!S.v.chewing) S.v.chew = { kind: kind, at: S.t + TURN }; },
    tick: function (p) {
      var c = S.v.chew;
      if (!c || S.t < c.at) return;
      S.v.chew = null; S.v.chewing = true;
      if (c.kind === 'sitrus') heal(p, p.maxHp * 0.25);
      else if (c.kind === 'liechi' || c.kind === 'apicot') { if (p.heldBerryT > 0) p.heldBerryT = 8; }
      say(p, 'Cud Chew');
      S.v.chewing = false;
    },
  });
  def('gluttony', { d: 'Eats pinch Berries (Liechi, Apicot) at half HP instead of 1/3.', tick: function (p) { if (hpf(p) < 0.5 && !p.dead) triggerHeldBerry(p); } });
  def('unburden', { d: 'Speed x2 once its held item is used up or lost (while a Berry, Focus Sash or Eject Button recharges).', stat: function (p, s) { return s === 'spe' && itemSpent(p) ? 2 : 1; } });

  // ── Handled by the game itself ──
  def('zenmode', none('The game already gives Darmanitan its Zen Mode as a level 50 transformation.', 'Darmanitan changes to Zen Mode at half HP.'));
  def('zerotohero', none('The game already gives Palafin its Hero Form as a level 50 transformation.', 'Palafin becomes Hero Form after switching out.'));
  def('multitype', none('The game already sets Arceus\'s type from the Plate chosen on its card.', 'Arceus\'s type matches its Plate.'));
  def('rkssystem', none('The game already sets Silvally\'s type from the Memory chosen on its card.', 'Silvally\'s type matches its Memory.'));
  def('sturdy', none('The game already stops any single hit from dealing 100% of max HP, so it can never be one-shot from full.', 'Survives a one-hit KO from full HP with 1 HP.'));

  // ── No equivalent in this game ──
  var NO_SWITCH = 'There\'s no switching out in a run.';
  var NO_ORDER = 'There\'s no turn order or move priority here.';
  var NO_FOE_AB = 'Foes here have no abilities.';
  var NO_ALLY = 'It only affects allies, and allies here are other players.';
  var NO_ACC = 'Moves here never miss, so accuracy doesn\'t exist.';
  var NO_CRIT = 'Foes never land critical hits.';
  var NO_FOE_ITEM = 'Foes here hold no items.';
  var NO_DROP = 'Foes never lower that stat here.';
  var NO_OVERWORLD = 'Only works outside of battle.';
  def('regenerator', none(NO_SWITCH, 'Restores 1/3 of max HP when switching out.'));
  def('naturalcure', none(NO_SWITCH, 'Cures its status when switching out.'));
  def('emergencyexit wimpout', none(NO_SWITCH, 'Switches out at half HP.'));
  def('prankster', none(NO_ORDER, 'Status moves get +1 priority.'));
  def('galewings', none(NO_ORDER, 'Flying moves get +1 priority at full HP.'));
  def('triage', none(NO_ORDER, 'Healing moves get +3 priority.'));
  def('stall', none(NO_ORDER, 'Always moves last.'));
  def('analytic', none(NO_ORDER, 'Moves deal x1.3 when it moves last.'));
  def('queenlymajesty dazzling armortail', none('Foes have no priority moves to block.', 'Blocks foes\' priority moves.'));
  def('mummy lingeringaroma wanderingspirit', none(NO_FOE_AB, 'Changes the ability of foes that touch it.'));
  def('moldbreaker teravolt turboblaze', none(NO_FOE_AB, 'Its moves ignore the target\'s ability.'));
  def('neutralizinggas', none(NO_FOE_AB, 'Suppresses every other ability.'));
  def('trace', none(NO_FOE_AB, 'Copies a foe\'s ability.'));
  def('imposter', none('There\'s no way to transform into a foe here.', 'Transforms into the foe on entry.'));
  def('illusion', none('Foes don\'t react to what you look like.', 'Disguises itself as another party Pokémon.'));
  def('aurabreak', none('No other aura ability can be active alongside it.', 'Reverses Dark Aura and Fairy Aura.'));
  def('unaware', none('Foes never gain or lose stat stages here.', 'Ignores the foe\'s stat changes.'));
  def('telepathy friendguard healer symbiosis hospitality battery powerspot plus minus commander receiver', none(NO_ALLY, 'Helps or reacts to an ally.'));
  def('supremeoverlord', none('No party members faint during a run.', 'Moves get stronger for each fainted ally.'));
  def('victorystar compoundeyes noguard keeneye', none(NO_ACC, 'Affects accuracy.'));
  def('tangledfeet', none('It can\'t be confused here.', 'Raises evasion while confused.'));
  def('supersweetsyrup', none('Foes have no evasion to lower.', 'Lowers foes\' evasion on entry.'));
  def('battlearmor shellarmor', none(NO_CRIT, 'Blocks critical hits.'));
  def('angerpoint', none(NO_CRIT, 'Maxes Attack after taking a critical hit.'));
  def('bigpecks', none(NO_DROP, 'Its Defense can\'t be lowered.'));
  def('hypercutter', none(NO_DROP, 'Its Attack can\'t be lowered.'));
  def('owntempo oblivious innerfocus', none('Foes never confuse, taunt, infatuate, flinch or intimidate you.', 'Blocks confusion, infatuation, taunt, flinching or Intimidate.'));
  def('steadfast', none('It can\'t flinch here.', 'Raises Speed when it flinches.'));
  def('aromaveil', none('Foes never use those effects here.', 'Protects from Taunt, Encore, Disable and infatuation.'));
  def('wonderskin', none('Foes only use Sing, which hits every target in range anyway.', 'Status moves aimed at it have 50% accuracy.'));
  def('earlybird', none('Sing keeps you asleep only while you stand in it, so a shorter sleep changes nothing.', 'Wakes up twice as fast.'));
  def('synchronize', none('Foes\' shots aren\'t traced back to their owner, so the status can\'t be passed back.', 'Passes burn, poison or paralysis back to the foe.'));
  def('corrosion', none('Any foe can already be poisoned here.', 'Can poison Steel and Poison types.'));
  def('pickpocket magician stickyhold', none(NO_FOE_ITEM, 'Steals or protects held items.'));
  def('liquidooze', none('Foes never drain HP.', 'Hurts foes that drain its HP.'));
  def('perishbody', none('With no switching, the perish count would knock it out 6 s after the first hit and end the run.', 'Contact starts a 3-turn perish count on both Pokémon.'));
  def('unseenfist piercingdrill', none('Foes never use Protect (foe shields work like Substitute, which these don\'t bypass).', 'Contact moves go through Protect.'));
  def('reckless', none('No moves here have recoil.', 'Recoil moves x1.2.'));
  def('rockhead', none('No moves here have recoil (Life Orb isn\'t recoil).', 'Prevents recoil damage.'));
  def('longreach', none('Foes have no contact abilities to avoid.', 'Its moves don\'t make contact.'));
  def('propellertail stalwart', none('Nothing redirects moves here.', 'Its moves can\'t be redirected.'));
  def('rivalry', none('Pokémon have no gender here.', 'Stronger against the same gender, weaker against the opposite.'));
  def('dancer', none('Foes don\'t use dance moves.', 'Copies dance moves used by others.'));
  def('gulpmissile', none('Surf and Dive don\'t exist here.', 'Catches prey after Surf or Dive.'));
  def('hungerswitch', none('Aura Wheel doesn\'t exist here.', 'Switches between Full Belly and Hangry Mode each turn.'));
  def('terashift', none('Terastallization doesn\'t exist here.', 'Terapagos transforms into its Terastal Form on entry.'));
  def('pressure unnerve', none('Foes have no PP or Berries.', 'Makes foes use more PP / stops them eating Berries.'));
  def('frisk forewarn anticipation', none('There\'s nothing hidden about foes to reveal.', 'Reveals information about foes.'));
  def('magnetpull arenatrap shadowtag suctioncups', none('Foes can\'t switch out or flee by choice.', 'Traps foes or prevents being forced out.'));
  def('heavymetal lightmetal', none('Weight doesn\'t matter here.', 'Changes its weight.'));
  def('illuminate honeygather runaway pickup ballfetch', none(NO_OVERWORLD, 'An exploration ability.'));

  /* ── Hook installation ─────────────────────────────────────────────────── */
  var equipRaw = null;

  function abilityFor(p) {
    if (S.forced) return S.forced;
    if (p.megaKey && DATA.megas[p.megaKey]) return DATA.megas[p.megaKey];
    var mon = p.mon || {};
    var slots = (mon.skin && DATA.forms[mon.skin]) || DATA.species[mon.dex] || DATA.species[p.dex];
    if (!slots) return null;
    return slots[SLOT_IDX[S.slot] || 0] || slots[0];
  }
  function switchAbility(p, id, quiet) {
    if (S.def && S.def.end) S.def.end(p);
    undoMoves();
    var keep = { freezeUntil: S.v.freezeUntil, inPoison: S.v.inPoison, hadItem: S.v.hadItem };
    S.ab = id; S.def = AB[id] || null; S.v = keep;
    if (!S.def) { recalc(p); return; }
    if (!quiet && !S.def.none) say(p, (DATA.names[id] || id));
    if (S.def.start) S.def.start(p);
    recalc(p);
  }
  function startRun(p) {
    S.p = p; S.t = 0; S.turnT = 0; S.said = {}; S.v = {}; S.ab = null; S.def = null;
    S.striker = null; S.lastHit = null; S.lastSlowT = 0; S.berrySeen = null;
    resetStages();
    var sv = save();
    var dex = p.dex;
    if (sv) ensureAbilities(sv);
    S.baseDex = dex;
    S.slot = chosenSlot(dex);
    var id = abilityFor(p);
    switchAbility(p, id, true);
    if (id) {
      var nm = DATA.names[id] || id;
      say(p, nm, S.def && S.def.none ? '#c9d1dc' : ABILITY_COLOR);
      console.log('[Abilities] ' + (p.mon && p.mon.name) + ' #' + dex + ' slot ' + S.slot + ': ' + nm + (S.def && S.def.none ? ' (no effect here)' : ''));
    }
  }

  function preUpdate(p, dt) {
    var d = S.def;
    // Sleep immunity (Sing): use the game's own "just woke up" grace window.
    if (statusBlocked(p, 'sleep', false)) p.songWake = performance.now();
    // Burn damage: Magic Guard skips it, Heatproof halves it.
    if (p.burnT > 0 && (p.burnTick || 0) + dt >= 0.5) {
      if (d.indirect) p.burnTick = 0;
      else if (d.halfBurn) { S.v.burnSkip = !S.v.burnSkip; if (S.v.burnSkip) p.burnTick = 0; }
    }
    // A sticky trap set slowT outside of triStatus: that's a foe lowering its Speed.
    if (p.slowT > S.lastSlowT + 0.05 && !(S.v.freezeUntil > S.t)) {
      if (statusBlocked(p, 'sticky', false) || (S.ab === 'flowerveil' && p.mon.types.indexOf('grass') >= 0)) { p.slowT = S.lastSlowT; say(p, DATA.names[S.ab] || 'Blocked'); }
      else if (d.dropped) d.dropped(p);
    }
    // Poison pools are this game's poisoning.
    var W = P().World;
    var lk = p.inLiquid && W && W.liquidKind ? W.liquidKind() : null;
    var le = lk === 'poison' && W.liquidEffect(p.mon.types);
    S.v.inPoison = !!(le && le.dmg) && !p.floating && !p.cleansed && !statusBlocked(p, 'poison', false);
  }
  function postUpdate(p, dt) {
    S.t += dt;
    S.lastSlowT = p.slowT || 0;
    var id = abilityFor(p);
    if (id !== S.ab) switchAbility(p, id);
    var d = S.def;
    if (!d) return;
    if (p.item) S.v.hadItem = true;
    STATS.forEach(function (s) {
      var st = S.stages[s];
      if (st.n && (st.t -= dt) <= 0) { st.n = 0; st.t = 0; }
    });
    S.turnT += dt;
    while (S.turnT >= TURN) { S.turnT -= TURN; if (d.turn && !p.dead) d.turn(p); }
    if (d.tick) d.tick(p, dt);
    berryWatch(p);
    recalc(p);
  }
  // Held berries recharge instead of being used up; their timestamps change when eaten.
  function berryWatch(p) {
    var b = S.berrySeen;
    if (b && S.def && S.def.berry) {
      if (p.sitrusAt && p.sitrusAt !== b.s) S.def.berry(p, 'sitrus');
      if (p.heldBerryAt && p.heldBerryAt !== b.h) S.def.berry(p, p.heldBerryK === 'atk' ? 'liechi' : 'apicot');
    }
    S.berrySeen = { s: p.sitrusAt, h: p.heldBerryAt };
  }

  function statusBlocked(p, kind, secondary) {
    var d = S.def;
    if (!d) return false;
    if (secondary && d.secondary) return true;
    if (d.status && d.status(p, kind)) return true;
    return false;
  }

  function install() {
    var G = P(), PP = G.Player.prototype, EP = G.Enemy.prototype;
    var isMe = function (o) { return o === S.p && !!S.def; };

    // Player.update — run lifecycle, turns, timers.
    var _upd = PP.update;
    PP.update = function (dt) {
      if (this.remote || this !== G.Game.player) return _upd.apply(this, arguments);
      if (S.p !== this) startRun(this);
      S.frame++;
      var live = !this.dead && S.def;
      if (live) preUpdate(this, dt);
      S.inUpdate = true;
      var r;
      try { r = _upd.apply(this, arguments); } finally { S.inUpdate = false; }
      if (!this.dead) postUpdate(this, dt);
      return r;
    };

    // Stats: same multiplier slot natures and Megas use.
    var _mk = PP.mk;
    PP.mk = function (s) { var k = _mk.call(this, s); return this === S.p && S.statK[s] ? k * S.statK[s] : k; };

    // Simple / Contrary act on stat moves (Swords Dance etc. are passive stat changes here).
    var STAT_SET = { atk: 1, spa: 1, def: 1, sdf: 1, spe: 1 };
    var _pas = PP.pas;
    PP.pas = function (k) {
      var v = _pas.call(this, k);
      if (v && this === S.p && STAT_SET[k]) { if (S.ab === 'simple') return v * 2; if (S.ab === 'contrary') return -v; }
      return v;
    };

    // Move power.
    var _dmgK = PP.dmgK;
    PP.dmgK = function (m) {
      var k = _dmgK.call(this, m);
      if (!isMe(this) || S.ghost || !m) return k;
      S.dmgkMove = m; S.dmgkFrame = S.frame;
      var d = S.def, f = MF[m.id] || NOFLAGS, x = 1;
      if (d.power) x *= d.power(this, m, f) || 1;
      if (S.v.chargeMove === m) x *= 2;
      return k * x;
    };

    var _stab = PP.stabOf;
    PP.stabOf = function (m) { var v = _stab.call(this, m); return this === S.p && S.ab === 'adaptability' ? v * 2 : v; };

    // Levitate floats exactly like the game's Air Balloon did.
    var fd = Object.getOwnPropertyDescriptor(PP, 'floating');
    if (fd && fd.get) {
      var _float = fd.get;
      Object.defineProperty(PP, 'floating', { configurable: true, get: function () { return _float.call(this) || (this === S.p && !!S.def && !!S.def.float); } });
    }

    // Casting: Protean, Charge, Magic Guard vs Life Orb recoil, Stance Change timing.
    var _cast = PP.cast;
    PP.cast = function (m) {
      if (!isMe(this) || S.ghost) return _cast.apply(this, arguments);
      var d = S.def, orb;
      if (d.cast) d.cast(this, m);
      if (S.v.charged && m && m.type === 'electric' && isDamaging(m)) { S.v.charged = false; S.v.chargeMove = m; }
      if (d.indirect && this.item === 'lifeorb' && !(this.orbOff > 0)) { orb = this.orbOff; this.orbOff = 1e-6; }
      var r = _cast.apply(this, arguments);
      if (orb !== undefined) this.orbOff = orb;
      if (isDamaging(m)) S.v.lastAttackT = S.t;
      return r;
    };

    // Taking statuses from foes' shots.
    var _tri = PP.triStatus;
    PP.triStatus = function (n) {
      if (!isMe(this)) return _tri.apply(this, arguments);
      var kind = n === 1 ? 'burn' : n === 2 ? 'freeze' : 'para';
      if (statusBlocked(this, kind, true)) { say(this, DATA.names[S.ab] || 'Blocked'); return; }
      var r = _tri.apply(this, arguments);
      if (kind === 'freeze' && this.slowT > 0) { S.v.freezeUntil = S.t + this.slowT; S.lastSlowT = this.slowT; }
      return r;
    };

    // Taking hits.
    var _hurt = PP.hurt;
    PP.hurt = function (dmg, type, pure, cat) {
      if (!isMe(this)) return _hurt.apply(this, arguments);
      var striker = S.striker; S.striker = null;
      if (this.invuln > 0 || this.reviveShield > 0 || this.shadeInv > 0 || this.dead || this.god) return _hurt.apply(this, arguments);
      var d = S.def, env = S.inUpdate;
      cat = cat || 'spec';
      var h = { dmg: dmg, type: type || null, pure: !!pure, cat: cat, contact: !!striker && cat === 'phys', striker: striker, env: env, eff: 1, hp0: this.hp };
      if (env) {
        // Lava / poison / spark pools hurt from inside Player.update: indirect damage,
        // blocked by Magic Guard, poison immunity, or a plain immunity to the pool's type.
        if (d.indirect) return;
        var lk = G.World.liquidKind && G.World.liquidKind();
        if (lk === 'poison' && (statusBlocked(this, 'poison', false) || statusBlocked(this, 'poisondmg', false))) return;
        if (LIQUID_TYPE[lk] && d.immune === LIQUID_TYPE[lk]) return;
      } else if (h.type) {
        h.eff = G.Types.mult(h.type, this.mon.types);
      }
      if (!env && d.in && d.in(this, h) === true) return;
      var lives0 = this.lives;
      _hurt.call(this, h.dmg, type, pure, cat);
      if (d.hit) d.hit(this, h);
      if (h.contact && d.contact && striker && !striker.dead) d.contact(this, striker, h);
      if ((this.dead || this.lives < lives0) && d.fainted) d.fainted(this, h);
    };

    // Held items (Klutz).
    var _equip = PP.equip;
    equipRaw = function (p, id) { return _equip.call(p, id); };
    PP.equip = function (id) {
      if (this === S.p && S.ab === 'klutz' && id) { S.v.held = id; say(this, 'Klutz'); return _equip.call(this, null); }
      return _equip.apply(this, arguments);
    };

    // Berries eaten from the ground (Petaya, Apicot) — Ripen, Cheek Pouch, Cud Chew.
    var _eat = PP.eatBerry;
    PP.eatBerry = function (kind) {
      var r = _eat.apply(this, arguments);
      if (isMe(this) && S.def.berry) S.def.berry(this, kind === 'apicot' ? 'apicot-pick' : kind);
      return r;
    };

    // Contact: the game calls strike(player) right before hurt(..., 'phys').
    var _strike = EP.strike;
    EP.strike = function (target) { if (target === S.p) S.striker = this; return _strike.apply(this, arguments); };

    // Dealing hits (label = 'crit' | 'critsuper' | 'super' | 'weak' | null).
    var _ehurt = EP.hurt;
    EP.hurt = function (dmg, color, vx, vy, knock, label) {
      var rec = S.outRec; S.outRec = null;
      var mv = S.dmgkFrame === S.frame ? S.dmgkMove : null; S.dmgkMove = null;
      if (this.dead || !S.def || arguments.length < 6 || S.ghost || (G.Coop && G.Coop.hitFrom)) return _ehurt.apply(this, arguments);
      var d = S.def;
      var o = { dmg: dmg, label: label, eff: rec && rec.def === this.types ? rec.val : 1, move: mv, bypassShield: false };
      S.hitSeq++;
      if (d.out && d.out(S.p, this, o) === false) {
        this._abMiss = S.hitSeq; S.missFrame = S.frame;
        sayOn(this, 'Miss');
        S.lastHit = null;
        return;
      }
      S.lastHit = { e: this };
      var sh = this.shield;
      if (o.bypassShield && sh > 0) this.shield = 0;
      _ehurt.call(this, o.dmg, color, vx, vy, knock, o.label);
      if (o.bypassShield && sh > 0) this.shield = sh;
    };
    // A missed hit (Hustle) or a Sheer Force hit applies no added effects. The game applies
    // them right after Stats.dmg and before the next hit, so the hit sequence identifies them.
    ['applyBurn', 'applyPoison', 'applySlow', 'applyStun', 'applyFear'].forEach(function (k) {
      var f = EP[k];
      if (!f) return;
      EP[k] = function () {
        if (S.missFrame === S.frame && this._abMiss === S.hitSeq) return;
        if (S.noSecFrame === S.frame && this._abNoSec === S.hitSeq) return;
        return f.apply(this, arguments);
      };
    });

    // Knockouts.
    var _die = EP.die;
    EP.die = function () {
      var was = this.dead;
      var r = _die.apply(this, arguments);
      if (!was && this.dead && S.def && S.p && !S.p.dead) {
        if (S.def.faint) S.def.faint(S.p, this);
        if (S.def.ko && !this.dummy && this.lastBy === G.Stats.selfId()) S.def.ko(S.p, this);
      }
      return r;
    };

    // Damp.
    var _fuse = EP.startFuse;
    if (_fuse) EP.startFuse = function () {
      if (S.def && S.def.fuse && S.p && !S.p.dead) { if (!this._abDamp) { this._abDamp = true; sayOn(this, 'Damp', ABILITY_COLOR); } return; }
      return _fuse.apply(this, arguments);
    };

    // New foes (Stakeout, Toxic Debris).
    var _add = G.EnemyMgr.add;
    G.EnemyMgr.add = function (e) {
      var r = _add.apply(this, arguments);
      if (e) { e._abBorn = S.t; if (S.def && S.def.spawn && S.p) S.def.spawn(S.p, e); }
      return r;
    };

    // After a move hit lands: move id is known here (on-hit effects like Poison Touch).
    var _sdmg = G.Stats.dmg;
    G.Stats.dmg = function (owner, key) {
      var r = _sdmg.apply(this, arguments);
      var hit = S.lastHit; S.lastHit = null;
      if (hit && owner === S.p && S.def && G.Moves.BY_ID[key]) {
        var f = MF[key] || NOFLAGS;
        if (S.def.noSec && f.sec) { hit.e._abNoSec = S.hitSeq; S.noSecFrame = S.frame; }
        if (S.def.dealt && !hit.e.dead) S.def.dealt(S.p, hit.e, key, f);
      }
      return r;
    };

    // Type matchups: Scrappy, and remember the last outgoing matchup for Tinted Lens etc.
    var _tm = G.Types.mult;
    G.Types.mult = function (atk, defTypes) {
      var v = _tm.apply(this, arguments);
      if (!S.p || !defTypes || defTypes === (S.p.mon && S.p.mon.types)) return v;
      if (S.ab === 'scrappy' && (atk === 'normal' || atk === 'fighting') && defTypes.indexOf('ghost') >= 0)
        v = _tm.call(this, atk, defTypes.filter(function (t) { return t !== 'ghost'; }));
      S.outRec = { def: defTypes, val: v };
      return v;
    };

    // Weather: Cloud Nine, chip immunities.
    var Wx = G.Weather;
    var negated = function () { var c = cloudNine() && Wx.current; return !!(c && WEATHERS[c.kind]); };
    var _wm = Wx.mult;
    Wx.mult = function () { return negated() ? 1 : _wm.apply(this, arguments); };
    var _ws = Wx.speedFor;
    Wx.speedFor = function () { return negated() ? 1 : _ws.apply(this, arguments); };
    // Guests: a host repeat of the weather we already have would restart its fade-in; skip it.
    var _wev = Wx.onEvent;
    if (_wev) Wx.onEvent = function (msg) {
      var c = Wx.current;
      if (msg && msg[1] && c && c.kind === msg[1]) return;
      return _wev.apply(this, arguments);
    };
    var _wu = Wx.update;
    Wx.update = function (dt, t, player) {
      if (player && player === S.p && S.def) {
        var c = Wx.current;
        if (c && WEATHERS[c.kind] && (cloudNine() || (S.def.chip && S.def.chip(c.kind)))) player = null;
      }
      return _wu.call(this, dt, t, player);
    };

    // Combat: Truant loafing, Charge consumption, coop ghost casts.
    var C = G.Combat;
    var _ct = C.tick;
    C.tick = function (dt, p) {
      if (p === S.p && S.ab === 'truant' && S.v.loaf) return;
      var r = _ct.apply(this, arguments);
      S.v.chargeMove = null;
      S.dmgkMove = null; // only direct hits made during the cast may use it
      return r;
    };
    ['ghostCast', 'ghostOrbit'].forEach(function (k) {
      var f = C[k];
      if (f) C[k] = function () { S.ghost++; try { return f.apply(this, arguments); } finally { S.ghost--; } };
    });
    // Foes' shots: Bulletproof / Wind Rider. Same overlap test the game uses, before it does.
    var _cr = C.resolve;
    C.resolve = function (dt, p) {
      if (p === S.p && S.def && S.def.shot && !p.dead) {
        var list = G.Projectiles.all();
        for (var i = list.length - 1; i >= 0; i--) {
          var q = list[i];
          if (q.friendly) continue;
          var rr = q.r + p.r;
          if (G.U.dist2(q.x, q.y, p.x, p.y) >= rr * rr) continue;
          if (S.def.shot(p, q)) { G.FX.burst(q.x, q.y - G.LIFT, q.color, 6, 90); list.splice(i, 1); }
        }
      }
      return _cr.apply(this, arguments);
    };

    // Hustle on projectile moves: a missed shot passes through harmlessly (the game's "ghost" shots).
    var _spawn = G.Projectiles.spawn;
    G.Projectiles.spawn = function (o) {
      var q = _spawn.apply(this, arguments);
      if (o && o.owner === S.p) S.dmgkMove = null; // that dmgK was for this shot, not a direct hit
      if (S.ab === 'hustle' && o && o.owner === S.p && o.mid && !o.ghost && !o.orb && !S.ghost) {
        var c = G.Moves.CAT[o.mid] || 0;
        if (c > 0 && rnd() < HUSTLE_MISS * c) (q || o).ghost = true;
      }
      return q;
    };

    // Unlocking abilities like natures: every pull rolls one, duplicates unlock missing ones.
    var N = G.Natures;
    if (N) {
      var _roll = N.rollNew;
      N.rollNew = function (sv, dex) {
        var r = _roll.apply(this, arguments);
        try {
          var had = ownedSlots(sv, dex).length;
          var k = rollAbility(sv, dex, had === 0);
          if (had === 0) starterGrant(sv, dex);
          else if (k) queueUnlock(dex, k);
        } catch (e) { console.warn('[Abilities] roll failed', e); }
        return r;
      };
      var _ens = N.ensure;
      N.ensure = function (sv) { var r = _ens.apply(this, arguments); try { ensureAbilities(sv); } catch (e) { console.warn('[Abilities] ensure failed', e); } return r; };
    }

    console.log('[Abilities] hooks installed');
  }

  /* ── Unlocks and choices (stored in the save next to natures) ──────────── */
  function save() { var G = P(); return G && G.DB && G.DB.save; }
  function slotsFor(dex, skin) { return (skin && DATA.forms[skin]) || DATA.species[dex] || null; }
  function ownedSlots(sv, dex) { return (sv && sv.abilities && sv.abilities[dex]) || []; }
  function rollAbility(sv, dex, normalOnly) {
    var sl = DATA.species[dex];
    if (!sv || !sl) return null;
    sv.abilities = sv.abilities || {};
    var own = sv.abilities[dex] || [];
    var ownIds = own.map(function (k) { return sl[SLOT_IDX[k]]; });
    var cand = SLOT_KEYS.filter(function (k, i) {
      return sl[i] && own.indexOf(k) < 0 && ownIds.indexOf(sl[i]) < 0 && !(normalOnly && (k === 'H' || k === 'S'));
    });
    if (!cand.length) return null;
    var k = cand[Math.floor(Math.random() * cand.length)];
    sv.abilities[dex] = own.concat(k);
    sv.ability = sv.ability || {};
    if (!sv.ability[dex]) sv.ability[dex] = k;
    return k;
  }
  // Starter lines come with their hidden ability unlocked and selected.
  var STARTER_LINE = null;
  function starterLine() {
    if (STARTER_LINE) return STARTER_LINE;
    var G = P(), set = {};
    if (!G || !G.STARTERS || !G.EVOS) return {};
    var walk = function (d) { if (set[d]) return; set[d] = 1; (G.EVOS[d] || []).forEach(function (e) { walk(e[0]); }); };
    G.STARTERS.forEach(function (s) { walk(s.dex); });
    return (STARTER_LINE = set);
  }
  function starterGrant(sv, dex) {
    var sl = DATA.species[dex];
    if (!starterLine()[dex] || !sl || !sl[2]) return;
    var own = sv.abilities[dex] || [];
    if (own.indexOf('H') < 0) sv.abilities[dex] = own.concat('H');
    sv.ability[dex] = 'H';
  }
  function ensureAbilities(sv) {
    if (!sv || !sv.owned) return;
    sv.abilities = sv.abilities || {};
    sv.ability = sv.ability || {};
    Object.keys(sv.owned).forEach(function (dex) {
      if (!DATA.species[dex] || ownedSlots(sv, dex).length) return;
      // Existing saves: every nature unlocked so far stands for one copy pulled, so it gets a roll too.
      var rolls = Math.max(1, ((sv.natures && sv.natures[dex]) || []).length);
      rollAbility(sv, dex, true);
      for (var i = 1; i < rolls; i++) rollAbility(sv, dex, false);
      starterGrant(sv, dex);
    });
  }
  function chosenSlot(dex) {
    var sv = save(), own = ownedSlots(sv, dex);
    var k = sv && sv.ability && sv.ability[dex];
    if (k && own.indexOf(k) >= 0) return k;
    return own[0] || '0';
  }
  function choose(dex, k) {
    var sv = save();
    if (!sv || ownedSlots(sv, dex).indexOf(k) < 0) return false;
    sv.ability = sv.ability || {};
    sv.ability[dex] = k;
    if (P().DB.commit) P().DB.commit(true);
    return true;
  }
  var unlockQ = [], unlockTimer = null;
  function queueUnlock(dex, k) {
    var sl = DATA.species[dex], G = P();
    if (!sl) return;
    var mon = G.DEX_BY && G.DEX_BY[dex];
    unlockQ.push((mon ? mon.name : '#' + dex) + ': ' + (DATA.names[sl[SLOT_IDX[k]]] || sl[SLOT_IDX[k]]) + (k === 'H' ? ' (hidden)' : ''));
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(function () {
      if (G.UI && G.UI.toast) G.UI.toast('New abilities unlocked — ' + unlockQ.join(' · '), 4200);
      unlockQ = [];
    }, 400);
  }

  /* ── Public API (used by ability-display.js) ───────────────────────────── */
  function info(id) {
    var d = AB[id];
    return { id: id, name: DATA.names[id] || id, desc: d ? d.d : '', none: d ? d.none || null : 'Not implemented.' };
  }
  window.PS_ABILITIES = {
    DATA: DATA,
    CATALOG: AB,
    SLOT_KEYS: SLOT_KEYS,
    info: info,
    slots: function (dex, skin) { return slotsFor(dex, skin); },
    owned: function (dex) { return ownedSlots(save(), dex).slice(); },
    chosen: chosenSlot,
    choose: choose,
    ensure: function () { var sv = save(); if (sv) ensureAbilities(sv); },
    active: function () { return S.p && S.ab ? Object.assign(info(S.ab), { stages: STATS.map(function (s) { return [s, stageOf(s)]; }).filter(function (x) { return x[1]; }) }) : null; },
    // Testing aid (console): PS_ABILITIES.debug.force('hugepower') swaps the running ability; force(null) restores.
    debug: {
      state: S,
      force: function (id) { S.forced = id || null; if (S.p) switchAbility(S.p, abilityFor(S.p)); },
      stage: stageOf,
    },
  };

  var waitId = setInterval(function () {
    var G = P();
    if (!G || !G.Player || !G.Enemy || !G.Combat || !G.Weather || !G.Types || !G.Stats || !G.EnemyMgr || !G.Projectiles) return;
    clearInterval(waitId);
    try { install(); } catch (e) { console.error('[Abilities] install failed', e); }
    var sv = save();
    if (sv) ensureAbilities(sv);
  }, 50);
})();
