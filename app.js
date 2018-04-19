'use strict';

module.exports = function(sslRedirect) {

  // Bare bones Express server to test Docker
  const express = require('express');
  const bodyParser = require('body-parser');
  const request = require('request');
  const cors = require('cors');
  const iconv = require('iconv-lite');
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
    'spacy' : '80',
    'parsey': '80',
    'nltk': '9003',
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

      if (!req.body.text){
        res.status(204).json({error:true,msg:"no text"});
        return
      }

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
      }else if (tool=='nltk'){
        request({url:`http://${tool}:${config[tool]}`, method:'POST',json: {text:text} }, function(err,httpResponse,body){ 
          if (err) { console.log(err); res.status(500).json({process:'nltk', text: text, error: err}); return false; }
          res.status(200).json(body);
        });
      }else if (tool=='spacy'){
        request({url:`http://${tool}:${config[tool]}/ent`, method:'POST',json: {text:text, model:"en"} }, function(err,httpResponse,body){ 
          if (err) { console.log(err); res.status(500).json({process:'spacy', text: text, error: err}); return false; }
          res.status(200).json(body);
        });        
      }else if (tool='parsey'){

        var buff   = new Buffer(text, 'utf8');
        text = iconv.decode(buff, 'ISO-8859-1');

        request({url:`http://${tool}:${config[tool]}`, method:'POST', headers: {'Content-Type': 'text/xml'}, body: text }, function(err,httpResponse,body){ 
          if (err) { console.log(err); res.status(500).json({process:'parsey', text: text, error: err}); return false; }
          if (body == 'error'){ console.log(err); res.status(500).json({process:'parsey', text: text, error: err}); return false; }
          
          try{
            var results = JSON.parse(body)
          }catch(e){
            res.status(500).json({error:true,msg:body});
          }
          
          var words = []
          var compelted_words = []
          var compelted_words_results = []

          for (var line in results){
          for (var word in results[line]){
            w = results[line][word]
            if (w['feats'] && w['feats']['fPOS']){
              if ((w['feats']['fPOS'] == 'PROPN++NNP' || w['feats']['fPOS'] == 'NOUN++NNS') && w['xpostag'] != 'NN' && w['xpostag'] != 'PRP' ){
                if (w['form'][0] === w['form'][0].toUpperCase()){
                  words.push(w) 
                }
                
              }       
            }
          }
          var compelted_ids = []
          for (var word in words){


            var w = words[word]
            if (compelted_ids.indexOf(w['id'])>-1){
              continue
            }
            var final_words = [w]

            // see if this word continues
            for (var word2 in words){
              var w2 = words[word2]
              if (w2['id'] != w['id'] && w2['id'] === w['id']+1){

                final_words.push(w2)
                compelted_ids.push(w2['id'])
                if (/[,.?\-]/.test(w2['form'])) {
                  break
                }
                w = w2
              }

            }
            
            // console.log(final_words)
            if (final_words.length>0){
              var word_string = ''
              final_words.forEach((x)=>{
                word_string = word_string + x['form'] + ' '
              })
              var clean_word_string = word_string.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g," ").replace(/\s+/,' ').trim()
              if (compelted_words.indexOf(clean_word_string)===-1){
                compelted_words.push(clean_word_string)
                compelted_words_results.push({'clean':clean_word_string,'original':word_string.replace(/\s+/,' ').trim()})
              }

            }
            
            
          }
          

          }
          res.status(200).json({"results":compelted_words_results,"parsey":results})
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