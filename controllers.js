
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

exports.request = function(req, res) {
    //logger.info("handling user request");
    //logger.info(req.body);
    //logger.error("test error");
    request_logger.info({headers: req.headers, body: req.body});

    var job = new scadm.job({name: 'just another isdp job'});

    //step 1
    job.task('Create a staging directory', function(task, cb) {
        fs.mkdir(config.isdp.stagedir+'/'+job.id, cb);
    });

    //step 2a - for each files requested...
    req.body.files.forEach(function(file) {
        job.task('Download '+file+ ' from hsi', function(task, cb) {

            //get the requested file from hsi
            hpss.hsi.get(file, config.isdp.stagedir+'/'+job.id, function(err, msgs) {
                if(err) { 
                    var msg = "Failed to download "+file+" from sda. hsi return code: "+err.code;
                    if(msgs) msg += "\n"+msgs.join("\n"); //add details from hsi
                    
                    //send error message to user
                    fs.appendFile(config.isdp.stagedir+'/'+job.id+'/isdp_errors.txt', msg+'\n');

                    //also deliver it upstream (so that it can be logged on the server side)
                    err.msg = msg;
                    cb(err, true); //true means to continue even with the error 
                } else {
                    cb();
                }
            }, function(progress) {
                job.progress(progress, job.id+'.'+task.id); //post hsi generated progress
            });
        });
    });

    //step 2b - for each files downloaded.. unzip
    req.body.files.forEach(function(file) {
        var name = file.substring(file.lastIndexOf("/")+1);
        if(name.endsWith(".zip") && req.body.unzip) {
            job.task('Unzipping '+name, function(task, cb) {
                var dirname = name.substring(0, name.length-4);
                var tar = spawn('unzip', [name, '-d', dirname], {cwd: config.isdp.stagedir+'/'+job.id});        
                tar.stderr.pipe(process.stderr);
                tar.on('close', function(code, signal) {
                    if(code == 0) { 
                        fs.unlink(config.isdp.stagedir+'/'+job.id+'/'+name,function(err) {
                            cb(err, true); //let process continue if unlink fails
                        });
                    }
                    else cb({code:code, signal:signal}, true); //let process continues
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
        job.stagezip = config.isdp.stagedir+'/'+job.id+'.zip';
        scadm.tasks.zipfiles({
            path: job.id,
            dest: job.stagezip,
            cwd: config.isdp.stagedir,
            on_progress: function(msg) {
                job.progress({msg: msg}, job.id+'.'+task.id); 
            }
        }, cb);
    });

    //step 4 
    job.task('Publishing zip on download server', function(task, cb) {
        job.publishzip = config.isdp.publishdir+'/'+job.id+'.zip';
        fs.symlink(
            job.stagezip, //src
            job.publishzip, //dst
            cb);
    });

    //respond to the caller with job id
    res.json({status: 'requested', id: job.id});

    //finally, start the job
    job.run(function() {
        
        //after it's done, send a notification 
        if(req.body.notification_email) {
            var stats = fs.statSync(job.stagezip);
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
                to: req.body.notification_email,
                subject: "Your zip file is ready to be downloaded",
                body:  ejs.render(html_template, params),
                altText: ejs.render(text_template, params),
                bodyType: 'html'
            });
            email.send();
        }
    });
}

