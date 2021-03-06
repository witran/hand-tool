'use strict';

var OSName;

if (navigator.appVersion.indexOf('Win') != -1) OSName = 'Windows';
if (navigator.appVersion.indexOf('Mac') != -1) OSName = 'MacOS';
if (navigator.appVersion.indexOf('X11') != -1) OSName = 'Linux';
if (navigator.appVersion.indexOf('Linux') != -1) OSName = 'Linux';

(function () {

  String.prototype.width = function (font) {
    var f = font || '12px arial',
      o = $('<div>' + this + '</div>')
        .css({
          'position': 'absolute',
          'float': 'left',
          'white-space': 'nowrap',
          'visibility': 'hidden',
          'font': f
        })
        .appendTo($('body')),
      w = o.width() + 3;

    o.remove();
    return w;
  };

  function isActivated(elem) {
    return !isDeactivated(elem);
  }

  function isDeactivated(elem) {
    return (/dark/.test(elem.attr('class')));
  }

  function setLight(elem) {
    var darkClass = elem.attr('class');
    elem.attr('class', darkClass.replace('dark', 'light'));
  }

  function setDark(elem) {
    var lightClass = elem.attr('class');
    elem.attr('class', lightClass.replace('light', 'dark'));
  }

  function updateBrowserActionTitle(setting) {
    //notify browser action to change state
    if (setting.state === 'activated') {
      var activation = '';
      if (setting.activation.key.length) {
        if (setting.activation.key[0] == 'ctrlKey')
          activation = 'Control';
        if (setting.activation.mouse == '1')
          activation += ' + Left Mouse';
        else
          if (setting.activation.mouse == '2')
            activation += ' + Middle Mouse';
          else
            if (setting.activation.mouse == '3')
              activation += ' + Right Mouse';
      } else {
        if (setting.activation.mouse == '2')
          activation = 'Middle Mouse';
        else
          if (setting.activation.mouse == '3')
            activation = 'Right Mouse';
      }
      chrome.browserAction.setTitle({
        title: 'Hand tool activated (' + activation + ')'
      });
    } else {
      chrome.browserAction.setTitle({
        title: 'Hand tool deactivated'
      });
    }
  }

  function putSetting(setting) {
    localStorage.setting = JSON.stringify(setting);

    //notify this option page
    handTool.requestUpdate();
    updateBrowserActionTitle(setting);
  }

  function deactivate() {
    setting.state = 'deactivated';

    //set storage to new value
    localStorage.setting = JSON.stringify(setting);

    //notify script in page to disable
    handTool.requestUpdate();
    updateBrowserActionTitle(setting);
    chrome.browserAction.setIcon({
      path: 'default-pointer.png'
    });

    $('#hand-tool-img').attr("src", "default-pointer.png");
  }

  function activate() {
    setting.state = 'activated';

    //set storage to new value
    localStorage.setting = JSON.stringify(setting);

    //notify script in page to disable
    handTool.requestUpdate();
    updateBrowserActionTitle(setting);
    chrome.browserAction.setIcon({
      path: 'hand-pointer.png'
    });

    $('#hand-tool-img').attr("src", "hand-pointer.png");
  }

  function updateResponsiveText() {
    if (actCount() >= 2) {
      $('#act-responsive').text('are pressed');
      setLight($('#act-responsive-sign'));
    } else {
      $('#act-responsive').text('is pressed');
      setDark($('#act-responsive-sign'));
    }
  }

  function updateUI() {
    //to be called when change setting
    if (setting.state == 'activated') {
      appOn.trigger('click');
    } else {
      appOff.trigger('click');
    }


    speedInp.val(setting.scroll.scale);
    speedInp.css('width', speedInp.val().width('18px Segoe UI bold'));

    if (setting.activation.key.length == 1) {
      setLight(actCtrl);
    } else {
      setDark(actCtrl);
    }

    setDark(actM1);
    setDark(actM2);
    setDark(actM3);

    if (setting.activation.mouse == '1')
      setLight(actM1);
    if (setting.activation.mouse == '2')
      setLight(actM2);
    if (setting.activation.mouse == '3')
      setLight(actM3);

    updateResponsiveText();
  }

  function handleStorageChange(e) {
    setting = querySetting();
    updateUI();
  }

  function actCount() {
    var count = 0;
    if (isActivated(actCtrl))
      count++;
    if (isActivated(actM1))
      count++;
    if (isActivated(actM2))
      count++;
    if (isActivated(actM3))
      count++;
    return count;
  }

  function isValidActChange(btn) {
    if (btn === actCtrl && isActivated(actM1))
      return false;
    return (actCount() >= 2);
  }

  var
    appOn = $('#app-sw1'),
    appOff = $('#app-sw2'),
    speedInp = $('#speed-input'),
    spdPlus = $('#plus'),
    spdMinus = $('#minus'),
    actCtrl = $('#act-ctrl'),
    actM1 = $('#act-M1'),
    actM2 = $('#act-M2'),
    actM3 = $('#act-M3');

  //set handlers
  //app ON OFF SETTINGS
  appOn.click(function () {
    if (isDeactivated($(this))) {
      setLight(appOn);
      setDark(appOff);

      appOn.attr('title', '');
      appOff.attr('title', 'turn it off');

      activate();
    }
  });

  appOff.click(function () {
    if (isDeactivated($(this))) {
      setLight(appOff);
      setDark(appOn);

      appOn.attr('title', 'turn it on');
      appOff.attr('title', '');

      deactivate();
    }
  });

  //SPEED SETTINGS
  speedInp.keyup(function (e) {
    //change input width
    if (!$(this).val().length || isNaN($(this).val()))
      $(this).val('1.5');

    if (parseFloat($(this).val()) <= 0.1)
      $(this).val('0.1');

    $(this).css('width',
      $(this).val().length ?
        ($(this).val().width('18px Segoe UI bold') + 'px') :
        ('1.5'.width('18px Segoe UI bold') + 'px'));

    //put new setting
    setting.scroll.scale = $(this).val();
    putSetting(setting);

    //update other parts of UI
    if (parseFloat(speedInp.val()) > 1)
      $('#speed-responsive').text('pixels');
    else
      $('#speed-responsive').text('pixel');
  });

  spdPlus.click(function () {
    var val = parseFloat(speedInp.val());
    val = (val + 0.1).toFixed(1);

    speedInp.val(val);
    speedInp.css('width', (val + '').width('18px Segoe UI bold') + 'px');

    setting.scroll.scale = val;
    putSetting(setting);
  });

  spdMinus.click(function () {
    var val = parseFloat(speedInp.val());
    val = (val - 0.1).toFixed(1);
    if (val <= 0.1)
      val = 0.1;

    setting.scroll.scale = val;

    putSetting(setting);
    updateUI();
  });

  //ACTIVATION SETTINGS
  actCtrl.click(function () {
    if (isDeactivated(actCtrl)) {
      setting.activation.key = ['ctrlKey'];
    } else {
      if (!isValidActChange(actCtrl)) return;
      setting.activation.key = [];
    }
    putSetting(setting);
    updateUI();
  });

  actM1.click(function () {
    if (isDeactivated(actM1)) {
      setting.activation.mouse = '1';
      setting.activation.key = ['ctrlKey'];
    } else {
      if (!isValidActChange(actM1)) return;
      setting.activation.mouse = '';
    }
    putSetting(setting);
    updateUI();
  });

  actM2.click(function () {
    if (isDeactivated(actM2)) {
      //click to dark is toggle
      setting.activation.mouse = '2';
    } else {
      //click to light is simply turning off
      if (!isValidActChange(actM2)) return;
      setting.activation.mouse = '';
    }
    putSetting(setting);
    updateUI();
  });

  actM3.click(function () {
    if (isDeactivated(actM3)) {
      //click to dark is toggle
      setting.activation.mouse = '3';
    } else {
      //click to light is simply turning off
      if (!isValidActChange(actM3)) return;
      setting.activation.mouse = '';
    }
    putSetting(setting);
    updateUI();
  });

  //PREFERENCES SETTINGS
  $('#pref-1').click(function () {
    setting.state = 'activated';
    setting.scroll.scale = '1.5';
    setting.activation.mouse = '3';
    setting.activation.key = [];

    putSetting(setting);
    updateUI();
  });

  $('#pref-2').click(function () {
    setting.state = 'activated';
    setting.scroll.scale = '1.5';
    setting.activation.mouse = '';
    setting.activation.key = ['ctrlKey'];

    putSetting(setting);
    updateUI();
  });

  $('#pref-3').click(function () {
    setting.state = 'activated';
    setting.scroll.scale = '3';
    setting.activation.mouse = '3';
    setting.activation.key = [];

    putSetting(setting);
    updateUI();
  });

  $('#pref-4').click(function () {
    setting.state = 'deactivated';

    putSetting(setting);
    updateUI();
  });

  //show option data initilially
  var defaultSetting = {
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
      mouse: '3',
      key: []
    }
  };

  // OS-specific settings
  if (OSName === 'MacOS') {
    defaultSetting.activation.mouse = '';
    defaultSetting.activation.key = ['ctrlKey'];
    actCtrl.css('display', 'none');
    actM1.css('display', 'none');
    actM2.css('display', 'none');
    actM3.css('display', 'none');
    $('.act-slash').css('display', 'none');
    $('#act-responsive-sign').css('display', 'none');
    $('#act-non-mac').css('display', 'none');
    $('#act-brk').css('display', 'none');
    $('#act-foot').css('display', 'none');
    $('#suggestion').css('display', 'none');

    $('.act').css('display', 'none');
    $('.act-mac').css('display', 'inline-block');
    $('.tip').css('display', 'none');
    $('.tip-mac').css('display', 'block');
  } else if (OSName === 'Windows') {
    defaultSetting.activation.mouse = '2';
    defaultSetting.activation.key = [];
    $('.act').css('display', 'none');
    $('.act-win').css('display', 'inline-block');
    $('.tip').css('display', 'none');
    $('.tip-win').css('display', 'block');
  } else if (OSName === 'UNIX' || OSName === 'Linux') {
    defaultSetting.activation.mouse = '3';
    defaultSetting.activation.key = [];
    $('.act').css('display', 'none');
    $('.act-linux').css('display', 'inline-block');
    $('.tip').css('display', 'none');
    $('.tip-linux').css('display', 'block');
    $('#suggestion').css('display', 'none');
  }

  // init
  function querySetting() {
    //get setting from local Storage
    //return as object
    //if local storage empty, return default
    var settingStr = localStorage.setting;

    var setting;

    if (!settingStr)
      setting = defaultSetting;
    else
      setting = JSON.parse(settingStr);

    return setting;
  }

  window.addEventListener('storage', handleStorageChange, true);

  var setting = querySetting();
  updateUI();
})();
