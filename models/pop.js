var mongoose = require("mongoose");
var mongoosePaginate = require('mongoose-paginate');

//Database template setup
var popSchema = new mongoose.Schema({
    // name: String,
    shortName: String,
    gov: {type: String,default: "Unknown"},
    district: {type: String,default: "Unknown"},
    sector: {type: String,default: "Unknown"},
    popType: {type: String,default: "Unknown"},
    parentPOP: {type: String,default: "Unknown"},
    // governorate: {
    //     id: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Governorate'
    //   },
    //   acronym: String
    // },
    // district: String,
    // sector: {
    //     id: {
    //         type: mongoose.Schema.Types.ObjectId,
    //         //ref is the name of the model
    //         ref: "Sector"
    //     },
    //     name: String
    // },
    author: {
                id:{
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                email: String
    }
});

popSchema.plugin(mongoosePaginate);
var POP = mongoose.model("POP", popSchema);



module.exports = POP;//mongoose.model("POP", popSchema);
