'use strict';

const debug = require('debug')('artc:artist-mock');
const userMock = require('./user-mock.js');
const Artist = require('../../model/artist.js');
const lorem = require('lorem-ipsum');

module.exports = function(count, done){
  userMock.call(this, err => {
    debug('mock multiple artists');
    if(err) return done(err);
    let artistMocks = [];
    let userID = this.tempUser._id.toString();
    let email = this.tempUser.email;
    let username = this.tempUser.username;
    for(var i=0; i<count; i++){
      artistMocks.push(mockArtist(userID, username,email));
    }
    return Promise.all(artistMocks)
    .then( artists => {
      artists.forEach( artist => {
        let artistID = artist._id.toString();
        this.tempUser.artists.push(artistID);
      });
      this.tempArtists = artists;
      return this.tempArtist.save();
    })
    .then(() => done())
    .catch(done);
  });
};

function mockArtist(userID, username, email) {
  let firstname =  lorem({count:2, units: 'word'});
  let lastname =  lorem({count:2, units: 'word'});
  let city =  lorem({count:2, units: 'word'});
  let zip =  lorem({count:2, units: 'word'});
  let exampleArtist = {
    firstname,
    lastname,
    city,
    zip,
    userID,
    username,
    email,
  };
  return new Artist(exampleArtist).save();
}
