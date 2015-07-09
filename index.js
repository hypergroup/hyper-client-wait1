/**
 * Module dependencies
 */

var Wait1 = require('wait1');
var inherits = require('util').inherits;
var Emitter = require('events').EventEmitter;
var parse = require('url').parse;
var qs = require('qs').stringify;

module.exports = Client;

function Client(API_URL, token, opts) {
  var self = this;
  if (!(self instanceof Client)) return new Client(API_URL, token, opts);

  Emitter.call(self);

  self.root = get.bind(self, API_URL);
  self.get = get.bind(self);
  Wait1.onpush(onpush.bind(self));
  self.token = token;
}
inherits(Client, Emitter);

Client.prototype.submit = function(method, action, values, cb) {
  var self = this;
  self.format(method, action, values, function(err, action, values) {
    var conf = parse(action);
    conf.method = method;
    if (self.token) conf.auth = self.token + ':';
    var req = Wait1.request(conf, function(res) {
      cb(null, res.body);
    });
    req.write(values);
    req.end();
  });
};

Client.prototype.subscribe = function(href, cb) {
  var self = this;
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

function get(url, cb) {
  var self = this;
  var sub = self.subscribe(url, cb);
  var conf = parse(url);
  if (self.token) conf.auth = self.token + ':';
  Wait1.request(conf, function(res) {
    self.emit(url, null, res.body, null, null, false);
  }).end();
  return sub;
}

function onpush(status, headers, body) {
  this.emit(body.href, null, body, null, null, false);
}
