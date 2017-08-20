var express     = require("express");
var router      = express.Router({mergeParams: true});
var Device  = require("../models/device");
var Interface  = require("../models/interface");
var middleware  = require("../middleware");
var async           = require('async');
//Add Route for NEW interface linked with device
//NEW ROUTE for new interface
router.get("/new",middleware.isLoggedIn,function(request,response){
    Device.findById(request.params.id,function(error,foundDevice){
        if(error){
            console.log("add new interface error: "+error);
            response.redirect("/devices");
        }
        else{
            response.render("interfaces/new",{device:foundDevice});
        }
    });
});

//CREATE ROUTE for new interface
router.post("/",middleware.isLoggedIn,function(request,response){
    // console.log(request);
    //lookup device using ID
    Device.findById(request.params.id,function(error,foundDevice){
        if(error){
            console.log(error);
            request.flash("error","Something went wrong");
            response.redirect("/devices");
        }
        else{
            //create new interface
            var anInterface = request.body.interface;

            Interface.create(anInterface,function(error,createdInterface){
                if(error){
                    console.log(error);
                }
                else{
                    //add user and id to interface
                    createdInterface.author.email = request.user.email;
                    createdInterface.author.id = request.user._id;
                    //save interface
                    createdInterface.save();
                    console.log("interface from user- "+request.user.username+" is: "+createdInterface);
                    //connect new interface to device
                    foundDevice.interfaces.push(createdInterface);
                    foundDevice.save();
                    //redirect device show page
                    request.flash("success","Successfully added Interface");
                    response.redirect("/devices/"+foundDevice._id)
                }
            });
        }
    });
});

router.get("/:id",function(request,response){
    Interface.findById(request.params.id,function(error,foundInterface){
        if(error){
            console.log(error);
        }
        else{
            response.render("interfaces/edit",{interface: foundInterface});
        }
        
    });
});

//DESTROY Interface ROUTE
router.delete("/:id", middleware.isLoggedIn,  function(request,response){
    var containingDevice = request.body.interface.device;
    Interface.findByIdAndRemove(request.params.id,function(error){
        if(error){
            console.log(error);
        }
        else{
            response.redirect("/devices/"+containingDevice.id);
        }
    });
});

//EDIT INTERFACE ROUTE
router.get("/:id/edit", middleware.isLoggedIn, function(request,response){
    //is user logged in?
    console.log("Update an interface");
    console.log(request.params.id);
    // console.log(request);
    // response.redirect("/devices/");
    Interface.findById(request.params.id,function(error,foundInterface){
        response.render("interfaces/edit",{interface: foundInterface, device: foundInterface.device});
    });
    
});
//UPDATE INTERFACE ROUTE
router.put("/:id", middleware.isLoggedIn,function(request,response){
    //find and update the correct DEVICE
    request.body.interface.updated = new Date();
    request.body.interface.lastUpdatedBy = {id: request.user._id, email: request.user.email};

    Interface.findById(request.params.id,function(error,foundInterface){
        if(error){
            console.log(error);
            request.flash("error","something went wrong while updating the interface");
        }
        else{
            foundInterface.name = request.body.interface.name;
            foundInterface.alias = request.body.interface.alias;
            foundInterface.description = request.body.interface.description;
            foundInterface.type = request.body.interface.type;
            foundInterface.actualspeed = request.body.interface.actualspeed;
            foundInterface.hasAdjacent = request.body.interface.hasAdjacent;
            foundInterface.updated = new Date();
            foundInterface.lastUpdatedBy = {id: request.user._id, email: request.user.email};

            foundInterface.save(function(error,intf){
                if(error) console.log(error);
            });
            Device.findOne({hostname: foundInterface.device.hostname},function(error,foundDevice){
                if(error){
                    request.flash("error","Can't find containing device");
                    console.log("Can't find containing device");
                }
                else{
                    for(var i=0; i<foundDevice.interfaces.length;i++){
                        if(foundDevice.interfaces[i].index ==  foundInterface.index){
                            foundDevice.interfaces[i] = foundInterface;
                            console.log(foundDevice.interfaces[i]);
                            Device.update({_id: foundDevice._id},foundDevice,function(error,device){
                                 if(error) console.log(error);
                            });
                            break;
                        }
                    }
                }
            });
        }
        response.redirect("/devices/");
    });
});
module.exports = router;