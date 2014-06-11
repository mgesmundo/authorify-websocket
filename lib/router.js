/**
 * The router for the routes management. All routes can be versioned like [restify][1] does.
 *
 * @class node_modules.authorify_websocket.router
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
  // dependencies
  var _            = plugin._,
      pathToRegexp = plugin.pathToRegexp,
      async        = plugin.async,
      errors       = plugin.errors,
      semver       = plugin.semver,
      Class        = plugin.jsface.Class,
      log          = app.logger,
      debug        = app.debug;

  var VERBS = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'HEAD',
    'OPTIONS'
  ];

  // namespace
  var my = {};

  /**
   * All routes
   *
   * @property {Object}
   * @readonly
   */
  my.routes = {};

  /**
   * All reversed routes
   *
   * @property {Object}
   * @readonly
   */
  my.reverseRoutes = {};

  /**
   * Execute the handlers chain for the handled route.
   * To get the handled route use req.getRoute() method
   *
   * @param {Object} req The request
   * @param {Object} res The response
   * @param {Function} next The callback: next(err)
   * @param {Error} next.err The error instance if occurred
   */
  my.run = function(req, res, next) {
    var handlers = req.getRoute().handlers;
    var fns = _.map(handlers, function(fn) {
      return function(callback) {
        return fn(req, res, callback);
      };
    });
    async.series(fns, next);
  };

  /**
   * Find a route for the request path and method
   *
   * @param {Object} req The request
   * @param {Object} res The response
   * @param {Function} next The callback: next(err)
   * @param {Error} next.err The error instance if occurred
   */
  my.find = function(req, res, next) {
    // add getRoute()
    setHandledRoute(req);
    var method = req.method || 'GET',
        version = getVersion(req);

    method = method.toUpperCase();
    var routes = my.routes[method] || {};

    if (version instanceof Error) {
      next(version);
    } else {
      // get the first reasonable version and set as current version
      req._versionIterator = new VersionIterator(method, version);
      req._agentVersion = req._version;

      var lastError,
          ok200 = '__ok200__';
      async.whilst(
        function() {
          req._nextVersion = req._versionIterator.next();
          if (req._nextVersion) {
            req._version = req._nextVersion;
          }
          return req._nextVersion;
        },
        function(callback) {
          if (routes[req._version]) {
            findInAllowedMethod(req, res, function(err) {
              lastError = err;
              callback((err ? null : ok200));
            });
          } else {
            findInNotAllowedMethod(req, res, function(err) {
              lastError = err;
              callback((err ? null : ok200));
            });
          }
        },
        function(err) {
          if (err === ok200) {
            next();
          } else {
            log.error('%s %s', app.name, lastError.message || err.message);
            next(lastError || err);
          }
        }
      );
    }
  };

  /**
   * Find a route for the request path and method and execute the available handlers chain
   *
   * @param {Object} req The request
   * @param {Object} res The response
   * @param {Function} next The callback: next(err)
   * @param {Error} next.err The error instance if occurred
   */
  my.findAndRun = function(req, res, next) {
    my.find(req, res, function(err) {
      if (!err) {
        log.debug('%s handled route %s v%s', app.name, req.getRoute().name, req.getRoute().version);
        my.run(req, res, next);
      } else {
        next(err);
      }
    });
  };

  /**
   * Add a new route for the request path and method. You can add route using this method or (preferably)
   * using the specific method (for the required verb) or `all` method to add all available verbs for a path.
   * For every route you can specify more than one handler as a function with the
   * known signature `function (req, res, next)`.
   * The route can be versioned using an object with path and version properties instead a string path
   * (like [restify](http://mcavage.me/node-restify) does).
   *
   * ## Example
   *
   *        var router = require('authorify')({
   *          // add your config options
   *        }).router;
   *        var first = function(req, res, next) {
   *          // your logic
   *          next();
   *        };
   *        var second = function(req, res, next) {
   *          // your logic
   *          next();
   *        };
   *        // add a route with a parameter ('user')
   *        router.add('GET', '/root/user/:user', first, second);
   *        // you can use a public method instead the above private method
   *        router.get('/root/user/:user', first, second);
   *        // failure adding a route with an optional parameter ('user') because this route is ambiguous with the previous
   *        router.get('/root/user/:user?', first, second);
   *        // add a versioned route
   *        router.get({ path: '/root/versioned', version: '~1.5.0' }, first, second);
   *
   *
   * @param {String} method The method request for the route
   * @param {String/Object} path The path of the route
   * @param {String} path.path The path of the versioned route
   * @param {String} path.version The version of the route according (see [Semantic Versioning](https://www.npmjs.org/package/semver)')
   * @param {Function...} callback The route handler(s): callback (req, res, next)
   * @param {Object} callback.req The request
   * @param {Object} callback.res The response
   * @param {Function} callback.next The function to execute to go to next handler: next(err)
   * @param {Error} callback.next.err The error instance if occurred
   * __If the handler calls next(err) the handlers chain ends. If the next handler is missing, the handlers chain ends.__
   *
   */
  my.add = function(){
    var args = Array.prototype.slice.call(arguments);
    if (args.length < 3) {
      throw new Error('required at least three arguments');
    }
    var method = args[0].toUpperCase(),
        path = args[1],
        version = '*',
        handlers = _.tail(args, 2),
        keys = [],
        argsForServerAttach = [].concat(path).concat(handlers);

    var _path;
    if (_.isObject(path)) {
      if (path.path) {
        _path = path.path;
      } else {
        throw new Error('missing path');
      }
      if (path.version) {
        version = path.version;
      }
      path = _path;
    }
    path = path.urlSanify();
    var re = pathToRegexp(path, keys, {strict: true}),
        url = re.exec(path);
    if (_.isEmpty(url)) {
      throw new Error('wrong route ' + path);
    }
    my.routes[method] = my.routes[method] || {};
    my.routes[method][version] = my.routes[method][version] || {};
    // try to search duplicated routes
    if (!_.isEmpty(my.routes[method][version][path])) {
      throw new Error('route ' + path + ' already exists');
    }
    // make optional params as mandatory
    var _keys = _.map(keys, function(item) {
      return item.name;
    });
    var _path1 = path.replace(/\?/g, ''),
      _path2;
    // make all params with the same name in all routes
    _.each(_keys, function(key) {
      var re = new RegExp(':' + key, 'g');
      _path1 = _path1.replace(re, '_');
    });
    _.each(my.routes[method][version], function(route) {
      _path2 = route.name.replace(/\?/g, '');
      _.each(route.keys, function(key) {
        var re = new RegExp(':' + key.name, 'g');
        _path2 = _path2.replace(re, '_');
      });
      if (_.isEqual(_path1, _path2)) {
        throw new Error('route ' + path + ' is ambiguous with ' + route.name + ' route');
      }
    });
    my.routes[method][version][path] = my.routes[method][version][path] || {};
    var route = {
      name: path,
      version: version,
      keys: keys,
      regexp: re
    };
    if (handlers) {
      route.handlers = handlers;
    }
    my.routes[method][version][path] = route;
    // add to reverse routes
    my.reverseRoutes[version] = my.reverseRoutes[version] || {};
    my.reverseRoutes[version][path] = my.reverseRoutes[version][path] || {};
    if (_.isEmpty(my.reverseRoutes[version][path])) {
      my.reverseRoutes[version][path] = re;
    }
    // attach the route to the server
    if (my._server) {
      my._server[method.toLowerCase()].apply(my._server, argsForServerAttach);
    }
  };

  /**
   * Add a route for all methods (all available verbs)
   */
  my.all = function() {
    _.each(VERBS, create);
  };

  /**
   * Attach all routes to the server instance.
   * You __MUST__ attach the server to the router __before__ add the routes. You __MUST__
   * add all routes __only__ on the router and they can be added automatically to the server.
   * The server __MUST__ manage route in the restify format. Use restify! :-)
   *
   *
   * ## Example
   *
   *      // example of routes inside the router
   *
   *      { GET:
   *         { '*': { '/versioned':
   *           { name: '/versioned',
   *              version: '*',
   *              keys: [],
   *              regexp: /^\/versioned$/i,
   *              handlers: [ function (req, res, next) { next(); } ] } },
   *           '1.5.5': { '/versioned': [Object] },
   *           '1.2.3': { '/versioned': [Object] },
   *           '2.0.0': { '/versioned': [Object] },
   *           '0.5.2': { '/versioned': [Object] } } }
   *
   * @param {Object} server The server instance
   */
  my.attach = function(server) {
    if (server && _.isObject(server)) {
      my._server = server;
    } else {
      throw new Error('wrong server to attach');
    }
  };

  /**
   * Decode an url parameter
   *
   * @param {String} param The url parameter
   * @return {String} The decoded url parameter
   * @private
   * @ignore
   */
  function decode(param) {
    if (param) {
      return decodeURIComponent(param);
    }
    return param;
  }

  /**
   * Set req.params for a route
   *
   * @param {Object} req The request
   * @param {Object} route The route
   * @private
   * @ignore
   */
  function fillParams(req, route) {
    var params = route.params.slice(1).map(decode);
    var keys = _.map(route.keys, function(key) {
      return key.name;
    });
    req.params = _.object(keys, params);
    if (keys.length !== params.length) {
      // remove empty values
      _.each(req.params, function(param, name) {
        if (!param) {
          delete req.params[name];
        }
      });
    }
  }

  /**
   * Get the request version or closest version or default version
   *
   * @param {Object} req The request
   * @return {String} The semantic version compatible route version
   * @private
   * @ignore
   */
  function getVersion(req) {
    if (!req._version) {
      req.headers = req.headers || {};
      req._version = req.headers['accept-version'] || req.headers['x-api-version'] || '*';
      if (req._version !== '*' && !semver.validRange(req._version)) {
        req._version = new errors.BadRequestError('version not valid');
      }
    }
    return (req._version);
  }

  /**
   * Get all available routes for the request method
   *
   * @param {String} method The request method
   * @return {Array} The list of the routes
   * @private
   * @ignore
   */
  function getVersions(method){
    return _.without(_.keys(my.routes[method]), '*').sort(semver.rcompare);
  }

  /**
   * Get latest satisfying available version
   *
   * @param {String} method The request method
   * @return {String} The semantic version compatible route version required
   * @return {string} The semantic version compatible route version available
   * @private
   * @ignore
   */
  function getLatestSatisfyingVersion(method, version){
    var range = semver.validRange(version),
      versions = getVersions(method),
      latest = '*';
    if (!_.isEmpty(versions)) {
      latest = semver.maxSatisfying(versions, range);
    }
    return latest;
  }

  /**
   * A class to iterate versions
   *
   * @private
   * @ignore
   */
  var VersionIterator = Class({
    /**
     * The constructor
     *
     * @constructor
     * @return {String} The semantic version compatible route version required
     * @param version
     */
    constructor: function (method, version) {
      this.method = method || 'GET';
      this.method = this.method.toUpperCase();
      this.version = version || '*';
      this.versions = getVersions(this.method);
      this.versions.push('*');
      this.range = semver.validRange(this.version);
      this.max = this.versions.length - 1;
      this.last = -1;
    },
    /**
     * Get the next available route version
     *
     * @return {string} The semantic version compatible route version available
     */
    next: function () {
      var _next;
      if (this.last < this.max) {
        if (this.version === '*') {
          // when a generic version is required it should try all versions starting from highest
          if (this.last === -1) {
            _next = getLatestSatisfyingVersion(this.method, this.range) || '*';
          } else {
            _next = this.versions[this.last + 1];
          }
        } else {
          // when a specific version is required it should try first the maximum satisfying version
          if (this.last === -1) {
            _next = semver.maxSatisfying(getVersions(this.method), this.range) || '*';
          } else {
            _next = this.versions[this.last + 1];
            if (_next !== '*' && !semver.satisfies(_next, this.range)) {
              _next = '*';
            }
          }
        }
        this.last = _.indexOf(this.versions, _next);
      }
      return _next;
    }
  });

  /**
   * Set the handled route in request for usage in next middleware
   *
   * @param {Object} req The request
   * @param {Object} route The handled route
   * @private
   * @ignore
   */
  function setHandledRoute(req, route){
    req._handledRoute = route;
    if (!req.getRoute) {
      req.getRoute = function() {
        return req._handledRoute;
      };
    }
  }

  /**
   * Find a valid route for the request path and method
   *
   * @param {Object} req The request
   * @param {Object} res The response
   * @param {Function} next The callback
   * @return {next(err}} The function executed as callback
   * @param {Error} next.err The error instance if occurred
   * @private
   * @ignore
   */
  function findInAllowedMethod(req, res, next) {
    var method = req.method.toUpperCase(),
        path   = req.url,
        version = getVersion(req),
        routes = my.routes[method] || {},
        routesMatched, err;

    routes = routes[version];
    var route = routes[path];

    if (route) {
      // get unique route without params
      log.debug('%s matched route %s v%s', app.name, route.name, route.version);
      setHandledRoute(req, route);
      next();
    } else {
      // search route
      routesMatched = _.filter(routes, function (route) {
        if (route.regexp.test(path)) {
          route.params = route.regexp.exec(path);
          return true;
        }
        return false;
      });
      if (routesMatched.length === 1) {
        // one route matched
        fillParams(req, routesMatched[0]);
        log.debug('%s matched route %s v%s', app.name, routesMatched[0].name, routesMatched[0].version);
        setHandledRoute(req, routesMatched[0]);
        next();
      } else {
        var message = 'not found';
        if (routesMatched.length > 1) {
          // ambiguous routes
          message = 'ambiguous resource';
          if (debug) {
            message += ':\n';
            _.each(routesMatched, function(route) {
              message += '\t--> ' + route.name + '\n';
            });
          }
        }
        err = new errors.NotFoundError(message);
        next(err);
      }
    }
  }

  /**
   * When a route is not available for the request method, it try to find a route for another method
   * to correctly handle 204 or 405 error message
   *
   * @param {Object} req The request
   * @param {Object} res The response
   * @param {Function} next The callback
   * @return {next(err}} The function executed as callback
   * @param {Error} next.err The error instance if occurred
   * @private
   * @ignore
   */
  function findInNotAllowedMethod(req, res, next) {
    var method = req.method.toUpperCase(),
        version = getVersion(req),
        path   = req.url,
        err;
    var result = _.find(my.reverseRoutes[version], function(route) {
      return route.test(path);
    });
    if (result) {
      if (method === 'OPTIONS') {
        // 204 (No Content)
        err = new errors.NoContentError('no content');
      } else {
        // 405 (Method Not Allowed)
        err = new errors.MethodNotAllowedError(method + ' not allowed');
      }
    } else {
      // 404 (Not Found)
      err = new errors.NotFoundError('not found');
    }
    next(err);
  }

  // TODO: add a cache for most required routes
  // my.cachedRoutes = {};

  /**
   * Create a route for a method. Useful to create all methods (verbs) for a path.
   *
   * @param {String} verb The verb method to create
   * @return {Function} The function that create the route
   * @private
   * @ignore
   */
  function create(verb) {
    return function() {
      var args = [verb].concat(Array.prototype.slice.call(arguments));
      my.add.apply(this, args);
    };
  }

  // add all methods
  _.each(VERBS, function(verb) {
    var method = (verb === 'DELETE' ? 'DEL' : verb).toLowerCase();
    my[method] =  create(verb);
  });

  return my;
};
