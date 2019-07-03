'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');



var path = require('path');
var config = require('./config').ssl;
var app = require('./app')(config.redirect);


console.log(JSON.stringify(config));


if (config.enabled) {

  var key = fs.readFileSync(config.certPath);
  var cert = fs.readFileSync(config.keyPath);

  var credentials = {
    key: key,
    cert: cert
  };

  var httpServer = http.createServer(app);
  var httpsServer = https.createServer(credentials, app);


  config.plainPorts.forEach(function(port) {

    httpServer.listen(port, () => {
      console.log("Http server listing on port : " + port)
    });

  });

  config.tlsPorts.forEach(function(port) {

    httpsServer.listen(httpsPort, () => {
      console.log("Https server listing on port : " + port)
    });

  });



} else {

  var httpServer = http.createServer(app);


  config.plainPorts.forEach(function(port) {

    httpServer.listen(port, () => {
      console.log("Http server listing on port : " + port)
    });

  });


}
