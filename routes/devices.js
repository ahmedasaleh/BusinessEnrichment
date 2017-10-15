var express         = require("express");
var router          = express.Router();
var Device          = require("../models/device");
var Interface       = require("../models/interface");
var POP             = require("../models/pop");
var Sector          = require("../models/sector");
var Governorate     = require("../models/governorate");
var Link            = require("../models/link");
var DeviceModel     = require("../models/devicemodel");
var middleware      = require("../middleware");
var Promise         = require('bluebird');
var snmp            = Promise.promisifyAll(require ("net-snmp"));
var session         = snmp.createSession (process.env.IP, "public");
var seedDB          = require("../seeds");
var snmpConstants   = require("../lookUps");
var async           = require('async');
var S               = require('string');
var mongoose        = require('mongoose');
var logger          = require("../middleware/logger");
var Parser          = require('../middleware/parser/parser');
var ObjectId = require('mongodb').ObjectID;
//create and save a document, handle error if occured
var aDevice = new Device() ;
var targets = [];

function discoveredDevice(device) {
    var self = this;
    self.name = device.hostname;
    self.device = device; 
    self.interfaces = [];
    self.interestKeys = [];
    self.interestInterfaces = [];
    self.interestInterfacesIndices = [];//this will make iterating on interfaces during sync mode faster
    self.interfaceUpdateList = [];
    self.interfaceRemoveList = [];
    self.ifTableError = false;
    self.ifXTableError = false;
    self.ifTableRead = false;
    self.ifXTableRead = false;
    self.inSyncMode = false;
    self.session = snmp.createSession(self.device.ipaddress, S(self.device.communityString).trim().s,{ timeout: 10000, version: snmp.Version2c ,retries: 1});
    // self.deviceType = S(self.device.type).s.toLowerCase();
    // self.vendor = S(self.device.vendor).s.toLowerCase();
    //parse ifAlias
    // self.parseInternationalInterfaces = function(ifAlias){
    //     var choppedAlias = S(ifAlias).trim().splitLeft('-');
    // }

    self.saveDevice = function(device){
        Device.findByIdAndUpdate(device._id,{interfaces: self.interestInterfaces, discovered: true, updatedAt: new Date()},function(error,updatedDevice){
            if(error){
                logger.error(error);
            }
            else{
                logger.info(self.name+" done");
            }
        });
    };
    self.getInterfaceFromInterestList = function(interfaceIndex){
        var intf = new Interface();
        async.forEachOf(self.interestInterfaces,function(interface,key,callback){
            if(interface.index == interfaceIndex){
                intf = {
                    index: interface.index,
                    speed: interface.speed,
                    name: interface.name,
                    alias: interface.alias,
                    description: interface.description,
                    type: interface.type
                };
            }
        }); 
        return intf;
    };    
    self.removeInterfaceFromInterestList = function(interfaceIndex){
        for(var i=0; i<self.interestInterfaces.length;i++){
            if(self.interestInterfaces[i].index ==  interfaceIndex){
                //remove interface from the list
                self.interestInterfaces.splice(i,1);
                break;
            }
        }
    };    

    self.retrieveIfTable = function( table,callback){
        var indexes = [];
        for (index in table){
            indexes.push (parseInt (index));
        }
        indexes.sort (sortInt);

        // Use the sorted indexes we've calculated to walk through each
        // row in order
        var i = indexes.length
        var columns = [];
        var columnSorted = false;
        async.forEachOf(table,function (value, key, callback){
            anInterface = new Interface();
            anInterface.device = self.device;
            anInterface.author = {id: self.device.author.id, email: self.device.author.email};
            anInterface.index = value[ifTableColumns.ifIndex];
            anInterface.description = value[ifTableColumns.ifDescr];
            anInterface.type = value[ifTableColumns.ifType];
            anInterface.speed = value[ifTableColumns.ifSpeed];
            anInterface.adminStatus = value[ifTableColumns.ifAdminStatus];
            anInterface.operStatus  = value[ifTableColumns.ifOperStatus];
            if( (anInterface.adminStatus == snmpConstants.ifAdminOperStatus.up) && 
                (anInterface.operStatus == snmpConstants.ifAdminOperStatus.up)) {
                self.interfaces[key] = anInterface;
                self.interestKeys.push(key);//push index to be used during ifXTable walk
            } 
        }); 
        self.ifTableError = false;
        self.ifXTableError = false;
        return self.interfaces;
    };
    self.retrieveIfXTable = function( table,callback){
        var indexes = [];
        for (index in table){
            indexes.push (parseInt (index));
        }
        indexes.sort (sortInt);

        // Use the sorted indexes we've calculated to walk through each
        // row in order
        var i = indexes.length
        var columns = [];
        var columnSorted = false;
        
        async.forEachOf(table,function (value, key, callback){
            if(self.interestKeys.includes(key)){
                var intf= self.interfaces[key];
                intf.name = value[ifXTableColumns.ifName];
                intf.alias = value[ifXTableColumns.ifAlias];
                var highSpeed = value[ifXTableColumns.ifHighSpeed];
                if(S(highSpeed).isNumeric() && (S(highSpeed).toInt() > 0)) intf.speed = S(highSpeed).toInt() * 1000000 ;
                var name="";
                if(!S(intf.name).isEmpty()) {
                    name = S(intf.name).trim().s;
                    name = name.toLowerCase();
                }
                var alias="";
                if(!S(intf.alias).isEmpty()){
                    alias = S(intf.alias).trim().s;
                    alias = alias.toLowerCase();                   
                }

                if(  !S(name).isEmpty() && !S(name).contains('pppoe') && !S(name).startsWith("vi")) 
                {
                        self.interestInterfaces.push(intf);
                        // self.parseInternationalInterfaces(intf.alias);
                        self.interestInterfacesIndices.push(intf.index);
                }
            }
        }); 
        self.ifTableError = false;
        self.ifXTableError = false;
        return self.interestInterfaces;
    };    
    self.createInterfaces  = function(interfaceList){
        for(var i=0;i<interfaceList.length;i++){
            Interface.create(interfaceList[i],function(error,interface){
                if(error){
                    logger.error(error);
                }
            });
            
        }
    };
    self.updateInterfaces  = function(interfaceList){
        for(var i=0;i<interfaceList.length;i++){          
        Interface.findByIdAndUpdate(interfaceList[i]._id,interfaceList[i],function(error,updatedInterface){
            if(error){
                logger.error(error);
            }
            else{
                updatedInterface.save();
            }
        });
        }
    };
    self.removeInterfaces  = function(interfaceList){
        for(var i=0;i<interfaceList.length;i++){
        Interface.findByIdAndRemove(interfaceList[i]._id,function(error){
            if(error){
                logger.error(error);
            }
        });

        }
    };
    self.ifXTableResponseCb = function  (error, table) {
        if (error) {
            // logger.error ("device "+self.name+ " has " +error.toString () + " while reading ifXTable");
            self.ifTableError = true;
            self.ifXTableError = true;
            return;
        }
        if(self.inSyncMode){
            self.retrieveIfXTable(table,function(){});
            async.forEachOf(self.device.interfaces,function(interface,key,callback){
                var syncCycles = S(interface.syncCycles).toInt();
                interface.syncCycles = syncCycles + 1;
                // logger.info(interface.index+": "+interface.name+" , "+interface.updated +" , syncCycles "+interface.syncCycles);
                //content of interestInterfaces are the found interfaces in the current sync cycles
                // if: current interface index found in interestInterfaces and interface not updated, then: update interface
                if(self.interestInterfacesIndices.includes(interface.index) && (interface.updated === undefined)){
                    var intf = self.getInterfaceFromInterestList(interface.index);
                    interface.name = intf.name;
                    interface.alias = intf.alias;
                    interface.description = intf.description;
                    interface.type = intf.type;
                    interface.speed = intf.speed;
                    interface.delete = false;
                    interface.syncCycles = 0;
                    self.interfaceUpdateList.push(interface);
                    // logger.info("found interface "+interface.name +" with index "+interface.index+", with update state "+interface.updated);
                    //remove interface from list of interest interfaces as it is already exists
                    self.removeInterfaceFromInterestList(interface.index);
                }
                // if: current interface index not found and updated and syncCyles > threshold, then: let "delete = true" and update interface
                if((!self.interestInterfacesIndices.includes(interface.index)) && 
                    (interface.updated instanceof Date) && 
                    (interface.syncCycles > syncCyclesThreshold)){
                    var intf = self.getInterfaceFromInterestList(interface.index);
                    interface.name = intf.name;
                    interface.alias = intf.alias;
                    interface.description = intf.description;
                    interface.type = intf.type;
                    interface.speed = intf.speed;
                    // interface.syncCycles = syncCycles + 1;
                    interface.delete = true;
                    self.interfaceUpdateList.push(interface);
                }else if((!self.interestInterfacesIndices.includes(interface.index)) && 
                    (interface.updated instanceof Date) && 
                    (interface.syncCycles <= syncCyclesThreshold)){
                    self.interfaceUpdateList.push(interface);
                }
                // if: current interface index not found and not updated and syncCyles > threshold, then: delete interface
                if((!self.interestInterfacesIndices.includes(interface.index)) && 
                    (interface.updated === undefined) && 
                    (interface.syncCycles > syncCyclesThreshold)){
                    self.interfaceRemoveList.push(interface);
                    // logger.warn("interface:"+ interface.name + " will be deleted automatically, it's syncCycle= "+interface.syncCycles);
                }else if((!self.interestInterfacesIndices.includes(interface.index)) && 
                    (interface.updated === undefined) && 
                    (interface.syncCycles <= syncCyclesThreshold)){
                    // logger.warn("interface:"+ interface.name + " wasn't found during this sync cycle, it's syncCycle= "+interface.syncCycles);
                    self.interfaceUpdateList.push(interface);
                }
                // if: current interface index found in interestInterfaces and interface updated, then: skip
                if(self.interestInterfacesIndices.includes(interface.index) && (interface.updated instanceof Date)){
                    //remove interface from list of interest interfaces as it is already exists
                    interface.syncCycles = 0;
                    self.interfaceUpdateList.push(interface);
                    self.removeInterfaceFromInterestList(interface.index);
                }
                // if: new interface index, then create interface 
                else {
                }
            });
            if(self.interestInterfaces.length > 0) self.createInterfaces(self.interestInterfaces);
            if(self.interfaceUpdateList.length > 0) self.updateInterfaces(self.interfaceUpdateList);
            if(self.interfaceRemoveList.length > 0) self.removeInterfaces(self.interfaceRemoveList);
            //now the device will use interestInterfaces array during save action, so modify it to include only new and updated
            //interfaces
            self.interestInterfaces = self.interestInterfaces.concat(self.interfaceUpdateList);
            self.saveDevice(self.device); 
        }else{
            self.createInterfaces(self.retrieveIfXTable(table,function(){}));
            self.saveDevice(self.device);         
        }
    };    
    self.ifTableResponseCb = function  (error, table) {
        if (error) {
            snmpError = error.toString ();
            // logger.error ("device "+self.name+ " has " +error.toString () + " while reading ifTable");
            self.ifTableError = true;
            self.ifXTableError = true;
            return;
        }
        self.retrieveIfTable(table,function(){});
        self.session.tableColumnsAsync(oids.ifXTable.OID, oids.ifXTable.Columns, maxRepetitions, self.ifXTableResponseCb);
    };
    this.syncInterfaces = function(){
        self.inSyncMode = true;

        // discover new list of filtered interface indices
        // if: current interface index found in list and interface updated, then: skip
        // if: current interface index found in list and interface not updated, then: update interface
        // if: current interface index not found and updated and syncCyles > threshold, then: let "delete = true" and update interface
        // if: current interface index not found and not updated and syncCyles > threshold, then: delete interface
        // if: new interface index, then create interface 
        logger.info("in sync mode for: "+self.name+" "+self.device.ipaddress+" "+self.device.communityString);
        self.session.tableColumnsAsync(oids.ifTable.OID, oids.ifTable.Columns, maxRepetitions, self.ifTableResponseCb);
    };
    this.discoverInterfaces = function(){
        logger.info(self.name+" "+self.device.ipaddress+" "+self.device.communityString);
        self.session.tableColumnsAsync(oids.ifTable.OID, oids.ifTable.Columns, maxRepetitions, self.ifTableResponseCb);
    };
}
//*********************
//  SNMP HANDLER
//*********************
// The maxRepetitions argument is optional, and will be ignored unless using
// SNMP verison 2c
var syncCyclesThreshold = 3;
var snmpError = "";
var maxRepetitions = 200000;
var theWalkSession, theTableSession, theTableColumnsSession; 
var ifTableColumns ={ifIndex:1 , ifDescr:2,ifType:3,ifSpeed:5,ifAdminStatus:7,ifOperStatus:8};
var ifXTableColumns ={ifName:1 , ifAlias:18, ifHighSpeed:15};
var deviceInterfaces = [Interface];
var anInterface = new Interface();
var discoveryFinished = false;
var sysOID = ["1.3.6.1.2.1.1.2.0"];//retrieve sysObjectID to lookup model
var oids = {
    ifTable: {
        OID: "1.3.6.1.2.1.2.2",
        Columns: [
            ifTableColumns.ifIndex,
            ifTableColumns.ifDescr,
            ifTableColumns.ifType,
            ifTableColumns.ifSpeed,
            ifTableColumns.ifAdminStatus,
            ifTableColumns.ifOperStatus
        ]
    },
    ifXTable: {
        OID: "1.3.6.1.2.1.31.1.1",
        Columns: [
            ifXTableColumns.ifName,
            ifXTableColumns.ifAlias,
            ifXTableColumns.ifHighSpeed
        ]
    }
};
//SNMP Table
function sortInt (a, b) {
    if (a > b)
        return 1;
    else if (b > a)
        return -1;
    else
        return 0;
}
var theGetSession = 

String.prototype.escapeSpecialChars = function() {
    return this.replace(/\\n/g, "")
               .replace(/\\'/g, "")
               .replace(/\\"/g, '')
               .replace(/\\&/g, "")
               .replace(/\\r/g, "")
               .replace(/\\t/g, "")
               .replace(/\\b/g, "")
               .replace(/\\f/g, "");
};
router.get("/pagination?",middleware.isLoggedIn ,function(request, response) {
        // limit is the number of rows per page
        var limit = parseInt(request.query.limit);
        // offset is the page number
        var skip  = parseInt(request.query.offset);
        // search string
        var searchQuery = request.query.search ;//: 'xe-'

        if(S(searchQuery).isEmpty()){
            Device.count({}, function(err, devicesCount) {
                Device.find({},'hostname ipaddress popName.name sector.name governorate.name type model vendor communityString createdAt updatedAt author lastUpdatedBy sysObjectID sysName',{lean:true,skip:skip,limit:limit}, function(err, foundDevices) {
                    if (err) {
                        logger.error(err);
                    }
                    else {
                        var data = "{\"total\":"+ devicesCount+",\"rows\":" +  JSON.stringify(foundDevices).escapeSpecialChars()+"}";
                        response.setHeader('Content-Type', 'application/json');
                        // response.send((foundDevices)); 
                        response.send(data);        
                    }

                });

            });

        } 
        else {
            searchQuery = ".*"+S(searchQuery).s.toLowerCase()+".*";
            Device.count({'$or' : [{hostname: new RegExp(searchQuery,'i')},
                {ipaddress: new RegExp(searchQuery,'i')},
                {"sector.name": new RegExp(searchQuery,'i')},
                {"governorate.name": new RegExp(searchQuery,'i')},
                {type: new RegExp(searchQuery,'i')},
                {model: new RegExp(searchQuery,'i')},
                {vendor: new RegExp(searchQuery,'i')},
                {"popName.name": new RegExp(searchQuery,'i')}]}, function(err, m_devicesCount) {
                Device.find({'$or' : [{hostname: new RegExp(searchQuery,'i')},
                {ipaddress: new RegExp(searchQuery,'i')},
                {"sector.name": new RegExp(searchQuery,'i')},
                {"governorate.name": new RegExp(searchQuery,'i')},
                {type: new RegExp(searchQuery,'i')},
                {model: new RegExp(searchQuery,'i')},
                {vendor: new RegExp(searchQuery,'i')},
                {"popName.name": new RegExp(searchQuery,'i')}]},'hostname ipaddress popName.name sector.name governorate.name type model vendor communityString createdAt updatedAt author lastUpdatedBy sysObjectID sysName',{lean:true,skip:skip,limit:limit}, function(err, foundDevices) {
                    if (err) {
                        logger.error(err);
                    }
                    else {
                        var data = "{\"total\":"+ m_devicesCount+",\"rows\":" + JSON.stringify(foundDevices)+"}";
                        response.setHeader('Content-Type', 'application/json');
                        // response.send((foundDevices)); 
                        response.send(data);        
                    }

                });
            });

        }
});
//INDEX - show all devices
router.get("/", middleware.isLoggedIn ,function(request, response) {
    // Device.find({}, function(err, foundDevices) {
    //     if (err) {
    //         logger.error(err);
    //     }
    //     else {
    //         response.render("devices/index", { devices: foundDevices });
    //         // response.send("VIEW DEVICES");
    //     }
    // });
    response.render("devices/index");
});


//CREATE - add new device to DB
router.post("/",middleware.isLoggedIn, function(request, response) {
    //get data from a form and add to devices array
    var hostname = request.body.device.hostname;
    var ipaddress = request.body.device.ipaddress;
    var communityString = request.body.device.communityString || "public";
    var parsedHostName = Parser.parseHostname(S(hostname));
    var type = request.body.device.type || parsedHostName.deviceType;
    var model = request.body.device.model;
    var modelOID = "";
    var vendor = request.body.device.vendor || parsedHostName.deviceVendor;
    // var popName = request.body.device.popName;
    var popId =  request.body.device.popName.name;
    // var sector = request.body.device.sector;
    var sectorId = request.body.device.sector.name;
    // var governorate = request.body.device.governorate;
    var governorateId = request.body.device.governorate.name;
    ///
    var aPOP = new POP();
    var aSector = new Sector();
    var aGove = new Governorate();
    var emptySector = false;
    var emptyPOP = false;
    var emptyGove = false;

    if(sectorId === 'NONE') {
        emptySector = true;
        Sector.findOne({name : "NONE" }, function(error,foundSector){
            aSector = foundSector;
        });
    }
    if(popId === 'NONE') {
        emptyPOP = true;
            POP.findOne({shortName : parsedHostName.popName }, function(error,foundPOP){
                aPOP = foundPOP;
                emptyPOP = false;
                popId = foundPOP._id;
            });
    }
    if(governorateId === 'NONE') {
        emptyGove = true;
            Governorate.findOne({acronym : parsedHostName.popGove }, function(error,foundGove){
            aGove = foundGove;
            emptyGove = false;
            governorateId = foundGove._id;
        });
    }

    if(S(emptySector).toBoolean()){
        sectorId = aSector._id || request.body.device.sector.name  ;
    }
    if(S(emptyPOP).toBoolean()){
        popId = aPOP._id || request.body.device.popName.name  ;
        // logger.info("pop id is: "+ popId);
    }
    if(S(emptyGove).toBoolean()){
        governorateId = aGove._id || request.body.device.governorate.name  ;
        // logger.info("gove id is: "+ governorateId);
    }
    session = snmp.createSession(ipaddress, S(communityString).trim().s,{ timeout: 10000, retries: 1});
    session.get (sysOID, function (error, varbinds) {
        if (error) {
            logger.error (error.toString ());
        } else {
            for (var i = 0; i < varbinds.length; i++) {
                // for version 1 we can assume all OIDs were successful
                modelOID = varbinds[i].value;
            
                // for version 2c we must check each OID for an error condition
                if (snmp.isVarbindError (varbinds[i]))
                    logger.error (snmp.varbindError (varbinds[i]));
                else
                    modelOID = varbinds[i].value;
            }
            DeviceModel.findOne({oid: modelOID},function(error,foundModel){
                if(error){
                    logger.error(error);
                }
                else if(foundModel != null){
                    model = foundModel.model ;
                }
                else{
                    model = model ;
                }
                if(!(popId === undefined)){
                    POP.findById(popId,function(error,foundPOP){
                        if(error){
                            logger.error(error);
                        }
                        else{
                            if(!(sectorId === 'NONE')){
                                Sector.findById(sectorId,function(error,foundSector){
                                    if(error) {
                                        logger.error(error);
                                    }
                                    else {

                                        if(!(governorateId === undefined)){
                                            Governorate.findById(governorateId,function(error,foundGove){
                                                if(error){
                                                    logger.error(error);

                                                }else{
                                                    ///here goes correct values
                                                    aDevice = {
                                                            hostname: hostname.trim(),
                                                            ipaddress: ipaddress.trim(),
                                                            author: {id: request.user._id, email: request.user.email},
                                                            communityString: communityString.trim(),
                                                            type: type.trim(),
                                                            model: model.trim(),
                                                            vendor: vendor.trim(),
                                                            "popName.name":  parsedHostName.popName || foundPOP.name,
                                                            "sector.name": foundPOP.sector,
                                                            "governorate.name":  foundGove.name
                                                    };
                                                    aDevice.interfaces = [];
                                                    logger.info("Device discovery started");
                                                    logger.info(aDevice.hostname + " "+ aDevice.ipaddress + " "+aDevice.communityString);
                                                    Device.create(aDevice, function(error, device) {
                                                        if (error) {
                                                            logger.log(error.errors);
                                                            for (field in error.errors) {
                                                                request.flash("error",error.errors[field].message);
                                                            }
                                                            
                                                        }
                                                        else {
                                                            logger.info("new device created and saved");
                                                            request.flash("success","Successfully added device, will start device discovery now");
                                                            var discoDevice = new discoveredDevice(device);
                                                            discoDevice.discoverInterfaces();
                                                        }
                                                        response.redirect("/devices"); //will redirect as a GET request
                                                    });
                                                }

                                            });

                                        }else{

                                        }

                                    }

                                });
                            }
                        }
                    });
                }//<-------

            });
        }
    });////---

});

//NEW - show form to create new device
//should show the form will post data to /devices
router.get("/new",middleware.isLoggedIn ,function(request, response) {
    if(process.env.SEED == "true"){
        seedDB(request.user);
    }
    response.render("devices/new");
});

//Sync devices
var syncDevices = function(){
    logger.warn("Starting bulk devices sync");
    Device.find({}, function(err, foundDevices) {
        if (err) {
            logger.error(err);
        }
        else {
            foundDevices.forEach(function(device){
                // if(device.discovered){//only handle discovered devices
                    logger.info("device " + device.hostname +" will be synced now");
                    // logger.info("device comm string" + device.communityString +" will be synced now");
                    // perform interface sync
                    var discoDevice = new discoveredDevice(device);
                    discoDevice.syncInterfaces();
                // }
            });
        }
    });

}
router.get("/sync", middleware.isLoggedIn ,function(request, response) {
    syncDevices();
    response.redirect("/devices");
});
router.get("/sync/:id", middleware.isLoggedIn ,function(request, response) {
    // syncDevices();
    Device.findById(request.params.id, function(err, foundDevice) {
        if (err) {
            logger.error(err);
        }
        else {
                    logger.info("single sync mode, device " + foundDevice.hostname +" will be synced now");
                    // perform interface sync
                    var discoDevice = new discoveredDevice(foundDevice);
                    discoDevice.syncInterfaces();
        }
    });

    response.redirect("/devices");
});

//SHOW DEVICE ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
    //find device with provided id
    Device.findById(request.params.id).populate("interfaces").exec(function(error,foundDevice){
        if(error){
            logger.error(error);
        }
        else{
            //render show template with that device
            response.render("devices/show",{device: foundDevice});
        }
    });
});

//EDIT DEVICE ROUTE
router.get("/:id/edit", middleware.isLoggedIn, function(request,response){
    //is user logged in?
    logger.info("Update a device");
    Device.findById(request.params.id,function(error,foundDevice){
        response.render("devices/edit",{device: foundDevice});
    });
    
});
//UPDATE DEVICE ROUTE
router.put("/:id", middleware.isLoggedIn,function(request,response){
    //find and update the correct DEVICE
    request.body.device.updatedAt = new Date();
    request.body.device.lastUpdatedBy = {id: request.user._id, email: request.user.email};
    // note: Select2 has a defect which removes pop name and replace it with the id
    POP.findById({_id: mongoose.Types.ObjectId(request.body.device.popName.name)},function(error,foundPOP){
    if(error){
        logger.error(error);
    }
    else{
        request.body.device.popName.name = foundPOP.name;
                Governorate.findById({_id: mongoose.Types.ObjectId(request.body.device.governorate.name)},function(error,foundGove){
                    if(error){
                        logger.error(error);
                    }
                    else{
                        request.body.device.governorate.name = foundGove.name;
                        Device.findByIdAndUpdate(request.params.id,request.body.device,function(error,updatedDevice){
                            if(error){
                                logger.error(error);
                                response.redirect("/devices");
                            }
                            else{
                                //redirect somewhere (show page)
                                updatedDevice.save();
                            }
                        });
                    }
                });
    }
});
                response.redirect("/devices/"+request.params.id);

});
//DESTROY Device ROUTE
router.delete("/:id", middleware.isLoggedIn, function(request,response){
    logger.warn("Deleting device with id: "+request.params.id);
    if(request.params.id == -1){
        response.redirect("/devices");
    }
    //find list of interfaces
    Device.findById(request.params.id,function(error,foundDevice){
        if(error){
            logger.error(error);
        }
        else{
            var interfaceList = foundDevice.interfaces;
            //iterate over them and delete
            async.forEachOf(interfaceList,function(interface,key, callback ){
                Interface.findByIdAndRemove(interface._id,function(error){
                    if(error) logger.error(error);
                });

            });
        }
        
    });
    Device.findByIdAndRemove(request.params.id,function(error){
        if(error){
            logger.error(error);
        }
        response.redirect("/devices");
    });
});

module.exports = router;
module.exports.syncDevices = syncDevices;