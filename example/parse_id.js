var fs = require('fs');

var j = fs.readFileSync('request.json', {encoding: 'utf8'});
var data = JSON.parse(j);
console.log(data.id);
