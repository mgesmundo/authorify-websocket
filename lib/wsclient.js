/**
 * The websocket client. It is used automatically by [Authorify-Client](https://www.npmjs.org/package/authorify-client).
 *
 * @class node_modules.authorify_websocket.wsclient
 *
 * @author Marcello Gesmundo
 *
 * ## Example
 *
 *        var router = require('authorify')({
 *          // add your config options
 *        }).router;
 *        var ok = function(req, res, next) {
 *          // your logic
 *          next();
 *        };
 *        // add a route with a param ('user')
 *        router.add('GET', '/root/user/:user', ok);
 *        // add a versioned route
 *        router.get({ path: '/root/versioned', version: '~1.5.0' }, ok);
 *
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
 * [1]: http://mcavage.me/node-restify
 *
 */
module.exports = function(app, plugin) {
  'use strict';

  // dependencies
  var _                 = plugin._,
      util              = plugin.util,
      errors            = plugin.errors,
      urlUtil           = plugin.urlUtil,
      Request           = plugin.Request,
      Primus            = plugin.Primus,
      PrimusCallbacks   = plugin.PrimusCallbacks,
      Class             = plugin.jsface.Class,
      config            = app.config,
      log               = app.logger;

  var CError = errors.InternalError;

  // namespace
  var my = {};

  /**
   * @property {Array} The list of the connected clients.
   * @readonly
   */
  my.clients = [];

  /**
   * Get the client connected to the specified url.
   *
   * @param {String/Object} url The url object or a string that represent the url to which the client is connected.
   * @returns {Primus} The client connected that is a Primus client instance.
   */
  my.getClient = function(url) {
    if (!url) {
      throw new CError('missing url').log();
    }
    var host;
    if (_.isString(url)) {
      host = urlUtil.parse(url).host;
    } else {
      host = url.host;
    }
    return _.find(my.clients, function(conn) {
      return conn.url.host === host;
    });
  };

  /**
   * Add new Primus client instance.
   *
   * @param {String/Object} url The url object or a string that represent the url to connect.
   * @param {Object} opts The options for the Primus client.
   * See [Primus documentation](https://github.com/primus/primus) for a detailed explanation.
   */
  my.addClient = function (url, opts) {
    if (!my.getClient(url)) {
      // create new client
      var client, href,
          uri = url;
      if (_.isString(url)) {
        uri = urlUtil.parse(url);
      }
      href = util.format('%s//%s/', uri.protocol, uri.host);
      opts = opts || {};
      if (_.isFunction(Primus.connect)) {
        // is a browser client
        _.defaults(opts, config.primusOptions);
        client = Primus.connect(href, opts);
      } else {
        // is a Node client from another process
        var clientOptions = {
          plugin: {
            'responder': PrimusCallbacks
          }
        };
        _.defaults(opts, clientOptions, config.primusOptions);
        var Socket = Primus.createSocket(opts);
        client = new Socket(href, opts);
      }
      addHandlers(client);
      my.clients.push(client);
      log.debug('%s add websocket client connection to %s', app.name, client.url.host);
    }
  };

  /**
   * Remove a client.
   *
   * @param {String/Object} url The url object or a string that represent the url to which the client is connected.
   */
  my.removeClient = function (url) {
    var client = my.getClient(url);
    if (client) {
      client.end();
      my.clients = _.without(my.clients, client);
      log.debug('%s remove websocket client connection to %s', app.name, client.url.host);
    }
  };

  /**
   * The agent for websockets that emulate a http client.
   *
   * @param {String} method The required method for connection
   * @param {String} url The url of the request.
   * @param {Object} opts The options for the Primus client.
   * See [Primus documentation](https://github.com/primus/primus) for a detailed explanation.
   * @return {PrimusAgent} The agent instance
   */
  my.primusagent = function(method, url, opts) {
    return new PrimusAgent(method, url, opts);
  };

  var PrimusAgent = Class({                   // jshint ignore:line
    constructor: function(method, url, opts) {
      this.method = method;
      this.url = urlUtil.parse(url);
      my.addClient(this.url, opts);
    },
    set: function(key, value) {
      // set fake headers
      this.headers = this.headers || {};
      this.headers[key.toLowerCase()] = value;
    },
    query: function(value) {
      if (value) {
        if (!_.isObject(value)) {
          throw new CError('query must be an object').log();
        }
        this.queries = this.queries || {};
        _.extend(this.queries, value);
      }
    },
    send: function(value) {
      if (value) {
        if (!_.isObject(value)) {
          throw new CError('send object only').log();
        }
        this.body = this.body || {};
        _.extend(this.body, value);
      }
    },
    end: function(callback) {
      var client = my.getClient(this.url);
      if (!client) {
        throw new CError('websocket client not found for %s', this.url.host);
      }
      // create the request
      var req = new Request(_.pick(this, ['headers', 'method', 'queries', 'body']));
      req.isWebsocket = true;
      req.url = this.url.path;
      if (req.queries) {
        req.query = req.queries;
        delete req.queries;
      }
      client.writeAndWait(req, function(err, res) {
        if (err) {
          if (err.timeout) {
            err = new errors.RequestTimeoutError('timeout %s ms', err.timeout).log();
          } else if (err instanceof Error) {
            err = new CError(err.message).log();
          } else {
            err = new CError(err).log();
          }
        }
        callback(err, res);
      });
    }
  });

  function addHandlers(client) {
    if (!client) {
      throw new CError('websocket client not created').log();
    }
    client.on('open', function() {
      log.info('%s open websocket client connection to %s', app.name, client.url.host);
    });
    client.on('reconnect', function () {
      log.debug('%s reconnect attempt started for websocket client connection to %s', app.name, client.url.host);
    });
    client.on('reconnecting', function (opts) {
      log.debug('%s reconnecting websocket client connection to %s in %d ms', app.name, client.url.host, opts.timeout);
      log.debug('%s --> attempt  %d out of %d', app.name, opts.attempt, opts.retries);
    });
    client.on('timeout', function () {
      log.error('%s timeout websocket client connection to %s', app.name, client.url.host);
    });
    client.on('error', function (err) {
      log.error('%s error websocket client connection to %s', app.name, client.url.host);
      log.error('%s --> error: %s', app.name, err);
    });
    client.on('close', function() {
      log.info('%s close websocket client connection to %s', app.name, client.url.host);
      my.removeClient(client.url);
    });
  }

  return my;
};