
var fs = require('fs');
var winston = require('winston');
var winstonExpress = require('express-winston');

require('winston-logstash');

exports.isdp = {
    //directory where you want to download files from hsi and create tar balls
    stagedir: '/usr/local/tmp/isdp_stage',

    //directory where you want to create symlinks to tar balls in stagedir (should be exposed via a web server)
    publishdir: '/usr/local/public/isdp',

    //URL where user can access above publishdir
    publishurl: 'http://soichi7.ppa.iu.edu/public/isdp',

    //from address where notification email is sent
    notification_from: 'no-reply@iu.edu',
}

exports.hpss = {
    //set to true if youare behind firewall (and hsi can't reach you directly)
    behind_firewall: true,
    
    //env to pass to hsi commands
    env: {
        //must point to where the hsi binaries are
        PATH: "/home/hayashis/bin", 
        //usual HPSS env stuff.
        HPSS_PRINCIPAL: "doqqs",
        HPSS_AUTH_METHOD: "keytab",
        HPSS_KEYTAB_PATH: "/home/hayashis/test/gis/doqqs_kt.keytab",
    }
}

//configuration to report progress information (optional)
exports.progress = {
    //you don't get error message if your user/pass etc. are in correct (it just keeps retrying silently..)
    amqp: {url: "amqp://test:test@soichi7.ppa:5672/sca"},
    exchange: "progress",
}

exports.logger = {
    winston: {
        transports: [
            //display all logs to console
            new winston.transports.Console({
                timestamp: function() {
                    return Date.now(); //show time in unix timestamp
                },
                colorize: true
            }),
            
            //store all warnings / errors in error.log
            new (winston.transports.File)({ 
                filename: 'error.log',
                level: 'warn'
            })
        ]
    },
    
    //logfile to store all requests (and its results) in json
    request: {
        transports: [
            new (winston.transports.File)({ 
                filename: 'request.log',
                json: true
            })
            /* (not sure how to get this working)
            new (winston.transports.Logstash)({
                port: 28777,
                node_name: 'isdp-soichi-dev',
                host: 'soichi7.ppa.iu.edu'
            })
            */
        ]
    }
}

exports.express = {
    //web server port
    port: 12346,

    //specify jwt config if you want to access control via jwt (applied to all routes.. for now)
    /*
    jwt: {
        secret: fs.readFileSync('./config/auth.pub'),
    }
    */
}


