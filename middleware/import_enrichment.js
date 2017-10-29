var fs              = require('fs');
var Device          = require("../models/device");
var enrichmentData  = require("../lookUps/enrich");
var logger          = require('../middleware/logger');//logging component
var S               = require('string');
var async           = require('async');
var cmd=require('node-cmd');

var lineList = "";
var deviceList = [];
var deviceData ={ipaddress:0,hostname:1,community:2,type:3,vendor:4,model:5,sysObjectID:6,sysName:7,sysDescr:8};
// var deviceData ={ipaddress:0,hostname:1,community:2,type:3,vendor:4,model:5,sysObjectID:6,sysName:7};
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
        var headerFields = S(lineList[0]).trim().split(',');
        var isFileHeaderCorrect = true;
        if(headerFields.length == Object.keys(deviceData).length){
            for(var i=0;i<headerFields.length;i++){
                    if(((i == deviceData.ipaddress) && !(S(headerFields[i]) == "ipaddress"))){
                        logger.error("incorrect file format, bad ipaddress entry");
                        isFileHeaderCorrect = false;
                        break;
                    }
                    else if(((i == deviceData.hostname) && !(S(headerFields[i]) == "hostname"))){
                        logger.error("incorrect file format, bad hostname entry");
                        isFileHeaderCorrect = false;
                        break;
                    }
                    else if(((i == deviceData.community) && !(S(headerFields[i]) == "community"))){
                        logger.error("incorrect file format, bad community entry");
                        isFileHeaderCorrect = false;
                        break;
                    }
                    else if(((i == deviceData.type) && !(S(headerFields[i]) == "type"))){
                        logger.error("incorrect file format, bad type entry");
                        isFileHeaderCorrect = false;
                        break;
                    }
                    else if(((i == deviceData.vendor) && !(S(headerFields[i]) == "vendor" ))){
                        logger.error("incorrect file format, bad vendor entry");
                        isFileHeaderCorrect = false;
                        break;
                    }
                    else if(((i == deviceData.model) && !(S(headerFields[i]) == "model" ))){
                        logger.error("incorrect file format, bad model entry");
                        isFileHeaderCorrect = false;
                        break;
                    }
                    else if(((i == deviceData.sysObjectID) && !(S(headerFields[i]) == "sysObjectID"))){
                        logger.error("incorrect file format, bad sysObjectID entry");
                        isFileHeaderCorrect = false;
                        break;
                    }
                    else if(((i == deviceData.sysName) && !(S(headerFields[i]) == "sysName"))){
                        logger.error("incorrect file format, bad sysName entry");
                        isFileHeaderCorrect = false;
                        break;
                    }
                    else if(((i == deviceData.sysDescr) && !(S(headerFields[i]) == "sysDescr"))){
                        logger.error("incorrect file format, bad description entry");
                        isFileHeaderCorrect = false;
                        break;
                    }
            }
        }
        else{
            isFileHeaderCorrect = false;
            logger.log("incorrect header format, expected "+Object.keys(deviceData).length+" fields found "+headerFields.length);

        }
        if(isFileHeaderCorrect == true){
            
            // mongoimport -d bet_dev_v1 -c devices --type csv --file /home/bet/workspace/devices_export.csv --headerline
            // <command path>  -d <db_name> -c devices --type csv --file <path_to_file> --headerline
            var dbName;
            if(process.env.DEV_DB || process.env.PROD_DB) dbName = process.env.DEV_DB || process.env.PROD_DB;
            var command = process.env.MONGO_PATH + " -d "+ dbName + " -c devices --type csv --file "+S(filename).s + " --headerline";
            logger.info(command);
            cmd.get(command,function(err, data, stderr){
                if(err) logger.error(err);
                else logger.info("file imported successfully");
            });
        } 
    });
}

module.exports.createDocRecurse = createDocRecurse;
