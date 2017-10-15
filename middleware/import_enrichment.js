var fs              = require('fs');
var Device          = require("../models/device");
var enrichmentData  = require("../lookUps/enrich");
var logger          = require('../middleware/logger');//logging component
var S               = require('string');
var async           = require('async');

var lineList = "";
var deviceList = [];
var deviceData ={ipaddress:0,hostname:1,community:2,type:3,vendor:4,model:5,sysObjectID:6,sysName:7,sysDescr:8};
String.prototype.escapeSpecialChars = function() {
    return this.replace(/\\/g, "")
                .replace(/\\n/g, "")
                .replace(/\\'/g, "")
               .replace(/\\"/g, "")
               .replace(/\\&/g, "")
               .replace(/\\r/g, "")
               .replace(/\\t/g, "")
               .replace(/\\b/g, "")
               .replace(/\\f/g, "");
};

// Recursively go through list adding documents.
function createDocRecurse (err,filename) {
    if (err) {
        logger.error(err);
    }

    fs.readFile(S(filename).s, 'utf8', function(err, contents) {
        logger.info("reading enrichment file "+S(filename).s);
        lineList = contents.toString().trim().split('\n');
        async.forEachOf(lineList,function(line,key,callback){
            if(key != 0){//to skip first header line 
                var device = new Device();
                line.split(',').forEach(function (entry, i) {

                    if((i == deviceData.ipaddress)){//
                        device.ipaddress = S(entry).trim().s.escapeSpecialChars();
                    }
                    else if(i == deviceData.hostname){//
                        device.hostname = S(entry).trim().s.escapeSpecialChars();
                    }
                    else if(i == deviceData.community){
                        device.communityString = S(entry).trim().s.escapeSpecialChars();
                    }
                    else if(i == deviceData.type){
                        device.type = S(entry).trim().s.escapeSpecialChars();
                    }
                    else if(i == deviceData.vendor){
                        device.vendor = S(entry).trim().s.escapeSpecialChars();
                    }
                    else if(i == deviceData.model){
                        device.model = S(entry).trim().s.escapeSpecialChars();
                    }
                    else if(i == deviceData.sysObjectID){
                        device.sysObjectID = S(entry).trim().s.escapeSpecialChars();
                    }
                    else if(i == deviceData.sysName){
                        device.sysName = S(entry).trim().s.escapeSpecialChars();
                    }
                    else if(i == deviceData.sysDescr){
                        device.description = S(entry).trim().s.escapeSpecialChars();
                    }
                });
                if(device.hostname && !deviceList.includes(device.hostname)) {
                            device.save();
                            logger.info("device "+device.hostname+" saved");
                }
                deviceList.push(device.hostname);
            }
        });
    });
    logger.info("deviceList length: "+deviceList.length);
}

module.exports.createDocRecurse = createDocRecurse;
