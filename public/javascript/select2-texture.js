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
		        // console.log(popsData);
				mappedPopsData = $j.map(popsData, function (obj) {
				obj.text = obj.text || obj.name; // replace name with the property used for the text
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
		if ($j(this).val().toLowerCase() == 'international') {
			console.log(select); 
        	$j('#provider').show();
        	$j('#service').show();
        	$j('#linkID').show();
        	$j('#subCable').show();
        	$j('#teCID').show();
        	$j('#termination').show();
    	}
	    else{
	    	$j('#provider').hide(); // hide div if value is not "international"
        	$j('#service').hide();
        	$j('#linkID').hide();
        	$j('#subCable').hide();
        	$j('#teCID').hide();
        	$j('#termination').hide();
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
