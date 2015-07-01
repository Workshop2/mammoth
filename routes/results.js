var config = require('../config/config');
var express = require('express');
var async = require('async');
var request = require('request');
var router = express.Router();

/* GET results */
router.get('/', function(req, res, next) {
	var templateTags = {
			title: 'Mammoth results'
		},
		obj = {};

	var query = req.query.query,
		types = ["web","news","video","social","shopping"],
		count = 10,
		options = {};
	 
	
 
	async.each(types, function(type, cb) {
		options.url = 'https://api.qwant.com/api/search/' + type + '?count=' + count + '&locale=en_gb&offset=10&q=' + query;
		request(options, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var mammoth = JSON.parse(body);
				obj[type] = mammoth.data.result.items;
			}
			cb();
		});
		
	}, function(err){
	// if any of the processing produced an error, err would equal that error 
		if(err) {
			// One of the iterations produced an error. 
			// All processing will now stop. 
			console.log('A request failed to process');
		} else {
			console.log('All requests have been processed successfully');
			templateTags.results = obj;
			console.log("templateTags");
			console.log(templateTags);
			res.render('results', templateTags);
		}
	});
	
});

module.exports = router;
