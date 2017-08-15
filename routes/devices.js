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
//create and save a document, handle error if occured
var aDevice = new Device() ;
//*********************
//  SNMP HANDLER
//*********************
// The maxRepetitions argument is optional, and will be ignored unless using
// SNMP verison 2c
var maxRepetitions = 20;
var theWalkSession, theTableSession, theTableColumnsSession; 
// var oid = "1.3.6.1.2.1"; //SNMP MIB-2
// var ifTable = "1.3.6.1.2.1.2.2";
// var ifXTable = "1.3.6.1.2.1.31.1.1";
var ifTableColumns ={ifIndex:1 , ifDescr:2,ifType:3,ifSpeed:5,ifAdminStatus:7,ifOperStatus:8};
var ifXTableColumns ={ifName:1 , ifAlias:18};
var deviceInterfaces = [Interface];
var anInterface = new Interface();
var ifTableError = false, ifXTableError = false, ifTableRead = false, ifXTableRead = false;
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

var saveDevice = function(device){
    Device.findByIdAndUpdate(device._id,{interfaces: interfaces},function(){
        
    });
}
var createInterfaces  = function(device,interfaceList){
    console.log("createInterface");
    for(var i=0;i<interfaceList.length;i++){
        Interface.create(interfaceList[i],function(error,interface){
            if(error){
                console.log(error);
            }
            else{
            }
        });
        
    }
    device.interfaces = interfaces;
    return device;
}
var interfaces = [];
var retrieveIfTable = function( table,callback){
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
            anInterface.index = value[ifTableColumns.ifIndex];
            anInterface.description = value[ifTableColumns.ifDescr];
            anInterface.type = value[ifTableColumns.ifType];
            anInterface.speed = value[ifTableColumns.ifSpeed];
            anInterface.adminStatus = value[ifTableColumns.ifAdminStatus];
            anInterface.operStatus  = value[ifTableColumns.ifOperStatus];
            if( (anInterface.adminStatus == snmpConstants.ifAdminOperStatus.up) && (anInterface.operStatus == snmpConstants.ifAdminOperStatus.up)) interfaces.push(anInterface);
        }); 
        ifTableError = false;
        ifXTableError = false;
    return interfaces;
}
var ifTableResponseCb = function  (error, table) {
        if (error) {
        console.error (error.toString ());
        ifTableError = true;
        ifXTableError = true;
        return;
    }
    var discoveredDevice = createInterfaces(aDevice,retrieveIfTable(table,function(){}));
    console.log(discoveredDevice);
    saveDevice(discoveredDevice);
};

//SNMP Walk

function doneCb (error) {
    if (error)
        console.error(error.toString ());
}

function feedCb (varbinds) {
    var table;//me
    for (var i = 0; i < varbinds.length; i++) {
        if (snmp.isVarbindError (varbinds[i])){
            console.error(snmp.varbindError (varbinds[i]));
        }
        else{
            // console.log(varbinds[i].oid + "|" + varbinds[i].value);
            //most of the logic for interface filtering must be here
            var oid = varbinds[i].oid;//.replace ((oids.ifTable.OID + ".1."), "");
			var match = oid.match (/^(\d+)\.(.+)$/);
			if (match && match[1] > 0) {
				if (! table[match[2]])
					table[match[2]] = {};
				table[match[2]][match[1]] = varbinds[i].value;
			}
        }
    }
    console.log(table);
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

router.get("/sync", middleware.isLoggedIn ,function(request, response) {
    Device.find({}, function(err, foundDevices) {
        if (err) {
            console.log(err);
        }
        else {
            foundDevices.forEach(function(device){
                //if device has no update date perform sync
                if(device.updated == undefined){
                    console.log(device.updated);
                    //perform smpwalk
                    aDevice = new Device();
                    anInterface = new Interface();
                    aDevice = {
                        hostname: device.hostname,
                        ipaddress: device.ipaddress,
                        updated: Date.now,
                        communityString: device.communityString 
                    };
                    session = snmp.createSession(aDevice.ipaddress, aDevice.communityString,{ timeout: 5000 });
                    ifTableRead = true;
                    anInterface.device = aDevice;
                    anInterface.author = {id: request.user._id, email: request.user.email};
                    session.tableColumns(oids.ifTable.OID, oids.ifTable.Columns, maxRepetitions, responseCb);
                    //update device
                    aDevice.save();
                }
            });
            // response.render("devices/index", { devices: foundDevices });
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
    aDevice.interfaces = [];
    console.log("Device discovery started");
    console.log(aDevice.hostname);
    console.log(aDevice.ipaddress);
    console.log(aDevice.communityString);
    Device.create(aDevice, function(error, device) {
        if (error) {
            console.log(error);
            request.flash("error","Something went wrong");
        }
        else {
            console.log("new device created and saved");
            console.log(device);
            request.flash("success","Successfully added device");
            request.flash("warning","Will start device discovery now");
            console.log("new device created and saved");
            console.log(device);
            session = snmp.createSession(aDevice.ipaddress, aDevice.communityString,{ timeout: 5000 });
            ifTableRead = true;
            ifXTableRead = false;
            anInterface.device = device;
            aDevice = device;
            session.tableColumnsAsync(oids.ifTable.OID, oids.ifTable.Columns, maxRepetitions, ifTableResponseCb);
            ifTableRead = false;
            ifXTableRead = true;
            // session.tableColumnsAsync(oids.ifXTable.OID, oids.ifXTable.Columns, maxRepetitions, ifXTableResponseCb);
            response.redirect("/devices"); //will redirect as a GET request
        }
    });

    // session.tableColumns (oids.ifXTable.OID, oids.ifXTable.Columns, maxRepetitions, responseCb) ;
    // theTableSession = session.table (oids.ifTable, maxRepetitions, responseCb);
    // theWalkSession = session.walk(oids, maxRepetitions, feedCb, doneCb);
    // response.redirect("/devices");

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