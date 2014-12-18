'use strict';

var Midas = function(newSetting, win, doc){
    
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
            deltaX: target.type == 'application/pdf' ? - scrollAmountX : - scrollAmountX * 120,
            deltaY: target.type == 'application/pdf' ? - scrollAmountY : - scrollAmountY * 120
        });
        target.dispatchEvent(evt);

        //do a check, if nothing scrolled, bubble it up to body, manually
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
        clearIntervals();
        state = 'stopped';
    };
    
    this.pan = function(current, prev) {
        try {
            //receive a mousemove event
            //perform panning
            var scrollAmountX = (current.x - prev.x) * setting.scale;
            var scrollAmountY = (current.y - prev.y) * setting.scale;

            scroll(current.target, scrollAmountX, scrollAmountY, current.e);

            state = 'panning';            

            return (Math.abs(scrollAmountX) + Math.abs(scrollAmountY));
        } catch (exception) {
            console.log(exception);
        }
            
    };

    this.slide = function(current) {
        try {
            if (setting.slide !== 'yes')
                return;

            state = 'sliding';

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
                if ((signMul(newVx, current.vx) === 1) && (Math.abs(current.vx) > Math.abs(FRICTION_PMS * dt))){

                    scroll(current.target, (current.vx * dt + frictionX * dt * dt / 2), 0, current.e);

                    current.vx = newVx;
                    stopped = false;
                }
                if ((signMul(newVy, current.vy) === 1) && (Math.abs(current.vy) > Math.abs(FRICTION_PMS * dt))){

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
            
        }
    };
    
    this.updateSetting = function(newSetting){
        setting = newSetting;
    };
    
    this.getState = function(){ return state; };
};

var HandTool = function(win, doc, chrome, handToolId){
    
    //GLOBAL SETTINGS
        //app get only
        //all setting done at option page
    var OSName;
    if (navigator.appVersion.indexOf('Win')!==-1) OSName = 'Windows';
    if (navigator.appVersion.indexOf('Mac')!==-1) OSName = 'MacOS';
    if (navigator.appVersion.indexOf('X11')!==-1) OSName = 'UNIX';
    if (navigator.appVersion.indexOf('Linux')!==-1) OSName = 'Linux';
    
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
        'mm.cs.destroy',
        'mm.popup.notify'
    ];
    
    //MOUSE DATA
    var current, prev;
    
        //SCROLLING ENGINE FIELDS & FUNCS
    var midas; 
    var amountScrolled;
    
        //STYLING FIELDS & FUNCS
            //change cursor
    
    
            //remove context menu

    //prevent context menu if panning amount > 3px
    var PREVENT_DEFAULT_THRESHOLD = 3;

    function panActive(e) {
        // check if extension is deactivated
        if ((parseInt(GlobalSetting.activation.mouse) !== 0) && 
            (parseInt(e.which) !== parseInt(GlobalSetting.activation.mouse)) ||
            (GlobalSetting.state === 'deactivated'))
            return false;
        
        // check if activation keys are pressed
        for (var i = 0; i < GlobalSetting.activation.key.length; i++)
            if (!e[GlobalSetting.activation.key[i]])
                return false;
        
        return true;
    }
    
    //main handler - event forwarder
    function handleMouseDown(e) {
        //request a new scroll session
        amountScrolled = 0;
        
        if (!panActive(e))
            return;

        if (GlobalSetting.activation.mouse === '1' && 
            GlobalSetting.activation.key[0] === 'ctrlKey') {
            injectionTargets.push(e.target);
            injectionTargets.forEach(function(element) {
                element.webkitUserSelect = 'none';
            });
            document.body.style.cursor = '-webkit-grabbing';
        }

        midas.reset();

        if (e.which == '2' || e.which == '1')
            e.preventDefault();
    }
    
    function handleMouseMove(e) {
        if (midas.getState() == 'stopped')
            prev = {
                x: e.clientX,
                y: e.clientY,
                time: e.timeStamp,
                vx: 0,
                vy: 0,
                target: e.target,
                e: e
            };

        if (!panActive(e))
            return;
        
        var t = e.timeStamp;
        
        current = {
            x: e.clientX,
            y: e.clientY,
            time: t,
            vx: (t > prev.time) ? ((e.clientX - prev.x) / (t - prev.time)) : 0,
            vy: (t > prev.time) ? ((e.clientY - prev.y) / (t - prev.time)) : 0,
            target: prev.target,
            e: e
        };
        
        amountScrolled += midas.pan(current, prev);
        
        prev = current;
        
        if (e.which == '2' || e.which == '1') {
            e.preventDefault();
            return false;
        }
    }
    
    function handleMouseUp(e) {
        // this is the first of the combination to be removed
        if (!panActive(e))
            return;
        
        if (GlobalSetting.activation.mouse === '1' && 
            GlobalSetting.activation.key[0] === 'ctrlKey') {
            document.body.style.cursor = '-webkit-grab';
        }

        midas.slide(current);
        current = null;

        if ((e.which == '2' || e.which == '1') && amountScrolled > PREVENT_DEFAULT_THRESHOLD) {
            e.preventDefault();
            return false;
        }
    }

    // var styles = {
    //     disableSelect: '-webkit-user-select: none !important;',
    //     openHand: '',
    //     closedHand: ''
    // }
    var injectionTargets = [];

    function handleKeyDown(e) {
        // sln 1
        // var bodyStyle = document.body.getAttribute('style');
        // if ((!bodyStyle || bodyStyle.indexOf(styles.disableSelect) === -1) &&
        //     GlobalSetting.activation.mouse === '1' && 
        //     GlobalSetting.activation.key[0] === 'ctrlKey') {
        //     document.body.setAttribute('style', (bodyStyle ? bodyStyle : '') + styles.disableSelect);
        // }

        // sln 2    
        if (GlobalSetting.activation.mouse === '1' && 
            GlobalSetting.activation.key[0] === 'ctrlKey') {
            document.body.style.webkitUserSelect = 'none'; 
            document.body.style.cursor = '-webkit-grab';
        }

        // request a new scroll session
        if (midas.getState() === 'panning' || !panActive(e))
            return;
        
        // if (GlobalSetting.activation.mouse === '1' && 
        //     GlobalSetting.activation.key[0] === 'ctrlKey') {
        // }

        midas.reset();
    }
    
    function handleKeyUp(e) {
        // sln 1
        // var bodyStyle = document.body.getAttribute('style');
        // if (bodyStyle && GlobalSetting.activation.mouse === '1' && 
        //     GlobalSetting.activation.key[0] === 'ctrlKey')
        //     document.body.setAttribute('style', 
        //         bodyStyle.replace(styles.disableSelect, ''));

        // sln 2
        if (GlobalSetting.activation.mouse === '1' && 
            GlobalSetting.activation.key[0] === 'ctrlKey') {
            document.body.style.webkitUserSelect = '';
            injectionTargets.forEach(function(element) {
                element.webkitUserSelect = '';
            });
            injectionTargets = [];
            document.body.style.cursor = '';
        }

        // this is the first of the combination to be removed
        if (!isActivator(e.keyCode) || (midas.getState() !== 'panning'))
            return;

        midas.slide(current);
    }
    
    function isActivator(keyCode) {
        // Control
        if (keyCode == 17)
            for (var i = 0; i < GlobalSetting.activation.key.length; i++){
                if (GlobalSetting.activation.key[i] == 'ctrlKey')
                    return true;
            }
        // Alt
        if (keyCode == 18)
            for (var i = 0; i < GlobalSetting.activation.key.length; i++){
                if (GlobalSetting.activation.key[i] == 'altKey')
                    return true;
            }
        return false;
    }
        
    function handleContextMenu() {
        if ((PREVENT_DEFAULT_THRESHOLD < amountScrolled) && (GlobalSetting.state == 'activated')) 
            return false;
        return true;
    }
    
    //SETTING UPDATE related funcs
    //reset app state
    function clearAppState() {
        //stop preventing context menu
        amountScrolled = 0;
        //stop sliding timer
        midas.reset();
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
    function updateGlobalSetting(newGlobalSetting){
        clearAppState();
        GlobalSetting = newGlobalSetting;
        midas.updateSetting(GlobalSetting.scroll);
    }
    
    function requestUpdate() {
        chrome.runtime.sendMessage({type: 'mm.cs.requestSetting'}, function(response) {
            updateGlobalSetting(response);
         });
    }
    
    function messageAllowed(msg) {
        if (msg.source !== win)
            return false;
        
        for (var i = 0; i < allowedMsgType.length; i++)
            if (msg.data.type == allowedMsgType[i])
                return true;
        
        return false;
    }
    
    function handleMessage(msg) {
        if (!messageAllowed(msg))
            return;

        if (msg.data.type === 'mm.popup.notify')
            updateGlobalSetting(msg.data.setting);

        if (msg.data.type === 'mm.cs.destroy' && msg.data.exclude != handToolId)
            destroy();
    }
    
    function init() {
        //INIT Point
        //mouse and keyboard handlers
        win.addEventListener('mousemove', handleMouseMove, true);
        win.addEventListener('mousedown', handleMouseDown, true);
        win.addEventListener('mouseup', handleMouseUp, true);

        win.addEventListener('keydown', handleKeyDown, true);
        win.addEventListener('keyup', handleKeyUp, true);
        
        win.addEventListener('focus', handleFocus, true);
        win.addEventListener('blur', handleBlur, true);
        win.oncontextmenu = handleContextMenu;

        //messengers
        win.addEventListener('message', handleMessage, true);

        //init midas
        midas = new Midas(GlobalSetting, win, doc);
        //init variables
        tabState = 'blur';
        amountScrolled = 0;

        //finally get a fresh update for setting
        requestUpdate();
    }

    function destroy() {
        win.removeEventListener('mousemove', handleMouseMove, true);
        win.removeEventListener('mousedown', handleMouseDown, true);
        win.removeEventListener('mouseup', handleMouseUp, true);

        win.removeEventListener('keydown', handleKeyDown, true);
        win.removeEventListener('keyup', handleKeyUp, true);

        win.removeEventListener('focus', handleFocus, true);
        win.removeEventListener('blur', handleBlur, true);

        win.removeEventListener('message', handleMessage, true);
    }
    
    this.requestUpdate = requestUpdate;
    this.init = init;
};

// Init point
var handToolId = + new Date();
window.postMessage({type: 'mm.cs.destroy', exclude: handToolId},'*');
var handTool = new HandTool(window, document, chrome, handToolId);
handTool.init();
