var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	var templateTags = {
		title: 'Mammoth',
		bodyclass: ' class=homepage'
	};

	res.render('index', templateTags);
});

module.exports = router;
