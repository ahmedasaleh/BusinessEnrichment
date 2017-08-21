var express         = require("express");
var router          = express.Router();
var Device          = require("../models/device");
var Interface       = require("../models/interface");
var middleware      = require("../middleware");
var Promise         = require('bluebird');
var snmp            = Promise.promisifyAll(require ("net-snmp"));
var session         = snmp.createSession (process.env.IP, "public");
var seedDB          = require("../seeds");
var snmpConstants   = require("../lookUps");
var async           = require('async');
var S               = require('string');

//create and save a document, handle error if occured
var aDevice = new Device() ;
var targets = [];
// var interfaces = [];
// var interestKeys = [];
// var interestInterfaces = [];

function discoveredDevice(device) {
    var self = this;
    self.name = device.hostname;
    self.device = device; 
    self.interfaces = [];
    self.interestKeys = [];
    self.interestInterfaces = [];
    self.ifTableError = false;
    self.ifXTableError = false;
    self.ifTableRead = false;
    self.ifXTableRead = false;
    self.session = snmp.createSession(self.device.ipaddress, self.device.communityString,{ timeout: 5000 });

    self.saveDevice = function(device){
        Device.findByIdAndUpdate(device._id,{interfaces: self.interestInterfaces, discovered: true},function(error,updatedDevice){
            if(error){
                console.log(error);
            }
        });
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
            if( (anInterface.adminStatus == snmpConstants.ifAdminOperStatus.up) && (anInterface.operStatus == snmpConstants.ifAdminOperStatus.up)){
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
                    ( S(name).contains("gi") || 
                    S(name).contains("te") || 
                    S(name).contains("so") || 
                    S(name).contains("xe") || 
                    S(name).contains("eth") || 
                    S(name).contains("ee") ) ) {
                      self.interestInterfaces.push(intf);
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
                    console.log(error);
                }
                else{
                    console.log(interface);
                }
            });
            
        }
        self.device.interfaces = self.interestInterfaces;//interfaces;
    };
    self.ifXTableResponseCb = function  (error, table) {
        if (error) {
            console.error (error.toString ());
            self.ifTableError = true;
            self.ifXTableError = true;
            return;
        }
        self.createInterfaces(self.retrieveIfXTable(table,function(){}));
        self.saveDevice(self.device);
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
        console.log("starting "+self.name+" sync process");
        // gather list of filtered interface indices
        // if: current interface index found in list and interface updated, then: skip
        // if: current interface index found in list and interface not updated, then: update interface
        // if: current interface index not found and updated and syncCyles > threshold, then: delete = true
        // if: current interface index not found and not updated and syncCyles > threshold, then: delete 
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
router.get("/sync", middleware.isLoggedIn ,function(request, response) {
    console.log("syncing devices!!!!!!!!!!!");
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
                request.flash("warning","Devices synchronization will start now");
            });
        }
    });
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
    Device.findByIdAndUpdate(request.params.id,request.body.device,function(error,updatedDevice){
        if(error){
            console.log(error);
            response.redirect("/devices");
        }
        else{
            //redirect somewhere (show page)
            updatedDevice.save();
            response.redirect("/devices/"+request.params.id);
        }
    });
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