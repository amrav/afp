var os = require('os');
var exec = require('child_process').exec;

var commonProxyCommands = {
  'darwin': 'networksetup -setsecurewebproxy "Wi-Fi" %h %p && networksetup -setwebproxy "Wi-Fi" %h %p',
  'win': 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d %h:%p /f 1> NUL',
  'ubuntu': 'gsettings set org.gnome.system.proxy.http host %h && gsettings set org.gnome.system.proxy.http port %p && gsettings set org.gnome.system.proxy.https host %h && gsettings set org.gnome.system.proxy.https port %p'
};

exports.detectSystemProxyCommand = function(cb) {
  if (os.platform() === 'darwin') {
    cb(null, commonProxyCommands.darwin);
  } else if (/^win/.test(os.platform())) {
    cb(null, commonProxyCommands.win);
  } else if (os.platform() === 'linux') {
    exec('lsb_release -si', function(err, stdout, stderr) {
      if (err) {
        return cb(err);
      }
      if (/Ubuntu/.test(stdout)) {
        cb(null, commonProxyCommands.ubuntu);
      }
      else if(/LinuxMint/.test(stdout)){
        cb(null, commonProxyCommands.ubuntu);
      }
      else if (stderr) {
        console.log("stderr: ", stderr);
        cb(true);
      }

    });
  } else {
    cb('no proxy command detected');
  }
};
