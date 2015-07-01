var config = require('../config/config');
var express = require('express');
var async = require('async');
var request = require('request');
var router = express.Router();
var SpotifyWebApi = require('spotify-web-api-node');

/* GET results */
router.get('/', function(req, res, next) {
	var types = ["web","news","video","social","shopping"],
			templateTags = {
				title: 'Mammoth results',
				results: {}
		};

	// init with blank arrays
	for(var i = 0; i < types.length; i++) {
		templateTags.results = [];
	}

	async.waterfall([
		function(callback) {
			console.log("Getting Spotify terms...");
			// Perform the Spotify query for all valid terms
			fetchTermsForUser(req.user, callback);
		},
		function(searchTerms, callback) {
			console.log("Performing searches for Spotify Search Terms...");
			var query = req.query.query;
			searchTerms = query ? [query] : searchTerms;

			// Now loop all of the terms and do a search under each "search type" e.g. news
			async.each(
				searchTerms,
				function(searchTerm, cb) {
					console.log("Performing search for " + searchTerm);
					performSearchForTerm(searchTerm, types, function(searchResults) {
						console.log("Got some results for " + searchTerm);

						// with the given result, now collate into one large results obj
						for(var typeI = 0; typeI < types.length; typeI++) {
							var type = types[typeI];
							var currentResults = searchResults[type]; // array of result for type e.g. news

							console.log("Building mega results for  " + type);
							// loop round all results and push them onto the big results stack
							// keeping the grouping
							for (var i = 0; i < currentResults.length; i++) {
								var result = currentResults[i];
								templateTags.results[type].push(result);
								console.log("Pusing result onto " + type + "\n" + result);
							}
						}

						cb();
					});
				},
				callback);
		},
		function(callback) {
				console.log("YAY - we made it to the end");
				console.log("Rendering " + templateTags);
				// finish by writing the response out
				res.render('results', templateTags);
		}
	]);


	// TODO: Loop for each term returned from spotify
/*	var query = req.query.query,
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
		}
	});
*/
});

function performSearchForTerm(searchTerm, types, megaCallback) {
		var count = 10,
			result = {};

		async.each(types, function(type, cb) {
			var options = {
				url: 'https://api.qwant.com/api/search/' + type + '?count=' + count + '&locale=en_gb&offset=10&q=' + searchTerm
			};

			request(options, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var mammoth = JSON.parse(body);
					result[type] = mammoth.data.result.items;
				}
				cb();
			});

		},
		function(err){
			// if any of the processing produced an error, err would equal that error
			if(err) {
				// One of the iterations produced an error.
				// All processing will now stop.
				console.log('[performSearchForTerm] A request failed to process\n' + err);
			} else {
				megaCallback(null, result);
			}
		});
}

//Zomg, this got complicated quickly....IM SO SORRY
function fetchTermsForUser(user, megaCallback) {
	var spotifyApi = new SpotifyWebApi();
	spotifyApi.setAccessToken(user.accessToken);
	var totals = {};
	var batchLimit = 50;
	var totalIterations = null;
	var currentIteration = 0;
	var finished = false;

	return async.whilst(
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
			if(err) {
				console.log("[fetchTermsForUser] Error \n" + err)
			}
			else { //TODO: -----------------------------------------------------------------
				console.log(totals); //TODO: -----------------------------------------------------------------
				console.log("Yay, search complete. Passing onto megaCallback"); //TODO: -----------------------------------------------------------------
				megaCallback(null, ['test', 'test2']); //TODO: -----------------------------------------------------------------
			} //TODO: -----------------------------------------------------------------
		});
}

module.exports = router;
