var mongoose = require("mongoose");
//Database template setup
var teMSANInfoSchema = new mongoose.Schema({
    msanCode: String,
    teMngIP: String,
    TEDataMngIP: String,
    teSector: String,
    teDistrict: String
});

module.exports = mongoose.model("TeMSANInfo", teMSANInfoSchema);
