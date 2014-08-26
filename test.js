var exec = require('child_process').exec;
var util = require('util');
var afp = require('./afp');
var argv = require('minimist')(process.argv.slice(2));
var async = require('async');
var config = require('./config.json');

var TIMESTAMP = Date.now();

testWebsites = [
    "https://www.google.co.in",
    "https://www.facebook.com",
    "https://mail.google.com"
];

function printBenchmark(proxy, website, speed) {
    var args = {
        proxy: proxy,
        website: website,
        speed: speed,
        timestamp: TIMESTAMP
    };
    console.log(JSON.stringify(args));
}

function printProxyBenchmarks(proxy, cb) {
    async.each(testWebsites,
               function(website, cb) {
                   website += '/?randomFoo=' + Math.random();
                   afp.getProxySpeed(proxy, 30, website, function(err, speed) {
                       if (err) {
                           printBenchmark(proxy, website, 0);
                       } else {
                           printBenchmark(proxy, website, speed);
                       }
                       cb();
                   });
               }, cb);
}

function printBenchmarks() {
    async.each(config.proxies, printProxyBenchmarks);
}

(function main() {
    console.log(JSON.stringify({
        fastestProxy: argv.proxy || 'undefined',
        timestamp: TIMESTAMP
    }));
    printBenchmarks();
})();
