var child_process = require('child_process');
var exec = child_process.exec;
var util = require('util');
var os = require('os');
var async = require('async');

function curlCommand(proxy, url, time) {
    time = time || 5;
    var outputFile = '/dev/null';
    if (/^win/.test(os.platform())) {
        outputFile = 'NUL';
    }
    return util.format('curl -X GET --silent --max-time %s --proxy %s -o %s --write-out %{speed_download} -L %s', time, proxy, outputFile, url);
}

var allProxies = [];
var proxySpeeds = {};

function getProxySpeed(proxy, time, url, cb) {
    // TODO: Make platform independent
    var CURL_INTERRUPTED_ERROR = 28;
    exec(curlCommand(proxy, url, time), function(error, stdout, stderr) {
        var speed = stdout;
        if (error !== null) {
            return cb(true, 0);
        }
        cb(null, speed);
    });
}

function updateProxySpeed(proxy, time, url, cb) {
    getProxySpeed(proxy, time, url, function(error, speed){
        proxySpeeds[proxy] = {speed: parseInt(speed), updated: Date.now()};
        cb();
    });
}

exports.updateAllProxies = function(proxies, time, cb) {
    allProxies = proxies;
    var IE_URL="http://download.microsoft.com/download/8/A/C/8AC7C482-BC74-492E-B978-7ED04900CEDE/IE10-Windows6.1-x86-en-us.exe" + "?randomFoo=" + Math.random();
    async.each(proxies,
               function(proxy, cb) {
                   updateProxySpeed(proxy, time, IE_URL, cb);
               }, cb);
};

exports.fastestProxy = function() {
    var fp = allProxies[0];
    for (var i = 0; i < allProxies.length; i++) {
        var proxy = allProxies[i];
        if (proxySpeeds.hasOwnProperty(proxy) &&
            proxySpeeds[proxy].speed > proxySpeeds[fp].speed) {
            fp = proxy;
        }
    }
    return fp;
};

exports.getProxySpeed = getProxySpeed;
