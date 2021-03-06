/**
 * @class node_modules.authorify_websocket
 *
 * @author Marcello Gesmundo
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
 */
module.exports = function(app, plugin) {
  'use strict';

  // dependencies
  var _                 = plugin._,
      Primus            = plugin.Primus,
      PrimusCallbacks   = plugin.PrimusCallbacks,
      router            = plugin.router,
      Response          = plugin.Response,
      errors            = plugin.errors,
      util              = plugin.util,
      config            = app.config,
      log               = app.logger;

  var CError = errors.InternalError;
  var primusServer;

  function getSparkDetail(spark) {
    return util.format('%s:%s with id %s', spark.address.ip, spark.address.port, spark.id);
  }

  function addHandlers(server) {
    if (!server) {
      throw new CError('websocket server not created').log();
    }
    server.on('connection', function(spark) {
      log.info('%s new connection from %s', app.name, getSparkDetail(spark));
      // Handle incoming requests:
      spark.on('request', function(req, callback) {
        // response
        var res = new Response({
          send: function(code, body, headers) {
            var isHead = (req.method === 'HEAD'),
                self = this;
            this.ok = true;
            if (!code) {
              this.status = 200;
            } else if (_.isNumber(code)) {
              this.status = code;
              if (body instanceof Error) {
                this.status = body.statusCode || body.code || body.status || 500;
                this.error = body;
                this.ok = false;
              }
            } else if (code instanceof Error) {
              this.status = code.statusCode || code.code || code.status || 500;
              this.error = code;
              this.ok = false;
              headers = body;
              body = code;
              code = code.statusCode || code.code || code.status || 500;
            } else {
              headers = body;
              body = code;
              code = 200;
              this.status = code;
            }
            // set headers
            headers = headers || {};
            _.each(headers, function(header, key) {
              self.setHeader(key, header);
            });
            this.body = this.body || {};
            if (body) {
              if ((isHead || code === 204 || code === 304)) {
                callback(null, body);
              } else {
                if (body instanceof Error) {
                  if (_.isNumber(code)) {
                    var errorName = errors.codeToErrorName(code);
                    if (errorName) {
                      body = new errors[errorName](body.message);
                    }
                  }
                  this.body = body
                } else {
                  _.extend(this.body, body);
                }
                callback(null, this);
              }
            } else {
              callback(null, this);
            }
          }
        });

        function handleError(err, res) {
          if (!err) {
            throw new Error('expected error but not provided');
          }
          res.ok = false;
          res.status = err.statusCode || err.status || 500;
          res.body = err;
          res.error = err;
        }

        // handle route
        router.find(req, res, function(err) {
          if (err) {
            handleError(err, res);
            callback(null, res);
          } else {
            // invoke the authorization middleware
            app.authentication(req, res, function(err){
              if (err) {
                handleError(err, res);
                callback(null, res);
              } else {
                // execute handlers chain
                router.run(req, res, function(err) {
                  // last handler send a response or call next(err)
                  if (err) {
                    res.ok = false;
                    res.status = err.statusCode || err.status || 500;
                    res.body = err;
                    res.error = err;
                    callback(null, res);
                  }
                });
              }
            });
          }
        });
      });
      spark.on('error', function (err) {
        log.error('%s error from %s', app.name, getSparkDetail(spark));
        log.error('%s --> error: %s', err.message || err || 'unknown error');
      });
    });
    server.on('disconnection', function(spark) {
      log.info('%s disconnection client %s',app.name, getSparkDetail(spark));
    });
  }

  // namespace
  var my = {};

  /**
   * Create a new websocket server.
   * @method createServer
   * @param {http} [http] An optional http server to use with websockets.
   * If it is not provided a new http server is created and attached.
   * @return {Primus} The new server that is a Primus instance.
   */
  my.create = function(httpServer) {
    if (primusServer) {
      throw new Error('server already created');
    } else {
      httpServer = httpServer || config.server;
      if (!httpServer) {
        throw new CError('missing http server instance').log();
      } else {
        if (!router._server) {
          router.attach(httpServer || config.server);
        }
        // create the attached websocket server
        primusServer = new Primus(router._server, config.primusOptions);
        primusServer.use('responder', PrimusCallbacks);

        log.info('%s created websocket server', app.name);
      }
      addHandlers(primusServer);
    }
    return primusServer;
  };

  /**
   * Destroy the active websocket server.
   * __NOTE__: the http server is not destroyed.
   *
   * @param {Object} opts The Primus option for destroying.
   * See [Primus documentation](https://github.com/primus/primus) for a detailed explanation.
   * @method destroyServer
   */
  my.destroy = function(opts) {
    if (primusServer) {
      primusServer.destroy(opts);
      log.info('%s websocket server destroyed', app.name);
    } else {
      log.error('%s no websocket server to destroy', app.name);
    }
  };

  return my;
};