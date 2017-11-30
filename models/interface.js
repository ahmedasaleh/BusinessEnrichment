var mongoose = require("mongoose");
var mongoosePaginate = require('mongoose-paginate');
//Database template setup
var interfaceSchema = new mongoose.Schema({
    ifName: String,
    ifAlias: String,
    ifIndex: Number,
    ifDescr: String,
    ifType: String,
    ifTypeStr: String,
    ifSpeed: Number,
    ifHighSpeed: Number,
    ifHCInOctets: String,
    ifHCOutOctets: String,
    pollInterval: String,
    counters: Number,
    type: String, //Local or WAN
    specialService: String,
    secondPOP: String,
    secondHost: String,
    secondInterface: String,
    label: String,
    provisoFlag: Number,
    noEnrichFlag: Number,
    devType: String,
    devVendor: String,
    devModel: String,
    sp_service: String,
    sp_provider: String,
    sp_termination: String,
    sp_bundleId: String,
    sp_linkNumber: String,
    sp_CID: String,
    sp_TECID: String,
    sp_subCable: String,
    sp_customer: String,
    sp_sourceCore: String,
    sp_destCore: String,
    sp_vendor: String,
    sp_speed: String,
    sp_pop: String,
    sp_fwType: String,
    sp_serviceType: String,
    sp_ipType: String,
    sp_siteCode: String,
    sp_connType: String,
    sp_emsOrder: String,
    sp_connectedBW: String,
    sp_dpiName: String,
    sp_portID: String,
    sp_preNumber: String,
    speedCat: String,
    unknownFlag: Number,    
    adminStatus: String,
    operStatus: String,
    actualspeed: String,
    isUpLink: {type: String,default: "0"},
    parentPOP: String,
    syncCycles: {type: Number, default: 0},//used to track number of sync cycles where interface was missed
    createdAt: { type: Date, default: Date.now },
    lastUpdate: Date,
    lastSyncTime: Date,
    hostname:  String,
    ipaddress:  String,
    pop: String //device pop
    // delete: {type: Boolean, default: false},//used to mark interface for deletion
    // author: {
    //     id:{
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: "User"
    //     },
    //     email: String
    // },
    // lastUpdatedBy: {
    //     id:{
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: "User"
    //     },
    //     email: String
    // }
    
});


// interfaceSchema.index({'$**': 'text'});
interfaceSchema.plugin(mongoosePaginate);
var Interface = mongoose.model("Interface", interfaceSchema);
module.exports = Interface; //mongoose.model("Interface", interfaceSchema);
