// PS Mod: Ability Display
// Shows a Pokémon's ability name + description in the dex detail panel,
// injected below the stats block whenever a Pokémon is selected.
(function () {
  'use strict';

  // ── DEX → ABILITY (same map as abilities.js) ─────────────────────────────
  var DEX_ABILITY = {1:"overgrow",2:"overgrow",3:"overgrow",4:"blaze",5:"blaze",6:"blaze",7:"torrent",9:"torrent",10:"swarm",11:"swarm",12:"swarm",13:"swarm",14:"swarm",15:"swarm",23:"poisonpoint",24:"poisonpoint",25:"static",26:"lightningrod",29:"hustle",30:"hustle",31:"sheerforce",32:"hustle",33:"hustle",34:"sheerforce",36:"magicguard",38:"flashfire",41:"poisonpoint",42:"poisonpoint",43:"chlorophyll",44:"chlorophyll",45:"chlorophyll",46:"effectspore",47:"effectspore",48:"swarm",49:"swarm",54:"swiftswim",55:"swiftswim",59:"flashfire",60:"swiftswim",61:"swiftswim",62:"swiftswim",65:"magicguard",68:"noguard",69:"chlorophyll",70:"chlorophyll",71:"chlorophyll",72:"icebody",73:"icebody",78:"flashfire",79:"regenerator",80:"regenerator",88:"poisonpoint",89:"poisonpoint",91:"skilllink",92:"levitate",93:"levitate",94:"cursedbody",100:"static",101:"static",105:"levitate",109:"levitate",110:"levitate",112:"filter",113:"naturalcure",114:"regenerator",116:"swiftswim",117:"swiftswim",118:"swiftswim",119:"swiftswim",120:"naturalcure",121:"naturalcure",122:"filter",124:"dryskin",125:"static",126:"flamebody",127:"moxie",130:"moxie",131:"waterabsorb",133:"adaptability",134:"waterabsorb",135:"voltabsorb",136:"flashfire",145:"static",149:"multiscale",151:"technician",152:"overgrow",153:"overgrow",154:"overgrow",155:"blaze",156:"blaze",157:"blaze",158:"torrent",159:"torrent",160:"torrent",165:"swarm",166:"swarm",169:"levitate",170:"voltabsorb",171:"voltabsorb",175:"hustle",176:"hustle",180:"static",181:"static",183:"hugepower",184:"hugepower",187:"chlorophyll",188:"chlorophyll",189:"chlorophyll",193:"swarm",194:"swarm",196:"adaptability",197:"adaptability",199:"regenerator",200:"levitate",204:"swarm",205:"swarm",207:"poisonheal",212:"technician",214:"moxie",218:"flamebody",219:"flamebody",223:"moody",224:"sniper",229:"flashfire",230:"swiftswim",235:"technician",237:"technician",239:"static",240:"flamebody",241:"sapsipper",245:"swiftswim",246:"strongjaw",247:"strongjaw",248:"strongjaw",249:"multiscale",250:"regenerator",251:"naturalcure",252:"overgrow",253:"overgrow",254:"overgrow",255:"speedboost",256:"speedboost",257:"speedboost",258:"torrent",259:"torrent",260:"torrent",262:"moxie",265:"swarm",266:"swarm",267:"swarm",268:"swarm",269:"swarm",272:"icebody",273:"chlorophyll",274:"chlorophyll",275:"chlorophyll",283:"swarm",284:"flamebody",286:"poisonheal",289:"truant",290:"swarm",291:"speedboost",292:"wonderguard",307:"hugepower",308:"hugepower",309:"static",310:"static",313:"swarm",314:"swarm",315:"chlorophyll",316:"poisonpoint",317:"poisonpoint",319:"speedboost",323:"filter",327:"contrary",329:"levitate",330:"levitate",336:"poisonpoint",337:"levitate",338:"levitate",340:"swiftswim",341:"adaptability",342:"adaptability",347:"swarm",348:"battlearmor",350:"marvelscale",353:"infiltrator",354:"infiltrator",355:"levitate",356:"levitate",357:"chlorophyll",358:"regenerator",361:"moody",362:"moody",363:"swiftswim",364:"swiftswim",365:"icebody",369:"swiftswim",373:"moxie",376:"toughclaws",378:"icebody",380:"levitate",381:"levitate",382:"swiftswim",387:"overgrow",388:"overgrow",389:"overgrow",390:"blaze",391:"blaze",392:"blaze",393:"torrent",394:"torrent",395:"torrent",403:"static",404:"static",405:"static",407:"technician",414:"swarm",415:"swarm",416:"swarm",417:"static",418:"swiftswim",419:"swiftswim",420:"chlorophyll",421:"chlorophyll",422:"stormdrain",423:"stormdrain",424:"technician",430:"contrary",432:"truant",436:"flamebody",437:"flamebody",440:"regenerator",443:"roughskin",444:"roughskin",445:"roughskin",451:"swarm",452:"sniper",453:"poisonpoint",454:"poisonpoint",455:"chlorophyll",456:"swiftswim",457:"swiftswim",462:"levitate",465:"regenerator",467:"flamebody",468:"hustle",470:"adaptability",471:"adaptability",472:"poisonheal",477:"noguard",479:"cursedbody",480:"levitate",481:"levitate",482:"levitate",483:"levitate",484:"levitate",485:"flamebody",486:"slowstart",492:"naturalcure",495:"overgrow",496:"overgrow",497:"contrary",498:"blaze",499:"blaze",500:"blaze",501:"torrent",502:"torrent",503:"torrent",532:"sheerforce",533:"sheerforce",534:"sheerforce",540:"swarm",541:"swarm",542:"swarm",543:"poisonpoint",544:"poisonpoint",545:"poisonpoint",553:"moxie",555:"zenmode",560:"moxie",562:"strongjaw",566:"moxie",567:"moxie",568:"poisonpoint",569:"poisonpoint",572:"skilllink",573:"skilllink",580:"swiftswim",581:"swiftswim",586:"sapsipper",587:"static",590:"effectspore",591:"effectspore",594:"swiftswim",595:"swarm",596:"swarm",609:"infiltrator",616:"swarm",617:"swarm",618:"static",621:"sheerforce",626:"sapsipper",628:"sheerforce",632:"hustle",633:"hustle",634:"hustle",635:"hustle",636:"flamebody",637:"swarm",645:"sheerforce",650:"overgrow",651:"overgrow",652:"overgrow",653:"blaze",654:"blaze",655:"blaze",656:"torrent",657:"torrent",658:"protean",664:"swarm",665:"poisonpoint",666:"swarm",676:"furcoat",690:"poisonpoint",691:"poisonpoint",692:"sniper",693:"megalauncher",696:"strongjaw",697:"strongjaw",700:"adaptability",702:"static",715:"infiltrator",718:"powerconstruct",721:"flamebody",722:"overgrow",723:"overgrow",724:"overgrow",725:"blaze",726:"blaze",727:"blaze",728:"torrent",729:"torrent",730:"liquidvoice",737:"static",738:"static",746:"schooling",749:"stamina",750:"stamina",778:"disguise",780:"strongjaw",793:"beastboost",794:"beastboost",795:"beastboost",796:"beastboost",797:"beastboost",798:"beastboost",799:"beastboost",803:"beastboost",804:"beastboost",805:"beastboost",806:"beastboost",810:"overgrow",811:"overgrow",812:"overgrow",813:"blaze",814:"blaze",815:"protean",816:"torrent",817:"torrent",818:"torrent",840:"swarm",841:"swarm",842:"swarm",849:"punkrock",850:"swarm",851:"swarm",854:"cursedbody",855:"cursedbody",857:"cursedbody",858:"cursedbody",866:"adaptability",887:"toughclaws",888:"dauntlessshield",889:"intrepidsword",896:"chillingneigh",897:"grimneigh",898:"grimneigh",906:"overgrow",907:"overgrow",908:"overgrow",909:"blaze",910:"blaze",911:"blaze",916:"torrent",917:"torrent",918:"torrent",1005:"protosynthesis",1006:"protosynthesis",1007:"protosynthesis",1008:"protosynthesis",1009:"protosynthesis",1010:"protosynthesis",1011:"protosynthesis",1012:"protosynthesis",1016:"quarkdrive",1017:"quarkdrive",1018:"quarkdrive",1019:"quarkdrive",1020:"quarkdrive",1021:"quarkdrive",1024:"quarkdrive",1025:"quarkdrive"};

  // ── Ability display names + descriptions ─────────────────────────────────
  var ABILITY_INFO = {
    overgrow:        { name: 'Overgrow',         desc: 'Below 33% HP: +50% Attack.' },
    blaze:           { name: 'Blaze',             desc: 'Below 33% HP: +50% Attack.' },
    torrent:         { name: 'Torrent',           desc: 'Below 33% HP: +50% Attack.' },
    swarm:           { name: 'Swarm',             desc: 'Below 33% HP: +50% Attack.' },
    static:          { name: 'Static',            desc: 'Enemies that touch you are stunned for 2s.' },
    flamebody:       { name: 'Flame Body',        desc: 'Enemies that touch you are burned.' },
    poisonpoint:     { name: 'Poison Point',      desc: 'Enemies that touch you are poisoned for 5s.' },
    effectspore:     { name: 'Effect Spore',      desc: 'Contact: 33% chance each of stun, poison, or slow.' },
    roughskin:       { name: 'Rough Skin',        desc: 'Enemies that touch you lose 5% of their max HP.' },
    cursedbody:      { name: 'Cursed Body',       desc: 'Enemies that hit you have their damage reduced 20% for 3s.' },
    hugepower:       { name: 'Huge Power',        desc: 'Attack ×2.' },
    hustle:          { name: 'Hustle',            desc: 'Attack +30%.' },
    swiftswim:       { name: 'Swift Swim',        desc: 'Speed +50%.' },
    chlorophyll:     { name: 'Chlorophyll',       desc: 'Speed +50%.' },
    sandrush:        { name: 'Sand Rush',         desc: 'Speed +50%.' },
    poisonheal:      { name: 'Poison Heal',       desc: 'Passive regen +1 HP/s.' },
    speedboost:      { name: 'Speed Boost',       desc: 'Stand still 2s: burst +80% Speed for 3s.' },
    dauntlessshield: { name: 'Dauntless Shield',  desc: 'Damage reduction +15%.' },
    intrepidsword:   { name: 'Intrepid Sword',    desc: 'Attack +15%.' },
    protean:         { name: 'Protean',           desc: 'STAB on all moves: Attack +20%.' },
    libero:          { name: 'Libero',            desc: 'STAB on all moves: Attack +20%.' },
    multiscale:      { name: 'Multiscale',        desc: 'At full HP: damage reduction +40%.' },
    wonderguard:     { name: 'Wonder Guard',      desc: '1 HP, 90% damage reduction. High risk, high reward.' },
    slowstart:       { name: 'Slow Start',        desc: 'Stats ramp from 50% → 150% over 60 seconds.' },
    truant:          { name: 'Truant',            desc: 'Attack ×2, cooldowns ×2 (fires half as fast).' },
    protosynthesis:  { name: 'Protosynthesis',    desc: 'Highest stat ×1.5, lowest stat -10%.' },
    quarkdrive:      { name: 'Quark Drive',       desc: 'Highest stat ×1.5, lowest stat -10%.' },
    toughclaws:      { name: 'Tough Claws',       desc: 'Melee lifesteal: +1 regen.' },
    magicguard:      { name: 'Magic Guard',       desc: 'Zone/aura damage reduced to 30%.' },
    levitate:        { name: 'Levitate',          desc: 'Speed +15%.' },
    sheerforce:      { name: 'Sheer Force',       desc: 'Attack +30%.' },
    adaptability:    { name: 'Adaptability',      desc: 'Attack +25% (enhanced STAB).' },
    technician:      { name: 'Technician',        desc: 'Fast moves deal more damage: Attack +15%.' },
    noguard:         { name: 'No Guard',          desc: 'Attack +30%, cooldowns -15%.' },
    sniper:          { name: 'Sniper',            desc: 'Attack +20% (beam/long-range focus).' },
    infiltrator:     { name: 'Infiltrator',       desc: 'Attack +15% (pierces barriers).' },
    punkrock:        { name: 'Punk Rock',         desc: 'Attack +20% (sound moves boosted).' },
    liquidvoice:     { name: 'Liquid Voice',      desc: 'All moves drain 1 HP: +1 regen.' },
    strongjaw:       { name: 'Strong Jaw',        desc: 'Attack +20% (contact moves).' },
    megalauncher:    { name: 'Mega Launcher',     desc: 'Attack +30% (projectile moves).' },
    skilllink:       { name: 'Skill Link',        desc: 'Cooldowns -15% (multi-hit/spread moves).' },
    furcoat:         { name: 'Fur Coat',          desc: 'Damage reduction +25%.' },
    filter:          { name: 'Filter',            desc: 'Damage reduction +20%.' },
    marvelscale:     { name: 'Marvel Scale',      desc: 'Damage reduction +15%.' },
    voltabsorb:      { name: 'Volt Absorb',       desc: 'Damage reduction +10% (electric immunity).' },
    waterabsorb:     { name: 'Water Absorb',      desc: 'Damage reduction +10% (water immunity).' },
    flashfire:       { name: 'Flash Fire',        desc: 'Damage reduction +10% (fire immunity).' },
    sapsipper:       { name: 'Sap Sipper',        desc: 'Damage reduction +10% (grass immunity).' },
    lightningrod:    { name: 'Lightning Rod',     desc: 'Damage reduction +10% (electric immunity).' },
    stormdrain:      { name: 'Storm Drain',       desc: 'Damage reduction +10% (water immunity).' },
    dryskin:         { name: 'Dry Skin',          desc: 'Heal 10% max HP every 10s.' },
    icebody:         { name: 'Ice Body',          desc: 'Heal 5% max HP every 15s.' },
    regenerator:     { name: 'Regenerator',       desc: 'Heal 5% max HP every 10s.' },
    naturalcure:     { name: 'Natural Cure',      desc: 'Clears debuffs every 20s.' },
    moxie:           { name: 'Moxie',             desc: 'Each kill: +2% Attack (max +50%).' },
    beastboost:      { name: 'Beast Boost',       desc: 'Each kill: +1% to all stats.' },
    grimneigh:       { name: 'Grim Neigh',        desc: 'Each kill: Attack ×1.05 (stacks).' },
    chillingneigh:   { name: 'Chilling Neigh',    desc: 'Each kill: Attack ×1.05 (stacks).' },
    zenmode:         { name: 'Zen Mode',          desc: 'Below 50% HP: +30% Attack, Speed, and Cooldown.' },
    powerconstruct:  { name: 'Power Construct',   desc: 'Below 50% HP: max HP doubled (once per run).' },
    schooling:       { name: 'Schooling',         desc: 'Above 25% HP: +50% Attack & Speed.' },
    disguise:        { name: 'Disguise',          desc: 'Once per 60s: fully negate one hit.' },
    battlearmor:     { name: 'Battle Armor',      desc: '20% chance to negate each hit taken.' },
    stamina:         { name: 'Stamina',           desc: 'Each hit taken: +1% damage reduction (max 50%).' },
    moody:           { name: 'Moody',             desc: 'Every 10s: random stat +20%, another -10%.' },
    contrary:        { name: 'Contrary',          desc: 'Stat-lowering effects become boosts instead.' },
  };

  // ── Inject ability badge into the detail panel ────────────────────────────
  var lastDex = null;

  function injectAbility(dex) {
    var detail = document.getElementById('dex-detail');
    if (!detail) return;

    // Remove any existing badge
    var old = detail.querySelector('#ps-ability-badge');
    if (old) old.remove();

    var ab = DEX_ABILITY[dex];
    if (!ab) return;

    var info = ABILITY_INFO[ab];
    var name = info ? info.name : ab.charAt(0).toUpperCase() + ab.slice(1);
    var desc = info ? info.desc : '';

    var badge = document.createElement('div');
    badge.id = 'ps-ability-badge';
    badge.style.cssText = [
      'margin:8px 0 4px',
      'padding:7px 10px',
      'background:rgba(255,255,255,0.07)',
      'border-radius:6px',
      'border-left:3px solid var(--gold,#f5c842)',
      'font-size:13px',
      'line-height:1.4',
    ].join(';');
    badge.innerHTML =
      '<span style="font-weight:700;color:var(--gold,#f5c842)">Ability: ' + name + '</span>' +
      (desc ? '<br><span style="opacity:0.85">' + desc + '</span>' : '');

    // Insert after the stats block — look for a .stats, table, or just append
    var stats = detail.querySelector('.stats, table, .mon-stats, [class*="stat"]');
    if (stats && stats.parentNode) {
      stats.parentNode.insertBefore(badge, stats.nextSibling);
    } else {
      detail.appendChild(badge);
    }
  }

  // ── Extract dex number from the detail panel ─────────────────────────────
  function extractDex(detail) {
    // 1. data attribute on any child element
    var numEl = detail.querySelector('[data-dex],[data-id],[data-mon]');
    if (numEl) {
      var d = parseInt(numEl.dataset.dex || numEl.dataset.id || numEl.dataset.mon);
      if (d > 0) return d;
    }

    // 2. Scan ALL text nodes for a dex number pattern:
    //    "Nº 025", "No. 025", "#025", "025 ·", plain "025" after º/°/N
    var text = detail.textContent || '';
    var patterns = [
      /N[º°o\.]\s*0*(\d{1,4})/i,   // Nº 025, No. 025, N° 025
      /#\s*0*(\d{1,4})/,             // #025
      /\b0*(\d{1,4})\s*[·\-–]/,     // 025 · Kanto
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = text.match(patterns[i]);
      if (m) { var n = parseInt(m[1]); if (n > 0 && n <= 1025) return n; }
    }
    return null;
  }

  // ── Watch for dex-detail changes ─────────────────────────────────────────
  function tryUpdate() {
    var detail = document.getElementById('dex-detail');
    if (!detail || !detail.textContent.trim()) return;
    var dex = extractDex(detail);
    if (dex && dex !== lastDex) {
      lastDex = dex;
      injectAbility(dex);
    }
  }

  // Watch body from the start — game builds DOM dynamically long after load
  new MutationObserver(tryUpdate).observe(document.documentElement, {
    childList: true, subtree: true
  });
})();
