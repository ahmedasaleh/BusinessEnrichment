var mongoose    = require('mongoose');
var fs          = require('fs');
var Enrichment  = require("../models/enrichment");
var lineList    = fs.readFileSync('mytest.csv').toString().split('\n');
lineList.shift(); // Shift the headings off the list of records.

var schemaKeyList = [
'SE_Name' , 'B_TED_2ndHost' , 'B_TED_2ndPop' , 'B_TED_BadrRelease' , 'B_TED_badrRelease' , 'B_TED_bundleId' , 'B_TED_cardType' , 'B_TED_circuitId' , 'B_TED_connType' , 'B_TED_Customer' , 'B_TED_CustProbe' , 
'B_TED_Default_Coll' , 'B_TED_Elt_Device' , 'B_TED_Elt_IP' , 'B_TED_Elt_Model' , 'B_TED_Elt_POP_Gov' , 'B_TED_Elt_POP_Name' , 'B_TED_Elt_Type' , 'B_TED_Elt_Vendor' , 'B_TED_esp_bw' , 
'B_TED_esp_conntype' , 'B_TED_esp_customer' , 'B_TED_esp_if' , 'B_TED_esp_order' , 'B_TED_esp_pop' , 'B_TED_ifDescrSt' , 'B_TED_IMA_Flag' , 'B_TED_intCID' , 'B_TED_interface' , 'B_TED_IntProbe' , 
'B_TED_IP_Pool' , 'B_TED_IP_Pool_Name' , 'B_TED_IPSLA_COS' , 'B_TED_isbundle' , 'B_TED_isCPE' , 'B_TED_isDeviceUplink' , 'B_TED_isPopUplink' , 'B_TED_Label' , 'B_TED_linkBw' , 'B_TED_linkId' , 
'B_TED_linkIp' , 'B_TED_linkNum' , 'B_TED_linkType' , 'B_TED_MSAN' , 'B_TED_ProbeFrom' , 'B_TED_ProbeService' , 'B_TED_ProbeTo' , 'B_TED_provider' , 'B_TED_routerName' , 'B_TED_service' , 
'B_TED_ShortLabel' , 'B_TED_Site' , 'B_TED_subCable' , 'B_TED_teCID' , 'B_TED_termination' , 'B_TED_TestTarget'
];

function queryAllEntries () {
    Enrichment.aggregate(
        {$group: {_id: '$SE_Name', enrichmentArray: {$push: {
                    B_TED_2ndHost : '$B_TED_2ndHost',
                    B_TED_2ndPop : '$B_TED_2ndPop',
                    B_TED_BadrRelease : '$B_TED_BadrRelease',
                    B_TED_badrRelease : '$B_TED_badrRelease',
                    B_TED_bundleId : '$B_TED_bundleId',
                    B_TED_cardType : '$B_TED_cardType',
                    B_TED_circuitId : '$B_TED_circuitId',
                    B_TED_connType : '$B_TED_connType',
                    B_TED_Customer : '$B_TED_Customer',
                    B_TED_CustProbe : '$B_TED_CustProbe',
                    B_TED_Default_Coll : '$B_TED_Default_Coll',
                    B_TED_Elt_Device : '$B_TED_Elt_Device',
                    B_TED_Elt_IP : '$B_TED_Elt_IP',
                    B_TED_Elt_Model : '$B_TED_Elt_Model',
                    B_TED_Elt_POP_Gov : '$B_TED_Elt_POP_Gov',
                    B_TED_Elt_POP_Name : '$B_TED_Elt_POP_Name',
                    B_TED_Elt_Type : '$B_TED_Elt_Type',
                    B_TED_Elt_Vendor : '$B_TED_Elt_Vendor',
                    B_TED_esp_bw : '$B_TED_esp_bw',
                    B_TED_esp_conntype : '$B_TED_esp_conntype',
                    B_TED_esp_customer : '$B_TED_esp_customer',
                    B_TED_esp_if : '$B_TED_esp_if',
                    B_TED_esp_order : '$B_TED_esp_order',
                    B_TED_esp_pop : '$B_TED_esp_pop',
                    B_TED_ifDescrSt : '$B_TED_ifDescrSt',
                    B_TED_IMA_Flag : '$B_TED_IMA_Flag',
                    B_TED_intCID : '$B_TED_intCID',
                    B_TED_interface : '$B_TED_interface',
                    B_TED_IntProbe : '$B_TED_IntProbe',
                    B_TED_IP_Pool : '$B_TED_IP_Pool',
                    B_TED_IP_Pool_Name : '$B_TED_IP_Pool_Name',
                    B_TED_IPSLA_COS : '$B_TED_IPSLA_COS',
                    B_TED_isbundle : '$B_TED_isbundle',
                    B_TED_isCPE : '$B_TED_isCPE',
                    B_TED_isDeviceUplink : '$B_TED_isDeviceUplink',
                    B_TED_isPopUplink : '$B_TED_isPopUplink',
                    B_TED_Label : '$B_TED_Label',
                    B_TED_linkBw : '$B_TED_linkBw',
                    B_TED_linkId : '$B_TED_linkId',
                    B_TED_linkIp : '$B_TED_linkIp',
                    B_TED_linkNum : '$B_TED_linkNum',
                    B_TED_linkType : '$B_TED_linkType',
                    B_TED_MSAN : '$B_TED_MSAN',
                    B_TED_ProbeFrom : '$B_TED_ProbeFrom',
                    B_TED_ProbeService : '$B_TED_ProbeService',
                    B_TED_ProbeTo : '$B_TED_ProbeTo',
                    B_TED_provider : '$B_TED_provider',
                    B_TED_routerName : '$B_TED_routerName',
                    B_TED_service : '$B_TED_service',
                    B_TED_ShortLabel : '$B_TED_ShortLabel',
                    B_TED_Site : '$B_TED_Site',
                    B_TED_subCable : '$B_TED_subCable',
                    B_TED_teCID : '$B_TED_teCID',
                    B_TED_termination : '$B_TED_termination',
                    B_TED_TestTarget : '$B_TED_TestTarget'
            }}
        }}, function(err, qDocList) {
        // console.log(util.inspect(qDocList, false, 10));
        process.exit(0);
    });
}

// Recursively go through list adding documents.
// (This will overload the stack when lots of entries
// are inserted.  In practice I make heavy use the NodeJS 
// "async" module to avoid such situations.)
function createDocRecurse (err) {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    if (lineList.length) {
        console.log(lineList.length);
        var line = lineList.shift();
        console.log(line);
        var doc = new Enrichment();
        line.split(',').forEach(function (entry, i) {
            doc[schemaKeyList[i]] = entry;
        });
        doc.save(createDocRecurse);
    } else {
        // After the last entry query to show the result.
        queryAllEntries();
    }
}

// call the createDocRecurse passing it null in the caller module
// createDocRecurse(null);

module.exports.createDocRecurse = createDocRecurse;