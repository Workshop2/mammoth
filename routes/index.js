var express = require('express');
var router = express.Router();
var gravatar = require('gravatar');
var config = require('../config/config');

/* GET home page. */
router.get('/', function(req, res, next) {
	var templateTags = {
		title: 'Mmth_Music',
		bodyclass: ' class=homepage'
	};
	console.log(req.user);
	if(req.user){
		var encodedDefault = encodeURIComponent(config.host + "https://apologetic-chesterfield-8212.herokuapp.com/images/mammoth-icon-white.png");
		templateTags.username = req.user.username;
		if(req.user._json.email=="nigelflc@clocked0ne.co.uk")req.user._json.email="webdevelopment@clocked0ne.co.uk";
		templateTags.gravatar = gravatar.url(req.user._json.email, {s: '200', r: 'pg', d: encodedDefault}, true);
		templateTags.followers = req.user.followers;
		templateTags.product = req.user.product;
		templateTags.profileUrl = req.user.profileUrl;
	}
	res.render('index', templateTags);
});

module.exports = router;
