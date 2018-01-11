var express     = require("express");
var router      = express.Router({mergeParams: true});
var POP         = require("../models/pop");
var middleware  = require("../middleware");
var seedDB      = require("../seeds");
var aPOP = new POP() ;
var S               = require('string');


//Mongoose PAGINATION
// router.get("/pagination",middleware.isLoggedIn ,function(request, response) {
//     POP.paginate({}, { select: 'shortName', lean: true,limit: 5000 }, function(err, result) {
//         console.log(result);
//         response.setHeader('Content-Type', 'application/json');
//         response.send(JSON.stringify(result));
//     });
// });

router.get("/pagination?", middleware.isLoggedIn ,function(request, response) {
        // limit is the number of rows per page
        var limit = parseInt(request.query.limit);
        // offset is the page number
        var skip  = parseInt(request.query.offset);
        // search string
        var searchQuery = request.query.search ;//: 'xe-'

        if(S(searchQuery).isEmpty()){
            POP.count({}, function(err, popsCount) {
                POP.find({},'shortName gov district sector popType popLongName pop_gov',{lean:true,skip:skip,limit:limit}, function(err, foundPOPs) {
                    if (err) {
                         logger.error(err);
                    }
                    else {
                        var data = "{\"total\":"+ popsCount+",\"rows\":" +  JSON.stringify(foundPOPs).escapeSpecialChars()+"}";
                        response.setHeader('Content-Type', 'application/json');
                        // response.send((foundDevices)); 
                        response.send(data);        
                    }

                });

            });

        } 
        else {
            searchQuery = ".*"+S(searchQuery).s.toLowerCase()+".*";
            POP.count({'$or' : [
                {shortName: new RegExp(searchQuery,'i')},
                {popLongName: new RegExp(searchQuery,'i')},
                {gov: new RegExp(searchQuery,'i')},
                {district: new RegExp(searchQuery,'i')},
                {sector: new RegExp(searchQuery,'i')},
                {popType: new RegExp(searchQuery,'i')},
                {pop_gov: new RegExp(searchQuery,'i')}
                ]}, 
                function(err, m_popsCount) {
                POP.find({'$or' : [
                {shortName: new RegExp(searchQuery,'i')},
                {popLongName: new RegExp(searchQuery,'i')},
                {gov: new RegExp(searchQuery,'i')},
                {district: new RegExp(searchQuery,'i')},
                {sector: new RegExp(searchQuery,'i')},
                {popType: new RegExp(searchQuery,'i')},
                 {pop_gov: new RegExp(searchQuery,'i')}
                ]},'shortName gov district sector popType popLongName pop_gov',{lean:true,skip:skip,limit:limit}, function(err, foundPOPs) {
                    if (err) {
                         logger.error(err);
                    }
                    else {
                        var data = "{\"total\":"+ m_popsCount+",\"rows\":" + JSON.stringify(foundPOPs)+"}";
                        response.setHeader('Content-Type', 'application/json');
                        // response.send((foundDevices)); 
                        response.send(data);        
                    }

                });
            });

        }
});

//INDEX - show all pops
router.get("/", middleware.isLoggedIn ,function(request, response) {
    
    POP.find({}, function(error, foundPOPs) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("pops/index", { pops: foundPOPs });
        }
    });
});
//NEW - show form to create new POP
//should show the form will post data to /pops
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    if(process.env.SEED == "true"){
       // console.log("process.env.SEED: "+process.env.SEED);
        seedDB(request.user);
    }
    response.render("pops/new");
});

//CREATE - add new POP to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
    //console.log(request.body.pop)
    //get data from a form and add to POP array
    var name = request.body.pop.name;
    var shortName = request.body.pop.shortName;
    var governorateAcro = request.body.pop.gov;
    var district = request.body.pop.district;
    var sector = request.body.pop.sector;

    aPOP = {
            name: name,
            shortName: shortName,
            gov: governorateAcro,
            district: district,
            sector: sector,
            author: {id: request.user._id, email: request.user.email}
    };

   // console.log(aPOP);
    POP.create(aPOP, function(error, createdPOP) {
        if (error) {
            console.log(error);
            request.flash("error","Something went wrong");
        }
        else {
          //  console.log("new POP created and saved");
           // console.log(createdPOP);
            request.flash("success","Successfully added POP");
            response.redirect("/pops");
        }
    });
});

//SHOW POP ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
    //find POP with provided id
   // console.log("request.params.id: "+request.params.id);
    POP.findById(request.params.id, function(error,foundPOP){
        if(error){
            console.log(error);
        }
        else{
            //render show template with that POP
            response.render("pops/show",{pop: foundPOP});
        }
    });
});

//EDIT POP ROUTE
router.get("/:id/edit",  function(request,response){
    //is user logged in?
   // console.log("Update a POP");
    POP.findById(request.params.id,function(error,foundPOP){
        //console.log(foundPOP)
        response.render("pops/edit",{pop: foundPOP});
    });
    
});
//UPDATE POP ROUTE
router.put("/:id", function(request,response){
    //find and update the correct POP
    POP.findByIdAndUpdate(request.params.id,request.body.pop,function(error,updatedPOP){
        if(error){
            console.log(error);
            response.redirect("/pops");
        }
        else{
            //redirect somewhere (show page)
            response.redirect("/pops/"+request.params.id);
        }
    });
});

//DESTROY POP ROUTE
router.delete("/:id",  function(request,response){
    if(request.params.id == -1){
        response.redirect("/pops");
    }

    POP.findByIdAndRemove(request.params.id,function(error){
      //  console.log("Deleting POP with id: "+request.params.id);
        if(error){
            console.log(error);
        }
        response.redirect("/pops");
    });
});


module.exports = router;