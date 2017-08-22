var express     = require("express");
var router      = express.Router({mergeParams: true});
var Governorate  = require("../models/governorate");
var middleware  = require("../middleware");
var seedDB      = require("../seeds");
var aGovernorate = new Governorate() ;

//Mongoose PAGINATION
router.get("/pagination",middleware.isLoggedIn ,function(request, response) {
    Governorate.paginate({}, { select: 'name', lean: true,limit: 500 }, function(err, result) {
        response.setHeader('Content-Type', 'application/json');
        response.send(JSON.stringify(result));
    });
});
//INDEX - show all pops
router.get("/", middleware.isLoggedIn ,function(request, response) {
    Governorate.find({}, function(error, foundGovernorates) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("governorates/index", { governorates: foundGovernorates });
        }
    });
});
//NEW - show form to create new governorate
//should show the form will post data to /governorates
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    if(process.env.SEED == "true"){
        console.log("process.env.SEED: "+process.env.SEED);
        seedDB(request.user);
    }
    response.render("governorates/new");
});

//CREATE - add new governorate to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
    //get data from a form and add to governorate array
    var name = request.body.governorate.name;
    var acronym = request.body.governorate.acronym;

    aGovernorate = {
            name: name,
            acronym: acronym,
            author: {id: request.user._id, email: request.user.email}
    };

    console.log(aGovernorate.name);
    console.log(aGovernorate.acronym);
    Governorate.create(aGovernorate, function(error, createdGovernorate) {
        if (error) {
            console.log(error);
            request.flash("error","Something went wrong");
        }
        else {
            console.log("new governorate created and saved");
            console.log(createdGovernorate);
            request.flash("success","Successfully added governorate");
            response.redirect("/governorates");
        }
    });


});
//SHOW GOVERNORATE ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
    //find Governorate with provided id
    console.log("request.params.id: "+request.params.id);
    Governorate.findById(request.params.id, function(error,foundGovernorate){
        if(error){
            console.log(error);
        }
        else{
            //render show template with that governorate
            response.render("governorates/show",{governorate: foundGovernorate});
        }
    });
});

//EDIT GOVERNORATE ROUTE
router.get("/:id/edit",  function(request,response){
    //is user logged in?
    console.log("Update a Governorate");
    Governorate.findById(request.params.id,function(error,foundGovernorate){
        response.render("governorates/edit",{governorate: foundGovernorate});
    });
    
});
//UPDATE GOVERNORATE ROUTE
router.put("/:id", function(request,response){
    //find and update the correct Governorate
    Governorate.findByIdAndUpdate(request.params.id,request.body.governorate,function(error,updatedGovernorate){
        if(error){
            console.log(error);
            response.redirect("/governorates");
        }
        else{
            //redirect somewhere (show page)
            response.redirect("/governorates/"+request.params.id);
        }
    });
});
//DESTROY Governorate ROUTE
router.delete("/:id",  function(request,response){
    if(request.params.id == -1){
        response.redirect("/governorates");
    }

    Governorate.findByIdAndRemove(request.params.id,function(error){
        console.log("Deleting governorate with id: "+request.params.id);
        if(error){
            console.log(error);
        }
        response.redirect("/governorates");
    });
});

module.exports = router;