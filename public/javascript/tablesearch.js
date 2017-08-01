var $j = jQuery.noConflict();
// normal table
$j(document).ready(function() {
  console.log("document.func");
  var checkedRows = [];

  $j(".search").keyup(function () {
    var searchTerm = $j(".search").val();
    var listItem = $j('.results tbody').children('tr');
    var searchSplit = searchTerm.replace(/ /g, "'):containsi('")
  console.log(".search");

  $j.extend($j.expr[':'], {'containsi': function(elem, i, match, array){
        return (elem.textContent || elem.innerText || '').toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
    }
  });

  $j(".results tbody tr").not(":containsi('" + searchSplit + "')").each(function(e){
    $j(this).attr('visible','false');
  });

  $j(".results tbody tr:containsi('" + searchSplit + "')").each(function(e){
    $j(this).attr('visible','true');
  });

  var jobCount = $j('.results tbody tr[visible="true"]').length;
    $j('.counter').text(jobCount + ' item');

  if(jobCount == '0') {$j('.no-result').show();}
    else {$j('.no-result').hide();}
		  });
// paginated table		  

var $jtable = $j('#eventsTable');
  $j($jtable).on('check.bs.table', function (e, row) {
    $j.each(checkedRows, function(index, value) {
      // if (value.id === row._id) {
      console.log(value.id);
        checkedRows.splice(index,1);
      // }
    });
    checkedRows.push({id: row._id, name: row.name, acronym: row.acronym});
  });
  
  $j($jtable).on('uncheck.bs.table', function (e, row) {
      console.log("click-row.bs.table: "+row._id);
    $j.each(checkedRows, function(index, value) {
      // if (value.id === row._id) {
      console.log(value.id);
        checkedRows.splice(index,1);
      // }
    });
      console.log(checkedRows);
  });
  
  $j(".add_cart").click(function() {
    $j("#output").empty();
    $j.each(checkedRows, function(index, value) {
      console.log(index);
      console.log(value);
      $j('#output').append($j('<li></li>').text(value.id + " | " + value.name + " | " + value.acronym));
    });
  });  
$j(".myclass").click(function() {
    $j("#output").empty();
    $j.each(checkedRows, function(index, value) {
      console.log(index);
      console.log(value);
      $j('#output').append($j('<li></li>').text(value.id + " | " + value.name + " | " + value.acronym));
    });
  
});
  
});


// $(document).ready(function() {
    
// });
