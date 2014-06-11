/*global describe, it, before, after */

var fakeAuthorify = require('./dependencies'),
    should        = require('should');

var plugin = require('../index')(fakeAuthorify, {
  dummy: 'plugin'
});

var router = plugin.router,
    _      = fakeAuthorify._;

var handler1 = function(req, res, next) {
  res.step = 1;
  next();
};
var handler2 = function(req, res, next) {
  res.step += 1;
  next();
};

router.get('/main', handler1, handler2);
router.get('/user/:id', handler1, handler2);
router.get('/group', handler1, handler2);
router.get('/group/:id', handler1, handler2);
router.get('/group/:group/user', handler1, handler2);
router.get('/group/:group/:user', handler1, handler2);
router.get('/group/:group/user/:user?', handler1, handler2);

var res = {};
var req;

var runTest = function(req, res, error, done) {
  if (_.isFunction(error)) {
    done = error;
    error = undefined;
  }
  router.findAndRun(req, res, function(err) {
    if (error) {
      err.message.should.containEql(error);
    } else {
      res.step.should.equal(2);
      should.not.exist(err);
    }
    done();
  });
};

describe('Route manager', function() {
  beforeEach(function(done) {
    req = {
      method: 'GET'
    };
    done();
  });
  it('should GET /main route', function(done) {
    req.url = '/main';
    runTest(req, res, done);
  });
  it('shouldn\'t POST /main route', function(done) {
    req.method = 'POST';
    req.url = '/main';
    runTest(req, res, 'POST not allowed', done);
  });
  it('shouldn\'t GET /missing route', function(done) {
    req.url = '/missing';
    runTest(req, res, 'not found', done);
  });
  it('should GET /user/100 route', function(done) {
    req.url = '/user/100';
    runTest(req, res, function() {
      req.params.id.should.eql(100);
      done();
    });
  });
  it('should GET /group route', function(done) {
    req.url = '/group';
    runTest(req, res, done);
  });
  it('should GET /group/100 route', function(done) {
    req.url = '/group/100';
    runTest(req, res, function() {
      req.params.id.should.eql(100);
      done();
    });
  });
  it('should GET /group/100/user ambiguous route', function(done) {
    req.url = '/group/100/user';
    runTest(req, res, 'ambiguous resource', done);
  });
  it('should unable to add ambiguous route', function(done) {
    (function(){
      router.get('/group/:group/:user?', handler1, handler2);
    }).should.throw(/is ambiguous/);
    done();
  });
  it('should GET /group/100/user/200', function(done) {
    req.url = '/group/100/user/200';
    runTest(req, res, function() {
      req.params.group.should.eql(100);
      req.params.user.should.eql(200);
      done();
    });
  });
  it('should GET /group/100/200', function(done) {
    req.url = '/group/100/200';
    runTest(req, res, function() {
      req.params.group.should.eql(100);
      req.params.user.should.eql(200);
      done();
    });
  });
  it('shouldn\'t GET for a wrong resource', function(done) {
    req.url = '/missing';
    runTest(req, res, 'not found', done);
  });
  it('should unable retrieve OPTIONS for a resource without a route for the method', function(done) {
    req.url = '/main';
    req.method = 'OPTIONS';
    runTest(req, res, 'no content', done);
  });
  it('shouldn\'t GET /user/:id without id parameter', function(done) {
    req.url = '/user';
    runTest(req, res, 'not found', done);
  });
});