/**
 * Module dependencies
 */

var Wait1 = require('wait1');
var inherits = require('util').inherits;
var Emitter = require('events').EventEmitter;
var parse = require('url').parse;

module.exports = Client;

function Client(API_URL, opts) {
  var self = this;
  if (!(self instanceof Client)) return new Client(API_URL, opts);

  Emitter.call(self);

  self.root = get.bind(self, API_URL);
  self.get = get.bind(self);
  Wait1.onpush(onpush.bind(self));
}
inherits(Client, Emitter);

Client.prototype.submit = function(method, action, values, cb) {
  var conf = parse(action);
  conf.method = method;
  var req = Wait1.request(conf, function(res) {
    cb(null, res.body);
  });
  req.write(values);
  req.end();
};

Client.prototype.subscribe = function(href, cb) {
  var self = this;
  function sub() {
    cb.apply(self, arguments);
  }
  self.on(href, sub);
  return function() {
    self.removeEventListener(href, sub);
  };
};

function get(url, cb) {
  var self = this;
  var sub = self.subscribe(url, cb);
  Wait1.request(url, function(res) {
    self.emit(url, null, res.body, null, null, false);
  }).end();
  return sub;
}

function onpush(status, headers, body) {
  this.emit(body.href, null, body, null, null, false);
}
