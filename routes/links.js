var express     = require("express");
var router      = express.Router({mergeParams: true});
var Link  = require("../models/link");
var middleware  = require("../middleware");
var exec = require('child_process').exec;
var aLink = new Link() ;
var seedDB      = require("../seeds");

//INDEX - show all pops
router.get("/", middleware.isLoggedIn ,function(request, response) {
    Link.find({}, function(error, foundLinks) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("links/index", { links: foundLinks });
        }
    });
});

//NEW - show form to create new Link
//should show the form will post data to /links
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    if(process.env.SEED == "true"){
        console.log("process.env.SEED: "+process.env.SEED);
        seedDB(request.user);
    }
    response.render("links/new");
});

//CREATE - add new link to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
    //get data from a form and add to link array
    var device1 = request.body.link.device1;
    var interface1 = request.body.link.interface1;
    var device2 = request.body.link.device2;
    var interface2 = request.body.link.interface2;

    aLink = {
            device1: device1,
            interface1: interface1,
            device2: device2,
            interface2: interface2,
            author: {id: request.user._id, email: request.user.email}
    };

    console.log(aLink);
    Link.create(aLink, function(error, createdLink) {
        if (error) {
            console.log(error);
            request.flash("error","Something went wrong");
        }
        else {
            console.log("new link created and saved");
            console.log(createdLink);
            request.flash("success","Successfully added link");
            response.redirect("/links");
        }
    });


});
//SHOW LINK ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
    //find Link with provided id
    console.log("request.params.id: "+request.params.id);
    Link.findById(request.params.id, function(error,foundLink){
        if(error){
            console.log(error);
        }
        else{
            //render show template with that Link
            response.render("links/show",{link: foundLink});
        }
    });
});

//EDIT LINK ROUTE
router.get("/:id/edit",  function(request,response){
    //is user logged in?
    console.log("Update a Link");
    Link.findById(request.params.id,function(error,foundLink){
        response.render("links/edit",{link: foundLink});
    });
    
});
//UPDATE LINK ROUTE
router.put("/:id", function(request,response){
    //find and update the correct Link
    Link.findByIdAndUpdate(request.params.id,request.body.link,function(error,updatedLink){
        if(error){
            console.log(error);
            response.redirect("/links");
        }
        else{
            //redirect somewhere (show page)
            response.redirect("/links/"+request.params.id);
        }
    });
});

//DESTROY LINK ROUTE
router.delete("/:id",  function(request,response){
    if(request.params.id == -1){
        response.redirect("/links");
    }

    Link.findByIdAndRemove(request.params.id,function(error){
        console.log("Deleting link with id: "+request.params.id);
        if(error){
            console.log(error);
        }
        response.redirect("/links");
    });
});


module.exports = router;