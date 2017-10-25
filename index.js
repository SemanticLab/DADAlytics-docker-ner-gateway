const express = require('express');
const bodyParser = require('body-parser');
const async = require('async');
const request = require('request');
var cors = require('cors');


var app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.use(cors());

var port = process.argv[2] || 80;

var address = 'http://localhost'
var config = {
	'stanford': '9000',
	'opener': '9001',
	'spotlight': '9002',
}


var server = app.listen(port, function () {
		var host = server.address().address;
		var port = server.address().port;
		console.log('Processor listening at http://%s:%s', host, port);

});

app.post('/', function(req, res) {
		var parsed = '';
		var nerPort = 8000;
		var text = req.body.text.replace(/\n+/gm, function myFunc(x){return' ';});
		var tool = req.body.tool.replace(/\n+/gm, function myFunc(x){return' ';});


		if (tool=='stanford'){
			request({url:`http://${tool}:${config[tool]}`, method:'POST',json: {text:text} }, function(err,httpResponse,body){ 
				if (err) { console.log(err); res.status(500).json({process:'stanford', text: text, error: err}); return false; }
				res.status(200).json(body);
			});
		}else if (tool=='opener'){
			request({url:`http://${tool}:${config[tool]}`, method:'POST',json: {text:text} }, function(err,httpResponse,body){ 
				if (err) { console.log(err); res.status(500).json({process:'opener', text: text, error: err}); return false; }
				res.status(200).json(body);
			});
		}else if (tool=='spotlight'){
			request({url:`http://${tool}:${config[tool]}/rest/annotate`, json: true, method:'POST', form: {text:text, confidence:"0.75","support":20} }, function(err,httpResponse,body){ 
				if (err) { console.log(err); res.status(500).json({process:'spotlight', text: text, error: err}); return false; }
				res.status(200).json(body);
			});			
		}else{
			res.status(200).json({error:true,msg:"unknown tool"});
		}

		// console.log(text)
		// console.log(`${address}/rest/annotate:${config[tool]}`)


});
