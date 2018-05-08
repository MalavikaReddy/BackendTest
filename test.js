const express = require('express');
const helperFunctions = require('./helperFunctions')
const app = express();
const port = 3000;
const bodyParser = require('body-parser'); 

 
app.use(bodyParser.json({ type: 'application/json' }));
app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));
app.use(bodyParser.text({ type: 'text/html' }));


helperFunctions.PopulateValue(); // Find values before restart.

var ReportOverallStats = function (req, res, next){
	for( var val in values) 
	{
		res.write('Total number of requests of ' + val + ' are '  + String(values[val][0]) + '\n'); 
		if(values[val][0]!= 0)
			res.write('Avg time per request for ' + val + ' requests is '  + String((parseInt(values[val][1]))/(parseInt(values[val][0]))) + '\n');
	}
	next();
}

var FindActiveNumberOfRequests = function(req, res, next){
	for( var method in helperFunctions.activeNumberOfRequests)	
	{
		res.write('Active number of ' + method + ' requests are : ' + String(helperFunctions.activeNumberOfRequests[method]) + '\n');
	}
	next();
}

var ReportStatsForLastHour = function(req, res, next){
	var time = helperFunctions.GetCurrentTime();//req.startTime;
	for( var val in values)
	{ 
		var count = 0;
		for(i = 4; i<values[val].length;i++)
		{
			if( time - values[val][i][0] > 60 * 60 * 1000)  // Values from more than an hour ago. Remove them from stored values.
			{
				values[val][2] = values[val][2] - 1;
				values[val][3] = values[val][3] - values[val][i][0]; // Subtract the time from the total time for the backups in the past one hour.
				count++;
			} 
			else
			{
				break;
			}
		}
		values[val].splice(5,count);
		res.write('Number of requests of ' + val + ' in the past 1 hour are '  + String(values[val][2]) + '\n');
		if(values[val][2]!=0) 
			res.write('Avg time per request for ' + val + ' requests in the past 1 hour is '  + String((parseInt(values[val][3]))/(parseInt(values[val][2]))) + '\n'); 
	}
	next();
}

var ReportStatsForLastMinute = function(req, res, next){
	var time = helperFunctions.GetCurrentTime;//req.startTime;
	for( var val in values)
	{ 
		var count = 0;
		var sum = 0;
		for(i = values[val].length - 1; i >= 4;i--)
		{
			if( time - values[val][i][0] <= 60 * 1000)  // Values less than a minute ago.
			{
				sum = sum + values[val][i][1]; 
				count++;
			} 
			else
			{
				break;  // array is in order so we do not have to go further back.
			}
		}
		res.write('Number of requests of ' + val + ' in the past 1 minute are '  + String(count) + '\n');
		if(count != 0) 
			res.write ('Avg time per request for ' + val + ' requests in the past 1 minute is '  + String(sum/count) + '\n'); 
	}
	next();
}

app.all('/process/*', function (req, res, next) {
	var startTime = helperFunctions.GetCurrentTime();
	helperFunctions.UpdateActiveNumberOfRequests(req.method,true);
	var jsonResponse = helperFunctions.CreateJsonResponse(req);
	var elapsedTime = helperFunctions.GetCurrentTime() - startTime;
	helperFunctions.SetValues(jsonResponse.method, jsonResponse.duration*1000 + elapsedTime, startTime);
	setTimeout(function(){res.json(jsonResponse);
		helperFunctions.UpdateActiveNumberOfRequests(req.method,false);},
		parseInt(jsonResponse.duration)*1000);
})

app.all('/stats',function(req,res,next){
	helperFunctions.UpdateActiveNumberOfRequests(req.method,true);
	next();
	}, 
	[ReportOverallStats,FindActiveNumberOfRequests,ReportStatsForLastHour,ReportStatsForLastMinute],
	function(req,res,next){
		res.end()
	helperFunctions.UpdateActiveNumberOfRequests(req.method,false);
	helperFunctions.SetValues(req.method,0,helperFunctions.GetCurrentTime());
}
);

app.listen('127.0.0.1:3000');
console.log('Now listening to port ' + port);
