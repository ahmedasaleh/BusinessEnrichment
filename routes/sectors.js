var express     = require("express");
var router      = express.Router({mergeParams: true});
var Sector  = require("../models/sector");
var middleware  = require("../middleware");
var seedDB      = require("../seeds");
var aSector = new Sector() ;

//Mongoose PAGINATION
router.get("/pagination",middleware.isLoggedIn ,function(request, response) {
    Sector.paginate({}, { select: 'name', lean: true,limit: 500 }, function(err, result) {
        response.setHeader('Content-Type', 'application/json');
        response.send(JSON.stringify(result));
    });
});
//INDEX - show all Sectors
router.get("/", middleware.isLoggedIn ,function(request, response) {
    Sector.find({}, function(error, foundSectors) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("sectors/index", { sectors: foundSectors });
        }
    });
});

//NEW - show form to create new Sector
//should show the form will post data to /sectors
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    if(process.env.SEED == "true"){
       // console.log("process.env.SEED: "+process.env.SEED);
        seedDB(request.user);
    }
    response.render("sectors/new");
});

//CREATE - add new sector to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
    //get data from a form and add to sector array
    var name = request.body.sector.name;
    var description = request.body.sector.description;

    aSector = {
            name: name,
            shortName: description,
            author: {id: request.user._id, email: request.user.email}
    };

   // console.log(aSector);
    Sector.create(aSector, function(error, createdSector) {
        if (error) {
            console.log(error);
            request.flash("error","Something went wrong");
        }
        else {
        //    console.log("new Sector created and saved");
          //  console.log(createdSector);
            request.flash("success","Successfully added Sector");
            response.redirect("/sectors");
        }
    });
});

//SHOW SECTOR ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
    //find SECTOR with provided id
    //console.log("request.params.id: "+request.params.id);
    Sector.findById(request.params.id, function(error,foundSector){
        if(error){
            console.log(error);
        }
        else{
            //render show template with that SECTOR
            response.render("sectors/show",{sector: foundSector});
        }
    });
});

//EDIT SECTOR ROUTE
router.get("/:id/edit",  function(request,response){
    //is user logged in?
   // console.log("Update a SECTOR");
    Sector.findById(request.params.id,function(error,foundSector){
        response.render("sectors/edit",{sector: foundSector});
    });
    
});
//UPDATE SECTOR ROUTE
router.put("/:id", function(request,response){
    //find and update the correct SECTOR
    Sector.findByIdAndUpdate(request.params.id,request.body.sector,function(error,updatedSectors){
        if(error){
            console.log(error);
            response.redirect("/sectors");
        }
        else{
            //redirect somewhere (show page)
            response.redirect("/sectors/"+request.params.id);
        }
    });
});

//DESTROY SECTOR ROUTE
router.delete("/:id",  function(request,response){
    if(request.params.id == -1){
        response.redirect("/sectors");
    }

    Sector.findByIdAndRemove(request.params.id,function(error){
       // console.log("Deleting SECTOR with id: "+request.params.id);
        if(error){
            console.log(error);
        }
        response.redirect("/sectors");
    });
});


module.exports = router;