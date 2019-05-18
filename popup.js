window.onload = function(){
  if (navigator.appVersion.indexOf("Win")!=-1) var OSName="Windows";
  if (navigator.appVersion.indexOf("Mac")!=-1) var OSName="MacOS";
  if (navigator.appVersion.indexOf("X11")!=-1) var OSName="UNIX";
  if (navigator.appVersion.indexOf("Linux")!=-1) var OSName="Linux";

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

  function notifyAndClose(){
    document.getElementById("status").innerHTML = "Hand tool " + setting.state;
    document.getElementById("status").style.color = (setting.state=="activated")?"#19B843":"#000";
    setTimeout(function(){
      finished["setStatus"] = true;
      closeIfFinish();
    }, 1250);
  }

  function closeIfFinish(){
    for (var i in finished){
      if (!finished[i]) return;
    }
    window.close();
  }

  function getLocalSetting(){
    //get setting from local Storage
    //return as object
    //if local storage empty, return default
    var settingStr = localStorage["setting"];

    var setting;

    if (!settingStr)
      setting = defaultSetting;
    else
      setting = JSON.parse(settingStr);

    return setting;
  }

  function deactivate(){
    setting.state = "deactivated";

    //notify script in page to disable
    chrome.tabs.executeScript({
      code: "window.postMessage({setting: JSON.parse('" + JSON.stringify(setting) + "'), type: 'handtool.popup.notify'},'*');"
    });

    //set storage to new value
    localStorage["setting"] = JSON.stringify(setting);
    chrome.browserAction.setTitle({title: "Hand tool deactivated"});
    chrome.browserAction.setIcon({path: "default-pointer.png"}, function(){
      finished["setIcon"] = true;
      closeIfFinish();
    });

    //finish setting
    notifyAndClose();
  }

  function activate(){
    setting.state = "activated";
    //notify script in page to disable
    chrome.tabs.executeScript({
      code: "window.postMessage({setting: JSON.parse('" + JSON.stringify(setting) + "'), type: 'handtool.popup.notify'},'*');"
    });

    //set storage to new value
    localStorage["setting"] = JSON.stringify(setting);

    var activation = "";
    if (setting.activation.key.length) {
      if (setting.activation.key[0] == "ctrlKey")
        activation = "Control";

      if (setting.activation.mouse == "2")
        activation += " + Middle Mouse";
      else
      if (setting.activation.mouse == "3")
        activation += " + Right Mouse";
    }
    else {
      if (setting.activation.mouse == "2")
        activation = "Middle Mouse";
      else
      if (setting.activation.mouse == "3")
        activation = "Right Mouse";
    }

    chrome.browserAction.setTitle({title: "Hand tool activated (" + activation + ")"});
    chrome.browserAction.setIcon({path: "hand-pointer.png"}, function(){
      finished["setIcon"] = true;
      closeIfFinish();
    });

    //finish setting
    notifyAndClose();
  }

  var setting = getLocalSetting();

  var finished = {
    setIcon: false,
    setStatus: false
  };

  if (setting.state == "activated")
    deactivate();
  else
    activate();
};
