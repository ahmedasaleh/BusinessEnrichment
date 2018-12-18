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

parserObj.parseHostname = function(hostname){
	//hostname format: <POP_SHORTNAME || CABINET_NAME>-<DEVICE_TYPE><2_DIGIT_NUMBER><DEVICE_VENDOR>-<GOVERNORATE_ACRONYM>-EG
	if(S(hostname).isEmpty()) return null;
	var nameFields = S(hostname).trim().splitRight('-',3);
	var deviceDetails = null;
	var devicePOPName = null;
	var popGove = null;
	var deviceType = null;
	// var deviceVendor = null;

	if(nameFields.length >= 4){
		devicePOPName = nameFields[0];
		popGove = nameFields[2];
		// deviceType = nameFields[1]
		if(S(nameFields[1]).length > 4){

			if(S(nameFields[1]).length == 5){
				deviceType = enrichmentData.deviceType[S(nameFields[1]).left(2).s] ;
					
			}

			if(S(nameFields[1]).length == 6){
				deviceType = enrichmentData.deviceType[S(nameFields[1]).left(3).s] ;
				
			}
		}
		else
		{
			deviceType = enrichmentData.deviceType[S(nameFields[1]).left(1).s] ;
			
		}	

		//deviceType = enrichmentData.deviceType[S(nameFields[1]).left(1).s] ;
		deviceVendor = enrichmentData.deviceVendor[S(nameFields[1]).right(1).s] ;

		deviceDetails = {devicePOPName:devicePOPName,popGove:popGove,deviceType:deviceType,deviceVendor:deviceVendor}
	}
	return deviceDetails;
}

module.exports = parserObj;