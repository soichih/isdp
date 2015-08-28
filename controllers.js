
//node
var fs = require('fs');
var spawn = require('child_process').spawn;

//contrib
var hpss = require('hpss');
var ejs = require('ejs');
var Email = require('email').Email;
var numeral = require('numeral');
var winston = require('winston');

//mine
var config = require('./config/config');
var scadm = require('sca-datamover');//.init(config.scadm);

//ES6 polyfill
if (!String.prototype.endsWith) {
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

var app = require('./server').app;
var logger = new winston.Logger(config.logger.winston);

//initialize sca datamover
scadm.init({logger: logger, progress: config.progress});
//initialize hpss wrapper
hpss.init(config.hpss);

//logger to use to store all requests
var request_logger = new winston.Logger(config.logger.request);

function handle_request(req) {
    //logger.info("handling user request");
    //logger.error("test error");

    var job = new scadm.job({name: 'just another isdp job'});

    var stagezip = config.isdp.stagedir+'/'+job.id+'.zip';
    var publishzip = config.isdp.publishdir+'/'+job.id+'.zip';

    //step 1
    job.task('Create a staging directory', function(task, cb) {
        fs.mkdir(config.isdp.stagedir+'/'+job.id, cb);
    });

    //step 2a - for each files requested...
    req.files.forEach(function(file) {
        job.task('Download '+file+ ' from hsi', function(task, cb) {
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
                    //all good
                    cb();
                }
            }, function(progress) {
                job.progress(progress, job.id+'.'+task.id); //post hsi generated progress
            });
        });
    });

    //step 2b - for each files downloaded.. unzip
    req.files.forEach(function(file) {
        var name = file.substring(file.lastIndexOf("/")+1);
        //console.log("should I unzip "+name);
        if(req.unzip && name.endsWith(".zip")) {
            job.task('Unzipping '+name, function(task, cb) {
                var dirname = name.substring(0, name.length-4); //create a directory name to unzip to.
                //console.dir(process.env);
                var p = spawn('unzip', [name, '-d', dirname], {cwd: config.isdp.stagedir+'/'+job.id});        
                p.stderr.pipe(process.stderr);
                p.stdout.pipe(process.stdout);
                p.on('close', function(code, signal) {
                    if(code == 0) { 
                        logger.info("finished unzipping");
                        fs.unlink(config.isdp.stagedir+'/'+job.id+'/'+name,function(err) {
                            cb(err, true); //let process continue if unlink fails
                        });
                    }
                    else cb({code:code, signal:signal}, true); //let process continues
                });
                p.on('error', function(err) {
                    logger.error("unzipping failed");
                    logger.error(err);
                    logger.info("cd "+config.isdp.stagedir+'/'+job.id+"; unzip "+name+" -d "+dirname);
                    //'close' will still fire - so no need to cb(err)
                });
            });
        }
    });

    //step 3
    /*
    job.task('Creating tar ball', function(task, cb) {
        job.stagetar = config.isdp.stagedir+'/'+job.id+'.tar';
        scadm.tasks.tarfiles({
            path: job.id,
            dest: job.stagetar,
            cwd: config.isdp.stagedir,
            gzip: false
        }, cb);
    });
    */

    job.task('Creating a zip', function(task, cb) {
        scadm.tasks.zipfiles({
            path: job.id,
            dest: stagezip,
            cwd: config.isdp.stagedir,
            on_progress: function(msg) {
                job.progress({msg: msg}, job.id+'.'+task.id); 
            }
        }, cb);
    });

    //step 4 
    job.task('Publishing zip on download server', function(task, cb) {
        fs.symlink(
            stagezip, //src
            publishzip, //dst
            cb);
    });

    //respond to the caller with job id

    //finally, start the job
    job.run(function() {
        //after it's done, send a notification 
        if(req.notification_email) {
            logger.info("sending notification to "+req.notification_email);
            fs.stat(stagezip, function(err, stats) {
                //console.log(JSON.stringify(job.status, null, 4));
                if(err) return err;
                var html_template = fs.readFileSync('./t/html_notification.ejs').toString();
                var text_template = fs.readFileSync('./t/text_notification.ejs').toString();
                var params = {
                    jobid: job.id,
                    download_url: config.isdp.publishurl+'/'+job.id+'.zip',
                    size: numeral(stats.size/(1024*1024)).format('0,0'),
                    status: job.status,
                }

                var email = new Email({ 
                    from: config.isdp.notification_from,
                    to: req.notification_email,
                    subject: "Your zip file is ready to be downloaded",
                    body:  ejs.render(html_template, params),
                    altText: ejs.render(text_template, params),
                    bodyType: 'html'
                });
                email.send();
            });
        }
    });
    return job;
}

exports.request = function(req, res) {
    try {
        request_logger.info({headers: req.headers, body: req.body});

        //TODO validate req.body?
        var job = handle_request(req.body);
        res.json({status: 'requested', id: job.id});

    } catch (ex) {
        console.log("unhandled exception");
        console.dir(ex);
    }
}

