const PORT = 3000;
var config = require ('./config.json');
const SECRET = 'c3a36925eb2ce2244aaa436742df3607';

var http = require('http'),
    crypto = require('crypto'),
    server;

function verifyShopifyHook(req) {
    var digest = crypto.createHmac('SHA256', SECRET)
            .update(new Buffer(req.body, 'utf8'))
            .digest('base64');
    
    console.log("###########")
    console.log(req.headers['X-Shopify-Hmac-Sha256'])
    console.log(digest)
    console.log("!---------!")
    return digest === req.headers['X-Shopify-Hmac-Sha256'];
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
