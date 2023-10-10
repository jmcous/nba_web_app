var loadingInterval;

$(document).ready(function() {
	var fetchedData = null;
	var shotChartData = null;
	var isShotChartLoaded = false;
	var lastClickedLineup = null;

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
			isShotChartLoaded = false;
			fetchShotChartData(); // fetch data for shot charts and store in global variable
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
	
		Plotly.newPlot('plot', traces, layout, config).then(function() {
			const plotDiv = document.getElementById('plot');
			plotDiv.on('plotly_click', function(data) {
				handlePointClick(data);
			});
		});	
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
	
	function handlePointClick(data) {
		const pointData = data.points[0];
		const xValue = pointData.x;
		const yValue = pointData.y;
		const textValue = pointData.text;
	
	
		// Fetch and display the shot chart
		fetchShotChart(textValue);
	}


	function fetchShotChartData(){
		//fetch shotChartData:
		$.ajax({
			data: {
				season : $('#season').val(),
				groupquantity : $('#groupquantity').val()
			},
			type: 'POST',
			url: '/getShotChart'
		})
		.done(function(data) {
			shotChartData = data;
			isShotChartLoaded = true;
			console.log(shotChartData);

			//Stop loading animation
			stopLoadingAnimation();
			
			//Auto-update shot chart if lineup is clicked
			if (lastClickedLineup != null){
				fetchShotChart(lastClickedLineup);
			}
	});


	}
	function fetchShotChart(lineup) {
		lastClickedLineup = lineup;
		if (!isShotChartLoaded){
			openSCBar();
			startLoadingAnimation();
			return
		}
		document.getElementById("targetShotChart").innerHTML = "";
		const season = document.getElementById("season").value;
		const x_made = [], y_made = [], x_miss = [], y_miss = [];

		const groupData = shotChartData.all_shots.find(group => group.group_name == lineup);

		const target = groupData.shots;
		const k = 5;
		const similarShotCharts = findKNearestShotCharts(target, shotChartData, k+1);
		console.log(similarShotCharts);


		groupData.shots.forEach(shot => {
			if (shot.shot_made_flag === 1) {
				x_made.push(shot.loc_x);
				y_made.push(shot.loc_y);
			} else {
				x_miss.push(shot.loc_x);
				y_miss.push(shot.loc_y);
			}
		});

		let traceMade = {
			x: x_made,
			y: y_made,
			mode: 'markers',
			name: 'Made',
			marker:	{ symbol: 'circle',
					color: 'green',
					size: 9,
					alpha: 1.0 }
		};

		let traceMissed = {
			x: x_miss,
			y: y_miss,
			mode: 'markers',
			name: 'Missed',
			marker:	{ symbol: 'x',
					color: 'red',
					size: 9,
					alpha: .7 }
		};

		let layout = {
			title: {
				text: season +': '+ lineup,
				font: {
					size: 11,
					color: 'white',
					family: 'Courier New'
				}
			},
			xaxis: {
				range: [-250, 250],
				tickfont: {
					color: 'white',
					family: 'Courier New',
					size: 8
				}
			},
			yaxis: {
				range: [0, 470],
				tickfont: {
					color: 'white',
					family: 'Courier New',
					size: 8
				},
				showline: true,
				linewidth: 1,
				color: 'white'

			},
			width: 600,
			height: 350,
			plot_bgcolor: '#1E1E1E',
			paper_bgcolor: '#1E1E1E',
			showlegend: false,
			showgrid: false
		};

		const targetShotChartContainer = document.getElementById('targetShotChart');
		targetShotChartContainer.innerHTML = '';
		Plotly.purge('targetShotChart');
		targetShotChartContainer.classList.add('individual-shotchart-target');
		Plotly.react('targetShotChart', [traceMissed, traceMade], layout);
		// Clear previous similar shot charts
		const similarShotChartsContainer = document.getElementById('similarShotCharts');
		similarShotChartsContainer.innerHTML = '';

		// Plot each similar shot chart
		similarShotCharts.forEach((chart, index) => {
			const chartDiv = document.createElement('div');
			chartDiv.id = `similarShotChart-${index}`;
			chartDiv.classList.add('individual-shotchart');
			similarShotChartsContainer.appendChild(chartDiv);

			const formattedTitle = formatTitle(season, chart.group_name);

			const x_made_similar = [], y_made_similar = [], x_miss_similar = [], y_miss_similar = [];

			chart.shots.forEach(shot => {
				if (shot.shot_made_flag === 1) {
					x_made_similar.push(shot.loc_x);
					y_made_similar.push(shot.loc_y);
				} else {
					x_miss_similar.push(shot.loc_x);
					y_miss_similar.push(shot.loc_y);
				}
			});

			const traceMadeSimilar = {
				x: x_made_similar,
				y: y_made_similar,
				mode: 'markers',
				name: 'Made',
				marker: { symbol: 'circle', color: 'green', size: 9, alpha: 1.0 }
			};

			const traceMissedSimilar = {
				x: x_miss_similar,
				y: y_miss_similar,
				mode: 'markers',
				name: 'Missed',
				marker: { symbol: 'x', color: 'red', size: 9, alpha: .7 }
			};

			let simlayout = {
				title: {
					text: formattedTitle,
					font: {
						size: 11,
						color: 'white',
						family: 'Courier New'
					}
				},
				xaxis: {
					range: [-250, 250],
					tickfont: {
						color: 'white',
						family: 'Courier New',
						size: 8
					}
				},
				yaxis: {
					range: [0, 470],
					tickfont: {
						color: 'white',
						family: 'Courier New',
						size: 8
					},
					showline: true,
					linewidth: 1,
					color: 'white'
	
				},
				width: 400,
				height: 250,
				plot_bgcolor: '#1E1E1E',
				paper_bgcolor: '#1E1E1E',
				showlegend: false,
				showgrid: false
			};
			Plotly.react(`similarShotChart-${index}`, [traceMissedSimilar, traceMadeSimilar], simlayout);
		});

		// Open shotchart sidebar if not already open
		openSCBar();
	}
	


	// function calculateDistance(shot1, shot2) {
	// 	const dx = shot1.loc_x - shot2.loc_x;
	// 	const dy = shot1.loc_y - shot2.loc_y;
	// 	const flagDifference = shot1.shot_made_flag !== shot2.shot_made_flag ? 50 : 0; // Penalty for different shot_made_flag
	// 	return Math.sqrt(dx * dx + dy * dy) + flagDifference;
	// }

	// function calculateTotalDistance(targetShots, chartShots) {
	// 	let distance = 0;
	// 	const maxLength = Math.max(targetShots.length, chartShots.length);
	// 	const penaltyPerExtraShot = 100; // Arbitrary value, adjust as needed
	
	// 	for (let i = 0; i < maxLength; i++) {
	// 		if (i < targetShots.length && i < chartShots.length) {
	// 			// Both shot charts have a shot at this index
	// 			distance += calculateDistance(targetShots[i], chartShots[i]);
	// 		} else {
	// 			// One of the shot charts doesn't have a shot at this index
	// 			distance += penaltyPerExtraShot;
	// 		}
	// 	}
	
	// 	return distance;
	// }
	
	// // Modified KNN function
	// function findKNearestShotCharts(targetShotChart, shotChartData, k) {
	// 	const distances = shotChartData.all_shots.map(chart => {
	// 		return { chart, distance: calculateTotalDistance(targetShotChart, chart.shots) };
	// 	});
	
	// 	// Sort by distance
	// 	distances.sort((a, b) => a.distance - b.distance);
	
	// 	// Return top k shot charts
	// 	return distances.slice(1, k).map(d => d.chart);
	// }

	// Binning function
	function binShot(x, y) {
		const distanceFromHoop = Math.sqrt(x * x + y * y);
		const distanceFromArcCenter = Math.abs(y - 140);

		if (y <= 140 && x < 0) return "left corner 3";
		if (y <= 140 && x > 0) return "right corner 3";
		if (distanceFromArcCenter >= 220 && x < 0) return "left 3s";
		if (distanceFromArcCenter >= 220 && x > 0) return "right 3s";
		if (distanceFromHoop <= 60) return "paint";
		if (y <= 190) {
			if (x < -70) return "left midrange";
			if (x > 70) return "right midrange";
			return "top of the key";
		}
		return "deep 2";
	}

	// Binning a shot chart and converting counts to percentages
	function binShotChart(shots) {
		const bins = {
			"left corner 3": 0,
			"right corner 3": 0,
			"left 3s": 0,
			"right 3s": 0,
			"paint": 0,
			"left midrange": 0,
			"right midrange": 0,
			"top of the key": 0,
			"deep 2": 0
		};

		shots.forEach(shot => {
			const bin = binShot(shot.loc_x, shot.loc_y);
			bins[bin]++;
		});

		const totalShots = shots.length;
		for (const bin in bins) {
			bins[bin] = (bins[bin] / totalShots) * 100; // Convert counts to percentages
		}

		return bins;
	}

	// Calculate similarity between two shot charts using percentage distributions
	function calculateSimilarity(binnedTarget, binnedChart) {
		let distance = 0;

		for (const bin in binnedTarget) {
			distance += Math.abs(binnedTarget[bin] - binnedChart[bin]);
		}

		return distance;
	}


	// Find k nearest shot charts
	function findKNearestShotCharts(targetShots, allShotCharts, k) {
		const binnedTarget = binShotChart(targetShots);
		const distances = [];

		allShotCharts.all_shots.forEach(chart => {
			const binnedChart = binShotChart(chart.shots);
			const distance = calculateSimilarity(binnedTarget, binnedChart);
			distances.push({ chart, distance });
		});

		distances.sort((a, b) => a.distance - b.distance);

		return distances.slice(1, k).map(d => d.chart);
	}



});

function openGlossary() {
	document.getElementById("glossarySidebar").style.width = "250px";
}

function closeGlossary() {
	document.getElementById("glossarySidebar").style.width = "0";
}

function openSCBar() {
    let bar = document.getElementById("shotchartBar");
    if (bar.style.height === "0px" || bar.style.height === "") {
        bar.style.height = "361px";
    }
}


function closeSCBar() {
	document.getElementById("shotchartBar").style.height = "0";
}

function startLoadingAnimation() {
	let loadingMessage = "Loading data";
	let dots = "";
	
	// Clear any existing interval
	clearInterval(loadingInterval);
	
	// Start a new interval
	loadingInterval = setInterval(() => {
	  dots = dots.length < 3 ? dots + "." : "";
	  document.getElementById('targetShotChart').innerHTML = loadingMessage + dots;
	}, 300); // Update every 300 milliseconds
}

function stopLoadingAnimation() {
	clearInterval(loadingInterval);
	document.getElementById("targetShotChart").innerHTML = "";
}

function formatTitle(season, groupName) {
    const maxLength = 50; // Adjust this value based on your needs
    let title = season + ': ' + groupName;

    if (title.length > maxLength) {
        // Split the group name by dashes
        const parts = groupName.split(' - ');

        // Find the middle index to split the title
        const middleIndex = Math.floor(parts.length / 2);

        // Construct the new group name with a line break
        const newGroupName = parts.slice(0, middleIndex).join(' - ') + '<br>' + parts.slice(middleIndex).join(' - ');

        // Update the title
        title = season + ': ' + newGroupName;
    }

    return title;
}