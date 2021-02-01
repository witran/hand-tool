// background script is invoked on browser starts
//

if (navigator.appVersion.indexOf('Win') != -1) OSName = 'Windows';
if (navigator.appVersion.indexOf('Mac') != -1) OSName = 'MacOS';
if (navigator.appVersion.indexOf('X11') != -1) OSName = 'UNIX';
if (navigator.appVersion.indexOf('Linux') != -1) OSName = 'Linux';

var EXCLUDED_PREFIXES = [
  'https://chrome.google.com/webstore',
  'chrome'
];

var defaultSetting = {
  state: 'activated',
  style: {
    showHand: 'true'
  },

  scroll: {
    reverse: 'yes',
    slide: 'yes',
    scale: '1.5'
  }
};

if (OSName === 'Windows') {
  defaultSetting.activation = { mouse: '3', key: [] };
} else if (OSName === 'MacOS') {
  defaultSetting.activation = { mouse: '', key: ['ctrlKey'] };
} else if (OSName === 'Linux' || OSName === 'UNIX') {
  defaultSetting.activation = { mouse: '2', key: [] };
}

function getLocalSetting() {
  var settingStr = localStorage['setting'];
  var setting;

  if (!settingStr)
    setting = defaultSetting;
  else
    setting = JSON.parse(settingStr);

  return setting;
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendRespond) {
  if (msg.type == 'handtool.content.requestSetting') {
    sendRespond(getLocalSetting());
  }
});

var manifest = chrome.app.getDetails();

function reloadContentScript(tab) {
  chrome.tabs.executeScript(tab.id, {
    file: "inject.js"
  });
}

chrome.windows.getAll({
  populate: true
}, function(windows) {
  windows.forEach(function(window) {
    window.tabs.forEach(function(tab) {
      for (i = 0; i < EXCLUDED_PREFIXES.length; i++)
        if (tab.url && tab.url.indexOf(EXCLUDED_PREFIXES[i]) === 0) return;
      reloadContentScript(tab);
    });
  })
});
