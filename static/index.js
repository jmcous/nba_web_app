/* async function nbaSubmit(){


/* 	$(document).ready(function() {
			$('#form').on('submit',function(e){
				$.ajax({
				data : {
					firstname : $('#firstname').val(),
					lastname : $('#lastname').val(),
				},
				type : 'POST',
				url : '/nbaSubmit'
				})
				.done(function(data){
				$('#output').text(data.output).show();
				});
				e.preventDefault();
			});
		}); */
	
/* }	
 */	 */
$(function(){
	$('#form').click(function(){
		var user = $('#firstname').val();
		var pass = $('#lastname').val();
		console.log(user);
		$.ajax({
			url: '/nbaSubmit',
			data: $('output').serialize(),
			type: 'POST',
			success: function(response){
				console.log(response);
			},
			error: function(error){
				console.log(error);
			}
		});
	});
});
	
