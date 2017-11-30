var express     = require("express");
var router      = express.Router({mergeParams: true});
var POP         = require("../models/pop");
var middleware  = require("../middleware");
var seedDB      = require("../seeds");
var aPOP = new POP() ;

//Mongoose PAGINATION
router.get("/pagination",middleware.isLoggedIn ,function(request, response) {
    POP.paginate({}, { select: 'shortName', lean: true,limit: 5000 }, function(err, result) {
        response.setHeader('Content-Type', 'application/json');
        response.send(JSON.stringify(result));
    });
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
        console.log("process.env.SEED: "+process.env.SEED);
        seedDB(request.user);
    }
    response.render("pops/new");
});

//CREATE - add new POP to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
    //get data from a form and add to POP array
    var name = request.body.pop.name;
    var shortName = request.body.pop.shortName;
    var governorateAcro = request.body.pop.governorateAcro;
    var district = request.body.pop.district;
    var sector = request.body.pop.sector;

    aPOP = {
            name: name,
            shortName: shortName,
            governorateAcro: governorateAcro,
            district: district,
            sector: sector,
            author: {id: request.user._id, email: request.user.email}
    };

    console.log(aPOP);
    POP.create(aPOP, function(error, createdPOP) {
        if (error) {
            console.log(error);
            request.flash("error","Something went wrong");
        }
        else {
            console.log("new POP created and saved");
            console.log(createdPOP);
            request.flash("success","Successfully added POP");
            response.redirect("/pops");
        }
    });
});

//SHOW POP ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
    //find POP with provided id
    console.log("request.params.id: "+request.params.id);
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
    console.log("Update a POP");
    POP.findById(request.params.id,function(error,foundPOP){
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
        console.log("Deleting POP with id: "+request.params.id);
        if(error){
            console.log(error);
        }
        response.redirect("/pops");
    });
});


module.exports = router;