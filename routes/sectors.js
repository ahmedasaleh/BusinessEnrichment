var express     = require("express");
var router      = express.Router({mergeParams: true});
var POP  = require("../models/sector");
var middleware  = require("../middleware");

//INDEX - show all pops
router.get("/", middleware.isLoggedIn ,function(request, response) {
    POP.find({}, function(error, foundSectors) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("sectors/index", { sectors: foundSectors });
        }
    });
});

module.exports = router;