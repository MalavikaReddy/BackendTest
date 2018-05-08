var express = require('express');
var datetime = require('node-datetime');
var rn = require('random-number');
var options = {  // Randomised number of seconds to wait
	min : 15,
	max : 30,
	integer: true
	};
var activeNumberOfRequests = {'POST':0,'GET':0,'PUT':0,'DELETE':0};
var app = express();
var values = {}; // Values corresponding to Method of request. 
		// 0 - Number of total requests
		// 1 - Total response time of all requests
		// 2 - Number of requests in the last 1 hour.
		// 3 - Response time of requests in the last 1 hour.
		// > 4 - (Time of request, response time) for the requests posted in the last 1 hour.
var port = 3000;
const storage = require('node-persist');
storage.init();

function PopulateValues() // Populate the array with values from Persistant db.
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
			finalValue[0] = value[0] + 1;
			finalValue[1] = value[1] + duration;
			finalValue[2] = value[2] + 1;
			finalValue[3] = value[3] + duration;
			finalValue.push([date,parseInt(duration)]);
			storage.setItem(method, finalValue);
			}, function(reason) {
			storage.setItem(method, finalValue);
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
		storage.setItem(method, values[method]);
	}	
}

function GetCurrentTime()
{
	var date = new Date();
	var time = date.getTime();
}
PopulateValues();


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

function UpdateActiveNumberOfRequests(method,inc)
{
	if(inc == true)
		activeNumberOfRequests[method]++;
	else
		activeNumberOfRequests[method]--;
}

function CreateJsonResponse(req)
{
	var jsonResponse = new Object();
	var date = new Date();
	jsonResponse.time = ParseTime(date)
    	jsonResponse.method = req.method;
	jsonResponse.headers = req.header;
	jsonResponse.path = req.path;
	jsonResponse.query = req.query;
	jsonResponse.body  = req.body;
	jsonResponse.duration = rn(options);
	return jsonResponse;
}

var ReportOverallStats = function (req, res, next){
	for( var val in values) 
	{
		res.write('Total number of requests of ' + val + ' are '  + String(values[val][0]) + '\n'); 
		res.write('Avg time per request for ' + val + ' requests is '  + String((parseInt(values[val][1]))/(parseInt(values[val][0]))) + '\n'); 
	}
	next();
}

var FindActiveNumberOfRequests = function(req, res, next){
	for( var active in activeNumberOfRequests)	
	{
		res.write('Active number of ' + active + ' requests are : ' + String(activeNumberOfRequests[active]) + '\n');
	}
	next();
}

var ReportStatsForLastHour = function(req, res, next){
	var time = req.startTime;
	for( var val in values)
	{ 
		var count = 0;
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
	next();
}

var ReportStatsForLastMinute = function(req, res, next){
	var time = req.startTime;
	for( var val in values)
	{ 
		var count = 0;
		var sum = 0;
		for(i = values[val].length - 1; i >= 4;i--)
		{
			//console.log(time + ' ' + values[val][i][0]);
			if( time - values[val][i][0] <= 60 * 1000)
			{
				sum = sum + values[val][i][1];
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
	next();
}

app.get('/process/*', function (req, res, next) {
	var startTime = GetCurrentTime();
	UpdateActiveNumberOfRequests(req.method,true);
	var jsonResponse = CreateJsonResponse(req);
	var elapsedTime = GetCurrentTime() - startTime;
	setTimeout(function(){res.json(jsonResponse);
		UpdateActiveNumberOfRequests(req.method,false);},
		parseInt(jsonResponse.duration)*1000);
	SetValues(jsonResponse.method, jsonResponse.duration*1000 + elapsedTime, startTime);
})

app.get('/stats',function(req,res,next){
	UpdateActiveNumberOfRequests(req.method,true);
	req.startTime = GetCurrentTime();
	next()
}, 
[ReportOverallStats,FindActiveNumberOfRequests,ReportStatsForLastHour,ReportStatsForLastMinute],
function(req,res,next){
	res.end();
	UpdateActiveNumberOfRequests(req.method,false);
	SetValues(req.method,0,GetCurrentTime() - req.startTime);
}
);

app.listen(port);
console.log('Now listening to port ' + port);
