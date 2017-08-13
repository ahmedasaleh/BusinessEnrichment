var mongoose = require("mongoose");
var Interface = require("./interface");
//Database template setup
var deviceSchema = new mongoose.Schema({
    hostname: {type: String, required: [true, 'Hostname is required']},
    ipaddress: {type: String, required: [true, 'IP Address is required']},
    communityString: { type: String, default: 'public' },
    created: { type: Date, default: Date.now },
    updated: Date,
    description: String,
    popName: {
        id:{
            type: mongoose.Schema.Types.ObjectId,
            //ref is the name of the model
            ref: "POP"
        },    
        name: String  
    },
    sector: {
        id:{                
            type: mongoose.Schema.Types.ObjectId,
            //ref is the name of the model
            ref: "Sector"
        },
        name: String
    },
    governorate: {
        id:{                
            type: mongoose.Schema.Types.ObjectId,
            //ref is the name of the model
            ref: "Governorate"
        },    
        name: String
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
    },
    interfaces: [Interface.schema]
    // interfaces: [
    //         {
    //             id: {
    //                     type: mongoose.Schema.Types.ObjectId,
    //                     //ref is the name of the model
    //                     ref: "Interface"
    //                 },
    //             name: String
    //         }
    //     ]
});

module.exports = mongoose.model("Device", deviceSchema);
