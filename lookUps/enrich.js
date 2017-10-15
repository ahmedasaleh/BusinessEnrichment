var enrichmentSchemaKeyList = [
'ipaddress','ifIndex','hostname','ifType','ifName','ifDescr','ifAlias','ifSpeed','ifHighSpeed','ActualSpeed','counters','type','specialService','pop','2ndpop','2ndhost','label','provisoFlag','sp_service','sp_provider','sp_termination','sp_bundleId','sp_linkNumber','sp_CID','sp_TECID','sp_subCable','sp_customer','sp_sourceCore','sp_destCore','sp_vendor','sp_speed','sp_pop','sp_fwType','sp_serviceType','sp_ipType','sp_siteCode','sp_connType','sp_emsOrder','sp_connectedBW','sp_dpiName','sp_portID','unknownFlag'
];
var bulkDeviceImportSchemaKeyList = ['ipaddress','hostname','community','type','vendor','model','sysObjectID','sysName','sysDescr'];
var deviceTypeList = {'R':"Router", 'S':"Switch", 'A':"Access", 'D':"DSLAM", 'M':"MSAN"};
var deviceVendorList = {'C':"Cisco", 'J':"Juniper", 'H':"Huawei", 'A':"Alcatel"};

module.exports.enrichmentFields = enrichmentSchemaKeyList;//will be used during export process
module.exports.bulkDeviceImportFields = bulkDeviceImportSchemaKeyList;//will be usd during import process
module.exports.deviceType = deviceTypeList;
module.exports.deviceVendor = deviceVendorList;
