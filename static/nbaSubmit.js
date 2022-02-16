$(document).ready(function() {
	$('button').click(function(){

		console.log(firstname);
		$.ajax({
			url: '/nbaSubmit',
			data : {
					firstname : $('#firstname').val(),
					lastname : $('#lastname').val(),
			},
			type: 'POST',
			success: function(response){
				console.log(response);
			},
			error: function(error){
				console.log(error);
			}
		})
		.done(function(data){
		$('#output').text(data.output).show();
		});;
		e.preventDefault();
	});
});
	
