module.exports = {
  ssl: {
    enabled: process.env.SSL_ENABLED === 'true',
    redirect: process.env.SSL_REDIRECT === 'true', // Redirect non-SSL requests to SSL port.

    plainPorts: [8080],         // Map to 80
    tlsPorts: [8443],     // Map to 443 and 5001
    certPath: '/etc/certs/cert.crt',
    keyPath: '/etc/certs/key.key',


  }
};
