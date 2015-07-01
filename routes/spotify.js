var express = require('express');
var router = express.Router();
var config = require('../config/config');
var util = require('util');

/* GET home page. */
router.get('/authenticate', function(req, res, next) {;
  if(!req.cookies.spotifyCode) {
    var url = "https://accounts.spotify.com/authorize/?client_id=%s&response_type=code&redirect_uri=%s&scope=user-read-private%20user-read-email";
    var clientID = config.spotify.clientID;
    var returnUrl = "http://localhost:3000/spotify/callback";
    url = util.format(url, clientID, returnUrl);

    res.writeHead(302, { 'Location': url });
    res.end();
  }
  else {
    res.render('spotify', { message: 'Yay, looks like everything worked...' });
  }
});


router.get('/callback', function(req, res, next) {
  var code = req.query.code;
  if(code) {
    var hour = 60 * 60 * 1000;
    res.cookie("spotifyCode", code, { maxAge: hour } );
    res.render('spotify', { message: code });
  }
  else{
    var error = req.query.error;
    res.render('spotify', { message: "No luck :( &nbsp;&nbsp;&nbsp;" + error });
  }
});

module.exports = router;
