$(document).ready(function() {
	var fetchedData = null;

	$('#form').on('submit',function(e){
		fetchData();
		e.preventDefault();
	});

	function fetchData() {
		$.ajax({
			data: {
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
			type: 'POST',
			url: '/nbaSubmit'
		}).done(function (data) {
			fetchedData = data;
			plotGraph(data);
		});
	}


    // Event listener for team dropdown change
    $('#team').on('change', function() {
        if (fetchedData) {
            plotGraph(fetchedData); // Re-plot the graph with the stored data
        }
    });

	// Event listener for kmeans change
	$('#kmclust').on('change', function () {
		if (fetchedData) {
			if ( $('#kmclust').val() > 1) {
				applyKmeans(fetchedData, $(this).val());
			} else {
				fetchedData.color = '#43FF33';
				plotGraph(fetchedData); // Re-plot the graph with the stored data
			}
		}
	});

	// Event listener for regression checkbox change
	$('#linreg').on('change', function () {
		if (fetchedData) {
			applyLinReg(fetchedData, $(this).val());
		}
	});

	// Function to apply kmeans clustering
	function applyKmeans(data, clusters) {
		$.ajax({
			data: {
				data: JSON.stringify(data),
				clusters: clusters
			},
			type: 'POST',
			url: '/applyKmeans'
		}).done(function (data) {
			plotGraph(data);
			fetchedData = data;
		});
	}

	// Function to apply linear regression
	function applyLinReg(data, linreg) {
		$.ajax({
			data: {
				data: JSON.stringify(data),
				linreg: linreg
			},
			type: 'POST',
			url: '/applyLinReg'
		}).done(function (data) {
			plotGraph(data);
			fetchedData = data;
		});
	}

	// Function to highlight selected team
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
	  
	function plotGraph(data) {
		let traces = [];
		let layout = {};
		const gridcolor = 'rgba(255, 255, 255,0.3)';
		const config = { responsive: true };
	
		if (data.z.constructor == String) {
			traces = plot2DGraph(data);
			layout = get2DLayout($('#statx').val(), $('#staty').val(), gridcolor);
		} else {
			traces = plot3DGraph(data);
			layout = get3DLayout($('#statx').val(), $('#staty').val(), $('#statz').val(), gridcolor);
		}
	
		Plotly.newPlot('plot', traces, layout, config);
	}
	

	function plot2DGraph(data) {
		let traces = [];
		if ($('#linreg:checked').val() == 1) {
			traces.push({
				x: data.x,
				y: data.y,
				mode: 'markers',
				type: 'scatter',
				text: data.lineups,
				marker: { color: data.color },
				name: 'Lineups'
			}, {
				x: data.x,
				y: data.y_pred,
				mode: 'lines',
				marker: { color: '#43FF33' },
				name: 'Linear Regression'
			});
			updateRegressionResults(data);
		} else {
			traces.push({
				x: data.x,
				y: data.y,
				mode: 'markers',
				type: 'scatter',
				text: data.lineups,
				marker: { color: data.color },
				name: 'Lineups'
			});
			clearRegressionResults();
		}
		return plotSelectedTeam(data, traces, 'xy');
	}
	
	function plot3DGraph(data) {
		let traces = [];
		if ($('#linreg:checked').val() == 1) {
			traces.push({
				x: data.x,
				y: data.y,
				z: data.z,
				mode: 'markers',
				type: 'scatter3d',
				text: data.lineups,
				marker: { color: data.color, size: 5 },
				name: 'Lineups'
			}, {
				x: data.x_pred,
				y: data.y_pred,
				z: data.z_pred,
				type: 'mesh3d',
				colorscale: 'rgb(255, 0, 255)',
				opacity: 0.5,
				name: 'Linear Regression'
			});
			updateRegressionResults(data);
		} else {
			traces.push({
				x: data.x,
				y: data.y,
				z: data.z,
				mode: 'markers',
				type: 'scatter3d',
				text: data.lineups,
				marker: { color: data.color, size: 5 },
				name: 'Lineups'
			});
			clearRegressionResults();
		}
		return plotSelectedTeam(data, traces, 'xyz');
	}
	
	function updateRegressionResults(data) {
		const squared = "2";
		const rsq_container = document.getElementById('rsq_container');
		rsq_container.innerHTML = "R" + squared.sup() + ": " + data.pred_results[0];
	}
	
	function clearRegressionResults() {
		const rsq_container = document.getElementById('rsq_container');
		rsq_container.innerHTML = "";
		// Additional code to clear other regression results can be added here
	}
	
	function get2DLayout(statx, staty, gridcolor) {
		return {
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
	}
	
	function get3DLayout(statx, staty, statz, gridcolor) {
		return {
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
			showlegend: false
		};
	}
	


});

function openGlossary() {
	document.getElementById("glossarySidebar").style.width = "250px";
}

function closeGlossary() {
	document.getElementById("glossarySidebar").style.width = "0";
}