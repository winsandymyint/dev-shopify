const PORT = 3000;
var config = require ('./config.json')
  , request = require('request')
var url= 'http://requestb.in/z2in7fz2'
const SECRET = '80a2b388673a5e8f562e189689a795c0';

var http = require('http'),
    crypto = require('crypto'),
    server;

function verifyShopifyHook(req) {
    var digest = crypto.createHmac('SHA256', '3cdb276557ce076221a416efa6270ab1d97c34ae4f0757c4e75b5dc0cf95e4f0')
            .update(new Buffer(req.body, 'utf8'))
            .digest('base64');
            console.log("$$$$$$")
            console.log(digest)
            console.log(req.headers['x-shopify-hmac-sha256'])
            console.log("%%%%%%")
    return digest === req.headers['x-shopify-hmac-sha256'];
}

function parseRequestBody(req, res) {
    console.log("@@@ parseRequestBody @@@")
    req.body = '';

    req.on('data', function(chunk) {
        req.body += chunk.toString('utf8');
    });
    req.on('end', function() {
        handleRequest(req, res);
    });
}

function handleRequest(req, res) {
    console.log("@@@ HandleRequest @@@")
    if (verifyShopifyHook(req)) {
        res.writeHead(200);
        res.end('Verified webhook');
    } else {
        res.writeHead(401);
        res.end('Unverified webhook');
    }
}

server = http.createServer(parseRequestBody);

server.listen(PORT, function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});
