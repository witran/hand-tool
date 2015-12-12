//browser starts
//invoke local storage for settings

//this background holds all extension's runtime data
//remember in-page js files don't have access to extension's runtime data
//while popup needs to be init & disposed multiple times -> unstable
//background page is where our app runs

if (navigator.appVersion.indexOf("Win") != -1) OSName = "Windows";
if (navigator.appVersion.indexOf("Mac") != -1) OSName = "MacOS";
if (navigator.appVersion.indexOf("X11") != -1) OSName = "UNIX";
if (navigator.appVersion.indexOf("Linux") != -1) OSName = "Linux";

var defaultSetting = {
  state: "activated",
  style: {
    showHand: "true"
  },

  scroll: {
    reverse: "yes",
    slide: "yes",
    scale: "1.5"
  },

  activation: {
    mouse: (OSName == "Linux" || OSName == "MacOS") ? "2" : "3",
    key: []
  }
};

function getLocalSetting() {
  //get setting from local Storage
  //return as object
  //if local storage empty, return default
  var settingStr = localStorage["setting"];

  var setting;

  if (!settingStr)
    setting = defaultSetting;
  else
    setting = JSON.parse(settingStr);

  console.log(setting);
  return setting;
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendRespond) {
  // console.log(msg + ", type: " + typeof msg);

  //message handler forwarder
  if (msg.type == "mm.cs.requestSetting") {
    sendRespond(getLocalSetting());
  }
});

var manifest = chrome.app.getDetails();

var injectScript = function(tab) {
  var scripts = manifest.content_scripts[0].js;
  for (var i = 0; i < scripts.length; i++)
    chrome.tabs.executeScript(tab.id, {
      file: scripts[i]
    });
}

var excludedPrefix = [
  'https://chrome.google.com/webstore',
  'chrome'
]

chrome.windows.getAll({
  populate: true
}, function(windows) {
  windows.forEach(function(w) {
    w.tabs.forEach(function(tab) {
      for (i = 0; i < excludedPrefix.length; i++)
        if (tab.url.indexOf(excludedPrefix[i] === 0)) return;
      injectScript(tab);
    });
  })
});
