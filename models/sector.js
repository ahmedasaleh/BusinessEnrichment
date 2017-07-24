var mongoose = require("mongoose");
//Database template setup
var sectorSchema = new mongoose.Schema({
    name: String,
    description: String,
    author: {
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        email: String
    }
});

module.exports = mongoose.model("Sector", sectorSchema);
