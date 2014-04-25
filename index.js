window.util = {
	getData: function (url, parameters, success) {
		var promise = $.get(url, success);
		return promise;
	}
};

(function ($) {
	var chartData = null, 
		parameters = {
			created_time__gte: '2014-03-23T10:18:26',
			created_time__lte: '2014-04-23T10:18:26',
			kinds: 'time_of_week'
		},
		setDeferredData = function (data, status) {
			if (status == 200 ) {
				chartData = data;
			}
		},
		ajaxPromise,
		deferredPageLoad = new $.Deferred();

	// lets first load the data
	ajaxPromise = util.getData('http://socialcode.production/message-optics', parameters, setDeferredData);
	// wait for our data and window to load
	$(document).ready(function() {
		deferredPageLoad.resolve();
	});
	$.when( ajaxPromise, deferredPageLoad).done(function(){
		var bubble = new Bubble(chartData);
		console.log('was here');
	});

})($);

window.Bubble = function () {

};
