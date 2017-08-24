var express         = require("express");
var router          = express.Router();
var Device          = require("../models/device");
var Interface       = require("../models/interface");
var POP             = require("../models/pop");
var Sector          = require("../models/sector");
var Governorate     = require("../models/governorate");
var Link     = require("../models/link");
var middleware      = require("../middleware");
var Promise         = require('bluebird');
var snmp            = Promise.promisifyAll(require ("net-snmp"));
var session         = snmp.createSession (process.env.IP, "public");
var seedDB          = require("../seeds");
var snmpConstants   = require("../lookUps");
var async           = require('async');
var S               = require('string');
var mongoose         = require('mongoose');

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
    self.session = snmp.createSession(self.device.ipaddress, self.device.communityString,{ timeout: 5000 });

    //parse ifAlias
    self.parseInternationalInterfaces = function(ifAlias){
        var choppedAlias = S(ifAlias).trim().splitLeft('-');
        console.log(choppedAlias);
    }

    self.saveDevice = function(device){
        Device.findByIdAndUpdate(device._id,{interfaces: self.interestInterfaces, discovered: true},function(error,updatedDevice){
            if(error){
                console.log(error);
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
        console.log("removeInterfaceFromInterestList");
        console.log(interfaceIndex);
        console.log(self.interestInterfaces);
        for(var i=0; i<self.interestInterfaces.length;i++){
        console.log(self.interestInterfaces[i].index);
            if(self.interestInterfaces[i].index ==  interfaceIndex){
                //remove interface from the list
                self.interestInterfaces.splice(i,1);
                break;
            }
        }
                console.log(self.interestInterfaces);

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
                (anInterface.operStatus == snmpConstants.ifAdminOperStatus.up) &&
                (!S(anInterface.description).contains("mpls") )) {
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
                var name = S(intf.name).toString();
                name = name.toLowerCase();
                // check interface is main i.e. doesn't contain '.'
                if( !S(name).contains('.') && //main interface
                    ( 
                        S(name).contains("ae") ||
                        S(name).contains("at") ||
                        S(name).contains("e1") ||
                        S(name).contains("et") ||
                        S(name).contains("fa") ||
                        S(name).contains("fe") ||
                        S(name).contains("ge") ||
                        S(name).contains("gi") ||
                        S(name).contains("gr") ||
                        S(name).contains("mu") ||
                        S(name).contains("po") ||
                        S(name).contains("se") ||
                        S(name).contains("so") ||
                        S(name).contains("t1") ||
                        S(name).contains("te") ||
                        S(name).contains("xe")                    
                    ) ) {
                      self.interestInterfaces.push(intf);
                        self.parseInternationalInterfaces(intf.alias);
                      self.interestInterfacesIndices.push(intf.index);
                }
            }
        }); 
        self.ifTableError = false;
        self.ifXTableError = false;
        return self.interestInterfaces;
    };    
    self.createInterfaces  = function(interfaceList){
        console.log("createInterfaces");
        for(var i=0;i<interfaceList.length;i++){
            Interface.create(interfaceList[i],function(error,interface){
                if(error){
                    console.log(error);
                }
                else{
                    console.log(interface);
                    //populate some enrichment information automatically
                    Link.findOne({ device1: S(self.device.hostname), interface1: S(interface.name) }, function (error, foundLink){
                    if(error){
                        console.log(error);
                    }
                    else if(foundLink){
                        console.log(foundLink.device2);
                        interface.secondHost = foundLink.device2
                        Device.findOne({ hostname: S(foundLink.device2).trim()}, function(error, foundDevice){
                            if(error){
                                console.log(error);
                            }
                            else if(foundDevice){
                                interface.secondPOP = foundDevice.popName.name;
                                interface.save();
                            }
                            else{
                                console.log("device2 from Link collection was not found!");
                            }
                        });
                    }
                    else{
                        console.log("link not found!");
                    }
                    
                  });

                }
            });
            
        }
    };
    self.updateInterfaces  = function(interfaceList){
        console.log("updateInterfaces");
        for(var i=0;i<interfaceList.length;i++){
        console.log("updateInterfaces FOR LOOP");
            Interface.create(interfaceList[i],function(error,interface){
                if(error){
                    console.log(error);
                }
                else{
                    console.log(interface);
                }
            });
            
        }
    };
    self.removeInterfaces  = function(interfaceList){
        console.log("removeInterfaces");
        for(var i=0;i<interfaceList.length;i++){
        console.log("removeInterfaces FOR LOOP");
            Interface.create(interfaceList[i],function(error,interface){
                if(error){
                    console.log(error);
                }
                else{
                    console.log(interface);
                }
            });
            
        }
    };
    self.ifXTableResponseCb = function  (error, table) {
        if (error) {
            console.error (error.toString ());
            self.ifTableError = true;
            self.ifXTableError = true;
            return;
        }
        if(self.inSyncMode){
            self.retrieveIfXTable(table,function(){});
            console.log("before asyncForEach");
            async.forEachOf(self.device.interfaces,function(interface,key,callback){
            console.log(interface);
                console.log(interface.index+": "+interface.name+" , "+interface.updated +" , syncCycles "+interface.syncCyles);
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
                    console.log("found interface "+interface.name +" with index "+interface.index+", with update state "+interface.updated);
                    //remove interface from list of interest interfaces as it is already exists
                    self.removeInterfaceFromInterestList(interface.index);
                }
                // if: current interface index not found and updated and syncCyles > threshold, then: let "delete = true" and update interface
                else if((!self.interestInterfacesIndices.includes(interface.index)) && 
                    (interface.updated instanceof Date) && 
                    (interface.syncCycles > syncCyclesThreshold)){
                    var intf = self.getInterfaceFromInterestList(interface.index);
                    interface.name = intf.name;
                    interface.alias = intf.alias;
                    interface.description = intf.description;
                    interface.type = intf.type;
                    interface.speed = intf.speed;
                    intreface.syncCycles = S(interface.syncCycles).toInt() + 1;
                    interface.delete = true;
                    self.interfaceUpdateList.push(interface);
                }
                // if: current interface index not found and not updated and syncCyles > threshold, then: delete interface
                else if((!self.interestInterfacesIndices.includes(interface.index)) && 
                    (interface.updated === undefined) && 
                    (interface.syncCycles > syncCyclesThreshold)){
                    self.interfaceUpdateList.push(interface);
                }
                // if: current interface index found in interestInterfaces and interface updated, then: skip
                else if(self.interestInterfacesIndices.includes(interface.index) && (interface.updated instanceof Date)){
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
            console.log(self.interestInterfaces);
            self.interestInterfaces = self.interestInterfaces.concat(self.interfaceUpdateList);
            console.log(self.interestInterfaces);
            self.saveDevice(self.device); 
        }else{
            self.createInterfaces(self.retrieveIfXTable(table,function(){}));
            self.saveDevice(self.device);         
        }
    };    
    self.ifTableResponseCb = function  (error, table) {
        if (error) {
            snmpError = error.toString ();
            console.error (error.toString ());
            self.ifTableError = true;
            self.ifXTableError = true;
            return;
        }
        self.retrieveIfTable(table,function(){});
        self.session.tableColumnsAsync(oids.ifXTable.OID, oids.ifXTable.Columns, maxRepetitions, self.ifXTableResponseCb);
    };
    this.syncInterfaces = function(){
        self.inSyncMode = true;
        console.log(self.inSyncMode);
        console.log("starting "+self.name+" sync process");
        // discover new list of filtered interface indices
        // if: current interface index found in list and interface updated, then: skip
        // if: current interface index found in list and interface not updated, then: update interface
        // if: current interface index not found and updated and syncCyles > threshold, then: let "delete = true" and update interface
        // if: current interface index not found and not updated and syncCyles > threshold, then: delete interface
        // if: new interface index, then create interface 
        self.session.tableColumnsAsync(oids.ifTable.OID, oids.ifTable.Columns, maxRepetitions, self.ifTableResponseCb);
    };
    this.discoverInterfaces = function(){
        console.log(self.name+" "+self.device.ipaddress+" "+self.device.communityString);
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
var maxRepetitions = 20;
var theWalkSession, theTableSession, theTableColumnsSession; 
var ifTableColumns ={ifIndex:1 , ifDescr:2,ifType:3,ifSpeed:5,ifAdminStatus:7,ifOperStatus:8};
var ifXTableColumns ={ifName:1 , ifAlias:18};
var deviceInterfaces = [Interface];
var anInterface = new Interface();
var discoveryFinished = false;
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
            ifXTableColumns.ifAlias
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
    var type = request.body.device.type;
    var model = request.body.device.model;
    var vendor = request.body.device.vendor;
    var popName = request.body.device.popName;
    var sector = request.body.device.sector;
    var governorate = request.body.device.governorate;

    aDevice = {
            hostname: hostname.trim(),
            ipaddress: ipaddress.trim(),
            author: {id: request.user._id, email: request.user.email},
            communityString: communityString.trim(),
            type: type.trim(),
            model: model.trim(),
            vendor: vendor.trim(),
            popName: popName,
            sector: sector,
            governorate: governorate
    };
    aDevice.interfaces = [];
    console.log("Device discovery started");
    console.log(aDevice.hostname);
    console.log(aDevice.ipaddress);
    console.log(aDevice.communityString);
    Device.create(aDevice, function(error, device) {
        if (error) {
            // console.log(error.errors);
            for (field in error.errors) {
                request.flash("error",error.errors[field].message);
            }
            
        }
        else {
            console.log("new device created and saved");
            request.flash("success","Successfully added device, will start device discovery now");
            var discoDevice = new discoveredDevice(device);
            discoDevice.discoverInterfaces();
        }
        response.redirect("/devices"); //will redirect as a GET request
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

//Sync devices
var syncDevices = function(){
    console.log("Checking if devices ready for sync!!!!!!!!!!!");
    Device.find({}, function(err, foundDevices) {
        if (err) {
            console.log(err);
        }
        else {
            foundDevices.forEach(function(device){
                if(device.discovered){//only handle discovered devices
                    console.log("device " + device.hostname +" will be synced now");
                    // perform interface sync
                    var discoDevice = new discoveredDevice(device);
                    discoDevice.syncInterfaces();
                }
            });
        }
    });

}
router.get("/sync", middleware.isLoggedIn ,function(request, response) {
    syncDevices();
    response.redirect("/devices");
});

//SHOW DEVICE ROUTE
router.get("/:id",middleware.isLoggedIn ,function(request,response){
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
    console.log("Update a device");
    Device.findById(request.params.id,function(error,foundDevice){
        response.render("devices/edit",{device: foundDevice});
    });
    
});
//UPDATE DEVICE ROUTE
router.put("/:id", middleware.checkDeviceOwnership,function(request,response){
    //find and update the correct DEVICE
    request.body.device.updatedAt = new Date();
    request.body.device.lastUpdatedBy = {id: request.user._id, email: request.user.email};
    console.log(request.body.device);
    // note: Select2 has a defect which removes pop name and replace it with the id
    POP.findById({_id: mongoose.Types.ObjectId(request.body.device.popName.name)},function(error,foundPOP){
    if(error){
        console.log(error);
    }
    else{
        request.body.device.popName.name = foundPOP.name;
        // request.body.device.popName._id = foundPOP._id;
        // note: Select2 has a defect which removes pop name and replace it with the id
        // Sector.findById({_id: mongoose.Types.ObjectId(request.body.device.sector.name)},function(error,foundSector){
        //     if(error){
        //         console.log(error);
        //     }
        //     else{
        //         console.log("sector name: ");
        //         console.log(foundSector);
        //         console.log(foundSector.name);
        //         request.body.device.sector.name = foundSector.name;
                // request.body.device.sector._id = foundSector._id;
                Governorate.findById({_id: mongoose.Types.ObjectId(request.body.device.governorate.name)},function(error,foundGove){
                    if(error){
                        console.log(error);
                    }
                    else{
                console.log("governorate name: "+ foundGove.name);
                        request.body.device.governorate.name = foundGove.name;
                        Device.findByIdAndUpdate(request.params.id,request.body.device,function(error,updatedDevice){
                            if(error){
                                console.log(error);
                                response.redirect("/devices");
                            }
                            else{
                                //redirect somewhere (show page)
                                updatedDevice.save();
                            }
                        });
                    }
                });
            // }

        // });
    }
});
                response.redirect("/devices/"+request.params.id);

});
//DESTROY Device ROUTE
router.delete("/:id", middleware.checkDeviceOwnership, function(request,response){
    console.log("Deleting device with id: "+request.params.id);
    if(request.params.id == -1){
        response.redirect("/devices");
    }
    Device.findByIdAndRemove(request.params.id,function(error){
        if(error){
            console.log(error);
        }
        response.redirect("/devices");
    });
});

module.exports = router;
module.exports.syncDevices = syncDevices;