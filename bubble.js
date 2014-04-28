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
	ajaxPromise = util.getData('http://socialcode.production/api/facebook/analytics/v1/facebookpage/41743172343/performance', parameters, setDeferredData);
	// wait for our data and window to load
	$(document).ready(function() {
		deferredPageLoad.resolve();
	});
	$.when( ajaxPromise, deferredPageLoad).done(function(){
		var bubble = new BubbleChart(chartData);
		bubble.render();
	});

})($);


window.BubbleChart = function (data) {
	var width = 800,
		height = 450,
		maxR = 40,
		data = data.time_of_week,
		scale = { 
			x: d3.scale.linear().range([0, width]).domain([ 0, 23]),
			y: d3.time.scale().range([height, 0]).domain([moment('2000-01-01 00:00:00').subtract('week',1).toDate(), moment('2000-01-01 00:00:00').toDate()]).clamp(true).nice() ,
			r: d3.scale.linear().range([0, maxR, 1]).domain([d3.min(data, util.getR), d3.max(data, util.getR)])
		};

		this.getScale = function (type) {
			return scale[type];
		};

		this.container = d3.select('#bubble');

		this.data = data;

};

BubbleChart.prototype = {
	render: function () {
		var container = this.container,
			getScale = $.proxy(this.getScale, this),
			xAxis = d3.svg.axis().scale(getScale('x')).
			tickFormat(function(data){
				return (data > 12 ? (data -12)+'pm': data+'am');
			}).
			ticks(24).
			innerTickSize(10),
			yAxis = d3.svg.axis().scale(getScale('y')).orient('left').
			ticks(7).
			tickFormat(function(data){
				return moment.weekdays(moment(data).weekday());
			}).tickSubdivide(0);
			container.append('svg:g').call(xAxis).attr('transform', 'translate(100, 500)');
			container.append('svg:g').call(yAxis).attr('transform', 'translate(100,0)');

		var circles = container.selectAll('circle');
		circles.data(this.data).enter().insert('circle').
		attr('cx', 
			function (d) { 
				if(getScale('x')(util.getX(d)) < 0) {
					console.log('problem');
				}
				return getScale('x')(util.getX(d));
			}).
		attr('cy', 
			function (d) {
				return getScale('y')(util.getY(d)); 
			}).
		attr('r', 
			function (d) {
				var r = getScale('r')(util.getR(d));
				if (isNaN(r)) {
					return 0;
				} else {
					return r
				}
				//return isNaN(r)? 0 : r;
			})
		.attr('fill', 'blue');
	}
}