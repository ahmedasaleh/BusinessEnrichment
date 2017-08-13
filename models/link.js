var mongoose = require("mongoose");
//Database template setup
var linkSchema = new mongoose.Schema({
    device1: String,
    interface1: String,
    device2: String,
    interface2: String,
    author: {
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        email: String
    }
});

module.exports = mongoose.model("Link", linkSchema);
