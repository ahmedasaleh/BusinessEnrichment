var mongoose = require("mongoose");
var Interface = require("./interface");
var Address4 = require('ip-address').Address4;

var hostnameEmpty = function(val) {  
    if (val && val.length != 0){    
        return true;  
    }  
    return false;
};
var hostnameLength = function(val) {  
    if (val && val.length >= 5){    
        return true;  
    }  
    return false;
};
var ipaddressEmpty = function(val) {  
    if (val && val.length != 0){    
        return true;  
    }  
    return false;
};
var validIP = function(val) {  
    if (val && new Address4(val).isValid()){    
        return true;  
    }  
    return false;
};

//Database template setup
var deviceSchema = new mongoose.Schema({
    // hostname: {type: String, required: [true, 'Hostname is required'], validate: hostnameValidator},
    hostname: {type: String, isAsync: true},//set `isAsync` option to `true` to make deprecation warnings go away.
    ipaddress: {type: String, isAsync: true},
    community: { type: String, default: 'public' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
    lastSyncTime: Date,
    sysDescr: String,
    deviceSyncCycles: {type: Number, default: 0},
    discovered: {type: Boolean, default: false},//used to mark device as discovered, useful during sync process
    // defaultCollector: {type: Number, default: 1},
    pop: String,//popName
    popLongName: { type: String, default: 'Unknown' },//popName
    cabinet: { type: String, default: 'Unknown' },
    sector: { type: String, default: 'Unknown' },
    gov: { type: String, default: 'Unknown' },//governorate
    district: { type: String, default: 'Unknown' },
    popType: { type: String, default: 'Unknown' },
    type: String,
    model: String,
    vendor: String,
    sysObjectID: String,
    sysName: String,
    interfaces: [Interface.schema],
    author: {
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        email: String
    },
    lastUpdatedBy: {
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        email: String
    }
});
deviceSchema.path('hostname').validate(hostnameEmpty, "hostname can't be empty!");
deviceSchema.path('hostname').validate(hostnameLength, 'hostname is too short!');
deviceSchema.path('ipaddress').validate(ipaddressEmpty, "IP Address can't be empty!");
deviceSchema.path('ipaddress').validate(validIP, 'IP address is not valid');

var Device = mongoose.model("Device", deviceSchema);

deviceSchema.path('hostname').validate(function (value, responseCB) {  
    Device.find({hostname: value}, function(err, hostnames){    
        if (err){      
            // console.log(err);      
            return responseCB(false);    
        }    
        if (hostnames.length) {      
            responseCB(false); 
            // validation failed    
        } else {      
            responseCB(true); 
            // validation passed    
        }  
    })
}, 'Duplicate hostname');

deviceSchema.path('ipaddress').validate(function (value, responseCB) {  
    Device.find({ipaddress: value}, function(err, ipaddresses){    
        if (err){      
            // console.log(err);      
            return responseCB(false);    
        }    
        if (ipaddresses.length) {      
            responseCB(false); 
            // validation failed    
        } else {      
            responseCB(true); 
            // validation passed    
        }  
    })
}, 'Duplicate IP');

module.exports = Device; //mongoose.model("Device", deviceSchema);