// PS Mod: Render Scale
// Intercepts devicePixelRatio so the game's own resize logic applies our
// scale factor. Slider is injected into the Graphics settings tab.
// Works on desktop and mobile (touch-friendly range input).
(function () {
  var STORAGE_KEY = 'ps_render_scale';
  var _scale = parseFloat(localStorage.getItem(STORAGE_KEY) || '1');

  // Intercept devicePixelRatio so the game's resize function picks up our scale.
  // The game does: pixelRatio = Math.min(qualityCap, devicePixelRatio)
  var _realDPR = window.devicePixelRatio || 1;
  Object.defineProperty(window, 'devicePixelRatio', {
    get: function () { return _realDPR * _scale; },
    configurable: true
  });

  function applyScale(v) {
    _scale = v;
    localStorage.setItem(STORAGE_KEY, v);
    window.dispatchEvent(new Event('resize'));
  }

  // Inject slider into the Graphics (gfx) settings tab when it opens.
  var injected = false;
  function tryInject() {
    if (injected) return;
    var body = document.getElementById('set-body');
    if (!body) return;
    if (!body.querySelector('select') && !body.innerHTML.includes('Idioma') &&
        !body.innerHTML.includes('Language')) return;
    if (body.querySelector('#ps-scale-row')) return;
    injected = true;

    var pct = Math.round(_scale * 100);
    var row = document.createElement('div');
    row.id = 'ps-scale-row';
    row.className = 'set-row';
    // min-height 44px for touch targets
    row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap;min-height:44px';
    row.innerHTML =
      '<span style="min-width:120px;font-size:14px">Render scale</span>' +
      '<input id="ps-scale-slider" type="range" min="50" max="200" step="5" value="' + pct + '"' +
      '  style="flex:1;min-width:120px;height:28px;accent-color:var(--gold,#f5c842);touch-action:none">' +
      '<span id="ps-scale-val" style="min-width:40px;text-align:right;font-size:14px">' + pct + '%</span>' +
      '<button id="ps-scale-reset" class="btn small ghost" style="margin-left:4px;min-height:36px">Reset</button>';

    body.appendChild(row);

    var slider = document.getElementById('ps-scale-slider');
    var label  = document.getElementById('ps-scale-val');
    var reset  = document.getElementById('ps-scale-reset');

    slider.addEventListener('input', function () {
      label.textContent = slider.value + '%';
    });
    slider.addEventListener('change', function () {
      applyScale(parseInt(slider.value) / 100);
    });
    reset.addEventListener('click', function () {
      slider.value = 100;
      label.textContent = '100%';
      applyScale(1);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var body = document.getElementById('set-body');
    if (!body) return;
    new MutationObserver(function () { injected = false; tryInject(); })
      .observe(body, { childList: true, subtree: true, characterData: true });
  });
})();
