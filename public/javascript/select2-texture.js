var $j = jQuery.noConflict();


$j(document).ready(function() {
	var nodesocket;
	var IP = "" ;//= nodesocket.ip;//"127.0.0.1";
	var PORT = "";// = nodesocket.port;//"8080";
	var socket = "";
	var pops_pagination_url = "";//"http://"+socket+"/pops/pagination";
	var sectors_pagination_url = "";//"http://"+socket+"/sectors/pagination";
	var governorates_pagination_url = "";//"http://"+socket+"/governorates/pagination";
	var interfaces_pagination_url = "";//"http://"+socket+"/interfaces/pagination";



	var getting = $j.get('/getenv', function(data) {
		nodesocket = data;
	    console.log(nodesocket);
		IP = nodesocket.ip;//"127.0.0.1";
		PORT = nodesocket.port;//"8080";
		if(IP == "127.0.0.1"){
			IP = "localhost";
		}
		socket = IP +":"+ PORT;
		pops_pagination_url = "http://"+socket+"/pops/pagination";
		sectors_pagination_url = "http://"+socket+"/sectors/pagination";
		governorates_pagination_url = "http://"+socket+"/governorates/pagination";
		
		$j.ajax({
		  url: pops_pagination_url,//"http://127.0.0.1:8080/pops/pagination",//
		  beforeSend: function( xhr ) {
		    xhr.overrideMimeType( "text/plain; charset=x-user-defined" );
		  }
		}).done(function( data ) {
		    if ( console && console.log ) {
		        popsData = JSON.parse(data)["docs"];
		        console.log(popsData[0]);
				mappedPopsData = $j.map(popsData, function (obj) {
				obj.text = obj.text || obj.name; // replace name with the property used for the text
		        // console.log(obj.text);
				return obj;
				});

				$j("#device-pop-name").select2({
					placeholder: 'type something...',
					selectOnClose: true,
					data: mappedPopsData,
			        theme: "bootstrap",
			        width: null,
			        containerCssClass: ':all:',
					minimumInputLength: 1,
					initSelection: function(element, callback) {
						callback({ id: element.val(), text: element.attr('data-init-text') 
						});
					}
				});
				$j("#new-device-pop-name").select2({
					placeholder: 'type something...',
					selectOnClose: true,
					data: mappedPopsData,
			        theme: "bootstrap",
			        width: null,
			        containerCssClass: ':all:',
					minimumInputLength: 1
				});
				$j("#new-pop-governorate-name").select2({
					placeholder: 'type something...',
					selectOnClose: true,
					data: mappedPopsData,
			        theme: "bootstrap",
			        width: null,
			        containerCssClass: ':all:',
					minimumInputLength: 1
				});

		    }
		});

		$j.ajax({
		  url: sectors_pagination_url,//"http://127.0.0.1:8080/sectors/pagination",//
		  beforeSend: function( xhr ) {
		    xhr.overrideMimeType( "text/plain; charset=x-user-defined" );
		  }
		}).done(function( data ) {
		    // if ( console && console.log ) {
		        sectorsData = JSON.parse(data)["docs"];
		        // console.log(sectorsData);
				mappedSectorsData = $j.map(sectorsData, function (obj) {
				obj.text = obj.text || obj.name; // replace name with the property used for the text
				return obj;
				});

				$j("#device-sector-name").select2({
					placeholder: 'type something...',
					selectOnClose: true,
					data: mappedSectorsData,
			        theme: "bootstrap",
			        width: null,
			        containerCssClass: ':all:',
					minimumInputLength: 1,
					initSelection: function(element, callback) {
						callback({ id: element.val(), text: element.attr('data-init-text') 
						});
					}
				});
				$j("#new-device-sector-name").select2({
					placeholder: 'type something...',
					selectOnClose: true,
					data: mappedSectorsData,
			        theme: "bootstrap",
			        width: null,
			        containerCssClass: ':all:',
					minimumInputLength: 1

				});
		});

		$j.ajax({
		  url: governorates_pagination_url,//"http://127.0.0.1:8080/governorates/pagination",
		  beforeSend: function( xhr ) {
		    xhr.overrideMimeType( "text/plain; charset=x-user-defined" );
		  }
		}).done(function( data ) {
		    if ( console && console.log ) {
		        governoratesData = JSON.parse(data)["docs"];
		        // console.log(governoratesData);
				mappedGovernoratesData = $j.map(governoratesData, function (obj) {
				obj.text = obj.text || obj.name; // replace name with the property used for the text
				return obj;
				});

				$j("#device-governorate-name").select2({
					placeholder: 'type something...',
					selectOnClose: true,
					data: mappedGovernoratesData,
			        theme: "bootstrap",
			        width: null,
			        containerCssClass: ':all:',
					minimumInputLength: 1,
					initSelection: function(element, callback) {
						callback({ id: element.val(), text: element.attr('data-init-text') 
						});
					}
				});
				$j("#new-device-governorate-name").select2({
					placeholder: 'type something...',
					selectOnClose: true,
					data: mappedGovernoratesData,
			        theme: "bootstrap",
			        width: null,
			        containerCssClass: ':all:',
					minimumInputLength: 1,
				});
		    }
		});


	});

	 
		// var pops_pagination_url = "http://"+socket+"/pops/pagination";
		// var sectors_pagination_url = "http://"+socket+"/sectors/pagination";
		// var governorates_pagination_url = "http://"+socket+"/governorates/pagination";
	$j.fn.select2.defaults.set( "theme", "bootstrap" );
	// var $jeventSelect = $j("#device-pop-name");
	// var $jeventSelect = $j("#device-sector-name");
	// var $jeventSelect = $j("#device-governorate-name");


  
	var popsData = [];
	var mappedPopsData = [];
	var sectorsData = [];
	var mappedSectorsData = [];
	var governoratesData = [];
	var mappedGovernoratesData = [];
	
	$j("#interface-link-type").on("change", function (e) { 
		var select = this.value;
        	$j('#sp_provider').hide();// hide div if value is not "international"
        	$j('#sp_service').hide();
        	$j('#sp_linkNumber').hide();
        	$j('#sp_subCable').hide();
        	$j('#sp_TECID').hide();
        	$j('#sp_termination').hide();
        	$j('#sp_connType').hide();
        	$j('#sp_bundleId').hide();
        	$j('#sp_CID').hide();
        	$j('#sp_speed').hide();
        	$j('#sp_customer').hide();
        	$j('#sp_linkNumber').hide();
        	$j('#sp_speed').hide();
        	$j('#sp_customer').hide();
        	$j('#sp_pop').hide();
        	$j('#sp_connType').hide();
        	$j('#sp_emsOrder').hide();
        	$j('#sp_connectedBW').hide();
        	$j('#sp_fwType').hide();
        	$j('#sp_pop').hide();
        	$j('#sp_serviceType').hide();
        	$j('#sp_ipType').hide();
        	$j('#sp_vendor').hide();
        	$j('#sp_sourceCore').hide();
        	$j('#sp_destCore').hide();
        	$j('#sp_vendor').hide();
        	$j('#sp_pop').hide();
        	$j('#sp_siteCode').hide();
        	$j('#sp_preNumber').hide();
        	$j('#sp_portID').hide();
        	$j('#secondHost').show();
        	$j('#secondInterface').show();
        	$j('#secondPOP').show();
        	$j('#linkType').show();
        	$j('#pop').show();
		if ($j(this).val().toLowerCase() == 'international') {
			console.log(select); 
        	$j('#sp_provider').show();
        	$j('#sp_service').show();
        	$j('#sp_linkNumber').show();
        	$j('#sp_subCable').show();
        	$j('#sp_TECID').show();
        	$j('#sp_termination').show();
        	$j('#sp_connType').show();
        	$j('#sp_bundleId').show();
        	$j('#sp_CID').show();
        	$j('#sp_speed').show();
    	}
		else if ($j(this).val().toLowerCase() == 'alpha-bitstream') {
			console.log(select); 
        	$j('#sp_customer').show();
        	$j('#sp_linkNumber').show();
        	$j('#sp_speed').show();
    	}
		else if ($j(this).val().toLowerCase() == 'sh-bitstream') {
			console.log(select); 
        	$j('#sp_customer').show();
        	$j('#sp_linkNumber').show();
        	$j('#sp_speed').show();
    	}
		else if ($j(this).val().toLowerCase() == 'bitstream') {
			console.log(select); 
        	$j('#sp_customer').show();
        	$j('#sp_linkNumber').show();
        	$j('#sp_speed').show();
    	}
		else if ($j(this).val().toLowerCase() == 'esp') {
			console.log(select); 
        	$j('#sp_customer').show();
        	$j('#sp_pop').show();
        	$j('#sp_connType').show();
        	$j('#sp_emsOrder').show();
        	$j('#sp_connectedBW').show();
    	}
		else if ($j(this).val().toLowerCase() == 'firewall') {
			console.log(select); 
        	$j('#sp_fwType').show();
        	$j('#sp_pop').show();
        	$j('#sp_serviceType').show();
        	$j('#sp_ipType').show();
        	$j('#sp_vendor').show();
    	}
		else if ($j(this).val().toLowerCase() == 'national-roaming') {
			console.log(select); 
        	$j('#sp_provider').show();
        	$j('#sp_service').show();
        	$j('#sp_linkNumber').show();
        	$j('#sp_speed').show();
        	$j('#sp_sourceCore').show();
        	$j('#sp_destCore').show();
        	$j('#sp_vendor').show();
    	}
		else if ($j(this).val().toLowerCase() == 'lte') {
			console.log(select); 
        	$j('#sp_pop').show();
        	$j('#sp_siteCode').show();
        	$j('#sp_vendor').show();
        	$j('#sp_speed').show();
        	$j('#sp_linkNumber').show();
    	}
		else if ($j(this).val().toLowerCase() == 'epc') {
			console.log(select); 
        	$j('#sp_provider').show();
        	$j('#sp_linkNumber').show();
        	$j('#sp_speed').show();
    	}
		else if ($j(this).val().toLowerCase() == 'dpi') {
			console.log(select); 
        	$j('#sp_pop').show();
        	$j('#sp_preNumber').show();
        	$j('#sp_portID').show();
    	}
		else if ($j(this).val().toLowerCase() == 'link-interface') {
			console.log(select); 
        	$j('#secondHost').show();
        	$j('#secondInterface').show();
        	$j('#secondPOP').show();
        	$j('#linkType').show();
        	$j('#pop').show();
    	}
	    else{
        	// $j('#sp_provider').hide();// hide div if value is not "international"
        	// $j('#sp_service').hide();
        	// $j('#sp_linkNumber').hide();
        	// $j('#sp_subCable').hide();
        	// $j('#sp_TECID').hide();
        	// $j('#sp_termination').hide();
        	// $j('#sp_connType').hide();
        	// $j('#sp_bundleId').hide();
        	// $j('#sp_CID').hide();
        	// $j('#sp_speed').hide();
	    } 
	});

	$j("#interface-link-type").select2({
		placeholder: "Search",
		theme: "bootstrap",
		initSelection: function(element, callback) {
			callback({ id: element.val(), text: element.attr('data-init-text') 
			});
		}
	});

	$j("#device-type").select2({
		placeholder: "Search",
		theme: "bootstrap",
		initSelection: function(element, callback) {
			callback({ id: element.val(), text: element.attr('data-init-text') 
			});
		}
	});

$j('#interfacetable').on('page-change.bs.table', function (e, pageNumber, perPageRecords) {
    console.log(pageNumber+" "+perPageRecords);

});


});
