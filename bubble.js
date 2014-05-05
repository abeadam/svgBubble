TIMEZONE = new Date().getTimezoneOffset() / -60

function getTime(data) {
		var day =  parseInt(data.group.match(/^[0-9]+/), 10),
			hour = parseInt(data.group.match(/[0-9]+$/), 10),
			time = moment('2000-01-01 00:00:00').day(day).hour(hour).add('hours', TIMEZONE);
			return time;
}
window.util = {
	getData: function (url, parameters, success) {
		var promise = $.get(url, parameters, success, 'json');
		return promise;
	},
	getX: function (data) {
		return getTime(data).get('hour');
	},
	getY: function (data) {
		return getTime(data).toDate();
	},
	getR: function (data) {
		return data.reach>0 ? (100/data.reach) * data.metric : 0
	},
	getText: function (data) {
		return data.group;
	}
};

(function ($) {
	var chartData = null, 
		parameters = {
			created_time__gte: moment().subtract('month', 1).format(),
			created_time__lte: moment().format(),
			kinds: 'frequency,time_of_week,type,word_count,tag'
		},
		setDeferredData = function (data, status) {
			if (status == 'success' ) {
				chartData = data;
			}
		},
		ajaxPromise,
		deferredPageLoad = new $.Deferred();

	// lets first load the data
	ajaxPromise = util.getData('http://socialcode.production/api/facebook/analytics/v1/facebookpage/174751071823/performance', parameters, setDeferredData);
	// wait for our data and window to load
	$(document).ready(function() {
		deferredPageLoad.resolve();
	});
	$.when( ajaxPromise, deferredPageLoad).done(function(){
		var bubble = new BubbleChart(chartData);
		bubble.render();
	});

})($);

var width = 900,
	height = 540,
	maxR = 40;
window.BubbleChart = function (data) {
	var data = data.time_of_week,
		scale = { 
			x: d3.scale.linear().range([0, width]).domain([ 0, 23]),
			y: d3.time.scale().range([0, height-40]).domain([moment('2000-01-01 00:00:00').subtract('week',1).toDate(), moment('2000-01-01 00:00:00').toDate()]).clamp(true).nice() ,
			r: d3.scale.linear().range([0, maxR, 1]).domain([d3.min(data, util.getR), d3.max(data, util.getR)])
		};

		this.getScale = function (type) {
			return scale[type];
		};

		this.container = d3.select('#bubble');

		this.data = data;

};

function make_x_axis(x) {        
    return d3.svg.axis()
        .scale(x)
         .orient("bottom")
         .ticks(24)
}

function make_y_axis(y) {        
    return d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(7)
}

BubbleChart.prototype = {
	render: function () {
		var container = this.container,
			data = this.data,
			getScale = $.proxy(this.getScale, this),
			xAxis = d3.svg.axis().scale(getScale('x')).
			tickFormat(function(data){
				return (data > 12 ? (data -12)+'pm': data+'am');
			}).
			ticks(24).
			outerTickSize(0),
			yAxis = d3.svg.axis().scale(getScale('y')).orient('left').
			ticks(7).
			tickFormat(function(data){
				return moment.weekdays(moment(data).weekday());
			}).tickSubdivide(0).
			outerTickSize(0);
			container.append('svg:g').call(xAxis).attr('transform', 'translate(100, ' + height + ')');
			container.append('svg:g').call(yAxis).attr('transform', 'translate(100,0)');

		
		// ----- grid ----------
		var top = container.append("g")         
        .attr("class", "grid")
        .attr("transform", "translate(100," + height + ")")
        .call(make_x_axis(getScale('x'))
            .tickSize(-height, 0, 0)
            .tickFormat("")
        );

        top.select('line').attr('opacity','0');
        top.select(top.selectAll('line')[0].pop().setAttribute('opacity', '0'));

    	var left = container.append("g")         
        .attr("class", "grid")
        .attr('transform', 'translate(100,0)')
        .call(make_y_axis(getScale('y'))
            .tickSize(-width, 0, 0)
            .tickFormat("")
        );

        left.select('line').attr('opacity','0');
        //left.select(left.selectAll('line')[0].pop().setAttribute('opacity', '0'));

        // ------- tooltip --------

        var tooltip = d3.select('body').append('div').attr('class', 'tooltip');

        //---- add bubbles -----
		var circles = container.selectAll('circle');
		circles
		.data(data, function(d) {
			return d.group;
		})
		.enter()
		.insert('circle')
		.attr('cx', 
			function (d) { 
				if(getScale('x')(util.getX(d)) < 0) {
					console.log('problem');
				}
				return getScale('x')(util.getX(d));
			})
		.attr('cy', 
			function (d) {
				return getScale('y')(util.getY(d)); 
			})
		.attr('r', 
			function (d) {
				var r = getScale('r')(util.getR(d));
				if (isNaN(r)) {
					return 0;
				} else {
					return r
				}
			})
		.attr('fill', 'blue');

		//------ add hover for tooltips ---------------
		container.selectAll('circle').on('mouseover', function(data) {
			tooltip.text(util.getR(data)+'%');
			tooltip.style('top', (event.pageY+5)+'px');
			tooltip.style('left', (event.pageX-20)+'px');
			tooltip.style('visibility', 'visible');
			d3.select(this).attr('opacity', 0.6);
		});
		container.selectAll('circle').on('mouseout', function(data) {
			tooltip.style('visibility', 'hidden');
			d3.select(this).attr('opacity', 1);
		});

		//-------add click handler to split the bubble ---------
		container.selectAll('circle').on('click', function onClick(d, index) {
			var currentData,
				day,
				hour,
				newBubble1,
				newBubble2,
				circles = container.selectAll('circle');
	
			if (!d.other) {
				currentData = data.splice(index, 1)[0];
				day =  parseInt(currentData.group.match(/^[0-9]+/), 10);
				hour = parseInt(currentData.group.match(/[0-9]+$/), 10);
				newBubble1 = $.extend({}, currentData);
				newBubble2 = $.extend({}, currentData);
				newBubble1.metric = newBubble1.metric / 2;
				newBubble1.group = day+'-'+(hour+1);
				newBubble2.metric = newBubble2.metric / 2;
				newBubble2.group = day+'-'+(hour-1);
	
				newBubble1.other = newBubble2;
				newBubble2.other = newBubble1;
	
				data.push(newBubble1);
				data.push(newBubble2);
	
				circles
				.data(data, function(d) {
					return d.group;
				})
				.enter()
				.insert('circle')
				.attr('cx', 
					function (d) { 
						if(getScale('x')(util.getX(d)) < 0) {
							console.log('problem');
						}
						return getScale('x')(util.getX(currentData));
					})
				.attr('cy', 
					function (d) {
						return getScale('y')(util.getY(d)); 
					})
				.attr('r', 
					function (d) {
						var r = getScale('r')(util.getR(d));
						if (isNaN(r)) {
							return 0;
						} else {
							return r
						} 
					})
				.attr('fill', 'blue')
				.transition()
				.duration(750)
				.ease('elastic')
				.attr('cx', 
					function (d) { 
						if(getScale('x')(util.getX(d)) < 0) {
							console.log('problem');
						}
						return getScale('x')(util.getX(d));
					});
	
				
	
				circles
				.data(data, function(d) {
					return d.group;
				})
				.exit()
				.transition()
				.delay(500)
				.remove(
					function(d) { 
						console.log(d);
				});
	
				container.selectAll('circle').on('mouseover', function(data) {
					tooltip.text(util.getR(data)+'%');
					tooltip.style('top', (event.pageY+5)+'px');
					tooltip.style('left', (event.pageX-20)+'px');
					tooltip.style('visibility', 'visible');
					d3.select(this).attr('opacity', 0.6);
				});
	
				container.selectAll('circle').on('mouseout', function(data) {
					tooltip.style('visibility', 'hidden');
					d3.select(this).attr('opacity', 1);
				});
			} else {
				var other = d.other,
					otherIndex = data.indexOf(other),
					origial = $.extend({}, d);

				original.other = false;

				day =  parseInt(d.group.match(/^[0-9]+/), 10);
				hour = ( parseInt(d.match(/[0-9]+$/), 10) + parseInt(d.group.match(/^[0-9]+/), 10) )/2;
				original.group = day+'-'+hour;
				original.metric = d.metric * 2;

				data.splice(index, 1);
				data.splice(otherIndex, 1);

				circles
				.data(data, function(d) {
					return d.group;
				})
				.exit()
				.attr('cx', 
					function (d) { 
						if(getScale('x')(util.getX(d)) < 0) {
							console.log('problem');
						}
						return getScale('x')(util.getX(d));
					})
				.attr('cy', 
					function (d) {
						return getScale('y')(util.getY(d)); 
					})
				.attr('r', 
					function (d) {
						var r = getScale('r')(util.getR(d));
						if (isNaN(r)) {
							return 0;
						} else {
							return r
						} 
					})
				.attr('fill', 'blue')
				.transition()
				.duration(750)
				.ease('elastic')
				.attr('cx', 
					function (d) { 
						if(getScale('x')(util.getX(d)) < 0) {
							console.log('problem');
						}
						return getScale('x')(util.getX(original));
					});
			}
		
		});

	}
}