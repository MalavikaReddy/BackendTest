var express = require('express');
var datetime = require('node-datetime');
var rn = require('random-number');
var options = {
	min : 1,
	max : 3,
	integer: true
	};
var activeNumberOfRequests = {'POST':0,'GET':0,'PUT':0,'DELETE':0};
var app = express();
var values = {};
var port = 1717;
const storage = require('node-persist');
storage.init();

function PopulateValues()
{
	storage.forEach( async function(datum){
		values[datum.key] = datum.value;
	}); 
}

function SetValues(method, duration, date)
{	
	if(!(method in values))
	{
	//storage.init();
		var finalValue = [1,parseInt(duration),1,parseInt(duration),1,parseInt(duration),[date,parseInt(duration)]];
		let promise = storage.getItem(method);
		promise.then( function(value)
			{
			if(value.length>2)
			{
			finalValue[0] = value[0] + 1;
			finalValue[1] = value[1] + duration;
			finalValue[2] = value[2] + 1;
			finalValue[3] = value[3] + duration;
			finalValue.push([date,parseInt(duration)]);
			}
			storage.setItem(method, finalValue); // should i always do it?
			}, function(reason) {
			storage.setItem(method, finalValue); // should i always do it?
			}	
		);
		values[method] = finalValue; 
	}
	else
	{
		values[method][0] = values[method][0] + 1;
		values[method][1] = values[method][1] + duration;
		values[method][2] = values[method][2] + 1;
		values[method][3] = values[method][3] + duration;
		values[method].push([date,parseInt(duration)]);
		storage.setItem(method, values[method]); //error handling
	}	
}



PopulateValues();

app.all('/process/*', function (req, res, next) {
	var method = req.method;
	activeNumberOfRequests[method] = activeNumberOfRequests[method] + 1;
	var jsonResponse = new Object();
	var date = new Date();
    	var hour = date.getHours();
    	hour = (hour < 10 ? "0" : "") + hour;
    	var min  = date.getMinutes();
    	min = (min < 10 ? "0" : "") + min;
    	var sec  = date.getSeconds();
    	sec = (sec < 10 ? "0" : "") + sec;
	jsonResponse.time = hour + ":" + min + ":" + sec;;
	jsonResponse.method = method;
	jsonResponse.headers = req.header;
	jsonResponse.path = req.path;
	jsonResponse.query = req.query;
	jsonResponse.body  = req.body;
	jsonResponse.duration = rn(options);
	SetValues(jsonResponse.method,jsonResponse.duration, date.getTime());
	setTimeout(function(){res.json(jsonResponse);
		activeNumberOfRequests[method] = activeNumberOfRequests[method] - 1;},
		parseInt(jsonResponse.duration)*1000);
})



app.all('/stats', function (req, res, next) {
	//console.log(values);
	for( var val in values) 
	{
		//console.log(val+values[val]);
		res.write('Total number of requests of ' + val + ' are '  + String(values[val][0]) + '\n'); 
		res.write('Avg time per request for ' + val + ' requests is '  + String((parseInt(values[val][1]))/(parseInt(values[val][0]))) + '\n'); 
	}
	for( var active in activeNumberOfRequests)
	{
		res.write('Active number of ' + active + ' requests are : ' + String(activeNumberOfRequests[active]) + '\n');
	}
	var date = new Date();
	var time = date.getTime();
	for( var val in values)
	{ 
		//console.log(values[val]);
		count = 0;
		for(i = 4; i<values[val].length;i++)
		{
			if( time - values[val][i][0] > 60 * 60 * 1000)
			{
				values[val][2] = values[val][2] - 1;
				values[val][3] = values[val][3] - values[val][i][0];
				count++;
			} 
			else
			{
				break;
			}
		}
		values[val].splice(5,count);
		res.write('Number of requests of ' + val + ' in the past 1 hour are '  + String(values[val][2]) + '\n'); 
		res.write('Avg time per request for ' + val + ' requests in the past 1 hour is '  + String((parseInt(values[val][3]))/(parseInt(values[val][2]))) + '\n'); 
	}

	for( var val in values)
	{ 
		//console.log(values[val]);
		count = 0;
		sum = 0;
		for(i = values[val].length - 1; i >= 4;i--)
		{
			if( time - values[val][i][0] > 60 * 1000)
			{
				sum = values[val][i][i] - values[val][i][0];
				count++;
			} 
			else
			{
				break;
			}
		}
		res.write('Number of requests of ' + val + ' in the past 1 minute are '  + String(count) + '\n'); 
		res.write('Avg time per request for ' + val + ' requests in the past 1 minute is '  + String(sum/count) + '\n'); 
	}
	res.end();
	next();	
})



app.listen(port);
console.log('Now listening to port ' + port);
