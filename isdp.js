#!/usr/bin/node
'use strict';

/* http://stackoverflow.com/questions/27688804/how-do-i-debug-error-spawn-enoent-on-node-js
(function() {
    var childProcess = require("child_process");
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})();
*/

var server = require('./server');
server.start();
console.log("waiting for incoming connections...");

