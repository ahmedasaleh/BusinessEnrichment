var express     = require("express");
var router      = express.Router({mergeParams: true});
var DeviceModel  = require("../models/devicemodel");
var middleware  = require("../middleware");
var logger          = require("../middleware/logger");

var aDeviceModel = new DeviceModel() ;

//INDEX - show all pops
router.get("/", middleware.isLoggedIn ,function(request, response) {
    DeviceModel.find({}, function(error, foundDeviceModels) {
        if (error) {
            console.log(error);
        }
        else {
            response.render("devicemodels/index", { devicemodels: foundDeviceModels });
        }
    });
});

//NEW - show form to create new Link
//should show the form will post data to /links
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    response.render("devicemodels/new");
});

//CREATE - add new deviceModel to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
    //get data from a form and add to deviceModel array
    var oid = request.body.deviceModel.oid;
    var type = request.body.deviceModel.type;
    var vendor = request.body.deviceModel.vendor;
    var model = request.body.deviceModel.model;

    aDeviceModel = {
            oid: oid,
            type: type,
            vendor: vendor,
            model: model,
            author: {id: request.user._id, email: request.user.email}
    };

    DeviceModel.create(aDeviceModel, function(error, createdModel) {
        if (error) {
            request.flash("error","Something went wrong");
        }
        else {
            request.flash("success","Successfully added device model");
            response.redirect("/devicemodels");
        }
    });


});
//SHOW MODEL ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
    //find Model with provided id
    DeviceModel.findById(request.params.id, function(error,foundDeviceModel){
        if(error){
            console.log(error);
        }
        else{
            //render show template with that Link
            response.render("devicemodels/show",{deviceModel: foundDeviceModel});
        }
    });
});

//EDIT MODEL ROUTE
router.get("/:id/edit",  function(request,response){
    //is user logged in?
    DeviceModel.findById(request.params.id,function(error,foundDeviceModel){
        response.render("devicemodels/edit",{deviceModel: foundDeviceModel});
    });
    
});
//UPDATE MODEL ROUTE
router.put("/:id", function(request,response){
    //find and update the correct Model
    DeviceModel.findByIdAndUpdate(request.params.id,request.body.deviceModel,function(error,updatedLink){
        if(error){
            console.log(error);
            response.redirect("/devicemodels");
        }
        else{
            //redirect somewhere (show page)
            response.redirect("/devicemodels/"+request.params.id);
        }
    });
});

//DESTROY LINK ROUTE
router.delete("/:id",  function(request,response){
    if(request.params.id == -1){
        response.redirect("/devicemodels");
    }

    DeviceModel.findByIdAndRemove(request.params.id,function(error){
        logger.warn("Deleting model with id: "+request.params.id);
        if(error){
            logger.error(error);
        }
        response.redirect("/devicemodels");
    });
});


module.exports = router;