var express     	   	= require("express");
var router      	   	= express.Router({mergeParams: true});
var Enrichment        = require("../models/enrichment");
var Link        = require("../models/link");
var Device        = require("../models/device");
var Interface        = require("../models/interface");
var middleware  		  = require("../middleware");
var importEnrichment 	= require("../middleware/import_enrichment");
var logger            = require('../middleware/logger');//logging component
var linkParser            = require('../middleware/parser/parser');
var enrichmentData  = require("../lookUps/enrich");
var fs                = require('fs');
var async           = require('async');
var S               = require('string');
var through = require('through');
var csv = enrichmentData.enrichmentFields+"\n";

var appendMode         = true;
var fileUploadPath;     
var fileExportPath;     
var parsedInterfaces = [];
var maxCollectorLoad = 30000;
var collectorsLoad = {"1":0 ,"2":0 ,"3":0 ,"4":0 ,"5":0 ,"6":0 , "7":0 ,"8":0 ,"9":0 };

if(process.env.OS == "WIN"){
  fileUploadPath     = __dirname+"\\..\\import\\";
  fileExportPath     = __dirname+"\\..\\export\\";
}else{
  fileUploadPath     = __dirname+"/../import/";
  fileExportPath     = __dirname+"/../export/";
}
function puts(error, stdout, stderr) { 
  // process.stderr.write(err);
  sys.puts(stdout);
}

function populateEnrichmentData() {
    Enrichment.aggregate({$group: {_id: '$B_TED_Elt_Device', deviceData:{$push:{B_TED_Elt_IP:'$B_TED_Elt_IP',B_TED_Elt_Model:'$B_TED_Elt_Model'}}}}
        ,function(error,device){
            logger.info(device);
        });
}


function getSecondHost(devicename,ifDesc){
  var secondHost = null;
  logger.error("getSecondHost: "+devicename+"\t"+ifDesc);
  Link.findOne({device1: devicename, interface1: "ge-0/0/0"},function(error,foundLink){
    if(error){
      logger.error(error);
      return (null);
    }
    else if(foundLink != null){
      secondHost = foundLink.device2;
      secondPOP = linkParser.parseHostname(S(secondHost).s).popName;
      logger.error("second host: "+secondHost);
      logger.error("second POP: "+secondPOP);
      return (secondHost) ;
    }
    else{
      logger.error("can't find second host for the device "+devicename+" on interface "+ifDesc);
      return (null);     
    }
  });

}
//INDEX - show all enrichment data
router.get("/", middleware.isLoggedIn ,function(request, response) {  
    Enrichment.find({}, function(error, foundEnrichments) {
        if (error) {
            logger.error(error);
        }
        else {
            response.render("enrichments/index", { enrichments: foundEnrichments });
        }
    });
});

router.get("/export", middleware.isLoggedIn ,function(request, response) {
  //update device info in the enrichment data
  logger.error("will start creating enrichment file inside "+fileExportPath);
  // This opens up the writeable stream to exportedEnrichment.csv
  var writeStream = fs.createWriteStream(fileExportPath+'exportedEnrichment.csv');
  Enrichment.remove({}, function(error) { 
    if(error){
      logger.error(error);
    }
    else {
      logger.info('collection removed');
      async.waterfall([
        function(cb) {
          //retrieve list of devices
          Device.find({},function(error,foundDevices){
            if(error){
              logger.error(error);
            }
            else {
              foundDevices.forEach(function(device){
                logger.info("device " + device.hostname +" information will be retrieved for export");
                //start with the device itself then iterate over its interfaces
                var deviceDoc = new Enrichment();
                deviceDoc.B_TED_Elt_Device = S(device.hostname).s;
                //distribute resources on different collectors
                for (var i = 0; i < 9; i++) {
                  if(collectorsLoad[i] < maxCollectorLoad){
                    deviceDoc.B_TED_Default_Coll = i;
                    collectorsLoad[i] = collectorsLoad[i] + 1;
                    break;
                  }
                }
                
                var deviceDetails = linkParser.parseHostname(deviceDoc.B_TED_Elt_Device);
                if(deviceDetails != null){
                  deviceDoc.B_TED_Elt_IP = S(device.ipaddress).s;
                  deviceDoc.B_TED_Elt_Model = S(device.model).s;
                  deviceDoc.B_TED_Elt_POP_Gov = deviceDetails.popGove;
                  deviceDoc.B_TED_Elt_POP_Name = deviceDetails.popName;
                  deviceDoc.B_TED_Elt_Type = deviceDetails.deviceType;
                  deviceDoc.B_TED_Elt_Vendor = deviceDetails.deviceVendor;
                  deviceDoc.B_TED_Label = deviceDoc.B_TED_Elt_Device;
                  deviceDoc.B_TED_ShortLabel = deviceDoc.B_TED_Elt_Device;
                  deviceDoc.SE_Name = S(device.hostname).s+"_if<NULL>";
                  deviceDoc.save();
                  csv += deviceDoc.SE_Name+','+deviceDoc.B_TED_2ndHost+','+deviceDoc.B_TED_2ndPop+','+deviceDoc.B_TED_BadrRelease+','+deviceDoc.B_TED_badrRelease+','+deviceDoc.B_TED_bundleId+','+deviceDoc.B_TED_cardType+','+deviceDoc.B_TED_circuitId+','+deviceDoc.B_TED_connType+','+deviceDoc.B_TED_Customer+','+deviceDoc.B_TED_CustProbe+','+deviceDoc.B_TED_Default_Coll+','+deviceDoc.B_TED_Elt_Device+','+deviceDoc.B_TED_Elt_IP+','+deviceDoc.B_TED_Elt_Model+','+deviceDoc.B_TED_Elt_POP_Gov+','+deviceDoc.B_TED_Elt_POP_Name+','+deviceDoc.B_TED_Elt_Type+','+deviceDoc.B_TED_Elt_Vendor+','+deviceDoc.B_TED_esp_bw+','+deviceDoc.B_TED_esp_conntype+','+deviceDoc.B_TED_esp_customer+','+deviceDoc.B_TED_esp_if+','+deviceDoc.B_TED_esp_order+','+deviceDoc.B_TED_esp_pop+','+deviceDoc.B_TED_ifDescrSt+','+deviceDoc.B_TED_IMA_Flag+','+deviceDoc.B_TED_intCID+','+deviceDoc.B_TED_interface+','+deviceDoc.B_TED_IntProbe+','+deviceDoc.B_TED_IP_Pool+','+deviceDoc.B_TED_IP_Pool_Name+','+deviceDoc.B_TED_IPSLA_COS+','+deviceDoc.B_TED_isbundle+','+deviceDoc.B_TED_isCPE+','+deviceDoc.B_TED_isDeviceUplink+','+deviceDoc.B_TED_isPopUplink+','+deviceDoc.B_TED_IXIA_IsDestPOP+','+deviceDoc.B_TED_IXIA_Mesh+','+deviceDoc.B_TED_IXIA_Module+','+deviceDoc.B_TED_IXIA_PairName+','+deviceDoc.B_TED_IXIA_PhysHost+','+deviceDoc.B_TED_IXIA_PhysTarget+','+deviceDoc.B_TED_IXIA_Service+','+deviceDoc.B_TED_IXIA_Type+','+deviceDoc.B_TED_Label+','+deviceDoc.B_TED_linkBw+','+deviceDoc.B_TED_linkId+','+deviceDoc.B_TED_linkIp+','+deviceDoc.B_TED_linkNum+','+deviceDoc.B_TED_linkType+','+deviceDoc.B_TED_MSAN+','+deviceDoc.B_TED_ProbeFrom+','+deviceDoc.B_TED_ProbeService+','+deviceDoc.B_TED_ProbeTo+','+deviceDoc.B_TED_provider+','+deviceDoc.B_TED_routerName+','+deviceDoc.B_TED_service+','+deviceDoc.B_TED_ShortLabel+','+deviceDoc.B_TED_Site+','+deviceDoc.B_TED_subCable+','+deviceDoc.B_TED_teCID+','+deviceDoc.B_TED_termination+','+deviceDoc.B_TED_TestTarget+'\n';
                  //retrieve list of interfaces
                  parsedInterfaces = [];
                  async.forEachOf(device.interfaces,function(interface,key,callback){
                    //parse each device alias
                    if(!parsedInterfaces.includes(interface.name)){//added this condition to avoid repetitions 
                      parsedInterfaces.push(interface.name);
                      var link = linkParser.parseIfAlias(interface.alias);
                      if(link != null){
                        var doc = new Enrichment();
                        doc.B_TED_Elt_Device = S(device.hostname).s;
                        doc.B_TED_Default_Coll = deviceDoc.B_TED_Default_Coll;
                        doc.B_TED_linkBw = interface.speed / 1000000;
                        doc.B_TED_ifDescrSt = interface.alias;
                        doc.B_TED_Elt_IP = S(device.ipaddress).s;
                        doc.B_TED_Elt_Model = S(device.model).s;
                        doc.B_TED_Elt_POP_Gov = deviceDetails.popGove;
                        doc.B_TED_Elt_POP_Name = deviceDetails.popName;
                        doc.B_TED_Elt_Type = deviceDetails.deviceType;
                        doc.B_TED_Elt_Vendor = deviceDetails.deviceVendor;
                        doc.SE_Name = S(device.hostname).s+"_if<"+interface.index+">";
                        doc.B_TED_linkType = link.linkType;                 
                        //B_TED_Label = B_TED_Elt_Device+" IF: "+ifIndex+" "+B_TED_linkBw+" "+ifDesc+" to "+ifAlias 
                        doc.B_TED_Label = doc.B_TED_Elt_Device+" IF: "+interface.index+" ";
                        if(!S(doc.B_TED_linkBw).isEmpty() &&  (parseInt(S(doc.B_TED_linkBw)) > 1000)){
                          doc.B_TED_Label = doc.B_TED_Label+doc.B_TED_linkBw+" Gbps "+interface.description+" to "+interface.alias;
                        }
                        else{
                          doc.B_TED_Label = doc.B_TED_Label+doc.B_TED_linkBw+" Mbps "+interface.description+" to "+interface.alias;                      
                        }

                        if(doc.B_TED_linkType == "International"){
                          doc.B_TED_service = link.service;
                          doc.B_TED_provider = link.provider;
                          doc.B_TED_termination = link.termination;
                          doc.B_TED_connType = link.connType;
                          doc.B_TED_bundleId = link.bundelID;
                          doc.B_TED_linkId = link.linkID;
                          doc.B_TED_intCID = link.intCID;
                          doc.B_TED_teCID = link.teCID;
                          doc.B_TED_subCable = link.subCable;
                          doc.B_TED_isDeviceUplink = false;
                          doc.B_TED_isPopUplink = false;
                        }
                        else if(doc.B_TED_linkType == "BITSTREAM"){
                          doc.B_TED_Customer = link.customer;
                        }
                        if(link.isESP == "1"){
                          doc.B_TED_esp_customer = link.espCustomer;
                          doc.B_TED_esp_conntype = link.espConnType;
                          doc.B_TED_esp_order = link.espEmsOrder;
                          doc.B_TED_esp_bw = link.espBW;
                          doc.B_TED_esp_pop = link.espPop;
                          doc.B_TED_esp_if = "1";
                          if(!S(doc.B_TED_esp_bw).isEmpty() &&  (parseInt(S(doc.B_TED_esp_bw)) > 0)){
                            doc.B_TED_linkBw = doc.B_TED_esp_bw;
                          }
                        }
                        Link.findOne({device1: doc.B_TED_Elt_Device, interface1: interface.description},function(error,foundLink){
                          if(error){
                            logger.error(error);
                            doc.save();
                            deviceDoc.save();
                          }
                          else if(foundLink != null){
                            doc.B_TED_2ndHost = foundLink.device2;
                            doc.B_TED_2ndPop = linkParser.parseHostname(doc.B_TED_2ndHost).popName;
                            doc.save();
                            deviceDoc.save();
                          }
                          else{
                            logger.error("can't find second host for the device "+doc.B_TED_Elt_Device+" on interface "+interface.description);
                            doc.save();
                            deviceDoc.save();
                          }
                          csv += doc.SE_Name+','+doc.B_TED_2ndHost+','+doc.B_TED_2ndPop+','+doc.B_TED_BadrRelease+','+doc.B_TED_badrRelease+','+doc.B_TED_bundleId+','+doc.B_TED_cardType+','+doc.B_TED_circuitId+','+doc.B_TED_connType+','+doc.B_TED_Customer+','+doc.B_TED_CustProbe+','+doc.B_TED_Default_Coll+','+doc.B_TED_Elt_Device+','+doc.B_TED_Elt_IP+','+doc.B_TED_Elt_Model+','+doc.B_TED_Elt_POP_Gov+','+doc.B_TED_Elt_POP_Name+','+doc.B_TED_Elt_Type+','+doc.B_TED_Elt_Vendor+','+doc.B_TED_esp_bw+','+doc.B_TED_esp_conntype+','+doc.B_TED_esp_customer+','+doc.B_TED_esp_if+','+doc.B_TED_esp_order+','+doc.B_TED_esp_pop+','+doc.B_TED_ifDescrSt+','+doc.B_TED_IMA_Flag+','+doc.B_TED_intCID+','+doc.B_TED_interface+','+doc.B_TED_IntProbe+','+doc.B_TED_IP_Pool+','+doc.B_TED_IP_Pool_Name+','+doc.B_TED_IPSLA_COS+','+doc.B_TED_isbundle+','+doc.B_TED_isCPE+','+doc.B_TED_isDeviceUplink+','+doc.B_TED_isPopUplink+','+doc.B_TED_IXIA_IsDestPOP+','+doc.B_TED_IXIA_Mesh+','+doc.B_TED_IXIA_Module+','+doc.B_TED_IXIA_PairName+','+doc.B_TED_IXIA_PhysHost+','+doc.B_TED_IXIA_PhysTarget+','+doc.B_TED_IXIA_Service+','+doc.B_TED_IXIA_Type+','+doc.B_TED_Label+','+doc.B_TED_linkBw+','+doc.B_TED_linkId+','+doc.B_TED_linkIp+','+doc.B_TED_linkNum+','+doc.B_TED_linkType+','+doc.B_TED_MSAN+','+doc.B_TED_ProbeFrom+','+doc.B_TED_ProbeService+','+doc.B_TED_ProbeTo+','+doc.B_TED_provider+','+doc.B_TED_routerName+','+doc.B_TED_service+','+doc.B_TED_ShortLabel+','+doc.B_TED_Site+','+doc.B_TED_subCable+','+doc.B_TED_teCID+','+doc.B_TED_termination+','+doc.B_TED_TestTarget+'\n';
                        });
                      }
                    }
                  });//interface forEach
                }
              });//device forEach

            var stream = through(function write(data) {
                            this.emit('data', data);
                        }, function end() {
                            this.emit('end');
                        });
            var lines = [];
            stream.on('data', function(data) {
                lines.push(data);
            }).on('end', function() {
                cb();
            });

            // call and invoke the stream
            Enrichment.find().csv(stream);
            }//else
          });
        },function(cb){
            fs.appendFileSync(fileExportPath+'exportedEnrichment.csv', S(csv).replaceAll('undefined', '').s);
            //re-initialize for next export
            csv = enrichmentData.enrichmentFields+"\n";
        }
        ], function(err) {
          logger.error(err);
        }
      );
    }
  });

  request.flash("success","Enrichment data exported");
  return response.redirect("/home");
});

//NEW - show form to create new Enrichment
//should show the form will post data to /enrichments
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    response.render("enrichments/new");
});

//CREATE - add new enrichment to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
	logger.info('importing enrichment data');
	logger.info("uploading enrichment file "+request.files.file.name);

	if (!request.files.file)
	    return response.status(400).send('No files were uploaded.');
	var sampleFile = request.files.file;
	var filename = sampleFile.name;
	sampleFile.mv(fileUploadPath+filename, function(err) {
	    if (err){
	      return response.status(500).send(err);
	    }
  });
  //check if we will create new collection or we will append on the old one
  //default is to append
  if(appendMode == false){
    Enrichment.remove({}, function(error) { 
      if(error){
        logger.error(error);
      }
      else {
        logger.error('collection removed') 
        importEnrichment.createDocRecurse (null,fileUploadPath+filename)
      }
    });
  }
  else{
    importEnrichment.createDocRecurse (null,fileUploadPath+filename);
    // populateEnrichmentData();
    response.redirect('/enrichments');
  }
  // response.redirect('/devices');
});
module.exports = router;