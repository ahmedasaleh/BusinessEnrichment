var express     = require("express");
var router      = express.Router({mergeParams: true});
var POP  = require("../models/user");
var middleware  = require("../middleware");

//INDEX - show all pops
router.get("/", middleware.isLoggedIn ,function(request, response) {
    POP.find({}, function(error, foundUsers) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("users/index", { users: foundUsers });
        }
    });
});

module.exports = router;