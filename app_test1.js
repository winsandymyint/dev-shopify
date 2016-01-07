/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , request = require('request')
  , bodyParser = require('body-parser')
  , crypto = require('crypto')
  /*
var url= 'http://requestb.in/18bnkam1?inspect'
// var url= 'http://requestb.in/onfgwfon'

request(url, function (err, response, body) {
	if(!err){
		console.log('AAAAAAAAA')
		// console.log(body)
		console.log('test')
	}else{
		console.log('###$#IJKR#J:')
		console.log('error')
		console.log('!----------!')
	}
})*/
var app = module.exports = express.createServer();
var nodify = require('nodify-shopify');
 
var apiKey, secret; 
var persistentKeys= {};
var webhookVarified= false;
//If Heroku or Foreman
 if(process.env.SHOPIFY_API_KEY != undefined && process.env.SHOPIFY_SECRET != undefined){
 	apiKey = process.env.SHOPIFY_API_KEY;
 	secret = process.env.SHOPIFY_SECRET;
}
else {
	var config = require ('./config.json');
	apiKey = config.apiKey;
 	secret = config.secret;
}

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser({ type: 'application/*+json' }));
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "shhhhh!!!!" }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.get('/', function(req, res) {
	var shop = undefined, key=undefined;

	if(req.session.shopify){
		shop = req.session.shopify.shop;
		console.log('shop stored in user session:', shop);
		key=persistentKeys[shop];
	}

  if(req.query.shop){
		shop = req.query.shop.replace(".myshopify.com",'');
		console.log('shop given by query:', shop);
		key=persistentKeys[shop];
	}

	if(shop !== undefined && key != undefined) {
		session = nodify.createSession(shop, apiKey, secret, key);
		if(session.valid()){
			console.log('session is valid for <',shop,'>')
			console.log(session.webhook)
			var _new = {
			             "topic": "orders\/create",
			            "address": "http:\/\/amdon.heroku.com\/webhook",
			             "format": "json"
			};
			session.webhook.create( _new, function(err, webhook){
			    if(err) { console.log(webhook); throw err;}
			    console.log("---get--webhook-");
			    console.log(webhook);
			    console.log("---end--webhook-");
			});
			session.order.all({limit: 5}, function(err, orders){
				console.log('orders:',orders);
				if(err) { throw err;}

				session.product.all({limit: 5}, function(err, products){
					console.log("products:", products);
					if(err) {  throw err;}

					res.render("index", {title: "Nodify App", current_shop: shop , orders: orders, products: products});
				});

			});
		} 
	}
	else {
		console.log("^^^^^^^")
		console.log(shop)
		console.log('session is not valid yet, we need some authentication !')
		if(shop !== undefined)
			res.redirect('/login/authenticate?shop='+shop);
		else
			res.redirect('/login')
	}
});

/* WEBHOOK */
app.post('/webhook', function (req, res) {
    parseRequestBody(req, res)
})
function verifyShopifyHook(req) {
    var digest = crypto.createHmac('SHA256', '3cdb276557ce076221a416efa6270ab1d97c34ae4f0757c4e75b5dc0cf95e4f0')
            .update(new Buffer(req.body, 'utf8'))
            .digest('base64');
    console.log("*************************************")
    console.log(digest)
    console.log(req.headers['x-shopify-hmac-sha256'])
    console.log("*************************************")
    return digest === req.headers['x-shopify-hmac-sha256'];
}

function parseRequestBody(req, res) {
    req.body = '';

    req.on('data', function(chunk) {
        req.body += chunk.toString('utf8');
    });
    req.on('end', function() {
        handleRequest(req, res);
    });
}

function handleRequest(req, res) {
    if (verifyShopifyHook(req)) {
        res.writeHead(200);
        console.log("Verified webhook")
        webhookVarified= true
        bookSubscribe(req.body, res)
        res.end(req.body);
    } else {
        res.writeHead(401);
        console.log("Unverified webhook")
        res.end('Unverified webhook');
    }
}

function bookSubscribe (req, res) {
	var obj = JSON.parse(req);
	if(obj.fulfillment_status=='fulfilled'){ // Check the payment is successfully or not! Fulfilled 
		//not sure line_items.fulfillment_status == ?
		arr= []
		for(i in obj.line_items) { arr.push(obj.line_items[i].sku) }
	    data= {
		  "Email": obj.email,
		  "Displayname": obj.customer.first_name,
		  "BookID": arr
		}
		console.log(data)
		request({
		    url: 'http://devpagewerkz.pagewerkz.com/api/subscribe', //URL to hit
		    json: data, //Query string data
		    method: 'POST', //Specify the method
		    headers: { //We can define headers too
		        'apikey': 'c2256014b1dcdaee9092aedc29d8c07f',
		        'secretkey': 'c1efad921d5711ecb4fb739df31f7d30',
		        'Content-Type': 'application/json'
		    }
		}, function(error, response, body){
		    if(error) {
		    	console.log("ERROR")
		        console.log(error);
		    } else {
		    	console.log("EMAIL IS SEND OUT")
		        console.log(response.statusCode, body);
		    }
		});
	}
	
}

/* END OF WEBHOOK */
app.get('/login', function(req, res) {
	try {
		shop = res.body.shop;
	}
	catch(error) {
		shop = undefined;
	}

	if(req.session.shopify){
		res.redirect("/");
	}
	else if(shop != undefined) {
		//redirect to auth
		res.redirect("/login/authenticate");
	}
	else{
		res.render("login", {title: "Nodify App"});
	}
});

app.post('/login/authenticate', authenticate);
app.get( '/login/authenticate', authenticate);

function authenticate(req, res) {
	var shop = req.query.shop || req.body.shop;
	if(shop !== undefined && shop !== null) {	
	  console.log('creating a session for', shop, apiKey, secret)
		session = nodify.createSession(shop, apiKey, secret, {
	    scope: {orders: "read", products: "read"},
	    uriForTemporaryToken: "http://"+req.headers.host+"/login/finalize/token",
	    // uriForTemporaryToken: "http://localhost:3000/login/finalize/token",
	    onAskToken: function onToken (err, url) {
	    	res.redirect(url);
	    }
	  });
	}	else {
		res.redirect('/login');
	}
}

app.get('/login/finalize', function(req, res) {
  console.log('finalizing ...', req.query)
	params = req.query;
	req.session.shopify = params;
	params.onAskToken = function (err, url) {
		if(err) {
			res.send("Could not finalize");
			console.warn('Could not finalize login :', err)
		}
		res.redirect(url);
	}

	session = nodify.createSession(req.query.shop, apiKey, secret, params);
	if(session.valid()){
		console.log('session is valid!')
		res.redirect("/");
	}
	else {
		res.send("Could not finalize");
	}
});

app.get('/login/finalize/token', function(req, res) {
	if(! req.query.code)
		return res.redirect("/login?error=Invalid%20connection.%20Please Retry")
	session.requestPermanentAccessToken(req.query.code, function onPermanentAccessToken(token) {
		console.log('Authenticated on shop <', req.query.shop, '/', session.store_name, '> with token <', token, '>')
		persistentKeys[session.store_name]=token;
		req.session.shopify = {shop:session.store_name};
		res.redirect('/')
	})
})

app.get('/logout', function(req, res) {	
	if(req.session.shopify){
		req.session.shopify = null;
	}
	console.log('Logged out!')	
	res.redirect('/');
});


app.get('/plans', function(req, res) {	
	if(req.session.shopify){
		token = req.session.shopify.t
		shop = req.session.shopify.shop
	}

	if(shop !== undefined && token !== undefined) {
		res.render("plans", {title: "Nodify App Plans", current_shop: shop});
	}
	else {
		res.redirect('/login');
	}
});


app.get('/faq', function(req, res) {	
	if(req.session.shopify){
		token = req.session.shopify.t
		shop = req.session.shopify.shop
	}

	if(shop !== undefined && token !== undefined) {
		res.render("faq", {title: "Nodify App FAQ", current_shop: shop});
	}
	else {
		res.redirect('/login');
	}
});

var port = process.env.PORT || 3000;

app.listen(port, function() {

	console.log("Running on: ", app.address().port);
});
