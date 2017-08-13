var express     = require("express");
var router      = express.Router({mergeParams: true});
var Device  = require("../models/device");
var Interface  = require("../models/interface");
var middleware  = require("../middleware");

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
router.delete("/:id", middleware.checkInterfaceOwnership,  function(request,response){
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
module.exports = router;