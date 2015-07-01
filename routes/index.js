var express = require('express');
var router = express.Router();
var gravatar = require('gravatar');

/* GET home page. */
router.get('/', function(req, res, next) {
	var templateTags = {
		title: 'Mmth_Music',
		bodyclass: ' class=homepage'
	};
	if(req.user){
		var encodedDefault = encodeURIComponent("http://localhost:3000/public/images/mammoth-icon-white.png");
		templateTags.username = req.user.username;
		if(req.user._json.email=="nigelflc@clocked0ne.co.uk")req.user._json.email="webdevelopment@clocked0ne.co.uk";
		templateTags.gravatar = gravatar.url(req.user._json.email, {s: '200', r: 'pg', d: encodedDefault}, true);
	}
	res.render('index', templateTags);
});

module.exports = router;
