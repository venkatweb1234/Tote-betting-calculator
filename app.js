'use strict';
var readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

var parser = require('./parser');
var rules = require('./rules');

//A single delimited line can be broken down by the
//parser using the properties.
//Ex. Bet:P:5,6:5
//    would be broken down as follows:
//    rule = bet, product = W, selections = 5,6, stake = 5
parser.setDelimeter(':');
parser.setProperties({
  Bet: 
  [
    { product: '[WPE]{1}' },
    { selections: 
      { product: 
        { W: '\\d+',
          P: '\\d+',
          E: '\\d+,\\d+'
        } 
      }
    },
    { stake: '\\d+' }
  ],
  Result: 
  [
    { first: '\\d+'},
    { second: '\\d+'},
    { third: '\\d+'},
  ]
});

//by default, the dividends are derived from total stakes, otherwise, define the rule for dividends in relation to total stakes.
rules.setProperties({
  W: { name: 'Win', commission: 0.15 },
  P: { name: 'Place', commission: 0.12, 
       dividends: function(totalStakes) {
         return totalStakes / 3; 
       } 
     },
  E: { name: 'Exacta', commission: 0.18 },  
});

rules.on('Win', function(key, result) {
  var dividends = this.calculateDividends(key, result.first);
  display('Win', result.first, dividends);
});

rules.on('Place', function(key, result) {
  for (var resultKey in result) {
    var place = result[resultKey];
    var dividends = this.calculateDividends(key, place);
    display('Place', place, dividends);
  }  
});

rules.on('Exacta', function(key, result) {    
  var selections = result.first + ',' + result.second;  
  var dividends = this.calculateDividends(key, selections);
  display('Exacta', selections, dividends);
});

var display = function(product, selection, dividends) {
  console.log("==============");
  console.log(product + ''+ selection +'' + dividends);
  var dividendOutput = dividends ? "$" + dividends : "NONE";
  console.log(product + ":" + selection + ":" + dividendOutput);
};

readline.on("line", function(input) {
  if (input === 'x') {
    readline.close();
    return;
  }

  var values = parser.parse(input);
  rules.process(values);
});