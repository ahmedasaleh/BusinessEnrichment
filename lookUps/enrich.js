var enrichmentSchemaKeyList = [
'SE_Name' , 'B_TED_2ndHost' , 'B_TED_2ndPop' , 'B_TED_BadrRelease' , 'B_TED_badrRelease' , 'B_TED_bundleId' , 'B_TED_cardType' , 'B_TED_circuitId' , 'B_TED_connType' , 'B_TED_Customer' , 'B_TED_CustProbe' , 'B_TED_Default_Coll' , 'B_TED_Elt_Device' , 'B_TED_Elt_IP' , 'B_TED_Elt_Model' , 'B_TED_Elt_POP_Gov' , 'B_TED_Elt_POP_Name' , 'B_TED_Elt_Type' , 'B_TED_Elt_Vendor' , 'B_TED_esp_bw' , 'B_TED_esp_conntype' , 'B_TED_esp_customer' , 'B_TED_esp_if' , 'B_TED_esp_order' , 'B_TED_esp_pop' , 'B_TED_ifDescrSt' , 'B_TED_IMA_Flag' , 'B_TED_intCID' , 'B_TED_interface' , 'B_TED_IntProbe' , 'B_TED_IP_Pool' , 'B_TED_IP_Pool_Name' , 'B_TED_IPSLA_COS' , 'B_TED_isbundle' , 'B_TED_isCPE' , 'B_TED_isDeviceUplink' , 'B_TED_isPopUplink' , 'B_TED_IXIA_IsDestPOP' , 'B_TED_IXIA_Mesh' , 'B_TED_IXIA_Module' , 'B_TED_IXIA_PairName' , 'B_TED_IXIA_PhysHost' , 'B_TED_IXIA_PhysTarget' , 'B_TED_IXIA_Service' , 'B_TED_IXIA_Type' , 'B_TED_Label' , 'B_TED_linkBw' , 'B_TED_linkId' , 'B_TED_linkIp' , 'B_TED_linkNum' , 'B_TED_linkType' , 'B_TED_MSAN' , 'B_TED_ProbeFrom' , 'B_TED_ProbeService' , 'B_TED_ProbeTo' , 'B_TED_provider' , 'B_TED_routerName' , 'B_TED_service' , 'B_TED_ShortLabel' , 'B_TED_Site' , 'B_TED_subCable' , 'B_TED_teCID' ,'B_TED_termination' , 'B_TED_TestTarget'
];

var extendedEnrichmentSchemaKeyList = [//this should have device community string for disco purpose
'SE_Name' , 'B_TED_2ndHost' , 'B_TED_2ndPop' , 'B_TED_BadrRelease' , 'B_TED_badrRelease' , 'B_TED_bundleId' , 'B_TED_cardType' , 'B_TED_circuitId' , 
'B_TED_connType' , 'B_TED_Customer' , 'B_TED_CustProbe' , 'B_TED_Default_Coll' , 'B_TED_Elt_Device' , 'B_TED_Elt_IP' , 'B_TED_Elt_Model' , 'B_TED_Elt_POP_Gov' , 
'B_TED_Elt_POP_Name' , 'B_TED_Elt_Type' , 'B_TED_Elt_Vendor' , 'B_TED_esp_bw' , 'B_TED_esp_conntype' , 'B_TED_esp_customer' , 'B_TED_esp_if' , 'B_TED_esp_order' , 
'B_TED_esp_pop' , 'B_TED_ifDescrSt' , 'B_TED_IMA_Flag' , 'B_TED_intCID' , 'B_TED_interface' , 'B_TED_IntProbe' , 'B_TED_IP_Pool' , 'B_TED_IP_Pool_Name' , 
'B_TED_IPSLA_COS' , 'B_TED_isbundle' , 'B_TED_isCPE' , 'B_TED_isDeviceUplink' , 'B_TED_isPopUplink' , 'B_TED_IXIA_IsDestPOP' , 'B_TED_IXIA_Mesh' , 
'B_TED_IXIA_Module' , 'B_TED_IXIA_PairName' , 'B_TED_IXIA_PhysHost' , 'B_TED_IXIA_PhysTarget' , 'B_TED_IXIA_Service' , 'B_TED_IXIA_Type' , 'B_TED_Label' , 
'B_TED_linkBw' , 'B_TED_linkId' , 'B_TED_linkIp' , 'B_TED_linkNum' , 'B_TED_linkType' , 'B_TED_MSAN' , 'B_TED_ProbeFrom' , 'B_TED_ProbeService' , 
'B_TED_ProbeTo' , 'B_TED_provider' , 'B_TED_routerName' , 'B_TED_service' , 'B_TED_ShortLabel' , 'B_TED_Site' , 'B_TED_subCable' , 'B_TED_teCID' , 
'B_TED_termination' , 'B_TED_TestTarget','CommunityString'
];

var deviceTypeList = {'R':"Router", 'S':"Switch", 'A':"Access", 'D':"DSLAM", 'M':"MSAN"};
var deviceVendorList = {'C':"Cisco", 'J':"Juniper", 'H':"Huawei", 'A':"Alcatel"};

module.exports.enrichmentFields = enrichmentSchemaKeyList;//will be used during export process
module.exports.extendedEnrichmentFields = extendedEnrichmentSchemaKeyList;//will be usd during import process
module.exports.deviceType = deviceTypeList;
module.exports.deviceVendor = deviceVendorList;
