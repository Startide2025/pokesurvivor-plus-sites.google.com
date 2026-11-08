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
  // For Pokémon not in this map, getAbilityForDex() falls back to a type-based ability.
  var DEX_ABILITY = {
    // ─── Gen 1 ───
    1:"chlorophyll",2:"chlorophyll",3:"chlorophyll",   // Bulbasaur line — hidden: Chlorophyll
    4:"solarpower",5:"solarpower",6:"solarpower",        // Charmander line — hidden: Solar Power
    7:"raindish",8:"raindish",9:"raindish",              // Squirtle line — hidden: Rain Dish
    10:"swarm",11:"swarm",12:"swarm",13:"swarm",14:"swarm",15:"swarm",
    16:"keeneye",17:"keeneye",18:"keeneye",
    19:"hustle",20:"hustle",
    21:"keeneye",22:"sniper",
    23:"poisonpoint",24:"poisonpoint",
    25:"static",26:"lightningrod",
    27:"sandrush",28:"sandrush",
    29:"hustle",30:"hustle",31:"sheerforce",32:"hustle",33:"hustle",34:"sheerforce",
    35:"magicguard",36:"magicguard",
    37:"flashfire",38:"drought",
    39:"thickfat",40:"thickfat",
    41:"poisonpoint",42:"poisonpoint",
    43:"chlorophyll",44:"chlorophyll",45:"chlorophyll",
    46:"effectspore",47:"effectspore",
    48:"swarm",49:"swarm",
    50:"sheerforce",51:"sheerforce",
    52:"technician",53:"technician",
    54:"swiftswim",55:"swiftswim",
    56:"moxie",57:"moxie",
    58:"flashfire",59:"flashfire",
    60:"swiftswim",61:"swiftswim",62:"swiftswim",
    63:"magicguard",64:"magicguard",65:"magicguard",
    66:"noguard",67:"noguard",68:"noguard",
    69:"chlorophyll",70:"chlorophyll",71:"chlorophyll",
    72:"icebody",73:"icebody",
    74:"filter",75:"filter",76:"filter",
    77:"flashfire",78:"flashfire",
    79:"regenerator",80:"regenerator",
    81:"voltabsorb",82:"voltabsorb",
    83:"technician",
    84:"earlybird",85:"earlybird",
    86:"icebody",87:"icebody",
    88:"poisonpoint",89:"poisonpoint",
    90:"skilllink",91:"skilllink",
    92:"levitate",93:"levitate",94:"cursedbody",
    95:"filter",
    96:"magicguard",97:"magicguard",
    98:"sheerforce",99:"sheerforce",
    100:"static",101:"static",
    102:"chlorophyll",103:"chlorophyll",
    104:"battlearmor",105:"levitate",
    106:"sheerforce",107:"technician",108:"thickfat",
    109:"levitate",110:"levitate",
    111:"filter",112:"filter",
    113:"naturalcure",114:"regenerator",
    115:"sheerforce",
    116:"swiftswim",117:"swiftswim",118:"swiftswim",119:"swiftswim",
    120:"naturalcure",121:"naturalcure",
    122:"filter",
    123:"technician",
    124:"dryskin",125:"static",126:"flamebody",
    127:"moxie",128:"sheerforce",
    129:"swiftswim",130:"moxie",
    131:"waterabsorb",
    132:"adaptability",
    133:"adaptability",134:"waterabsorb",135:"voltabsorb",136:"flashfire",
    137:"download",138:"swiftswim",139:"swiftswim",
    140:"battlearmor",141:"battlearmor",
    142:"sheerforce",143:"thickfat",
    144:"icebody",145:"static",146:"flamebody",
    147:"multiscale",148:"multiscale",149:"multiscale",
    150:"magicguard",151:"technician",
    // ─── Gen 2 ───
    152:"leafguard",153:"leafguard",154:"leafguard",   // Chikorita line — hidden: Leaf Guard
    155:"flashfire",156:"flashfire",157:"flashfire",   // Cyndaquil line — hidden: Flash Fire
    158:"sheerforce",159:"sheerforce",160:"sheerforce", // Totodile line — hidden: Sheer Force
    161:"hustle",162:"hustle",
    163:"keeneye",164:"keeneye",
    165:"swarm",166:"swarm",
    167:"poisonpoint",168:"poisonpoint",169:"levitate",
    170:"voltabsorb",171:"voltabsorb",
    172:"static",173:"magicguard",174:"hustle",
    175:"hustle",176:"hustle",
    177:"magicguard",178:"magicguard",
    179:"static",180:"static",181:"static",
    182:"chlorophyll",
    183:"hugepower",184:"hugepower",
    185:"filter",186:"drizzle",
    187:"chlorophyll",188:"chlorophyll",189:"chlorophyll",
    190:"technician",191:"chlorophyll",192:"chlorophyll",
    193:"swarm",194:"swarm",
    195:"waterabsorb",196:"adaptability",197:"adaptability",
    198:"moxie",199:"regenerator",200:"levitate",
    201:"levitate",202:"battlearmor",203:"keeneye",
    204:"swarm",205:"swarm",206:"regenerator",
    207:"poisonheal",208:"filter",
    209:"intimidate",210:"intimidate",211:"poisonpoint",
    212:"technician",213:"filter",214:"moxie",
    215:"technician",216:"thickfat",217:"thickfat",
    218:"flamebody",219:"flamebody",
    220:"thickfat",221:"thickfat",222:"naturalcure",
    223:"moody",224:"sniper",225:"hustle",
    226:"swiftswim",227:"filter",228:"flashfire",229:"flashfire",
    230:"swiftswim",
    231:"filter",232:"filter",233:"download",234:"intimidate",
    235:"technician",236:"technician",237:"technician",
    238:"magicguard",239:"static",240:"flamebody",241:"sapsipper",
    242:"naturalcure",243:"voltabsorb",244:"flashfire",245:"swiftswim",
    246:"roughskin",247:"roughskin",
    248:"sandstream",  // Tyranitar — Sand Stream (not strongjaw!)
    249:"multiscale",250:"regenerator",251:"naturalcure",
    // ─── Gen 3 ───
    252:"unburden",253:"unburden",254:"unburden",       // Treecko line — hidden: Unburden
    255:"speedboost",256:"speedboost",257:"speedboost",
    258:"damp",259:"damp",260:"damp",                   // Mudkip line — hidden: Damp
    261:"moxie",262:"moxie",
    263:"keeneye",264:"keeneye",
    265:"swarm",266:"swarm",267:"swarm",268:"swarm",269:"swarm",
    270:"waterabsorb",271:"waterabsorb",272:"icebody",
    273:"chlorophyll",274:"chlorophyll",275:"chlorophyll",
    276:"keeneye",277:"keeneye",
    278:"swiftswim",279:"drizzle",   // Pelipper — Drizzle
    280:"magicguard",281:"magicguard",282:"magicguard",
    283:"swarm",284:"flamebody",285:"effectspore",286:"poisonheal",
    287:"truant",288:"sheerforce",289:"truant",
    290:"swarm",291:"speedboost",292:"wonderguard",
    293:"swarm",294:"swarm",295:"swarm",
    296:"thickfat",297:"thickfat",
    298:"filter",299:"filter",
    300:"technician",301:"technician",
    302:"hustle",303:"intimidate",
    304:"filter",305:"filter",306:"filter",
    307:"hugepower",308:"hugepower",
    309:"static",310:"static",
    311:"swarm",312:"swarm",313:"swarm",314:"swarm",
    315:"chlorophyll",316:"poisonpoint",317:"poisonpoint",
    318:"sheerforce",319:"speedboost",
    320:"waterabsorb",321:"waterabsorb",
    322:"flamebody",323:"filter",
    324:"drought",   // Torkoal — Drought
    325:"thickfat",326:"thickfat",
    327:"contrary",328:"levitate",329:"levitate",330:"levitate",
    331:"poisonpoint",332:"poisonpoint",
    333:"naturalcure",334:"naturalcure",
    335:"sheerforce",336:"poisonpoint",337:"levitate",338:"levitate",
    339:"waterabsorb",340:"swiftswim",341:"adaptability",342:"adaptability",
    343:"levitate",344:"levitate",
    345:"waterabsorb",346:"waterabsorb",347:"swarm",348:"battlearmor",
    349:"swiftswim",350:"marvelscale",
    351:"adaptability",352:"adaptability",
    353:"infiltrator",354:"infiltrator",355:"levitate",356:"levitate",
    357:"chlorophyll",358:"regenerator",
    359:"sniper",360:"magicguard",
    361:"moody",362:"moody",
    363:"swiftswim",364:"swiftswim",365:"icebody",
    366:"waterabsorb",367:"swiftswim",368:"swiftswim",369:"swiftswim",
    370:"swiftswim",371:"sheerforce",372:"sheerforce",373:"moxie",
    374:"filter",375:"filter",376:"toughclaws",
    377:"filter",378:"icebody",379:"filter",
    380:"levitate",381:"levitate",
    382:"drizzle",   // Kyogre — Drizzle (not swiftswim!)
    383:"drought",   // Groudon — Drought
    384:"sheerforce",385:"naturalcure",386:"magicguard",
    // ─── Gen 4 ───
    387:"shellarmor",388:"shellarmor",389:"shellarmor", // Turtwig line — hidden: Shell Armor
    390:"ironfist",391:"ironfist",392:"ironfist",       // Chimchar line — hidden: Iron Fist
    393:"defiant",394:"defiant",395:"defiant",          // Piplup line — hidden: Defiant
    396:"keeneye",397:"keeneye",398:"sheerforce",
    399:"hustle",400:"hustle",401:"levitate",402:"levitate",
    403:"static",404:"static",405:"static",
    406:"technician",407:"technician",
    408:"filter",409:"filter",410:"filter",411:"filter",
    412:"swarm",413:"swarm",414:"swarm",415:"swarm",416:"swarm",
    417:"static",418:"swiftswim",419:"swiftswim",
    420:"chlorophyll",421:"chlorophyll",
    422:"stormdrain",423:"stormdrain",424:"technician",
    425:"levitate",426:"levitate",
    427:"hustle",428:"hustle",429:"levitate",
    430:"contrary",431:"technician",432:"truant",
    433:"levitate",434:"poisonpoint",435:"poisonpoint",
    436:"flamebody",437:"flamebody",438:"filter",
    439:"technician",440:"regenerator",
    441:"keeneye",442:"levitate",
    443:"roughskin",444:"roughskin",445:"roughskin",
    446:"thickfat",447:"hustle",448:"sheerforce",
    449:"filter",450:"sandstream",  // Hippowdon — Sand Stream
    451:"swarm",452:"sniper",453:"poisonpoint",454:"poisonpoint",
    455:"chlorophyll",456:"swiftswim",457:"swiftswim",
    458:"swiftswim",459:"snowwarning",460:"snowwarning",
    461:"technician",462:"levitate",
    463:"technician",464:"filter",
    465:"regenerator",466:"static",467:"flamebody",468:"hustle",
    469:"swarm",470:"adaptability",471:"adaptability",
    472:"poisonheal",473:"thickfat",474:"download",
    475:"magicguard",476:"filter",477:"noguard",
    478:"snowwarning",
    479:"cursedbody",480:"levitate",481:"levitate",482:"levitate",
    483:"levitate",484:"levitate",485:"flamebody",486:"slowstart",
    487:"levitate",488:"naturalcure",489:"waterabsorb",490:"waterabsorb",
    491:"levitate",492:"naturalcure",493:"adaptability",
    // ─── Gen 5 ───
    495:"contrary",496:"contrary",497:"contrary",       // Snivy line — hidden: Contrary
    498:"reckless",499:"reckless",500:"reckless",       // Tepig line — hidden: Reckless
    501:"shellarmor",502:"shellarmor",503:"shellarmor", // Oshawott line — hidden: Shell Armor
    504:"keeneye",505:"keeneye",
    506:"hustle",507:"hustle",508:"hustle",
    509:"technician",510:"technician",
    511:"chlorophyll",512:"chlorophyll",
    513:"flamebody",514:"flamebody",
    515:"hustle",516:"hustle",
    517:"naturalcure",518:"naturalcure",
    519:"keeneye",520:"keeneye",521:"sheerforce",
    522:"static",523:"static",
    524:"filter",525:"filter",526:"sheerforce",
    527:"levitate",528:"levitate",
    529:"sheerforce",530:"sheerforce",
    531:"technician",532:"sheerforce",533:"sheerforce",534:"sheerforce",
    535:"swiftswim",536:"swiftswim",537:"swiftswim",
    538:"sheerforce",539:"technician",
    540:"swarm",541:"swarm",542:"swarm",
    543:"poisonpoint",544:"poisonpoint",545:"poisonpoint",
    546:"chlorophyll",547:"chlorophyll",548:"chlorophyll",549:"chlorophyll",
    550:"swiftswim",551:"moxie",552:"moxie",553:"moxie",
    554:"flashfire",555:"zenmode",
    556:"poisonpoint",557:"filter",558:"filter",
    559:"sheerforce",560:"moxie",
    561:"levitate",562:"strongjaw",
    563:"filter",564:"battlearmor",565:"battlearmor",
    566:"moxie",567:"moxie",568:"poisonpoint",569:"poisonpoint",
    570:"technician",571:"technician",
    572:"skilllink",573:"skilllink",
    574:"magicguard",575:"magicguard",576:"magicguard",
    577:"download",578:"download",579:"download",
    580:"swiftswim",581:"swiftswim",
    582:"icebody",583:"icebody",584:"icebody",
    585:"chlorophyll",586:"sapsipper",587:"static",
    588:"swarm",589:"swarm",590:"effectspore",591:"effectspore",
    592:"waterabsorb",593:"waterabsorb",594:"swiftswim",
    595:"swarm",596:"swarm",
    597:"sheerforce",598:"sheerforce",
    599:"levitate",600:"levitate",601:"levitate",
    602:"static",603:"static",604:"static",
    605:"levitate",606:"levitate",
    607:"flamebody",608:"flamebody",609:"infiltrator",
    610:"sheerforce",611:"sheerforce",612:"sheerforce",
    613:"icebody",614:"icebody",615:"icebody",
    616:"swarm",617:"swarm",618:"static",
    619:"technician",620:"technician",621:"sheerforce",
    622:"filter",623:"filter",
    624:"technician",625:"technician",626:"sapsipper",
    627:"sheerforce",628:"sheerforce",
    629:"moxie",630:"moxie",631:"flamebody",
    632:"hustle",633:"hustle",634:"hustle",635:"hustle",
    636:"flamebody",637:"swarm",
    638:"sheerforce",639:"sheerforce",640:"sheerforce",
    641:"sheerforce",642:"static",643:"sheerforce",644:"moxie",
    645:"sheerforce",646:"multiscale",647:"swiftswim",648:"technician",649:"swarm",
    // ─── Gen 6 ───
    650:"bulletproof",651:"bulletproof",652:"bulletproof", // Chespin line — hidden: Bulletproof
    653:"magician",654:"magician",655:"magician",        // Fennekin line — hidden: Magician
    656:"protean",657:"protean",658:"protean",           // Froakie line — hidden: Protean
    659:"sheerforce",660:"sheerforce",
    661:"keeneye",662:"flamebody",663:"flamebody",
    664:"swarm",665:"poisonpoint",666:"swarm",
    667:"flamebody",668:"flamebody",
    669:"chlorophyll",670:"chlorophyll",671:"chlorophyll",
    672:"sapsipper",673:"sapsipper",
    674:"thickfat",675:"sheerforce",
    676:"furcoat",677:"magicguard",678:"magicguard",
    679:"filter",680:"filter",681:"filter",
    682:"technician",683:"technician",684:"technician",685:"technician",
    686:"levitate",687:"levitate",
    688:"filter",689:"sheerforce",
    690:"poisonpoint",691:"poisonpoint",692:"sniper",693:"megalauncher",
    694:"static",695:"static",696:"strongjaw",697:"strongjaw",
    698:"waterabsorb",699:"waterabsorb",700:"adaptability",
    701:"technician",702:"static",
    703:"levitate",704:"sheerforce",705:"sheerforce",706:"sheerforce",
    707:"technician",708:"levitate",709:"levitate",
    710:"chlorophyll",711:"chlorophyll",712:"icebody",713:"icebody",
    714:"levitate",715:"infiltrator",716:"levitate",717:"levitate",
    718:"powerconstruct",719:"filter",720:"waterabsorb",721:"flamebody",
    // ─── Gen 7 ───
    722:"longreach",723:"longreach",724:"longreach",    // Rowlet line — hidden: Long Reach
    725:"intimidate",726:"intimidate",727:"intimidate", // Litten line — hidden: Intimidate
    728:"liquidvoice",729:"liquidvoice",730:"liquidvoice", // Popplio line — hidden: Liquid Voice
    731:"sheerforce",732:"sheerforce",733:"sheerforce",734:"sheerforce",735:"sheerforce",
    736:"static",737:"static",738:"static",
    739:"waterabsorb",740:"waterabsorb",
    741:"levitate",742:"swarm",743:"swarm",
    744:"hustle",745:"hustle",746:"schooling",
    747:"poisonpoint",748:"poisonpoint",749:"stamina",750:"stamina",
    751:"waterabsorb",752:"waterabsorb",
    753:"chlorophyll",754:"chlorophyll",
    755:"levitate",756:"levitate",757:"poisonpoint",758:"flamebody",
    759:"filter",760:"filter",761:"chlorophyll",762:"chlorophyll",763:"chlorophyll",
    764:"technician",765:"technician",766:"technician",
    767:"waterabsorb",768:"waterabsorb",
    769:"levitate",770:"levitate",771:"waterabsorb",
    772:"adaptability",773:"filter",774:"levitate",
    775:"thickfat",776:"levitate",777:"levitate",778:"disguise",
    779:"waterabsorb",780:"strongjaw",
    781:"sheerforce",782:"sheerforce",783:"sheerforce",784:"sheerforce",
    785:"electricsurge",786:"psychicsurge",787:"grassysurge",788:"mistysurge", // Tapus
    789:"levitate",790:"levitate",791:"levitate",792:"levitate",
    793:"beastboost",794:"beastboost",795:"beastboost",796:"beastboost",
    797:"beastboost",798:"beastboost",799:"beastboost",
    800:"levitate",801:"naturalcure",802:"sheerforce",
    803:"beastboost",804:"beastboost",805:"beastboost",806:"beastboost",
    807:"static",808:"static",809:"filter",
    // ─── Gen 8 ───
    810:"grassysurge",811:"grassysurge",812:"grassysurge", // Grookey line — hidden: Grassy Surge
    813:"libero",814:"libero",815:"libero",              // Scorbunny line — hidden: Libero
    816:"sniper",817:"sniper",818:"sniper",              // Sobble line — hidden: Sniper
    819:"waterabsorb",820:"waterabsorb",821:"keeneye",822:"keeneye",823:"filter",
    824:"swarm",825:"levitate",826:"levitate",
    827:"technician",828:"technician",829:"chlorophyll",830:"chlorophyll",
    831:"hustle",832:"hustle",833:"waterabsorb",834:"waterabsorb",
    835:"static",836:"static",837:"sheerforce",
    838:"flamebody",839:"filter",840:"swarm",841:"swarm",842:"swarm",
    843:"filter",844:"filter",845:"waterabsorb",846:"swiftswim",847:"swiftswim",
    848:"static",849:"punkrock",850:"swarm",851:"swarm",
    852:"sheerforce",853:"sheerforce",854:"cursedbody",855:"cursedbody",
    856:"levitate",857:"cursedbody",858:"cursedbody",
    859:"moxie",860:"moxie",861:"moxie",862:"moxie",
    863:"technician",864:"filter",865:"technician",
    866:"adaptability",867:"levitate",868:"technician",869:"technician",
    870:"sheerforce",871:"poisonpoint",872:"icebody",873:"icebody",
    874:"filter",875:"icebody",876:"naturalcure",877:"pickup",
    878:"filter",879:"filter",
    880:"sheerforce",881:"sheerforce",882:"sheerforce",883:"sheerforce",884:"sheerforce",
    885:"levitate",886:"levitate",887:"toughclaws",888:"dauntlessshield",889:"intrepidsword",
    890:"sheerforce",891:"hustle",892:"hustle",
    893:"poisonheal",894:"levitate",895:"levitate",
    896:"chillingneigh",897:"grimneigh",898:"grimneigh",
    899:"naturalcure",900:"waterabsorb",901:"waterabsorb",902:"levitate",
    903:"filter",904:"filter",905:"sheerforce",
    // ─── Gen 9 ───
    906:"protean",907:"protean",908:"protean",          // Sprigatito line — hidden: Protean
    909:"unaware",910:"unaware",911:"unaware",          // Fuecoco line — hidden: Unaware
    912:"moxie",913:"moxie",914:"moxie",                // Quaxly line — hidden: Moxie915:"sheerforce",
    916:"torrent",917:"torrent",918:"torrent",
    919:"levitate",920:"levitate",921:"chlorophyll",
    922:"levitate",923:"levitate",924:"filter",925:"filter",
    926:"filter",927:"filter",928:"filter",
    929:"swarm",930:"swarm",931:"flamebody",932:"swarm",933:"swarm",
    934:"levitate",935:"waterabsorb",936:"waterabsorb",
    937:"poisonpoint",938:"sheerforce",939:"sheerforce",
    940:"swiftswim",941:"swiftswim",942:"swiftswim",943:"swiftswim",
    944:"sheerforce",945:"sheerforce",946:"filter",947:"levitate",948:"levitate",
    949:"levitate",950:"levitate",951:"technician",952:"poisonpoint",
    953:"moxie",954:"moxie",955:"levitate",956:"levitate",957:"levitate",
    958:"levitate",959:"levitate",960:"levitate",961:"icebody",962:"icebody",
    963:"waterabsorb",964:"waterabsorb",965:"sheerforce",966:"levitate",
    967:"sheerforce",968:"sheerforce",969:"sheerforce",970:"sheerforce",
    971:"waterabsorb",972:"levitate",973:"levitate",974:"filter",975:"levitate",
    976:"levitate",977:"levitate",978:"levitate",979:"swiftswim",
    980:"sheerforce",981:"filter",982:"technician",983:"levitate",
    984:"filter",985:"chlorophyll",986:"chlorophyll",987:"chlorophyll",
    988:"waterabsorb",989:"waterabsorb",990:"filter",
    991:"sheerforce",992:"sheerforce",993:"levitate",994:"sheerforce",
    995:"sheerforce",996:"static",997:"sheerforce",998:"filter",
    999:"levitate",1000:"sheerforce",1001:"levitate",1002:"levitate",
    1003:"filter",1004:"sheerforce",
    1005:"protosynthesis",1006:"protosynthesis",1007:"protosynthesis",1008:"protosynthesis",
    1009:"protosynthesis",1010:"protosynthesis",1011:"protosynthesis",1012:"protosynthesis",
    1013:"filter",1014:"levitate",1015:"levitate",
    1016:"quarkdrive",1017:"quarkdrive",1018:"quarkdrive",1019:"quarkdrive",
    1020:"quarkdrive",1021:"quarkdrive",1022:"levitate",1023:"sheerforce",
    1024:"quarkdrive",1025:"quarkdrive"
  };

  // ── TYPE-BASED ABILITY FALLBACK ──────────────────────────────────────────
  // For any Pokémon not in DEX_ABILITY, look up its type in the game's DEX array
  // and assign a sensible ability based on primary type.
  var TYPE_ABILITY = {
    fire:'flashfire', water:'waterabsorb', electric:'voltabsorb',
    grass:'chlorophyll', ice:'icebody', fighting:'sheerforce',
    poison:'poisonpoint', ground:'filter', flying:'levitate',
    psychic:'magicguard', bug:'swarm', rock:'filter',
    ghost:'levitate', dragon:'sheerforce', dark:'moxie',
    steel:'filter', normal:'adaptability', fairy:'magicguard'
  };

  function getAbilityForDex(dex) {
    if (DEX_ABILITY[dex]) return DEX_ABILITY[dex];
    var ps = window.__PS;
    if (!ps || !ps.DEX) return null;
    for (var i = 0; i < ps.DEX.length; i++) {
      var e = ps.DEX[i];
      if (e && e.dex === dex) {
        var types = e.types || [];
        var t = (Array.isArray(types) ? types[0] : (types || '')).toLowerCase();
        return TYPE_ABILITY[t] || 'adaptability';
      }
    }
    return null;
  }

  // ── STATE ────────────────────────────────────────────────────────────────
  var state = {
    running: false, ability: null, player: null, dex: null,
    weather: null,  // 'rain' | 'sun' | 'sand' | 'hail' | null
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

  // Read the game's own weather system.
  // Returns 'rain' | 'sun' | 'sand' | 'hail' | null
  function gameWeather() {
    var W = PS() && PS().Weather;
    if (!W || !W.current) return null;
    var k = W.current.kind || '';
    if (k === 'rain' || k === 'storm')  return 'rain';
    if (k === 'sun'  || k === 'harsh')  return 'sun';
    if (k === 'sand')                   return 'sand';
    if (k === 'snow' || k === 'hail')   return 'hail';
    return null;
  }

  // Force the game's weather for the duration of the run.
  // Falls back to state.weather if the API isn't available.
  var WEATHER_DUR = 9999; // seconds — effectively the whole run
  function forceWeather(kind) {
    state.weather = kind; // local fallback
    var W = PS() && PS().Weather;
    if (W && typeof W.force === 'function') {
      W.force(kind, WEATHER_DUR);
    }
  }

  // Best-effort weather: prefer real game weather, fall back to what we set.
  function weather() {
    return gameWeather() || state.weather;
  }

  // ── RUN START / END ──────────────────────────────────────────────────────
  function startRun(p) {
    var mon = p.mon;
    var dex = mon && (mon.dex || mon.skin || 0);
    var ab  = getAbilityForDex(dex);

    state.running = true; state.ability = ab; state.player = p; state.dex = dex;
    state.weather = null;
    state.lastKills = p.kills || 0; state.lastHp = p.hp;
    state.lastX = p.x; state.lastY = p.y;
    state.lastMoveTime = now(); state.runStart = now();
    state.moxieBoost = 0; state.moxieAtk = 1; state.beastBoostKills = 0;
    state.grimNeighBoost = 0; state.speedBoosted = false; state.speedBurstEnd = 0;
    state.moodyTimer = now() + 10; state.moodyLast = null; state.moodyLastStat = null;
    state.zenModeActive = false; state.zenModeApplied = false;
    state.powerConstructFired = false; state.schoolingActive = null;
    state.solarPowerActive = false;
    state.unburdenItem = p.item || null; // item held at run start
    state.unburdenTriggered = false;
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
    console.log('[PokéAbility] ' + (mon && mon.name) + ' (#' + dex + '): ' + ab + (state.weather ? ' [' + state.weather + ']' : ''));
    applyRunStart(p, ab);
  }

  function endRun() { state.running = false; state.ability = null; state.player = null; }

  // ── APPLY RUN-START PASSIVES ─────────────────────────────────────────────
  function applyRunStart(p, ab) {
    switch (ab) {
      // ── Starter type threshold (applied in tick) ─────────────────────────
      case 'overgrow': case 'blaze': case 'torrent': case 'swarm': break;

      // ── Weather setters ──────────────────────────────────────────────────
      // Setting weather also gives an immediate boost since it only benefits
      // the setter in single-player (team synergy in multiplayer is a bonus).
      case 'drizzle':
        forceWeather('rain');    // sets state.weather + calls Weather.force()
        p.spdMul    *= 1.3;      // rain speeds things up
        p.regenFlat += 0.5;      // gentle rain heals
        break;
      case 'drought':
        forceWeather('sun');
        p.atkMul *= 1.3;         // intense sunlight powers up
        p.cdMul  *= 0.9;         // fire-fast in harsh sun
        break;
      case 'sandstream':
        forceWeather('sand');
        p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.20); // sandstorm armor
        break;
      case 'snowwarning':
        forceWeather('hail');
        p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.10); // ice defense
        p.regenFlat += 0.5;      // healing snow
        break;

      // ── Terrain setters ─────────────────────────────────────────────────
      // Like weather setters — push terrain into the game's Weather system.
      case 'electricsurge':
        forceWeather('electric');
        p.atkMul *= 1.3; p.spdMul *= 1.1;      // Electric terrain amps up attackers
        break;
      case 'grassysurge':
        forceWeather('grassy');
        p.regenFlat += 1.0;                     // Grassy terrain heals (game handles it too)
        p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.10);
        break;
      case 'mistysurge':
        forceWeather('misty');
        p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.20); // Misty terrain = no status
        p.regenFlat += 0.3;
        break;
      case 'psychicsurge':
        forceWeather('psychic');
        p.atkMul *= 1.25; p.cdMul *= 0.9;      // Psychic terrain = boosted attacks, faster CDs
        break;

      // ── Weather-conditional speed ────────────────────────────────────────
      // weather() checks game's real Weather.current first, falls back to state.weather.
      // Full +50% in matching weather, modest +15% otherwise (they're still fast).
      case 'swiftswim':
        p.spdMul *= (weather() === 'rain' ? 1.5 : 1.15); break;
      case 'chlorophyll':
        p.spdMul *= (weather() === 'sun'  ? 1.5 : 1.0);  break; // no bonus outside sun
      case 'sandrush':
        p.spdMul *= (weather() === 'sand' ? 1.5 : 1.15); break;
      case 'slushrush':
        p.spdMul *= (weather() === 'hail' ? 1.5 : 1.15); break;

      // ── Attack ───────────────────────────────────────────────────────────
      case 'hugepower':    p.atkMul *= 2.0; break;
      case 'hustle':       p.atkMul *= 1.3; break;
      case 'intrepidsword':p.atkMul *= 1.15; break;
      case 'protean': case 'libero': p.atkMul *= 1.2; break;
      case 'adaptability': p.atkMul *= 1.25; break;
      case 'technician':   p.atkMul *= 1.15; break;
      case 'noguard':      p.atkMul *= 1.3; p.cdMul *= 0.85; break;
      case 'sniper':       p.atkMul *= 1.35; break; // crits deal 2.25× — buffed from 1.2
      case 'ironfist':                        // punching moves: physical Atk +20% only
        if (p.add && p.bs) p.add['atk'] = (p.add['atk'] || 0) + (p.bs['atk'] || 0) * 0.2;
        break;
      case 'defiant':                         // +2 Atk when stats lowered: physical Atk +30% only
        if (p.add && p.bs) p.add['atk'] = (p.add['atk'] || 0) + (p.bs['atk'] || 0) * 0.3;
        break;
      case 'contrary':     p.atkMul *= 1.2; p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.10); break; // debuffs become buffs
      case 'reckless':     p.atkMul *= 1.3; p.dmgReduce = Math.max(-0.15, p.dmgReduce - 0.15); break; // recoil moves
      case 'magician':                        // steal items on hit: Sp. Atk +15% only
        if (p.add && p.bs) p.add['spa'] = (p.add['spa'] || 0) + (p.bs['spa'] || 0) * 0.15;
        break;
      case 'solarpower':   break; // dynamic — tick toggles +40% atk when sun is active
      case 'infiltrator':  p.atkMul *= 1.15; break;
      case 'punkrock':     p.atkMul *= 1.2; break;
      case 'strongjaw':    p.atkMul *= 1.2; break;
      case 'megalauncher': p.atkMul *= 1.3; break;
      case 'keeneye':      p.atkMul *= 1.15; break;  // accuracy = never miss
      case 'download':     p.atkMul *= 1.25; break;  // analyze opponent
      case 'intimidate':   p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.15); break; // enemies hesitate

      // ── Sheer Force: big attack, but reckless — takes more damage ─────────
      case 'sheerforce':
        p.atkMul   *= 1.3;
        p.dmgReduce = Math.max(-0.15, p.dmgReduce - 0.15); // −15% defense (can go negative)
        break;

      // ── Speed ────────────────────────────────────────────────────────────
      case 'speedboost':  break; // burst on standing still — handled in poll
      case 'levitate':    p.spdMul *= 1.15; break;
      case 'earlybird':   p.spdMul *= 1.15; break;
      case 'unburden':    break; // tick: speed +40% once item is consumed
      case 'longreach':   p.spdMul *= 1.1; p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.10); break;

      // ── Defense / survivability ──────────────────────────────────────────
      case 'dauntlessshield': p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.15); break;
      case 'shellarmor':  p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.15); break; // no crits
      case 'bulletproof': p.defBonus = (p.defBonus || 0) + 0.5; break; // SpDef +50% via defBonus (same as game's berry system)
      case 'damp':        p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.15); break; // no explosions
      case 'unaware':     p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.20); break; // ignores stat boosts
      case 'multiscale':  break; // applied dynamically when HP is full
      case 'wonderguard': p.maxHp = 1; p.hp = 1; p.dmgReduce = 0.9; break;
      case 'furcoat':     p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.25); break;
      case 'filter':      p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.20); break;
      case 'marvelscale': p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.15); break;
      case 'thickfat':    p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.15); break;
      case 'magicguard':  p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.30); break;
      case 'voltabsorb': case 'waterabsorb': case 'flashfire':
      case 'sapsipper': case 'lightningrod': case 'stormdrain':
        p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.10); break;

      // ── Regen / healing ──────────────────────────────────────────────────
      case 'poisonheal':   p.regenFlat += 1; break;
      case 'toughclaws':   p.regenFlat += 1; break;
      case 'liquidvoice':  p.regenFlat += 1; break;
      case 'raindish':     break; // dynamic — tick heals only in rain
      case 'leafguard':    p.dmgReduce = Math.min(0.75, p.dmgReduce + 0.10); p.regenFlat += 0.3; break;
      case 'naturalcure':  break; // timer in tick
      case 'dryskin':      break; // timer in tick
      case 'icebody':      break; // timer in tick
      case 'pickup':       break; // heal on kill — in tick

      // ── Cooldowns ────────────────────────────────────────────────────────
      case 'skilllink':    p.cdMul *= 0.85; break;

      // ── Complex ─────────────────────────────────────────────────────────
      case 'slowstart':
        p.atkMul *= 0.5; p.spdMul *= 0.5;
        state.slowStartRamp = { startTime: now(), done: false }; break;
      case 'truant':       p.atkMul *= 2.0; p.cdMul *= 2.0; break;
      case 'protosynthesis': case 'quarkdrive': applyProtoQuark(p); break;
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
      if (ab === 'pickup') {
        // Scavenge 2% HP per kill
        heal(p, p.maxHp * 0.02 * newKills);
      }
    }

    // ── Timer abilities ──────────────────────────────────────────────────
    if (ab === 'regenerator' && t - state.regenTimer >= 10)
      { heal(p, p.maxHp * 0.05); state.regenTimer = t; }
    if (ab === 'icebody' && t - state.regenTimer >= 15)
      { heal(p, p.maxHp * 0.05); state.regenTimer = t; }
    if (ab === 'dryskin' && t - state.regenTimer >= 10)
      { heal(p, p.maxHp * 0.10); state.regenTimer = t; }

    // Unburden: +40% Spd the moment a held item is consumed/lost
    // Track p.item each tick — also catches items picked up mid-run then consumed
    if (ab === 'unburden' && !state.unburdenTriggered) {
      var curItem = p.item || null;
      if (state._unburdenLastItem && !curItem) {
        state.unburdenTriggered = true;
        p.spdMul *= 1.4;
      }
      state._unburdenLastItem = curItem; // update every tick
    }

    // Solar Power: +40% Atk only while sun is active — toggle on/off as weather changes
    if (ab === 'solarpower') {
      var inSun = (weather() === 'sun');
      if (inSun && !state.solarPowerActive)  { state.solarPowerActive = true;  p.atkMul *= 1.4; }
      if (!inSun && state.solarPowerActive)  { state.solarPowerActive = false; p.atkMul /= 1.4; }
    }

    // Rain Dish: heal every 5s only while rain is active
    if (ab === 'raindish' && weather() === 'rain' && t - state.regenTimer >= 5)
      { heal(p, p.maxHp * 0.025); state.regenTimer = t; }
    if (ab === 'naturalcure' && t - state.regenTimer >= 20)
      { heal(p, p.maxHp * 0.02); state.regenTimer = t; }
    if (ab === 'poisonheal' && t - state.regenTimer >= 5)
      { heal(p, p.maxHp * 0.025); state.regenTimer = t; }

    if (ab === 'moody' && t > state.moodyTimer) {
      var mStats = ['atkMul', 'spdMul', 'cdMul'];
      if (state.moodyLast) {
        p[state.moodyLast.up] /= 1.20;
        if (state.moodyLast.dn === 'cdMul') p[state.moodyLast.dn] /= 1.10;
        else                                p[state.moodyLast.dn] /= 0.90;
      }
      var mPick = Math.floor(Math.random() * 3);
      var mDnPick = (mPick + 1 + Math.floor(Math.random() * 2)) % 3;
      var mUp = mStats[mPick], mDn = mStats[mDnPick];
      p[mUp] *= 1.20;
      if (mDn === 'cdMul') p[mDn] *= 1.10;
      else                 p[mDn] *= 0.90;
      state.moodyLast = { up: mUp, dn: mDn };
      state.moodyTimer = t + 10;
    }

    // Speed Boost: standing still 2s → +80% SPD burst for 3s
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

    // Hit detection: invuln transitions from 0 → positive means a hit just landed
    var tookHit = p.invuln > 0 && state.lastInvuln <= 0;

    // Disguise: once per 60s, fully negate one hit
    if (ab === 'disguise') {
      if (tookHit && state.disguiseUp && t > state.disguiseNextAllow) {
        heal(p, 999); state.disguiseUp = false; state.disguiseNextAllow = t + 60;
      }
      if (!state.disguiseUp && t > state.disguiseNextAllow) state.disguiseUp = true;
    }

    // Battle Armor: 20% chance to heal ~one hit's worth on each hit
    if (ab === 'battlearmor') {
      if (tookHit && Math.random() < 0.20) heal(p, p.maxHp * 0.10);
    }

    // Stamina: each hit +1% dmgReduce up to 50%
    if (ab === 'stamina') {
      if (tookHit) p.dmgReduce = Math.min(0.50, p.dmgReduce + 0.01);
    }

    state.lastInvuln = p.invuln;  // update once, shared by all hit-detection abilities

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
          var rsDmg = Math.max(1, (en.maxHp || en.hp || 100) * 0.05);
          if (typeof en.takeDamage === 'function') en.takeDamage(rsDmg);
          else en.hp -= rsDmg;
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
    } else if (state.running && g.state === 'dead') {
      // Only end the run on actual death — not pause, win, lobby, etc.
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
