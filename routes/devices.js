var express     = require("express");
var router      = express.Router();
var Device      = require("../models/device");
var middleware  = require("../middleware");
var snmp        = require ("net-snmp");
var session     = snmp.createSession (process.env.IP, "public");
var seedDB      = require("../seeds");

//create and save a document, handle error if occured
var aDevice ;
//*********************
//  SNMP HANDLER
//*********************
//SNMP Walk
var oid = "1.3.6.1.2.1"; //SNMP MIB-2
// var oid = "1.3.6.1.2.1.2.2";//ifTable

function doneCb (error) {
    if (error)
        console.error (error.toString ());
}

function feedCb (varbinds) {
    for (var i = 0; i < varbinds.length; i++) {
        if (snmp.isVarbindError (varbinds[i]))
            console.error (snmp.varbindError (varbinds[i]));
        else
            console.log (varbinds[i].oid + "|" + varbinds[i].value);
    }
}

// The maxRepetitions argument is optional, and will be ignored unless using
// SNMP verison 2c
var maxRepetitions = 20;
var theWalkSession; 

//INDEX - show all devices
router.get("/", middleware.isLoggedIn ,function(request, response) {
    Device.find({}, function(err, foundDevices) {
        if (err) {
            console.log(err);
        }
        else {
            response.render("devices/index", { devices: foundDevices });
            // response.send("VIEW DEVICES");
        }
    });
});
//CREATE - add new device to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
    //get data from a form and add to devices array
    var hostname = request.body.device.hostname;
    var ipaddress = request.body.device.ipaddress;
    var communityString = request.body.device.communityString || "public";

    aDevice = {
            hostname: hostname,
            ipaddress: ipaddress,
            author: {id: request.user._id, email: request.user.email},
            communityString: communityString 
    };
    console.log("*******\n"+aDevice+"\n*******");
    console.log("Device discovery started");
    // session     = snmp.createSession (process.env.IP, aDevice.communityString,{ timeout: 10 });
    // theWalkSession = session.walk(oid, maxRepetitions, feedCb, doneCb);
    //response.redirect("/devices");
    Device.create(aDevice, function(err, device) {
        if (err) {
            console.log(err);
            request.flash("error","Something went wrong");
        }
        else {
            console.log("new device created and saved");
            console.log(device);
            //redirect back to devices page
            request.flash("success","Successfully added device");
            response.redirect("/devices"); //will redirect as a GET request
        }
    });

});
//NEW - show form to create new device
//should show the form will post data to /devices
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    if(process.env.SEED == "true"){
        console.log("process.env.SEED: "+process.env.SEED);
        seedDB(request.user);
    }
    response.render("devices/new");
});

router.get("/:id",function(request,response){
    //find device with provided id
    console.log("request.params.id: "+request.params.id);
    Device.findById(request.params.id).populate("interfaces").exec(function(error,foundDevice){
        if(error){
            console.log(error);
        }
        else{
            //render show template with that device
            response.render("devices/show",{device: foundDevice});
        }
    });
});

//EDIT DEVICE ROUTE
router.get("/:id/edit", middleware.checkDeviceOwnership, function(request,response){
    //is user logged in?
    Device.findById(request.params.id,function(error,foundDevice){
        response.render("devices/edit",{device: foundDevice});
    });
    
});
//UPDATE DEVICE ROUTE
router.put("/:id", middleware.checkDeviceOwnership,function(request,response){
    //find and update the correct DEVICE
    console.log("\n\n\n************\nrequest.body.device"+request.body.device);
    Device.findByIdAndUpdate(request.params.id,request.body.device,function(error,updatedDevice){
        if(error){
            console.log(error);
            response.redirect("/devices");
        }
        else{
            //redirect somewhere (show page)
            response.redirect("/devices/"+request.params.id);
        }
    });
});
//DESTROY Device ROUTE
router.delete("/:id", middleware.checkDeviceOwnership, function(request,response){
    console.log("Deleting device with id: "+request.params.id);
    Device.findByIdAndRemove(request.params.id,function(error){
        if(error){
            console.log(error);
        }
        response.redirect("/devices");
    });
});

module.exports = router;