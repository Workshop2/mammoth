var config = require('../config/config');
var express = require('express');
var async = require('async');
var request = require('request');
var router = express.Router();
var SpotifyWebApi = require('spotify-web-api-node');

/* GET results */
router.get('/', function(req, res, next) {
	var types = ["web","news","video","social","shopping"],
			numberOfArtists = 5,
			templateTags = {
				title: 'Mammoth results',
				results: {}
		};

	// init with blank arrays
	for(var i = 0; i < types.length; i++) {
		templateTags.results[types[i]] = [];
	}

	async.waterfall([
		function(callback) {
			console.log("Getting Spotify terms...");
			// Perform the Spotify query for all valid terms
			fetchTermsForUser(req.user, callback);
		},
			function(artists, callback) {
				console.log("Detecting most popular artists...");
				var popularArtists = detectMostPopularArtists(artists, numberOfArtists);
				callback(null, popularArtists);
			},
		function(searchTerms, callback) {
			console.log("Performing searches for Spotify Search Terms...");
			var query = req.query.query;
			searchTerms = query ? [query] : searchTerms;

			// Now loop all of the terms and do a search under each "search type" e.g. news
			async.each(searchTerms, function(searchTerm, cb) {

								console.log("Performing search for " + searchTerm);
								performSearchForTerm(searchTerm, types, function(searchResults) {
									console.log("Got some results for " + searchTerm);
									//console.log(searchResults);

									// with the given result, now collate into one large results obj
									for(var typeI = 0; typeI < types.length; typeI++) {
										var type = types[typeI];
										//console.log(searchResults);
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

									console.log("Moving onto next search term");
									cb(null);
								});

			},
			function(err) {
				console.log("Finished looping each search term")

				if(err) {
					console.log("FFS")
				}
				else {
					console.log("So fucking close now...")
					callback(null); //TODO: We need some more async
				}
			});

		},
		function(callback) {
				console.log("YAY - we made it to the end");
				console.log("Rendering ");
				//console.log(templateTags);
				// finish by writing the response out
				res.render('results', templateTags);
		}
	]);
});

function detectMostPopularArtists(popularArtists, maxNumberOfArtists) {
	var toSort = [];

	for (var artist in popularArtists) {
		if (popularArtists.hasOwnProperty(artist)) {
			toSort.push({ name: artist, total: popularArtists[artist] });
		}
	}
	console.log("ToSort 1:")
	console.log(toSort);

	toSort = toSort.sort(function(a, b){
	  return b.total - a.total;
	});
	console.log("ToSort 2:")
	console.log(toSort);

	var results = [];
	for(var i = 0; i < Math.min(maxNumberOfArtists, toSort.length); i++) {
		var obj = toSort[i];
		if(obj){
			results.push(obj.name);
		}
	}

	console.log("Detected results:")
	console.log(results);
	return results;
}
/*
	for (var artist in popularArtists) {
		if (popularArtists.hasOwnProperty(artist)) {
			for (var i = 0; i < winners.length; i++) {
				var currentWinnerTotal = winners[i];
				if(currentWinnerTotal) {
						if(popularArtists[artist] > currentWinnerTotal.total){
							console.log(artist + "|" + popularArtists[artist] + " is bigger than " + currentWinnerTotal.name + "|" + currentWinnerTotal.total)
							winners[i] =
							break;
						}
				}
				else {
					console.log("storing " + artist + "|" + popularArtists[artist] + " in pos " + i)
					winners[i] = ;
					break;
				}
			}
		}
	}

	console.log("Detected winners:")
	//console.log(winners);

	var results = [];
	for(var i = 0; i < winners.length; i++) {
		var winner = winners[i];
		if(winner){
			results.push(winner.name);
		}
	}
	console.log("Detected results:")
	//console.log(results);
	*/

//}

function performSearchForTerm(searchTerm, types, megaCallback) {
		var count = 5,
			result = {};

		async.each(types, function(type, cb) {
			var options = {
				url: 'https://api.qwant.com/api/search/' + type + '?count=' + count + '&locale=en_gb&offset=10&q=' + searchTerm
			};

			result[type] = []; // we are always exprected to return each type
			request(options, function (error, response, body) {
				console.log("-- Calling QWANT " + searchTerm + " " + type);
				if (!error && response.statusCode == 200) {
					var mammoth = JSON.parse(body);
					result[type] = mammoth.data.result.items;
				}
				console.log("-- Called QWANT " + searchTerm + " " + type);

				console.log("-- Moving on " + searchTerm + " " + type);
				cb(null);
			});
		},
		function(err){
			console.log("--- Finishing searches " + searchTerm);
			// if any of the processing produced an error, err would equal that error
			if(err) {
				// One of the iterations produced an error.
				// All processing will now stop.
				console.log('[performSearchForTerm] A request failed to process\n' + err);
			} else {
				console.log("----- DONE " + searchTerm);
				//console.log(result);
				megaCallback(result);
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
			else {
				console.log(totals);
				console.log("Yay, search complete. Passing onto megaCallback");
				megaCallback(null, totals);
			}
		});
}

module.exports = router;
