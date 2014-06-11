/**
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
 */
module.exports = (function() {
  'use strict';

  require('logged-errors');

  var plugin = {
    jsface: jsface,
    Primus: window.Primus,
    errors: loggedErrors
  };

  // in browser the options can applied using the `setConfig` method of the client instance
  // see https://github.com/mgesmundo/authorify-client documentation
  // NOTE: the options as referred to the plugin NOT to the app. The option app are set in app.config.
  window.authorifyWebsocket = function(app, opts) {
    return require('./lib/main')(app, plugin, opts);    
  };

  return window.authorifyWebsocket;
}());