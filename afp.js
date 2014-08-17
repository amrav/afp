var exec = require('child_process').exec;
var util = require('util');
var async = require('async');
var argv = require('minimist')(process.argv.slice(2));
var os = require('os');

function curlCommand(proxy, largeFileUrl, time) {
    time = time || 5;
    var outputFile = '/dev/null';
    if (/^win/.test(os.platform())) {
        outputFile = 'NUL';
    }
    return util.format('curl --silent --max-time %s --proxy %s -o %s --write-out %{speed_download} %s', time, proxy, outputFile, largeFileUrl);
}

proxySpeeds = {};

function getProxySpeed(proxy, time, cb) {
    // TODO: Make platform independent
    var CURL_INTERRUPTED_ERROR = 28;
    var IE_URL="http://download.microsoft.com/download/8/A/C/8AC7C482-BC74-492E-B978-7ED04900CEDE/IE10-Windows6.1-x86-en-us.exe";
    exec(curlCommand(proxy, IE_URL, time), function(error, stdout, stderr) {
        var speed = stdout;
        if (error !== null && error.code !== CURL_INTERRUPTED_ERROR) {
            console.log('exec error: ', error);
            return;
        }
        cb(speed);
    });
}

function updateProxySpeed(proxy, time, cb) {
    getProxySpeed(proxy, time, function(speed){
        proxySpeeds[proxy] = {speed: parseInt(speed), updated: Date.now()};
        cb();
    });
}

proxies=[
    "10.3.100.209:8080" ,
    "10.3.100.210:8080" ,
    "10.3.100.211:8080" ,
    "10.3.100.212:8080" ,
    "144.16.192.213:8080" ,
    "144.16.192.216:8080" ,
    "144.16.192.217:8080" ,
    "144.16.192.218:8080" ,
    "144.16.192.245:8080" ,
    "144.16.192.247:8080"
];

function updateAllProxies(time, cb) {
    async.each(proxies,
               function(proxy, cb) {
                   updateProxySpeed(proxy, time, cb);
               }, cb);
}

function fastestProxy() {
    var fastestProxy = proxies[0];
    for (var i = 0; i < proxies.length; i++) {
        if (proxySpeeds.hasOwnProperty(proxies[i]) &&
            proxySpeeds[proxies[i]].speed > proxySpeeds[fastestProxy].speed) {
            fastestProxy = proxies[i];
        }
    }
    return fastestProxy;
}

function printUsage() {
    console.log("node afp.js [--time UPDATE_TIME] [--sleep SLEEP_TIME] --proxyCommand PROXY_COMMAND");
    console.log("\nPROXY_COMMAND is a command to set the proxy, that is specific to your system. Use %h instead of the host and %p instead of the port.");
}

function setSystemProxy() {
    var fp = fastestProxy().split(':');
    var host = fp[0];
    var port = fp[1];

    var proxyCommand = argv.proxyCommand.replace(/%h/g, host).replace(/%p/g, port);
    console.log(proxyCommand);
    exec(proxyCommand, function(error, stdout, stderr) {
        if (error) {
            console.error('exec error: ', error);
        }
    });
}

var WIN_PROXY_COMMAND = 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d %h:%p /f';

commonProxyCommands = {
    'darwin': 'networksetup -setsecurewebproxy "Wi-Fi" %h %p && networksetup -setwebproxy "Wi-Fi" %h %p',
    'win32': WIN_PROXY_COMMAND,
    'win64': WIN_PROXY_COMMAND
};

(function main() {

    if (argv.help) {
        printUsage();
        process.exit();
    }
    
    var DEFAULT_UPDATE_TIME = 15;
    var DEFAULT_SLEEP_TIME = 10;
    argv.time = parseInt(argv.time || DEFAULT_UPDATE_TIME);
    argv.sleep = parseInt(argv.sleep || DEFAULT_SLEEP_TIME);

    if (!argv.proxyCommand) {
        if (commonProxyCommands[os.platform()]) {
            argv.proxyCommand = commonProxyCommands[os.platform()];
        } else {
            printUsage();
            process.exit(1);
        }
    }

    console.log("Auto fast proxy started...");
    async.forever(function(next) {
        updateAllProxies(argv.time, function() {
            setSystemProxy();
            setTimeout(next, argv.sleep * 1000);
        });
    });
})();
