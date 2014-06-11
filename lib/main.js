/**
 * A plugin for [Authorify](https://www.npmjs.org/package/authorify) that enable websockets. A provided router allow to use both http and websockets like a REST server. When the plugin is loaded it is available under the main namespace of the host application: app.plugin['your short plugin name'].
 *
 * @class node_modules.authorify_websocket
 *
 * @author Marcello Gesmundo
 *
 * ## Example
 *
 * ### Server
 *
 *     var restify = require('restify');
 *     var authorify = require('authorify')({
 *       //... options
 *     });
 *     // create the http server
 *     var server = restify.createServer();
 *     // add plugin to the server
 *     authorify.load('authorify-websocket', 'ws', {
 *       transports: ['ws', 'http'],
 *       requestTimeout: 200
 *     });
 *     // get the loaded plugin
 *     var ws = authorify.plugin.ws;
 *     // create the websocket server
 *     ws.createServer(server);
 *     var router = ws.router;
 *     // add routes
 *     router.get('/handshake', ok);
 *     router.get('/auth', ok);
 *     router.get('/logout', ok);
 *     router.post('/test', ok);
 *     // start the server
 *     server.listen(3000);
 *
 * ### Client (Node)
 *
 *      // create the client
 *      var client = require('authorify-client')({
 *        //... options
 *      });
 *      // add plugin to the client
 *      client.load('authorify-websocket', 'ws', {
 *        transports: ['ws', 'http'],
 *        requestTimeout: 200
 *      });
 *
 * ### Client (browser)
 *
 *      // index.js
 *      var client = authorify;   // authorify is a global exposed by authorify-client
 *      // configure the client
 *      client.setConfig({
 *        //... options
 *      });
 *      // load plugin
 *      client.load('authorify-websocket', 'ws', {
 *        transports: ['ws', 'http'],
 *        requestTimeout: 200
 *      });
 *      // request a resource
 *      var message = { field1: 'value1', field2: 'value2' };
 *      client.post('/test')
 *        .send(message)
 *         .end(function(err, res) {
 *            // the reply here or err only if request is over timeout
 *        });
 *
 *      // index.html
 *      <html>
 *        <body>
 *          <script src="authorify.js"></script>     // this is the browser version of [Authorify-Client][https://www.npmjs.org/package/authorify-client]
 *          <script src="authorify-websocket.js"></script>
 *          <script src="index.js"></script>
 *        </body>
 *      </html>
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 * @param {Object} app The namaspace of the host application
 * @param {Object} plugin The plugin namespace
 * @param {Object} options The plugin config options
 * @returns {Object} The plugin module
 *
 */
module.exports = function (app, plugin, options) {
  'use strict';

  // dependencies
  var _            = require('underscore'),
      async        = require('async'),
      pathToRegexp = require('path-to-regexp'),
      util         = require('util'),
      semver       = require('semver'),
      jsface       = require('jsface'),
      urlUtil      = require('url'),
      errors       = plugin.errors;

  app = app || {};
  
  errors.set({
    format: function(e, mode) {
      mode = mode || 'msg';
      // the app.name is that of the host application
      if (mode === 'msg') {
        return util.format('%s %s', app.name, e.message);
      }
      return util.format('%s %s', app.name, e.body);
    }
  });

  // namespace
  var my = plugin || {};

  my.name         = 'authorify-websocket';
  my._            = _;
  my.async        = async;
  my.pathToRegexp = pathToRegexp;
  my.util         = util;
  my.semver       = semver;
  my.jsface       = jsface;
  my.errors       = errors;
  my.urlUtil      = urlUtil;

  options = options || {};
  app.config = app.config || {};

  // namespace
  var pluginConfig = {
    /**
     * @cfg {Object} primusOptions The options for Primus
     * See [Primus documentation](https://github.com/primus/primus) for a detailed explanation.
     */
    primusOptions: {
      transformer: 'websockets',
      parser: 'JSON',
      strategy: ['online', 'disconnect'],
      methods: ['GET', 'HEAD', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: false
    },
    /**
     * @cfg {String} [transports = ['ws', 'http']] The enabled transport protocols. When a request is made, is used the first protocol and if it fails, it uses the second one.
     */
    transports: ['ws', 'http']
  };

  // merge configs
  // NOTE: app.config contains the configuration of the main application AND that of all the loaded plugins)
  _.extend(pluginConfig, options);
  _.extend(app.config, pluginConfig);

  my.Request = require('./Request')(app, my);
  my.Response = require('./Response')(app, my);

  my.router   = require('./router')(app, my);

  var wsserver = require('./wsserver')(app, my);

  my.wsclient = require('./wsclient')(app, my);

  my.createServer = wsserver.create;
  my.destroyServer = wsserver.destroy;

  return my;
};