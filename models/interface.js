var mongoose = require("mongoose");
var mongoosePaginate = require('mongoose-paginate');
//Database template setup
var interfaceSchema = new mongoose.Schema({
    ifName: String,
    ifAlias: String,
    ifIndex: Number,
    ifDescr: String,
    ifType: String,
    ifSpeed: Number,
    ifHighSpeed: Number,
    counters: Number,
    type: String, //Local or WAN
    specialService: String,
    secondPOP: String,
    secondHost: String,
    secondInterface: String,
    label: String,
    provisoFlag: Number,
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
sp_speed: Number,
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
unknownFlag: Number,    
    adminStatus: String,
    operStatus: String,
    actualspeed: Number,
    // delete: {type: Boolean, default: false},//used to mark interface for deletion
    syncCycles: {type: Number, default: 0},//used to track number of sync cycles where interface was missed
    // connectionType: String,
    // isDeviceUpLink: {type: Boolean, default: false},
    // isPOPUpLink: {type: Boolean, default: false},
    // linkBandwidth: {type: Number, default: 0},
    // linkID: String,
    // linkIP: String,
    // linkNumber: String,
    // linkType: {type: String, default: "Normal"},
    // provider: String,
    // service: String,
    // subCable: String,
    // teCID: String,
    // termination: String,
    createdAt: { type: Date, default: Date.now },
    lastUpdate: Date,
    hostname:  String,
    ipaddress:  String,
    pop: String //device pop
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

interfaceSchema.index({'$**': 'text'});
interfaceSchema.plugin(mongoosePaginate);
var Interface = mongoose.model("Interface", interfaceSchema);
module.exports = Interface; //mongoose.model("Interface", interfaceSchema);
