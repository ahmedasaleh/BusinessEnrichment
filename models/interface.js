var mongoose = require("mongoose");
//Database template setup
var interfaceSchema = new mongoose.Schema({
    name: String,
    alias: String,
    index: Number,
    description: String,
    type: String,
    speed: Number,
    adminStatus: String,
    operStatus: String,
    actualspeed: Number,
    delete: {type: Boolean, default: false},//used to mark interface for deletion
    syncCycles: {type: Number, default: 0},//used to track number of sync cycles where interface was missed
    secondHost: String,
    secondPOP: String,
    connectionType: String,
    isDeviceUpLink: {type: Boolean, default: false},
    isPOPUpLink: {type: Boolean, default: false},
    linkBandwidth: {type: Number, default: 0},
    linkID: String,
    linkIP: String,
    linkNumber: String,
    linkType: {type: String, default: "Normal"},
    provider: String,
    service: String,
    subCable: String,
    teCID: String,
    termination: String,
    created: { type: Date, default: Date.now },
    updated: Date,
    device: {
        id:{
                type: mongoose.Schema.Types.ObjectId,
                //ref is the name of the model
                ref: "Device"
        },
        hostname: String,
        ipaddress: String
    },
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

module.exports = mongoose.model("Interface", interfaceSchema);
