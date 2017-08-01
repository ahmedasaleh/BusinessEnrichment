var express     = require("express");
var router      = express.Router();
var Device      = require("../models/device");
var Interface   = require("../models/interface");
var middleware  = require("../middleware");
var snmp        = require ("net-snmp");
var session     = snmp.createSession (process.env.IP, "public");
var seedDB      = require("../seeds");

//create and save a document, handle error if occured
var aDevice ;
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
function responseCb (error, table) {
    if (error) {
        console.error (error.toString ());
        ifTableError = true;
        ifXTableError = true;
    } else {
        // This code is purely used to print rows out in index order,
        // ifIndex's are integers so we'll sort them numerically using
        // the sortInt() function above
        var indexes = [];
        console.log(table);
        for (index in table){
            console.log(index);
            indexes.push (parseInt (index));
        }
        indexes.sort (sortInt);

        // Use the sorted indexes we've calculated to walk through each
        // row in order
        for (var i = 0; i < indexes.length; i++) {
            // Like indexes we sort by column, so use the same trick here,
            // some rows may not have the same columns as other rows, so
            // we calculate this per row
            var columns = [];
            for (column in table[indexes[i]])
                columns.push (parseInt (column));
            columns.sort (sortInt);
            
            // Print index, then each column indented under the index
            console.log ("row for index = " + indexes[i]);
            for (var j = 0; j < columns.length; j++) {
                console.log ("   column " + columns[j] + " = " + table[indexes[i]][columns[j]]);
                if(ifTableRead){
                    anInterface.index = table[indexes[i]][columns[0]];
                    anInterface.description = table[indexes[i]][columns[1]];
                    anInterface.type = table[indexes[i]][columns[2]];
                    anInterface.speed = table[indexes[i]][columns[3]];
                    anInterface.adminStatus = table[indexes[i]][columns[4]];
                    anInterface.operStatus  = table[indexes[i]][columns[5]];
                }
            }
            deviceInterfaces.push(anInterface);
        }
        ifTableError = false;
        ifXTableError = false;
    }
}
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
            session = snmp.createSession(aDevice.ipaddress, aDevice.communityString,{ timeout: 5000 });
            ifTableRead = true;
            anInterface.device = aDevice;
            anInterface.author = {id: request.user._id, email: request.user.email};
            // session.tableColumns(oids.ifTable.OID, oids.ifTable.Columns, maxRepetitions, responseCb);
            session.subtree(oids.ifTable.OID, maxRepetitions, feedCb, doneCb);
            // theWalkSession = session.walk(oids.ifTable.OID, maxRepetitions, feedCb, doneCb);
            //update device with the interface information
            // Device.findByIdAndUpdate(aDevice._id,aDevice,function(error,updatedDevice){
            //     if(error){
            //         console.log(error);
            //         response.redirect("/devices");
            //     }
            //     else{
            //         //redirect somewhere (show page)
            //         response.redirect("/devices/"+aDevice._id);
            //     }
            // });
            //redirect back to devices page
            // response.redirect("/devices"); //will redirect as a GET request
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