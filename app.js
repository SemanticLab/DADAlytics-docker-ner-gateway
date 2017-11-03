'use strict';

module.exports = function(sslRedirect) {

  // Bare bones Express server to test Docker
  const express = require('express');
  const bodyParser = require('body-parser');
  const request = require('request');
  const cors = require('cors');
  var app = express();

  app.use(bodyParser.json({limit: '50mb'}));
  app.use(cors());



  // Force HTTPS redirect unless we are using localhost or unit testing with superagent.
  function httpsRedirect(req, res, next) {
    if (req.protocol === 'https'
      || req.header('X-Forwarded-Proto') === 'https'
      || req.header('User-Agent').match(/^node-superagent/)
      || req.hostname === 'localhost') {
      return next();
    }

    res.status(301).redirect("https://" + req.headers.host + req.url);
  }

  if (sslRedirect) {
    app.use(httpsRedirect);
  }


  var config = {
    'stanford': '9000',
    'opener': '9001',
    'spotlight': '80',
  }

  function format(seconds){
    function pad(s){
      return (s < 10 ? '0' : '') + s;
    }
    var hours = Math.floor(seconds / (60*60));
    var minutes = Math.floor(seconds % (60*60) / 60);
    var seconds = Math.floor(seconds % 60);

    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
  }

  app.get('/ping', function(req, res) {
    res.status(200).json({uptime:format(process.uptime()), tools:Object.keys(config)});

  })

  app.get('/', function(req, res) {
    res.redirect('https://semanticlab.github.io/DADAlytics-ner-demo/');
  })

  

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

  // app.get('/env', function (req, res) {
  //   res.contentType('application/json');
  //   res.send(process.env);
  // });
  
  return app;

};