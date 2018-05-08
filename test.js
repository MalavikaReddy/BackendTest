const express = require('express');
const helperFunctions = require('./helperFunctions')
const app = express();
const port = 3000;
const bodyParser = require('body-parser'); 

 
app.use(bodyParser.json({ type: 'application/json' }));
app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));
app.use(bodyParser.text({ type: 'text/html' }));


helperFunctions.PopulateValue();

var ReportOverallStats = function (req, res, next){
	console.log('2');
	for( var val in values) 
	{
//		console.log(values[val][1] + ' ' + parseInt(values[val][0]) + ((parseInt(values[val][1]))/(parseInt(values[val][0]))));
		res.write('Total number of requests of ' + val + ' are '  + String(values[val][0]) + '\n'); 
		if(values[val][0]!= 0)
			res.write('Avg time per request for ' + val + ' requests is '  + String((parseInt(values[val][1]))/(parseInt(values[val][0]))) + '\n'); 
	}
	next();
}

var FindActiveNumberOfRequests = function(req, res, next){
		console.log('3');
	for( var method in helperFunctions.activeNumberOfRequests)	
	{
		console.log( method + helperFunctions.activeNumberOfRequests[method] + '\n');
		res.write('Active number of ' + method + ' requests are : ' + String(helperFunctions.activeNumberOfRequests[method]) + '\n');
	}
	next();
}

var ReportStatsForLastHour = function(req, res, next){
		console.log('4');
	var time = helperFunctions.GetCurrentTime();//req.startTime;
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
		console.log(values[val] + ' ' + String(parseInt(values[val][3])/parseInt(values[val][2]))+ '\n');
		res.write('Number of requests of ' + val + ' in the past 1 hour are '  + String(values[val][2]) + '\n');
		if(values[val][2]!=0) 
			res.write('Avg time per request for ' + val + ' requests in the past 1 hour is '  + String((parseInt(values[val][3]))/(parseInt(values[val][2]))) + '\n'); 
	}
	next();
}

var ReportStatsForLastMinute = function(req, res, next){
		console.log('5');
	var time = helperFunctions.GetCurrentTime;//req.startTime;
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
		console.log(count + ' ' + String(sum/count));
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
	console.log(elapsedTime);
	setTimeout(function(){res.json(jsonResponse);
		helperFunctions.UpdateActiveNumberOfRequests(req.method,false);},
		parseInt(jsonResponse.duration)*1000);
	helperFunctions.SetValues(jsonResponse.method, jsonResponse.duration*1000 + elapsedTime, startTime);
})

app.all('/stats',function(req,res,next){
	console.log(values);
	helperFunctions.UpdateActiveNumberOfRequests(req.method,true);
//	req.startTime = helperFunctions.GetCurrentTime();
	next();
	}, 
	[ReportOverallStats,FindActiveNumberOfRequests,ReportStatsForLastHour,ReportStatsForLastMinute],
	function(req,res,next){
		console.log(values);
		res.end()
	helperFunctions.UpdateActiveNumberOfRequests(req.method,false);
	helperFunctions.SetValues(req.method,0,helperFunctions.GetCurrentTime()); //- req.startTime);
}
);

app.listen(port);
console.log('Now listening to port ' + port);
