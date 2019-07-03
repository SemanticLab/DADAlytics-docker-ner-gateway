'use strict';

module.exports = function(sslRedirect) {

  // Bare bones Express server to test Docker
  const express = require('express');
  const bodyParser = require('body-parser');
  const request = require('request');
  const cors = require('cors');
  const ASCIIFolder = require("fold-to-ascii")

  const async = require("async")



  const parseUtil = require("./parse_util")
  console.log(parseUtil)

  var app = express();

  app.use(bodyParser.json({limit: '50mb'}));
  app.use(cors());


  var useTimeout = process.env.NER_TIMEOUT
  if (!useTimeout) useTimeout = 25000


  // Force HTTPS redirect unless we are using localhost or unit testing with superagent.
  function httpsRedirect(req, res, next) {
    if (req.protocol === 'https'
      || req.header('X-Forwarded-Proto') === 'https'
      || req.hostname === 'localhost') {
      return next();
    }

    res.status(301).redirect("https://" + req.headers.host + req.url);
  }

  if (sslRedirect) {
    console.log('Using redirect')
    app.use(httpsRedirect);
  }else{
    console.log('NOT Using redirect')
  }


  var config = {
    'spacy' : '80',
    'parsey': '80',
    'nltk': '9003',
    'stanford': '9000',
    'opener': '9001',
    'spotlight': '80',
  }


  var lastReqTime = Math.floor(+ new Date() / 1000)

  

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

  app.get('/idle', function(req, res) {
    res.status(200).json({idel: (Math.floor(+ new Date() / 1000) - lastReqTime )  });
  })

  app.get('/', function(req, res) {
    if (process.env.DADASERVER){
      res.redirect('https://semanticlab.github.io/DADAlytics-ner-demo/');
    }else{
      res.status(200).json({uptime:format(process.uptime()), tools:Object.keys(config)});
    }
  })

  app.post('/compiled', function(req, res) {

    lastReqTime = Math.floor(+ new Date() / 1000)
    
    var text = req.body.text.replace(/\n+/gm, function myFunc(x){return' ';});
    text = text.replace(/\n|\r/g,' ').replace(/\t/g,'')

    var useTools = []
    if (req.body.tool){
      useTools = req.body.tool
    }
    
    // do we have this tool
    useTools = useTools.map((t)=>{
      if (config[t]){
        return t
      }
    })

    if (useTools.length === 0){
      res.status(204).json({error:true,msg:"no tool specified"});
      return false
    }
    if (text.trim().length===0){
      res.status(204).json({error:true,msg:"no text specified"});
      return false
    }
    
    // 
    async.map(useTools, function(tool, cb) {

      if (tool=='stanford'){
        request({url:`http://${tool}:${config[tool]}`, timeout: useTimeout, method:'POST',json: {text:text} }, function(err,httpResponse,body){ 
          if (!err){
            cb(null, {tool:tool,data:body,error:false,errorMsg:null});
          }else{
            cb(null, {tool:tool,data:null,error:true,errorMsg:err});
          }

        });
      }else if (tool=='opener'){
        request({url:`http://${tool}:${config[tool]}`, timeout: useTimeout, method:'POST',json: {text:text} }, function(err,httpResponse,body){ 
          if (!err){
            cb(null, {tool:tool,data:body,error:false,errorMsg:null});
          }else{
            cb(null, {tool:tool,data:null,error:true,errorMsg:err});
          }
        });
      }else if (tool=='spotlight'){
        request({url:`http://${tool}:${config[tool]}/rest/annotate`, json: true, timeout: useTimeout, method:'POST', form: {text:text, confidence:"0.75","support":20} }, function(err,httpResponse,body){ 
          if (!err){
            cb(null, {tool:tool,data:body,error:false,errorMsg:null});
          }else{
            cb(null, {tool:tool,data:null,error:true,errorMsg:err});
          }
        });   
      }else if (tool=='nltk'){
        request({url:`http://${tool}:${config[tool]}`, timeout: useTimeout, method:'POST',json: {text:text} }, function(err,httpResponse,body){ 
          if (!err){
            cb(null, {tool:tool,data:body,error:false,errorMsg:null});
          }else{
            cb(null, {tool:tool,data:null,error:true,errorMsg:err});
          }
        });
      }else if (tool=='spacy'){
        request({url:`http://${tool}:${config[tool]}/ent`, timeout: useTimeout, method:'POST',json: {text:text, model:"en"} }, function(err,httpResponse,body){ 
          if (!err){
            cb(null, {tool:tool,data:body,error:false,errorMsg:null});
          }else{
            cb(null, {tool:tool,data:null,error:true,errorMsg:err});
          }
        });        
      }else if (tool='parsey'){


        text = text.replace(/\n|\r/g,' ').replace(/\t/g,'')
        text = text.replace(/['"’”“]+/g, '')
        var sentences = text.match(/\(?[^\.\?\!]+[\.!\?]\)?/g).map((s)=>{return s.trim()})
        text = sentences.join('\n')

        var foldLookup = {}
        var newText = []
        text.split(' ').forEach((word)=>{
          let t = ASCIIFolder.fold(word)
          foldLookup[t] = word
          newText.push(t)
        })
        newText = newText.join(' ')



        request({url:`http://${tool}:${config[tool]}`, timeout: useTimeout, method:'POST', headers: {'Content-Type': 'text/plain'}, body: newText }, function(err,httpResponse,body){ 
          if (err) { console.log(err); res.status(500).json({process:'parsey', text: newText, error: err}); return false; }
          if (body == 'error'){ console.log(err); res.status(500).json({process:'parsey', text: newText, error: err}); return false; }

          try{
            var results = JSON.parse(body)
          }catch(e){
            cb(null, {tool:tool,data:null,error:true,errorMsg:err});
            return false
          }


          var compelted_words_results = parseUtil.nerParsey(results,foldLookup)




          // console.log(compelted_words_results)
          cb(null, {tool:tool,data:compelted_words_results,error:false,errorMsg:null});


        });
      }


    }, function(err, results) {
      var compiledResults = []
      var errors = []
      var errorTools = []
      var map = {"spacy":parseUtil.parseSpacy,"parsey":parseUtil.parseParsey,"nltk":parseUtil.parseNltk,"stanford":parseUtil.parseStanford,"opener":parseUtil.parseOpener,"spotlight":parseUtil.parseSpotlight}
      results.forEach((r)=>{
        if (r.error){
          errors.push(`Error with ${r.tool}: ${JSON.stringify(r.errorMsg)}`)
          errorTools.push(r.tool)
          return
        }
        if (map[r.tool]){
          compiledResults.push({'tool':r.tool, 'data':map[r.tool](r.data)})
        }
      })
      compiledResults = parseUtil.combineData(compiledResults)
      var hasError = false
      if (errors.length>0) hasError = true
      res.status(200).json({results:compiledResults,hasError:hasError,errors:errors,errorTools:errorTools})
    });



  })
  

  app.post('/', function(req, res) {
      var parsed = '';

      lastReqTime = Math.floor(+ new Date() / 1000)

      if (!req.body.text){
        res.status(204).json({error:true,msg:"no text"});
        return
      }

      // var textWithBreaks = req.body.text;
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


        text = text.replace(/\n|\r/g,' ').replace(/\t/g,'')
        text = text.replace(/['"’”“]+/g, '')
        var sentences = text.match(/\(?[^\.\?\!]+[\.!\?]\)?/g).map((s)=>{return s.trim()})
        text = sentences.join('\n')

        var foldLookup = {}
        var newText = []
        text.split(' ').forEach((word)=>{
          let t = ASCIIFolder.fold(word)
          foldLookup[t] = word
          newText.push(t)
        })
        newText = newText.join(' ')



        request({url:`http://${tool}:${config[tool]}`, method:'POST', headers: {'Content-Type': 'text/plain'}, body: newText }, function(err,httpResponse,body){ 
          if (err) { console.log(err); res.status(500).json({process:'parsey', text: newText, error: err}); return false; }
          if (body == 'error'){ console.log(err); res.status(500).json({process:'parsey', text: newText, error: err}); return false; }

          try{
            var results = JSON.parse(body)
          }catch(e){
            console.log(e)
            res.status(500).json({error:true,msg:body});
            return false
          }
          
          var compelted_words_results = parseUtil.nerParsey(results,foldLookup)

          // console.log(compelted_words_results)
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