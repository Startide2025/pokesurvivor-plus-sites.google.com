// PS Mod: Ability System
// Requires window.__PS to be exposed (patched in js/app.min.js).
// Applies canonical Pokémon abilities as stat modifiers, timers, and contact effects.
//
// MULTIPLAYER: window.__PS.Game.player is always the LOCAL player in co-op.
//   Abilities only mutate that player's stats — correct behavior.
//   Enemies (EnemyMgr) are shared; contact effects apply globally which is fine.
//
// MOBILE: No UI injected by this mod; it's fully passive / polling-based.
(function () {
  'use strict';

  // ── DEX → ABILITY MAP ───────────────────────────────────────────────────
  var DEX_ABILITY = {1:"overgrow",2:"overgrow",3:"overgrow",4:"blaze",5:"blaze",6:"blaze",7:"torrent",9:"torrent",10:"swarm",11:"swarm",12:"swarm",13:"swarm",14:"swarm",15:"swarm",23:"poisonpoint",24:"poisonpoint",25:"static",26:"lightningrod",29:"hustle",30:"hustle",31:"sheerforce",32:"hustle",33:"hustle",34:"sheerforce",36:"magicguard",38:"flashfire",41:"poisonpoint",42:"poisonpoint",43:"chlorophyll",44:"chlorophyll",45:"chlorophyll",46:"effectspore",47:"effectspore",48:"swarm",49:"swarm",54:"swiftswim",55:"swiftswim",59:"flashfire",60:"swiftswim",61:"swiftswim",62:"swiftswim",65:"magicguard",68:"noguard",69:"chlorophyll",70:"chlorophyll",71:"chlorophyll",72:"icebody",73:"icebody",78:"flashfire",79:"regenerator",80:"regenerator",88:"poisonpoint",89:"poisonpoint",91:"skilllink",92:"levitate",93:"levitate",94:"cursedbody",100:"static",101:"static",105:"levitate",109:"levitate",110:"levitate",112:"filter",113:"naturalcure",114:"regenerator",116:"swiftswim",117:"swiftswim",118:"swiftswim",119:"swiftswim",120:"naturalcure",121:"naturalcure",122:"filter",124:"dryskin",125:"static",126:"flamebody",127:"moxie",130:"moxie",131:"waterabsorb",133:"adaptability",134:"waterabsorb",135:"voltabsorb",136:"flashfire",145:"static",149:"multiscale",151:"technician",152:"overgrow",153:"overgrow",154:"overgrow",155:"blaze",156:"blaze",157:"blaze",158:"torrent",159:"torrent",160:"torrent",165:"swarm",166:"swarm",169:"levitate",170:"voltabsorb",171:"voltabsorb",175:"hustle",176:"hustle",180:"static",181:"static",183:"hugepower",184:"hugepower",187:"chlorophyll",188:"chlorophyll",189:"chlorophyll",193:"swarm",194:"swarm",196:"adaptability",197:"adaptability",199:"regenerator",200:"levitate",204:"swarm",205:"swarm",207:"poisonheal",212:"technician",214:"moxie",218:"flamebody",219:"flamebody",223:"moody",224:"sniper",229:"flashfire",230:"swiftswim",235:"technician",237:"technician",239:"static",240:"flamebody",241:"sapsipper",245:"swiftswim",246:"strongjaw",247:"strongjaw",248:"strongjaw",249:"multiscale",250:"regenerator",251:"naturalcure",252:"overgrow",253:"overgrow",254:"overgrow",255:"speedboost",256:"speedboost",257:"speedboost",258:"torrent",259:"torrent",260:"torrent",262:"moxie",265:"swarm",266:"swarm",267:"swarm",268:"swarm",269:"swarm",272:"icebody",273:"chlorophyll",274:"chlorophyll",275:"chlorophyll",283:"swarm",284:"flamebody",286:"poisonheal",289:"truant",290:"swarm",291:"speedboost",292:"wonderguard",307:"hugepower",308:"hugepower",309:"static",310:"static",313:"swarm",314:"swarm",315:"chlorophyll",316:"poisonpoint",317:"poisonpoint",319:"speedboost",323:"filter",327:"contrary",329:"levitate",330:"levitate",336:"poisonpoint",337:"levitate",338:"levitate",340:"swiftswim",341:"adaptability",342:"adaptability",347:"swarm",348:"battlearmor",350:"marvelscale",353:"infiltrator",354:"infiltrator",355:"levitate",356:"levitate",357:"chlorophyll",358:"regenerator",361:"moody",362:"moody",363:"swiftswim",364:"swiftswim",365:"icebody",369:"swiftswim",373:"moxie",376:"toughclaws",378:"icebody",380:"levitate",381:"levitate",382:"swiftswim",387:"overgrow",388:"overgrow",389:"overgrow",390:"blaze",391:"blaze",392:"blaze",393:"torrent",394:"torrent",395:"torrent",403:"static",404:"static",405:"static",407:"technician",414:"swarm",415:"swarm",416:"swarm",417:"static",418:"swiftswim",419:"swiftswim",420:"chlorophyll",421:"chlorophyll",422:"stormdrain",423:"stormdrain",424:"technician",430:"contrary",432:"truant",436:"flamebody",437:"flamebody",440:"regenerator",443:"roughskin",444:"roughskin",445:"roughskin",451:"swarm",452:"sniper",453:"poisonpoint",454:"poisonpoint",455:"chlorophyll",456:"swiftswim",457:"swiftswim",462:"levitate",465:"regenerator",467:"flamebody",468:"hustle",470:"adaptability",471:"adaptability",472:"poisonheal",477:"noguard",479:"cursedbody",480:"levitate",481:"levitate",482:"levitate",483:"levitate",484:"levitate",485:"flamebody",486:"slowstart",492:"naturalcure",495:"overgrow",496:"overgrow",497:"contrary",498:"blaze",499:"blaze",500:"blaze",501:"torrent",502:"torrent",503:"torrent",532:"sheerforce",533:"sheerforce",534:"sheerforce",540:"swarm",541:"swarm",542:"swarm",543:"poisonpoint",544:"poisonpoint",545:"poisonpoint",553:"moxie",555:"zenmode",560:"moxie",562:"strongjaw",566:"moxie",567:"moxie",568:"poisonpoint",569:"poisonpoint",572:"skilllink",573:"skilllink",580:"swiftswim",581:"swiftswim",586:"sapsipper",587:"static",590:"effectspore",591:"effectspore",594:"swiftswim",595:"swarm",596:"swarm",609:"infiltrator",616:"swarm",617:"swarm",618:"static",621:"sheerforce",626:"sapsipper",628:"sheerforce",632:"hustle",633:"hustle",634:"hustle",635:"hustle",636:"flamebody",637:"swarm",645:"sheerforce",650:"overgrow",651:"overgrow",652:"overgrow",653:"blaze",654:"blaze",655:"blaze",656:"torrent",657:"torrent",658:"protean",664:"swarm",665:"poisonpoint",666:"swarm",676:"furcoat",690:"poisonpoint",691:"poisonpoint",692:"sniper",693:"megalauncher",696:"strongjaw",697:"strongjaw",700:"adaptability",702:"static",715:"infiltrator",718:"powerconstruct",721:"flamebody",722:"overgrow",723:"overgrow",724:"overgrow",725:"blaze",726:"blaze",727:"blaze",728:"torrent",729:"torrent",730:"liquidvoice",737:"static",738:"static",746:"schooling",749:"stamina",750:"stamina",778:"disguise",780:"strongjaw",793:"beastboost",794:"beastboost",795:"beastboost",796:"beastboost",797:"beastboost",798:"beastboost",799:"beastboost",803:"beastboost",804:"beastboost",805:"beastboost",806:"beastboost",810:"overgrow",811:"overgrow",812:"overgrow",813:"blaze",814:"blaze",815:"protean",816:"torrent",817:"torrent",818:"torrent",840:"swarm",841:"swarm",842:"swarm",849:"punkrock",850:"swarm",851:"swarm",854:"cursedbody",855:"cursedbody",857:"cursedbody",858:"cursedbody",866:"adaptability",887:"toughclaws",888:"dauntlessshield",889:"intrepidsword",896:"chillingneigh",897:"grimneigh",898:"grimneigh",906:"overgrow",907:"overgrow",908:"overgrow",909:"blaze",910:"blaze",911:"blaze",916:"torrent",917:"torrent",918:"torrent",1005:"protosynthesis",1006:"protosynthesis",1007:"protosynthesis",1008:"protosynthesis",1009:"protosynthesis",1010:"protosynthesis",1011:"protosynthesis",1012:"protosynthesis",1016:"quarkdrive",1017:"quarkdrive",1018:"quarkdrive",1019:"quarkdrive",1020:"quarkdrive",1021:"quarkdrive",1024:"quarkdrive",1025:"quarkdrive"};

  // ── STATE ────────────────────────────────────────────────────────────────
  var state = {
    running: false, ability: null, player: null, dex: null,
    lastKills: 0, lastHp: 0, lastX: 0, lastY: 0,
    lastMoveTime: 0, runStart: 0,
    moxieBoost: 0, beastBoostKills: 0, grimNeighBoost: 0, moxieAtk: 1,
    speedBoosted: false, speedBurstEnd: 0,
    moodyTimer: 0, moodyLast: null, moodyLastStat: null,
    zenModeActive: false, zenModeApplied: false,
    powerConstructFired: false, schoolingActive: null,
    disguiseUp: true, disguiseCooldown: 0, disguiseNextAllow: 0,
    lastInvuln: 0, regenTimer: 0,
    slowStartApplied: false, slowStartRamp: null,
    baseline: null,
    pqApplied: false, pqStat: null, pqLowStat: null,
    _starterBoosted: false, _multiscaleActive: false,
    _contactCd: {}, _lastTick: 0
  };

  // ── HELPERS ──────────────────────────────────────────────────────────────
  function PS()     { return window.__PS; }
  function game()   { var p = PS(); return p && p.Game; }
  function player() { var g = game(); return g && g.player; }
  function now()    { return performance.now() / 1000; }

  function heal(p, amount) { p.hp = Math.min(p.maxHp, p.hp + amount); }

  function nearbyEnemies(p, radius) {
    var em = PS() && PS().EnemyMgr;
    if (!em || !em.queryCircle) return [];
    return em.queryCircle(p.x, p.y, radius) || [];
  }

  // ── RUN START / END ──────────────────────────────────────────────────────
  function startRun(p) {
    var mon = p.mon;
    var dex = mon && (mon.dex || mon.skin || 0);
    var ab  = DEX_ABILITY[dex] || null;

    state.running = true; state.ability = ab; state.player = p; state.dex = dex;
    state.lastKills = p.kills || 0; state.lastHp = p.hp;
    state.lastX = p.x; state.lastY = p.y;
    state.lastMoveTime = now(); state.runStart = now();
    state.moxieBoost = 0; state.moxieAtk = 1; state.beastBoostKills = 0;
    state.grimNeighBoost = 0; state.speedBoosted = false; state.speedBurstEnd = 0;
    state.moodyTimer = now() + 10; state.moodyLast = null; state.moodyLastStat = null;
    state.zenModeActive = false; state.zenModeApplied = false;
    state.powerConstructFired = false; state.schoolingActive = null;
    state.disguiseUp = true; state.disguiseCooldown = 0; state.disguiseNextAllow = 0;
    state.lastInvuln = 0; state.regenTimer = now();
    state.slowStartApplied = false; state.slowStartRamp = null;
    state.pqApplied = false; state.pqStat = null; state.pqLowStat = null;
    state._starterBoosted = false; state._multiscaleActive = false;
    state._contactCd = {}; state._lastTick = now();

    state.baseline = {
      atkMul: p.atkMul, spdMul: p.spdMul, cdMul: p.cdMul,
      regenFlat: p.regenFlat, dmgReduce: p.dmgReduce, maxHp: p.maxHp, hp: p.hp
    };

    if (!ab) return;
    console.log('[PokéAbility] ' + (mon && mon.name) + ' (#' + dex + '): ' + ab);
    applyRunStart(p, ab);
  }

  function endRun() { state.running = false; state.ability = null; state.player = null; }

  // ── APPLY RUN-START PASSIVES ─────────────────────────────────────────────
  function applyRunStart(p, ab) {
    switch (ab) {
      case 'hugepower':    p.atkMul *= 2.0; break;
      case 'hustle':       p.atkMul *= 1.3; break;
      case 'swiftswim': case 'chlorophyll': case 'sandrush':
      case 'slushrust': case 'suresurfer':  p.spdMul *= 1.5; break;
      case 'poisonheal':   p.regenFlat += 1; break;
      case 'speedboost':   break; // burst on standing still — handled in poll
      case 'dauntlessshield': p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.15); break;
      case 'intrepidsword':   p.atkMul *= 1.15; break;
      case 'protean': case 'libero': p.atkMul *= 1.2; break;
      case 'multiscale':   break; // applied dynamically when HP is full
      case 'wonderguard':  p.maxHp = 1; p.hp = 1; p.dmgReduce = 0.9; break;
      case 'slowstart':
        p.atkMul *= 0.5; p.spdMul *= 0.5;
        state.slowStartRamp = { startTime: now(), done: false }; break;
      case 'truant':       p.atkMul *= 2.0; p.cdMul *= 2.0; break;
      case 'protosynthesis': case 'quarkdrive': applyProtoQuark(p); break;
      case 'toughclaws':   p.regenFlat += 1; break;
      case 'magicguard':   p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.30); break;
      case 'levitate':     p.spdMul *= 1.15; break;
      case 'sheerforce':   p.atkMul *= 1.3; break;
      case 'adaptability': p.atkMul *= 1.25; break;
      case 'technician':   p.atkMul *= 1.15; break;
      case 'noguard':      p.atkMul *= 1.3; p.cdMul *= 0.85; break;
      case 'sniper':       p.atkMul *= 1.2; break;
      case 'infiltrator':  p.atkMul *= 1.15; break;
      case 'punkrock':     p.atkMul *= 1.2; break;
      case 'liquidvoice':  p.regenFlat += 1; break;
      case 'strongjaw':    p.atkMul *= 1.2; break;
      case 'megalauncher': p.atkMul *= 1.3; break;
      case 'skilllink':    p.cdMul *= 0.85; break;
      case 'furcoat':      p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.25); break;
      case 'filter':       p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.20); break;
      case 'marvelscale':  p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.15); break;
      case 'naturalcure':  break; // timer in poll
      case 'voltabsorb': case 'waterabsorb': case 'flashfire':
      case 'sapsipper': case 'lightningrod': case 'stormdrain':
        p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.10); break;
      case 'dryskin':      break; // timer in poll
      case 'icebody':      break; // timer in poll
    }
  }

  function applyProtoQuark(p) {
    var mon = p.mon; if (!mon) return;
    var atkStat = (mon.atk || 1);
    var spdStat = (mon.spd || 100) / 100;
    if (atkStat >= spdStat) {
      p.atkMul *= 1.5; p.spdMul *= 0.9;
      state.pqStat = 'atk'; state.pqLowStat = 'spd';
    } else {
      p.spdMul *= 1.5; p.atkMul *= 0.9;
      state.pqStat = 'spd'; state.pqLowStat = 'atk';
    }
    state.pqApplied = true;
  }

  // ── ABILITY TICK ─────────────────────────────────────────────────────────
  function tickAbility(p) {
    var ab = state.ability;
    var t  = now();
    var dt = t - (state._lastTick || t);
    state._lastTick = t;
    var kills    = p.kills || 0;
    var newKills = kills - state.lastKills;
    var hpPct    = p.hp / p.maxHp;
    var runTime  = t - state.runStart;

    // ── HP-threshold abilities ───────────────────────────────────────────
    if (ab === 'blaze' || ab === 'torrent' || ab === 'overgrow' || ab === 'swarm') {
      var below = hpPct < 0.33;
      if (below && !state._starterBoosted) { p.atkMul *= 1.5; state._starterBoosted = true; }
      else if (!below && state._starterBoosted) { p.atkMul /= 1.5; state._starterBoosted = false; }
    }

    if (ab === 'multiscale') {
      var full = p.hp >= p.maxHp * 0.99;
      if (full && !state._multiscaleActive) {
        p.dmgReduce = Math.min(0.80, p.dmgReduce + 0.40); state._multiscaleActive = true;
      } else if (!full && state._multiscaleActive) {
        p.dmgReduce = Math.max(0, p.dmgReduce - 0.40); state._multiscaleActive = false;
      }
    }

    if (ab === 'zenmode') {
      if (hpPct < 0.5 && !state.zenModeApplied) {
        p.atkMul *= 1.3; p.spdMul *= 1.3; p.cdMul *= 0.77;
        state.zenModeApplied = true; state.zenModeActive = true;
      } else if (hpPct >= 0.5 && state.zenModeActive) {
        p.atkMul /= 1.3; p.spdMul /= 1.3; p.cdMul /= 0.77;
        state.zenModeApplied = false; state.zenModeActive = false;
      }
    }

    if (ab === 'powerconstruct' && !state.powerConstructFired && hpPct < 0.5) {
      var added = p.maxHp;
      p.maxHp = Math.min(p.maxHp * 2, 999);
      p.hp = Math.min(p.maxHp, p.hp + added);
      state.powerConstructFired = true;
    }

    if (ab === 'schooling') {
      var school = hpPct > 0.25;
      if (school && state.schoolingActive !== true) {
        p.atkMul *= 1.5; p.spdMul *= 1.5; p.cdMul *= 0.75; state.schoolingActive = true;
      } else if (!school && state.schoolingActive === true) {
        p.atkMul /= 1.5; p.spdMul /= 1.5; p.cdMul /= 0.75; state.schoolingActive = false;
      }
    }

    // ── Slow Start ramp ──────────────────────────────────────────────────
    if (ab === 'slowstart' && state.slowStartRamp && !state.slowStartRamp.done) {
      var elapsed = Math.min(runTime, 60);
      var ratio = 0.5 + (elapsed / 60) * 1.0; // 0.5 → 1.5 over 60s
      if (elapsed >= 60) ratio = 1.5;
      if (!state.slowStartRamp.lastRatio) state.slowStartRamp.lastRatio = 0.5;
      var delta = ratio / state.slowStartRamp.lastRatio;
      p.atkMul *= delta; p.spdMul *= delta;
      state.slowStartRamp.lastRatio = ratio;
      if (elapsed >= 60) state.slowStartRamp.done = true;
    }

    // ── Kill-tracking abilities ──────────────────────────────────────────
    if (newKills > 0) {
      state.lastKills = kills;
      if (ab === 'moxie') {
        var cap = 0.50;
        var add = Math.min(newKills * 0.02, cap - state.moxieBoost);
        if (add > 0) { p.atkMul *= (1 + add); state.moxieBoost += add; }
      }
      if (ab === 'beastboost') {
        var bAdd = newKills * 0.01;
        p.atkMul *= (1 + bAdd); p.spdMul *= (1 + bAdd); p.cdMul /= (1 + bAdd * 0.5);
        state.beastBoostKills += newKills;
      }
      if (ab === 'grimneigh' || ab === 'chillingneigh') {
        p.atkMul *= Math.pow(1.05, newKills);
        state.grimNeighBoost += newKills;
      }
    }

    // ── Timer abilities ──────────────────────────────────────────────────
    if (ab === 'regenerator' && t - state.regenTimer >= 10)
      { heal(p, p.maxHp * 0.05); state.regenTimer = t; }
    if (ab === 'icebody' && t - state.regenTimer >= 15)
      { heal(p, p.maxHp * 0.05); state.regenTimer = t; }
    if (ab === 'dryskin' && t - state.regenTimer >= 10)
      { heal(p, p.maxHp * 0.10); state.regenTimer = t; }
    if (ab === 'naturalcure' && t - state.regenTimer >= 20)
      { heal(p, p.maxHp * 0.02); state.regenTimer = t; }

    if (ab === 'moody' && t > state.moodyTimer) {
      var stats = ['atkMul', 'spdMul', 'cdMul'];
      if (state.moodyLast) { p[state.moodyLast.up] /= 1.20; p[state.moodyLast.dn] /= 0.90; }
      var pick = Math.floor(Math.random() * 3);
      var dnPick = (pick + 1 + Math.floor(Math.random() * 2)) % 3;
      var newUp = stats[pick], newDn = stats[dnPick];
      if (newDn === 'cdMul') { p[newUp] *= 1.20; p[newDn] *= 1.10; }
      else                   { p[newUp] *= 1.20; p[newDn] *= 0.90; }
      state.moodyLast = { up: newUp, dn: newDn };
      state.moodyTimer = t + 10;
    }

    // Speed Boost option 2: standing still 2s → +80% SPD burst for 3s
    if (ab === 'speedboost') {
      var moved = Math.abs(p.x - state.lastX) > 2 || Math.abs(p.y - state.lastY) > 2;
      if (moved) {
        state.lastX = p.x; state.lastY = p.y; state.lastMoveTime = t;
        if (state.speedBoosted) { p.spdMul /= 1.80; state.speedBoosted = false; }
      } else if (!state.speedBoosted && t - state.lastMoveTime >= 2) {
        p.spdMul *= 1.80; state.speedBoosted = true; state.speedBurstEnd = t + 3;
      }
      if (state.speedBoosted && t > state.speedBurstEnd) {
        p.spdMul /= 1.80; state.speedBoosted = false; state.lastMoveTime = t;
      }
    }

    // Disguise: once per 60s, negate one hit by healing
    if (ab === 'disguise') {
      var hitNow = p.invuln > 0 && state.lastInvuln <= 0;
      if (hitNow && state.disguiseUp && t > state.disguiseNextAllow) {
        heal(p, 999); state.disguiseUp = false; state.disguiseNextAllow = t + 60;
      }
      if (!state.disguiseUp && t > state.disguiseNextAllow) state.disguiseUp = true;
      state.lastInvuln = p.invuln;
    }

    // Battle Armor: 20% chance to heal ~one hit's worth on each hit
    if (ab === 'battlearmor') {
      var hitNow2 = p.invuln > 0 && state.lastInvuln <= 0;
      if (hitNow2 && Math.random() < 0.20) heal(p, p.maxHp * 0.10);
      state.lastInvuln = p.invuln;
    }

    // Stamina: each hit +1% dmgReduce up to 50%
    if (ab === 'stamina') {
      var hitNow3 = p.invuln > 0 && state.lastInvuln <= 0;
      if (hitNow3) p.dmgReduce = Math.min(0.50, p.dmgReduce + 0.01);
      state.lastInvuln = p.invuln;
    }

    // ── Contact abilities ────────────────────────────────────────────────
    var contactRadius = 32;
    if (ab === 'static' || ab === 'flamebody' || ab === 'poisonpoint' ||
        ab === 'effectspore' || ab === 'roughskin' || ab === 'cursedbody') {
      var near = nearbyEnemies(p, contactRadius);
      near.forEach(function (en) {
        if (!en || en.dead) return;
        var eid = en.id || en._id || Math.random();
        if (!state._contactCd) state._contactCd = {};
        if (state._contactCd[eid] && t < state._contactCd[eid]) return;
        state._contactCd[eid] = t + 0.5;

        if      (ab === 'static')     { if (en.applyStun)   en.applyStun(2.0); }
        else if (ab === 'flamebody')  { if (en.applyBurn)   en.applyBurn(1); }
        else if (ab === 'poisonpoint'){ if (en.applyPoison) en.applyPoison(1); state._contactCd[eid] = t + 5; }
        else if (ab === 'effectspore') {
          var roll = Math.random();
          if      (roll < 0.33) { if (en.applyStun)   en.applyStun(1); }
          else if (roll < 0.66) { if (en.applyPoison) en.applyPoison(1); }
          else                  { if (en.applySlow)   en.applySlow(0.5, 1); }
        }
        else if (ab === 'roughskin') {
          en.hp -= Math.max(1, (en.maxHp || 100) * 0.05);
          if (en.hp <= 0) en.dead = true;
        }
        else if (ab === 'cursedbody') {
          if (en.applySlow) en.applySlow(0.8, 3);
          state._contactCd[eid] = t + 3;
        }
      });
    }

    state.lastHp = p.hp;
  }

  // ── POLL (150ms) ─────────────────────────────────────────────────────────
  function poll() {
    var g = game(); if (!g) return;
    var p = g.player;
    if (g.state === 'playing' && p && p.mon) {
      if (!state.running || state.player !== p) { startRun(p); return; }
      tickAbility(p);
    } else if (state.running) {
      endRun();
    }
  }

  setInterval(poll, 150);
  console.log('[PokéAbility] Ability system loaded. Waiting for window.__PS...');

  var waitId = setInterval(function () {
    if (window.__PS && window.__PS.Game) {
      clearInterval(waitId);
      console.log('[PokéAbility] window.__PS ready.');
    }
  }, 500);

})();
