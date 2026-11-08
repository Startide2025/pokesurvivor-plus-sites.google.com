// PS Mod: Ability Display
// Shows a Pokémon's ability name + description in the dex detail panel,
// injected ABOVE the stats block whenever a Pokémon is selected.
// Falls back to a type-based ability for Pokémon not in the DEX map.
(function () {
  'use strict';

  // ── DEX → ABILITY (same map as abilities.js) ─────────────────────────────
  var DEX_ABILITY = {
    1:"chlorophyll",2:"chlorophyll",3:"chlorophyll",4:"solarpower",5:"solarpower",6:"solarpower",
    7:"raindish",8:"raindish",9:"raindish",
    10:"swarm",11:"swarm",12:"swarm",13:"swarm",14:"swarm",15:"swarm",
    16:"keeneye",17:"keeneye",18:"keeneye",19:"hustle",20:"hustle",
    21:"keeneye",22:"sniper",23:"poisonpoint",24:"poisonpoint",
    25:"static",26:"lightningrod",27:"sandrush",28:"sandrush",
    29:"hustle",30:"hustle",31:"sheerforce",32:"hustle",33:"hustle",34:"sheerforce",
    35:"magicguard",36:"magicguard",37:"flashfire",38:"drought",
    39:"thickfat",40:"thickfat",41:"poisonpoint",42:"poisonpoint",
    43:"chlorophyll",44:"chlorophyll",45:"chlorophyll",
    46:"effectspore",47:"effectspore",48:"swarm",49:"swarm",
    50:"sheerforce",51:"sheerforce",52:"technician",53:"technician",
    54:"swiftswim",55:"swiftswim",56:"moxie",57:"moxie",
    58:"flashfire",59:"flashfire",60:"swiftswim",61:"swiftswim",62:"swiftswim",
    63:"magicguard",64:"magicguard",65:"magicguard",
    66:"noguard",67:"noguard",68:"noguard",
    69:"chlorophyll",70:"chlorophyll",71:"chlorophyll",
    72:"icebody",73:"icebody",74:"filter",75:"filter",76:"filter",
    77:"flashfire",78:"flashfire",79:"regenerator",80:"regenerator",
    81:"voltabsorb",82:"voltabsorb",83:"technician",
    84:"earlybird",85:"earlybird",86:"icebody",87:"icebody",
    88:"poisonpoint",89:"poisonpoint",90:"skilllink",91:"skilllink",
    92:"levitate",93:"levitate",94:"cursedbody",95:"filter",
    96:"magicguard",97:"magicguard",98:"sheerforce",99:"sheerforce",
    100:"static",101:"static",102:"chlorophyll",103:"chlorophyll",
    104:"battlearmor",105:"levitate",
    106:"sheerforce",107:"technician",108:"thickfat",
    109:"levitate",110:"levitate",111:"filter",112:"filter",
    113:"naturalcure",114:"regenerator",115:"sheerforce",
    116:"swiftswim",117:"swiftswim",118:"swiftswim",119:"swiftswim",
    120:"naturalcure",121:"naturalcure",122:"filter",123:"technician",
    124:"dryskin",125:"static",126:"flamebody",127:"moxie",128:"sheerforce",
    129:"swiftswim",130:"moxie",131:"waterabsorb",132:"adaptability",
    133:"adaptability",134:"waterabsorb",135:"voltabsorb",136:"flashfire",
    137:"download",138:"swiftswim",139:"swiftswim",
    140:"battlearmor",141:"battlearmor",142:"sheerforce",143:"thickfat",
    144:"icebody",145:"static",146:"flamebody",
    147:"multiscale",148:"multiscale",149:"multiscale",
    150:"magicguard",151:"technician",
    152:"leafguard",153:"leafguard",154:"leafguard",
    155:"flashfire",156:"flashfire",157:"flashfire",158:"sheerforce",159:"sheerforce",160:"sheerforce",
    161:"hustle",162:"hustle",163:"keeneye",164:"keeneye",
    165:"swarm",166:"swarm",167:"poisonpoint",168:"poisonpoint",169:"levitate",
    170:"voltabsorb",171:"voltabsorb",172:"static",173:"magicguard",174:"hustle",
    175:"hustle",176:"hustle",177:"magicguard",178:"magicguard",
    179:"static",180:"static",181:"static",182:"chlorophyll",
    183:"hugepower",184:"hugepower",185:"filter",186:"drizzle",
    187:"chlorophyll",188:"chlorophyll",189:"chlorophyll",
    190:"technician",191:"chlorophyll",192:"chlorophyll",
    193:"swarm",194:"swarm",195:"waterabsorb",196:"adaptability",197:"adaptability",
    198:"moxie",199:"regenerator",200:"levitate",201:"levitate",202:"battlearmor",
    203:"keeneye",204:"swarm",205:"swarm",206:"regenerator",207:"poisonheal",
    208:"filter",209:"intimidate",210:"intimidate",211:"poisonpoint",
    212:"technician",213:"filter",214:"moxie",215:"technician",
    216:"thickfat",217:"thickfat",218:"flamebody",219:"flamebody",
    220:"thickfat",221:"thickfat",222:"naturalcure",223:"moody",224:"sniper",
    225:"hustle",226:"swiftswim",227:"filter",228:"flashfire",229:"flashfire",
    230:"swiftswim",231:"filter",232:"filter",233:"download",234:"intimidate",
    235:"technician",236:"technician",237:"technician",238:"magicguard",
    239:"static",240:"flamebody",241:"sapsipper",242:"naturalcure",
    243:"voltabsorb",244:"flashfire",245:"swiftswim",
    246:"roughskin",247:"roughskin",248:"sandstream",249:"multiscale",
    250:"regenerator",251:"naturalcure",
    252:"unburden",253:"unburden",254:"unburden",
    255:"speedboost",256:"speedboost",257:"speedboost",
    258:"damp",259:"damp",260:"damp",
    261:"moxie",262:"moxie",263:"keeneye",264:"keeneye",
    265:"swarm",266:"swarm",267:"swarm",268:"swarm",269:"swarm",
    270:"waterabsorb",271:"waterabsorb",272:"icebody",
    273:"chlorophyll",274:"chlorophyll",275:"chlorophyll",
    276:"keeneye",277:"keeneye",278:"swiftswim",279:"drizzle",
    280:"magicguard",281:"magicguard",282:"magicguard",
    283:"swarm",284:"flamebody",285:"effectspore",286:"poisonheal",
    287:"truant",288:"sheerforce",289:"truant",
    290:"swarm",291:"speedboost",292:"wonderguard",
    293:"swarm",294:"swarm",295:"swarm",296:"thickfat",297:"thickfat",
    298:"filter",299:"filter",300:"technician",301:"technician",
    302:"hustle",303:"intimidate",304:"filter",305:"filter",306:"filter",
    307:"hugepower",308:"hugepower",309:"static",310:"static",
    311:"swarm",312:"swarm",313:"swarm",314:"swarm",
    315:"chlorophyll",316:"poisonpoint",317:"poisonpoint",
    318:"sheerforce",319:"speedboost",320:"waterabsorb",321:"waterabsorb",
    322:"flamebody",323:"filter",324:"drought",325:"thickfat",326:"thickfat",
    327:"contrary",328:"levitate",329:"levitate",330:"levitate",
    331:"poisonpoint",332:"poisonpoint",333:"naturalcure",334:"naturalcure",
    335:"sheerforce",336:"poisonpoint",337:"levitate",338:"levitate",
    339:"waterabsorb",340:"swiftswim",341:"adaptability",342:"adaptability",
    343:"levitate",344:"levitate",345:"waterabsorb",346:"waterabsorb",
    347:"swarm",348:"battlearmor",349:"swiftswim",350:"marvelscale",
    351:"adaptability",352:"adaptability",353:"infiltrator",354:"infiltrator",
    355:"levitate",356:"levitate",357:"chlorophyll",358:"regenerator",
    359:"sniper",360:"magicguard",361:"moody",362:"moody",
    363:"swiftswim",364:"swiftswim",365:"icebody",
    366:"waterabsorb",367:"swiftswim",368:"swiftswim",369:"swiftswim",
    370:"swiftswim",371:"sheerforce",372:"sheerforce",373:"moxie",
    374:"filter",375:"filter",376:"toughclaws",377:"filter",378:"icebody",379:"filter",
    380:"levitate",381:"levitate",382:"drizzle",383:"drought",
    384:"sheerforce",385:"naturalcure",386:"magicguard",
    387:"shellarmor",388:"shellarmor",389:"shellarmor",
    390:"ironfist",391:"ironfist",392:"ironfist",393:"defiant",394:"defiant",395:"defiant",
    396:"keeneye",397:"keeneye",398:"sheerforce",399:"hustle",400:"hustle",
    401:"levitate",402:"levitate",403:"static",404:"static",405:"static",
    406:"technician",407:"technician",408:"filter",409:"filter",410:"filter",411:"filter",
    412:"swarm",413:"swarm",414:"swarm",415:"swarm",416:"swarm",
    417:"static",418:"swiftswim",419:"swiftswim",420:"chlorophyll",421:"chlorophyll",
    422:"stormdrain",423:"stormdrain",424:"technician",425:"levitate",426:"levitate",
    427:"hustle",428:"hustle",429:"levitate",430:"contrary",431:"technician",432:"truant",
    433:"levitate",434:"poisonpoint",435:"poisonpoint",436:"flamebody",437:"flamebody",
    438:"filter",439:"technician",440:"regenerator",441:"keeneye",442:"levitate",
    443:"roughskin",444:"roughskin",445:"roughskin",446:"thickfat",447:"hustle",
    448:"sheerforce",449:"filter",450:"sandstream",451:"swarm",452:"sniper",
    453:"poisonpoint",454:"poisonpoint",455:"chlorophyll",456:"swiftswim",457:"swiftswim",
    458:"swiftswim",459:"snowwarning",460:"snowwarning",461:"technician",462:"levitate",
    463:"technician",464:"filter",465:"regenerator",466:"static",467:"flamebody",
    468:"hustle",469:"swarm",470:"adaptability",471:"adaptability",472:"poisonheal",
    473:"thickfat",474:"download",475:"magicguard",476:"filter",477:"noguard",
    478:"snowwarning",479:"cursedbody",480:"levitate",481:"levitate",482:"levitate",
    483:"levitate",484:"levitate",485:"flamebody",486:"slowstart",
    487:"levitate",488:"naturalcure",489:"waterabsorb",490:"waterabsorb",
    491:"levitate",492:"naturalcure",493:"adaptability",
    495:"contrary",496:"contrary",497:"contrary",498:"reckless",499:"reckless",500:"reckless",
    501:"shellarmor",502:"shellarmor",503:"shellarmor",504:"keeneye",505:"keeneye",
    506:"hustle",507:"hustle",508:"hustle",509:"technician",510:"technician",
    511:"chlorophyll",512:"chlorophyll",513:"flamebody",514:"flamebody",
    515:"hustle",516:"hustle",517:"naturalcure",518:"naturalcure",
    519:"keeneye",520:"keeneye",521:"sheerforce",522:"static",523:"static",
    524:"filter",525:"filter",526:"sheerforce",527:"levitate",528:"levitate",
    529:"sheerforce",530:"sheerforce",531:"technician",
    532:"sheerforce",533:"sheerforce",534:"sheerforce",
    535:"swiftswim",536:"swiftswim",537:"swiftswim",538:"sheerforce",539:"technician",
    540:"swarm",541:"swarm",542:"swarm",543:"poisonpoint",544:"poisonpoint",545:"poisonpoint",
    546:"chlorophyll",547:"chlorophyll",548:"chlorophyll",549:"chlorophyll",
    550:"swiftswim",551:"moxie",552:"moxie",553:"moxie",554:"flashfire",555:"zenmode",
    556:"poisonpoint",557:"filter",558:"filter",559:"sheerforce",560:"moxie",
    561:"levitate",562:"strongjaw",563:"filter",564:"battlearmor",565:"battlearmor",
    566:"moxie",567:"moxie",568:"poisonpoint",569:"poisonpoint",
    570:"technician",571:"technician",572:"skilllink",573:"skilllink",
    574:"magicguard",575:"magicguard",576:"magicguard",
    577:"download",578:"download",579:"download",
    580:"swiftswim",581:"swiftswim",582:"icebody",583:"icebody",584:"icebody",
    585:"chlorophyll",586:"sapsipper",587:"static",588:"swarm",589:"swarm",
    590:"effectspore",591:"effectspore",592:"waterabsorb",593:"waterabsorb",
    594:"swiftswim",595:"swarm",596:"swarm",597:"sheerforce",598:"sheerforce",
    599:"levitate",600:"levitate",601:"levitate",602:"static",603:"static",604:"static",
    605:"levitate",606:"levitate",607:"flamebody",608:"flamebody",609:"infiltrator",
    610:"sheerforce",611:"sheerforce",612:"sheerforce",613:"icebody",614:"icebody",615:"icebody",
    616:"swarm",617:"swarm",618:"static",619:"technician",620:"technician",621:"sheerforce",
    622:"filter",623:"filter",624:"technician",625:"technician",626:"sapsipper",
    627:"sheerforce",628:"sheerforce",629:"moxie",630:"moxie",631:"flamebody",
    632:"hustle",633:"hustle",634:"hustle",635:"hustle",636:"flamebody",637:"swarm",
    638:"sheerforce",639:"sheerforce",640:"sheerforce",641:"sheerforce",642:"static",
    643:"sheerforce",644:"moxie",645:"sheerforce",646:"multiscale",647:"swiftswim",
    648:"technician",649:"swarm",
    650:"bulletproof",651:"bulletproof",652:"bulletproof",653:"magician",654:"magician",655:"magician",
    656:"protean",657:"protean",658:"protean",659:"sheerforce",660:"sheerforce",
    661:"keeneye",662:"flamebody",663:"flamebody",664:"swarm",665:"poisonpoint",666:"swarm",
    667:"flamebody",668:"flamebody",669:"chlorophyll",670:"chlorophyll",671:"chlorophyll",
    672:"sapsipper",673:"sapsipper",674:"thickfat",675:"sheerforce",676:"furcoat",
    677:"magicguard",678:"magicguard",679:"filter",680:"filter",681:"filter",
    682:"technician",683:"technician",684:"technician",685:"technician",
    686:"levitate",687:"levitate",688:"filter",689:"sheerforce",
    690:"poisonpoint",691:"poisonpoint",692:"sniper",693:"megalauncher",
    694:"static",695:"static",696:"strongjaw",697:"strongjaw",
    698:"waterabsorb",699:"waterabsorb",700:"adaptability",701:"technician",702:"static",
    703:"levitate",704:"sheerforce",705:"sheerforce",706:"sheerforce",
    707:"technician",708:"levitate",709:"levitate",710:"chlorophyll",711:"chlorophyll",
    712:"icebody",713:"icebody",714:"levitate",715:"infiltrator",716:"levitate",717:"levitate",
    718:"powerconstruct",719:"filter",720:"waterabsorb",721:"flamebody",
    722:"longreach",723:"longreach",724:"longreach",725:"intimidate",726:"intimidate",727:"intimidate",
    728:"liquidvoice",729:"liquidvoice",730:"liquidvoice",
    731:"sheerforce",732:"sheerforce",733:"sheerforce",734:"sheerforce",735:"sheerforce",
    736:"static",737:"static",738:"static",739:"waterabsorb",740:"waterabsorb",
    741:"levitate",742:"swarm",743:"swarm",744:"hustle",745:"hustle",746:"schooling",
    747:"poisonpoint",748:"poisonpoint",749:"stamina",750:"stamina",
    751:"waterabsorb",752:"waterabsorb",753:"chlorophyll",754:"chlorophyll",
    755:"levitate",756:"levitate",757:"poisonpoint",758:"flamebody",
    759:"filter",760:"filter",761:"chlorophyll",762:"chlorophyll",763:"chlorophyll",
    764:"technician",765:"technician",766:"technician",767:"waterabsorb",768:"waterabsorb",
    769:"levitate",770:"levitate",771:"waterabsorb",772:"adaptability",773:"filter",
    774:"levitate",775:"thickfat",776:"levitate",777:"levitate",778:"disguise",
    779:"waterabsorb",780:"strongjaw",781:"sheerforce",782:"sheerforce",
    783:"sheerforce",784:"sheerforce",785:"electricsurge",786:"psychicsurge",787:"grassysurge",
    788:"mistysurge",789:"levitate",790:"levitate",791:"levitate",792:"levitate",
    793:"beastboost",794:"beastboost",795:"beastboost",796:"beastboost",
    797:"beastboost",798:"beastboost",799:"beastboost",
    800:"levitate",801:"naturalcure",802:"sheerforce",
    803:"beastboost",804:"beastboost",805:"beastboost",806:"beastboost",
    807:"static",808:"static",809:"filter",
    810:"grassysurge",811:"grassysurge",812:"grassysurge",813:"libero",814:"libero",815:"libero",
    816:"sniper",817:"sniper",818:"sniper",819:"waterabsorb",820:"waterabsorb",
    821:"keeneye",822:"keeneye",823:"filter",824:"swarm",825:"levitate",826:"levitate",
    827:"technician",828:"technician",829:"chlorophyll",830:"chlorophyll",
    831:"hustle",832:"hustle",833:"waterabsorb",834:"waterabsorb",
    835:"static",836:"static",837:"sheerforce",838:"flamebody",839:"filter",
    840:"swarm",841:"swarm",842:"swarm",843:"filter",844:"filter",
    845:"waterabsorb",846:"swiftswim",847:"swiftswim",848:"static",849:"punkrock",
    850:"swarm",851:"swarm",852:"sheerforce",853:"sheerforce",
    854:"cursedbody",855:"cursedbody",856:"levitate",857:"cursedbody",858:"cursedbody",
    859:"moxie",860:"moxie",861:"moxie",862:"moxie",863:"technician",864:"filter",
    865:"technician",866:"adaptability",867:"levitate",868:"technician",869:"technician",
    870:"sheerforce",871:"poisonpoint",872:"icebody",873:"icebody",874:"filter",
    875:"icebody",876:"naturalcure",877:"pickup",878:"filter",879:"filter",
    880:"sheerforce",881:"sheerforce",882:"sheerforce",883:"sheerforce",884:"sheerforce",
    885:"levitate",886:"levitate",887:"toughclaws",888:"dauntlessshield",889:"intrepidsword",
    890:"sheerforce",891:"hustle",892:"hustle",893:"poisonheal",894:"levitate",895:"levitate",
    896:"chillingneigh",897:"grimneigh",898:"grimneigh",
    899:"naturalcure",900:"waterabsorb",901:"waterabsorb",902:"levitate",
    903:"filter",904:"filter",905:"sheerforce",
    906:"protean",907:"protean",908:"protean",909:"unaware",910:"unaware",911:"unaware",
    912:"moxie",913:"moxie",914:"moxie",915:"sheerforce",
    916:"torrent",917:"torrent",918:"torrent",919:"levitate",920:"levitate",
    921:"chlorophyll",922:"levitate",923:"levitate",924:"filter",925:"filter",
    926:"filter",927:"filter",928:"filter",929:"swarm",930:"swarm",931:"flamebody",
    932:"swarm",933:"swarm",934:"levitate",935:"waterabsorb",936:"waterabsorb",
    937:"poisonpoint",938:"sheerforce",939:"sheerforce",940:"swiftswim",941:"swiftswim",
    942:"swiftswim",943:"swiftswim",944:"sheerforce",945:"sheerforce",946:"filter",
    947:"levitate",948:"levitate",949:"levitate",950:"levitate",951:"technician",
    952:"poisonpoint",953:"moxie",954:"moxie",955:"levitate",956:"levitate",
    957:"levitate",958:"levitate",959:"levitate",960:"levitate",961:"icebody",962:"icebody",
    963:"waterabsorb",964:"waterabsorb",965:"sheerforce",966:"levitate",
    967:"sheerforce",968:"sheerforce",969:"sheerforce",970:"sheerforce",
    971:"waterabsorb",972:"levitate",973:"levitate",974:"filter",975:"levitate",
    976:"levitate",977:"levitate",978:"levitate",979:"swiftswim",
    980:"sheerforce",981:"filter",982:"technician",983:"levitate",984:"filter",
    985:"chlorophyll",986:"chlorophyll",987:"chlorophyll",988:"waterabsorb",989:"waterabsorb",
    990:"filter",991:"sheerforce",992:"sheerforce",993:"levitate",994:"sheerforce",
    995:"sheerforce",996:"static",997:"sheerforce",998:"filter",999:"levitate",
    1000:"sheerforce",1001:"levitate",1002:"levitate",1003:"filter",1004:"sheerforce",
    1005:"protosynthesis",1006:"protosynthesis",1007:"protosynthesis",1008:"protosynthesis",
    1009:"protosynthesis",1010:"protosynthesis",1011:"protosynthesis",1012:"protosynthesis",
    1013:"filter",1014:"levitate",1015:"levitate",
    1016:"quarkdrive",1017:"quarkdrive",1018:"quarkdrive",1019:"quarkdrive",
    1020:"quarkdrive",1021:"quarkdrive",1022:"levitate",1023:"sheerforce",
    1024:"quarkdrive",1025:"quarkdrive"
  };

  // ── Type-based fallback ───────────────────────────────────────────────────
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

  // ── Ability display names + descriptions ─────────────────────────────────
  var ABILITY_INFO = {
    // Starters
    overgrow:        { name: 'Overgrow',         desc: 'Below 33% HP: +50% Attack.' },
    blaze:           { name: 'Blaze',             desc: 'Below 33% HP: +50% Attack.' },
    torrent:         { name: 'Torrent',           desc: 'Below 33% HP: +50% Attack.' },
    swarm:           { name: 'Swarm',             desc: 'Below 33% HP: +50% Attack.' },
    // Contact
    static:          { name: 'Static',            desc: 'Enemies that touch you are stunned for 2s.' },
    flamebody:       { name: 'Flame Body',        desc: 'Enemies that touch you are burned.' },
    poisonpoint:     { name: 'Poison Point',      desc: 'Enemies that touch you are poisoned for 5s.' },
    effectspore:     { name: 'Effect Spore',      desc: 'Contact: 33% chance each of stun, poison, or slow.' },
    roughskin:       { name: 'Rough Skin',        desc: 'Enemies that touch you lose 5% of their max HP.' },
    cursedbody:      { name: 'Cursed Body',       desc: 'Enemies that hit you are slowed 20% for 3s.' },
    // Attack
    hugepower:       { name: 'Huge Power',        desc: 'Attack ×2.' },
    hustle:          { name: 'Hustle',            desc: 'Attack +30%.' },
    intrepidsword:   { name: 'Intrepid Sword',    desc: 'Attack +15%.' },
    protean:         { name: 'Protean',           desc: 'STAB on all moves: Attack +20%.' },
    libero:          { name: 'Libero',            desc: 'STAB on all moves: Attack +20%.' },
    adaptability:    { name: 'Adaptability',      desc: 'Enhanced STAB: Attack +25%.' },
    technician:      { name: 'Technician',        desc: 'Fast moves hit harder: Attack +15%.' },
    noguard:         { name: 'No Guard',          desc: 'Attack +30%, cooldowns −15%.' },
    sniper:          { name: 'Sniper',            desc: 'Critical hits deal 2.25×: Attack +35%.' },
    ironfist:        { name: 'Iron Fist',         desc: 'Punching moves boosted: Physical Attack +20% (Sp. Atk unaffected).' },
    defiant:         { name: 'Defiant',           desc: 'Stat drops trigger defiance: Physical Attack +30% (Sp. Atk unaffected).' },
    contrary:        { name: 'Contrary',          desc: 'Debuffs flip to buffs: Attack +20%, Damage reduction +10%.' },
    reckless:        { name: 'Reckless',          desc: 'Recoil moves boosted: Attack +30%, but −15% defense.' },
    magician:        { name: 'Magician',          desc: 'Steals items on hit: Sp. Attack +15% (physical Atk unaffected).' },
    solarpower:      { name: 'Solar Power',       desc: 'In Sun: Attack +40% (dynamic — activates and deactivates with weather).' },
    unburden:        { name: 'Unburden',          desc: 'Speed +40% the moment your held item is consumed.' },
    longreach:       { name: 'Long Reach',        desc: 'No contact avoids recoil: Speed +10%, Damage reduction +10%.' },
    shellarmor:      { name: 'Shell Armor',       desc: 'Negates critical hits: Damage reduction +15%.' },
    bulletproof:     { name: 'Bulletproof',       desc: 'Immune to ball and bomb moves: Sp. Defense +50%.' },
    damp:            { name: 'Damp',              desc: 'Prevents explosions: Damage reduction +15%.' },
    unaware:         { name: 'Unaware',           desc: 'Ignores foe\'s stat boosts: Damage reduction +20%.' },
    infiltrator:     { name: 'Infiltrator',       desc: 'Pierces barriers: Attack +15%.' },
    punkrock:        { name: 'Punk Rock',         desc: 'Sound moves boosted: Attack +20%.' },
    strongjaw:       { name: 'Strong Jaw',        desc: 'Bite moves boosted: Attack +20%.' },
    megalauncher:    { name: 'Mega Launcher',     desc: 'Projectile moves boosted: Attack +30%.' },
    keeneye:         { name: 'Keen Eye',          desc: 'Never misses: Attack +15%.' },
    download:        { name: 'Download',          desc: 'Analyzes opponent: Attack +25%.' },
    intimidate:      { name: 'Intimidate',        desc: 'Enemies hesitate: Damage reduction +15%.' },
    // Sheer Force has a drawback
    sheerforce:      { name: 'Sheer Force',       desc: 'Attack +30%, but −15% defense (reckless).' },
    // Speed
    swiftswim:       { name: 'Swift Swim',        desc: 'In Rain: Speed +50%. Otherwise: Speed +15%.' },
    chlorophyll:     { name: 'Chlorophyll',       desc: 'In Sun: Speed +50%. Otherwise: Speed +15%.' },
    sandrush:        { name: 'Sand Rush',         desc: 'In Sand: Speed +50%. Otherwise: Speed +15%.' },
    slushrush:       { name: 'Slush Rush',        desc: 'In Hail: Speed +50%. Otherwise: Speed +15%.' },
    speedboost:      { name: 'Speed Boost',       desc: 'Stand still 2s: burst +80% Speed for 3s.' },
    levitate:        { name: 'Levitate',          desc: 'Speed +15%.' },
    earlybird:       { name: 'Early Bird',        desc: 'Quick reactions: Speed +15%.' },
    // Weather
    drizzle:         { name: 'Drizzle',           desc: 'Summons Rain: Speed +30%, Regen +0.5/s. Boosts Swift Swim allies.' },
    drought:         { name: 'Drought',           desc: 'Summons Sun: Attack +30%, Cooldowns −10%. Boosts Chlorophyll allies.' },
    sandstream:      { name: 'Sand Stream',       desc: 'Summons Sandstorm: Damage reduction +20%. Boosts Sand Rush allies.' },
    snowwarning:     { name: 'Snow Warning',      desc: 'Summons Hail: Damage reduction +10%, Regen +0.5/s. Boosts Slush Rush allies.' },
    // Terrain setters (Tapus)
    electricsurge:   { name: 'Electric Surge',   desc: 'Sets Electric Terrain: Attack +30%, Speed +10%. Boosts Electric moves.' },
    grassysurge:     { name: 'Grassy Surge',      desc: 'Sets Grassy Terrain: Regen +1/s, Damage reduction +10%. Heals all over time.' },
    mistysurge:      { name: 'Misty Surge',       desc: 'Sets Misty Terrain: Damage reduction +20%, Regen +0.3/s. Blocks status.' },
    psychicsurge:    { name: 'Psychic Surge',     desc: 'Sets Psychic Terrain: Attack +25%, Cooldowns −10%. Boosts Psychic moves.' },
    // Defense / survivability
    dauntlessshield: { name: 'Dauntless Shield',  desc: 'Damage reduction +15%.' },
    multiscale:      { name: 'Multiscale',        desc: 'At full HP: damage reduction +40%.' },
    wonderguard:     { name: 'Wonder Guard',      desc: '1 HP, 90% damage reduction. Extreme risk, extreme reward.' },
    furcoat:         { name: 'Fur Coat',          desc: 'Damage reduction +25%.' },
    filter:          { name: 'Filter',            desc: 'Damage reduction +20%.' },
    marvelscale:     { name: 'Marvel Scale',      desc: 'Damage reduction +15%.' },
    thickfat:        { name: 'Thick Fat',         desc: 'Bulky body: Damage reduction +15%.' },
    magicguard:      { name: 'Magic Guard',       desc: 'Zone/aura damage reduced: +30% damage reduction.' },
    voltabsorb:      { name: 'Volt Absorb',       desc: 'Electric immunity: Damage reduction +10%.' },
    waterabsorb:     { name: 'Water Absorb',      desc: 'Water immunity: Damage reduction +10%.' },
    flashfire:       { name: 'Flash Fire',        desc: 'Fire immunity: Damage reduction +10%.' },
    sapsipper:       { name: 'Sap Sipper',        desc: 'Grass immunity: Damage reduction +10%.' },
    lightningrod:    { name: 'Lightning Rod',     desc: 'Draws electricity: Damage reduction +10%.' },
    stormdrain:      { name: 'Storm Drain',       desc: 'Draws water: Damage reduction +10%.' },
    // Regen / healing
    poisonheal:      { name: 'Poison Heal',       desc: 'Passive regen: +1 HP/s, heals 2.5% max HP every 5s.' },
    toughclaws:      { name: 'Tough Claws',       desc: 'Melee lifesteal: +1 regen.' },
    liquidvoice:     { name: 'Liquid Voice',      desc: 'Sound-based attacks heal: +1 regen.' },
    raindish:        { name: 'Rain Dish',         desc: 'In Rain: heal 2.5% max HP every 5s.' },
    leafguard:       { name: 'Leaf Guard',        desc: 'Sunlight blocks status: Damage reduction +10%, +0.3 regen.' },
    dryskin:         { name: 'Dry Skin',          desc: 'Heal 10% max HP every 10s.' },
    icebody:         { name: 'Ice Body',          desc: 'Heal 5% max HP every 15s.' },
    regenerator:     { name: 'Regenerator',       desc: 'Heal 5% max HP every 10s.' },
    naturalcure:     { name: 'Natural Cure',      desc: 'Clears debuffs & heals 2% max HP every 20s.' },
    pickup:          { name: 'Pickup',            desc: 'Scavenge items: heal 2% max HP per kill.' },
    // Kill stacking
    moxie:           { name: 'Moxie',             desc: 'Each kill: +2% Attack (max +50%).' },
    beastboost:      { name: 'Beast Boost',       desc: 'Each kill: +1% to all stats.' },
    grimneigh:       { name: 'Grim Neigh',        desc: 'Each kill: Attack ×1.05 (unlimited stacking).' },
    chillingneigh:   { name: 'Chilling Neigh',    desc: 'Each kill: Attack ×1.05 (unlimited stacking).' },
    // Cooldowns
    skilllink:       { name: 'Skill Link',        desc: 'Multi-hit focus: Cooldowns −15%.' },
    // Complex / conditional
    zenmode:         { name: 'Zen Mode',          desc: 'Below 50% HP: +30% Attack, Speed, Cooldowns.' },
    powerconstruct:  { name: 'Power Construct',   desc: 'Below 50% HP: max HP doubled (once per run).' },
    schooling:       { name: 'Schooling',         desc: 'Above 25% HP: +50% Attack & Speed, −25% Cooldowns.' },
    disguise:        { name: 'Disguise',          desc: 'Once per 60s: fully negate one hit.' },
    battlearmor:     { name: 'Battle Armor',      desc: '20% chance to negate each hit taken.' },
    stamina:         { name: 'Stamina',           desc: 'Each hit: +1% damage reduction (max 50%).' },
    moody:           { name: 'Moody',             desc: 'Every 10s: random stat +20%, another −10%.' },
    contrary:        { name: 'Contrary',          desc: 'Stat-lowering effects boost stats instead.' },
    slowstart:       { name: 'Slow Start',        desc: 'Stats ramp from 50% → 150% over 60 seconds.' },
    truant:          { name: 'Truant',            desc: 'Attack ×2, cooldowns ×2 (fires half as fast).' },
    protosynthesis:  { name: 'Protosynthesis',    desc: 'Highest stat ×1.5, lowest stat −10%.' },
    quarkdrive:      { name: 'Quark Drive',       desc: 'Highest stat ×1.5, lowest stat −10%.' },
  };

  // ── Inject ability badge into the detail panel ────────────────────────────
  var lastDex = null;

  function injectAbility(dex) {
    var detail = document.getElementById('dex-detail');
    if (!detail) return;

    // Remove any existing badge
    var old = detail.querySelector('#ps-ability-badge');
    if (old) old.remove();

    var ab = getAbilityForDex(dex);
    if (!ab) return;

    var info = ABILITY_INFO[ab];
    var name = info ? info.name : ab.charAt(0).toUpperCase() + ab.slice(1).replace(/([a-z])([A-Z])/g, '$1 $2');
    var desc = info ? info.desc : '';

    // Was this ability type-inferred (not in explicit map)?
    var isInferred = !DEX_ABILITY[dex];

    var badge = document.createElement('div');
    badge.id = 'ps-ability-badge';
    badge.style.cssText = [
      'margin:4px 0 8px',
      'padding:7px 10px',
      'background:rgba(255,255,255,0.07)',
      'border-radius:6px',
      'border-left:3px solid var(--gold,#f5c842)',
      'font-size:13px',
      'line-height:1.4',
    ].join(';');
    badge.innerHTML =
      '<span style="font-weight:700;color:var(--gold,#f5c842)">Ability: ' + name + '</span>' +
      (isInferred ? '<span style="opacity:0.5;font-size:11px"> (type)</span>' : '') +
      (desc ? '<br><span style="opacity:0.85">' + desc + '</span>' : '');

    // Insert BEFORE the stats block so it appears above HP/stats
    var stats = detail.querySelector('.stats, table, .mon-stats, [class*="stat"], [class*="hp"]');
    if (stats && stats.parentNode) {
      stats.parentNode.insertBefore(badge, stats);
    } else {
      // No stats block found — try to insert after the type/name header area
      var firstChild = detail.firstElementChild;
      if (firstChild && firstChild.nextSibling) {
        detail.insertBefore(badge, firstChild.nextSibling);
      } else {
        detail.appendChild(badge);
      }
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

    // 2. Scan text for dex number patterns:
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
  var debounceTimer = null;

  function tryUpdate() {
    // Debounce: wait 80ms after the last mutation so the panel is fully rendered
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var detail = document.getElementById('dex-detail');
      if (!detail || !detail.textContent.trim()) return;
      var dex = extractDex(detail);
      if (dex && dex !== lastDex) {
        lastDex = dex;
        injectAbility(dex);
      } else if (!dex) {
        // Panel was cleared (no Pokémon selected) — reset so next selection works
        lastDex = null;
      }
    }, 80);
  }

  // Watch body from the start — game builds DOM dynamically long after load
  new MutationObserver(tryUpdate).observe(document.documentElement, {
    childList: true, subtree: true
  });
})();
