var express     = require("express");
var router      = express.Router({mergeParams: true});
var User  = require("../models/user");
var middleware  = require("../middleware");

//INDEX - show all Users
router.get("/", middleware.isLoggedIn ,function(request, response) {
    User.find({}, function(error, foundUsers) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("users/index", { users: foundUsers });
        }
    });
});

//DESTROY USER ROUTE
router.delete("/:id",  function(request,response){
    if(request.params.id == -1){
        response.redirect("/users");
    }
    User.findByIdAndRemove(request.params.id,function(error){
        console.log("Deleting User with id: "+request.params.id);
        if(error){
            console.log(error);
        }
        response.redirect("/users");
    });
});

module.exports = router;