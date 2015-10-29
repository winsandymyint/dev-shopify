/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , crypto = require('crypto')

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
  app.use(express.bodyParser());
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


/* WEBHOOK */
var hookSecret= '80a2b388673a5e8f562e189689a795c0'
app.post('/webhook', function (req, res) {
	console.log("I am here.")
	console.log(req.headers['x-shopify-hmac-sha256'])
    handleRequest(req, res);
})

function handleRequest(req, res) {
    console.log("@@@ HandleRequest @@@")
    if (verifyShopifyHook(req)) {
        res.writeHead(200);
        console.log("Amdon Verified")
        res.end('Verified webhook');
    } else {
        res.writeHead(401);
        console.log("Amdon Verified")
        res.end('Unverified webhook');
    }
}

function verifyShopifyHook(req) {
    var digest = crypto.createHmac('SHA256', SECRET)
    .update(new Buffer(req.body, 'utf8'))
    .digest('base64');
    
    console.log("###########")
    console.log(req.headers)
    console.log(digest)
    console.log("!---------!")
    return digest === req.headers['X-Shopify-Hmac-Sha256'];
}

/* END OF WEBHOOK */


/* ~ For Webhook ~ */ 
// const SECRET = config.secret;

// app.use(function(req, res, next) {
//   req.rawBody = '';
//   req.setEncoding('utf8');

//   req.on('data', function(chunk) { 
//     req.rawBody += chunk;
//   });

//   req.on('end', function() {
//     next();
//   });
// });
// app.use(express.bodyParser());

/*app.post('/webhook', function (req, res) {
	
    var json = req.body;
    res.send(200);
	console.log("!!!!!!!webhook!!!!!!ß")
    console.log(req)
 	if (verifyShopifyHook(req)) {
 	    res.writeHead(200);
 	    res.end('Verified webhook');
 	} else {
 	    res.writeHead(401);
 	    res.end('Unverified webhook');
 	}
});
function verifyShopifyHook(req) {
	console.log("!!!!!!!HERE!!!!!!ß")
    var digest = crypto.createHmac('SHA256', SECRET)
            .update(new Buffer(req.body, 'utf8'))
            .digest('base64');
    
    return digest === req.headers['X-Shopify-Hmac-Sha256'];
}*/

/* ~ End of Webhook ~ */ 

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
