var S 	= require('string');
var enrichmentData  = require("../../lookUps/enrich");
var POP        = require("../../models/pop");
var logger            = require('../../middleware/logger');//logging component

	var link= {
			linkType : "", linkSpeed : "",service : "", provider : "", termination : "", connType : "", bundelID : "", 
			linkID : "", intCID : "", teCID : "", subCable : "", secondHost : "", secondPOP : "", linkNum : "",
			customer: "", isESP : "", espCustomer : "", espConnType : "", espEmsOrder : "", espBW : "", espPop : "", fwPOP : "", 
			fwServiceType : "", fwIPType : "" , fwVendor : ""
	}
	var device={
		vendor: "", type: "", model: "", governorate: "", parentPOP: ""
	}

//all the parser functioins goes here
var parserObj = {};
parserObj.parseIfAlias = function(alias){
	// # International link: Any link connects between TE Data GW to providers GW, identifier: INT
	// #Example: INT-IPT-TINET-ALX-10G-B5-L10-ALX_MRM_10GE_LAN PHY_017_M-SM4_IPT_10G_0007-SMW4
	// #Example: INT-Service type-Provider name-Local termination-Link type-Bundle No.-Link No.-INT CID-TE CID-Submarine cable
	
	var linkType = "", service = "", provider = "", termination = "", connType = "", bundelID = "", linkID = "", intCID = "", 
	teCID = "", subCable = "", 
	secondHost = "", //maps to B_TED_2ndHost
	secondPOP = "", //maps to B_TED_2ndPop
	linkNum = "";//maps to B_TED_linkNum
	var customer = "";//maps to B_TED_Customer
	var isESP = "0", espCustomer = "", espConnType = "", espEmsOrder = "", espBW = "", espPop = "";
	if(S(alias).isEmpty()) return null;
	if(S(alias).startsWith("INT-")){
		var enrichmentString = S(alias).trim().strip("INT-").s;
		var enrichmentFields = S(enrichmentString).splitLeft('-');
		// console.log(enrichmentFields);
		linkType="International";//map to B_TED_linkType
		service=enrichmentFields[0];//map to B_TED_service
		if(S(service).isEmpty()){
			console.log("empty service");
			service = "NA";
		}
		else if(S(service) == "IPT"){
			service = "SRV-IPT";
		}
		else if(S(service) == "LP"){
			service = "SRV-LP";
		}
		provider=enrichmentFields[1];//map to B_TED_provider
		if(S(provider).isEmpty()){
			console.log("empty provider");
			provider = "NA";
		}
		termination=enrichmentFields[2];//map to B_TED_termination
		connType=enrichmentFields[3];// map to B_TED_connType
		bundelID=enrichmentFields[4];//map to B_TED_bundleId
		linkID=enrichmentFields[5];//map B_TED_linkId
		intCID=enrichmentFields[6];//map to B_TED_intCID
		teCID=enrichmentFields[7];//map to B_TED_teCID
		subCable=enrichmentFields[8];//map to B_TED_subCable
		if(S(subCable).isEmpty()){
			console.log("empty subCable");
			subCable = "NA";
		}
		link= {
				linkType : linkType, linkSpeed:linkSpeed, service : service, provider : provider, termination : termination, connType : connType, bundelID : bundelID, 
				linkID : linkID, intCID : intCID, teCID : teCID, subCable : subCable, secondHost : secondHost, secondPOP : secondPOP, linkNum : linkNum,
				customer: customer, isESP : isESP, espCustomer : espCustomer, espConnType : espConnType, espEmsOrder : espEmsOrder, espBW : espBW, espPop : espPop, fwPOP : fwPOP
		}
	}
	else if(S(alias).contains("ALPHA-BITSTREAM")){
		// Alpha Bit Stream interfaces 
		// Example: VODA-ALPHA-BITSTREAM L1 GIG
		var enrichmentFields = S(S(alias).trim().s).splitLeft('-');
		linkType="AlphaBitstream";
		customer=enrichmentFields[0];
		linkNum=S(enrichmentFields[2]).splitLeft(' ')[1];//L1
		linkSpeed=S(enrichmentFields[2]).splitLeft(' ')[2];//GIG
		link= {
				linkType : linkType, linkSpeed:linkSpeed, service : service, provider : provider, termination : termination, connType : connType, bundelID : bundelID, 
				linkID : linkID, intCID : intCID, teCID : teCID, subCable : subCable, secondHost : secondHost, secondPOP : secondPOP, linkNum : linkNum,
				customer: customer, isESP : isESP, espCustomer : espCustomer, espConnType : espConnType, espEmsOrder : espEmsOrder, espBW : espBW, espPop : espPop, fwPOP : fwPOP
		}
	}
	else if(S(alias).contains("ESP-BITSTREAM")){
		// ESP Bit Stream interfaces 
		// Example:ETISALAT-ESP-BITSTREAM B1 2GIG
		var enrichmentFields = S(S(alias).trim().s).splitLeft('-');
		linkType="ESPBitstream";
		customer=enrichmentFields[0];
		linkNum=S(enrichmentFields[2]).splitLeft(' ')[1];//B1
		linkSpeed=S(enrichmentFields[2]).splitLeft(' ')[2];//2GIG
		link= {
				linkType : linkType, linkSpeed:linkSpeed, service : service, provider : provider, termination : termination, connType : connType, bundelID : bundelID, 
				linkID : linkID, intCID : intCID, teCID : teCID, subCable : subCable, secondHost : secondHost, secondPOP : secondPOP, linkNum : linkNum,
				customer: customer, isESP : isESP, espCustomer : espCustomer, espConnType : espConnType, espEmsOrder : espEmsOrder, espBW : espBW, espPop : espPop, fwPOP : fwPOP
		}
	}
	else if(S(alias).contains("BITSTREAM")){
		// Bit Stream interfaces 
		// Example: VODA-BITSTREAM B4 2GIG
		var enrichmentFields = S(S(alias).trim().s).splitLeft('-');
		linkType="Bitstream";
		customer=enrichmentFields[0];
		linkNum=S(enrichmentFields[1]).splitLeft(' ')[1];//B4
		linkSpeed=S(enrichmentFields[1]).splitLeft(' ')[2];//2GIG
		link= {
				linkType : linkType, linkSpeed:linkSpeed, service : service, provider : provider, termination : termination, connType : connType, bundelID : bundelID, 
				linkID : linkID, intCID : intCID, teCID : teCID, subCable : subCable, secondHost : secondHost, secondPOP : secondPOP, linkNum : linkNum,
				customer: customer, isESP : isESP, espCustomer : espCustomer, espConnType : espConnType, espEmsOrder : espEmsOrder, espBW : espBW, espPop : espPop, fwPOP : fwPOP
		}
	}
	else if(S(alias).startsWith("ESP")){
		// Description: ESP-Customer name-POP Name-Connection type-EMS Order No.-Contracted BW
		// Example: ESP-BM-ABASIA-L2VPN-45424-512
		// ESP: ESP link 
		// Customer name: BM, Borsa, ABB, etc 
		// POP name: Destination POP (ABASIA, GIZA, RAMSIS, etc) 
		// Connection type: L2VPN, L3VPN, INT, BR 
		// EMS Order number: 125454, 125985, etc 
		// Contacted BW (in Mbps): 0.25, 0.5, 1, 155, etc
		logger.error("parsing ESP link: "+ S(alias).s);
		isESP="1";
		var enrichmentString = S(alias).trim().strip("ESP-").s;
		var enrichmentFields = S(enrichmentString).splitLeft('-');
		if(enrichmentFields.length == 5){
			espCustomer= enrichmentFields[0];
			espConnType= enrichmentFields[2];
			espEmsOrder= enrichmentFields[3];
			espBW= enrichmentFields[4];
			espPop= enrichmentFields[1];
			link= {
					linkType : linkType, linkSpeed:linkSpeed, service : service, provider : provider, termination : termination, connType : connType, bundelID : bundelID, 
					linkID : linkID, intCID : intCID, teCID : teCID, subCable : subCable, secondHost : secondHost, secondPOP : secondPOP, linkNum : linkNum,
					customer: customer, isESP : isESP, espCustomer : espCustomer, espConnType : espConnType, espEmsOrder : espEmsOrder, espBW : espBW, espPop : espPop, fwPOP : fwPOP
			}
			logger.error(link);
		}
		else{
			link = null;
		}
	}
	else if(S(alias).contains("FW") && S(alias).contains("EG")){
		// Firewall interfaces 
		// Example: ALMAZA_GI_Trust_IPv4-FW02E-C-EG
		var enrichmentFields = S(S(alias).trim().s).splitLeft('_');
		linkType="FW";
		fwPOP=enrichmentFields[0];
		if(!S(enrichmentFields[1]).s == "GI" ){
			logger.error("Firewall interface " + alias+" doesn't adhere to rules");
			return null;
		}
		fwServiceType=enrichmentFields[2];//Trust
		var otherEnrichmentFields = [];
		otherEnrichmentFields = S(enrichmentFields[3]).splitLeft('-');
		fwIPType=otherEnrichmentFields[0];//IPv4
		if(!S(otherEnrichmentFields[1]).isAlphaNumeric()){
			logger.error("Firewall interface " + alias+" doesn't adhere to rules");
			return null;
		}
		fwVendor = S(otherEnrichmentFields).right(1).s;//single char 
		link= {
				linkType : linkType, linkSpeed:linkSpeed, service : service, provider : provider, termination : termination, connType : connType, bundelID : bundelID, 
				linkID : linkID, intCID : intCID, teCID : teCID, subCable : subCable, secondHost : secondHost, secondPOP : secondPOP, linkNum : linkNum,
				customer: customer, isESP : isESP, espCustomer : espCustomer, espConnType : espConnType, espEmsOrder : espEmsOrder, espBW : espBW, espPop : espPop, 
				fwPOP : fwPOP, fwVendor : fwVendor
		}
	}
	else if(S(alias).startsWith("NR") ){
		// National Roaming 
		// Example: NR_Etisalat_Data_ALZ_AUTO-N01E-DSR-EG L1 GIG
		// Example: NR_Orange_RTP_ALZ_OBR-N01O-R-EG L1 GIG
		var enrichmentFields = S(S(alias).trim().s).splitLeft('_');
		linkType="NR";
		provider=enrichmentFields[1];
		service=enrichmentFields[2];

		link= {
				linkType : linkType, linkSpeed:linkSpeed, service : service, provider : provider, termination : termination, connType : connType, bundelID : bundelID, 
				linkID : linkID, intCID : intCID, teCID : teCID, subCable : subCable, secondHost : secondHost, secondPOP : secondPOP, linkNum : linkNum,
				customer: customer, isESP : isESP, espCustomer : espCustomer, espConnType : espConnType, espEmsOrder : espEmsOrder, espBW : espBW, espPop : espPop, 
				fwPOP : fwPOP, fwVendor : fwVendor
		}
	}
	else{
		link = null;
	}

	return link;
}

parserObj.parseHostname = function(hostname){
	//hostname format: <PARENT_POP_ACRONYM>-<DEVICE_TYPE><2_DIGIT_NUMBER><DEVICE_VENDOR>-<GOVERNORATE_ACRONYM>-EG
	if(S(hostname).isEmpty()) return null;
	var nameFields = S(hostname).trim().splitLeft('-');
	var deviceDetails = null;
	var popName = null;
	var popGove = null;
	var deviceType = null;
	var deviceVendor = null;
	if(nameFields.length == 4){
		popName = nameFields[0];
		popGove = nameFields[2];
		if(S(nameFields[1]).isAlphaNumeric() && S(nameFields[1]).length == 4){
			deviceType = enrichmentData.deviceType[S(nameFields[1]).left(1).s] ;
			deviceVendor = enrichmentData.deviceVendor[S(nameFields[1]).right(1).s] ;
			deviceDetails = {popName:popName,popGove:popGove,deviceType:deviceType,deviceVendor:deviceVendor};
			console.log(deviceDetails);
		}
		else{
			deviceDetails = null;
			logger.error("device "+hostname+" name doesn't adhere to naming rules");		
		}
		// POP.findOne({shortName: popName},function(error,foundPOP){
		// 	if(error){
		// 		logger.error(error);
		// 	}
		// 	else if(foundPOP != null){
		// 		deviceDetails = {popName:foundPOP.name,popGove:popGove,deviceType:deviceType,deviceVendor:deviceVendor};
		// 	}
		// 	else{
		// 		logger.error("Can't find POP "+popGove+" while exporting enrichment data");
		// 	}
		// });
	}
	else{
		deviceDetails = null;
		logger.error("device "+hostname+" name doesn't adhere to naming rules");
	}
	return deviceDetails;
}
module.exports = parserObj;