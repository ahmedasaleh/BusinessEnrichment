var mongoose = require("mongoose");
//Database template setup
var popSchema = new mongoose.Schema({
    name: String,
    shortName: String,
    governorateAcro: {
        id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Governorate'
      },
      acronym: String
    },
    district: String,
    sector: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            //ref is the name of the model
            ref: "Sector"
        },
        name: String
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
