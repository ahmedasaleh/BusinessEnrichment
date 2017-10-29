var express     = require("express");
var router      = express.Router({mergeParams: true});
var Device  = require("../models/device");
var Link  = require("../models/link");
var Interface  = require("../models/interface");
var middleware  = require("../middleware");
var async           = require('async');
var S               = require('string');
var responseHandler = require('express-response-handler');
var logger          = require("../middleware/logger");

//Mongoose PAGINATION

// var responseHandler = function(response) {
//   var data = '';

//   // keep track of the data you receive
//   response.on('data', function(chunk) {
//     data += chunk + "\n";
//   });

//   // finished? ok, send the data to the client in JSON format
//   response.on('end', function() {
//         res.header("Content-Type:","application/json");
//         res.end(data);
//   });
// };
router.get("/pagination?",middleware.isLoggedIn ,function(request, response) {
        // limit is the number of rows per page
        var limit = parseInt(request.query.limit);
        // offset is the page number
        var skip  = parseInt(request.query.offset);
        // search string
        var searchQuery = request.query.search ;//: 'xe-'

        if(S(searchQuery).isEmpty()){
            Interface.count({}, function(err, interfacesCount) {
                //ifName ifAlias ifIndex ifDescr ifType ifSpeed ifHighSpeed counters type specialService secondPOP secondHost secondInterface label provisoFlag noEnrichFlag sp_service sp_provider sp_termination sp_bundleId sp_linkNumber sp_CID sp_TECID sp_subCable sp_customer sp_sourceCore sp_destCore sp_vendor sp_speed sp_pop sp_fwType sp_serviceType sp_ipType sp_siteCode sp_connType sp_emsOrder sp_connectedBW sp_dpiName sp_portID unknownFlag adminStatus operStatus actualspeed createdAt lastUpdate hostname ipaddress pop 
                // Interface.find({},'ifIndex ifName hostname ipaddress ifAlias ifDescr ifSpeed actualspeed ifType counters createdAt lastUpdate',{lean:true,skip:skip,limit:limit}, function(err, foundInterfaces) {
                Interface.find({},'ifName ifAlias ifIndex ifDescr ifType ifSpeed ifHighSpeed counters type specialService secondPOP secondHost secondInterface label provisoFlag noEnrichFlag sp_service sp_provider sp_termination sp_bundleId sp_linkNumber sp_CID sp_TECID sp_subCable sp_customer sp_sourceCore sp_destCore sp_vendor sp_speed sp_pop sp_fwType sp_serviceType sp_ipType sp_siteCode sp_connType sp_emsOrder sp_connectedBW sp_dpiName sp_portID unknownFlag adminStatus operStatus actualspeed createdAt lastUpdate hostname ipaddress pop',{lean:true,skip:skip,limit:limit}, function(err, foundInterfaces) {
                    if (err) {
                        logger.error(err);
                    }
                    else {
                        var data = "{\"total\":"+ interfacesCount+",\"rows\":" + JSON.stringify(foundInterfaces)+"}";
                        response.setHeader('Content-Type', 'application/json');
                        // response.send((foundInterfaces)); 
                        response.send(data);        
                    }

                });

            });

        } 
        else {
            searchQuery = ".*"+S(searchQuery).s.toLowerCase()+".*";
            Interface.count({'$or' : [{ifName: new RegExp(searchQuery,'i')},
                {ifAlias: new RegExp(searchQuery,'i')},
                {ifDescr: new RegExp(searchQuery,'i')},
                {ipaddress: new RegExp(searchQuery,'i')},
                {hostname: new RegExp(searchQuery,'i')}]}, function(err, m_interfacesCount) {
                console.log("total interfacse match the query: "+m_interfacesCount);
                console.log(searchQuery);
                Interface.find({'$or' : [{ifName: new RegExp(searchQuery,'i')},
                {ifAlias: new RegExp(searchQuery,'i')},
                {ifDescr: new RegExp(searchQuery,'i')},
                {ipaddress: new RegExp(searchQuery,'i')},
                {hostname: new RegExp(searchQuery,'i')}]},'ifName ifAlias ifIndex ifDescr ifType ifSpeed ifHighSpeed counters type specialService secondPOP secondHost secondInterface label provisoFlag noEnrichFlag sp_service sp_provider sp_termination sp_bundleId sp_linkNumber sp_CID sp_TECID sp_subCable sp_customer sp_sourceCore sp_destCore sp_vendor sp_speed sp_pop sp_fwType sp_serviceType sp_ipType sp_siteCode sp_connType sp_emsOrder sp_connectedBW sp_dpiName sp_portID unknownFlag adminStatus operStatus actualspeed createdAt lastUpdate hostname ipaddress pop',{lean:true,skip:skip,limit:limit}, function(err, foundInterfaces) {
                    if (err) {
                        logger.error(err);
                    }
                    else {
                        var data = "{\"total\":"+ m_interfacesCount+",\"rows\":" + JSON.stringify(foundInterfaces)+"}";
                        response.setHeader('Content-Type', 'application/json');
                        // response.send((foundInterfaces)); 
                        response.send(data);        
                    }

                });
            });

        }
});


//INDEX - show all interfaces
router.get("/", middleware.isLoggedIn ,function(request, response) {
    // Interface.find({},null,{limit:size}, function(err, foundInterfaces) {
    //     if (err) {
    //         logger.error(err);
    //     }
    //     else {
    //         response.render("interfaces/index", { interfaces: foundInterfaces });
    //         // response.send("VIEW Interfaces");
    //     }
    // });
    response.render("interfaces/index");
});

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
            logger.error.log(error);
            request.flash("error","something went wrong while updating the interface");
        }
        else{
            var device = foundInterface.hostname;
            // console.log(device);

            Interface.findByIdAndRemove(request.params.id,function(error){
                // logger.info("deleted interface from Interfaces table");
                if(error){
                    logger.error(error);
                }
            });

            Device.findOne({hostname: device},function(error,foundDevice){
                if(error){
                    request.flash("error","Can't find containing device");
                    logger.error("Can't find containing device");
                }
                else{
                    for(var i=0; i<foundDevice.interfaces.length;i++){
                        if(foundDevice.interfaces[i].index ==  foundInterface.index){
                            //remove interface from the device
                            foundDevice.interfaces.splice(i,1);
                            // console.log(foundDevice.interfaces);
                            Device.update({_id: foundDevice._id},foundDevice,function(error,device){
                                 if(error) logger.error(error);
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
            foundInterface.actualspeed = request.body.interface.actualspeed;
            if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "international"){
                if(request.body.interface.sp_provider) foundInterface.sp_provider = request.body.interface.sp_provider ;
                if(request.body.interface.sp_service) foundInterface.sp_service = request.body.interface.sp_service ;
                if(request.body.interface.sp_linkNumber) foundInterface.sp_linkNumber = request.body.interface.sp_linkNumber;
                if(request.body.interface.sp_subCable) foundInterface.sp_subCable = request.body.interface.sp_subCable ;
                if(request.body.interface.sp_TECID) foundInterface.sp_TECID = request.body.interface.sp_TECID ;
                if(request.body.interface.sp_termination) foundInterface.sp_termination = request.body.interface.sp_termination ;
                if(request.body.interface.sp_connType) foundInterface.sp_connType = request.body.interface.sp_connType; 
                if(request.body.interface.sp_bundleId) foundInterface.sp_bundleId = request.body.interface.sp_bundleId; 
                if(request.body.interface.sp_CID) foundInterface.sp_CID = request.body.interface.sp_CID; 
                if(request.body.interface.sp_speed) foundInterface.sp_speed =  request.body.interface.sp_speed;
            }
            else if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "alpha-bitstream"){
                if(request.body.interface.sp_customer) foundInterface.sp_customer = request.body.interface.sp_customer; 
                if(request.body.interface.sp_linkNumber) foundInterface.sp_linkNumber = request.body.interface.sp_linkNumber; 
                if(request.body.interface.sp_speed) foundInterface.sp_speed = request.body.interface.sp_speed;
            }
            else if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "sh-bitstream"){
                if(request.body.interface.sp_customer) foundInterface.sp_customer = request.body.interface.sp_customer; 
                if(request.body.interface.sp_linkNumber) foundInterface.sp_linkNumber = request.body.interface.sp_linkNumber; 
                if(request.body.interface.sp_speed) foundInterface.sp_speed = request.body.interface.sp_speed;
            }
            else if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "bitstream"){
                if(request.body.interface.sp_customer) foundInterface.sp_customer = request.body.interface.sp_customer; 
                if(request.body.interface.sp_linkNumber) foundInterface.sp_linkNumber = request.body.interface.sp_linkNumber; 
                if(request.body.interface.sp_speed) foundInterface.sp_speed = request.body.interface.sp_speed;
            }
            else if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "esp"){
                if(request.body.interface.sp_customer) foundInterface.sp_customer = request.body.interface.sp_customer; 
                if(request.body.interface.sp_pop) foundInterface.sp_pop = request.body.interface.sp_pop; 
                if(request.body.interface.sp_connType) foundInterface.sp_connType = request.body.interface.sp_connType; 
                if(request.body.interface.sp_emsOrder) foundInterface.sp_emsOrder = request.body.interface.sp_emsOrder; 
                if(request.body.interface.sp_connectedBW) foundInterface.sp_connectedBW = request.body.interface.sp_connectedBW; 
            }
            else if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "firewall"){
                if(request.body.interface.sp_fwType) foundInterface.sp_fwType = request.body.interface.sp_fwType; 
                if(request.body.interface.sp_pop) foundInterface.sp_pop = request.body.interface.sp_pop; 
                if(request.body.interface.sp_serviceType) foundInterface.sp_serviceType = request.body.interface.sp_serviceType; 
                if(request.body.interface.sp_ipType) foundInterface.sp_ipType = request.body.interface.sp_ipType; 
                if(request.body.interface.sp_vendor) foundInterface.sp_vendor = request.body.interface.sp_vendor; 
            }
            else if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "national-roaming"){
                if(request.body.interface.sp_provider) foundInterface.sp_provider = request.body.interface.sp_provider ;
                if(request.body.interface.sp_service) foundInterface.sp_service = request.body.interface.sp_service ;
                if(request.body.interface.sp_linkNumber) foundInterface.sp_linkNumber = request.body.interface.sp_linkNumber;
                if(request.body.interface.sp_speed) foundInterface.sp_speed = request.body.interface.sp_speed;
                if(request.body.interface.sp_sourceCore) foundInterface.sp_sourceCore =  request.body.interface.sp_sourceCore;
                if(request.body.interface.sp_destCore) foundInterface.sp_destCore =  request.body.interface.sp_destCore;
                if(request.body.interface.sp_vendor) foundInterface.sp_vendor =  request.body.interface.sp_vendor;
            }
            else if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "lte"){
                if(request.body.interface.sp_pop) foundInterface.sp_pop = request.body.interface.sp_pop ;
                if(request.body.interface.sp_siteCode) foundInterface.sp_siteCode = request.body.interface.sp_siteCode ;
                if(request.body.interface.sp_vendor) foundInterface.sp_vendor = request.body.interface.sp_vendor;
                if(request.body.interface.sp_speed) foundInterface.sp_speed =  request.body.interface.sp_speed;
                if(request.body.interface.sp_linkNumber) foundInterface.sp_linkNumber =  request.body.interface.sp_linkNumber;
            }
            else if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "epc"){
                if(request.body.interface.sp_provider) foundInterface.sp_provider = request.body.interface.sp_provider ;
                if(request.body.interface.sp_linkNumber) foundInterface.sp_linkNumber = request.body.interface.sp_linkNumber;
                if(request.body.interface.sp_speed) foundInterface.sp_speed =  request.body.interface.sp_speed;
            }
            else if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "dpi"){
                if(request.body.interface.sp_pop) foundInterface.sp_pop = request.body.interface.sp_pop ;
                if(request.body.interface.sp_preNumber) foundInterface.sp_preNumber = request.body.interface.sp_preNumber ;
                if(request.body.interface.sp_portID) foundInterface.sp_portID = request.body.interface.sp_portID ;
            }
            else if(foundInterface.linkType && foundInterface.linkType.toLowerCase() == "link-interface"){
                if(request.body.interface.secondHost) foundInterface.secondHost = request.body.interface.secondHost ;
                if(request.body.interface.secondInterface) foundInterface.secondInterface = request.body.interface.secondInterface ;
                if(request.body.interface.secondPOP) foundInterface.secondPOP = request.body.interface.secondPOP ;
                if(request.body.interface.type) foundInterface.type = request.body.interface.type ;
                if(request.body.interface.pop) foundInterface.pop = request.body.interface.pop ;
            }

            foundInterface.updated = new Date();
            // foundInterface.lastUpdatedBy = {id: request.user._id, email: request.user.email};

            foundInterface.save(function(error,intf){
                if(error) console.log(error);
            });
            Device.findOne({hostname: foundInterface.hostname},function(error,foundDevice){
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