var express         = require("express");
var router          = express.Router();
var Device          = require("../models/device");
var Interface       = require("../models/interface");
var RawInterface    = require("../models/rawinterface");
var POP             = require("../models/pop");
var Sector          = require("../models/sector");
var Governorate     = require("../models/governorate");
var Link            = require("../models/link");
var DeviceModel     = require("../models/devicemodel");
var Cabinet         = require("../models/cabinet");
var Promise         = require('bluebird');
var snmp            = Promise.promisifyAll(require ("net-snmp"));
var session         = snmp.createSession (process.env.IP, "public");
var snmpConstants   = require("../lookUps");
var async           = require('async');
var __async__       = require('asyncawait/async');
var __await__       = require('asyncawait/await');
var S               = require('string');
var mongoose        = require('mongoose');
var middleware      = require("../middleware");
var logger          = require("../middleware/logger");
var Parser          = require('../middleware/parser/parser');
var sleep           = require('thread-sleep');
var deasync         = require('deasync');
var enrichmentData  = require("../lookUps/enrich");
var dateFormat      = require('dateformat');
// var ObjectId        = require('mongodb').ObjectID;
var indexRoutes     = require("./index"); 
var cmd             = require('node-cmd');

var bulkSyncInProgress = false;
var aDevice = new Device() ;
var targets = [];
var MAX_PARALLEL_DEVICES = 35;
var throttle = MAX_PARALLEL_DEVICES;
var doneDevices = 0;
var syncCyclesThreshold = 3;
var SYNC_DIFFERENCE_IN_DAYS = 7;//difference in days
var SYNC_DIFFERENCE_IN_HOURS = 168;//difference in hours
var SYNC_DIFFERENCE_IN_MINUTES = 10080;//difference in minutes
var ARRAY_SIZE_LIMIT = 10123;
//*********************
//  SNMP HANDLER
//*********************
// The maxRepetitions argument is optional, and will be ignored unless using
// SNMP verison 2c
var snmpError = "";

var theWalkSession, theTableSession, theTableColumnsSession; 
var ifTableColumns ={ifIndex:1,ifDescr:2,ifType:3,ifSpeed:5,ifAdminStatus:7,ifOperStatus:8,ifInOctets:10,ifOutOctets:16};
var ifXTableColumns ={ifName:1,ifAlias:18,ifHighSpeed:15,ifHCInOctets:6,ifHCOutOctets:10};
var systemDetailsColumns ={sysObjectID:0,sysName:1};
// var deviceInterfaces = [Interface];
var anInterface = new Interface();
var discoveryFinished = false;
var systemDetails = ["1.3.6.1.2.1.1.2.0","1.3.6.1.2.1.1.5.0"];//retrieve sysObjectID to lookup model and sysName
var oids = {
    ifTable: {
        OID: "1.3.6.1.2.1.2.2",
        Columns: [
            // ifTableColumns.ifIndex,
            ifTableColumns.ifDescr,
            ifTableColumns.ifType,
            ifTableColumns.ifSpeed,
            ifTableColumns.ifAdminStatus,
            ifTableColumns.ifOperStatus,
            ifTableColumns.ifInOctets,
            ifTableColumns.ifOutOctets
        ]
    },
    ifXTable: {
        OID: "1.3.6.1.2.1.31.1.1",
        Columns: [
            ifXTableColumns.ifName,
            ifXTableColumns.ifAlias,
            ifXTableColumns.ifHighSpeed,
            ifXTableColumns.ifHCInOctets,
            ifXTableColumns.ifHCOutOctets
        ]
    }
};

// function discoveredDevice(device,linkEnrichmentData,devicePOP,deviceGove,deviceSector,deviceDistrict,popType,parentPOP,cabinetName,POPDetails) {
function discoveredDevice(device,linkEnrichmentData,cabinetName,POPDetails) {
    var self = null;
    self = this;
    self.name = device.hostname;
    self.device = device; 

    self.filteredInterestInterfacesMap = new Map();//this map will containg filtered interfaces by self.retrieveIfXTable()
    self.deviceInterfaces = [];

    self.interestInterfacesMap = new Map();//this map will containg filtered interfaces by self.retrieveIfTable()
    self.interfaceUpdateMap = new Map();
    self.interfaceRemoveList = [];
    self.ifTableError = false;
    self.ifXTableError = false;
    self.ifTableRead = false;
    self.ifXTableRead = false;
    self.inSyncMode = false;
    self.deviceType = S(self.device.type) || "Unknown";
    self.deviceVendor = S(self.device.vendor) || "Unknown";
    self.deviceModel = S(self.device.model) || "Unknown";
    self.modelOID = "";
    self.sysName = S(self.device.sysName) || "Unknown";
    self.maxRepetitions = 50;
    self.linkEnrichmentData = linkEnrichmentData;
    self.deviceToBeDeleted = false;
    self.deviceSyncCycles = self.device.deviceSyncCycles || 0;
    self.errorRetrievingSysOID = false;
    self.cleanSessionClose = false;//used to flag that the SNMP session closed cleanly without exceptions from dgram
    self.deviceSaved = false;

    self.devicePOP = "Unknown";
    self.cabinetName = cabinetName || "Unknown";
    self.deviceGove = self.device.gov;
    self.deviceSector = self.device.sector;
    self.deviceDistrict = self.device.district;
    self.devicePOPType = self.device.popType;
    self.devicePOPLongName = self.device.popLongName;

    if(self.device.sector == S("#N/A").s) self.deviceSector = "";
    if(self.device.district == S("#N/A").s) self.deviceDistrict = "";
    if(self.devicePOP == "Unknown_Unkown") self.devicePOP = "Unknown";

    if(S(self.deviceGove).isEmpty() || S(self.deviceGove).s == "Unknown" && !(self.device.updatedAt instanceof Date)) self.deviceGove = POPDetails.gov;
    if(S(self.deviceSector).isEmpty() || S(self.deviceSector).s == "Unknown" && !(self.device.updatedAt instanceof Date)) self.deviceSector = POPDetails.sector;
    if(S(self.deviceDistrict).isEmpty() || S(self.deviceDistrict).s == "Unknown" && !(self.device.updatedAt instanceof Date)) self.deviceDistrict = POPDetails.district;
    if(S(self.devicePOPType).isEmpty() || S(self.devicePOPType).s == "Unknown" && !(self.device.updatedAt instanceof Date)) self.devicePOPType = POPDetails.popType;
    if(S(self.devicePOPLongName).isEmpty() || S(self.devicePOPLongName).s == "Unknown" && !(self.device.updatedAt instanceof Date)) self.devicePOPLongName = POPDetails.popLongName;
    if(!S(self.device.pop).isEmpty() && self.device.pop != "Unknown") self.devicePOP = self.device.pop;
    else if(POPDetails.shortName && POPDetails.shortName != "Unknown") self.devicePOP = POPDetails.shortName+"_"+self.deviceGove;

    console.log(self.devicePOP +" | "+self.devicePOPLongName+ " | "+ self.deviceGove + " | "+ self.deviceSector + " | "+ self.deviceDistrict + " | "+ self.devicePOPType + " | "+self.cabinetName);

    self.destroy = function(){
        if(self.inSyncMode && !self.cleanSessionClose){
            throttle = throttle + 1;
            doneDevices = doneDevices + 1;                   
            logger.info(self.name+" done, total done: "+doneDevices);  

            self.filteredInterestInterfacesMap.clear();
            self.filteredInterestInterfacesMap = null;
            self.interestInterfacesMap.clear();
            self.interestInterfacesMap = null;
            self.interfaceUpdateMap.clear();
            self.interfaceUpdateMap = null;
            self.deviceInterfaces = null;
            self.interfaceRemoveList = null;


        }
        if(self.session) self.session = null;
        self.cleanSessionClose = true;
    };
    self.allowedFields =  enrichmentData.interfaceAllowedFields ;//['ifName','ifAlias','ifIndex','ifDescr','ifType','ifSpeed','ifHighSpeed','counters','type',' specialService','secondPOP','secondHost','secondInterface','label','provisoFlag','noEnrichFlag','sp_service','sp_provider','sp_termination','sp_bundleId','sp_linkNumber','sp_CID','sp_TECID','sp_subCable','sp_customer','sp_sourceCore','sp_destCore','sp_vendor','sp_speed','sp_pop','sp_fwType','sp_serviceType','sp_ipType','sp_siteCode','sp_connType','sp_emsOrder','sp_connectedBW','sp_dpiName','sp_portID','unknownFlag','adminStatus','operStatus','actualspeed','syncCycles','lastUpdate','hostname','ipaddress','pop'];

    self.session = snmp.createSession(self.device.ipaddress, S(self.device.community).trim().s,{ timeout: 10000, version: snmp.Version2c ,retries: 1});
    self.session.on("close", function () {
        if(self.session) {
            try{
                self.destroy();
                logger.info("self.session.onClose, snmp socket closed for "+self.name);                    
            }
            catch(e){
                logger.error("caught an error inside self.session.onClose: "+e);
            }
            finally{
            }
        }
    });
    self.session.on("error", function (error) {
        if(self.session) {
            try{
                self.session.close();
            }
            catch(e){
                logger.error("caught an error inside self.session.onError: "+e);
                self.destroy();
                logger.info("self.session.onError, snmp socket closed for "+self.name);                    
            }
            finally{
            }
        }
    });
    self.constructInterfaceID = function(deviceIP,ifIndex){
        //Mongodb uses Object id of 24 char length in hex format
        //will let ipaddress and ifIndex share this length
        // 10.0.0.1    to 10.255.255.254   
        // 172.16.0.1  to 172.31.255.254  
        // 192.168.0.1 to 192.168.255.254  
        var ipaddress = deviceIP.replace('.','');//replace first dot
        ipaddress = S(ipaddress).replaceAll('.', 'a').padLeft(12, 'b').s;
        var ifindex ;
        if(ipaddress.length <= 12){
            ifindex = S(ifIndex).padLeft(12, 'c').s;
        }
        else{
            ifindex = S(ifIndex).padLeft((24 - ipaddress.length), 'c').s;
        }
        var str_id = ipaddress+ifindex;
        return str_id;
    };
    self.convertSpeedToText = function(speedNumber,multiplier){
        var integerSpeed = S(speedNumber).toInt();
        integerSpeed = integerSpeed * S(multiplier).toInt();
        var unit = " meg";
        var value = "1";
        var textSpeed = value+unit;
        if(S(integerSpeed) == 'NaN'){
            value = 'Unknown';
            unit = '';
        }
        else if(integerSpeed >= 1000 && integerSpeed < 1000000){
            value = integerSpeed / 1000;
            unit = " K";
        }
        else if( integerSpeed >= 1000000 && integerSpeed  < 1000000000){
            value = integerSpeed / 1000000;
            unit = " Meg";
        }
        else if(integerSpeed >= 1000000000){
            value = integerSpeed / 1000000000;
            unit = " Gig";
        }
        return (value+unit);
    };
    self.setActualSpeed = function(sp_speed,ifSpeed,ifHighSpeed){
        var tmpActualSpeed;
        if( sp_speed > 0)
        {
            tmpActualSpeed=sp_speed;
        }
        else if(ifHighSpeed > 0){
            tmpActualSpeed=ifHighSpeed*1000000;
        }
        else{
            tmpActualSpeed=ifSpeed;
        }
        return tmpActualSpeed;
    };
    //this function takes an interface as argument and update its device details
    self.updateDeviceDetailsForInterface = function(theInterface){
        if((self.deviceType.toLowerCase() =="msan") || (self.deviceType.toLowerCase() =="gpon")){
            self.cabinetName = self.cabinetName;
        }
        else{
            self.cabinetName = "Unknown";
        }
        theInterface.hostname = self.device.hostname;
        theInterface.devType = S(self.deviceType).s;
        theInterface.devVendor = S(self.deviceVendor).s;
        theInterface.devModel = S(self.deviceModel).s;
        theInterface.devPOP = S(self.devicePOP).s;
        theInterface.devCabinet = S(self.cabinetName).s;
        theInterface.devPOP = self.devicePOP;
        theInterface.devGov =   self.deviceGove ;
        theInterface.devDistrict = self.deviceDistrict ;
        theInterface.devSector = self.deviceSector ;
        theInterface.devPOPType = self.devicePOPType;
        theInterface.devPOPLongName = self.devicePOPLongName;
    };
    self.parseSpeed = function(speed){
        var multiplier, unit;
        if(S(speed).isEmpty() || S(speed).s.toLowerCase() == "unknown" ){
            // logger.warn(self.name +" : Unkown speed text "+speed);
            return 0;
        }
        else if( S(speed).isNumeric() && S(speed).toInt() == 0){
            return 0;
        }
        var tmpSpeed = S(speed).s.toLowerCase();
        var numberPattern = /^[0-9]+/;
        var num = tmpSpeed.match(numberPattern);
        if(num) {
            multiplier = S(num[0]).toInt();
        }
        else{
            multiplier = 1;
        }
        if(tmpSpeed.match(/^[0-9]*g[ig]*$/)){
            unit = 1000000000;
        }
        else if(tmpSpeed.match(/^[0-9]*m[eg]*$/)||tmpSpeed.match(/^[0-9]+$/)){
            unit = 1000000;
        }
        else if(tmpSpeed.match(/^[0-9]*k[ilo]*$/)){
            unit = 1000;
        }
        else{
            // logger.warn(self.name +" : Unkown speed text "+speed);  
            multiplier = 0; unit = 1;
        }
        return S(multiplier).toInt() * S(unit).toInt();
    };

    self.getDaysDifference = function(date2,date1){
        //Get 1 day in milliseconds
          var one_day=1000*60*60*24;

          // Convert both dates to milliseconds
          var date1_ms = date1.getTime();
          var date2_ms = date2.getTime();

          // Calculate the difference in milliseconds
          var difference_ms = date2_ms - date1_ms;
            
          // Convert back to days and return
          return Math.floor(difference_ms/one_day); 
    };
    self.getHoursDifference = function(date2,date1){
        //Get 1 hour in milliseconds
          var one_hour = 60*60*1000;

          // Convert both dates to milliseconds
          var date1_ms = date1.getTime();
          var date2_ms = date2.getTime();

          // Calculate the difference in milliseconds
          var difference_ms = date2_ms - date1_ms;
            
          // Convert back to days and return
          return Math.floor(difference_ms/one_hour); 
    };
    self.getMinutesDifference = function(date2,date1){
        //Get 1 min in milliseconds
          var one_min = 1*60*1000;

          // Convert both dates to milliseconds
          var date1_ms = date1.getTime();
          var date2_ms = date2.getTime();

          // Calculate the difference in milliseconds
          var difference_ms = date2_ms - date1_ms;
            
          // Convert back to days and return
          return Math.floor(difference_ms/one_min); 
    };
    self.interfaceLinkDetails = "";
self.checkInterfaceInLinks = function(interfaceName){
        var isInterfaceLink = false;
        var secondHost,secondInterface,secondPOP,parsedHostName,secondDeviceType;
            if(self.linkEnrichmentData.End == "left"){
                for (var i=0; i < self.linkEnrichmentData.length; i++) {
                    if (S(self.linkEnrichmentData[i].interface1).s == interfaceName) {
                        isInterfaceLink = true;
                        secondHost = self.linkEnrichmentData[i].device2;
                        secondInterface = self.linkEnrichmentData[i].interface2;
                        // secondPOP = S(self.linkEnrichmentData[i].device2).splitLeft('-')[0];
                        parsedHostName = Parser.parseHostname(secondHost);
                        secondPOP = parsedHostName.devicePOPName;
                        secondDeviceType = parsedHostName.deviceType;
                        i = self.linkEnrichmentData.length;//break only first loop 
                    }
                }
            }
            else if(self.linkEnrichmentData.End == "right"){
                for (var i=0; i < self.linkEnrichmentData.length; i++) {
                    if (S(self.linkEnrichmentData[i].interface2).s == S(interfaceName).s) {
                        isInterfaceLink = true;
                        secondHost = self.linkEnrichmentData[i].device1;
                        secondInterface = self.linkEnrichmentData[i].interface1;
                        // secondPOP = S(self.linkEnrichmentData[i].device1).splitLeft('-')[0];
                        parsedHostName = Parser.parseHostname(secondHost);
                        secondPOP = parsedHostName.devicePOPName;
                        secondDeviceType = parsedHostName.deviceType;
                        i = self.linkEnrichmentData.length;//break only first loop 
                    }
                }
            }
            else{
                for (var i=0; i < self.linkEnrichmentData.length; i++) {
                    if (S(self.linkEnrichmentData[i].device1).s == self.name && S(self.linkEnrichmentData[i].interface1).s == interfaceName) {
                        isInterfaceLink = true;
                        secondHost = self.linkEnrichmentData[i].device2;
                        secondInterface = self.linkEnrichmentData[i].interface2;
                        // secondPOP = S(self.linkEnrichmentData[i].device2).splitLeft('-')[0];
                        parsedHostName = Parser.parseHostname(secondHost);
                        secondPOP = parsedHostName.devicePOPName;
                        secondDeviceType = parsedHostName.deviceType;
                        i = self.linkEnrichmentData.length;//break only first loop 
                    }
                    else if (S(self.linkEnrichmentData[i].device2).s == self.name && S(self.linkEnrichmentData[i].interface2).s == S(interfaceName).s) {
                        isInterfaceLink = true;
                        secondHost = self.linkEnrichmentData[i].device1;
                        secondInterface = self.linkEnrichmentData[i].interface1;
                        // secondPOP = S(self.linkEnrichmentData[i].device1).splitLeft('-')[0];
                        parsedHostName = Parser.parseHostname(secondHost);
                        secondPOP = parsedHostName.devicePOPName;
                        secondDeviceType = parsedHostName.deviceType;
                        i = self.linkEnrichmentData.length;//break only first loop 
                    }
                }
            }
        interfaceLinkDetails = {secondHost:secondHost,secondInterface:secondInterface,secondPOP:secondPOP,secondDeviceType:secondDeviceType};
        return isInterfaceLink;
};
    self.parseIfAlias = function(ifAlias,hostname,ifName,ifIndex,ipaddress,ifSpeed,ifHighSpeed){
        // if(S(ifAlias).isEmpty()) return null;
        // var anErichment= {
        //     specialService : '', provisoFlag : '', sp_service : '', sp_provider : '', sp_termination : '', sp_connType : '', sp_bundleId : '', sp_linkNumber : '', 
        //     sp_CID : '', sp_TECID : '', sp_subCable : '', unknownFlag : '' , label : '' , sp_customer : '', sp_speed : '' , sp_pop : '' , sp_connType : '' , 
        //     sp_emsOrder : '' , sp_connectedBW : '', sp_fwType : '' , sp_serviceType : '' , sp_ipType : '' , sp_vendor : '', sp_sourceCore : '', sp_destCore : '', 
        //     sp_siteCode: '', sp_preNumber: '', sp_portID: '', noEnrichFlag: '',actualspeed: ''
        // }
        var anErichment = null;
        var linkDetails = null;
        var skipNextCheck = false;
        var interfaceName = S(ifName).trim().s;
        var alias;
        if(!S(ifAlias).isEmpty()) alias = S(ifAlias).trim().s;
        var pollInterval = "15min";
        var provisoFlag = 0;
        var unknownFlag = 0;
        var noEnrichFlag = 0;         
        var label;   
        var speedCat = "" ; 
        var ifSpeedText = "Unknown", ifHighSpeedText = "Unknown", sp_speedText = "Unknown", actualspeedText = "Unknown";
        // var pop = self.devicePOP;
        var parentPOP = "Unknown";
        if(alias){
            label = hostname+" "+interfaceName+" "+alias;
            // label = hostname+" "+interfaceName;
        }
        else{
            label = hostname+" "+interfaceName;
        }
        var tmpIfName = S(interfaceName).s.toLowerCase();
        var tmpAlias ;
        if(alias) {
            tmpAlias= S(alias).s.toLowerCase();
        }
        else {
            // skipNextCheck = true;
            tmpAlias = "";
        }

        if(ifHighSpeed > 9990 && ifHighSpeed < 99990){
            speedCat="10Gig";
        }
        else if(ifHighSpeed > 99989){
            speedCat="100Gig";
        }

        if(alias && S(alias.toLowerCase()).startsWith("int-")){
            // # Patterns   INT-P1-P2-P3-P4-P5-P6-P7-P8-P9
            // # Patterns description   
            // # P1: Service
            // # P2: Provider Name
            // # P3: Termination
            // # P4: Connection Type
            // # P5: Bundle ID
            // # P6: Link Number
            // # P7: INT CID
            // # P8: TE CID
            // # P9: Sub Cable
            // # Examples   INT-IPT-Cogent-ALX-10GIG-B2-NB-L22-1_300050661-EIG_IPT_10G_0019-EIG
            // # INT-IPT-AIRTEL-ALX-10G-NB-L2-ALX_MBB_10GbE_002_M-IMW_IPT_10G_0013-IMWE
            skipNextCheck = true;
            var specialService="International";
            provisoFlag=1;
            pollInterval = "02min";
            var enrichmentString = S(alias).strip("INT-").s;
            var enrichmentFields = S(enrichmentString).splitLeft('-');
            var sp_service="Unknown",sp_provider="Unknown",sp_termination="Unknown",sp_connType="Unknown",sp_bundleId="Unknown",sp_linkNumber="Unknown",
            sp_CID="Unknown",sp_TECID="Unknown",sp_subCable="Unknown",sp_speed=0;

            if(enrichmentFields.length == 9){
                sp_service=enrichmentFields[0] || "Unknown";
                sp_provider=enrichmentFields[1] || "Unknown";
                sp_termination=enrichmentFields[2] || "Unknown";
                sp_connType=enrichmentFields[3] || "Unknown";
                sp_bundleId=enrichmentFields[4] || "Unknown";
                sp_linkNumber=enrichmentFields[5] || "Unknown";
                sp_CID=enrichmentFields[6] || "Unknown";
                sp_TECID=enrichmentFields[7] || "Unknown";
                sp_subCable=enrichmentFields[8] || "Unknown";
            }
            else if(enrichmentFields.length != 9 ){
                unknownFlag = 1;
            }
                    
            label=hostname+" "+interfaceName;
            sp_speed = self.parseSpeed(sp_connType);
            actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);
            anErichment= {
                        specialService : specialService, provisoFlag : provisoFlag,sp_service : sp_service, sp_provider : sp_provider, sp_termination : sp_termination, 
                        sp_connType : sp_connType, sp_bundleId : sp_bundleId, sp_linkNumber : sp_linkNumber, sp_CID : sp_CID, sp_TECID : sp_TECID, 
                        sp_subCable : sp_subCable, unknownFlag : unknownFlag, label : label,noEnrichFlag:noEnrichFlag,sp_speed:sp_speed,
                        actualspeed:actualspeed,pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,

                        sp_customer : '',sp_pop : '',sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_vendor : '',
                        sp_sourceCore : '', sp_destCore : '',sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        else if(alias && S(alias.toLowerCase()).startsWith("cache-")){
            // # Condition Start with (Cache-)
            // # Patterns  Cache-P1-P2-P3-P4-P5---P6
            // # Patterns description  P1: Provider Name
            // # P2: Node
            // # P3: TX
            // # P4: Bundle
            // # P5: Link Number
            // # P6: Server Number
            // # Cache-Facebook-CAI-10G-NB-L11-CID_5688980-SVDC-
            // # Examples  INT-IPT-Cogent-ALX-10GIG-B2-NB-L22-1_300050661-EIG_IPT_10G_0019-EIG
            // # INT-IPT-AIRTEL-ALX-10G-NB-L2-ALX_MBB_10GbE_002_M-IMW_IPT_10G_0013-IMWE
            skipNextCheck = true;

            var specialService=specialService="Caching";
            provisoFlag=1;
            pollInterval = "02min";
            var enrichmentString = S(alias).strip("Cache-").s;
            var enrichmentFields = S(enrichmentString).splitLeft('-');
            var sp_provider="Unknown",sp_termination="Unknown",sp_connType="Unknown",sp_bundleId="Unknown",sp_linkNumber="Unknown",
            sp_subCable="Unknown",sp_speed=0;
            if(enrichmentFields.length == 8){
                sp_provider=enrichmentFields[0] || "Unknown";
                sp_termination=enrichmentFields[1] || "Unknown";
                sp_connType=enrichmentFields[2] || "Unknown";
                sp_bundleId=enrichmentFields[3] || "Unknown";
                sp_linkNumber=enrichmentFields[4] || "Unknown";
                sp_subCable=enrichmentFields[7] || "Unknown";
            }
            else if(enrichmentFields.length != 8 ){
                unknownFlag = 1;
            }

            sp_speed=self.parseSpeed(sp_connType);
            label=hostname+" "+interfaceName;
            actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);
            anErichment= {
                        specialService : specialService, provisoFlag : provisoFlag,sp_provider : sp_provider, sp_termination : sp_termination, 
                        sp_connType : sp_connType, sp_bundleId : sp_bundleId, sp_linkNumber : sp_linkNumber,  
                        sp_subCable : sp_subCable, unknownFlag : unknownFlag, label : label,noEnrichFlag:noEnrichFlag,sp_speed:sp_speed,
                        actualspeed:actualspeed,pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,

                        sp_service : '',sp_CID : '', sp_TECID : '', sp_customer : '',
                        sp_pop : '',sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_vendor : '',sp_sourceCore : '', sp_destCore : '', 
                        sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        else if(alias && S(alias.toLowerCase()).contains("alpha-bitstream")){
            // # Condition  Contain (_ALPHA-BITSTREAM)
            // # Patterns   P1-ALPHA-BITSTREAM P2 P3
            // # Patterns description   
            // # P1: Customer
            // # P2: Link Number
            // # P3: Speed
            // # Examples   VODA-ALPHA-BITSTREAM L1 GIG
            // # LDN-ALPHA-BITSTREAM L1 GIG
            // # ETISALAT-ALPHA-BITSTREAM L1 GIG
            skipNextCheck = true;
            var specialService="Alpha-Bitstream";
            provisoFlag=1;
            pollInterval = "02min";
            var enrichmentString = S(alias).replaceAll(' ','-');//trying to unify byremoving spaces
            var enrichmentFields = S(enrichmentString).splitLeft('-');
            var sp_customer="Unknown",sp_linkNumber="Unknown",sp_speed=0;

            if(enrichmentFields.length == 5){
                sp_customer=enrichmentFields[0] || "Unknown";
                sp_linkNumber=enrichmentFields[3] || "Unknown";
                sp_speed=enrichmentFields[4] || 0;
            }
            else{
                unknownFlag = 1;
            }
            sp_speed = self.parseSpeed(sp_speed);
            actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);
            anErichment= {
                    specialService:specialService,provisoFlag:provisoFlag,unknownFlag:unknownFlag,sp_customer : sp_customer, sp_linkNumber:sp_linkNumber, 
                    sp_speed : sp_speed,noEnrichFlag:noEnrichFlag,label : label,actualspeed:actualspeed,pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,

                    sp_service : '', sp_provider : '', sp_termination : '',sp_connType : '', sp_bundleId : '',  
                    sp_CID : '', sp_TECID : '', sp_subCable : '', 
                    sp_pop : '',sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_vendor : '',sp_sourceCore : '', sp_destCore : '', 
                    sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        else if(alias && S(alias.toLowerCase()).contains("-esp-bitstream")){
            // # Condition  Contain (-ESP-BITSTREAM)
            // # Patterns   P1-ESP-BITSTREAM P2 P3
            // # Patterns description   P1: Customer
            // # P2: Link Number
            // # P3: Speed
            // # Examples   ETISALAT-ESP-BITSTREAM B1 2GIG
            skipNextCheck = true;
            var specialService = "SH-Bitstream";
            provisoFlag=1;
            var enrichmentString = S(alias).replaceAll(' ','-');//trying to unify byremoving spaces
            var enrichmentFields = S(enrichmentString).splitLeft('-');
            var sp_customer="Unknown",sp_linkNumber="Unknown",sp_speed=0;
            if(enrichmentFields.length == 5){
                sp_customer=enrichmentFields[0] || "Unknown";
                sp_linkNumber=enrichmentFields[3] || "Unknown";
                sp_speed=enrichmentFields[4] || 0;
            }
            else{
                unknownFlag = 1;
            }
            sp_speed = self.parseSpeed(sp_speed);
            actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);

            anErichment= {
                    specialService:specialService,provisoFlag:provisoFlag,unknownFlag:unknownFlag,sp_customer:sp_customer, sp_linkNumber:sp_linkNumber, 
                    sp_speed : sp_speed,noEnrichFlag:noEnrichFlag,label : label,pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,

                    sp_service : '', sp_provider : '', sp_termination : '',sp_connType : '', sp_bundleId : '',  
                    sp_CID : '', sp_TECID : '', sp_subCable : '', actualspeed:'',
                    sp_pop : '',sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_vendor : '',sp_sourceCore : '', sp_destCore : '', 
                    sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        else if(alias && S(alias.toLowerCase()).contains("-bitstream")){
            // # Condition  Contain (-BITSTREAM)
            // # Patterns   P1-BITSTREAM P2 P3
            // # Patterns description   P1: Customer
            // # P2: Link Number
            // # P3: Speed
            // # Examples   VODA-BITSTREAM L6 1GIG
            // # NOOR-BITSTREAM L3 1GIG
            // # LDN-BITSTREAM L6 1GIG
            // # ETISALAT-BITSTREAM L2 1GIG
            skipNextCheck = true;
            var specialService = "Unlimited-Bitstream";
            provisoFlag=1;
            var enrichmentString = S(alias).replaceAll(' ','-');//trying to unify byremoving spaces
            var enrichmentFields = S(enrichmentString).splitLeft('-');
            var sp_customer="Unknown",sp_linkNumber="Unknown",sp_speed=0;
            if(enrichmentFields.length == 4){
                sp_customer=enrichmentFields[0] || "Unknown";
                sp_linkNumber=enrichmentFields[2] || "Unknown";
                sp_speed=enrichmentFields[3] || 0;
            }
            else{
                unknownFlag = 1;
            }
            sp_speed = self.parseSpeed(sp_speed);
            actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);
            anErichment= {
                    specialService:specialService,provisoFlag:provisoFlag,unknownFlag:unknownFlag,sp_customer : sp_customer, sp_linkNumber:sp_linkNumber, 
                    sp_speed:sp_speed,noEnrichFlag:noEnrichFlag,label : label,pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,

                    sp_service : '', sp_provider : '', sp_termination : '',sp_connType : '', sp_bundleId : '',  
                    sp_CID : '', sp_TECID : '', sp_subCable : '', actualspeed:'',
                    sp_pop : '',sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_vendor : '',sp_sourceCore : '', sp_destCore : '', 
                    sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        else if(alias && S(alias.toLowerCase()).startsWith("esp-")){
            // # Condition  Start with (ESP-*)
            // # Patterns   ESP-P1-P2-P3-P4-P5
            // # Patterns description   
            // # P1: Customer Name
            // # P2: POP Name
            // # P3: Connection Type
            // # P4: EMS Order Number
            // # P5: Connected BW
            // # Examples   ESP-TE_ACCESS-RAMSIS-INT-1-100
            skipNextCheck = true;
            var specialService="ESP";
            provisoFlag=1;
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
            if(S(sp_connectedBW).isAlphaNumeric()) sp_speed= self.parseSpeed(sp_connectedBW);
            actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);
            anErichment= {
                    specialService : specialService, provisoFlag:provisoFlag, unknownFlag : unknownFlag, sp_customer : sp_customer, sp_pop : sp_pop, 
                    sp_connType : sp_connType, sp_emsOrder : sp_emsOrder, sp_connectedBW : sp_connectedBW,noEnrichFlag:noEnrichFlag,label : label,
                    sp_speed:sp_speed,actualspeed:actualspeed,pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,

                    sp_service : '', sp_provider : '', sp_termination : '',sp_bundleId : '', sp_linkNumber : '', 
                    sp_CID : '', sp_TECID : '', sp_subCable : '', 
                    sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_vendor : '',sp_sourceCore : '', sp_destCore : '', 
                    sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        else if(alias && S(alias.toLowerCase()).contains("-fw") && S(alias.toLowerCase()).contains("-eg")){
            // #Condition   Contain (*-FW*-*-EG)
            // #Patterns    P1_P2_P3_P4-FW00P5-*-EG
            // #Patterns description    
            // #P1: POP Name
            // #P2: GI
            // #P3:Servise Type
            // #P4:  IP Type 
            // #P5: Vendor  (only 1 character)
            // #Examples    ALMAZA_GI_Trust_IPv4-FW02E-C-EG
            skipNextCheck = true;
            var specialService="Firewall";
            provisoFlag=1;
            var enrichmentString = S(alias).replaceAll('_','-');//trying to unify byremoving spaces
            var enrichmentFields = S(enrichmentString).splitLeft('-');
            var sp_pop="Unknown",sp_fwType="Unknown",sp_serviceType="Unknown",sp_ipType="Unknown",sp_vendor="Unknown";
            if(enrichmentFields.length == 7){
                    var sp_pop=enrichmentFields[0] || "Unknown";;
                    var sp_fwType=enrichmentFields[1] || "Unknown";;
                    var sp_serviceType=enrichmentFields[2] || "Unknown";;
                    var sp_ipType=enrichmentFields[3] || "Unknown";;
                    var sp_vendor=S(enrichmentFields[4]).right(1).s || "Unknown";; 
            }
            else{
                unknownFlag = 1;
            }
            actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);

            anErichment= {
                    specialService : specialService, provisoFlag:provisoFlag, unknownFlag : unknownFlag, sp_pop : sp_pop, sp_fwType : sp_fwType, 
                    sp_serviceType : sp_serviceType, sp_ipType : sp_ipType, sp_vendor : sp_vendor,noEnrichFlag:noEnrichFlag,label : label,
                    pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,

                    sp_service : '', sp_provider : '', sp_termination : '',sp_connType : '', sp_bundleId : '', sp_linkNumber : '', 
                    sp_CID : '', sp_TECID : '', sp_subCable : '', sp_speed:'',actualspeed:'',sp_customer : '',
                    sp_emsOrder : '', sp_connectedBW : '', sp_sourceCore : '', sp_destCore : '', 
                    sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        else if(alias && S(alias.toLowerCase()).startsWith("nr_") ){
            ///////////////////////////////////////
            // # Condition  Start with (NR_)
            // # Patterns   NR_P1_P2_P3_P4-N00P5-*-EG P6 P7
            // # Patterns description   
            // # P1: Provider
            // # P2: Service
            // # P3: Source Core
            // # P4: Destination Core
            // # P5: Vendor  (only 1 character)
            // # P6: Link Number
            // # P7: Speed
            // # Examples   NR_Etisalat_Data_ALZ_AUTO-N01E-DSR-EG L1 GIG
            // # NR_Orange_RTP_ALZ_OBR-N01O-R-EG L1 GIG
            skipNextCheck = true;
            var specialService = "National-Roaming";
            provisoFlag=1;
            var enrichmentString = S(alias).replaceAll('_','-');//trying to unify by removing underscore
            enrichmentString = S(enrichmentString).replaceAll(' ','-');//trying to unify by removing spaces
            var enrichmentFields = S(enrichmentString).splitLeft('-');
            var sp_provider = "Unknown",sp_service="Unknown",sp_sourceCore="Unknown",sp_destCore="Unknown",sp_vendor="Unknown",sp_linkNumber="Unknown",sp_speed=0;
                    
            if(enrichmentFields.length == 10){
                sp_provider=enrichmentFields[1] || "Unknown";
                sp_service=enrichmentFields[2] || "Unknown";
                sp_sourceCore=enrichmentFields[3] || "Unknown";
                sp_destCore=enrichmentFields[4] || "Unknown";
                sp_vendor=S(enrichmentFields[5]).right(1).s || "Unknown";
                sp_linkNumber=enrichmentFields[8] || "Unknown";
                sp_speed=enrichmentFields[9] || 0;
            }
            else{
                unknownFlag = 1;
            }
            label = hostname+" "+interfaceName;
            sp_speed = self.parseSpeed(sp_speed);
            actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);
            anErichment= {
                    specialService:specialService,provisoFlag : provisoFlag, unknownFlag:unknownFlag, sp_provider : sp_provider, sp_service : sp_service, 
                    sp_sourceCore : sp_sourceCore, sp_destCore : sp_destCore, sp_vendor : sp_vendor, sp_linkNumber : sp_linkNumber, sp_speed : sp_speed, label : label,
                    noEnrichFlag:noEnrichFlag,pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,

                    sp_termination : '',sp_connType : '', sp_bundleId : '',  
                    sp_CID : '', sp_TECID : '', sp_subCable : '', actualspeed:'',sp_customer : '',
                    sp_pop : '',sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '',  
                    sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        // # LTE Interfaces
        else if(alias && S(alias.toLowerCase()).contains("_enb_")){      
            // # Condition  Contain (*_ENB*-E*-*-EG) or Contain (ENB)
            // # Patterns   P1_ENB_P2-E00P3-*-EG P4 P5
            // # Patterns description   
            // # P1: POP Name
            // # P2: Site Code
            // # P3: Vendor  (only 1 character)
            // # P4: Link Number
            // # P5: Speed
            // # Examples   MONEIB_ENB_LCaiG31109-E01N-C-EG L1 GIG
            // # MONEIB_ENB_LCaiG31109_S1-MME-E01N-C-EG --> wrong example to be validated
            skipNextCheck = true;
            provisoFlag=1;
            var specialService="LTE";
            var enrichmentString = S(alias).replaceAll('_','-');//trying to unify by removing underscore
            enrichmentString = S(enrichmentString).replaceAll(' ','-');//trying to unify by removing spaces
            var enrichmentFields = S(enrichmentString).splitLeft('-');
            var sp_pop="Unknown",sp_siteCode="Unknown",sp_vendor="Unknown",sp_linkNumber="Unknown",sp_speed=0;
            if(enrichmentFields.length == 8){
                sp_pop=enrichmentFields[0] || "Unknown";
                sp_siteCode=enrichmentFields[2] || "Unknown";
                sp_vendor=S(enrichmentFields[3]).right(1).s || "Unknown";
                sp_linkNumber=enrichmentFields[6] || "Unknown";
                sp_speed=enrichmentFields[7] || 0;
            }
            else{
                unknownFlag=1;
            }
            sp_speed = self.parseSpeed(sp_speed);
            actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);
            anErichment= {
                    specialService:specialService,provisoFlag : provisoFlag, unknownFlag:unknownFlag, sp_pop:sp_pop,sp_siteCode:sp_siteCode,sp_vendor:sp_vendor,
                    sp_linkNumber:sp_linkNumber,sp_speed:sp_speed,noEnrichFlag:noEnrichFlag,label : label,pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,

                    sp_service : '', sp_provider : '', sp_termination : '',sp_connType : '', sp_bundleId : '',  
                    sp_CID : '', sp_TECID : '', sp_subCable : '', actualspeed:'',sp_customer : '',
                    sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_sourceCore : '', sp_destCore : '', 
                    sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        // # EPC
        else if(alias && S(alias.toLowerCase()).contains(" epc ")){      
            // # Condition  Contain (* EPC*)
            // # Patterns   P1 EPC P2 P3
            // # Patterns description   
            // # P1: Provider
            // # P2: Link Number
            // # P3: Speed
            // # Examples   Ericson EPC L1 10GIG
            // # Ericson EPC L2 10GIG
            skipNextCheck = true;                
            var specialService="EPC";
            provisoFlag=1;
            var enrichmentFields = S(alias).splitLeft(' ');
            var sp_provider="Unknown",sp_linkNumber="Unknown",sp_speed=0;
            if(enrichmentFields.length == 4){
                sp_provider=enrichmentFields[0] || "Unknown";
                sp_linkNumber=enrichmentFields[2] || "Unknown";
                sp_speed=enrichmentFields[3] || 0;
            }
            else{
                unknownFlag=1;
            }
            sp_speed = self.parseSpeed(sp_speed);
            actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);

            anErichment= {
                    specialService:specialService,provisoFlag : provisoFlag, unknownFlag:unknownFlag, sp_provider:sp_provider,sp_linkNumber:sp_linkNumber,
                    sp_speed:sp_speed,noEnrichFlag:noEnrichFlag,label : label,pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,

                    sp_service : '', sp_termination : '',sp_connType : '', sp_bundleId : '',  
                    sp_CID : '', sp_TECID : '', sp_subCable : '', actualspeed:'',sp_customer : '',
                    sp_pop : '',sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_vendor : '',sp_sourceCore : '', sp_destCore : '', 
                    sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        // # DPI
        else if(alias && S(alias.toLowerCase()).contains("pre1") ){        
            // # Condition  Start with (POP Name-PRE1*) OR Contain (PRE1)
            // # Patterns   P1-P2-P3
            // # Patterns description   
            // # P1: POP name
            // # P2: Pre Number
            // # P3: Port IDs
            // # Examples   MAADI2-PRE1-1/1/INT
            // # MAADI2-PRE1-1/2/EXT
            skipNextCheck = true;
            var specialService="DPI";
            provisoFlag=1;
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
            actualspeed = self.setActualSpeed(0,ifSpeed,ifHighSpeed);
            anErichment= {
                    specialService:specialService,provisoFlag : provisoFlag, unknownFlag:unknownFlag, sp_pop:sp_pop,sp_preNumber:sp_preNumber,
                    sp_portID:sp_portID,noEnrichFlag:noEnrichFlag,label : label,speedCat:speedCat,parentPOP:parentPOP,

                    sp_service : '', sp_provider : '', sp_termination : '',sp_connType : '', sp_bundleId : '', sp_linkNumber : '', 
                    sp_CID : '', sp_TECID : '', sp_subCable : '', sp_speed:'',actualspeed:'',pollInterval:'',sp_customer : '',
                    sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_vendor : '',sp_sourceCore : '', sp_destCore : '', 
                    sp_siteCode:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            }
        }
        else if((self.linkEnrichmentData && self.linkEnrichmentData.length > 0) && self.checkInterfaceInLinks(interfaceName) == true){
            // var pop = S(self.name).splitLeft('-')[0];
            var pop = S(self.name).trim().splitRight('-',3)[0];
            var secondHost,secondInterface,secondPOP,type;
            anErichment = null; 
            if(self.deviceType == "MSAN" || self.deviceType == "GPON") {
                if(interfaceLinkDetails.secondDeviceType == "MSAN" || interfaceLinkDetails.secondDeviceType == "GPON" || interfaceLinkDetails.secondDeviceType == "Router"){
                    parentPOP = interfaceLinkDetails.secondPOP;
                }
            }
            if(interfaceLinkDetails.secondPOP == pop) type = "Local";
            else type = "WAN";
            anErichment = {
                secondHost:interfaceLinkDetails.secondHost,secondInterface:interfaceLinkDetails.secondInterface,secondPOP:interfaceLinkDetails.secondPOP, provisoFlag:1,
                noEnrichFlag:noEnrichFlag,unknownFlag:unknownFlag,type:type,label:label,pollInterval:pollInterval,speedCat:speedCat,parentPOP:parentPOP,pop:pop,
                // noEnrichFlag:noEnrichFlag,unknownFlag:unknownFlag,type:type,pop:pop,label:label,pollInterval:pollInterval,speedCat:speedCat,

                specialService : '', sp_service : '', sp_provider : '', sp_termination : '',sp_connType : '', sp_bundleId : '', sp_linkNumber : '', 
                sp_CID : '', sp_TECID : '', sp_subCable : '', sp_speed:'',actualspeed:'',sp_customer : '',
                sp_pop : '',sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_vendor : '',sp_sourceCore : '', sp_destCore : '', 
                sp_siteCode:'',sp_preNumber:'',sp_portID:''                        
            };
        }
        else if(
                (S(tmpIfName).startsWith("100ge")  || 
                S(tmpIfName).startsWith("ae") || 
                S(tmpIfName).startsWith("at") || 
                S(tmpIfName).startsWith("bundle-ether") || 
                S(tmpIfName).startsWith("e1") || 
                S(tmpIfName).startsWith("et") || 
                S(tmpIfName).startsWith("fa") || 
                S(tmpIfName).startsWith("fe-") || 
                S(tmpIfName).startsWith("ge-") || 
                S(tmpIfName).startsWith("gi") || 
                S(tmpIfName).startsWith("hundredgige") || 
                new RegExp('/^[0-9]+\/[0-9]+\/[0-9]+/').test(S(tmpIfName)) ||// number/nnumbe/number
                S(tmpIfName).startsWith("po") || 
                S(tmpIfName).startsWith("se") || 
                S(tmpIfName).startsWith("so-") || 
                S(tmpIfName).startsWith("te") || 
                S(tmpIfName).startsWith("gei_") || 
                S(tmpIfName).startsWith("xe-")) && 
                !S(tmpIfName).contains('.') &&
                !S(tmpAlias).contains("esp")  && 
                !S(tmpAlias).contains("vpn")  && 
                !S(tmpAlias).contains("internet") && 
                !S(tmpAlias).contains("mpls") 
                ){
                    provisoFlag=1;
                    noEnrichFlag=1; 
                    unknownFlag=0;
                    anErichment= { 
                        provisoFlag : provisoFlag, unknownFlag : unknownFlag , label : label , noEnrichFlag:noEnrichFlag,pollInterval:pollInterval,speedCat:speedCat,
                        parentPOP:parentPOP, 

                        specialService : '', sp_service : '', sp_provider : '', sp_termination : '',sp_connType : '', sp_bundleId : '', sp_linkNumber : '', 
                        sp_CID : '', sp_TECID : '', sp_subCable : '', sp_speed:'',actualspeed:'',sp_customer : '',
                        sp_pop : '',sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', sp_serviceType : '', sp_ipType : '', sp_vendor : '',sp_sourceCore : '', sp_destCore : '', 
                        sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
                    };

        }
        else{
            provisoFlag=0;
            noEnrichFlag=1; 
            unknownFlag=0;
            anErichment= { 
                provisoFlag : provisoFlag, unknownFlag : unknownFlag , label : label , noEnrichFlag:noEnrichFlag,pollInterval:pollInterval ,speedCat:speedCat,
                parentPOP:parentPOP,

                specialService : '', sp_service : '', sp_provider : '', sp_termination : '',sp_connType : '', sp_bundleId : '', sp_linkNumber : '', 
                sp_CID : '', sp_TECID : '', sp_subCable : '', sp_speed:'',actualspeed:'',sp_customer : '', sp_pop : '',sp_emsOrder : '', sp_connectedBW : '',sp_fwType : '', 
                sp_serviceType : '', sp_ipType : '', sp_vendor : '',sp_sourceCore : '', sp_destCore : '', 
                sp_siteCode:'',sp_preNumber:'',sp_portID:'',secondHost:'',secondInterface:'',secondPOP:'',type:'',pop:''                        
            };
        }
        

        if(!S(alias).isEmpty() && unknownFlag==1){
             // logger.warn(hostname+" "+ipaddress+" : special services interface with invalid description - Service: "+specialService+" - ifAlias: "+alias+" - interfaceName: "+ifName+" - ifIndex: "+ifIndex);
        }
        if(!S(alias).isEmpty() && noEnrichFlag==1){
             // logger.warn(hostname+" "+ipaddress+" : Interface with no enrichment has been marked to import into proviso - ifAlias: "+alias+" - ifName: "+interfaceName+" - ifIndex: "+ifIndex);
        }
        if(anErichment) {
            anErichment.actualspeed = self.setActualSpeed(sp_speed,ifSpeed,ifHighSpeed);
            anErichment.actualspeedText = self.convertSpeedToText(anErichment.actualspeed,1);
            anErichment.ifSpeedText = self.convertSpeedToText(ifSpeed,1);
            anErichment.ifHighSpeedText = self.convertSpeedToText(ifHighSpeed,1000000);
            anErichment.sp_speedText = self.convertSpeedToText(anErichment.sp_speed,1);
        }

        return anErichment;

    }
    self.saveDeviceOnError = function(){
        if(self.errorRetrievingSysOID == true && self.deviceSaved == false){
            try{
                self.deviceSaved = true;
                console.log("self.saveDeviceOnError() - errorRetrievingSysOID "+self.name);
                self.deviceSyncCycles = self.deviceSyncCycles + 1;
                Device.findByIdAndUpdate(device._id,{ lastSyncTime: new Date(),deviceSyncCycles:self.deviceSyncCycles,
                pop:self.devicePOP,popLongName:self.devicePOPLongName,cabinet:self.cabinetName,sector:self.deviceSector,gov:self.deviceGove,district:self.deviceDistrict,
                popType:self.devicePOPType },function(error,updatedDevice){
                    if(error){
                         logger.error(error);
                    }
                    else{
                        if(self.session) {
                            try{
                                self.session.close();
                            }
                            catch(e){
                                logger.error("caught an error inside self.saveDeviceOnError: "+e);
                                self.destroy();
                                logger.info("self.saveDeviceOnError, snmp socket closed for "+self.name);                    
                            }
                            finally{
                            }
                        }
                    }
                });
                
            }
            catch(error){
                logger.error("caught error while saving device on sysObjectID error "+self.name+": "+error);
            }
        }
        else if(self.deviceSaved == false){
            self.deviceSaved = true;
            self.deviceSyncCycles = self.deviceSyncCycles + 1;
            logger.info("self.saveDeviceOnError() - general Error "+self.name);
            try{
                Device.findByIdAndUpdate(device._id,{ lastSyncTime: new Date(),deviceSyncCycles:self.deviceSyncCycles,type: self.deviceType,model: self.deviceModel,
                    vendor: self.deviceVendor,sysObjectID: self.modelOID,sysName: self.sysName,popLongName:self.devicePOPLongName,
                    pop:self.devicePOP,cabinet:self.cabinetName,sector:self.deviceSector,gov:self.deviceGove,district:self.deviceDistrict,
                    popType:self.devicePOPType },function(error,updatedDevice){
                    if(error){
                         logger.error(error);
                    }
                    else{
                        if(self.session) {
                            try{
                                self.session.close();
                            }
                            catch(e){
                                logger.error("caught an error inside self.findByIdAndUpdate: "+e);
                                self.destroy();
                                logger.info("self.findByIdAndUpdate, snmp socket closed for "+self.name);                    
                            }
                            finally{
                            }
                        }
                    }
                });//
            }
            catch(error){
                logger.error("caught error while saving device on error "+ self.name+": "+error);
            }

        }
    }
    self.saveDevice = function(device,deviceSyncCycles){
        if(self.deviceSaved == false){
            try{
                self.deviceSaved = true;
                console.log(self.interfaceUpdateMap.size + self.filteredInterestInterfacesMap.size);
                    self.interfaceUpdateMap.forEach(function(interface,key) {
                        self.deviceInterfaces.push(interface);
                        if(self.filteredInterestInterfacesMap.has(key)) self.filteredInterestInterfacesMap.delete(key);
                    });
            
                    self.filteredInterestInterfacesMap.forEach(function(interface, key) {
                        self.deviceInterfaces.push(interface);
                        
                    });
                    // Device.findByIdAndUpdate(device._id,{interfaces: self.deviceInterfaces, discovered: true, lastSyncTime: new Date(),deviceSyncCycles:self.deviceSyncCycles,
                    Device.findByIdAndUpdate(device._id,{interfaces: self.deviceInterfaces, discovered: true, lastSyncTime: new Date(),deviceSyncCycles:self.deviceSyncCycles,
                        type: self.deviceType,model: self.deviceModel,vendor: self.deviceVendor,sysObjectID: self.device.sysObjectID,sysName: self.sysName,pop:self.devicePOP,
                        popLongName:self.devicePOPLongName,cabinet:self.cabinetName,sector:self.deviceSector,gov:self.deviceGove,district:self.deviceDistrict,
                        popType:self.devicePOPType},function(error,updatedDevice){
                        if(error){
                             logger.error(error);
                        }
                        else{
                            if(self.session) {
                                try{
                                    self.session.close();
                                }
                                catch(e){
                                    logger.error("caught an error inside self.saveDevice: "+e);
                                    self.destroy();
                                    logger.info("self.saveDevice, snmp socket closed for "+self.name);                    
                                }
                                finally{
                                }
                            }
                        }
                    });
                
            }
            catch(error){
                logger.error("caught an error while saving device "+self.name+": "+error);
            }
        }
    };
    self.deleteDevice = function(device){
        Device.findByIdAndRemove(device._id,function(error){
            if(error) logger.error(error);
            if(self.session) {
                try{
                    self.session.close();
                }
                catch(e){
                    logger.error("caught an error inside self.deleteDevice: "+e);
                    self.destroy();
                    logger.info("self.deleteDevice, snmp socket closed for "+self.name);                    
                }
                finally{
                }
            }
        });
    };
    self.getInterfaceFromInterestList = function(interfaceIndex){
        var intf = new Interface();
        var interface = self.filteredInterestInterfacesMap.get(interfaceIndex);
        intf = Object.assign(intf,interface);
        return intf;
    };    

    self.retrieveIfTable = function( table,callback){
        var indexes = [];
        for (index in table){
            indexes.push (parseInt (index));
        }
        indexes.sort (sortInt);
        // Use the sorted indexes we've calculated to walk through each row in order
        var i = indexes.length
        var columns = [];
        var columnSorted = false;
        async.forEachOf(table,function (value, key, callback){
            anInterface = new Interface();
            // anInterface.hostname = self.device.hostname;
            anInterface.ipaddress = self.device.ipaddress;
            // anInterface.devType = S(self.deviceType).s;
            // anInterface.devVendor = S(self.deviceVendor).s;
            // anInterface.devModel = S(self.deviceModel).s;
            // anInterface.devPOP = S(self.devicePOP).s;
            // anInterface.devCabinet = S(self.cabinetName).s;
            // anInterface.parentPOP = "Unknown";
            anInterface.ifIndex = key;//value[ifTableColumns.ifIndex];
            anInterface.ifDescr = value[ifTableColumns.ifDescr];
            anInterface.ifType = value[ifTableColumns.ifType];
            anInterface.ifTypeStr = snmpConstants.ifTypeStringLookup[S(anInterface.ifType).toInt()];
            anInterface.ifSpeed = value[ifTableColumns.ifSpeed];
            anInterface.adminStatus = value[ifTableColumns.ifAdminStatus];
            anInterface.operStatus  = value[ifTableColumns.ifOperStatus];
            anInterface.ifInOctets  = value[ifTableColumns.ifInOctets];
            anInterface.ifOutOctets  = value[ifTableColumns.ifOutOctets];
            anInterface._id = self.constructInterfaceID(anInterface.ipaddress,anInterface.ifIndex);
            // anInterface.lastUpdate = new Date();
            var interfaceType = S(anInterface.ifType).toInt();
            if(anInterface.operStatus == snmpConstants.ifAdminOperStatus.up){
                    self.interestInterfacesMap.set(key,anInterface);
            }
        }); 
        self.ifTableError = false;
        self.ifXTableError = false;
        // return self.interfaces;
        return self.interestInterfacesMap;
    };
    self.retrieveIfXTable = function( table,callback){
        var indexes = [];
        for (index in table){
            indexes.push (parseInt (index));
        }
        indexes.sort (sortInt);
        // Use the sorted indexes we've calculated to walk through each
        // row in order
        var i = indexes.length
        var columns = [];
        var columnSorted = false;

        async.forEachOf(table,function (value, key, callback){
            // if(self.interestKeys.includes(key)){
            //     var intf= self.interfaces[key];
            if(self.interestInterfacesMap.has(key)){
                var intf= self.interestInterfacesMap.get(key);
                self.updateDeviceDetailsForInterface(intf);
                intf.ifName = value[ifXTableColumns.ifName];
                intf.ifAlias = value[ifXTableColumns.ifAlias];
                intf.ifHighSpeed = value[ifXTableColumns.ifHighSpeed];

                // if((intf.devType.toLowerCase() =="router") || (intf.devType.toLowerCase() =="switch")){
                //     if(self.devicePOP) intf.pop = self.devicePOP+"_"+self.deviceGove;
                //     else intf.pop = "Unknown";
                // }
                var name="",lowerCaseName="";
                if(!S(intf.ifName).isEmpty()) {
                    name = S(intf.ifName).trim().s;
                    lowerCaseName = name.toLowerCase();
                }
                var alias="";
                if(!S(intf.ifAlias).isEmpty()){
                    alias = S(intf.ifAlias).trim().s;
                }

                if(name && intf.devVendor.toLowerCase() == "zte" ) name = name.toString(16);
                if(alias && intf.devVendor.toLowerCase() == "zte") alias = alias.toString(16)

                var hcInOctets = value[ifXTableColumns.ifHCInOctets];
                var hcOutOctets = value[ifXTableColumns.ifHCOutOctets];
                var hcInOctetsLarge = false, hcOutOctetsLarge =false;

                var bufInt , hcInOctetsBufferLength = 0 , hcOutOctetsBufferLength = 0;
                try{
                    if(hcInOctets && hcInOctets.toString("hex").length > 2) hcInOctetsLarge=true;//has traffic 
                    if(hcOutOctets && hcOutOctets.toString("hex").length > 2) hcOutOctetsLarge= true;//has traffic 

                }
                catch(e){
                    if(S(e.toString()).contains("RangeError")) {
                        if(hcInOctets && hcInOctets.toString(16).length > 2) hcInOctetsLarge=true;
                        if(hcOutOctets && hcOutOctets.toString(16).length > 2) hcOutOctetsLarge= true;

                        logger.warn("handled exception while converting from hex: "+e);
                    }

                }

                var rawInterface = new RawInterface();
                rawInterface.ifHCInOctets = hcInOctetsLarge;
                rawInterface.ifHCOutOctets = hcOutOctetsLarge;
                if((hcInOctetsLarge == true) || (hcOutOctetsLarge == true) || (intf.ifInOctets > 0) || (intf.ifOutOctets > 0)){

                    if( ((intf.devType.toLowerCase() =="router") || (intf.devType.toLowerCase() =="switch")) && !S(lowerCaseName).isEmpty() && !S(lowerCaseName).contains('pppoe') && !S(lowerCaseName).startsWith("vi")
                        )//&& !(intf.ifName == S("Gi0/3").s) && !(intf.ifName == S("Gi0/1").s) && !(self.name == S("HELWAN-S02C-C-EG").s)) 
                    {
                        intf.counters = 32;
                        if(hcInOctetsLarge || hcOutOctetsLarge) {
							if(intf.ifHighSpeed && intf.ifHighSpeed>0) {
								intf.counters = "64";
							}
							else{
								intf.counters = "64_32";
							}
						}
                        var enrichment = self.parseIfAlias(alias,self.name,name,intf.ifIndex,self.device.ipaddress,intf.ifSpeed ,intf.ifHighSpeed);
                        if(enrichment) {
                            Object.assign(intf,enrichment);
                            self.filteredInterestInterfacesMap.set(intf.ifIndex,intf);

                        }                       
                    }
                    // else if((intf.devVendor == "huawei") && ((intf.devType =="msan") || (intf.devType =="gpon") || (intf.devType =="dslam"))  ){
                    else if(((intf.devType.toLowerCase() =="msan") || (intf.devType.toLowerCase() =="gpon") || (intf.devType.toLowerCase() =="dslam"))  ){
                        if(((S(intf.ifType).toInt() == 6) || (S(intf.ifType).toInt() == 117))){
                            intf.counters = 32;
							if(hcInOctetsLarge || hcOutOctetsLarge) {
								if(intf.ifHighSpeed && intf.ifHighSpeed>0) {
									intf.counters = "64";
								}
								else{
									intf.counters = "64_32";
								}
							}
                            var enrichment = self.parseIfAlias(alias,self.name,name,intf.ifIndex,self.device.ipaddress,intf.ifSpeed ,intf.ifHighSpeed);
                            if(enrichment) {
                                Object.assign(intf,enrichment);
                                self.filteredInterestInterfacesMap.set(intf.ifIndex,intf);
                            }                       
                        }
                    }
                }
                else{
                    // logger.warn("interface "+lowerCaseName+ " on device "+self.name+ " has no traffic");
                }
            }
        }); 
        self.ifTableError = false;
        self.ifXTableError = false;
        // return self.interestInterfaces;
        return self.filteredInterestInterfacesMap;
    };    
    self.createInterfaces  = function(interfaceList){
        try{
            self.filteredInterestInterfacesMap.forEach(function(interface, key) {
                interface._id = self.constructInterfaceID(interface.ipaddress,interface.ifIndex);
                Interface.create(interface,function(error,createdInterface){
                    if(error){
                         logger.error(error);
                    }
                });
            });
        }
        catch(error){
            logger.error("caught an error while creating interface: "+error);
        }
    };
    self.updateInterfaces  = function(interfaceList){
        try{
            var ignoreMissing = true;
            interfaceList.forEach(function(interface,key) {
                    if(self.filteredInterestInterfacesMap.has(key)) self.filteredInterestInterfacesMap.delete(key);
                    var interfaceID = self.constructInterfaceID(interface.ipaddress,interface.ifIndex);
                    Interface.findById(interfaceID,function(error,foundInterface){
                        if(error){
                            logger.error(error);
                        }
                        else if(foundInterface != null){
                            self.allowedFields.forEach(function(field) {
                                // if (interface && updatedInterface && (typeof interface[field] !== 'undefined') && ignoreMissing ) {
                                // if (interface && foundInterface) {
                                    if(interface[field] != null || interface[field] !== 'undefined') foundInterface[field] = interface[field];
                                    else foundInterface[field] = '';
                                // }
                            });
                            foundInterface.save();                            
                        }
                        else{
                            logger.error("Can't find interface: "+interface.ipaddress+" / "+interface.ifIndex);
                        }
                    });
            });
        }
        catch(error){
            logger.error("caught an error while updating interface: "+error);
        }
    };
    self.removeInterfaces  = function(interfaceList){
        try{
            interfaceList.forEach(function(interface){
                logger.warn("deleting interface on device "+self.name+" with ifIndex: "+interface.ifIndex);
                interface._id = self.constructInterfaceID(interface.ipaddress,interface.ifIndex);
                Interface.findByIdAndRemove(interface._id,function(error){
                    if(error){
                         logger.error(error);
                    }
                });
            });
        }
        catch(error){
            logger.error("caught an error while deleteing interface: "+error);
        }
    };
    self.copyObject = function(toObject,fromObject,override){
        toObject._id = fromObject._id;//make sure we have the correct _id
        if(fromObject.ifName) toObject.ifName = fromObject.ifName;
        if(fromObject.ifAlias) toObject.ifAlias = fromObject.ifAlias;
        if(fromObject.ifDescr) toObject.ifDescr = fromObject.ifDescr
        if(fromObject.ifType) toObject.ifType = fromObject.ifType
        if(fromObject.ifTypeStr) toObject.ifTypeStr = fromObject.ifTypeStr
        if(fromObject.ifSpeed) toObject.ifSpeed = fromObject.ifSpeed
        if(fromObject.ifHighSpeed) toObject.ifHighSpeed = fromObject.ifHighSpeed
        if(fromObject.ifHCInOctets) toObject.ifHCInOctets = fromObject.ifHCInOctets
        if(fromObject.ifHCOutOctets) toObject.ifHCOutOctets = fromObject.ifHCOutOctets
        if(fromObject.pollInterval && override == true) toObject.pollInterval = fromObject.pollInterval
        if(fromObject.counters) toObject.counters = fromObject.counters
        if(fromObject.type && override == true) toObject.type  = fromObject.type 
        if(fromObject.specialService) toObject.specialService = fromObject.specialService
        if(fromObject.secondPOP && override == true) toObject.secondPOP = fromObject.secondPOP
        if(fromObject.secondHost && override == true) toObject.secondHost = fromObject.secondHost
        if(fromObject.secondInterface && override == true) toObject.secondInterface = fromObject.secondInterface
        if(fromObject.label) toObject.label = fromObject.label
        if(fromObject.provisoFlag) toObject.provisoFlag = fromObject.provisoFlag
        if(fromObject.noEnrichFlag) toObject.noEnrichFlag = fromObject.noEnrichFlag
        if(fromObject.devType) toObject.devType = fromObject.devType
        if(fromObject.devVendor) toObject.devVendor = fromObject.devVendor
        if(fromObject.devModel) toObject.devModel = fromObject.devModel
        if(fromObject.sp_service && override == true) toObject.sp_service = fromObject.sp_service
        if(fromObject.sp_provider && override == true) toObject.sp_provider = fromObject.sp_provider
        if(fromObject.sp_termination && override == true) toObject.sp_termination = fromObject.sp_termination
        if(fromObject.sp_bundleId && override == true) toObject.sp_bundleId = fromObject.sp_bundleId
        if(fromObject.sp_linkNumber && override == true) toObject.sp_linkNumber = fromObject.sp_linkNumber
        if(fromObject.sp_CID && override == true) toObject.sp_CID = fromObject.sp_CID
        if(fromObject.sp_TECID && override == true) toObject.sp_TECID = fromObject.sp_TECID
        if(fromObject.sp_subCable && override == true) toObject.sp_subCable = fromObject.sp_subCable
        if(fromObject.sp_customer && override == true) toObject.sp_customer = fromObject.sp_customer
        if(fromObject.sp_sourceCore && override == true) toObject.sp_sourceCore = fromObject.sp_sourceCore
        if(fromObject.sp_destCore && override == true) toObject.sp_destCore = fromObject.sp_destCore
        if(fromObject.sp_vendor && override == true) toObject.sp_vendor = fromObject.sp_vendor
        if(fromObject.sp_speed && override == true) toObject.sp_speed = fromObject.sp_speed
        if(fromObject.sp_pop && override == true) toObject.sp_pop = fromObject.sp_pop
        if(fromObject.sp_fwType && override == true) toObject.sp_fwType = fromObject.sp_fwType
        if(fromObject.sp_serviceType && override == true) toObject.sp_serviceType = fromObject.sp_serviceType
        if(fromObject.sp_ipType && override == true) toObject.sp_ipType = fromObject.sp_ipType
        if(fromObject.sp_siteCode) toObject.sp_siteCode = fromObject.sp_siteCode
        if(fromObject.sp_connType && override == true) toObject.sp_connType = fromObject.sp_connType
        if(fromObject.sp_emsOrder && override == true) toObject.sp_emsOrder = fromObject.sp_emsOrder
        if(fromObject.sp_connectedBW && override == true) toObject.sp_connectedBW = fromObject.sp_connectedBW
        if(fromObject.sp_preNumber && override == true) toObject.sp_preNumber = fromObject.sp_preNumber
        if(fromObject.sp_dpiName && override == true) toObject.sp_dpiName = fromObject.sp_dpiName
        if(fromObject.sp_portID && override == true) toObject.sp_portID = fromObject.sp_portID
        if(fromObject.speedCat && override == true) toObject.speedCat = fromObject.speedCat
        else toObject.speedCat = "";
        if(fromObject.unknownFlag) toObject.unknownFlag     = fromObject.unknownFlag    
        if(fromObject.adminStatus) toObject.adminStatus = fromObject.adminStatus
        if(fromObject.operStatus) toObject.operStatus = fromObject.operStatus
        if(fromObject.actualspeed && override == true) toObject.actualspeed = fromObject.actualspeed
        if(fromObject.hostname) toObject.hostname = fromObject.hostname;
        if(fromObject.ipaddress) toObject.ipaddress = fromObject.ipaddress;
        if(fromObject.pop && override == true) toObject.pop = fromObject.pop;
        if(fromObject.isUpLink && override == true) toObject.isUpLink = fromObject.isUpLink;
        if(fromObject.devCabinet && override == true) toObject.devCabinet = fromObject.devCabinet;
        if(fromObject.devPOP && override == true) toObject.devPOP = fromObject.devPOP;
        if(fromObject.devGov && override == true) toObject.devGov = fromObject.devGov;
        if(fromObject.devDistrict && override == true) toObject.devDistrict = fromObject.devDistrict;
        if(fromObject.devSector && override == true) toObject.devSector = fromObject.devSector;
        if(fromObject.devPOPType && override == true) toObject.devPOPType = fromObject.devPOPType;
        if(fromObject.devPOPLongName && override == true) toObject.devPOPLongName = fromObject.devPOPLongName;
        if(fromObject.ifSpeedText && override == true) toObject.ifSpeedText = fromObject.ifSpeedText;
        if(fromObject.ifHighSpeedText && override == true) toObject.ifHighSpeedText = fromObject.ifHighSpeedText;
        if(fromObject.sp_speedText && override == true) toObject.sp_speedText = fromObject.sp_speedText;
        if(fromObject.actualspeedText && override == true) toObject.actualspeedText = fromObject.actualspeedText;

    };
        self.applyLimit = function(){
        var nonProviso1 =0,proviso1=0;
        var nonProviso2 =0, proviso2=0;

        var sum = self.interfaceUpdateMap.size + self.filteredInterestInterfacesMap.size;
        console.log("sum: "+sum);
        var extra,ratio1,ratio2,toBeDeleted1,toBeDeleted2;

        self.interfaceUpdateMap.forEach(function(interface,key) {
          if(self.interfaceUpdateMap.get(key).provisoFlag == 1) {
            proviso1++;
          }
          else {
            nonProviso1++;
          }
        });
        self.filteredInterestInterfacesMap.forEach(function(interface,key) {
          if(self.filteredInterestInterfacesMap.get(key).provisoFlag == 1) {
            proviso2++;
          }
          else {
            nonProviso2++;
          }
        });
        console.log(proviso1+" | "+nonProviso1+" | "+proviso2+" | "+nonProviso2);
        if(sum >= ARRAY_SIZE_LIMIT){
           extra = sum -ARRAY_SIZE_LIMIT;
          // console.log("extra: "+extra);
          ratio1 = nonProviso1/(nonProviso1+nonProviso2);console.log("ratio1: "+ratio1);
          ratio2 = nonProviso2/(nonProviso1+nonProviso2);console.log("ratio2: "+ratio2);
          toBeDeleted1 = Math.ceil(ratio1 * extra);console.log("toBeDeleted1: "+toBeDeleted1);
          toBeDeleted2 = Math.ceil(ratio2 * extra);console.log("toBeDeleted2: "+toBeDeleted2);
        }
        var counter1=0,counter2=0;

        // self.interfaceUpdateMap.forEach(function(interface,key) {
        //   if(self.interfaceUpdateMap.get(key).provisoFlag == 0 && counter1 < toBeDeleted1 && !self.device.interfaces.includes(interface)) {
        //     self.interfaceUpdateMap.delete(key);
        //     counter1++;
        //   }
        // });

        // self.filteredInterestInterfacesMap.forEach(function(interface,key) {
        //   if(self.filteredInterestInterfacesMap.get(key).provisoFlag == 0 && counter2 < toBeDeleted2 && !self.device.interfaces.includes(interface)) {
        //     self.filteredInterestInterfacesMap.delete(key);
        //     counter2++;
        //   }
        // });
        self.filteredInterestInterfacesMap.forEach(function(interface,key) {
          if(self.filteredInterestInterfacesMap.get(key).provisoFlag == 0 && counter2 < extra ) {
            self.filteredInterestInterfacesMap.delete(key);
            counter2++;
          }
        });
        console.log(counter1+" | "+counter2);
        console.log(self.filteredInterestInterfacesMap.size + self.interfaceUpdateMap.size);
    };

    self.applySyncRules = function(){
        async.forEachOf(self.device.interfaces,function(interface,key,callback){
            var syncCycles = S(interface.syncCycles).toInt();
            interface.syncCycles = syncCycles + 1;
            // if: current interface index found in interestInterfaces and interface not updated, then: update interface
            if(self.filteredInterestInterfacesMap.has(interface.ifIndex) && (interface.lastUpdate === undefined)){
                var intf = self.getInterfaceFromInterestList(interface.ifIndex);
                self.copyObject(interface,intf,true);
                interface.syncCycles = 0;
                interface.lastSyncTime = new Date();
                //remove interface from list of interest interfaces as it is already exists
                // self.removeInterfaceFromInterestList(interface.ifIndex);
                self.filteredInterestInterfacesMap.delete(interface.ifIndex);
                self.interfaceUpdateMap.set(interface.ifIndex,interface);
            }
            // if: current interface index found in interestInterfaces and interface updated, then: skip
            else if(self.filteredInterestInterfacesMap.has(interface.ifIndex) && (interface.lastUpdate instanceof Date)){
                //remove interface from list of interest interfaces as it is already exists
                var intf = self.getInterfaceFromInterestList(interface.ifIndex);
                self.copyObject(interface,intf,false);
                interface.lastSyncTime = new Date();
                interface.syncCycles = 0;
                // self.removeInterfaceFromInterestList(interface.ifIndex);
                self.filteredInterestInterfacesMap.delete(interface.ifIndex);
                self.interfaceUpdateMap.set(interface.ifIndex,interface);
            }
            else if(!self.filteredInterestInterfacesMap.has(interface.ifIndex) && !(interface.lastUpdate instanceof Date)){
                if(interface.lastSyncTime instanceof Date){
                    if((self.getMinutesDifference(new Date(),interface.lastSyncTime) > SYNC_DIFFERENCE_IN_MINUTES) && (interface.syncCycles > syncCyclesThreshold)){
                        self.interfaceRemoveList.push(interface);//we will remove directly
                    }
                    else{
                        interface.lastSyncTime = new Date();
                        self.interfaceUpdateMap.set(interface.ifIndex,interface);
                    }

                }
                else{
                    interface.lastSyncTime = new Date();
                    self.interfaceUpdateMap.set(interface.ifIndex,interface);
                    //remove interface from list of interest interfaces as it is already exists
                }
            }
            else if(!self.filteredInterestInterfacesMap.has(interface.ifIndex) && (interface.lastUpdate instanceof Date)){
                        logger.warn("interface not found, but was updated by a user, ifIndex: "+interface.ifIndex);
                        interface.syncCycles = 0;
                        interface.lastSyncTime = new Date();
                        self.interfaceUpdateMap.set(interface.ifIndex,interface);
            }
        });//end of async.forEachOf
        console.log("will apply limits");
        if((self.interfaceUpdateMap.size + self.filteredInterestInterfacesMap.size) > ARRAY_SIZE_LIMIT) self.applyLimit();
    };
    self.checkDeviceDecommisionCondition = function(){
        if(self.device.lastSyncTime === undefined){
            self.device.lastSyncTime = new Date();
            self.deviceToBeDeleted = false;
            self.deviceSyncCycles = self.deviceSyncCycles + 1;
        }
        // else if( (self.interestInterfaces.length + self.interfaceUpdateList.length) == 0){
        // else if( (self.interestInterfaces.length + self.interfaceUpdateSet.size) == 0){
        else if( (self.filteredInterestInterfacesMap.size + self.interfaceUpdateMap.size) == 0){
            logger.info(" device decommissioning conditions are : "+self.getMinutesDifference(new Date(),self.device.lastSyncTime)+"\t"+SYNC_DIFFERENCE_IN_MINUTES+"\t"+self.deviceSyncCycles+"\t"+syncCyclesThreshold);
            if( ( self.getMinutesDifference(new Date(),self.device.lastSyncTime) > SYNC_DIFFERENCE_IN_MINUTES) && self.deviceSyncCycles > syncCyclesThreshold){
                self.deviceToBeDeleted = true;
                logger.warn("device "+self.name+" will be decommissioned");
            }
            else{
                self.deviceSyncCycles = self.deviceSyncCycles + 1;
            }
        }
        else{
            self.deviceToBeDeleted = false;
            self.deviceSyncCycles = 0;
        }

    };
    self.saveInterfacesView = function(){
        if(self.interfaceUpdateMap.size > 0) self.updateInterfaces(self.interfaceUpdateMap);
        if(self.filteredInterestInterfacesMap.size > 0) self.createInterfaces(self.filteredInterestInterfacesMap);
        if(self.interfaceRemoveList.length > 0) self.removeInterfaces(self.interfaceRemoveList);
    };
    self.ifXTableResponseCb = function  (error, table) {
        if (error) {
            logger.error ("device "+self.name+ " has " +error.toString() + " while reading ifXTable");
            self.ifTableError = true;
            self.ifXTableError = true;
            if(self.session) {
                try{
                    self.session.close();
                }
                catch(e){
                    logger.error("caught an error inside self.ifXTableResponseCb: "+e);
                    self.destroy();
                    logger.info("self.ifXTableResponseCb, snmp socket closed for "+self.name);                    
                }
                finally{
                }
            }
            self.saveDeviceOnError();
            // throttle = throttle + 1;
        }
        else{
            if(self.inSyncMode){
                self.retrieveIfXTable(table,function(){});
                self.applySyncRules();
                self.saveInterfacesView();
                self.checkDeviceDecommisionCondition();
                if(self.deviceToBeDeleted == false ) self.saveDevice(self.device); 
                else self.deleteDevice(self.device);
            }else{
                self.createInterfaces(self.retrieveIfXTable(table,function(){}));
                self.saveDevice(self.device,0); 
            }

        }
    };    
    self.ifTableResponseCb = function  (error, table) {
        if (error) {
            logger.error ("device "+self.name+ " has " +error.toString() + " while reading ifTable");
            self.ifTableError = true;
            self.ifXTableError = true;
            if(self.session) {
                try{
                    self.session.close();
                }
                catch(e){
                    logger.error("caught an error inside self.ifTableResponseCb: "+e);
                    self.destroy();
                    logger.info("self.ifTableResponseCb, snmp socket closed for "+self.name);                    
                }
                finally{
                }
            }
            self.saveDeviceOnError();
            // throttle = throttle + 1;
        }
        else{
            self.retrieveIfTable(table,function(){});
            if(self.session) self.session.tableColumnsAsync(oids.ifXTable.OID, oids.ifXTable.Columns, self.maxRepetitions, self.ifXTableResponseCb); 
            else self.destroy();           
        }
    };
    self.syncInterfaces = function(){
        // discover new list of filtered interface indices
        // if: current interface index found in list and interface updated, then: skip
        // if: current interface index found in list and interface not updated, then: update interface
        // if: current interface index not found and updated and syncCyles > threshold, then: let "delete = true" and update interface
        // if: current interface index not found and not updated and syncCyles > threshold, then: delete interface
        // if: new interface index, then create interface 
        try{
            if(self.session){
                throttle = throttle -1;
                self.inSyncMode = true;
                logger.info("in sync mode for: "+self.name+" "+self.device.ipaddress+" "+self.device.community);
                self.session.get (systemDetails, function (error, varbinds) {  
                    if (error) {

                        logger.error ("device "+self.name+" has "+error.toString() +" while getting sysObjectID");
                    } 
                    else{
                        for (var i = 0; i < varbinds.length; i++) {
                            if (snmp.isVarbindError (varbinds[i])){
                                logger.error (snmp.varbindError (varbinds[i]));
                            }
                            else {
                                if(i == systemDetailsColumns.sysObjectID) self.modelOID = varbinds[i].value;
                                if(i == systemDetailsColumns.sysName) self.sysName = varbinds[i].value;
                            }
                        }               
                    }
                    
                    if(self.modelOID) {
                        self.modelOID = "."+self.modelOID;
                        self.device.sysObjectID = self.modelOID;
                    }
                    else if(self.device.sysObjectID) self.modelOID = self.device.sysObjectID;
                    if(S(self.sysName).isEmpty()) self.sysName = "Unknown";

                    if(self.modelOID){
                        DeviceModel.findOne({oid: self.modelOID},function(error,foundModel){
                            if(error){
                                logger.error ("device "+self.name+" has "+error.toString() +" while checking model ID table"); 
                                if(self.session) {
                                    try{
                                        self.session.close();
                                    }
                                    catch(e){
                                        logger.error("caught an error inside self.syncInterfaces: "+e);
                                        self.destroy();
                                        logger.info("self.syncInterfaces, snmp socket closed for "+self.name);                    
                                    }
                                    finally{
                                    }
                                }
                            }
                            else if(foundModel != null){
                                self.deviceVendor = foundModel.vendor;
                                self.deviceType  = foundModel.type;
                                self.deviceModel = foundModel.model ;
                                if(self.session) self.session.tableColumns(oids.ifTable.OID, oids.ifTable.Columns, self.maxRepetitions, self.ifTableResponseCb);
                                else self.destroy();
                            }
                            else{
                                self.deviceType = S(self.device.type);
                                self.deviceVendor = S(self.device.vendor);
                                self.deviceModel = S(self.device.model);
                                if(self.session) self.session.tableColumnsAsync(oids.ifTable.OID, oids.ifTable.Columns, self.maxRepetitions, self.ifTableResponseCb);
                                else self.destroy();
                            }        

                        });                
                    }
                    else{
                        self.errorRetrievingSysOID = true;
                        self.saveDeviceOnError();
                    }
                    
                });

            }else{
                self.destroy();
            }

        }
        catch(error){

        }
    };
    self.discoverInterfaces = function(){
        logger.info(self.name+" "+self.device.ipaddress+" "+self.device.community);
        if(self.session) self.session.tableColumnsAsync(oids.ifTable.OID, oids.ifTable.Columns, self.maxRepetitions, self.ifTableResponseCb);
        else logger.error("couldn't find SNMP session!!");
    };
}
//SNMP Table
function sortInt (a, b) {
    if (a > b)
        return 1;
    else if (b > a)
        return -1;
    else
        return 0;
}

String.prototype.escapeSpecialChars = function() {
    return this.replace(/\\n/g, "")
               .replace(/\\'/g, "")
               .replace(/\\"/g, '')
               .replace(/\\&/g, "")
               .replace(/\\r/g, "")
               .replace(/\\t/g, "")
               .replace(/\\b/g, "")
               .replace(/\\f/g, "");
};
router.get("/pagination?", middleware.isLoggedIn ,function(request, response) {
        // limit is the number of rows per page
        var limit = parseInt(request.query.limit);
        // offset is the page number
        var skip  = parseInt(request.query.offset);
        // search string
        var searchQuery = request.query.search ;//: 'xe-'

        if(S(searchQuery).isEmpty()){
            Device.count({}, function(err, devicesCount) {
                Device.find({},'hostname ipaddress pop popLongName sector gov district type model vendor community createdAt updatedAt lastSyncTime author lastUpdatedBy sysObjectID sysName sysDescr',{lean:true,skip:skip,limit:limit}, function(err, foundDevices) {
                    if (err) {
                         logger.error(err);
                    }
                    else {
                        var data = "{\"total\":"+ devicesCount+",\"rows\":" +  JSON.stringify(foundDevices).escapeSpecialChars()+"}";
                        response.setHeader('Content-Type', 'application/json');
                        // response.send((foundDevices)); 
                        response.send(data);        
                    }

                });

            });

        } 
        else {
            searchQuery = ".*"+S(searchQuery).s.toLowerCase()+".*";
            Device.count({'$or' : [{hostname: new RegExp(searchQuery,'i')},
                {ipaddress: new RegExp(searchQuery,'i')},
                {sector: new RegExp(searchQuery,'i')},
                {gov: new RegExp(searchQuery,'i')},
                {type: new RegExp(searchQuery,'i')},
                {model: new RegExp(searchQuery,'i')},
                {vendor: new RegExp(searchQuery,'i')},
                {pop: new RegExp(searchQuery,'i')}]}, function(err, m_devicesCount) {
                Device.find({'$or' : [{hostname: new RegExp(searchQuery,'i')},
                {ipaddress: new RegExp(searchQuery,'i')},
                {sector: new RegExp(searchQuery,'i')},
                {gov: new RegExp(searchQuery,'i')},
                {type: new RegExp(searchQuery,'i')},
                {model: new RegExp(searchQuery,'i')},
                {vendor: new RegExp(searchQuery,'i')},
                {pop: new RegExp(searchQuery,'i')}]},'hostname ipaddress pop popLongName sector gov district type model vendor community createdAt updatedAt lastSyncTime author lastUpdatedBy sysObjectID sysName sysDescr',{lean:true,skip:skip,limit:limit}, function(err, foundDevices) {
                    if (err) {
                         logger.error(err);
                    }
                    else {
                        var data = "{\"total\":"+ m_devicesCount+",\"rows\":" + JSON.stringify(foundDevices)+"}";
                        response.setHeader('Content-Type', 'application/json');
                        // response.send((foundDevices)); 
                        response.send(data);        
                    }

                });
            });

        }
});
//INDEX - show all devices
router.get("/", middleware.isLoggedIn , function(request, response) {
    response.render("devices/index");
});


var getDeviceInfo = __async__ (function(modelOID,hostname){
var parsedHostName = Parser.parseHostname(S(hostname));
    var linkEnrichmentData;
    var deviceModelOID = __await__ (DeviceModel.findOne({oid: modelOID}));
    var cabinetPOP = __await__ (Cabinet.findOne({cabinet:parsedHostName.devicePOPName}));
    var POPDetails ;
    if(cabinetPOP) POPDetails = __await__ (POP.findOne({shortName:cabinetPOP.pop,gov:parsedHostName.popGove}));
    else POPDetails = __await__ (POP.findOne({shortName:parsedHostName.devicePOPName,gov:parsedHostName.popGove}));
    if(POPDetails == null){
        POPDetails = {};
        POPDetails.shortName = "Unknown";
        POPDetails.gov = "Unknown";
        POPDetails.district = "Unknown";
        POPDetails.sector = "Unknown";
        POPDetails.popType = "Unknown";
        POPDetails.popLongName = "Unknown";
    }

    var foundRightLink = __await__ (Link.find({device1:hostname}));
    var foundLeftLink = __await__ (Link.find({device2:hostname}));

    if(foundRightLink.length > 0 || foundLeftLink.length > 0) {
        linkEnrichmentData = foundRightLink.concat(foundLeftLink);
        if(foundRightLink.length > 0 && foundLeftLink.length > 0) linkEnrichmentData.End = "both";
        else if(foundRightLink.length > 0) linkEnrichmentData.End = "left";
        else if(foundLeftLink.length > 0) linkEnrichmentData.End = "right";
    }
    else{
        linkEnrichmentData = null;
    }

    var deviceExtraDetails = {POPDetails:POPDetails,cabinetName:parsedHostName.devicePOPName,deviceModelOID:deviceModelOID,linkEnrichmentData:linkEnrichmentData};
    return deviceExtraDetails;

});


//CREATE - add new device to DB
router.post("/",  middleware.isLoggedIn ,function(request, response) {
    //get data from a form and add to devices array
    var hostname = request.body.device.hostname;
    var ipaddress = request.body.device.ipaddress;
    var communityString = request.body.device.community || "public";
    // var parsedHostName = Parser.parseHostname(S(hostname));
    var type ;
    var model ;
    var modelOID = "";
    var sysName = "";
    var vendor ;

    session = snmp.createSession(ipaddress, S(communityString).trim().s,{ timeout: 10000, retries: 1});
    session.get (systemDetails, function (error, varbinds) {
        if (error) {
            logger.error ("found error while retrieving sysObjectId for "+hostname+" "+error.toString());
            request.flash("error","found error while retrieving sysObjectId ");
            response.redirect("/devices"); 
        } else {
            for (var i = 0; i < varbinds.length; i++) {
                if (snmp.isVarbindError (varbinds[i])){
                    logger.error (snmp.varbindError (varbinds[i]));
                }
                else {
                    if(i == systemDetailsColumns.sysObjectID) modelOID = varbinds[i].value;
                    if(i == systemDetailsColumns.sysName) sysName = varbinds[i].value;
                }
            }               

            modelOID = "."+modelOID;

            var discoDevice ;
            getDeviceInfo(modelOID,hostname)
            .then(function(deviceExtraDetails){
            aDevice = {
                    hostname: hostname.trim(),
                    ipaddress: ipaddress.trim(),
                    // author: {id: request.user._id, email: request.user.email},
                    community: communityString.trim(),
                    type: deviceExtraDetails.deviceModelOID.type.trim(),
                    model: deviceExtraDetails.deviceModelOID.model.trim(),
                    vendor: deviceExtraDetails.deviceModelOID.vendor.trim(),
                    sysObjectID: modelOID,
                    sysName: sysName,
                    pop:  deviceExtraDetails.POPDetails.shortName+"_"+deviceExtraDetails.POPDetails.gov,
                    sector: deviceExtraDetails.POPDetails.sector, 
                    gov:  deviceExtraDetails.POPDetails.gov 
            };
            aDevice.interfaces = [];
            Device.create(aDevice, function(error, device) {
                if (error) {
                    logger.error(error);
                    for (field in error.errors) {
                        request.flash("error",error.errors[field].message);
                    }
                    
                }
                else {
                     logger.info("new device created and saved");
                    request.flash("success","Successfully added device, will start device discovery now");
                    // var discoDevice = new discoveredDevice(device);
                     discoDevice = new discoveredDevice(device,deviceExtraDetails.linkEnrichmentData,deviceExtraDetails.cabinetName,deviceExtraDetails.POPDetails);
                        discoDevice.discoverInterfaces();
                }
                response.redirect("/devices"); //will redirect as a GET request
            });
            })
            .catch();
        }
    });

});

//NEW - show form to create new device
//should show the form will post data to /devices
router.get("/new", middleware.isLoggedIn ,function(request, response) {
    response.render("devices/new");
});


var getDeviceFarLinks = __async__ (function(ahostname){
    var linkEnrichmentData;
    var foundRightLink = __await__ (Link.find({device1:ahostname}));
    var foundLeftLink = __await__ (Link.find({device2:ahostname}));
        if(foundRightLink.length > 0 || foundLeftLink.length > 0) {
            linkEnrichmentData = foundRightLink.concat(foundLeftLink);
            if(foundRightLink.length > 0 && foundLeftLink.length > 0) linkEnrichmentData.End = "both";
            else if(foundRightLink.length > 0) linkEnrichmentData.End = "left";
            else if(foundLeftLink.length > 0) linkEnrichmentData.End = "right";
        }
        else{
            linkEnrichmentData = null;
        }
        return linkEnrichmentData;
});


var getDeviceList = __async__ (function(){
    var deviceList = [];
    var devicePOP ;
    var linkEnrichmentData;
    var foundDevices = __await__ (Device.find({},{lean:false}));

    foundDevices.forEach(function (device, i) {
        var parsedHostName = Parser.parseHostname(S(device.hostname));
        var cabinetPOP = __await__ (Cabinet.findOne({cabinet:parsedHostName.devicePOPName}));
        var POPDetails ;
        if(cabinetPOP) POPDetails = __await__ (POP.findOne({shortName:cabinetPOP.pop,gov:parsedHostName.popGove}));
        else POPDetails = __await__ (POP.findOne({shortName:parsedHostName.devicePOPName,gov:parsedHostName.popGove}));
        if(POPDetails == null){
            POPDetails = {};
            POPDetails.shortName = "Unknown";
            POPDetails.gov = "Unknown";
            POPDetails.district = "Unknown";
            POPDetails.sector = "Unknown";
            POPDetails.popType = "Unknown";
            POPDetails.popLongName = "Unknown";
            // POPDetails.parentPOP = "Unknown";
        }
        var foundRightLink = __await__ (Link.find({device1:device.hostname}));
        var foundLeftLink = __await__ (Link.find({device2:device.hostname}));

        if(foundRightLink.length > 0 || foundLeftLink.length > 0) {
            linkEnrichmentData = foundRightLink.concat(foundLeftLink);
            if(foundRightLink.length > 0) linkEnrichmentData.isLeftEnd = true;
            else linkEnrichmentData.isLeftEnd = false;
        }
        else{
            linkEnrichmentData = null;
        }
        var deviceExtraDetails = {POPDetails:POPDetails,cabinetName:parsedHostName.devicePOPName,linkEnrichmentData:linkEnrichmentData};

        if (POPDetails) deviceList.push( new discoveredDevice(device.toObject(),deviceExtraDetails.linkEnrichmentData,deviceExtraDetails.cabinetName,
            deviceExtraDetails.POPDetails));    
        else deviceList.push( new discoveredDevice(device.toObject(),linkEnrichmentData));

        if(deviceList.length % 250 == 0) process.stdout.write("=");

    });
    return deviceList;
});

var getdeviceExtraDetails = __async__(function(hostname){
    var parsedHostName = Parser.parseHostname(S(hostname));
    var linkEnrichmentData;
    var cabinetPOP = __await__ (Cabinet.findOne({cabinet:parsedHostName.devicePOPName}));
    var POPDetails ;
    if(cabinetPOP) {
        POPDetails = __await__ (POP.findOne({shortName:cabinetPOP.pop,gov:parsedHostName.popGove}));
    }
    else {
        POPDetails = __await__ (POP.findOne({shortName:parsedHostName.devicePOPName,gov:parsedHostName.popGove}));
    }
    if(POPDetails == null){
        POPDetails = {};
        POPDetails.shortName = "Unknown";
        POPDetails.gov = "Unknown";
        POPDetails.district = "Unknown";
        POPDetails.sector = "Unknown";
        POPDetails.popType = "Unknown";
        POPDetails.popLongName = "Unknown";
    }
    
    var foundRightLink = __await__ (Link.find({device1:hostname}));
    var foundLeftLink = __await__ (Link.find({device2:hostname}));

    if(foundRightLink.length > 0 || foundLeftLink.length > 0) {
        linkEnrichmentData = foundRightLink.concat(foundLeftLink);
        if(foundRightLink.length > 0 && foundLeftLink.length > 0) linkEnrichmentData.End = "both";
        else if(foundRightLink.length > 0) linkEnrichmentData.End = "left";
        else if(foundLeftLink.length > 0) linkEnrichmentData.End = "right";
    }
    else{
        linkEnrichmentData = null;
    }

    var deviceExtraDetails = {POPDetails:POPDetails,cabinetName:parsedHostName.devicePOPName,linkEnrichmentData:linkEnrichmentData};

    return deviceExtraDetails;
});
//Sync devices
var syncDevices = function(){
    logger.info("Starting bulk devices sync");

    getDeviceList()
    .then(function(deviceList){
        for(var i=0;i<deviceList.length;i++){
            while(throttle <= 0) {
                deasync.sleep(20);
            }
            deviceList[i].syncInterfaces();
        }
        while(doneDevices < deviceList.length){
            deasync.sleep(20);
        }
        bulkSyncInProgress = false;  
        doneDevices = 0;  
        throttle = MAX_PARALLEL_DEVICES;
        logger.info("Finished bulk synchronization");
    })
    .catch(); 
}

router.get("/sync",  middleware.isLoggedIn ,function(request, response) {
    if(bulkSyncInProgress == false){
        throttle = MAX_PARALLEL_DEVICES;
        doneDevices = 0;
        bulkSyncInProgress = true;
        syncDevices();        
    }
    else{
        request.flash("error","Bulk synchronization process is already in background");
    }
    response.redirect("/devices");
});

router.get("/sync/:id",  middleware.isLoggedIn ,function(request, response) {
    if(bulkSyncInProgress == false){
        doneDevices = 0;

        Device.findById(request.params.id, function(err, foundDevice) {
            if (err) {
                 logger.error(err);
            }
            else {
                logger.info("single sync mode, device " + foundDevice.hostname +" will be synced now");
                // perform interface sync
                var discoDevice ;
                getdeviceExtraDetails(foundDevice.hostname)
                .then(function(deviceExtraDetails){
                 discoDevice = new discoveredDevice(foundDevice,deviceExtraDetails.linkEnrichmentData,deviceExtraDetails.cabinetName,deviceExtraDetails.POPDetails);
                    discoDevice.syncInterfaces();
                })
                .catch();
            }
        });
    }
    else{
        request.flash("error","Bulk synchronization process is already in background, will not sync device now");
    }
    response.redirect("/devices");
});
//ADD DEVICE TO TNPM
router.get("/tnpmdisco/:id",  middleware.isLoggedIn ,function(request, response) {
    logger.info("try to add device with id "+ request.params.id+" to TNPM");
    Device.findById(request.params.id, function(err, foundDevice) {
        if (err) {
             logger.error(err);
        }
        else {
            logger.info("will add device " + foundDevice.hostname +" to TNPM");
            var command = process.env.TNPM_SCRIPT+" "+foundDevice.hostname;
            logger.info(command);

            cmd.get(command,function(error, data, stderr){
                if(error) logger.error(error);
                else logger.info("device sent to TNPM successfully");
            });

        }
    });
    response.redirect("/devices");
});

//SHOW DEVICE ROUTE
router.get("/:id", middleware.isLoggedIn ,function(request,response){
    //find device with provided id
    // Device.findById(request.params.id).populate("interfaces").exec(function(error,foundDevice){
    Device.findById(request.params.id,function(error,foundDevice){
        if(error){
             logger.error(error);
        }
        else{
            //render show template with that device
            response.render("devices/show",{device: foundDevice,id:foundDevice._id});
        }
    });
});

//EDIT DEVICE ROUTE
router.get("/:id/edit",  middleware.isLoggedIn , function(request,response){
    //is user logged in?
     logger.warn("Update a device");
    Device.findById(request.params.id,function(error,foundDevice){
        response.render("devices/edit",{device: foundDevice,id:foundDevice._id});
    });
    
});
//UPDATE DEVICE ROUTE
router.put("/:id", middleware.isLoggedIn ,function(request,response){
    //find and update the correct DEVICE
    request.body.device.updatedAt = new Date();
    request.body.device.lastUpdatedBy = {id: request.user._id, email: request.user.email};
    // note: Select2 removes pop name and replace it with the id

    POP.findById({_id: mongoose.Types.ObjectId(request.body.device.pop)},function(error,foundPOP){
        if(error){
             logger.error(error);
        }
        else{
            // request.body.device.popName.name = foundPOP.name;
            request.body.device.pop = foundPOP.shortName+"_"+foundPOP.gov;
            request.body.device.popLongName =  foundPOP.popLongName || "Unknown";
            request.body.device.sector =  foundPOP.sector || "Unknown";
            request.body.device.gov =  foundPOP.gov || "Unknown";
            request.body.device.district =  foundPOP.district || "Unknown";
            request.body.device.popType =  foundPOP.popType || "Unknown";
            // Governorate.findById({_id: mongoose.Types.ObjectId(request.body.device.governorate.name)},function(error,foundGove){
                // if(error){
                //      logger.error(error);
                // }
                // else{
                //     request.body.device.governorate.name = foundGove.name;
                    Device.findByIdAndUpdate(request.params.id,request.body.device,function(error,updatedDevice){
                        if(error){
                             logger.error(error);
                            response.redirect("/devices");
                        }
                        else{
                            //redirect somewhere (show page)
                            updatedDevice.save();
                        }
                    });
                // }
            // });
        }
    });
    response.redirect("/devices/"+request.params.id);

});

//DESTROY Device ROUTE
router.delete("/:id",  middleware.isLoggedIn , function(request,response){
     logger.warn("Deleting device with id: "+request.params.id);
    if(request.params.id == -1){
        response.redirect("/devices");
    }
    //find list of interfaces
    Device.findById(request.params.id,function(error,foundDevice){
        if(error){
             logger.error(error);
        }
        else if(foundDevice != null){
            var interfaceList = foundDevice.interfaces;
            //iterate over them and delete
            if(interfaceList != null){
                interfaceList.forEach(function(interface,key, callback ){
                    if(interface){                   
                        logger.warn("Deleting interface with index: "+interface.ifIndex);
                        // {"hostname" : S(interfaceList[i].hostname).s , "ifIndex" : S(interfaceList[i].ifIndex).toInt() }
                        Interface.findOneAndRemove({"ipaddress" : S(interface.ipaddress).s , "ifIndex" : S(interface.ifIndex).toInt() },function(error){
                            if(error)  logger.error(error);
                        });
                    }
                });

            }
            Device.remove({"hostname":foundDevice.hostname},function(error){
                if(error) logger.error(error);
            });
        }
        
    });
    response.redirect("/devices");
});

//DESTROY from NNM- Device ROUTE
//http://213.158.183.140:8080/devices/api/OBORCB11-M99H-C-EG
router.delete("/api/:hostname",  middleware.isAPIAuthenticated ,function(request,response){
    indexRoutes.invalidateAPIsession();
    var hostname = request.params.hostname;
    logger.warn("NNM Deleting device with hostname: "+hostname);
    //check device existence and find its list of interfaces


    if(hostname){
        //find device
        // Device.remove({"hostname":hostname},function(error){
        //     if(error) response.json({ message: error });
        //     else response.json({ message: "Successfully deleted device" });
        // });
        Device.findOne({"hostname": hostname},function(error,foundDevice){
            if(error){
                 logger.error(error);
                 response.json({ message: "error while searching for the device, delete operation will be aborted" });
            }
            else if(foundDevice != null){
                var interfaceList = foundDevice.interfaces;
                //iterate over them and delete
                interfaceList.forEach(function(interface,key, callback ){
                    logger.warn("IIB Deleting interface with index: "+interface.ifIndex);
                    // {"hostname" : S(interfaceList[i].hostname).s , "ifIndex" : S(interfaceList[i].ifIndex).toInt() }
                    Interface.findOneAndRemove({"ipaddress" : S(interface.ipaddress).s , "ifIndex" : S(interface.ifIndex).toInt() },function(error){
                        if(error)  logger.error(error);
                    });

                });
                Device.remove({"hostname":foundDevice.hostname},function(error){
                    if(error) {
                        logger.error(error);
                        response.json({ message: "device found but not able to delete it" });
                    }
                    else{
                        response.json({ message: "Successfully deleted device" });
                    }
                });
            }
            else{
                response.json({ message: "IBM is trying to delete device not in database" });
                logger.warn("IBM IIB is trying to delete device not in database");
            }
            
        });
    }
    else{
        response.json({ message: "invalid hostname" });
    }
});


//CREATE from NNM- add new device to DB through NM
//http://213.158.183.140:8080/devices/api/OBORCB11-M99H-C-EG/104.236.166.95/public/OBORCB11
router.post("/api/:hostname/:ipaddress/:communitystring/:popname", middleware.isAPIAuthenticated ,function(request, response) {
    indexRoutes.invalidateAPIsession();
    logger.info("received request from IIB");

    //get data from a form and add to devices array
    var hostname = request.params.hostname;
    var ipaddress = request.params.ipaddress;
    var communityString = request.params.communitystring || "public";
    var aPOP = request.params.popname;//this is redundant after the latest modifications

    if(S(communityString).s == S(process.env.COMMUNITY_KEY1).s) {
        logger.info("found "+process.env.COMMUNITY_KEY1+" community string will replace it with "+process.env.COMMUNITY_VALUE1);
        communityString = S(process.env.COMMUNITY_VALUE1).s;
    }

    // var parsedHostName = Parser.parseHostname(S(hostname));

    var type ;//= request.body.device.type;
    var model ;//= request.body.device.model;
    var modelOID = "";
    var vendor ;//= request.body.device.vendor;

    logger.info("device with the following information will be added through IIB: "+hostname+", "+ipaddress+", "+communityString+", "+aPOP);

    session = snmp.createSession(ipaddress, S(communityString).trim().s,{ timeout: 10000, retries: 1});
    session.get (systemDetails, function (error, varbinds) {
        if (error) {
            logger.error ("found error while retrieving sysObjectId for "+hostname+" "+error.toString());
            // request.flash("error","found error while retrieving sysObjectId ");
            response.json("found error while retrieving sysObjectId for "+hostname+" "+error.toString()); 
        } else {
            for (var i = 0; i < varbinds.length; i++) {
                if (snmp.isVarbindError (varbinds[i])){
                    logger.error (snmp.varbindError (varbinds[i]));
                }
                else {
                    if(i == systemDetailsColumns.sysObjectID) modelOID = varbinds[i].value;
                    if(i == systemDetailsColumns.sysName) sysName = varbinds[i].value;
                }
            }               

            modelOID = "."+modelOID;

            getDeviceInfo(modelOID,hostname)
            .then(function(deviceExtraDetails){
                aDevice = {
                        hostname: hostname.trim(),
                        ipaddress: ipaddress.trim(),
                        // author: {id: request.user._id, email: request.user.email},
                        community: communityString.trim(),
                        type: deviceExtraDetails.deviceModelOID.type.trim(),
                        model: deviceExtraDetails.deviceModelOID.model.trim(),
                        vendor: deviceExtraDetails.deviceModelOID.vendor.trim(),
                        sysObjectID: modelOID,
                        sysName: sysName,
                        pop:  deviceExtraDetails.POPDetails.shortName+"_"+deviceExtraDetails.POPDetails.gov,
                        sector: deviceExtraDetails.POPDetails.sector, 
                        gov:  deviceExtraDetails.POPDetails.gov 
                };
                aDevice.interfaces = [];
                 logger.info("Device discovery started from IIB");
                 logger.info(aDevice.hostname + " "+ aDevice.ipaddress + " "+aDevice.community);
                 Device.create(aDevice, function(error, device) {
                     if (error) {
                        logger.error(error);
                        response.json(error); 
                     }
                     else {
                          logger.info("new device created and saved");
                         // response.json("Successfully added device, will start device discovery now");
                         // var discoDevice = new discoveredDevice(device);
                          discoDevice = new discoveredDevice(device,deviceExtraDetails.linkEnrichmentData,deviceExtraDetails.cabinetName,deviceExtraDetails.POPDetails);
                             discoDevice.discoverInterfaces();
                     }
                     response.json("Successfully added device, will start device discovery now"); 
                 });

                // Device.create(aDevice, function(error, device) {
                //     if (error) {
                //         logger.error(error);
                //         response.json(error);
                //     }
                //     else {
                //         logger.info("new device created and saved");
                //         request.flash("success","Successfully added device, will start device discovery now");
                //         var discoDevice = new discoveredDevice(device);
                //         getDeviceFarLinks(device.hostname)
                //         .then(function(linkEnrichmentData){
                //             discoDevice.linkEnrichmentData = linkEnrichmentData;
                //             discoDevice.discoverInterfaces();
                //         })
                //         .catch();
                //     }
                //     response.json("Successfully added device, will start device discovery now"); 
                // });

            })
            .catch();
        }
    });

});

module.exports = router;
module.exports.syncDevices = syncDevices;
module.exports.bulkSyncInProgress = bulkSyncInProgress;