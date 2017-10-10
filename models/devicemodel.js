var mongoose = require("mongoose");
var mongoosePaginate = require('mongoose-paginate');
//Database template setup
var deviceModelSchema = new mongoose.Schema({
    oid: String,
    type: String,
    vendor: String,
    model: String,
    isCPE: {type: Boolean, default: false}
});
deviceModelSchema.plugin(mongoosePaginate);
var DeviceModel = mongoose.model("DeviceModel", deviceModelSchema);

module.exports = DeviceModel;
