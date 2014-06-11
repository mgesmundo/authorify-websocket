/**
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
 * @ignore
 *
 */
module.exports = function(app, plugin) {
  'use strict';

  // dependencies
  var _       = plugin._,
      util    = plugin.util,
      Request = plugin.Request;

  var Response = function Response(opts) {
    Request.call(this, opts);
    if (!_.isFunction(opts.send)) {
      delete this.send;
    }
    if (!_.isFunction(opts.write)) {
      delete this.write;
    }
  };

  util.inherits(Response, Request);

  return Response;
};


