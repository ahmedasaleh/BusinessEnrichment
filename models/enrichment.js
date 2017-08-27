var mongoose = require("mongoose");
var mongooseToCsv = require("mongoose-to-csv");
var enrichmentData  = require("../lookUps/enrich");
// var importEnrichment 	= require("../middleware/import_enrichment");
var enrichmentSchema = new mongoose.Schema({
	SE_Name: String,	
	B_TED_2ndHost: String,
	B_TED_2ndPop: String,
	B_TED_BadrRelease: {type: Number,default: 1},
	B_TED_badrRelease: String,
	B_TED_bundleId: String,
	B_TED_cardType: String,
	B_TED_circuitId: String,
	B_TED_connType: String,
	B_TED_Customer: String,
	B_TED_CustProbe: String,
	B_TED_Default_Coll: Number,
	B_TED_Elt_Device: String,
	B_TED_Elt_IP: String,
	B_TED_Elt_Model: String,
	B_TED_Elt_POP_Gov: String,
	B_TED_Elt_POP_Name: String,
	B_TED_Elt_Type: String,
	B_TED_Elt_Vendor: String,
	B_TED_esp_bw: Number,
	B_TED_esp_conntype: String,
	B_TED_esp_customer: String,
	B_TED_esp_if: Number,
	B_TED_esp_order: Number,
	B_TED_esp_pop: String,
	B_TED_ifDescrSt: String,
	B_TED_IMA_Flag: String,
	B_TED_intCID: String,
	B_TED_interface: String,
	B_TED_IntProbe: String,
	B_TED_IP_Pool: String,
	B_TED_IP_Pool_Name: String,
	B_TED_IPSLA_COS: String,
	B_TED_isbundle: Number,
	B_TED_isCPE: String,
	B_TED_isDeviceUplink: {type: Boolean, default: false},
	B_TED_isPopUplink: {type: Boolean, default: false},
	B_TED_Label: String,
	B_TED_linkBw: Number,
	B_TED_linkId: String,
	B_TED_linkIp: String,
	B_TED_linkNum: String,
	B_TED_linkType: String,
	B_TED_MSAN: String,
	B_TED_ProbeFrom: String,
	B_TED_ProbeService: String,
	B_TED_ProbeTo: String,
	B_TED_provider: String,
	B_TED_routerName: String,
	B_TED_service: String,
	B_TED_ShortLabel: String,
	B_TED_Site: String,
	B_TED_subCable: String,
	B_TED_teCID: String,
	B_TED_termination: String,
	B_TED_TestTarget: String
}); 

enrichmentSchema.plugin(mongooseToCsv,{headers: enrichmentData.enrichmentFields});

module.exports = mongoose.model("Enrichment", enrichmentSchema);
