// Requiring our models and passport as we've configured it
var db = require("../models");
const path = require("path");
const axios = require("axios");
var passport = require("../config/passport");

const SCOPES = ["playlist-read-private"];
const CALLBACK_URL = process.env.CALLBACK_URL || "http://localhost:3000/api/spotify/callback";

function buildSpotifyRedirectUrl(){
  const url = `https://accounts.spotify.com/authorize` +
    `?client_id=${process.env.SPOTIFY_CLIENT_ID}`
    +`&response_type=token&redirect_uri=${CALLBACK_URL}`
    +`&scope=${SCOPES.join("%20")}`;
    return url;
}

module.exports = function(app) {
  // Using the passport.authenticate middleware with our local strategy.
  // If the user has valid login credentials, send them to the members page.
  // Otherwise the user will be sent an error
  app.post("/api/login", passport.authenticate("local"), function(req, res) {
    res.json(req.user);
  });

  // Route for signing up a user. The user's password is automatically hashed and stored securely thanks to
  // how we configured our Sequelize User Model. If the user is created successfully, proceed to log the user in,
  // otherwise send back an error
  app.post("/api/signup", function(req, res) {
    db.User.create({
      email: req.body.email,
      password: req.body.password
    })
      .then(function() {
        res.redirect(307, "/api/login");
      })
      .catch(function(err) {
        res.status(401).json(err);
      });
  });

  // Route for logging user out
  app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
  });

  // Route for getting some data about our user to be used client side
  app.get("/api/user_data", function(req, res) {
    if (!req.user) {
      // The user is not logged in, send back an empty object
      res.json({});
    } else {
      // Otherwise send back the user's email and id
      // Sending back a password, even a hashed password, isn't a good idea
      res.json({
        email: req.user.email,
        id: req.user.id
      });
    }
  });

  app.get("/api/spotify/link", function(req, res){
    if(req.user){
      res.json({
        success: true,
        redirect_url: buildSpotifyRedirectUrl()
      })
    } else {
      res.status(401).json({
        success: false,
        error: "you must be logged in to perform this action"
      })
    }
  })
  app.post("/api/spotify/connect", function(req, res){
    console.log(req.body);
    if(req.user){
      req.user.spotifyAccessToken = req.body.access_token
      req.user.save().then(() => {
        res.json({
          success: true,
        })
      }).catch(() => {
        res.status(500).json({
          success:false
        })
      })
      
    } else {
      res.status(401).json({
        success: false,
        error: "you must be logged in to perform this action"
      })
    }
  })

  app.get("/api/spotify/link", function(req, res){
    if(req.user){
      res.json({
        success: true,
        redirect_url: buildSpotifyRedirectUrl()
      })
    } else {
      res.status(401).json({
        success: false,
        error: "you must be logged in to perform this action"
      })
    }
    
  })
  app.get("/api/spotify/callback", function(req, res){
    if(req.user){
      res.sendFile(path.join(__dirname, "../public/callback.html"));
    } else {
      res.status(401).json({
        success: false,
        error: "you must be logged in to perform this action"
      })
    }
    
  })
  app.get("/api/spotify/playlists", function(req, res){
    if(req.user){
      if(req.user.spotifyAccessToken){
        axios.get("https://api.spotify.com/v1/me/playlists", {
          headers: {
            "Authorization": `Bearer ${req.user.spotifyAccessToken}`
          }
        }).then(response => {
          console.log(response);
          res.json(response.data);
        })
      } else {
        res.status(401).json({
          success: false,
          error: "your account must be connected to spotify"
        })
      }
    } else {
      res.status(401).json({
        success: false,
        error: "you must be logged in to perform this action"
      })
    }
  })
};
