var express     = require("express");
var router      = express.Router({mergeParams: true});
var Device  = require("../models/device");
var Link  = require("../models/link");
var Interface  = require("../models/interface");
var middleware  = require("../middleware");
var async           = require('async');
var S               = require('string');


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
    Interface.findById(request.params.id,function(error,foundInterface){
        if(error){
            console.log(error);
            request.flash("error","something went wrong while updating the interface");
        }
        else{
            var device = foundInterface.device.hostname;
            console.log(device);

            Interface.findByIdAndRemove(request.params.id,function(error){
                if(error){
                    console.log(error);
                }
            });

            Device.findOne({hostname: foundInterface.device.hostname},function(error,foundDevice){
                if(error){
                    request.flash("error","Can't find containing device");
                    console.log("Can't find containing device");
                }
                else{
                    for(var i=0; i<foundDevice.interfaces.length;i++){
                        if(foundDevice.interfaces[i].index ==  foundInterface.index){
                            //remove interface from the device
                            foundDevice.interfaces.splice(i,1);
                            console.log(foundDevice.interfaces);
                            Device.update({_id: foundDevice._id},foundDevice,function(error,device){
                                 if(error) console.log(error);
                            });
                            break;
                        }
                    }
                }
            });
        }
        response.redirect("back");
    });
});

//EDIT INTERFACE ROUTE
router.get("/:id/edit", middleware.isLoggedIn, function(request,response){
    //is user logged in?
    console.log("Update an interface");
    console.log(request.params.id);
    var secondhost;
    var secondPOP;
    // console.log(request);
    // response.redirect("/devices/");
    Interface.findById(request.params.id,function(error,foundInterface){
        if(error){
            console.log(error);
            request.flash("error","error found while searching for interface!!!");
            response.redirect("back");
        }
        else if(foundInterface){
            response.render("interfaces/edit",{interface: foundInterface, device: foundInterface.device });
        }
        else{
            request.flash("error","can't find interface!!!");
            response.redirect("back");
        }
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
            if(request.body.interface.isDeviceUpLink && request.body.interface.isDeviceUpLink.toLowerCase() == "yes"){
                foundInterface.isDeviceUpLink = true;
            } else {
                foundInterface.isDeviceUpLink = false;
            }
            foundInterface.secondHost = request.body.interface.secondHost;
            foundInterface.secondPOP =  request.body.interface.secondPOP;
            foundInterface.connectionType = request.body.interface.connectionType
            if(request.body.interface.isPOPUpLink && request.body.interface.isPOPUpLink.toLowerCase() == "yes"){
                foundInterface.isPOPUpLink = true;
            } else {
                foundInterface.isPOPUpLink = false;                
            }
            foundInterface.linkBandwidth = request.body.interface.linkBandwidth
            foundInterface.linkIP = request.body.interface.linkIP
            foundInterface.linkNumber = request.body.interface.linkNumber
            foundInterface.linkType = request.body.interface.linkType
            if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "international"){
                foundInterface.provider = request.body.interface.provider 
                foundInterface.service = request.body.interface.service 
                foundInterface.linkID = request.body.interface.linkID
                foundInterface.subCable = request.body.interface.subCable 
                foundInterface.teCID = request.body.interface.teCID 
                foundInterface.termination = request.body.interface.termination     
            }

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