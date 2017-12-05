var mongoose = require("mongoose");
var mongoosePaginate = require('mongoose-paginate');

//Database template setup
var cabinetSchema = new mongoose.Schema({
    cabinet: String,
    pop: {type: String,default: "Unknown"},
});

cabinetSchema.plugin(mongoosePaginate);
var Cabinet = mongoose.model("Cabinet", cabinetSchema);



module.exports = Cabinet;
