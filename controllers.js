'use strict';

//node
var fs = require('fs');
var spawn = require('child_process').spawn;
var path = require('path');

//contrib
var hpss = require('hpss');
var ejs = require('ejs');
var numeral = require('numeral');
var winston = require('winston');
var nodemailer = require('nodemailer');
var express = require('express');
var router = express.Router();
//var rmdir = require('rimraf');

//mine
var config = require('./config/config');
var scadm = require('sca-datamover');

var app = require('./server').app;
var logger = new winston.Logger(config.logger.winston);

//ES6 polyfill
if (!String.prototype.endsWith) {
    logger.debug("ES6 polyfilling String.endsWith");
    String.prototype.endsWith = function(searchString, position) {
        var subjectString = this.toString();
        if (position === undefined || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}

//init
scadm.init({logger: logger, progress: config.progress});
hpss.init(config.hpss);

//logger to use to store all requests
var request_logger = new winston.Logger(config.logger.request);

var running_jobs = {};

function handle_request(req) {
    var job = new scadm.job({
        name: (req.name?req.name:'ISDP Request at '+(new Date()).toString())
    });
    running_jobs[job.id] = job;

    var stagezip = config.isdp.stagedir+'/'+job.id+'.zip';
    var publishzip = config.isdp.publishdir+'/'+job.id+'.zip';

    job.addTask({
        name: 'Creating a staging directory', 
        work: function(task, cb) {
            fs.mkdir(config.isdp.stagedir+'/'+job.id, cb);
        }
    });

    var download_job = job.addJob({
        name: "Downloading requested files fom hsi"
    });
    req.files.forEach(function(file, idx) {
        download_job.addTask({
            name: file,
            work: function(task, cb) {
                logger.info("downloading "+file);
                //get the requested file from hsi
                hpss.hsi.get(file, config.isdp.stagedir+'/'+job.id, function(err, msgs) {
                    if(err) { 
                        var msg = "Failed to download "+file+" from sda. hsi return code: "+err.code;
                        if(msgs) msg += "\n"+msgs.join("\n"); //add details from hsi
                        
                        //send error message to user
                        fs.appendFile(config.isdp.stagedir+'/'+job.id+'/isdp_errors.txt', msg+'\n');

                        //also deliver it upstream (so that it can be logged on the server side)
                        err.msg = msg;
                        cb(err, true); //true means to continue after this error
                    } else {
                        //rename the file so that file name won't collide
                        var base = path.basename(file); 
                        fs.rename(config.isdp.stagedir+'/'+job.id+'/'+base, config.isdp.stagedir+'/'+job.id+'/'+idx+'.'+base, cb);
                    }
                }, task.progress);
            }
        });
    });

    if(req.unzip) {
        var unzip_job = job.addJob({
            name: "Unzipping zip files"
        });
        //step 2b - for each files downloaded.. unzip
        req.files.forEach(function(file, idx) {
            var name = idx+"."+file.substring(file.lastIndexOf("/")+1);
            //console.log("should I unzip "+name);
            if(name.endsWith(".zip")) unzip_job.addTask({
                name: name, 
                work: function(task, cb) {
                    var dirname = name.substring(0, name.length-4); //create a directory name to unzip to.
                    var p = spawn('unzip', [name, '-d', dirname], {cwd: config.isdp.stagedir+'/'+job.id});        
                    var out = "", err = "";
                    p.stderr.on('data', function(chunk) {
                        err += chunk;
                    });
                    p.stdout.on('data', function(chunk) {
                        out += chunk;
                    });
                    if(out != "") logger.info(out);
                    if(err != "") logger.error(err);
                    p.on('close', function(code, signal) {
                        if(code == 0) { 
                            logger.info("finished unzipping "+name);
                            fs.unlink(config.isdp.stagedir+'/'+job.id+'/'+name,function(err) {
                                cb(err, true); //let process continue even if unlink fails
                            });
                        } else cb({msg: out+"\n"+err, code:code, signal:signal}, true); //let process continues
                    });
                    p.on('error', function(err) {
                        logger.error("unzipping failed");
                        logger.error(err);
                        logger.info("cd "+config.isdp.stagedir+'/'+job.id+"; unzip "+name+" -d "+dirname);
                        //'close' will still fire - so no need to cb(err)
                    });
                }
            });
        });
    }

    job.addTask({
        name: 'Creating a zip', 
        work: function(task, cb) {
            scadm.tasks.zipfiles({
                path: job.id,
                dest: stagezip,
                cwd: config.isdp.stagedir,
                on_progress: function(msg) {
                    task.progress({msg: msg});
                }
            }, cb);
        }
    });

    job.addTask({
        name: 'Publishing zip on download server', 
        work: function(task, cb) {
            fs.symlink(stagezip, publishzip, cb);
        }
    });

    //finally, start the job
    job.run(function() {
        //done!
        delete running_jobs[job.id];
        
        //after it's done, send a notification 
        if(req.notification_email) {
            logger.info("sending notification to "+req.notification_email);
            fs.stat(stagezip, function(err, stats) {
                if(err) return err;
                var html_template = fs.readFileSync('./t/html_notification.ejs').toString();
                var text_template = fs.readFileSync('./t/text_notification.ejs').toString();
                var params = {
                    jobid: job.id,
                    download_url: config.isdp.publishurl+'/'+job.id+'.zip',
                    size: numeral(stats.size/(1024*1024)).format('0,0'),
                    status: job.status,
                }

                var transporter = nodemailer.createTransport(); //use direct mx transport
                transporter.sendMail({
                    from: config.isdp.notification_from,
                    to: req.notification_email,
                    subject: "Your zip file is ready to be downloaded",
                    html:  ejs.render(html_template, params),
                    text: ejs.render(text_template, params),
                }, function(err, info) {
                    if(err) {
                        console.dir(err);
                    }
                    if(info && info.response) logger.info("notification sent: "+info.response);
                });
            });
        }
    });
    return job;
}

router.get('/health', function(req, res) { res.json({status: 'ok'}); });

router.post('/request', function(req, res, next) {
    request_logger.info({headers: req.headers, body: req.body});
    //TODO validate req.body?
    var job = handle_request(req.body);
    res.json({status: 'requested', id: job.id}); //progress key should be _isdp.<job.id>
});

//this deletes job - with no acl (as long as the stage dir exists)
router.delete('/:id', function(req, res, next) {
    var id = req.params.id;
    if(/[^a-z0-9-]/.test(id)) return next('invalid char in request id');
    
    //logger.debug("deleting job:"+id);
    
    //request stop if the job is still running
    if(running_jobs[id]) running_jobs[id].stop();

    //now delete stuff
    fs.unlinkSync(config.isdp.stagedir+'/'+id+'.zip');
    fs.unlinkSync(config.isdp.publishdir+'/'+id+'.zip');

    //also remove the workdir
    /*
    try {
        if(fs.statSync(path).isDirectory()) {
            logger.debug("proceeding with rimraf on"+path);
            rmdir(path, function(err){
                if(err) return next(err);
            });
        }
    } catch(e) {
        //working dir doesn't exist.. all good
    }
    */
    res.json({status: 'removed '+id}); 
});

module.exports = router;
