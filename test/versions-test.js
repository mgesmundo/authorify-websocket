/*global describe, it, before, after */

var fakeAuthorify = require('./dependencies'),
    should        = require('should');

var plugin = require('../index')(fakeAuthorify, {
  dummy: 'plugin'
});

var router = plugin.router,
    _      = fakeAuthorify._;

var ok = function(req, res, next) {
  next();
};

// add default route (non versioned)
router.get('/versioned', ok);
// add versioned routes
router.get({ path: '/versioned', version: '1.5.5' }, ok);
router.get({ path: '/versioned', version: '1.2.3' }, ok);
router.get({ path: '/versioned', version: '2.0.0' }, ok);
router.get({ path: '/versioned', version: '0.5.2' }, ok);

var res = {};
var req;

var runTest = function(req, res, version, error, done) {
  if (_.isFunction(error)) {
    done = error;
    error = undefined;
  }
  router.findAndRun(req, res, function(err) {
    req.getRoute().version.should.equal(version);
    if (error) {
      err.message.should.containEql(error);
    } else {
      should.not.exist(err);
    }
    done();
  });
};

function setVersion(version){
  req.headers = {
    'accept-version': version
  };
}

req = {
  url: '/versioned',
  method: 'GET'
};

describe('Versioned route manager', function() {
  beforeEach(function(done) {
    req = {
      url: '/versioned',
      method: 'GET'
    };
    done();
  });
  it('should GET the latest version if the version is not specified', function(done) {
    runTest(req, res, '2.0.0', done);
  });
  it('should GET the 1.5.5 version if the required version is ~1.5', function(done) {
    setVersion('~1.5');
    runTest(req, res, '1.5.5', done);
  });
  it('should GET the 1.5.5 version if the required version is ^1.2', function(done) {
    setVersion('^1.2');
    runTest(req, res, '1.5.5', done);
  });
  it('should GET the 1.2.3 version if the required version is ~1', function(done) {
    setVersion('~1.2');
    runTest(req, res, '1.2.3', done);
  });
  it('should GET the 0.5.2 version if the required version is <1', function(done) {
    setVersion('<1');
    runTest(req, res, '0.5.2', done);
  });
  it('should GET the default version if the required version is lower than the lowest available version', function(done) {
    setVersion('<0.5');
    runTest(req, res, '*', done);
  });
});