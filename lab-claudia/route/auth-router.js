'use strict';

const Router = require('express').Router;
const debug = require('debug')('artc:auth-router');
const jsonParser = require('body-parser').json();
const createError = require('http-errors');
const AWS = require('aws-sdk');

const Artist = require('../model/artist.js');
const Gallery = require('../model/gallery.js');
const Listing = require('../model/listing.js');
const Photo = require('../model/photo.js');
const User = require('../model/user.js');

const googleOAUTH = require('../lib/google-oauth-middleware.js');
const basicAuth = require('../lib/basic-auth-middleware.js');
const bearerAuth = require('../lib/bearer-auth-middleware');

AWS.config.setPromisesDependency(require('bluebird'));

const authRouter = module.exports = Router();
const s3 = new AWS.S3();

authRouter.post('/api/signup', jsonParser, function(req, res, next){
  debug('hit route POST /api/signup');
  let password = req.body.password;
  delete req.body.password;
  let user = new User(req.body);

  if (!password)
    return next(createError(400, 'requires password'));

  if (password.length < 7)
    return next(createError(400, 'password must be at least 7 characters'));

  user.generatePasswordHash(password)
  .then( user => user.save())
  .then( user => user.generateToken())
  .then( token => res.send(token))
  .catch(next);
});

authRouter.get('/api/login', basicAuth, function(req, res, next){
  debug('hit route GET /api/login');

  User.findOne({username: req.auth.username})
  .then( user => user.comparePasswordHash(req.auth.password))
  .catch(err => Promise.reject(createError(401, err.message)))
  .then( user => user.generateToken())
  .then( token => res.send(token))
  .catch(next);
});

authRouter.delete('/api/user/deleteAccount', bearerAuth, function(req, res, next) {
  debug('hit route DELETE /api/user/deleteAccount');
  User.findByIdAndRemove(req.user._id)
  .catch( err => Promise.reject(err, err.message))
  .then( () => Listing.remove({ userID: req.user._id}))
  .then( () => Gallery.remove({ userID: req.user._id}))
  .then( () => Artist.remove({ userID: req.user._id}))
  .then( () => Photo.find({ userID: req.user._id}))
  .then( photos => {
    let s3DeletePhotoArray = [];
    for(var i=0; i<photos.length; i++){
      s3DeletePhotoArray.push(s3.deleteObject({
        Bucket: 'artc-staging-assets',
        Key: photos[i].objectKey,
      }).promise());
    }
    return Promise.all(s3DeletePhotoArray);
  })
  .then( () => Photo.remove({ userID: req.user._id}))
  .then( () => res.sendStatus(204))
  .catch(next);
});

authRouter.put('/api/user/updateEmail', bearerAuth, jsonParser, function(req, res, next) {
  debug('hit route PUT /api/user/updateEmail');
  return User.findByIdAndUpdate(req.user._id, req.body, {new: true, runValidators: true})
  .then( user => {
    res.json(user);
  })
  .catch(next);
});

authRouter.put('/api/user/updateUsername', bearerAuth, jsonParser, function(req, res, next) {
  debug('hit route PUT /api/user/updateUsername');
  return User.findByIdAndUpdate(req.user._id, req.body, {new: true, runValidators: true})
  .then( user => {
    res.json(user);
  })
  .catch(next);
});


authRouter.put('/api/user/updatePassword', bearerAuth, jsonParser, function(req, res, next) {
  debug('hit route PUT /api/user/updatePassword');
  return User.findByIdAndUpdate(req.user._id, req.body, {new: true, runValidators: true})
  .then( user => {
    res.json(user);
  })
  .catch(next);
});


authRouter.get('/api/auth/oauth_callback', googleOAUTH, function(req, res){
  debug('GET /api/auth/oauth_callback');
  // should have either req.googleError or req.googleOAUTH
  console.log('googleError', req.googleError);
  console.log('googleOAUTH', req.googleOAUTH);

  // if googleError deal with google Error
  if(req.googleError){
    return res.redirect('/');
  }

  // check if user allreay exists
  User.findOne({email: req.googleOAUTH.email})
  .then(user => {
    if (!user) return Promise.reject(new Error('user not found'));
    return user;
  })
  .catch(err => {
    if (err.message === 'user not found'){
      let userData = {
        username: req.googleOAUTH.email,
        email: req.googleOAUTH.email,
        google: {
          googleID: req.googleOAUTH.googleID,
          tokenTTL: req.googleOAUTH.tokenTTL,
          tokenTimestamp: Date.now(),
          refreshToken: req.googleOAUTH.refreshToken,
          accessToken: req.googleOAUTH.accessToken,
        },
      };
      return new User(userData).save();
    }
    return Promise.reject(err);
  })
  .then(user => user.generateToken())
  .then(token => {
    res.redirect(`/?token=${token}`);
  })
  .catch(err => {
    console.error(err);
    console.log('user not found');
    res.redirect('/');
  });
  //res.send('lulwat');
  //return new User(userData).save();
  //})
  //.then(user => user.generateToken())
  //.then(token => {
  //res.send(token);
  //})
  //.catch((err) => {
  //console.error(err);
  //res.send('boo hoo')
  //});

});
