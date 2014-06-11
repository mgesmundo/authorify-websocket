var Primus = require('primus'),
    PrimusCallbacks = require('primus-callbacks'),
    http = require('http'),
    options = {
      transformer: 'websockets',
      parser: 'JSON'
    };
var server = http.createServer(),
    primus = Primus(server, options);

primus.use('callbacks', PrimusCallbacks);
primus.save(__dirname + '/build/primus.bundle.js');
