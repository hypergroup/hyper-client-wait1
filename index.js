/**
 * Module dependencies
 */

var Wait1 = require('wait1');
var inherits = require('util').inherits;
var Emitter = require('events').EventEmitter;
var parse = require('url').parse;
var qs = require('qs').stringify;

exports = module.exports = Client;
exports['default'] = exports;

function Client(API_URL, token, opts) {
  var self = this;
  if (!(self instanceof Client)) return new Client(API_URL, token, opts);

  opts = opts || {};
  if (opts.basePath) {
    API_URL = parse(API_URL);
    self.wspath = API_URL.wspath = API_URL.pathname;
    API_URL.pathname = API_URL.path = opts.basePath;
  }

  Emitter.call(self);

  self.root = get.bind(self, API_URL);
  self.get = get.bind(self);
  self.set = set.bind(self, API_URL);
  Wait1.onpush(onpush.bind(self));
  self.token = token;
}
inherits(Client, Emitter);

Client.prototype.submit = function(method, action, values, cb) {
  var self = this;
  self.format(method, action, values, function(err, action, values) {
    var conf = parse(action);
    conf.method = method;
    conf = self._formatConf(conf);
    var req = Wait1.request(conf, function(res) {
      cb(null, res.body);
    });
    req.write(values);
    req.end();
  });
};

Client.prototype.subscribe = function(href, cb) {
  var self = this;
  href = normalizeHref(href);
  function sub() {
    cb.apply(self, arguments);
  }
  self.on(href, sub);
  return function() {
    self.removeListener(href, sub);
  };
};

Client.prototype.format = function(method, action, values, cb) {
  if (method === 'GET') {
    action = action.split('?')[0];
    cb(null, action + '?' + qs(values));
  } else {
    cb(null, action, values);
  }
  return this;
};

Client.prototype._formatConf = function(conf) {
  var self = this;
  if (self.token) conf.auth = self.token + ':';
  if (self.wspath) {
    conf.pathname = conf.pathname.slice(self.wspath.length);
    conf.wspath = self.wspath;
  }
  return conf;
}

var pushCache = Object.create(null);

function get(url, cb) {
  var self = this;
  var conf = parse(url);
  url = normalizeHref(url);
  var sub = self.subscribe(url, cb);
  conf = self._formatConf(conf);

  if (pushCache[url]) {
    cb(null, pushCache[url], null, null, false);
  } else {
    Wait1.request(conf, function(res) {
      self.emit(url, null, res.body, null, null, false);
    }).end();
  }

  return sub;
}

function set(url, headers) {
  var self = this;
  var conf = parse(url);
  if (self.token) conf.auth = self.token + ':';

  Wait1.set(conf, headers);

  return self;
}

function onpush(status, headers, body) {
  var href = (body || {}).href || (headers || {})['content-location'] || (headers || {})['location'];
  if (Array.isArray(href)) href = href[0];
  if (!href) return;

  href = normalizeHref(href);

  this.emit(href, null, body, null, null, false);

  // store pushed responses in a temporary cache so redirects don't
  // hit the server twice
  pushCache[href] = body;
  setTimeout(function() {
    delete pushCache[href];
  }, 100);
}

function normalizeHref(href) {
  return (href.href || href || '').replace(/^[a-z]+\:\/\//, '//');
}
