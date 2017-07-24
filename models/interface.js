var mongoose = require("mongoose");
//Database template setup
var interfaceSchema = new mongoose.Schema({
    name: String,
    alias: String,
    index: Number,
    description: String,
    type: String,
    speed: Number,
    device: {
                type: mongoose.Schema.Types.ObjectId,
                //ref is the name of the model
                ref: "Device"
    },
    author: {
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        email: String
    }
});

module.exports = mongoose.model("Interface", interfaceSchema);
