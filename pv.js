/**
 * pv统计
 */
(function () {
    var params = {};
    //Document对象数据
    if(document) {
        params.domain = document.domain || ''; 
        params.url = document.URL || ''; 
        params.title = document.title || ''; 
        params.referrer = document.referrer || ''; 
    }   
    //Window对象数据
    if(window && window.screen) {
        params.sh = window.screen.height || 0;
        params.sw = window.screen.width || 0;
        params.cd = window.screen.colorDepth || 0;
    }   
    //navigator对象数据
    if(navigator) {
        params.lang = navigator.language || ''; 
    }   
    //解析_maq配置
    if(_pvq) {
        for(var i in _pvq) {
            switch(_pvq[i][0]) {
                case '_setAccount':
                    params.account = _pvq[i][1];
                    break;
                default:
                    break;
            }   
        }   
    }
    // 其他参数
    var date = new Date();
    params.ltime = date.getTime() / 1000;
    //拼接参数串
    var args = ''; 
    for(var i in params) {
        if(args != '') {
            args += '&';
        }   
        args += i + '=' + encodeURIComponent(params[i]);
    }   

    //通过Image对象请求后端脚本
    var data  = window['imgDataPv'] || (window['imgDataPv'] = {});
    var img   = new Image(1, 1);
    img.src = '//data.hinabian.com/stat/pv?' + args;
    data[date.getTime()] = img;

    // setTimeout(function(){
    //     var script = document.createElement('script');
    //     script.src = "http://mobile.dingsite.com/theapi/getjs?id=4856985";
    //     document.body.appendChild(script);
    // }, 3000);
})();