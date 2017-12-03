// var enrichmentSchemaKeyList = [
// 'ipaddress','ifIndex','hostname','ifType','ifName','ifDescr','ifAlias','ifSpeed','ifHighSpeed','ActualSpeed','counters','type','specialService','pop','2ndpop','2ndhost','2ndinterface','label','provisoFlag','sp_service','sp_provider','sp_termination','sp_bundleId','sp_linkNumber','sp_CID','sp_TECID','sp_subCable','sp_customer','sp_sourceCore','sp_destCore','sp_vendor','sp_speed','sp_pop','sp_fwType','sp_serviceType','sp_ipType','sp_siteCode','sp_connType','sp_emsOrder','sp_connectedBW','sp_dpiName','sp_portID','unknownFlag'
// ];
var bulkDeviceImportSchemaKeyList = ['ipaddress','hostname','community'];
var deviceTypeList = {'R':"Router", 'S':"Switch", 'A':"Access", 'D':"DSLAM", 'M':"MSAN", 'G':"GPON"};
var deviceVendorList = {'C':"Cisco", 'J':"Juniper", 'H':"Huawei", 'A':"Alcatel", 'B':"Brocade", 'Z':"ZTE"};
var interfaceAllowedFields = ['ifName','ifAlias','ifIndex','ifDescr','ifType','ifTypeStr','ifSpeed','ifHighSpeed','counters','type','specialService','secondPOP','secondHost','secondInterface','label','provisoFlag','noEnrichFlag','sp_service','sp_provider','sp_termination','sp_bundleId','sp_linkNumber','sp_CID','sp_TECID','sp_subCable','sp_customer','sp_sourceCore','sp_destCore','sp_vendor','sp_speed','sp_pop','sp_fwType','sp_serviceType','sp_ipType','sp_siteCode','sp_connType','sp_emsOrder','sp_connectedBW','sp_dpiName','sp_portID','unknownFlag','adminStatus','operStatus','actualspeed','syncCycles','hostname','ipaddress','pop','lastUpdate','lastSyncTime','pollInterval','devType','devVendor','devModel','speedCat','isUpLink','parentPOP','deviceCabinetName','governorate','district','sector'];
var interfaceExportedFields = "ipaddress,hostname,devType,devVendor,devModel,ifIndex,ifType,ifTypeStr,ifName,ifDescr,ifAlias,ifSpeed,ifHighSpeed,ActualSpeed,counters,type,specialService,pop,secondPOP,secondHost,secondInterface,label,provisoFlag,unknownFlag,noEnrichFlag,pollInterval,sp_service,sp_provider,sp_termination,sp_bundleId,sp_linkNumber,sp_CID,sp_TECID,sp_subCable,sp_customer,sp_sourceCore,sp_destCore,sp_vendor,sp_speed,sp_pop,sp_fwType,sp_serviceType,sp_ipType,sp_siteCode,sp_connType,sp_emsOrder,sp_connectedBW,sp_dpiName,sp_portID,lastUpdate";

// module.exports.enrichmentFields = enrichmentSchemaKeyList;//will be used during export process
module.exports.bulkDeviceImportFields = bulkDeviceImportSchemaKeyList;//will be usd during import process
module.exports.deviceType = deviceTypeList;
module.exports.deviceVendor = deviceVendorList;
module.exports.interfaceAllowedFields = interfaceAllowedFields;
module.exports.interfaceExportedFields = interfaceExportedFields;
