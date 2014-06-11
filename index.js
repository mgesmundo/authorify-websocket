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
module.exports = function(app, config) {
  'use strict';

  var plugin = {};

  plugin.jsface = require('jsface');
  plugin.Primus = require('primus');
  plugin.PrimusCallbacks = require('primus-callbacks');
  plugin.errors = require('logged-errors');

  return require('./lib/main')(app, plugin, config);
};
