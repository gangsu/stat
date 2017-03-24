/**
 * 点击事件上报，分为立即上报和延时上报，延时上报通过cookie存储。
 * 
 * 一、配置参数，主要用于定义上报的一些配置信息。通过在外部定义_clickc对象重置参数。
 *     参数名称       类型          默认值             说明
 *     selector:      string        '_click_rp'        点击触发的选择器，支持ID、class
 *     prefix:        string        '_rp_'             需要上报的参数属性名前缀，如_rp_type，表示要上报type参数的值
 *     cookie:        string        '_click_rp'        延迟上报时的cookie名称
 *     domain:        string        '.hinabian.com'    cookie存储的域名（可以通过使用的网站来获得）
 *     delay:         boolean       false              是否延迟上报，默认为立即上报。延迟上报通过cookie实现
 *     delay_attr:    string        _delay             标签中指定是否延迟上报，优先级最高，ture延时，其他不延时。
 *     event_attr:    string        _event             指定触发的事件类型，如点击事件(click或空)、鼠标移动事件(mouse)，默认为点击事件。
 *     mouse_limit    integer       1500               鼠标移动事件的触发时长，单位毫秒，默认为1500毫秒，表示移动1.5秒后才执行。
 *     
 * 二、外部参数，主要用于定义上报的参数。通过在外部定义_clickq数组增加参数。
 *
 * 三、标签参数，使用前缀_rp_定义，上报的时候会将所有_rp_开头的参数上报。参数的格式分为两种，1种纯字符，1中回调函数。
 * <a class="_click_rp" href="" _rp_a="aa" _rp_b="bb">a</a>，表示上报时的参数为a=aa&b=bb
 * 1，纯字符，直接定义字符，表示需要上传参数的值。
 * 2，回调函数，以javascript:开头。只需定义函数体，在函数体中返回参数的值。
 * 如，<a href="/qa_question/press.html" id="ques_search_btn" class="_click_rp" _rp_act="javascript:if($('#ques_search_btn').text()=='提问'){return 'act_qa_ques';}else{return 'act_search';}"><span>提问</span></a>
 *
 * 四、延时上报，分为三种优先级，如下由高到低
 * 1，标签属性_delay是否指定为true，如果是表示延迟上报。
 * 2，是否为特定标签，如a标签本窗口打开（target等于"_self"或空），submit按钮。
 * 3，配置参数中指定的delay参数。
 *
 * 五、可以直接调用js进行上报
 * $.rpComm 直接传上报对象
 * $.rpCommParam 直接传上报参数
 * 
 * 六、支持：需要依赖jQuery插件。
 * 
 * 七、使用案列
 * 1，引入JS
 * var _clickq = _clickq || [];
 * _clickq.push(['param1', 'value1']);
 * var _clickc = {selector:'_click_rps'};
 * (function() {
 *  var click = document.createElement("script");
 *  click.src = "//cache.hinabian.com/js/lib/stat/click.js";
 *  var s = document.getElementsByTagName("script")[0]; 
 *  s.parentNode.insertBefore(click, s);
 * })();
 * 
 * 2，定义选择器和上传参数
 * 如，<a class="_click_rp" href="" _rp_a="aa" _rp_b="bb">a</a>
 */
(function () {
    // 默认参数
    var options = {
        selector: '_click_rp',
        prefix: '_rp_',
        cookie: '_click_rp',
        domain: '.hinabian.com',
        delay: false,
        delay_attr: '_delay',
        event_attr: '_event',
        mouse_limit: 1500
    };

    var params = {};
    var _params = {};
    var clickObj = null; // 当前点击对象

    // 获得对象
    var getObject = function(selector) {
        if (typeof(selector) == 'object') {
            return selector;
        } else {
            var obj = $('#'+selector);
            if (obj.length) {
                return obj;
            }
            obj = $('.'+selector);
            if (obj.length) {
                return obj;
            }
            return null;
        }
    }
    // 获得选择器
    var getSelector = function(selector) {
        return '#' + selector + ',.' + selector;
    }
    // 操作cookie函数
    var getCookie = function(c_name) {
        if (document.cookie.length>0) {
            c_start = document.cookie.indexOf(c_name + "=")
            if (c_start!=-1) { 
                c_start=c_start + c_name.length+1 
                c_end=document.cookie.indexOf(";",c_start)
                if (c_end==-1) c_end=document.cookie.length
                return unescape(document.cookie.substring(c_start,c_end))
            }
        }
        return "";
    }
    var setCookie = function(c_name,value,expiredays,path,domain) {
        var exdate = new Date()
        exdate.setDate(exdate.getDate()+expiredays)
        var cookie = c_name+ "=" +escape(value)+((expiredays==null) ? "" : ";expires="+exdate.toGMTString());
        if (path) cookie = cookie + ";path=" + path;
        if (domain) cookie = cookie + ";domain=" + domain;
        document.cookie = cookie;
    }

    // 获得标签中的参数
    var getAttrParam = function() {
        if ( clickObj ) {
            var attrs = clickObj.get(0).attributes;
            $.each(attrs, function(i) {
                var name = attrs[i].name;
                if ( name.indexOf(options.prefix) == 0 ) {
                    name = name.replace(options.prefix, '');
                    var value = attrs[i].value;
                    if ( value.indexOf('javascript:') == 0 ) {
                        // 执行js获得参数值
                        value = value.replace('javascript:', '');
                        eval('var valFun = function() {'+ value +'};');
                        value = valFun();
                    }
                    params[name] = value;
                }
            });
        }
    }
    // 获得默认参数
    var getDefaultParam = function() {
        if(document) {
            params.url = document.URL || '';
            params.referrer = document.referrer || '';
        }
        // 时间
        var date = new Date();
        params.ltime = date.getTime() / 1000;

        // 时间戳
        params.t = date.getTime();
    }
    /// 返回默认参数对象
    var getDefaultParamObj = function() {
        var _tmp = {};
        if(document) {
            _tmp.url = document.URL || '';
            _tmp.referrer = document.referrer || '';
        }
        // 时间
        var date = new Date();
        _tmp.ltime = date.getTime() / 1000;

        // 时间戳
        _tmp.t = date.getTime();
        return _tmp;
    }
    var getParamStr = function() {
        getAttrParam();
        getDefaultParam();
        // 合并配置参数
        for(var key in _params) {
            params[key] = _params[key];
        }
        //拼接参数串
        var args = ''; 
        for(var i in params) {
            if(args != '') {
                args += '&';
            }   
            args += i + '=' + encodeURIComponent(params[i]);
        }
        return args;
    }
    // json转string，通过js参数上报时需要用到
    var jsonToUrlStr = function(json) {
        var args = ''; 
        for(var i in json) {
            if(args != '') {
                args += '&';
            }   
            args += i + '=' + encodeURIComponent(json[i]);
        }
        return args;
    }

    // 清空参数
    var clearParam = function() {
        params = {};
    }

    // 是否立即上报，如果跳转页面，则计入延时上报
    var getIsDelay = function() {
        if ( clickObj ) {
            // 有具体指定
            if ( clickObj.attr(options.delay_attr) == 'true' ) {
                return true;
            } else if ( clickObj.attr(options.delay_attr) == 'false' ) {
                return false;
            }
            // 特定标签
            // a标签
            if ( clickObj.is('a') ) {
                if ( clickObj.attr('href').indexOf('javascript:') == 0 ) {
                    return false;
                }
                if ( clickObj.attr('target') && clickObj.attr('target') != '_self' ) {
                    return false;
                }
                return true;
            }
            // submit按钮
            if ( (clickObj.is('input') || clickObj.is('button')) && clickObj.attr('type') == 'submit' ) {
                var form = clickObj.parents('form');
                if ( !form.attr('action') ) {
                    return false;
                }
                return true;
            }
        }
        return options.delay;
    }
    
    // 加入cookie，下次上报
    var setDelayCookie = function(args) {
        showLog('click cookie');
        // 获得参数
        if ( args == undefined ) {
            args = getParamStr();
        }
        var cookieStr = getCookie(options.cookie);
        if ( cookieStr == '' ) {
            cookieStr = args;
        } else {
            cookieStr = cookieStr + ',' + args;
        }
        setCookie(options.cookie, cookieStr, 7, '/', options.domain);
        clearParam();
    }

    // 上报cookie中的请求，页面加载时上报
    var rpCookie = function() {
        // 获得cookie，循环操作
        var cookieStr = getCookie(options.cookie);
        if ( cookieStr ) {
            var cookieArr = cookieStr.split(',');
            for(var key in cookieArr){  
                rpClick(cookieArr[key]);
            }  
            setCookie(options.cookie, '', 7, '/', options.domain);
        }
    }

    // 获得唯一编号
    var unique = (function () {
        var time= (new Date()).getTime()+'-', i=0;
        return function () {
           return time + (i++);
        }
    })();

    // 上报
    var rpClick = function(args) {
        if ( args == undefined ) {
            args = getParamStr();
        }
        // 注意垃圾回收机制
        var data  = window['imgData'] || (window['imgData'] = {});
        var img   = new Image(1, 1);
        var uid   = unique();
        data[uid] = img;
        img.onload = img.onerror = function() {
            img.onload = img.onerror = null;
            img = null;
            delete data[uid];
        }
        img.src = '//data.hinabian.com/stat/click?' + args;
        
        showLog(img.src);
        clearParam();
    }

    // js上报函数，通过js调用
    var rpComm = function(obj) {
        showLog('click');
        clickObj = obj;
        if ( getIsDelay() ) {
            setDelayCookie();
        } else {
            rpClick();
        }
    }
    var rpCommParam = function(param, delay) {
        if ( param != undefined ) {
            var args = '';
            var defaultParam = getDefaultParamObj();
            if ( typeof param == 'object' ) {
                param = $.extend({}, defaultParam, param);
                args = jsonToUrlStr(param);
            }
            if ( args ) {
                if ( delay != undefined && delay == true ) {
                    setDelayCookie(args);
                } else {
                    rpClick(args);
                }
            }
        }
    }

    // js注册上报事件
    var registerRp = function(obj,param,time) {
        if ( time == undefined ) {
            time = 3000;
        }
        setTimeout(function(){
            if ( obj && typeof(obj) != 'object' ) {
                eval('var objFun = function() {return '+ obj +'};');
                obj = objFun();
            }
            var event = getEventType();
            showLog('register ' + event);
            if ( obj ) {
                obj.bind(event, function(){
                    $.rpCommParam(param);
                });
            }
        },time);
    }

    // 事件类型，jQuery时用Click，zepto用tap
    var getEventType = function() {
        if( $.fn && $.fn.jquery == undefined ) {
            return 'tap'; // tap事件在touchend中被执行，有250ms的延迟
        }
        return 'click';
    }

    // 输出日志方法，IE没有console，会引发js错误
    var showLog = function(log) {
        if ( typeof(console) != "undefined" ) {
            console.info(log);
        }
    }

    //解析外部配置
    if(_clickc) {
        for(var i in _clickc) {
            options[i] = _clickc[i];
        }   
    }
    
    //解析外部参数
    if(_clickq) {
        for(var i in _clickq) {
            _params[_clickq[i][0]] = _clickq[i][1];
        }
    }

    // 提供外部js函数
    $.rpComm = function(obj) {
        rpComm(obj);
    }
    $.fn.rpComm = function() {
        rpComm($(this));
    }
    /// 直接根据参数上报
    $.rpCommParam = function(param,delay) {
        rpCommParam(param,delay);
    }
    $.fn.rpCommParam = function(param,delay) {
        rpCommParam(param,delay);
    }
    /// 外部js注册事件
    $.registerRp = function(obj,param,time) {
        registerRp(obj,param,time);
    }
    $.fn.registerRp = function(obj,param,time) {
        registerRp(obj,param,time);
    }

    // cookie中的上报
    rpCookie();

    // 初始化信息
    var selector = getSelector(options.selector);
    /// 点击事件
    var _time  = 0;
    var _event = getEventType();
    $('body').delegate(selector,_event,function() {
        // 连续点击限制
        if(new Date().valueOf() - _time < 500) {
            return;
        }
        _time = new Date().valueOf();
        if ( $(this).attr(options.event_attr) == undefined || $(this).attr(options.event_attr) == 'click' ) {
            rpComm($(this));
        }
    });
    // longTap事件
    $('body').delegate(selector,'longTap',function() {
        if ( $(this).attr(options.event_attr) == undefined || $(this).attr(options.event_attr) == 'longTap' ) {
            rpComm($(this));
        }
    });
    /// 鼠标移动事件(只针对PC)
    var _timer;
    $('body').delegate(selector,'mouseenter',function(){
        clearTimeout(_timer);
        if ( $(this).attr(options.event_attr) == 'mouse' ) {
            var _this = $(this);
            _timer = setTimeout(function(){
                rpComm(_this);
            }, options.mouse_limit);
        }
    });
    $('body').delegate(selector,'mouseleave',function(){
        clearTimeout(_timer);
    });
})();