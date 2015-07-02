var config = require('../config/config');
var express = require('express');
var async = require('async');
var request = require('request');
var router = express.Router();
var gravatar = require('gravatar');
var SpotifyWebApi = require('spotify-web-api-node');
var querystring = require("querystring");

/* GET results */
router.get('/', function(req, res, next) {
	var types = ["news","videos","social","shopping"],
			sortableTypes = ["news", "social", "videos"],
			typeLimits = [
				{ name: "news", limit: 6 },
				{ name: "social", limit: 6 },
				{ name: "shopping", limit: 2 },
				{ name: "videos", limit: 4 }
			],
			numberOfArtists = 5,
			templateTags = {
				title: 'Mmth_Music results',
				results: {}
		};
	if(req.user){
		var encodedDefault = encodeURIComponent(config.host + "/images/mammoth-icon-white.png");
		templateTags.username = req.user.username;
		if(req.user._json.email=="nigelflc@clocked0ne.co.uk")req.user._json.email="webdevelopment@clocked0ne.co.uk";
		templateTags.gravatar = gravatar.url(req.user._json.email, {s: '200', r: 'pg', d: encodedDefault}, true);
	}

	// init with blank arrays
	for(var i = 0; i < types.length; i++) {
		templateTags.results[types[i]] = [];
	}

	async.waterfall([

		// Perform the Spotify query for all valid terms
		function(callback) {
			console.log("Getting Spotify terms...");
			fetchTermsForUser(req.user, callback);
		},

		// Now order the popular artists
		function(artists, callback) {
			console.log("Detecting most popular artists...");
			var popularArtists = detectMostPopularArtists(artists, numberOfArtists);
			callback(null, popularArtists);

		},

		// Now loop all of the terms and do a search under each "search type" e.g. news
		function(searchTerms, callback) {
			console.log("Performing searches for Spotify Search Terms...");
			var query = req.query.query; //TODO: Move this up
			searchTerms = query ? [query] : searchTerms;

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
							}
						}

						console.log("Moving onto next search term");
						cb(null);
					});

			},
			function(err) {
				console.log("Finished looping each search term")

				if(err) {
					console.log("NOOOO")
				}
				else {
					console.log("So close now...")
					callback(null);
				}
			});
		},

		// Sort relevant result types
		function(callback) {
			console.log("Sorting results...");

			for (var i = 0; i < sortableTypes.length; i++) {
				var type = sortableTypes[i];

				console.log("Sorting type " + type);

				if(templateTags.results[type]) {
					templateTags.results[type] = templateTags.results[type].sort(function(a, b){ return b.date - a.date;})
				}
			}

			callback(null);
		},

		// Strip unwanted content
		function(callback) {
			console.log("Stripping unwanted content...");

			for (var i = 0; i < typeLimits.length; i++) {
				var type = typeLimits[i];

				console.log("For type " + type.name);

				var elements = templateTags.results[type.name];

				console.log("Before: " + elements.length);
				if(elements) {
					elements.splice(Math.min(elements.length, type.limit), Number.MAX_VALUE);
				}
				console.log("After: " + templateTags.results[type.name].length);
			}

			callback(null);
		},

		// Now render out the results
		function(callback) {
				console.log("YAY - we made it to the end");
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

	toSort = toSort.sort(function(a, b){
	  return b.total - a.total;
	});

	var results = [];
	for(var i = 0; i < Math.min(maxNumberOfArtists, toSort.length); i++) {
		var obj = toSort[i];
		if(obj){
			results.push(obj.name);
		}
	}

	return results;
}

function performSearchForTerm(searchTerm, types, megaCallback) {
		var count = 5,
			result = {};

		async.each(types, function(type, cb) {
			var urlOptions = {
				count: count,
				locale: "en_gb",
				q: searchTerm
			};

			if(type == "videos") {
				urlOptions.count = 4;
				urlOptions.f = "source-youtube";
			}

			var options = {
				url: 'https://api.qwant.com/api/search/' + type + '?' + querystring.stringify(urlOptions)
			};

			result[type] = []; // we are always exprected to return each type
			request(options, function (error, response, body) {
				console.log("URL: " + options.url);
				var mammoth = JSON.parse(body);
				console.log("-- Calling QWANT " + searchTerm + " " + type);
				if (!error && response.statusCode == 200 && typeof mammoth.data!=="undefined") {
					result[type] = mammoth.data.result.items;
				}
				//console.log("-- Called QWANT " + searchTerm + " " + type);

				//console.log("-- Moving on " + searchTerm + " " + type);
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
				//console.log("----- DONE " + searchTerm);
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

								console.log("currentIteration: " + currentIteration + " | totalIterations: " + totalIterations)
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
				//console.log("Yay, search complete. Passing onto megaCallback");
				megaCallback(null, totals);
			}
		});
}

module.exports = router;
