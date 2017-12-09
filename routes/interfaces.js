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
var interfaceDeviceID;

//Mongoose PAGINATION

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
                Interface.find({},'ifName ifAlias ifIndex ifDescr ifType ifSpeed ifHighSpeed counters type specialService secondPOP secondHost secondInterface label provisoFlag noEnrichFlag sp_service sp_provider sp_termination sp_bundleId sp_linkNumber sp_CID sp_TECID sp_subCable sp_customer sp_sourceCore sp_destCore sp_vendor sp_speed sp_pop sp_fwType sp_serviceType sp_ipType sp_siteCode sp_connType sp_emsOrder sp_connectedBW sp_dpiName sp_portID unknownFlag adminStatus operStatus actualspeed createdAt lastUpdate hostname ipaddress pop lastSyncTime',{lean:true,skip:skip,limit:limit}, function(err, foundInterfaces) {
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
                Interface.find({'$or' : [{ifName: new RegExp(searchQuery,'i')},
                {ifAlias: new RegExp(searchQuery,'i')},
                {ifDescr: new RegExp(searchQuery,'i')},
                {ipaddress: new RegExp(searchQuery,'i')},
                {hostname: new RegExp(searchQuery,'i')}]},'ifName ifAlias ifIndex ifDescr ifType ifSpeed ifHighSpeed counters type specialService secondPOP secondHost secondInterface label provisoFlag noEnrichFlag sp_service sp_provider sp_termination sp_bundleId sp_linkNumber sp_CID sp_TECID sp_subCable sp_customer sp_sourceCore sp_destCore sp_vendor sp_speed sp_pop sp_fwType sp_serviceType sp_ipType sp_siteCode sp_connType sp_emsOrder sp_connectedBW sp_dpiName sp_portID unknownFlag adminStatus operStatus actualspeed createdAt lastUpdate hostname ipaddress pop lastSyncTime',{lean:true,skip:skip,limit:limit}, function(err, foundInterfaces) {
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
            logger.error("add new interface error: "+error);
            response.redirect("/devices");
        }
        else{
            response.render("interfaces/new",{device:foundDevice});
        }
    });
});

//CREATE ROUTE for new interface
router.post("/",middleware.isLoggedIn,function(request,response){
    //lookup device using ID
    Device.findById(request.params.id,function(error,foundDevice){
        if(error){
            logger.error(error);
            request.flash("error","Something went wrong");
            response.redirect("/devices");
        }
        else{
            //create new interface
            var anInterface = request.body.interface;

            Interface.create(anInterface,function(error,createdInterface){
                if(error){
                    logger.error(error);
                }
                else{
                    //add user and id to interface
                    createdInterface.author.email = request.user.email;
                    createdInterface.author.id = request.user._id;
                    //save interface
                    createdInterface.save();
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
            logger.error(error);
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
            logger.error(error);
            request.flash("error","something went wrong while deleting the interface");
        }
        else{
            var device = foundInterface.hostname;

            Interface.findByIdAndRemove(request.params.id,function(error){
                // logger.info("deleted interface from Interfaces table");
                if(error){
                    logger.error(error);
                }
            });

                    // var subdoc = foundDevice.interfaces.id(request.params.id);
                    Device.findOneAndUpdate(
                        { "hostname": device },
                        { "$pull": {"interfaces": { _id:request.params.id}} },
                        { safe: true },
                        function(err,doc) {
                            if(error) logger.error(err);
                        }
                    );                    

        }
        response.redirect("back");
    });
});

//EDIT INTERFACE ROUTE
router.get("/:id/edit", middleware.isLoggedIn, function(request,response){
    //is user logged in?
    var secondhost;
    var secondPOP;
    // response.redirect("/devices/");
    Interface.findById(request.params.id,function(error,foundInterface){
        if(error){
            request.flash("error","error found while searching for interface!!!");
            response.redirect("back");
        }
        else if(foundInterface){
            response.render("interfaces/edit",{interface: foundInterface, device: foundInterface.hostname });
        }
        else{
            request.flash("error","can't find interface!!!");
            response.redirect("back");
        }
    });
});

var copyObject = function(toObject,fromObject,override){
        if(fromObject.pollInterval && override == true) toObject.pollInterval = fromObject.pollInterval;
        if(fromObject.type && override == true) toObject.type  = fromObject.type ;
        if(fromObject.specialService) toObject.specialService = fromObject.specialService;
        if(fromObject.secondPOP && override == true) toObject.secondPOP = fromObject.secondPOP;
        if(fromObject.secondHost && override == true) toObject.secondHost = fromObject.secondHost;
        if(fromObject.secondInterface && override == true) toObject.secondInterface = fromObject.secondInterface;
        if(fromObject.sp_service && override == true) toObject.sp_service = fromObject.sp_service;
        if(fromObject.sp_provider && override == true) toObject.sp_provider = fromObject.sp_provider;
        if(fromObject.sp_termination && override == true) toObject.sp_termination = fromObject.sp_termination;
        if(fromObject.sp_bundleId && override == true) toObject.sp_bundleId = fromObject.sp_bundleId;
        if(fromObject.sp_linkNumber && override == true) toObject.sp_linkNumber = fromObject.sp_linkNumber;
        if(fromObject.sp_CID && override == true) toObject.sp_CID = fromObject.sp_CID;
        if(fromObject.sp_TECID && override == true) toObject.sp_TECID = fromObject.sp_TECID;
        if(fromObject.sp_subCable && override == true) toObject.sp_subCable = fromObject.sp_subCable;
        if(fromObject.sp_customer && override == true) toObject.sp_customer = fromObject.sp_customer;
        if(fromObject.sp_sourceCore && override == true) toObject.sp_sourceCore = fromObject.sp_sourceCore;
        if(fromObject.sp_destCore && override == true) toObject.sp_destCore = fromObject.sp_destCore;
        if(fromObject.sp_vendor && override == true) toObject.sp_vendor = fromObject.sp_vendor;
        if(fromObject.sp_speed && override == true) toObject.sp_speed = fromObject.sp_speed;
        if(fromObject.sp_pop && override == true) toObject.sp_pop = fromObject.sp_pop;
        if(fromObject.sp_fwType && override == true) toObject.sp_fwType = fromObject.sp_fwType;
        if(fromObject.sp_serviceType && override == true) toObject.sp_serviceType = fromObject.sp_serviceType;
        if(fromObject.sp_ipType && override == true) toObject.sp_ipType = fromObject.sp_ipType;
        if(fromObject.sp_siteCode) toObject.sp_siteCode = fromObject.sp_siteCode;
        if(fromObject.sp_connType && override == true) toObject.sp_connType = fromObject.sp_connType;
        if(fromObject.sp_emsOrder && override == true) toObject.sp_emsOrder = fromObject.sp_emsOrder;
        if(fromObject.sp_connectedBW && override == true) toObject.sp_connectedBW = fromObject.sp_connectedBW;
        if(fromObject.sp_preNumber && override == true) toObject.sp_preNumber = fromObject.sp_preNumber;
        if(fromObject.sp_dpiName && override == true) toObject.sp_dpiName = fromObject.sp_dpiName;
        if(fromObject.sp_portID && override == true) toObject.sp_portID = fromObject.sp_portID;
        if(fromObject.actualspeed && override == true) toObject.actualspeed = fromObject.actualspeed;
        if(fromObject.provisoFlag && override == true) toObject.provisoFlag = fromObject.provisoFlag;
        if(fromObject.pop && override == true) toObject.pop = fromObject.pop;
        if(fromObject.isUpLink && override == true) toObject.isUpLink = fromObject.isUpLink;
        if(toObject.type == "NONE") toObject.type = null;
    };

var setDeviceID = function(anID){
    interfaceDeviceID = anID;
};
var getDeviceID = function(anID){
    return interfaceDeviceID ;
};
var constructInterfaceID = function(deviceIP,ifIndex){
        //Mongodb uses Object id of 24 char length in hex format
        //will let ipaddress and ifIndex share this length
        // 10.0.0.1    to 10.255.255.254   
        // 172.16.0.1  to 172.31.255.254  
        // 192.168.0.1 to 192.168.255.254  
        var ipaddress = deviceIP.replace('.','');//replace first dot
        ipaddress = S(ipaddress).replaceAll('.', 'a').padLeft(12, 'b').s;
        var ifindex ;
        if(ipaddress.length <= 12){
            ifindex = S(ifIndex).padLeft(12, 'c').s;
        }
        else{
            ifindex = S(ifIndex).padLeft((24 - ipaddress.length), 'c').s;
        }
        var str_id = ipaddress+ifindex;
        return str_id;
};


//UPDATE INTERFACE ROUTE
router.put("/:id", middleware.isLoggedIn,function(request,response){
    //find and update the correct INTERFACE
    request.body.interface.updated = new Date();
    request.body.interface.lastUpdatedBy = {id: request.user._id, email: request.user.email};

    Interface.findById(request.params.id,function(error,foundInterface){
        console.log("will update interface id: "+request.params.id+" , ipaddress nad ifIndex: "+foundInterface.ipaddress+" / "+foundInterface.ifIndex);
        if(error){
            logger.error(error);
            request.flash("error","something went wrong while updating the interface");
            response.redirect("/devices/");
        }
        else{
            copyObject(foundInterface,request.body.interface,true);
            foundInterface.lastUpdate = new Date();
            //save view
            console.log("interface id after copy: "+foundInterface._id+" , ipaddress nad ifIndex: "+foundInterface.ipaddress+" / "+foundInterface.ifIndex);
            foundInterface._id = constructInterfaceID(foundInterface.ipaddress,foundInterface.ifIndex);
            console.log("interface constructed id: "+foundInterface._id+" , ipaddress nad ifIndex: "+foundInterface.ipaddress+" / "+foundInterface.ifIndex);
            foundInterface.save();
            // foundInterface.save(function(error,intf){
            //     if(error) logger.error(error);
            // });
            

            Device.findOne({hostname: foundInterface.hostname},function(error,foundDevice){

                if(error){
                    request.flash("error","Can't find containing device");
                    logger.error("Can't find containing device");
                    response.redirect("/devices/");
                }
                else{
                    var subdoc = foundDevice.interfaces.id(request.params.id);
                    setDeviceID(foundDevice._id);
                    console.log("deviceID:\n");
                    console.log(interfaceDeviceID);
                    console.log(getDeviceID());
                    copyObject(subdoc,request.body.interface,true);
                    subdoc.lastUpdate = new Date();
                    Device.findOneAndUpdate(
                        { "hostname": foundInterface.hostname, "interfaces._id": request.params.id },
                        { 
                            "$set": {
                                "interfaces.$": subdoc
                            }
                        },
                        function(err,doc) {

                        }
                    );                    
                    console.log("finished updating interface, will redirect to its device with id: "+getDeviceID());
                    if(!interfaceDeviceID) response.redirect("/devices/");
                    else response.redirect("/devices/"+interfaceDeviceID);
                }
            });
        }
    });
});
module.exports = router;