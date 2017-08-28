var mongoose    = require('mongoose');
var fs          = require('fs');
var Enrichment  = require("../models/enrichment");
var Device      = require("../models/device");
var enrichmentData  = require("../lookUps/enrich");
var logger              = require('../middleware/logger');//logging component
var S               = require('string');
var async           = require('async');
var headerShiftted = false;
var lineList = "";
var deviceList = [];
var deviceData ={B_TED_Elt_Device:12,B_TED_Elt_IP:13,B_TED_Elt_Model:14,B_TED_Elt_POP_Gov:15,B_TED_Elt_POP_Name:16,B_TED_Elt_Type:17,B_TED_Elt_Vendor:18,CommunityString:64};


function queryAllEntries () {
    Enrichment.aggregate(
        {$group: {_id: '$SE_Name', enrichmentArray: {$push: {
                    B_TED_2ndHost : '$B_TED_2ndHost',
                    B_TED_2ndPop : '$B_TED_2ndPop',
                    B_TED_BadrRelease : '$B_TED_BadrRelease',
                    B_TED_badrRelease : '$B_TED_badrRelease',
                    B_TED_bundleId : '$B_TED_bundleId',
                    B_TED_cardType : '$B_TED_cardType',
                    B_TED_circuitId : '$B_TED_circuitId',
                    B_TED_connType : '$B_TED_connType',
                    B_TED_Customer : '$B_TED_Customer',
                    B_TED_CustProbe : '$B_TED_CustProbe',
                    B_TED_Default_Coll : '$B_TED_Default_Coll',
                    B_TED_Elt_Device : '$B_TED_Elt_Device',
                    B_TED_Elt_IP : '$B_TED_Elt_IP',
                    B_TED_Elt_Model : '$B_TED_Elt_Model',
                    B_TED_Elt_POP_Gov : '$B_TED_Elt_POP_Gov',
                    B_TED_Elt_POP_Name : '$B_TED_Elt_POP_Name',
                    B_TED_Elt_Type : '$B_TED_Elt_Type',
                    B_TED_Elt_Vendor : '$B_TED_Elt_Vendor',
                    B_TED_esp_bw : '$B_TED_esp_bw',
                    B_TED_esp_conntype : '$B_TED_esp_conntype',
                    B_TED_esp_customer : '$B_TED_esp_customer',
                    B_TED_esp_if : '$B_TED_esp_if',
                    B_TED_esp_order : '$B_TED_esp_order',
                    B_TED_esp_pop : '$B_TED_esp_pop',
                    B_TED_ifDescrSt : '$B_TED_ifDescrSt',
                    B_TED_IMA_Flag : '$B_TED_IMA_Flag',
                    B_TED_intCID : '$B_TED_intCID',
                    B_TED_interface : '$B_TED_interface',
                    B_TED_IntProbe : '$B_TED_IntProbe',
                    B_TED_IP_Pool : '$B_TED_IP_Pool',
                    B_TED_IP_Pool_Name : '$B_TED_IP_Pool_Name',
                    B_TED_IPSLA_COS : '$B_TED_IPSLA_COS',
                    B_TED_isbundle : '$B_TED_isbundle',
                    B_TED_isCPE : '$B_TED_isCPE',
                    B_TED_isDeviceUplink : '$B_TED_isDeviceUplink',
                    B_TED_isPopUplink : '$B_TED_isPopUplink',
                    B_TED_IXIA_IsDestPOP: '$B_TED_IXIA_IsDestPOP' , 
                    B_TED_IXIA_Mesh: '$B_TED_IXIA_Mesh' , 
                    B_TED_IXIA_Module: '$B_TED_IXIA_Module' , 
                    B_TED_IXIA_PairName: '$B_TED_IXIA_PairName' , 
                    B_TED_IXIA_PhysHost: '$B_TED_IXIA_PhysHost' , 
                    B_TED_IXIA_PhysTarget: '$B_TED_IXIA_PhysTarget' , 
                    B_TED_IXIA_Service: '$B_TED_IXIA_Service' , 
                    B_TED_IXIA_Type: '$B_TED_IXIA_Type',                    
                    B_TED_Label : '$B_TED_Label',
                    B_TED_linkBw : '$B_TED_linkBw',
                    B_TED_linkId : '$B_TED_linkId',
                    B_TED_linkIp : '$B_TED_linkIp',
                    B_TED_linkNum : '$B_TED_linkNum',
                    B_TED_linkType : '$B_TED_linkType',
                    B_TED_MSAN : '$B_TED_MSAN',
                    B_TED_ProbeFrom : '$B_TED_ProbeFrom',
                    B_TED_ProbeService : '$B_TED_ProbeService',
                    B_TED_ProbeTo : '$B_TED_ProbeTo',
                    B_TED_provider : '$B_TED_provider',
                    B_TED_routerName : '$B_TED_routerName',
                    B_TED_service : '$B_TED_service',
                    B_TED_ShortLabel : '$B_TED_ShortLabel',
                    B_TED_Site : '$B_TED_Site',
                    B_TED_subCable : '$B_TED_subCable',
                    B_TED_teCID : '$B_TED_teCID',
                    B_TED_termination : '$B_TED_termination',
                    B_TED_TestTarget : '$B_TED_TestTarget',
                    CommunityString: '$CommunityString'
            }}
        }}, function(err, qDocList) {
        // console.log(util.inspect(qDocList, false, 10));
        // process.exit(0);
    });
}

// Recursively go through list adding documents.
function createDocRecurse (err,filename) {
    if (err) {
        logger.error(err);
    }

    fs.readFile(S(filename).s, 'utf8', function(err, contents) {
        logger.info("reading enrichment file "+S(filename).s);
        lineList = contents.toString().split('\n');
        async.forEachOf(lineList,function(line,key,callback){
            if(key != 0){//to skip first header line 
                var doc = new Enrichment();
                var device = new Device();
                line.split(',').forEach(function (entry, i) {
                    doc[enrichmentData.extendedEnrichmentFields[i]] = entry;
                    if((i == deviceData.B_TED_Elt_Device)){//
                        device.hostname = entry;
                    }
                    else if(i == deviceData.B_TED_Elt_IP){//
                        device.ipaddress = entry;
                    }
                    else if(i == deviceData.B_TED_Elt_Model){
                        device.model = entry;
                    }
                    else if(i == deviceData.B_TED_Elt_POP_Gov){
                        device.governorate.name = entry;
                    }
                    else if(i == deviceData.B_TED_Elt_POP_Name){
                        device.popName.name = entry;
                    }
                    else if(i == deviceData.B_TED_Elt_Type){
                        device.type = entry;
                    }
                    else if(i == deviceData.B_TED_Elt_Vendor){
                        device.vendor = entry;
                    }
                    else if(i == deviceData.CommunityString){
                        device.communityString = S(entry).s;
                        logger.info(device.communityString);
                    }
                });
                doc.save();  
                if(!deviceList.includes(device.hostname) && device.hostname) {
                    Device.findOne({hostname:device.hostname},function(error,foundDevice){
                        if(error){
                            logger.error(error);
                             
                        }
                        else if(foundDevice){
                            logger.info("enriched device already in database");
                        }
                        else{
                            device.save();
                        }
                    });
                }
                // if(!deviceList.includes(device.hostname) && device.hostname) device.save();     
                deviceList.push(device.hostname);
            }
        });
    });
    
}

module.exports.createDocRecurse = createDocRecurse;
