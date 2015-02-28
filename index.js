/**
 * Module dependencies
 */

var request = require('wait1').request;
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
}
inherits(Client, Emitter);

Client.prototype.submit = function(method, action, values, cb) {
  var conf = parse(action);
  conf.method = method;
  var req = request(conf, function(res) {
    cb(null, res.body);
  });
  req.write(values);
  req.end();
};

function get(url, cb) {
  //var t = performance.now();
  request(url, function(res) {
    //console.log(url, performance.now() - t);
    cb(null, res.body);
  }).end();
}
