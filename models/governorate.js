var mongoose = require("mongoose");
var mongoosePaginate = require('mongoose-paginate');
//Database template setup
var governorateSchema = new mongoose.Schema({
    name: {type: String, required: [true,'Name is required']},
    acronym: String,
    author: {
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        email: String
    }
});

governorateSchema.plugin(mongoosePaginate);

var Governorate = mongoose.model("Governorate", governorateSchema);
module.exports = Governorate;//mongoose.model("Governorate", governorateSchema);
