var S 	= require('string');
var enrichmentData  = require("../../lookUps/enrich");
var POP        = require("../../models/pop");
var Link        = require("../../models/link");
var logger            = require('../../middleware/logger');//logging component

	var link= {
			specialService : '', provisoFlag : '', sp_service : '', sp_provider : '', sp_termination : '', sp_connType : '', sp_bundleId : '', sp_linkNumber : '', 
			sp_CID : '', sp_TECID : '', sp_subCable : '', unknownFlag : '' , label : '' , sp_customer : '', sp_speed : '' , sp_pop : '' , sp_connType : '' , 
			sp_emsOrder : '' , sp_connectedBW : '', sp_fwType : '' , sp_serviceType : '' , sp_ipType : '' , sp_vendor : '', sp_sourceCore : '', sp_destCore : '', 
			label : '', sp_siteCode: '', sp_preNumber: '', sp_portID: ''
	}
	var device={
		vendor: "", type: "", model: "", governorate: "", parentPOP: ""
	}

//all the parser functioins goes here
var parserObj = {};
parserObj.parseIfAlias = function(ifAlias,hostname,ifName,ifIndex,ipaddress){
	if(S(ifAlias).isEmpty()) return null;
	var interfaceName = S(ifName).trim().s;
	if(S(interfaceName)){
		interfaceName = S(interfaceName).s.toLowerCase();
	}
	var alias = S(ifAlias).trim().s;
	var provisoFlag=1;
	var unknownFlag = 0;
	var	noEnrichFlag=0;			

	if(S(alias).startsWith("INT-")){
		// # Patterns	INT-P1-P2-P3-P4-P5-P6-P7-P8-P9
		// # Patterns description	P1: Service
		// # P2: Provider Name
		// # P3: Termination
		// # P4: Connection Type
		// # P5: Bundle ID
		// # P6: Link Number
		// # P7: INT CID
		// # P8: TE CID
		// # P9: Sub Cable
		// # Examples	INT-IPT-Cogent-ALX-10GIG-B2-NB-L22-1_300050661-EIG_IPT_10G_0019-EIG
		// # INT-IPT-AIRTEL-ALX-10G-NB-L2-ALX_MBB_10GbE_002_M-IMW_IPT_10G_0013-IMWE
		var specialService="International";
		var enrichmentString = S(alias).strip("INT-").s;
		var enrichmentFields = S(enrichmentString).splitLeft('-');
		var sp_service="Unknown",sp_provider="Unknown",sp_termination="Unknown",sp_connType="Unknown",sp_bundleId="Unknown",sp_linkNumber="Unknown",
		sp_CID="Unknown",sp_TECID="Unknown",sp_subCable="Unknown";

		if(enrichmentFields.length == 9){
			sp_service=enrichmentFields[1] || "Unknown";
			sp_provider=enrichmentFields[2] || "Unknown";
			sp_termination=enrichmentFields[3] || "Unknown";
			sp_connType=enrichmentFields[4] || "Unknown";
			sp_bundleId=enrichmentFields[5] || "Unknown";
			sp_linkNumber=enrichmentFields[6] || "Unknown";
			sp_CID=enrichmentFields[7] || "Unknown";
			sp_TECID=enrichmentFields[8] || "Unknown";
			sp_subCable=enrichmentFields[9] || "Unknown";
		}
		else if(enrichmentFields.length != 9 ){
			unknownFlag = 1;
		}
				
		var label=hostname+" "+ifName;

		link= {
					specialService : specialService, provisoFlag : provisoFlag,sp_service : sp_service, sp_provider : sp_provider, sp_termination : sp_termination, 
					sp_connType : sp_connType, sp_bundleId : sp_bundleId, sp_linkNumber : sp_linkNumber, sp_CID : sp_CID, sp_TECID : sp_TECID, 
					sp_subCable : sp_subCable, unknownFlag : unknownFlag, label : label
		}
	}
	else if(S(alias).contains("ALPHA-BITSTREAM")){
		// # Condition	Contain (_ALPHA-BITSTREAM)
		// # Patterns	P1-ALPHA-BITSTREAM P2 P3
		// # Patterns description	
		// # P1: Customer
		// # P2: Link Number
		// # P3: Speed
		// # Examples	VODA-ALPHA-BITSTREAM L1 GIG
		// # LDN-ALPHA-BITSTREAM L1 GIG
		// # ETISALAT-ALPHA-BITSTREAM L1 GIG

		var specialService="Alpha-Bitstream";
		var enrichmentString = S(alias).replaceAll(' ','-');//trying to unify byremoving spaces
		var enrichmentFields = S(enrichmentString).splitLeft('-');
		var sp_customer="Unknown",sp_linkNumber="Unknown",sp_speed="Unknown";

		if(enrichmentFields.length == 5){
			sp_customer=enrichmentFields[0] || "Unknown";
			sp_linkNumber=enrichmentFields[3] || "Unknown";
			sp_speed=enrichmentFields[4] || "Unknown";
		}
		else{
			unknownFlag = 1;
		}
		link= {
				specialService:specialService,provisoFlag:provisoFlag,unknownFlag:unknownFlag,sp_customer : sp_customer, sp_linkNumber:sp_linkNumber, 
				sp_speed : sp_speed
		}
	}
	else if(S(alias).contains("ESP-BITSTREAM")){
		// # Condition	Contain (-ESP-BITSTREAM)
		// # Patterns	P1-ESP-BITSTREAM P2 P3
		// # Patterns description	P1: Customer
		// # P2: Link Number
		// # P3: Speed
		// # Examples	ETISALAT-ESP-BITSTREAM B1 2GIG
		var specialService = "SH-Bitstream";
		var enrichmentString = S(alias).replaceAll(' ','-');//trying to unify byremoving spaces
		var enrichmentFields = S(enrichmentString).splitLeft('-');
		var sp_customer="Unknown",sp_linkNumber="Unknown",sp_speed="Unknown";
		if(enrichmentFields.length == 5){
			sp_customer=enrichmentFields[0] || "Unknown";
			sp_linkNumber=enrichmentFields[3] || "Unknown";
			sp_speed=enrichmentFields[4] || "Unknown";
		}
		else{
			unknownFlag = 1;
		}
		link= {
				specialService:specialService,provisoFlag:provisoFlag,unknownFlag:unknownFlag,sp_customer:sp_customer, sp_linkNumber:sp_linkNumber, 
				sp_speed : sp_speed
		}

	}
	else if(S(alias).contains("BITSTREAM")){
		// # Condition	Contain (-BITSTREAM)
		// # Patterns	P1-BITSTREAM P2 P3
		// # Patterns description	P1: Customer
		// # P2: Link Number
		// # P3: Speed
		// # Examples	VODA-BITSTREAM L6 1GIG
		// # NOOR-BITSTREAM L3 1GIG
		// # LDN-BITSTREAM L6 1GIG
		// # ETISALAT-BITSTREAM L2 1GIG

		var specialService = "Bitstream";
		var enrichmentString = S(alias).replaceAll(' ','-');//trying to unify byremoving spaces
		var enrichmentFields = S(enrichmentString).splitLeft('-');
		var sp_customer="Unknown",sp_linkNumber="Unknown",sp_speed="Unknown";
		if(enrichmentFields.length == 4){
			sp_customer=enrichmentFields[0] || "Unknown";
			sp_linkNumber=enrichmentFields[2] || "Unknown";
			sp_speed=enrichmentFields[3] || "Unknown";
		}
		else{
			unknownFlag = 1;
		}
		link= {
				specialService:specialService,provisoFlag:provisoFlag,unknownFlag:unknownFlag,sp_customer : sp_customer, sp_linkNumber:sp_linkNumber, 
				sp_speed:sp_speed
		}
	}
	else if(S(alias).startsWith("ESP")){
		// # Condition	Start with (ESP-*)
		// # Patterns	ESP-P1-P2-P3-P4-P5
		// # Patterns description	
		// # P1: Customer Name
		// # P2: POP Name
		// # P3: Connection Type
		// # P4: EMS Order Number
		// # P5: Connected BW
		// # Examples	ESP-TE_ACCESS-RAMSIS-INT-1-100

		var specialService="ESP";
		var enrichmentFields = S(alias).splitLeft('-');
		var sp_customer="Unknown",sp_pop="Unknown",sp_connType="Unknown",sp_emsOrder="Unknown",sp_connectedBW="Unknown";
		if(enrichmentFields.length == 6){
			sp_customer=enrichmentFields[1] || "Unknown";
			sp_pop=enrichmentFields[2] || "Unknown";
			sp_connType=enrichmentFields[3] || "Unknown";
			sp_emsOrder=enrichmentFields[4] || "Unknown";
			sp_connectedBW=enrichmentFields[5] || "Unknown";
		}
		else{
			unknownFlag = 1;
		}
		link= {
				specialService : specialService, provisoFlag:provisoFlag, unknownFlag : unknownFlag, sp_customer : sp_customer, sp_pop : sp_pop, 
				sp_connType : sp_connType, sp_emsOrder : sp_emsOrder, sp_connectedBW : sp_connectedBW
		}

	}
	else if(S(alias).contains("FW") && S(alias).contains("EG")){
		// #Condition	Contain (*-FW*-*-EG)
		// #Patterns	P1_P2_P3_P4-FW00P5-*-EG
		// #Patterns description	
		// #P1: POP Name
		// #P2: GI
		// #P3:Servise Type
		// #P4:  IP Type 
		// #P5: Vendor  (only 1 character)
		// #Examples	ALMAZA_GI_Trust_IPv4-FW02E-C-EG

		var specialService="Firewall";
		var enrichmentString = S(alias).replaceAll('_','-');//trying to unify byremoving spaces
		var enrichmentFields = S(enrichmentString).splitLeft('-');
		var sp_pop="Unknown",sp_fwType="Unknown",sp_serviceType="Unknown",sp_ipType="Unknown",sp_vendor="Unknown";
		if(enrichmentFields.length == 7){
				var sp_pop=enrichmentFields[0] || "Unknown";;
				var sp_fwType=enrichmentFields[1] || "Unknown";;
				var sp_serviceType=enrichmentFields[2] || "Unknown";;
				var sp_ipType=enrichmentFields[3] || "Unknown";;
				var sp_vendor=enrichmentFields[4].right(1).s || "Unknown";; 
		}
		else{
			unknownFlag = 1;
		}

		link= {
				specialService : specialService, provisoFlag:provisoFlag, unknownFlag : unknownFlag, sp_pop : sp_pop, sp_fwType : sp_fwType, 
				sp_serviceType : sp_serviceType, sp_ipType : sp_ipType, sp_vendor : sp_vendor
		}
	}
	else if(S(alias).startsWith("NR") ){
		///////////////////////////////////////
		// # Condition	Start with (NR_)
		// # Patterns	NR_P1_P2_P3_P4-N00P5-*-EG P6 P7
		// # Patterns description	
		// # P1: Provider
		// # P2: Service
		// # P3: Source Core
		// # P4: Destination Core
		// # P5: Vendor  (only 1 character)
		// # P6: Link Number
		// # P7: Speed
		// # Examples	NR_Etisalat_Data_ALZ_AUTO-N01E-DSR-EG L1 GIG
		// # NR_Orange_RTP_ALZ_OBR-N01O-R-EG L1 GIG
		var specialService = "National-Roaming";
		var enrichmentString = S(alias).replaceAll('_','-');//trying to unify by removing underscore
		enrichmentString = S(enrichmentString).replaceAll(' ','-');//trying to unify by removing spaces
		var enrichmentFields = S(enrichmentString).splitLeft('-');
		var sp_provider = "Unknown",sp_service="Unknown",sp_sourceCore="Unknown",sp_destCore="Unknown",sp_vendor="Unknown",sp_linkNumber="Unknown",sp_speed="Unknown";
				
		if(enrichmentFields.length == 10){
			sp_provider=enrichmentFields[1] || "Unknown";
			sp_service=enrichmentFields[2] || "Unknown";
			sp_sourceCore=enrichmentFields[3] || "Unknown";
			sp_destCore=enrichmentFields[4] || "Unknown";
			sp_vendor=enrichmentFields[5].right(1).s || "Unknown";
			sp_linkNumber=enrichmentFields[8] || "Unknown";
			sp_speed=enrichmentFields[9] || "Unknown";
		}
		else{
			unknownFlag = 1;
		}
		var label = hostname+" "+ifName;

		link= {
				specialService:specialService,provisoFlag : provisoFlag, unknownFlag:unknownFlag, sp_provider : sp_provider, sp_service : sp_service, 
				sp_sourceCore : sp_sourceCore, sp_destCore : sp_destCore, sp_vendor : sp_vendor, sp_linkNumber : sp_linkNumber, sp_speed : sp_speed, label : label
		}
	}
	// # LTE Interfaces
	else if(S(alias).contains("ENP")){		
		// # Condition	Contain (*_ENB*-E*-*-EG) or Contain (ENB)
		// # Patterns	P1_ENB_P2-E00P3-*-EG P4 P5
		// # Patterns description	
		// # P1: POP Name
		// # P2: Site Code
		// # P3: Vendor  (only 1 character)
		// # P4: Link Number
		// # P5: Speed
		// # Examples	MONEIB_ENB_LCaiG31109-E01N-C-EG L1 GIG
		// # MONEIB_ENB_LCaiG31109_S1-MME-E01N-C-EG --> wrong example to be validated

		var specialService="LTE";
		var enrichmentString = S(alias).replaceAll('_','-');//trying to unify by removing underscore
		enrichmentString = S(enrichmentString).replaceAll(' ','-');//trying to unify by removing spaces
		var enrichmentFields = S(enrichmentString).splitLeft('-');
		var sp_pop="Unknown",sp_siteCode="Unknown",sp_vendor="Unknown",sp_linkNumber="Unknown",sp_speed="Unknown";
		if(enrichmentFields.length == 8){
			sp_pop=enrichmentFields[0] || "Unknown";
			sp_siteCode=enrichmentFields[2] || "Unknown";
			sp_vendor=enrichmentFields[3].right(1).s || "Unknown";
			sp_linkNumber=enrichmentFields[6] || "Unknown";
			sp_speed=enrichmentFields[7] || "Unknown";
		}
		else{
			unknownFlag=1;
		}
		link= {
				specialService:specialService,provisoFlag : provisoFlag, unknownFlag:unknownFlag, sp_pop:sp_pop,sp_siteCode:sp_siteCode,sp_vendor:sp_vendor,
				sp_linkNumber:sp_linkNumber,sp_speed:sp_speed
		}
	}
	// # EPC
	else if(S(alias).contains("EPC")){		
		// # Condition	Contain (* EPC*)
		// # Patterns	P1 EPC P2 P3
		// # Patterns description	
		// # P1: Provider
		// # P2: Link Number
		// # P3: Speed
		// # Examples	Ericson EPC L1 10GIG
		// # Ericson EPC L2 10GIG
		
		var specialService="EPC";
		var enrichmentFields = S(alias).splitLeft(' ');
		var sp_provider="Unknown",sp_linkNumber="Unknown",sp_speed="Unknown";
		if(enrichmentFields.length == 4){
			sp_provider=enrichmentFields[0] || "Unknown";
			sp_linkNumber=enrichmentFields[2] || "Unknown";
			sp_speed=enrichmentFields[3] || "Unknown";
		}
		else{
			unknownFlag=1;
		}

		link= {
				specialService:specialService,provisoFlag : provisoFlag, unknownFlag:unknownFlag, sp_provider:sp_provider,sp_linkNumber:sp_linkNumber,
				sp_speed:sp_speed
		}
	}
	// # DPI
	else if(S(alias).contains("PRE1") ){		
		// # Condition	Start with (POP Name-PRE1*) OR Contain (PRE1)
		// # Patterns	P1-P2-P3
		// # Patterns description	
		// # P1: POP name
		// # P2: Pre Number
		// # P3: Port IDs
		// # Examples	MAADI2-PRE1-1/1/INT
		// # MAADI2-PRE1-1/2/EXT

		var specialService="DPI";
		var enrichmentFields = S(alias).splitLeft('-');
		var sp_pop="Unknown",sp_preNumber="Unknown",sp_portID="Unknown";
		if(enrichmentFields.length == 3){
			sp_pop=enrichmentFields[0];
			sp_preNumber=S(enrichmentFields[1]).chompLeft('PRE').s; 
			sp_portID=enrichmentFields[2];
		}
		else{
			unknownFlag = 1;
		}
		link= {
				specialService:specialService,provisoFlag : provisoFlag, unknownFlag:unknownFlag, sp_pop:sp_pop,sp_preNumber:sp_preNumber,
				sp_portID:sp_portID
		}
	}
	else if(
		(S(interfaceName) &&
		S(interfaceName).startsWith("100ge")  || 
		S(interfaceName).startsWith("ae") || 
		S(interfaceName).startsWith("at") || 
		S(interfaceName).startsWith("bundle-ether") || 
		S(interfaceName).startsWith("e1") || 
		S(interfaceName).startsWith("et") || 
		S(interfaceName).startsWith("fa") || 
		S(interfaceName).startsWith("fe-") || 
		S(interfaceName).startsWith("ge-") || 
		S(interfaceName).startsWith("gi") || 
		S(interfaceName).startsWith("hundredgige") || 
		new RegExp('/^[0-9]+\/[0-9]+\/[0-9]+/').test(S(interfaceName)) ||// number/nnumbe/number
		S(interfaceName).startsWith("po") || 
		S(interfaceName).startsWith("se") || 
		S(interfaceName).startsWith("so-") || 
		S(interfaceName).startsWith("te") || 
		S(interfaceName).startsWith("xe-")) && 
		!S(interfaceName).contains('.') &&
		!S(alias).contains("esp")  && 
		!S(alias).contains("vpn")  && 
		!S(alias).contains("internet") && 
		!S(alias).contains("mpls") ){
			provisoFlag=1;
			noEnrichFlag=1;			
	}
	else{
		link = null;
	}
	if(unknownFlag==1){
		logger.warn(hostname+" "+ipaddress+" : special services interface with invalid description - Service: "+specialService+" - ifAlias: "+ifAlias+" - ifName: "+ifName+" - ifIndex: "+ifIndex);
	}
	if(noEnrichFlag==1){
		logger.warn(hostname+" "+ipaddress+" : Interface with no enrichment has been marked to import into proviso - ifAlias: "+ifAlias+" - ifName: "+ifName+" - ifIndex: "+ifIndex);
	}

	return link;
}

parserObj.parseHostname = function(hostname){
	//hostname format: <PARENT_POP_ACRONYM>-<DEVICE_TYPE><2_DIGIT_NUMBER><DEVICE_VENDOR>-<GOVERNORATE_ACRONYM>-EG
	if(S(hostname).isEmpty()) return null;
	var nameFields = S(hostname).trim().splitLeft('-');
	var deviceDetails = null;
	var popShortName = null;
	var popGove = null;
	var deviceType = null;
	var deviceVendor = null;

	if(nameFields.length == 4){
		popShortName = nameFields[0];
		popGove = nameFields[2];
		if(S(nameFields[1]).isAlphaNumeric() && S(nameFields[1]).length == 4){
			deviceType = enrichmentData.deviceType[S(nameFields[1]).left(1).s] ;
			deviceVendor = enrichmentData.deviceVendor[S(nameFields[1]).right(1).s] ;
			deviceDetails = {popName:popShortName,popGove:popGove,deviceType:deviceType,deviceVendor:deviceVendor};
			// console.log(deviceDetails);
			// POP.findOne({shortName: popShortName},function(error,foundPOP){
			// 	if(error){
			// 		logger.error(error);
			// 	}
			// 	else if(foundPOP != null){
			// 		deviceDetails = {popName:foundPOP.name,popGove:popGove,deviceType:deviceType,deviceVendor:deviceVendor,sector:foundPOP.sector.name};
			// 	}
			// 	else{
			// 		deviceDetails = {popName:popShortName,popGove:popGove,deviceType:deviceType,deviceVendor:deviceVendor,sector:foundPOP.sector.name};
			// 		logger.error("Can't find POP "+popGove+" while exporting enrichment data");
			// 	}
			// 	console.log("pop: "+foundPOP);
			// });
		}
		else{
			deviceDetails = null;
			logger.error("device "+hostname+" name doesn't adhere to naming rules");		
		}
	}
	else{
		deviceDetails = null;
		logger.error("device "+hostname+" name doesn't adhere to naming rules");
	}
	return deviceDetails;
}
module.exports = parserObj;