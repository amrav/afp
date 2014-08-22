var config = require('./config.json');
var proxies = config.proxies;

var afp = require('./afp');
var sys = require('./sys');

var async = require('async');
var argv = require('minimist')(process.argv.slice(2));
var exec = require('child_process').exec;
var util = require('util');

function runProxyCommand(proxyCommand, host, port) {
    var command = proxyCommand.replace(/%h/g, host).replace(/%p/g, port);
    exec(command, function(error, stdout, stderr) {
        if (error) {
            console.error('exec error: ', error);
            return;
        }
        console.log(util.format("Fastest proxy detected as %s:%s", host, port));
    });
}

function printUsage() {
    console.log("node afp.js [--time UPDATE_TIME] [--sleep SLEEP_TIME] --proxyCommand PROXY_COMMAND");
    console.log("\nPROXY_COMMAND is a command to set the proxy, that is specific to your system. Use %h instead of the host and %p instead of the port.");
}

function detectProxyCommand(cb) {
    if (argv.proxyCommand) {
        cb(null, argv.proxyCommand);
    } else {
        sys.detectSystemProxyCommand(cb);
    }
}

(function main() {

    if (argv.help) {
        printUsage();
        process.exit();
    }

    argv.time = parseInt(argv.time || config.time);
    argv.sleep = parseInt(argv.sleep || config.sleep);

    async.waterfall([detectProxyCommand,
                     function(proxyCommand) {
                         console.log("Auto fast proxy started...");
                         async.forever(function(next) {
                             afp.updateAllProxies(
                                 config.proxies, argv.time,
                                 function(error) {
                                     var fp = afp.fastestProxy().split(':');
                                     runProxyCommand(proxyCommand, fp[0], fp[1]);
                                     setTimeout(next, argv.sleep * 1000);
                                 });
                         });
                     }],
                    function(err) {
                        if (err === 'no proxy command detected') {
                            printUsage();
                            process.exit(1);
                        }
                    });

})();
