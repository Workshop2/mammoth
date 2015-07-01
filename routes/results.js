var config = require('../config/config');
var express = require('express');
var async = require('async');
var request = require('request');
var router = express.Router();
var SpotifyWebApi = require('spotify-web-api-node');

/* GET results */
router.get('/', function(req, res, next) {
	var templateTags = {
			title: 'Mammoth results'
		},
		obj = {};

	//TODO: Change to use promise for the response
	fetchTermsForUser(req.user);

	// TODO: Loop for each term returned from spotify
	var query = "Daft%20Punk",
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

//Zomg, this got complicated quickly....IM SO SORRY
function fetchTermsForUser(user) {
	var spotifyApi = new SpotifyWebApi();
	spotifyApi.setAccessToken(user.accessToken);
	var totals = {};
	var batchLimit = 50;
	var totalIterations = null;
	var currentIteration = 0;
	var finished = false;

	async.whilst(
    function() { return !finished; },
    function(callback) {
        spotifyApi.getMySavedTracks({
                limit: batchLimit,
                offset: currentIteration * batchLimit
            })
            .then(function(data) {
                //console.log(data.body);
									console.log("total: " + data.body.total);
								if(totalIterations == null) {
									totalIterations = Math.ceil(data.body.total / batchLimit);
								}

                for (var i = 0; i < data.body.items.length; i++) {
                    var savedTrack = data.body.items[i];
                    for (var artistIndex = 0; artistIndex < savedTrack.track.artists.length; artistIndex++) {
                        var artist = savedTrack.track.artists[artistIndex];
                        console.log("Detected: " + artist.name);

                        if (totals.hasOwnProperty(artist.name)) {
                            totals[artist.name]++;
                        } else {
                            totals[artist.name] = 1;
                        }
                    }
                }

								console.log("currentIteration" + currentIteration + "totalIterations" + totalIterations)
								finished = currentIteration >= totalIterations;
								currentIteration++;
		        		callback();
            },
            function(err) {
                console.log('Something went wrong!', err);
            });
    },
		function(err) {
				console.log(totals);
		});
}

module.exports = router;
