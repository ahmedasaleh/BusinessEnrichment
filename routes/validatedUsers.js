var express     = require("express");
var router      = express.Router({mergeParams: true});
// var User  = require("../models/user");
var ValidatedUser  = require("../models/validatedUser");
var middleware  = require("../middleware");
var seedDB      = require("../seeds");
var aValidatedUser = new ValidatedUser() ;

//INDEX - show all Users
router.get("/", middleware.isLoggedIn ,function(request, response) {
    ValidatedUser.find({}, function(error, foundUsers) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("validatedusers/index", { users: foundUsers });
        }
    });
});

//NEW - show form to create new User
//should show the form will post data to /users
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    if(process.env.SEED == "true"){
       // console.log("process.env.SEED: "+process.env.SEED);
        seedDB(request.user);
    }
    response.render("validatedusers/new");
});
//CREATE - add new User to the validation collection
router.post("/",middleware.isLoggedIn, function(request, response) {
    //get data from a form and add to User array
    var email = request.body.user.email;
    var role = request.body.user.role;
    var name = request.body.user.name;
// ValidatedUser
    aValidatedUser = {
            name: name,
            email: email,
            role: role,
            author: {id: request.user._id, email: request.user.email}
    };

   // console.log(aValidatedUser);
    ValidatedUser.create(aValidatedUser, function(error, createdUser) {
        if (error) {
            console.log(error);
            request.flash("error","Something went wrong");
        }
        else {
         //   console.log("new User created in the validation collection and saved");
           // console.log(createdUser);
            request.flash("success","Successfully added User to list of validated users");
            response.redirect("/validatedusers");
        }
    });
});

//SHOW Validated User ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
    //find Validated User with provided id
   // console.log("request.params.id: "+request.params.id);
    ValidatedUser.findById(request.params.id, function(error,foundUser){
        if(error){
            console.log(error);
        }
        else{
            //render show template with that Validated User
            response.render("validatedusers/show",{user: foundUser});
        }
    });
});

//EDIT VALIDATED USER ROUTE
router.get("/:id/edit",  function(request,response){
    //is user logged in?
   // console.log("Update a VALIDATED USER");
    ValidatedUser.findById(request.params.id,function(error,foundUser){
        response.render("validatedusers/edit",{user: foundUser});
    });
    
});
//UPDATE VALIDATED USER ROUTE
router.put("/:id", function(request,response){
    //find and update the correct VALIDATED USER
    ValidatedUser.findByIdAndUpdate(request.params.id,request.body.user,function(error,foundUser){
        if(error){
            console.log(error);
            response.redirect("/validatedusers");
        }
        else{
            //redirect somewhere (show page)
            response.redirect("/validatedusers/"+request.params.id);
        }
    });
});

//DESTROY VALIDATED USER ROUTE
router.delete("/:id",  function(request,response){
    if(request.params.id == -1){
        response.redirect("/validatedusers");
    }

    ValidatedUser.findByIdAndRemove(request.params.id,function(error){
       // console.log("Deleting Validated User with id: "+request.params.id);
        if(error){
            console.log(error);
        }
        response.redirect("/validatedusers");
    });
});

module.exports = router;