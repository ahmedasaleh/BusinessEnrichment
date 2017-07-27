var mongoose = require("mongoose");
//Database template setup
var governorateSchema = new mongoose.Schema({
    name: String,
    acronym: String,
    author: {
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        email: String
    }
});

module.exports = mongoose.model("Governorate", governorateSchema);
