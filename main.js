var config = require('./config.json');

var afp = require('./afp');
var sys = require('./sys');

var async = require('async');
var argv = require('minimist')(process.argv.slice(2));
var exec = require('child_process').exec;
var util = require('util');

function runProxyCommand(proxyCommand, host, port) {
    if (!argv.silent) {
        console.log(util.format("Fastest proxy detected as %s:%s", host, port));
    }
    var command = proxyCommand.replace(/%h/g, host).replace(/%p/g, port);
    exec(command, function(error, stdout, stderr) {
        if (error && !argv.silent) {
            console.error('exec error: ', error);
            return;
        }
        process.stdout.write(stdout);
    });
}

function printUsage() {
    console.err("node main.js [--silent] [--time UPDATE_TIME] [--sleep SLEEP_TIME] --proxyCommand PROXY_COMMAND");
    console.err("\nPROXY_COMMAND is a command that uses the fastest proxy. Use %h instead of the host and %p instead of the port.");
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
                         if (!argv.silent) {
                             console.log("Auto fast proxy started.");
                         }
                         async.forever(function(next) {
                             afp.updateAllProxies(
                                 config.proxies, argv.time,
                                 function(error) {
                                     var fp = afp.fastestProxy();
                                     if (fp === null) {
                                         console.log("Warning: Couldn't detect the fastest proxy. Check your network?");
                                         setTimeout(next, 30 * 1000);
                                     } else {
                                         fp = fp.split(':');
                                         runProxyCommand(proxyCommand, fp[0], fp[1]);
                                         setTimeout(next, argv.sleep * 1000);
                                     }
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
