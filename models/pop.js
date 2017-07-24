var mongoose = require("mongoose");
//Database template setup
var popSchema = new mongoose.Schema({
    name: String,
    sector: {
                type: mongoose.Schema.Types.ObjectId,
                //ref is the name of the model
                ref: "Sector"
    },
    author: {
                id:{
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                email: String
    }
});

module.exports = mongoose.model("POP", popSchema);
