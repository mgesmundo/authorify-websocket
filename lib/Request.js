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
 */
module.exports = function(app, plugin) {
  'use strict';

  // dependencies
  var _ = plugin._;

  var Request = function Request(opts) {
    opts = opts || {};
    this.headers = {};
    if (opts.headers) {
      _.defaults(this.headers, opts.headers)
    }
    opts = _.omit(opts, 'headers');
    _.defaults(this, opts);
  };
  Request.prototype.setHeader = function (key, value) {
    this.headers[key.toLowerCase()] = value
  };
  Request.prototype.getHeader = function (key) {
    return this.headers[key.toLowerCase()]
  };
  Request.prototype.removeHeader = function (key) {
    delete this.headers[key.toLowerCase()]
  };

  return Request;
};
