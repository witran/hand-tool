// background script is invoked on browser starts
//

if (navigator.appVersion.indexOf('Win') != -1) OSName = 'Windows';
if (navigator.appVersion.indexOf('Mac') != -1) OSName = 'MacOS';
if (navigator.appVersion.indexOf('X11') != -1) OSName = 'UNIX';
if (navigator.appVersion.indexOf('Linux') != -1) OSName = 'Linux';

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
    mouse: (OSName == 'Linux' || OSName == 'MacOS') ? '2' : '3',
    key: []
  }
};

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

var reloadContentScript = function(tab) {
  var scripts = manifest.content_scripts[0].js;
  for (var i = 0; i < scripts.length; i++) {
    chrome.tabs.executeScript(tab.id, {
      file: scripts[i]
    });
  }
}

var excludedPrefixes = [
  'https://chrome.google.com/webstore',
  'chrome'
];

chrome.windows.getAll({
  populate: true
}, function(windows) {
  windows.forEach(function(window) {
    window.tabs.forEach(function(tab) {
      for (i = 0; i < excludedPrefixes.length; i++)
        if (tab.url.indexOf(excludedPrefixes[i]) === 0) return;
      reloadContentScript(tab);
    });
  })
});
