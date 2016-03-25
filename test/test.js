
//var winston = require('winston');
var expect = require('chai').expect;
var assert = require('assert');
var request = require('supertest');  

var config = require('../config/config');

describe("routing", function() {
    var app = require('../server').app;

    before(function(done) {
        //mongoose.connect(config.db.mongodb);                                                        
        done();
    });

    describe("health", function() {
        it("make sure invalid url returns 404", function(done) {
            request(app).get('/_nosuchthing')
            .expect(404, done);
        });

        it("should return ok status", function(done) {
            request(app).get('/health')
            .expect(200, {status: 'ok'})
            .end(done) 
        });
    });

    var reqid = null;

    describe("request", function() {
        //this.timeout(30*1000);
        it("should let me post request", function(done) {
            var req = {
                notification_email: "hayashis@iu.edu",
                files: [
                    'intopo/historic/geopdf/250k/in_evansville_156913_1957_250000_geo.zip', 
                    'intopo/historic/geopdf/250k/in_evansville_156914_1957_250000_geo.zip',
                    'intopo/historic/geopdf/250k/in_evansville_156915_1957_250000_geo.zip',
                    'intopo/historic/geopdf/250k/in_evansville_156916_1961_250000_geo.zip',
                    'intopo/historic/geopdf/250k/in_evansville_156917_1954_250000_geo.zip',
                ]
            };

            //app.post('/request', require('../controllers').request);

            request(app).post('/request')
            //.set('Accept', 'application/json')
            //.set('Authorization', 'Bearer '+config.test.jwt)
            .send(req)
            .expect(200, function(err, res) {
                console.dir(res.body);
                assert(res.body.id); //id should be set
                reqid = res.body.id;
                done();
                //setTimeout(done, 15*1000);
            });
        });
    });

    describe("progress", function() {
        it("should tell me progress tatus", function(done) {
            done();
        });
    });
});
