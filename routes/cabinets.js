var express     = require("express");
var router      = express.Router();
var Cabinet     = require("../models/cabinet");
var middleware  = require("../middleware");
var seedDB      = require("../seeds");
var pop         = require("../models/pop");
var S           = require('string');
var mongoose    = require('mongoose');

var aCabinet = new Cabinet() ;
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

//INDEX - show all pops
router.get("/pagination?", middleware.isLoggedIn ,function(request, response) {
    // limit is the number of rows per page
    var limit = parseInt(request.query.limit);
    // offset is the page number
    var skip  = parseInt(request.query.offset);
    // search string
    var searchQuery = request.query.search ;//: 'xe-'

    if(S(searchQuery).isEmpty()){
        Cabinet.count({}, function(err, cabinetsCount) {
            Cabinet.find({},'cabinet pop',{lean:true,skip:skip,limit:limit}, function(err, foundCabinets) {
                if (err) {
                     logger.error(err);
                }
                else {
                    var data = "{\"total\":"+ cabinetsCount+",\"rows\":" +  JSON.stringify(foundCabinets).escapeSpecialChars()+"}";
                    response.setHeader('Content-Type', 'application/json');                      
                    response.send(data);        
                }
            });
        });
    } 
    else {
        searchQuery = ".*"+S(searchQuery).s.toLowerCase()+".*";
        Cabinet.count({'$or' : [{cabinet: new RegExp(searchQuery,'i')},              
            {pop: new RegExp(searchQuery,'i')}]}, function(err, m_cabCount) {
            Cabinet.find({'$or' : [{cabinet: new RegExp(searchQuery,'i')},                
            {pop: new RegExp(searchQuery,'i')}]},'cabinet pop',{lean:true,skip:skip,limit:limit}, function(err, foundCabinets) {
                if (err) {
                     logger.error(err);
                }
                else {
                    var data = "{\"total\":"+ m_cabCount+",\"rows\":" + JSON.stringify(foundCabinets)+"}";
                    response.setHeader('Content-Type', 'application/json');                         
                    response.send(data);        
                }
            });
        });
    }
});

router.get("/", middleware.isLoggedIn ,function(request, response) {
    response.render("cabinets/index");
});

//NEW - show form to create new cabinet
//should show the form will post data to /cabinets
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    response.render("cabinets/new");
});

//CREATE - add new cabinet to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
    //get data from a form and add to cabinet array

    POP.findById({_id: mongoose.Types.ObjectId(request.body.cabinet.pop)},function(error,foundPOP){
        if(error){
            logger.error(error);
        }
        else{
            var cabinet = request.body.cabinet.cabinet;
            var pop =  foundPOP.shortName;

            aCabinet = {
                cabinet: cabinet,
                pop: pop 
            };

            try
            {
                Cabinet.create(aCabinet, function(error, createdCabinet) {
                    if (error) {
                        request.flash("error", "\t Error Duplicated  data !! Not acceptable the same cabinet with same pop. ");
                        response.redirect("cabinets/new"); 
                    }
                    else {
                        request.flash("success","Successfully added cabinet");
                        response.redirect("/cabinets");
                    }
                });   
            }
            catch (error ){
                request.flash("success","Something went wrong");
                response.redirect("cabinets/new"); 
            } 

        }
    });   
});
//SHOW cabinet ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
    //find cabinet with provided id
   // console.log("request.params.id: "+request.params.id);
    Cabinet.findById(request.params.id, function(error,foundCabinet){
        if(error){
            console.log(error);
        }
        else{
            //render show template with that cabinet
            response.render("cabinets/show",{cabinet: foundCabinet});
        }
    });
});

//EDIT cabinet ROUTE
router.get("/:id/edit",  function(request,response){
    //is user logged in?
   // console.log("Update a cabinet");
    Cabinet.findById(request.params.id,function(error,foundCabinets){
        response.render("cabinets/edit",{cabinet: foundCabinets});
    });
    
});


//UPDATE cabinet ROUTE
router.put("/:id", function(request,response){
    //find and update the correct cabinet

     POP.findById({_id: mongoose.Types.ObjectId(request.body.cabinet.pop)},function(error,foundPOP){
        if(error){
             logger.error(error);
        }
        else{            
            request.body.cabinet.pop = foundPOP.shortName;
             Cabinet.findByIdAndUpdate(request.params.id,request.body.cabinet,function(error,updatedCab){
                if(error){
                    console.log(error);
                    response.redirect("/cabinets");
                }
                else{
                    response.redirect("/cabinets/"+request.params.id);
                }
            });              
        }
    });
});

//DESTROY cabinet ROUTE
router.delete("/:id",  function(request,response){
    if(request.params.id == -1){
        response.redirect("/cabinets");
    }

    Cabinet.findByIdAndRemove(request.params.id,function(error){
       // console.log("Deleting cabinet with id: "+request.params.id);
        if(error){
            console.log(error);
        }
        request.flash("success","Successfully cabinet deleted");
        response.redirect("/cabinets");
    });
});

module.exports = router;