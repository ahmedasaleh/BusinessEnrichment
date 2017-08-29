var $j = jQuery.noConflict();
// normal table
$j(document).ready(function() {
  var checkedRows = [];

    $j("#input-id").fileinput({
        maxFileCount: 10,
        //uploadUrl: '/links',
        allowedFileTypes: ["text"],
        allowedFileExtensions: ["csv"]
    });

// paginated table		  

var $jtable = $j('#eventsTable');
  $j($jtable).on('check.bs.table', function (e, row) {
    $j.each(checkedRows, function(index, value) {
      console.log(value.id);
      checkedRows.splice(index,1);
    });
    checkedRows.push({id: row._id, name: row.name, acronym: row.acronym});
    $j.each(checkedRows, function(index, value) {
        console.log(value.id);
        $j('#device-delete-form').attr('action', '/devices/'+value.id+'/?_method=DELETE');
        $j('#device-update-form').attr('action', '/devices/'+value.id+'/edit');
        $j('#device-sync-form').attr('action', '/devices/sync/'+value.id);
        $j('#pop-delete-form').attr('action', '/pops/'+value.id+'/?_method=DELETE');
        $j('#pop-update-form').attr('action', '/pops/'+value.id+'/edit');
        $j('#governorate-delete-form').attr('action', '/governorates/'+value.id+'/?_method=DELETE');
        $j('#governorate-update-form').attr('action', '/governorates/'+value.id+'/edit');
        $j('#link-delete-form').attr('action', '/links/'+value.id+'/?_method=DELETE');
        $j('#link-update-form').attr('action', '/links/'+value.id+'/edit');
        $j('#sector-delete-form').attr('action', '/sectors/'+value.id+'/?_method=DELETE');
        $j('#sector-update-form').attr('action', '/sectors/'+value.id+'/edit');
        $j('#user-delete-form').attr('action', '/users/'+value.id+'/?_method=DELETE');
        $j('#user-update-form').attr('action', '/users/'+value.id+'/edit');
        $j('#validateduser-delete-form').attr('action', '/validatedusers/'+value.id+'/?_method=DELETE');
        $j('#validateduser-update-form').attr('action', '/validatedusers/'+value.id+'/edit');
        $j('#interface-delete-form').attr('action', '/interfaces/'+value.id+'/?_method=DELETE');
        $j('#interface-update-form').attr('action', '/interfaces/'+value.id+'/edit');
    });

  });
  
  $j($jtable).on('uncheck.bs.table', function (e, row) {
      console.log("click-row.bs.table: "+row._id);
    $j.each(checkedRows, function(index, value) {
      console.log(value.id);
      checkedRows.splice(index,1);
    });
      console.log(checkedRows);
  });
  
  $j("#governorate-delete-button").click(function() {
    // $j("#output").empty();
    console.log(checkedRows.length);
    $j.each(checkedRows, function(index, value) {
      console.log(index);
      console.log(value);
      // $j('#output').append($j('<li></li>').text(value.id + " | " + value.name + " | " + value.acronym));
    });
  });  

  // //the following lines were only added for testing purpose
  // $j(".add_cart").click(function() {
  //   $j("#output").empty();
  //   $j.each(checkedRows, function(index, value) {
  //     console.log(index);
  //     console.log(value);
  //     $j('#output').append($j('<li></li>').text(value.id + " | " + value.name + " | " + value.acronym));
  //   });
  // });  
  // $j(".myclass").click(function() {
  //   $j("#output").empty();
  //   $j.each(checkedRows, function(index, value) {
  //     console.log(index);
  //     console.log(value);
  //     $j('#output').append($j('<li></li>').text(value.id + " | " + value.name + " | " + value.acronym));
  //   });
  // });
  
});
