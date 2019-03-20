'use strict';
var _ = require('lodash');

var events = require('events'); 

function Rules() {
  this.pool = {};
  this.properties = null;
}

Rules.prototype = new events.EventEmitter();

Rules.prototype.setProperties = function(properties) {
  this.properties = properties;
};

Rules.prototype.getHouseCommission = function() {    
  var map = {};
  for (var key in this.pool) {
    var commission = parseFloat(this.properties[key].commission * this.pool[key].stakes).toFixed(2);
    this.pool[key].stakes -= commission;
    map[key] = commission;
  }
  
  return map;
};  

Rules.prototype.process = function(values) {
  if (values.data)
    this.emit(values.key, values.data);
};

Rules.prototype.addStakes = function(total, current) {
  var value = total;
  if (this && current.selections === this)
    value = total + (+current.stake);
  return value;
};
  
Rules.prototype.calculateDividends = function(key, selections) {
  var productPool = this.pool[key];
  var propertyKey = this.properties[key];
  var stakes = productPool.bets.reduce(this.addStakes.bind(selections), 0);
  
  var totalStakes = productPool.stakes;
  if (propertyKey.hasOwnProperty('dividends')) {
    totalStakes = propertyKey.dividends(totalStakes); 
  }
  
  var dividends = totalStakes / stakes;
  if (!_.isFinite(dividends))
    dividends = null;
  else
    dividends = dividends.toFixed(2);
  
  return dividends;
};

Rules.prototype.clearBets = function() {
  this.pool = [];
};

Rules.prototype.addBet = function(values) {
  var product = values.product;
  var productPool = this.pool[product];
  if (!productPool) {
    this.pool[product] = {};
    productPool = this.pool[product];
    productPool.stakes = 0;
    productPool.bets = [];
  }

  productPool.productName = this.properties[values.product].name;
  productPool.stakes += +values.stake;
  productPool.bets.push(values);
};

var rules = new Rules();

rules.on('Bet', function(values) {  
  this.addBet(values);
});

rules.on('Result', function(result) {
  this.getHouseCommission(); //output not required

  for (var key in this.pool) {    
    var productName = this.properties[key].name; 
    this.emit(productName, key, result); //emit events based on the product name...
  }
  
  this.clearBets();
});

module.exports = rules;
