var Device  = require("../models/device");

//all the middleware goes here
var middlewareObj = {};
middlewareObj.checkDeviceOwnership = function(request, response, next) {
 if(request.isAuthenticated()){
        Device.findById(request.params.id, function(err, foundDevice){
           if(err){
               request.flash("error", "Device not found");
               response.redirect("back");
           }  else {
               // does user own the device?
            if(foundDevice.author.id.equals(request.user._id)) {
                next();
            } else {
                request.flash("error", "You don't have permission to do that");
                response.redirect("back");
            }
           }
        });
    } else {
        request.flash("error", "You need to be logged in to do that");
        response.redirect("back");
    }
}

middlewareObj.isLoggedIn = function(request, response, next){
    // return next();//hack
    if(request.isAuthenticated()){
        return next();
    }
    request.flash("error", "You need to be logged in to do that");
    response.redirect("/login");
}

module.exports = middlewareObj;