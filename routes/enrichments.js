var express     	   	= require("express");
var router      	   	= express.Router({mergeParams: true});
var Enrichment        = require("../models/enrichment");
var Device        = require("../models/device");
var Interface        = require("../models/interface");
var middleware  		  = require("../middleware");
var importEnrichment 	= require("../middleware/import_enrichment");
var logger            = require('../middleware/logger');//logging component
var linkParser            = require('../middleware/parser');//logging component
var fs                = require('fs');
var async           = require('async');
var appendMode         = true;

var fileUploadPath;     
var fileExportPath;     

if(process.env.OS == "WIN"){
  fileUploadPath     = __dirname+"\\..\\import\\";
  fileExportPath     = __dirname+"\\..\\export\\";
}else{
  fileUploadPath     = __dirname+"/../import/";
  fileExportPath     = __dirname+"/../export/";
}
function populateEnrichmentData() {
    Enrichment.aggregate({$group: {_id: '$B_TED_Elt_Device', deviceData:{$push:{B_TED_Elt_IP:'$B_TED_Elt_IP',B_TED_Elt_Model:'$B_TED_Elt_Model'}}}}
        ,function(error,device){
            logger.info(device);
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
  //retrieve list of devices
  Device.find({},function(error,foundDevices){
    if(error){
      logger.error(error);
    }
    else {
            foundDevices.forEach(function(device){
              logger.info("device " + device.hostname +" information will be retrieved for export");
                //retrieve list of interfaces
                async.forEachOf(device.interfaces,function(interface,key,callback){
                //parse each device alias
                var link = linkParser(interface.alias);
                logger.info(link);
                var doc = new Enrichment();
                doc.B_TED_Elt_Device = S(device.hostname).s;
                doc.B_TED_Elt_IP = S(device.ipaddress).s;
                doc.B_TED_Elt_Model = S(device.model).s;
                doc.B_TED_Elt_POP_Gov = S(device.governorate.name).s;
                doc.B_TED_Elt_POP_Name = S(device.popName.name).s;
                doc.B_TED_Elt_Type = S(device.type).s;
                doc.B_TED_Elt_Vendor = S(device.vendor).s;

                doc.SE_NAME = device.hostname+"_if<"+interface.index+">";
                doc.B_TED_linkType = link.linkType;
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
                }
                else if(doc.B_TED_linkType == "BITSTREAM"){
                  doc.B_TED_Customer = link.customer;
                }
                else if(doc.B_TED_linkType == "ESP"){
                  doc.B_TED_esp_customer = link.espCustomer;
                  doc.B_TED_esp_conntype = link.espConnType;
                  doc.B_TED_esp_order = link.espEmsOrder;
                  doc.B_TED_esp_bw = link.espBW;
                  doc.B_TED_esp_pop = link.espPop;
                  B_TED_esp_if = "1";

                }
                // logger.info(doc);
                doc.save();

              });
            });


    }

  });
  //update device info in the enrichment data
  Enrichment.find({}).exec().then(function(docs) {
      Enrichment.csvReadStream(docs).pipe(fs.createWriteStream(fileExportPath+'exportedEnrichment.csv'));
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