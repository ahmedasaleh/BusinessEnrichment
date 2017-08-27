var express     	   	= require("express");
var router      	   	= express.Router({mergeParams: true});
var Enrichment 			  = require("../models/enrichment");
var middleware  		  = require("../middleware");
var importEnrichment 	= require("../middleware/import_enrichment");
var logger 		     		= require('../middleware/logger');//logging component
var fs                = require('fs');
var appendMode         = true;

var fileUploadPath     = __dirname+"/../import/";
var fileExportPath     = __dirname+"/../export/";
//INDEX - show all enrichment data
router.get("/", middleware.isLoggedIn ,function(request, response) {
   
    Enrichment.find({}, function(error, foundEnrichments) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("enrichments/index", { enrichments: foundEnrichments });
        }
    });
});

router.get("/export", middleware.isLoggedIn ,function(request, response) {
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
        console.log(error);
      }
      else {
        console.log('collection removed') 
        importEnrichment.createDocRecurse (null,fileUploadPath+filename)
      }
    });
  }
  else{
    importEnrichment.createDocRecurse (null,fileUploadPath+filename);
    response.redirect('/enrichments');
  }
  // response.redirect('/devices');
});
module.exports = router;