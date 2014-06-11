var _            = require('underscore'),
    should       = require('should'),
    pathToRegexp = require('path-to-regexp'),
    async        = require('async'),
    errors       = require('logged-errors'),
    util         = require('util'),
    semver       = require('semver'),
    jsface       = require('jsface');

var logger = console;
logger.debug = function() {};

var app = {
  name        : 'authorify',
  moduleName  : 'authorify',
  config      : {
    dummy     : 'main'
  },
  _           : _,
  pathToRegexp: pathToRegexp,
  async       : async,
  logger      : logger,
  debug       : false,
  errors      : errors,
  util        : util,
  semver      : semver,
  jsface      : jsface
};

function urlSanify() {
  var result = this;
  if (result.length > 0) {
    if (result.charAt(0) !== '/') {
      result = '/' + result;
    }
    if (result.length > 1 && result.charAt(result.length - 1) === '/') {
      result = result.slice(0, result.length - 1);
    }
  } else {
    result = '/';
  }
  return result;
}

String.prototype.urlSanify = urlSanify;

module.exports = app;
