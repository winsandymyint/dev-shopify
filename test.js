// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var request= require('request');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

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