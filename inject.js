(function() {
var Engine = function(newSetting, win, doc) {

  //private fields
  //setting
  //win
  //doc
  var setting = newSetting;
  //CONSTANT
  //Friction Per Sec, Friction Per Milli Sec
  var FRICTION_PS = 5;
  var FRICTION_PMS = FRICTION_PS / 1000;
  var RENDER_INTERVAL = 10;
  var MAX_SCROLL_TIME = 700;

  //sliding rendering interval timer
  var timerIds = [];
  var state = 'stopped';
  //sliding, scrolling

  //private funcs
  function getSign(a) {
    return a > 0 ? (1) : (-1);
  }

  function signMul(a, b) {
    return (a > 0 ? (1) : (-1)) * (b > 0 ? (1) : (-1));
  }

  function trunc(v) {
    return getSign(v) * Math.min(Math.abs(v), FRICTION_PMS * MAX_SCROLL_TIME);
  }

  function scroll(target, scrollAmountX, scrollAmountY, e) {
    if (target.type === 'application/x-google-chrome-pdf' || target.type === 'application/pdf') {
      document.documentElement.scrollBy(-scrollAmountX, -scrollAmountY);
      return;
    }

    var el;
    var left = [];
    var top = [];

    el = target;

    while (el) {
      left.push(el.scrollLeft);
      top.push(el.scrollTop);
      el = el.parentNode;
    }

    var elementScale;

    el = target;
    var i = 0;
    while (el) {
      if (el.scrollBy) {
        el.scrollBy(-scrollAmountX, -scrollAmountY);
        scrollAmountY -= (top[i] - el.scrollTop);
        scrollAmountX -= (left[i] - el.scrollLeft);
      }
      i++;
      el = el.parentNode;
    }
    el = window;
    el.scrollBy(-scrollAmountX, 0);
    el.scrollBy(0, -scrollAmountY);
  }

  function clearIntervals() {
    while (timerIds.length) {
      window.clearInterval(timerIds.pop());
    }
  }

  //public interface
  this.reset = function() {
    // mouse down
    clearIntervals();
    state = 'stopped';
  };

  this.pan = function(current, prev) {
    // mouse move
    try {
      var scrollAmountX = (current.x - prev.x) * setting.scale;
      var scrollAmountY = (current.y - prev.y) * setting.scale;

      scroll(current.target, scrollAmountX, scrollAmountY, current.e);

      state = 'panning';

      return (Math.abs(scrollAmountX) + Math.abs(scrollAmountY));
    } catch (exception) {
      console.warn(exception);
    }
  };

  this.slide = function(current) {
    // mouse up
    try {
      if (setting.slide !== 'yes') {
        return;
      }

      state = 'sliding';

      current.vx = trunc(current.vx);
      current.vy = trunc(current.vy);

      var frictionX = (-1) * getSign(current.vx) * FRICTION_PMS;
      var frictionY = (-1) * getSign(current.vy) * FRICTION_PMS;

      var prevTime = current.time;

      timerIds.push(setInterval(function() {
        var currentTime = Date.now();
        var dt = currentTime - prevTime;

        var newVx = current.vx + (frictionX * dt);
        var newVy = current.vy + (frictionY * dt);

        var stopped = true;
        if ((signMul(newVx, current.vx) === 1) && (Math.abs(current.vx) > Math.abs(FRICTION_PMS * dt))) {

          scroll(current.target, (current.vx * dt + frictionX * dt * dt / 2), 0, current.e);

          current.vx = newVx;
          stopped = false;
        }
        if ((signMul(newVy, current.vy) === 1) && (Math.abs(current.vy) > Math.abs(FRICTION_PMS * dt))) {

          scroll(current.target, 0, (current.vy * dt + (frictionY * dt * dt) / 2), current.e);

          current.vy = newVy;
          stopped = false;
        }

        if (stopped) {
          clearIntervals();
          state = 'stopped';
        }

        prevTime = currentTime;
      }, RENDER_INTERVAL));
    } catch (exception) {
      console.warn(exception);
    }
  };

  this.updateSetting = function(newSetting) {
    setting = newSetting;
  };

  this.getState = function() {
    return state;
  };
};

var HandTool = function(win, doc, chrome, instanceId) {

  //GLOBAL SETTINGS
  //app get only
  //all setting done at option page
  var OSName;
  if (navigator.appVersion.indexOf('Win') !== -1) OSName = 'Windows';
  if (navigator.appVersion.indexOf('Mac') !== -1) OSName = 'MacOS';
  if (navigator.appVersion.indexOf('X11') !== -1) OSName = 'UNIX';
  if (navigator.appVersion.indexOf('Linux') !== -1) OSName = 'Linux';

  var GlobalSetting = {
    state: 'activated',

    style: {
      showHand: 'true'
    },

    scroll: {
      reverse: 'yes',
      slide: 'yes',
      scale: '1.5'
    },

    activation: {
      mouse: (OSName === 'Linux' || OSName === 'MacOS') ? '2' : '3',
      key: []
    }
  };

  //LOCAL CONTENT APP VARS

  //app activation
  var tabState;

  //messenger api
  var allowedMsgType = [
    'handtool.content.destroy',
    'handtool.popup.notify'
  ];

  //MOUSE DATA
  var current, prev;

  //SCROLLING ENGINE
  var engine;
  var amountScrolled;

  //STYLING
  //prevent context menu if panning amount > 3px
  var PREVENT_DEFAULT_THRESHOLD = 3;

  //handle chrome mousemove fired on click
  var shouldHandleMouseMove = false;

  //main handler - event forwarder
  function handleMouseDown(e) {
    //request a new scroll session
    amountScrolled = 0;

    if (!isLastActivator(e)) {
      return;
    }

    shouldHandleMouseMove = true;

    if (GlobalSetting.activation.mouse !== '0' &&
      GlobalSetting.activation.key[0] === 'ctrlKey') {
      injectionTargets.push(e.target);
      injectionTargets.forEach(function(element) {
        element.webkitUserSelect = 'none';
      });
      document.body.style.cursor = '-webkit-grabbing';
    }

    engine.reset();

    if (e.which == '2' || e.which == '1') {
      e.preventDefault();
    }
  }

  function handleMouseMove(e) {
    if (!shouldHandleMouseMove) return;

    var now = Date.now();

    if (engine.getState() == 'stopped') {
      prev = {
        x: e.clientX,
        y: e.clientY,
        time: now,
        vx: 0,
        vy: 0,
        target: e.target,
        e: e
      };
    }

    if (!isLastActivator(e)) {
      return;
    }

    current = {
      x: e.clientX,
      y: e.clientY,
      time: now,
      target: prev.target,
      e: e
    };

    current.vx = (current.time > prev.time) ?
      (current.x - prev.x) / (current.time - prev.time) :
      0;
    current.vy = (current.time > prev.time) ?
      (current.y - prev.y) / (current.time - prev.time) :
      0;

    amountScrolled += engine.pan(current, prev);

    prev = current;

    if (e.which == '2' || e.which == '1') {
      e.preventDefault();
      return false;
    }
  }

  function handleMouseUp(e) {
    // this is the first of the combination to be removed
    if (!isLastActivator(e)) {
      return;
    }

    shouldHandleMouseMove = false;

    if (GlobalSetting.activation.mouse !== '0' &&
      GlobalSetting.activation.key[0] === 'ctrlKey') {
      document.body.style.cursor = '-webkit-grab';
    }

    if (current) {
      engine.slide(current);
    }
    current = null;

    if ((e.which == '2' || e.which == '1') && amountScrolled > PREVENT_DEFAULT_THRESHOLD) {
      e.preventDefault();
      return false;
    }
  }

  var injectionTargets = [];

  function handleKeyDown(e) {
    if (GlobalSetting.activation.mouse !== '0' &&
      GlobalSetting.activation.key[0] === 'ctrlKey' &&
      isActivatorKey(e.keyCode)) {
      document.body.style.webkitUserSelect = 'none';
      if (document.body.style.cursor.indexOf('-webkit-grab') !== 0)
        document.body.style.cursor = '-webkit-grab';
    }

    if (!isLastActivator(e)) return;

    shouldHandleMouseMove = true;
    engine.reset();
  }

  function handleKeyUp(e) {
    if (GlobalSetting.activation.mouse !== '0' &&
      GlobalSetting.activation.key[0] === 'ctrlKey' &&
      isActivatorKey(e.keyCode)) {
      document.body.style.webkitUserSelect = '';
      injectionTargets.forEach(function(element) {
        element.webkitUserSelect = '';
      });
      injectionTargets = [];
      document.body.style.cursor = '';
    }

    // this is the first of the combination to be removed, or state is already panning
    if (!isActivatorKey(e.keyCode) || (engine.getState() !== 'panning'))
      return;

    shouldHandleMouseMove = false;
    engine.slide(current);
  }

  function isLastActivator(e) {
    // check if extension is deactivated
    if ((parseInt(GlobalSetting.activation.mouse) !== 0) &&
      (parseInt(e.which) !== parseInt(GlobalSetting.activation.mouse)) ||
      (GlobalSetting.state === 'deactivated')) {
      return false;
    }

    // check if activation keys are pressed
    for (var i = 0; i < GlobalSetting.activation.key.length; i++)
      if (!e[GlobalSetting.activation.key[i]]) {
        return false;
      }

    return true;
  }

  function isActivatorKey(keyCode) {
    // Control
    if (keyCode == 17)
      for (var i = 0; i < GlobalSetting.activation.key.length; i++) {
        if (GlobalSetting.activation.key[i] == 'ctrlKey')
          return true;
      }
      // Alt
    if (keyCode == 18)
      for (var i = 0; i < GlobalSetting.activation.key.length; i++) {
        if (GlobalSetting.activation.key[i] == 'altKey')
          return true;
      }
    return false;
  }

  function handleContextMenu(e) {
    if ((amountScrolled > PREVENT_DEFAULT_THRESHOLD) && (GlobalSetting.state == 'activated')) {
      e.preventDefault();
      return false;
    }
    return true;
  }

  //SETTING UPDATE related funcs
  //reset app state
  function clearAppState() {
    //stop preventing context menu
    amountScrolled = 0;
    //stop sliding timer
    engine.reset();
  }

  //to trigger an update if jump tab
  function handleFocus() {
    if (tabState == 'blur')
      requestUpdate();
    tabState = 'focus';
  }

  function handleBlur() {
    tabState = 'blur';
  }

  //Messenger
  function updateGlobalSetting(newGlobalSetting) {
    clearAppState();
    GlobalSetting = newGlobalSetting;
    engine.updateSetting(GlobalSetting.scroll);
  }

  function requestUpdate() {
    chrome.runtime.sendMessage({
      type: 'handtool.content.requestSetting'
    }, function(response) {
      updateGlobalSetting(response);
    });
  }

  function messageAllowed(msg) {
    if (msg.source !== window)
      return false;

    for (var i = 0; i < allowedMsgType.length; i++)
      if (msg.data.type == allowedMsgType[i])
        return true;

    return false;
  }

  function handleMessage(msg) {
    if (!messageAllowed(msg)) {
      return;
    }

    if (msg.data.type === 'handtool.popup.notify') {
      updateGlobalSetting(msg.data.setting);
    } else if (msg.data.type === 'handtool.content.destroy' &&
      msg.data.exclude != instanceId) {
      destroy();
    }
  }

  function init() {
    //mouse and keyboard handlers
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mouseup', handleMouseUp, true);

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('blur', handleBlur, true);
    document.body.addEventListener('contextmenu', handleContextMenu, true);

    //messengers
    window.addEventListener('message', handleMessage, true);

    //init engine
    engine = new Engine(GlobalSetting.scroll, win, doc);
    //init variables
    tabState = 'blur';
    amountScrolled = 0;

    //finally get a fresh update for setting
    requestUpdate();
  }

  function destroy() {
    window.removeEventListener('mousemove', handleMouseMove, true);
    window.removeEventListener('mousedown', handleMouseDown, true);
    window.removeEventListener('mouseup', handleMouseUp, true);

    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keyup', handleKeyUp, true);

    window.removeEventListener('focus', handleFocus, true);
    window.removeEventListener('blur', handleBlur, true);

    window.removeEventListener('message', handleMessage, true);

    document.body.removeEventListener('contextmenu', handleContextMenu, true);
  }

  this.requestUpdate = requestUpdate;
  this.init = init;
};

// init once on focus
function start() {
  var instanceId = Date.now();

  // destroy old versions
  window.postMessage({
    type: 'handtool.content.destroy',
    exclude: instanceId
  }, '*');

  // create new instance
  var handTool = new HandTool(window, document, chrome, instanceId);
  handTool.init();

  window.removeEventListener('focus', start);
}

window.addEventListener('focus', start);
})();
