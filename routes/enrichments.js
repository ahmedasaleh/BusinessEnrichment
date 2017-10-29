var express     	   	= require("express");
var router      	   	= express.Router({mergeParams: true});
var Enrichment        = require("../models/enrichment");
var Link              = require("../models/link");
var Device            = require("../models/device");
var Interface         = require("../models/interface");
var middleware  		  = require("../middleware");
var importEnrichment 	= require("../middleware/import_enrichment");
var logger            = require('../middleware/logger');//logging component
var linkParser        = require('../middleware/parser/parser');
var enrichmentData    = require("../lookUps/enrich");
var fs                = require('fs');
var async             = require('async');
var S                 = require('string');
var through           = require('through');
var csv               = enrichmentData.enrichmentFields+"\n";
var cmd               = require('node-cmd');
var dateFormat        = require('dateformat');

var appendMode         = true;
var fileUploadPath;     
var fileExportPath;     
var parsedInterfaces   = [];
// var maxCollectorLoad = 30000;

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
  var dbName;
  if(process.env.DEV_DB || process.env.PROD_DB) dbName = process.env.DEV_DB || process.env.PROD_DB;
  //mongoexport -d bet_prod_v1 -c interfaces --type csv -o interfaces.csv -f index,device
  var command = process.env.MONGO_EXPORT_PATH + " -d "+ dbName + " -c interfaces --type csv -o "+fileExportPath+"interfaces_"+dateFormat(new Date(),"dd-mm-yyyy_HH-MM-ss")+".csv -f "+enrichmentData.interfaceExportedFields;
  logger.info(command);
  cmd.get(command,function(err, data, stderr){
      if(err) logger.error(err);
      else logger.info("file exported successfully");
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