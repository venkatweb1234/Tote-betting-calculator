'use strict';

var _ = require('lodash');
var events = require('events');

function Parser() {
  var properties = null;
  var delimeter = null;
}

Parser.prototype = new events.EventEmitter();

Parser.prototype.setDelimeter = function(delimeter) {
  this.delimeter = delimeter;
};

Parser.prototype.setProperties = function(props) {
  this.properties = props;
};

Parser.prototype.sanitize = function(input) {
  return input.trim().replace(/>\s+/, '');
};

Parser.prototype.toArray = function(input, delimiter) {
  return input.split(delimiter);
};

Parser.prototype.getProperty = function(array) {
  var key = _.first(array);
  var props = this.properties[key];
  return props;
};

Parser.prototype.matchPattern = function(pattern, item) {
  var regex = new RegExp('^' + pattern + '$');
  var value = item.match(regex);
  if (value)
    value = _.first(value);
  else
    this.emit('error', item + ' does not match the pattern ' + pattern);

  return value;
};

Parser.prototype.matchReferencedPattern = function(fieldPattern, item, map) {
  if (!_.isPlainObject(fieldPattern))
    return null;

  //check conditions. assumes that the dependencies of the conditions has been resolved beforehand.
  var referenceField = _.first(_.keys(fieldPattern));
  var referencePattern = map[referenceField];

  if (!referencePattern) {
    self.emit('error', 'Reference ' + referenceField + ' not defined.');
    return null;
  }

  //if the dependency exists...
  var matchedPattern = fieldPattern[referenceField][referencePattern];
  return matchedPattern;
};

Parser.prototype.matchPatternFromObject = function(fieldPattern, item, map) {
  if (!_.isPlainObject(fieldPattern))
    return null;

  //if the dependency exists...
  var matchedPattern = this.matchReferencedPattern(fieldPattern, item, map);
  return this.matchPattern(matchedPattern, item);
};

Parser.prototype.matchPatternFromString = function(fieldPattern, item) {
  if (!_.isString(fieldPattern))
    return null;

  return this.matchPattern(fieldPattern, item);
};

//the array items must match the property definition
Parser.prototype.map = function(array, property) {  
  if (!property || array.length != property.length) {
    this.emit('error', 'Invalid input or property.');
    return null;
  }
    
  var map = {};
  var length = array.length;
  for (var i = 0; i < length; i++) {
    var item = array[i];
    var field = _.first(_.keys(property[i]));
    var fieldPattern = property[i][field];
    
    var value = this.matchPatternFromObject(fieldPattern, item, map) || this.matchPatternFromString(fieldPattern, item) || null;
    if (!value)
      return null;
    
    map[field] = value;
  }
  
  return map;
};

Parser.prototype.parseSingle = function(input) {  
  var array = this.toArray(this.sanitize(input), this.delimeter);
  var property = this.getProperty(array); 
  var map = this.map(_.rest(array), property);
  var values = map ? { key: _.first(array), data: map } : null;
  return values;
};

/*  Generators are not supported out of the box (--harmony).
    would be useful to provide a parseArray API.
Parser.prototype.parseArray = function*(input) {
  if (this.delimeter === null)
    this.emit('error', 'No delimeter specified');

  for (var item in input) {
    yield this.parseSingle(item);
  }
};
*/

Parser.prototype.parse = function(input) {
  if (this.delimeter === null) {
    this.emit('error', 'No delimeter specified');
    return null;
  }
  
  return this.parseSingle(input);
};

var parser = new Parser();

parser.on('error', function(err) {
  console.log(err);
});

module.exports = parser;