# ISDP HSI download service

## Installation

```
sudo yum install nodejs npm git
```

```
git clone git@github.iu.edu:hayashis/isdp.git
cd isdp
npm install
```

## Upgrade

First, update the latest ISDP service 

```
git pull
```

Then update ISDP dependencies..

```
npm update
```

## Configuring

Copy ./config/config_sample.js to ./config/config.js 

Edit ./config/config.js 

See comments within the config file for more info, but if you aren't sure, feel free to contact me at hayashis@iu.edu

## Running

All production node apps should run under pm2. If you agree, install pm2

```
sudo npm install pm2 -g
```

Finally, start the ISDP service
```
pm2 start isdp.js
```

To auto-start pm2 (and isdp app) during the next reboot,
```
pm2 save
sudo pm2 startup redhat 
```
* Use "systemd" instead of redhat if you are installing on systemd enabled host.
* If you don't want to run the app as root, specify the user ID you want to run pm2 under (like -u hayashis)

## Monitoring

pm2 stores stdout/stderr from ISDP to ~/.pm2/logs . you can monitor it by
```
pm2 logs isdp
```

You can check the status of ISDP server via /health endpoint
```
curl http://localhost:12346/health
```
If this doesn't return, or return non-200, then something is wrong.

You can also check the runtime information from pm2
```
pm2 show isdp
```


## TODOs

1) Currently it receives request via web and immediately start processing request. This means all simultaneously requests will be executed in parallel... instead, I should do following.

* When a request comes, post to AMQP
* Write a separate handler that pulls request from AMQP one at a time and handle request

2) Currently doesn't handle invalid file path gracefully. Maybe I should skip missing ones and output a text file stating that files couldn't be downloaded?

3) Make sure an appropriate error message is generated (to who?) if incoming message is bogus.

4) Add a sensu check to make sure web-receiver and request handlers are running.

5) what happens if stage / publish directory can't be written? (doesn't exist, no access, not directory, disk is full)

6) add timeout mechanism for each task? also, should I async.retry?

7) what happens to error messages? 
stored in configured location (user can specify level)

8) there isn't much in the mocha test.. I need to add more unit testsing

* If caller send broken JSON, will it be logged in the error message?

DONE

9) what happens if amqp is down?
I am not sure if it's pooling messages to be published locally, but as soon as amqp server comes back online, it reconnects seemslessly

10) what happens if 2 request comes in simultaneously? I am afraid "var job = this;" on async.series on sca-datamover will point to 2nd jobs while processing the 1st job?
I've created a test script and it seems to work as expected. both job eventually finished successfully and correctly

> What happens if unzip, tar, etc.. commands doesn't exists in path?
