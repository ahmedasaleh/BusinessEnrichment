var mongoose = require("mongoose");
var mongoosePaginate = require('mongoose-paginate');
//Database template setup
var rawInterfaceSchema = new mongoose.Schema({
    ifName: String,
    ifAlias: String,
    ifIndex: Number,
    ifDescr: String,
    ifType: String,
    ifSpeed: Number,
    ifHighSpeed: Number,
    ifHCInOctets: String,
    ifHCOutOctets: String,
    devType: String,
    devVendor: String,
    devModel: String,
    createdAt: { type: Date, default: Date.now },
    lastUpdate: Date,
    hostname:  String,
    ipaddress:  String,    
});


rawInterfaceSchema.index({'$**': 'text'});
rawInterfaceSchema.plugin(mongoosePaginate);
var RawInterface = mongoose.model("RawInterface", rawInterfaceSchema);
module.exports = RawInterface; 
