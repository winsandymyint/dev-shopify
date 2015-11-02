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
		console.log('session is not valid yet, we need some authentication !')
		if(shop !== undefined)
			res.redirect('/login/authenticate?shop='+shop);
		else
			res.redirect('/login')
	}
});

/* WEBHOOK */
app.post('/webhook', function (req, res) {
	console.log("####################")
    parseRequestBody(req, res)
    console.log("Debug ----------------------1")
    console.log(req.headers)
	console.log("####################")
})
function verifyShopifyHook(req) {
    console.log("Debug ----------------------4")

    var digest = crypto.createHmac('SHA256', '3cdb276557ce076221a416efa6270ab1d97c34ae4f0757c4e75b5dc0cf95e4f0')
            .update(new Buffer(req.body, 'utf8'))
            .digest('base64');
    console.log("Debug ----------------------4.1")
    console.log(digest)
    console.log(req.headers['x-shopify-hmac-sha256'])

    return digest === req.headers['x-shopify-hmac-sha256'];
}

function parseRequestBody(req, res) {
    req.body = '';

    req.on('data', function(chunk) {
        req.body += chunk.toString('utf8');
    });
    console.log("Debug ----------------------2")
    console.log(req.body)
    console.log("Debug ----------------------2.0.1")

    req.on('end', function() {
	    console.log("Debug ----------------------2.1")

        handleRequest(req, res);
    });
}

function handleRequest(req, res) {
    console.log("Debug ----------------------3")

    if (verifyShopifyHook(req)) {
	    console.log("Debug ----------------------5.3.1")
        bookSubscribe(req)
        res.writeHead(200);
        console.log("Verified webhook")
        res.end('Verified webhook');
    } else {
	    console.log("Debug ----------------------5.3.2")

        res.writeHead(401);
        console.log("Unverified webhook")
        res.end('Unverified webhook');
    }
}

function bookSubscribe (req) {
	console.log(req.body)
	testData= {"id":123456,"email":"jon@doe.ca","closed_at":null,"created_at":"2015-10-29T07:46:42-04:00","updated_at":"2015-10-29T07:46:42-04:00","number":234,"note":null,"token":null,"gateway":null,"test":true,"total_price":"234.94","subtotal_price":"224.94","total_weight":0,"total_tax":"0.00","taxes_included":false,"currency":"USD","financial_status":"voided","confirmed":false,"total_discounts":"5.00","total_line_items_price":"229.94","cart_token":null,"buyer_accepts_marketing":true,"name":"#9999","referring_site":null,"landing_site":null,"cancelled_at":"2015-10-29T07:46:42-04:00","cancel_reason":"customer","total_price_usd":null,"checkout_token":null,"reference":null,"user_id":null,"location_id":null,"source_identifier":null,"source_url":null,"processed_at":null,"device_id":null,"browser_ip":null,"landing_site_ref":null,"order_number":1234,"discount_codes":[],"note_attributes":[],"payment_gateway_names":["bogus"],"processing_method":"","checkout_id":null,"source_name":"web","fulfillment_status":"pending","tax_lines":[],"tags":"","contact_email":"jon@doe.ca","line_items":[{"id":56789,"variant_id":null,"title":"Sledgehammer","quantity":1,"price":"199.99","grams":5000,"sku":"SKU2006-001","variant_title":null,"vendor":null,"fulfillment_service":"manual","product_id":327475578523353102,"requires_shipping":true,"taxable":true,"gift_card":false,"name":"Sledgehammer","variant_inventory_management":null,"properties":[],"product_exists":true,"fulfillable_quantity":1,"total_discount":"0.00","fulfillment_status":null,"tax_lines":[]},{"id":98765,"variant_id":null,"title":"Wire Cutter","quantity":1,"price":"29.95","grams":500,"sku":"SKU2006-020","variant_title":null,"vendor":null,"fulfillment_service":"manual","product_id":327475578523353102,"requires_shipping":true,"taxable":true,"gift_card":false,"name":"Wire Cutter","variant_inventory_management":null,"properties":[],"product_exists":true,"fulfillable_quantity":1,"total_discount":"5.00","fulfillment_status":null,"tax_lines":[]}],"shipping_lines":[{"title":"Generic Shipping","price":"10.00","code":null,"source":"shopify","phone":null,"tax_lines":[]}],"billing_address":{"first_name":"Bob","address1":"123 Billing Street","phone":"555-555-BILL","city":"Billtown","zip":"K2P0B0","province":"Kentucky","country":"United States","last_name":"Biller","address2":null,"company":"My Company","latitude":null,"longitude":null,"name":"Bob Biller","country_code":"US","province_code":"KY"},"shipping_address":{"first_name":"Steve","address1":"123 Shipping Street","phone":"555-555-SHIP","city":"Shippington","zip":"K2P0S0","province":"Kentucky","country":"United States","last_name":"Shipper","address2":null,"company":"Shipping Company","latitude":null,"longitude":null,"name":"Steve Shipper","country_code":"US","province_code":"KY"},"fulfillments":[],"refunds":[],"customer":{"id":null,"email":"john@test.com","accepts_marketing":false,"created_at":null,"updated_at":null,"first_name":"John","last_name":"Smith","orders_count":0,"state":"disabled","total_spent":"0.00","last_order_id":null,"note":null,"verified_email":true,"multipass_identifier":null,"tax_exempt":false,"tags":"","last_order_name":null,"default_address":{"id":null,"first_name":null,"last_name":null,"company":null,"address1":"123 Elm St.","address2":null,"city":"Ottawa","province":"Ontario","country":"Canada","zip":"K2H7A8","phone":"123-123-1234","name":"","province_code":"ON","country_code":"CA","country_name":"Canada","default":true}}}

	console.log(testData.customer.email)
	console.log(testData.customer.first_name)
	console.log(testData.fulfillment_status=='pending')
	if(testData.fulfillment_status=='pending'){ // Check the payment is successfully or not! Fulfilled 
		//not sure line_items.fulfillment_status == ?
		arr= []
		for(i in testData.line_items) { testData.line_items[i].sku= '55d6d6018ce4b15b956492e5'; arr.push(testData.line_items[i].sku) }
	    data= {
		  "Email": 'winsandymyint@gmail.com', //testData.customer.email,
		  "Displayname": testData.customer.first_name,
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
