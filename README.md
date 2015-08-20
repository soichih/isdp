# isdp
ISDP multi-file download service

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

