const datetime = require('node-datetime');
const rn = require('random-number');
const storage = require('node-persist');

const options = {  // Randomised number of seconds to wait
	min : 1,
	max : 3,
	integer: true
	};

var activeNumberOfRequests = {'POST':0,'GET':0,'PUT':0,'DELETE':0};

global.values = {}; // Values corresponding to Method of request. 
		// 0 - Number of total requests
		// 1 - Total response time of all requests
		// 2 - Number of requests in the last 1 hour.
		// 3 - Response time of requests in the last 1 hour.
		// > 4 - (Time of request, response time) for the requests posted in the last 1 hour.


function ParseTime(date)
{
	var hour = date.getHours();
    	hour = (hour < 10 ? "0" : "") + hour;
    	var min  = date.getMinutes();
    	min = (min < 10 ? "0" : "") + min;
    	var sec  = date.getSeconds();
    	sec = (sec < 10 ? "0" : "") + sec;
	var time = hour + ":" + min + ":" + sec;
	return time;
}

function DeleteStorage()
{
	//storage.init();
	storage.forEach( async function(datum){
		storage.del(datum.key);
	});
}

module.exports.activeNumberOfRequests = activeNumberOfRequests;

module.exports = {


PopulateValue : function() // Populate the array with values from Persistant db.
{
	storage.init();
	storage.forEach( async function(datum){
		var item = storage.getItem[datum.key];
		if(item!=null && item.length >=4)
		{
			for(var i =0;i < 4; i++)
			{
				if (item[i].length != 1)
				{
					DeleteStorage();
					values = {}
					return;	
				}
			}
			values[datum.key] = datum.value;
		}
		else
		{
			values = {};
		}
	});
},

UpdateActiveNumberOfRequests : function(method, increment)
{
	if(increment == true)
		activeNumberOfRequests[method]++;
	else
		activeNumberOfRequests[method]--;
},

SetValues : function(method, duration, date)
{
	console.log(method + ' ' + duration + ' ' + date);	
	if(!(method in values) || values[method].length <4)
	{
		console.log('Here\n');
	//storage.init();
		var finalValue = [1,parseInt(duration),1,parseInt(duration),[date,parseInt(duration)]];
		let promise = storage.getItem(method);
		promise.then( function(value)
			{
			console.log('Here1\n');
			finalValue[0] = value[0] + 1;
			finalValue[1] = value[1] + duration;
			finalValue[2] = value[2] + 1;
			finalValue[3] = value[3] + duration;
			finalValue.push([date,parseInt(duration)]);
			storage.setItem(method, finalValue);
			}, function(reason) {
			console.log('Here2\n');
			storage.setItem(method, finalValue);
				}	
		);
		values[method] = finalValue; 
	}
	else
	{
		console.log('Here3\n');
		values[method][0] = values[method][0] + 1;
		values[method][1] = values[method][1] + duration;
		values[method][2] = values[method][2] + 1;
		values[method][3] = values[method][3] + duration;
		values[method].push([date,parseInt(duration)]);
		storage.setItem(method, values[method]);
	}	
},

GetCurrentTime : function()
{
	var date = new Date();
	var time = date.getTime();
	return time;
},

CreateJsonResponse : function(request)
{
	var jsonResponse = new Object();
	var date = new Date();
	jsonResponse.time = ParseTime(date);
	jsonResponse.method = request.method;
	jsonResponse.headers = request.headers;
	jsonResponse.path = request.path ;
	jsonResponse.query = request.query;
	jsonResponse.body = request.body;
	jsonResponse.duration = rn(options);
	return jsonResponse;
}
}



































