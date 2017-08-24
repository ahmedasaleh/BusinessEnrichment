var S 	= require('string');

//all the parser functioins goes here
var parserObj = {};
parserObj.parseIfAlias = function(alias){
	console.log(alias);
	// # International link: Any link connects between TE Data GW to providers GW, identifier: INT
	// #Example: INT-IPT-TINET-ALX-10G-B5-L10-ALX_MRM_10GE_LAN PHY_017_M-SM4_IPT_10G_0007-SMW4
	// #Example: INT-Service type-Provider name-Local termination-Link type-Bundle No.-Link No.-INT CID-TE CID-Submarine cable
	
	var linkType = "", service = "", provider = "", termination = "", connType = "", bundelID = "", linkID = "", intCID = "", 
	teCID = "", subCable = "", 
	secondHost = "", //maps to B_TED_2ndHost
	secondPOP = "", //maps to B_TED_2ndPop
	linkNum = "";//maps to B_TED_linkNum
	
	if(S(alias).startsWith("INT-")){
		var enrichmentString = S(alias).trim().strip("INT-").s;
		var enrichmentFields = S(enrichmentString).splitLeft('-');
		console.log(enrichmentFields);
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
		// // #$circuitID=$ifDescTokens[5];
		// // #$service=$ifDescTokens[6];
		// // #$linkBw=$ifDescTokens[7];	# for the international links the BW will be parsed from the interface description
		// // #$connType="";
	}
	var internationalLink= {
			linkType : linkType, service : service, provider : provider, termination : termination, connType : connType, bundelID : bundelID, 
			linkID : linkID, intCID : intCID, teCID : teCID, subCable : subCable, secondHost : secondHost, secondPOP : secondPOP, linkNum : linkNum
	}
	return internationalLink;
}

module.exports = parserObj;