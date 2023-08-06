$(document).ready(function() {
	var fetchedData = null;

	$('#form').on('submit',function(e){
		$.ajax({
		data : {
			season : $('#season').val(),
			statx : $('#statx').val(),
			staty : $('#staty').val(),
			statz : $('#statz').val(),
			groupquantity : $('#groupquantity').val(),
			teams : $('#teams').val(),
			min_mp : $('#min_mp').val(),
			kmclust : $('#kmclust').val(),
			linreg : $('#linreg:checked').val()

		},
		type : 'POST',
		url : '/nbaSubmit'
		})
		.done(function(data){
			fetchedData = data;
			plotGraph(data);
		
		
		});
		e.preventDefault();
	});

    // Event listener for team dropdown change
    $('#team').on('change', function() {
        if (fetchedData) {
            plotGraph(fetchedData); // Re-plot the graph with the stored data
        }
    });

	function plotSelectedTeam(data, traces, axes) {
		var teamDropDown = document.getElementById("team");
		var selectedTeam = teamDropDown.value;
		var plotdata;
	  
		if (selectedTeam != 'ALL') {
			if (axes == 'xy'){
				traces[0].marker.opacity = 0.1; // Assuming the first trace is the one you want to modify
					
				const highlightIndices = data.teams.map((value, index) => value === selectedTeam ? index : -1).filter(index => index !== -1);
				const highlightX = highlightIndices.map(index => data.x[index]);
				const highlightY = highlightIndices.map(index => data.y[index]);
				const highlightLineups = highlightIndices.map(index => data.lineups[index]);
				var highlightColors;
			
				if (data.color != '#43FF33') {
					highlightColors = highlightIndices.map(index => data.color[index]);
				} else {
					highlightColors = data.color;
				}
				

				var trace_highlight = {
					x: highlightX,
					y: highlightY,
					mode: 'markers',
					type: 'scatter',
					text: highlightLineups,
					marker: { color: highlightColors },
					name: 'Lineups'
				};
			
				plotdata = [...traces, trace_highlight]; // Spread the existing traces and add trace3

			
			} else {
				
				traces[0].marker.opacity = 0.1; // Assuming the first trace is the one you want to modify
					
				const highlightIndices = data.teams.map((value, index) => value === selectedTeam ? index : -1).filter(index => index !== -1);
				const highlightX = highlightIndices.map(index => data.x[index]);
				const highlightY = highlightIndices.map(index => data.y[index]);
				const highlightZ = highlightIndices.map(index => data.z[index]);

				const highlightLineups = highlightIndices.map(index => data.lineups[index]);
				var highlightColors;
			
				if (data.color != '#43FF33') {
					highlightColors = highlightIndices.map(index => data.color[index]);
				} else {
					highlightColors = data.color;
				}
				

				var trace_highlight = {
					x: highlightX,
					y: highlightY,
					z: highlightZ,
					mode: 'markers',
					type: 'scatter3d',
					text: highlightLineups,
					marker: { color: highlightColors, size:5 },
					name: 'Lineups'
				};
			
				plotdata = [...traces, trace_highlight]; // Spread the existing traces and add trace3

			
			}

		} else {
			traces[0].marker.opacity = 1.0; // Assuming the first trace is the one you want to modify
			plotdata = traces; // Use the existing traces
		}

		return plotdata;
	  }
	  

	function plotGraph(data){


		//check if there is a statz that can be used
		// if no, then plot 2d scat chart
		if (data.z.constructor == String) {
			console.log(data.color);
			// if linear regression button is checked, plot line
			if ($('#linreg:checked').val() == 1){




				var trace1 = {
					x: data.x,
					y: data.y,
					mode: 'markers',
					type: 'scatter',
					text: data.lineups,
					//marker:{color: '#43FF33'},
					marker:{color: data.color},
					name: 'Lineups'
				};

				var trace2 = {
					x: data.x,
					y: data.y_pred,
					mode: 'lines',
					marker:{color: '#43FF33'},
					name: 'Linear Regression'
				};


				var traces = [trace1, trace2];
				
				var plotdata = plotSelectedTeam(data, traces,'xy');

				
				const squared = "2"
				var rsq_string = "R"+squared.sup()+": "+data.pred_results[0];
				var int_string = "Intercept: "+data.pred_results[1];
				var coef_string = "Coefficient: "+data.pred_results[2];
				
				const rsq_container = document.getElementById('rsq_container');
				const int_container = document.getElementById('int_container');
				const coef1_container = document.getElementById('coef1_container');

				rsq_container.innerHTML = rsq_string;
				//int_container.innerHTML = int_string;
				//coef1_container.innerHTML = coef_string;

				
			} else { // if it is not selected then just plot the scatters
				var trace1 = {
				x: data.x,
				y: data.y,
				mode: 'markers',
				type: 'scatter',
				text: data.lineups,
				marker:{color: data.color},
				name: 'Lineups'
				};
				
				var traces = [trace1];
				var plotdata = plotSelectedTeam(data, traces,'xy');

				
				var lr_string = "";
				const rsq_container = document.getElementById('rsq_container');
				rsq_container.innerHTML = lr_string;
			}
			var gridcolor = 'rgba(255, 255, 255,0.3)'
			var layout = {
				height: 600,
				xaxis: {
					title:{
						text: $('#statx').val(),
						color: 'white',
						font: {
							family: 'Courier New',
							size: 18,
						}
					},
					tickfont: {
						color: 'white',
						family: 'Courier New',
						size: 15
					},
					showline: true,
					linecolor: 'white',
					gridcolor: gridcolor,
					linewidth: 1,
					color: 'white'
				},
				yaxis: {
					title: {
						text: $('#staty').val(),
						color: 'white',
						font: {
							family: 'Courier New',
							size: 18,
						}
					},
					tickfont: {
						color: 'white',
						family: 'Courier New',
						size: 15
					},
					showline: true,
					gridcolor: gridcolor,
					linewidth: 1,
					color: 'white'
				},

				automargin: true,
				plot_bgcolor: 'black',
				paper_bgcolor: 'black',
				showlegend: false

				
			};
			
			var config = {responsive: true};

			
			
			Plotly.newPlot('plot', plotdata, layout,config);
			
		} else {//plot 3d scatter plot

		
			// if linear regression button is checked, get different traces
			if ($('#linreg:checked').val() == 1){
			
				var trace1 = {
					x: data.x,
					y: data.y,
					z: data.z,
					mode: 'markers',
					type: 'scatter3d',
					text: data.lineups,
					marker:{color: data.color,size:5},
					name: 'Lineups'

				};

				var trace2 = {
					x: data.x_pred,
					y: data.y_pred,
					z: data.z_pred,
					type: 'mesh3d',
					colorscale: 'rgb(255, 0, 255)',
					opacity: 0.5,
					name: 'Linear Regression'
				};
				
				var traces = [trace1, trace2];
				var plotdata = plotSelectedTeam(data, traces,'xyz');

				
				const squared = "2"
				var rsq_string = "R"+squared.sup()+": "+data.pred_results[0];
				var int_string = "Intercept: "+data.pred_results[1];
				var coef1_string = "Coefficients: "+data.pred_results[2][0]+",";
				var coef2_string = data.pred_results[2][1];
				
				const rsq_container = document.getElementById('rsq_container');
				const int_container = document.getElementById('int_container');
				const coef1_container = document.getElementById('coef1_container');
				const coef2_container = document.getElementById('coef2_container');


				rsq_container.innerHTML = rsq_string;
				//int_container.innerHTML = int_string;
				//coef1_container.innerHTML = coef1_string;
				//coef2_container.innerHTML = coef2_string;

				
				
			} else {
			
				var trace1 = {
					x: data.x,
					y: data.y,
					z: data.z,
					mode: 'markers',
					type: 'scatter3d',
					text: data.lineups,
					marker:{color: data.color,size:5},
					name: 'Lineups'
				};

				var traces = [trace1];
				var plotdata = plotSelectedTeam(data, traces,'xyz');
				
				var lr_string = "";
				const rsq_container = document.getElementById('rsq_container');
				rsq_container.innerHTML = lr_string;
			}
			
			var layout = {
				height: 800,
				scene: {
					xaxis: {
						title:{
							text: $('#statx').val(),
							color: 'white',
							font: {
								family: 'Courier New',
								size: 18,
							}
						},
						tickfont: {
							color: 'white',
							family: 'Courier New',
							size: 15
						},
						showline: true,
						linecolor: 'white',
						gridcolor: gridcolor,
						linewidth: 1,
						color: 'white'
					},
					yaxis: {
						title: {
							text: $('#staty').val(),
							color: 'white',
							font: {
								family: 'Courier New',
								size: 18,
							}
						},
						tickfont: {
							color: 'white',
							family: 'Courier New',
							size: 15
						},
						showline: true,
						gridcolor: gridcolor,
						linewidth: 1,
						color: 'white'
					},
					zaxis: {
						title: {
							text: $('#statz').val(),
							color: 'white',
							font: {
								family: 'Courier New',
								size: 18,
							}
						},
						tickfont: {
							color: 'white',
							family: 'Courier New',
							size: 15
						},
						showline: true,
						gridcolor: gridcolor,
						linewidth: 1,
						color: 'white'
					},
					showlegend: false
				},
					margin: {
					l: 10,
					r: 10,
					b: 10,
					t: 10,
					pad: 4
				},
				plot_bgcolor: 'black',
				paper_bgcolor: 'black',
			};
			
			var config = {responsive: true};
			
			Plotly.newPlot('plot', plotdata, layout,config);				
			
		
		}





	}

});