var mongoose = require("mongoose");
var mongoosePaginate = require('mongoose-paginate');
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
sectorSchema.plugin(mongoosePaginate);
var Sector = mongoose.model("Sector", sectorSchema);

module.exports = Sector;//mongoose.model("Sector", sectorSchema);
