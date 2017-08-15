var snmpLookupObj = {};
snmpLookupObj.ifAdminOperStatus = {up:1 , down:2 , testing:3 }

snmpLookupObj.ifType = {other:1,          
                          regular1822:2 ,
                          hdh1822:3 ,
                          'ddn-x25':4 ,
                          'rfc877-x25':5 ,
                          'ethernet-csmacd':6 ,
                          'iso88023-csmacd':7 ,
                          'iso88024-tokenBus':8 ,
                          'iso88025-tokenRing':9 ,
                          'iso88026-man':10 ,
                          starLan:11 ,
                          'proteon-10Mbit':12 ,
                          'proteon-80Mbit':13 ,
                          hyperchannel:14 ,
                          fddi:15 ,
                          lapb:16 ,
                          sdlc:17 ,
                          ds1:18 ,           
                          e1:19 ,            
                          basicISDN:20 ,
                          primaryISDN:21 ,   
                          propPointToPointSerial:22 ,
                          ppp:23 ,
                          softwareLoopback:24 ,
                          eon:25 ,            
                          'ethernet-3Mbit':26 ,
                          nsip:27 ,           
                          slip:28 ,           
                          ultra:29 ,          
                          ds3:30 ,            
                          sip:31 ,            
                          'frame-relay':32 }

snmpLookupObj.getIfTypeKey = function (value) {
    return this.ifType[value];
}

module.exports = snmpLookupObj;