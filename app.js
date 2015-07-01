var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var SpotifyStrategy  = require('passport-spotify').Strategy;
var config = require('./config/config')

// Spotify/Session stuff
// from https://github.com/JMPerez/passport-spotify/blob/master/examples/login/app.js
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

console.log("Spotify ClientID: " + config.spotify.clientID);
console.log("Spotify Secret: " + config.spotify.secret);

passport.use(new SpotifyStrategy({
    clientID: config.spotify.clientID,
    clientSecret: config.spotify.secret,
    callbackURL: config.host + config.spotify.callbackUrl
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    process.nextTick(function () {
      return done(null, profile);
    });
  })
);





// ROUTES
var routes = require('./routes/index');
var users = require('./routes/users');
var results = require('./routes/results');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: 'mammoth ftw' }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/home', ensureAuthenticated, routes);
app.use('/users', ensureAuthenticated, users);
app.use('/results', ensureAuthenticated, results);


// GET /auth/spotify
//   Use passport.authenticate() as route middleware to authenticate the
//   request. The first step in spotify authentication will involve redirecting
//   the user to spotify.com. After authorization, spotify will redirect the user
//   back to this application at /auth/spotify/callback
app.get('/login',
  passport.authenticate('spotify', {scope: ['user-read-email', 'user-read-private', 'playlist-read-private', 'user-library-read'], showDialog: false}),
  function(req, res) { } // The request will be redirected to spotify for authentication, so this function will not be called.
);

// GET /auth/spotify/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request. If authentication fails, the user will be redirected back to the
//   login page. Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/callback',
  passport.authenticate('spotify', { failureRedirect: '/failedToLogin' }),
  function(req, res) {
    res.redirect('/home');
  });

app.get('/', function(req, res){
  res.redirect('/home');
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/home');
});



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed. Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}


module.exports = app;
