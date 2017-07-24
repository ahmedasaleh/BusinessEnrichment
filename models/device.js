var mongoose = require("mongoose");
//Database template setup
var deviceSchema = new mongoose.Schema({
    hostname: String,
    ipaddress: String,
    communityString: { type: String, default: 'public' },
    created: { type: Date, default: Date.now },
    description: String,
    popName: String,
    sector: {
                type: mongoose.Schema.Types.ObjectId,
                //ref is the name of the model
                ref: "Sector"
    },
    governorate: {
                type: mongoose.Schema.Types.ObjectId,
                //ref is the name of the model
                ref: "Governorate"
    },
    author: {
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        email: String
    },
    interfaces: [
            {
                type: mongoose.Schema.Types.ObjectId,
                //ref is the name of the model
                ref: "Interface"
            }
        ]
});

module.exports = mongoose.model("Device", deviceSchema);
