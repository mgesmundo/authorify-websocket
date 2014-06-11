# Authorify Websocket

A plugin for [Authorify][1] that enable websockets. A provided router allow to use both http and websockets like a REST server. When the plugin is loaded it is available under the main namespace of the host application: app.plugin['your short plugin name'].

### Prerequisites

This plugin must be installed both in server and client, respectively in conjunction with [Authorify][1] and [Authorify-Client][2].

## Installation

Install `authorify-websocket` as usual:

    $ npm install --save authorify-websocket

## Usage

### Server

```javascript
var restify = require('restify');
var authorify = require('authorify')({
  //... options
});
// create the http server
var server = restify.createServer();
// add plugin to the server
authorify.load('authorify-websocket', 'ws', {
  transports: ['ws', 'http'],
  requestTimeout: 200
});
// get the loaded plugin
var ws = authorify.plugin.ws;
// create the websocket server
ws.createServer(server);
var router = ws.router;
// add routes
router.get('/handshake', ok);
router.get('/auth', ok);
router.get('/logout', ok);
router.post('/test', ok);
// start the server
server.listen(3000);
```

### Client (Node)

```javascript
// create the client
var client = require('authorify-client')({
  //... options
});
// add plugin to the client
client.load('authorify-websocket', 'ws', {
  transports: ['ws', 'http'],
  requestTimeout: 200
});
```

### Client (browser)

To create a single file to use in browser environment use a simple script that uses `browserify`:

    $ ./build.sh

and add the obtained `authorify-websocket.js` file to your `html` file.

__NOTE__: this file must be added AFTER `authorify.js` (the client) and BEFORE your script (`index.js` in this example):

```javascript
// index.js
var client = authorify;   // authorify is a global exposed by authorify-client
// configure the client
client.setConfig({
  //... options
});
// load plugin
client.load('authorify-websocket', 'ws', {
  transports: ['ws', 'http'],
  requestTimeout: 200
});
// request a resource
var message = { field1: 'value1', field2: 'value2' };
client.post('/test')
  .send(message)
   .end(function(err, res) {
      // the reply here or err only if request is over timeout
  });
```

```html
// index.html
<html>
  <body>
    <script src="authorify.js"></script>    // this is the browser version of Authorify-Client
    <script src="authorify-websocket.js"></script>
    <script src="index.js"></script>
  </body>
</html>
```

# Run Tests
Au usual we use [mocha][4] as test framework and you can run all tests simply typing:

    $ npm test

A full test for both server and client side is available into [authorify][1] package.

For more information about the client please read [authorify-client][2] documentation and the local documentation into doc` folder.

## Documentation

To create your own  documentation you must install [JSDuck][3] and type in your terminal:

    $ cd /path-of-package
    $ ./gen_doc.sh

See full documentation into _doc_ folder.

## Convention

The version number is laid out as: major.minor.patch and tries to follow semver as closely as possible but this is how we use our version numbering:

#### major
A major and possible breaking change has been made in the authorify core. These changes could be not backwards compatible with older versions.

#### minor
New features are added or a big change has happened with one of the third party libraries.

#### patch
A bug has been fixed, without any major internal and breaking changes.

# Contributing

To contribute to the project follow the [GitHub guidelines][8].

# License

This program is released under a GNU Affero General Public License version 3 or above, which in summary means:

- You __can use__ this program for __no cost__.
- You __can use__ this program for __both personal and commercial reasons__.
- You __do not have to share your own program's code__ which uses this program.
- You __have to share modifications__ (e.g bug-fixes) you've made to this program.

For more convoluted language, see the LICENSE file.


[1]: https://www.npmjs.org/package/authorify
[2]: https://www.npmjs.org/package/authorify-client
[3]: https://github.com/senchalabs/jsduck
[4]: https://www.npmjs.org/package/mocha
[8]: https://guides.github.com/activities/contributing-to-open-source/index.html
