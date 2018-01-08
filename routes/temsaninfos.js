var express     = require("express");
// var router      = express.Router({mergeParams: true});
var router      = express.Router();
var Temsan  = require("../models/temsaninfo");
var middleware  = require("../middleware");
var exec = require('child_process').exec;
var aTemsan = new Temsan() ;
var seedDB      = require("../seeds");
var S               = require('string');
var mongoose        = require('mongoose');

//INDEX - show all pops
router.get("/pagination?", middleware.isLoggedIn ,function(request, response) {
        // limit is the number of rows per page

        console.log("ddddddddddddd");
        var limit = parseInt(request.query.limit);
        console.log("limit: "+limit)
        // offset is the page number
        var skip  = parseInt(request.query.offset);
        console.log("skip: "+skip)
        // search string
        var searchQuery = request.query.search ;//: 'xe-'
        console.log("searchQuery: "+searchQuery)

        if(S(searchQuery).isEmpty()){
            Temsan.count({}, function(err, msanCount) {
                Temsan.find({},'msanCode teMngIP TEDataMngIP teSector teDistrict',{lean:true,skip:skip,limit:limit}, function(err, foundmsans) {
                   
                 

                    if (err) {
                         logger.error(err);
                    }
                    else {
                        var data = "{\"total\":"+ msanCount+",\"rows\":" +  JSON.stringify(foundmsans).escapeSpecialChars()+"}";
                        response.setHeader('Content-Type', 'application/json');
                       
                        response.send(data);        
                    }

                });

            });

        } 
        else {
            searchQuery = ".*"+S(searchQuery).s.toLowerCase()+".*";
            Temsan.count({'$or' : [{msanCode: new RegExp(searchQuery,'i')},
              
              {teMngIP: new RegExp(searchQuery,'i')},
              {TEDataMngIP: new RegExp(searchQuery,'i')},
              {teSector: new RegExp(searchQuery,'i')},
                {teDistrict: new RegExp(searchQuery,'i')}]}, function(err, m_msanCount) {
                Temsan.find({'$or' : [{msanCode: new RegExp(searchQuery,'i')},
              
              {teMngIP: new RegExp(searchQuery,'i')},
              {TEDataMngIP: new RegExp(searchQuery,'i')},
              {teSector: new RegExp(searchQuery,'i')},
                {teDistrict: new RegExp(searchQuery,'i')}]},'msanCode teMngIP TEDataMngIP teSector teDistrict',{lean:true,skip:skip,limit:limit}, function(err, foundmsans) {
                    if (err) {
                         logger.error(err);
                    }
                    else {
                        var data = "{\"total\":"+ m_msanCount+",\"rows\":" + JSON.stringify(foundmsans)+"}";
                        response.setHeader('Content-Type', 'application/json');
                         
                        response.send(data);        
                    }

                });
            });

        }
});
router.get("/", middleware.isLoggedIn ,function(request, response) {
    console.log(" we here ")
   /* Cabinet.find({}, function(error, foundCabinets) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("cabinets/index", { cabinets: foundCabinets });
        }
    });*/
    response.render("temsaninfos/index");
});

//NEW - show form to create new cabinet
//should show the form will post data to /cabinets
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    if(process.env.SEED == "true")
    {
        console.log("process.env.SEED: "+process.env.SEED);
        seedDB(request.user);
    }
    response.render("temsaninfos/new");
});

//CREATE - add new cabinet to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
    //get data from a form and add to cabinet array

// POP.findById({_id: mongoose.Types.ObjectId(request.body.cabinet.pop)},function(error,foundPOP){
     /*   if(error){
             logger.error(error);
        }
        else{

             var cabinet = request.body.cabinet.cabinet;
             var pop =  foundPOP.shortName;
    */

     var msanCode = request.body.temsaninfo.msanCode;
    var TEDataMngIP = request.body.temsaninfo.TEDataMngIP;
    var teMngIP = request.body.temsaninfo.teMngIP;
    var teSector = request.body.temsaninfo.teSector;
    var teDistrict = request.body.temsaninfo.teDistrict;

     amsan = {
            msanCode: msanCode,
          
            teMngIP: teMngIP,
            TEDataMngIP: TEDataMngIP,
            teSector: teSector,
            teDistrict: teDistrict
                };
       
       try
       {

        Temsan.create(amsan, function(error, createdtemsan) {
        if (error) {


             console.log("error here \n ");
            
      //   request.flash("success","Something went wrong");

         
        //  response.render("cabinets/new");

          request.flash("error", "\t Error Duplicated  data !! Not acceptable the same cabinet with same pop. ");
          response.redirect("temsaninfos/new"); 

           //response.status(500).send('Something broke!')


        }
        else {
            console.log("new cabinet created and saved");
            console.log(createdtemsan);
            request.flash("success","Successfully added cabinet");
            response.redirect("/temsaninfos");
        }
    });   
      }
     catch (ex ){
        
            request.flash("success","Something went wrong");
             response.redirect("temsaninfos/new"); 

       } 
           
      //  }
  //  });

   

    // console.log(aCabinet);
   
});
//SHOW cabinet ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
    //find cabinet with provided id
    console.log("request.params.id: "+request.params.id);
    Temsan.findById(request.params.id, function(error,foundtemsan){
        if(error){
            console.log(error);
        }
        else{
            //render show template with that cabinet
            response.render("temsaninfos/show",{temsaninfo: foundtemsan});
        }
    });
});

//EDIT cabinet ROUTE
router.get("/:id/edit",  function(request,response){
    //is user logged in?
    console.log("Update a cabinet");
    Temsan.findById(request.params.id,function(error,foundtemsan){
        response.render("temsaninfos/edit",{temsaninfo: foundtemsan});
    });
    
});


//UPDATE cabinet ROUTE
router.put("/:id", function(request,response){
    //find and update the correct cabinet


  /*   POP.findById({_id: mongoose.Types.ObjectId(request.body.cabinet.pop)},function(error,foundPOP){
        if(error){
             logger.error(error);
        }
        else{*/
             
          //  request.body.cabinet.pop = foundPOP.shortName;
            
             
                 /*   Device.findByIdAndUpdate(request.params.id,request.body.device,function(error,updatedDevice){
                        if(error){
                             logger.error(error);
                            response.redirect("/devices");
                        }
                        else{
                            //redirect somewhere (show page)
                            updatedDevice.save();
                        }
                    });*/


     Temsan.findByIdAndUpdate(request.params.id,request.body.temsaninfo,function(error,updatedtemsan){
        if(error){
            console.log(error);
            response.redirect("/temsaninfos");
        }
        else{
            //redirect somewhere (show page)


            response.redirect("/temsaninfos/"+request.params.id);
        }
    });



               
       // }
  //  });



   
});

//DESTROY cabinet ROUTE
router.delete("/:id",  function(request,response){
 
    if(request.params.id == -1){
        response.redirect("/temsaninfos");
    }

    Temsan.findByIdAndRemove(request.params.id,function(error){
        console.log("Deleting cabinet with id: "+request.params.id);
        if(error){
            console.log(error);
        }
        request.flash("success","Successfully cabinet deleted");
        response.redirect("/temsaninfos");
    });
});

String.prototype.escapeSpecialChars = function() {
    return this.replace(/\\n/g, "")
               .replace(/\\'/g, "")
               .replace(/\\"/g, '')
               .replace(/\\&/g, "")
               .replace(/\\r/g, "")
               .replace(/\\t/g, "")
               .replace(/\\b/g, "")
               .replace(/\\f/g, "");
};



module.exports = router;