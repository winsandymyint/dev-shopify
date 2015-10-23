// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var request= require('request');
var crypto     = require('crypto');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

//Cread Webhook and Verify the webhook
//compaire with header X-Shopify-Hmac-Sha256 
/*app.use(bodyParser.json({ verify: function(req, res, buf, encoding) {
  req.headers['x-generated-signature'] = crypto.createHmac('sha256', 'SHARED_SECRET')
   .update(buf)
   .digest('base64');
} }));

app.post('/webhook', function(req, res) {
  if (req.headers['x-generated-signature'] != req.headers['x-shopify-hmac-sha256']) {
    return res.status(401).send('Invalid Signature');
  }
});*/

/*function verify_webhook (data, 	header) {
	calculated_hmac = base64_encode(hash_hmac('sha256', data, ))
    calculated_hmac = Base64.encode64(OpenSSL::HMAC.digest(digest, SHARED_SECRET, data)).strip
    calculated_hmac == hmac_header
  return return (hmac_header == calculated_hmac)
}*/
//Request webhook 

//Response webhook
/*arguments= { 
	'topic': 'cart/update',
	'address': 'http://'
}*/
/*
var webhook= request({
	url: '/admin/webhooks.json',
	method: 'GET',
	json: arguments
}, function (error, response, body) {
	if(error){
		console.log(error)
	}else{
		console.log(response.statusCode, body)
		//check the new odreder info
	}
});


//To get the raw body
app.use(function(req, res, next) {

    req.rawBody = '';
    req.on('data', function(chunk) {
    	req.rawBody += chunk;
    });

    next();
});
crypto.createHmac("SHA256", SHOPIFY_APP_SECRET).update(new Buffer(req.rawBody, 'utf8')).digest('base64');
*/

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    data= {
		  "Email": "winsandymyint@gmail.com",
		  "Displayname": "Dede",
		  "BookID": [
		    "55d6d6018ce4b15b956492e5",
		    "55d6d6088ce4b15b956492e6"
		  ]
		}
		request({
	    url: 'http://devpagewerkz.pagewerkz.com/api/subscribe',
	    method: 'POST', 
      json: data,
	    headers: {
	       'apikey': 'c2256014b1dcdaee9092aedc29d8c07f',
	       'secretkey': 'c1efad921d5711ecb4fb739df31f7d30',
	       'Content-Type': 'application/json'
	    }
		}, function(error, response, body){
		    if(error) {
		        console.log(error);
		    } else {
		        console.log(response.statusCode, body);
		    }
		});

    res.json({ message: 'hooray! welcome to our api!' });  

});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/book-subscribe', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
