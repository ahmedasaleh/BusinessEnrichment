var Device      = require("../models/device"),
    Interface   = require("../models/interface");
var indexRoutes     = require("../routes/index"); 

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

middlewareObj.checkInterfaceOwnership = function(request, response, next) {
 if(request.isAuthenticated()){
        Interface.findById(request.params.id, function(err, foundInterface){
           if(err){
               request.flash("error", "Interface not found");
               response.redirect("back");
           }  else {
               // does user own the device?
               console.log(foundInterface);
               Device.findById(foundInterface.device.id,function(error,foundDevice){
                   if(error){
                       request.flash("error", "The device that's containing the interface was not found!!!");
                       response.redirect("back");
                   }
                   else if(foundDevice.author.id.equals(request.user._id)) {
                        next();
                    } else {
                        request.flash("error", "You don't have permission to do that");
                        response.redirect("back");
                    }
                   
               });
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

middlewareObj.isAPIAuthenticated = function(request, response, next){
    // return next();//hack
    console.log("middlewareObj.isAPIAuthenticated "+indexRoutes.isAPIAuthenticated());
    if(indexRoutes.isAPIAuthenticated() == true){
      console.log("user is isAuthenticated");
        return next();
    }
    // request.flash("error", "You need to be logged in to do that");
    // response.redirect("/login");
}

module.exports = middlewareObj;