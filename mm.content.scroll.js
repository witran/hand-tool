var PanEngine = function(newSetting, win, doc){
    
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
//    var timerId;
    var timerIds = [];
    var state = "stopped";
    //sliding, scrolling
    
    //private funcs
    
    function getSign(a){
        return a>0?(1):(-1);
    }

    function signMul(a, b){
        return (a>0?(1):(-1)) * (b>0?(1):(-1));
    }
    
    function trunc(v){
        return getSign(v) * Math.min(Math.abs(v), FRICTION_PMS * MAX_SCROLL_TIME);
    }
    
    function scroll(target, scrollAmountX, scrollAmountY, e){
        var el;
        var left = [];
        var top = [];
        var prevScrollAmountX = scrollAmountX;
        var prevScrollAmountY = scrollAmountY;
        
        el = target;
        
        while (el) {
            left.push(el.scrollLeft);
            top.push(el.scrollTop);
            el = el.parentElement;
        }
        
        var evt = new WheelEvent(
            'wheel', {
            bubbles: true,
            deltaZ: 0,
            view: win,
            screenX: e.screenX,
            screenY: e.screenY,
            clientX: e.clientX,
            clientY: e.clientY,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            deltaX: - scrollAmountX,
            deltaY: - scrollAmountY,
            delta: 120
        });
        target.dispatchEvent(evt);
        // document.body.dispatchEvent(evt);
        // console.log(evt);
        //do a check, if nothing scrolled, bubble it up to body, manually >.<
        //body won't get scrolled by custom event
        
        el = target;  var i = 0;
        while (el) {
            if (Math.abs(el.scrollLeft - left[i]) > Math.abs(scrollAmountX))
                el.scrollLeft = left[i] - scrollAmountX;
            
            scrollAmountX -= (el.scrollLeft - left[i]);
            
            if (Math.abs(el.scrollTop - top[i]) > Math.abs(scrollAmountY))
                el.scrollTop = top[i] - scrollAmountY;
            
            scrollAmountY -= (el.scrollTop - top[i]);  
            i++;
            el = el.parentElement;
        }
        
        if ((scrollAmountX == prevScrollAmountX) && (target.type !== 'application/pdf'))
            doc.body.scrollLeft -= scrollAmountX;
        
        if ((scrollAmountY == prevScrollAmountY) && (target.type !== 'application/pdf'))
            doc.body.scrollTop -= scrollAmountY;
    }
    
    function clearIntervals(){
        while (timerIds.length) 
            win.clearInterval(timerIds.pop());
    }
    
    //public interface
    this.reset = function(){
        //receive a mousedown event
        //initiate panning
//        win.clearInterval(timerId);
        clearIntervals();
        state = "stopped";
    };
    
    this.pan = function(current, prev) {
        try {
        //receive a mousemove event
        //perform panning

        var scrollAmountX = (current.x - prev.x) * setting.scale;
        var scrollAmountY = (current.y - prev.y) * setting.scale;
        
//        var target = findScrollableElem(current.target, current.vx, current.vy);
//        target.scrollLeft -= scrollAmountX;
//        target.scrollTop -= scrollAmountY;

        scroll(current.target, scrollAmountX, scrollAmountY, current.e);
        } catch (exception) {
            
        }
            
        state = "panning";
        
        return (Math.abs(scrollAmountX) + Math.abs(scrollAmountY));
    };

    this.slide = function(current) {
        try {
            if (setting.slide != "yes")
                return;

            state = "sliding";

            current.vx = trunc(current.vx);
            current.vy = trunc(current.vy);


            var frictionX = (-1) * getSign(current.vx) * FRICTION_PMS;
            var frictionY = (-1) * getSign(current.vy) * FRICTION_PMS;

            var prevTime = current.time;

            timerIds.push(setInterval(function(){
                var currentTime = + new Date();
                var dt = currentTime - prevTime;

                var newVx = current.vx + (frictionX * dt);
                var newVy = current.vy + (frictionY * dt);

                var stopped = true;
                if ((signMul(newVx, current.vx) == 1) && (Math.abs(current.vx) > Math.abs(FRICTION_PMS * dt))){

                    scroll(current.target, (current.vx * dt + frictionX * dt * dt / 2), 0, current.e);

                    current.vx = newVx;
                    stopped = false;
                }
                if ((signMul(newVy, current.vy) == 1) && (Math.abs(current.vy) > Math.abs(FRICTION_PMS * dt))){

                    scroll(current.target, 0, (current.vy * dt + (frictionY * dt * dt) / 2), current.e);

                    current.vy = newVy;
                    stopped = false;
                }

                if (stopped) {
//                    win.clearInterval(timerId);
                    clearIntervals();
                    state = "stopped";
                }

                prevTime = currentTime;
            }, RENDER_INTERVAL));
        } catch (exception) {
            
        }
    };
    
    this.updateSetting = function(newSetting){
        setting = newSetting;
    };
    
    this.getState = function(){return state;};
};

var WinHandTool = function(win, doc, chrome){
    
    //GLOBAL SETTINGS
        //app get only
        //all setting done at option page
    var OSName;
    if (navigator.appVersion.indexOf("Win")!=-1) OSName="Windows";
    if (navigator.appVersion.indexOf("Mac")!=-1) OSName="MacOS";
    if (navigator.appVersion.indexOf("X11")!=-1) OSName="UNIX";
    if (navigator.appVersion.indexOf("Linux")!=-1) OSName="Linux";
    
    var GlobalSetting = {
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
    
    //LOCAL CONTENT APP VARS 
        //app activation
    var tabState;
    
    
        //pan activation, 
        //mouse state
    
        //messenger api
    var allowedMsgType = [
        'mm.popup.notify',
        'bg.settingResponse'
    ];
    
        //MOUSE DATA
    var current, prev;
    
        //SCROLLING ENGINE FIELDS & FUNCS
    var panEngine; 
    var amountScrolled;
    
        //STYLING FIELDS & FUNCS
            //change cursor
    
    
            //remove context menu
    //prevent context menu if panning amount > 15px
    var PREVENT_CM_THRESHOLD = 7;

    
    function panActive(e){
        
        if ((parseInt(GlobalSetting.activation.mouse) != 0) && 
            (parseInt(e.which) != parseInt(GlobalSetting.activation.mouse)) ||
            (GlobalSetting.state == "deactivated"))
            return false;
        
        for (var i = 0; i < GlobalSetting.activation.key.length; i++)
            if (!e[GlobalSetting.activation.key[i]])
                return false;
        
        return true;
    }
    
    function actCount(){
        var count = 0;
        if (parseInt(GlobalSetting.activation.mouse) != parseInt("0"))
            count++;
        count += GlobalSetting.activation.key.length;
        return count;
    }
    
    
    //main handler - event forwarder
    function handleMouseDown(e){
        //request a new scroll session
        amountScrolled = 0;
        
        if (!panActive(e))
            return;
        
        panEngine.reset();
        
        if (e.which == "2")
            e.preventDefault();
    }
    
    function handleMouseMove(e){
        if (!panActive(e))
            return;
        
        if (panEngine.getState() == "stopped")
            //start a new scroll session
            prev = {
                x: e.clientX,
                y: e.clientY,
                time: e.timeStamp,
                vx: 0,
                vy: 0,
                target: e.target,
                e: e
            };
        
        var t = e.timeStamp;
        
        current = {
            x: e.clientX,
            y: e.clientY,
            time: t,
            vx: (t > prev.time)?((e.clientX - prev.x) / (t - prev.time)):0,
            vy: (t > prev.time)?((e.clientY - prev.y) / (t - prev.time)):0,
            target: prev.target,
            e: e
        };
        
        amountScrolled += panEngine.pan(current, prev);
        
        prev = current;
        
        if (e.which == "2")
            e.preventDefault();
    }
    
    function handleMouseUp(e){
        if (!panActive(e))
            return;
        
        panEngine.slide(current);
        
        if (e.which == "2")
            e.preventDefault();
    }
    
    function handleKeyDown(e){
        //request a new scroll session
        if (panEngine.getState() == "panning" || !panActive(e))
            return;
        
        panEngine.reset();
    }
    
    function handleKeyUp(e){
        //this is the first key to disable the scrolling
        if (!isActivator(e.keyIdentifier) || (panEngine.getState() != "panning"))
            return;
        
        panEngine.slide(current);
        
        //perform a slide if laptop case
    }
    
    function isActivator(key){
        if (key == "Control")
            for (var i = 0; i < GlobalSetting.activation.key.length; i++){
                if (GlobalSetting.activation.key[i] == "ctrlKey")
                    return true;
            }
        if (key == "Alt")
            for (var i = 0; i < GlobalSetting.activation.key.length; i++){
                if (GlobalSetting.activation.key[i] == "altKey")
                    return true;
            }
        return false;
    }
        
    function handleContextMenu(e){
        if ((PREVENT_CM_THRESHOLD < amountScrolled) && (GlobalSetting.state == "activated")) 
            return false;
        return true;
    }
    
    //SETTING UPDATE related funcs
    //reset app state
    function clearAppState(){
        //stop preventing context menu
        amountScrolled = 0;
        //stop sliding timer
        panEngine.reset();
    }
    
    //to trigger an update if jump tab
    function handleFocus(e){
        if (tabState == "blur")
            requestUpdate();
        tabState = "focus";
    }
    
    function handleBlur(e){
        tabState = "blur";
    }
    
    //Messenger
    function updateGlobalSetting(newGlobalSetting){
        clearAppState();
        GlobalSetting = newGlobalSetting;
        panEngine.updateSetting(GlobalSetting.scroll);
    }
    
    function requestUpdate(){
        chrome.runtime.sendMessage({type: "mm.cs.requestSetting"}, function(response) {
             updateGlobalSetting(response);
         }) 
    }
    
    function messageAllowed(msg){
        if (msg.source != win)
            return false;
        
        for (var i = 0; i < allowedMsgType.length; i++)
            if (msg.type == allowedMsgType[i])
                return true;
        
        return false;
    }
    
    function handleMessage(msg){
        if (!messageAllowed(msg))
            return;
        
        if (msg.type == "mm.popup.notify" || msg.type == "mm.bg.notify")
            updateGlobalSetting(msg.data.setting);
    }
    
    function init(){
        //INIT Point
        //mouse and keyboard handlers
        win.addEventListener("mousemove", handleMouseMove, true);
        win.addEventListener("mousedown", handleMouseDown, true);
        win.addEventListener("mouseup", handleMouseUp, true);

        win.addEventListener("keydown", handleKeyDown, true);
        win.addEventListener("keyup", handleKeyUp, true);
        
        win.oncontextmenu = handleContextMenu;
        win.addEventListener("focus", handleFocus, true);
        win.addEventListener("blur", handleBlur, true);

            //messengers
        win.addEventListener("message", handleMessage, true);

        //init panEngine
        panEngine = new PanEngine(GlobalSetting, win, doc);
        //init variables
        tabState = "blur";
        amountScrolled = 0;


        //finally get a fresh update for setting
        requestUpdate();
    }
    
    this.requestUpdate = requestUpdate;
    
    this.init = init;
};

var HandTool = new WinHandTool(window, document, chrome);

HandTool.init();


//function handleContextMenu(e){
//        if ((PREVENT_CM_THRESHOLD < amountScrolled) && (GlobalSetting.state == "activated"))  {
//            document.getElementsByClassName("html5-context-menu")[0].className += " hid";
//            return false;
//        }
//        return true;
//    }