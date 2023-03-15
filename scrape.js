const request = require('request');
const cheerio = require('cheerio');
const spotifyWebAPI = require('spotify-web-api-node');
const util = require('util');
const express = require('express')
require('dotenv').config();
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const app = express();

const scopes = [
  'ugc-image-upload',
  // 'user-read-playback-state',
  // 'user-modify-playback-state',
  // 'user-read-currently-playing',
  // 'streaming',
  // 'app-remote-control',
  'user-read-email',
  'user-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-read-private',
  'playlist-modify-private',
  'user-library-modify',
  'user-library-read'
  // 'user-top-read',
  // 'user-read-playback-position',
  // 'user-read-recently-played',
  // 'user-follow-read',
  // 'user-follow-modify'
];

 var spotifyApi = new spotifyWebAPI({
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
    redirectUri: 'http://localhost:8888/callback'
});

app.get('/login', (req, res) => {
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', (req, res) => {
  const error = req.query.error;
  const code = req.query.code;
  const state = req.query.state;

  if (error) {
    console.error('Callback Error:', error);
    res.send(`Callback Error: ${error}`);
    return;
  }

  spotifyApi
    .authorizationCodeGrant(code)
    .then(data => {
      const access_token = data.body['access_token'];
      const refresh_token = data.body['refresh_token'];
      const expires_in = data.body['expires_in'];

      spotifyApi.setAccessToken(access_token);
      spotifyApi.setRefreshToken(refresh_token);

      console.log('access_token:', access_token);
      console.log('refresh_token:', refresh_token);

      console.log(
        `Sucessfully retreived access token. Expires in ${expires_in} s.`
      );
      res.send('Success! You can now close the window.');

      setInterval(async () => {
        const data = await spotifyApi.refreshAccessToken();
        const access_token = data.body['access_token'];

        console.log('The access token has been refreshed!');
        console.log('access_token:', access_token);
        spotifyApi.setAccessToken(access_token);
      }, expires_in / 2 * 1000);

      fullRequest();
    })
    .catch(error => {
      console.error('Error getting Tokens:', error);
      res.send(`Error getting Tokens: ${error}`);
    });
});

app.listen(8888, () =>
  console.log(
    'HTTP Server up. Now go to http://localhost:8888/login in your browser.'
  )
);


// Now you can use the initSpotifyToken function in this file
var AuthParameters = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body:'grant_type=client_credentials&client_id=' + SPOTIFY_CLIENT_ID + '&client_secret=' + SPOTIFY_CLIENT_SECRET
  }
  
 let accessToken = null

  async function initSpotifyToken(){ 
    try {
        accessToken = await fetch('https://accounts.spotify.com/api/token', AuthParameters)
        .then(results => results.json())
        .then(data => {
            spotifyApi.setAccessToken(data.access_token)
            return data.access_token
        })
        return accessToken
    } catch (error) {
        console.log(error)   
    }
 }

initSpotifyToken();

RYM_URL = "https://rateyourmusic.com/list/PsychedelicSquirrel/good-indie/"
if (/^(www\.)?rateyourmusic\.com\/list/.test(RYM_URL)){
    RYM_URL = "https://" + RYM_URL;
}

if (!/^(https:\/\/)?(www.)?rateyourmusic\.com\/list/.test(RYM_URL)) {
    throw new Error("Input URL must start with https://rateyourmusic.com/list");
}

const options = {
    url: RYM_URL,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
    }
};

async function halfRequest() {
    return new Promise((resolve, reject) => {
      request(options, async (error, response, html) => {
        if (error || response.statusCode !== 200) {
          console.log(response.statusCode);
          reject(error);
        } else {
          const $ = cheerio.load(html);
          const userTable = $('#user_list');
          const allRows = userTable.find('.trodd, .treven');
          const songsOrAlbums = [];
  
          for (let elem of allRows) {
            var artists = $(elem).find('.list_artist').text();
            var albumOrSingleName = $(elem).find('.list_album').text();
            var releaseDate = $(elem).find('.rel_date').text();
            var data;
            var type;
            if(artists != '' || albumOrSingleName != '' || releaseDate != ''){
                if(albumOrSingleName != '' && releaseDate != ''){
                    if (/((Video)|(Bootleg)|(Unauthorized)|(DJ\ Mix))/.test(releaseDate)){
                        type = 'Video/Bootleg/Unauthorized/DJ Mix'
                        continue
                    //if it is a Single
                    } if (/Single/.test(releaseDate)) {
                        data = []
                        const splitSongs = albumOrSingleName.split(" / ");
                        type = 'Single'
                        for(let songName of splitSongs){
                            tracks = await searchTracks(songName + ' ' + artists)
                            data.push({
                                trackName: songName,
                                spotifyObjects: tracks
                            })
                        }
                    //else it is an album/EP/mixtape
                    } else {
                        if (/EP/.test(releaseDate)){
                            type = 'EP'
                        } else if (/Mixtape/.test(releaseDate)){
                            type = 'Mixtape'
                        } else {
                            type = 'Album'
                        }
                        albums = await searchAlbums(albumOrSingleName + ' ' + artists)
                        data = {
                            albumName: albumOrSingleName,
                            spotifyObjects: albums
                        }
                    }
                //else it is an artist
                } else if(artists != ''){
                    extractTopFive = await searchArtistsAndGetTopTracks(artists)
                    data = {
                        artistName: artists,
                        spotifyObjects: extractTopFive
                    }
                    type = 'artist';
                }
                songsOrAlbums.push({
                    'artist': artists,
                    'albumOrSingleName': albumOrSingleName,
                    'releaseDate': releaseDate,
                    'type': type,
                    'data': data
                })
            }
          };
          resolve(songsOrAlbums);
        }
      });
    });
  }


async function fullRequest() {
    excluded = [];
    updatedSongsAlbumsArtists = [];
    songsOrAlbums = await halfRequest();
    console.log(util.inspect(songsOrAlbums, false, null, true));
    await createPlaylist(songsOrAlbums)
}

async function createPlaylist(songsOrAlbums){
  console.log(songsOrAlbums)
  let result = await spotifyApi.createPlaylist('Good indie')
  // console.log(result)
  // get the playlist id from the result
  let playlistId = result.body.id
  console.log(playlistId)
  for (let thing of songsOrAlbums){
    console.log("======================")
    console.log(thing)
    if(thing.type == 'EP' || thing.type == 'Album'| thing.type == 'Mixtape'){
      let albumobject = await spotifyApi.getAlbumTracks(thing.data.spotifyObjects[0].albumId)
      //deduce albumtracks
      let albumtracks = []
      for(let album_track of albumobject.body.items){
        albumtracks.push("spotify:track:" + album_track.id)
      }
      console.log(albumtracks)
      await spotifyApi.addTracksToPlaylist(playlistId, albumtracks)
    } else if (thing.type == 'Single') {
      let singletracks = []
      for(let track of thing.data){
        singletracks.push("spotify:track:" + track.spotifyObjects[0].trackId)
      }
      console.log(singletracks)
      await spotifyApi.addTracksToPlaylist(playlistId, singletracks)
    } else if (thing.type == 'artist') {
      let artisttracks = []
      for(let artist_track of thing.data.spotifyObjects[0].topSongs){
        artisttracks.push("spotify:track:" + artist_track.songId)
      }
      console.log(artisttracks)
      await spotifyApi.addTracksToPlaylist(playlistId, artisttracks)
    }
  }
}

async function searchAlbums(search_parameter){
    return spotifyApi.searchAlbums(search_parameter, {limit: 5}).then((result) => {
      let return_albums = [];
      for (object of result.body.albums.items){
        let extractArtists = [];
        for (artist of object.artists){
          extractArtists.push(artist.name);
        }
        return_albums.push({
          albumName: object.name,
          albumId: object.id,
          href: object.external_urls.spotify,
          artists: extractArtists,
          imageURL: object.images && object.images.length > 0
              ? object.images[0].url
              : undefined
        });
      }
      return return_albums;
    });
}

async function searchArtistsAndGetTopTracks(search_parameter){
    return spotifyApi.searchArtists(search_parameter, {limit: 3}).then(async (result) => {
      let return_artist = [];
      for (let currArtist of result.body.artists.items){
        let extractTopFive = await getArtistTopTracks(currArtist.id)
        return_artist.push({
            artistName: currArtist.name,
            artistId: currArtist.id,
            href: currArtist.external_urls.spotify,
            imageURL: currArtist.images && currArtist.images.length > 0
              ? currArtist.images[0].url
              : undefined,
            topSongs: extractTopFive
        });
      }
      return return_artist;
    });
}

async function getArtistTopTracks(artistID){
    return spotifyApi.getArtistTopTracks(artistID, 'US').then((result) => {
      let return_tracks = []
      for (object of result.body.tracks){
        let extractArtists = [];
        for (artist of object.artists){
          extractArtists.push(artist.name);
        }
        return_tracks.push({
            songName: object.name,
            songId: object.id,
            href: object.external_urls.spotify,
            artists: extractArtists,
            imageURL: object.album.images && object.album.images.length > 0
              ? object.album.images[0].url
              : undefined
        });
      }
      return return_tracks;
    });
}

async function searchTracks(search_parameter){
    return spotifyApi.searchTracks(search_parameter, {limit: 5}).then((result) => {
      let return_tracks = [];
      for (object of result.body.tracks.items){
        let extractArtists = [];
        for (artist of object.artists){
          extractArtists.push(artist.name);
        }
        return_tracks.push({
          trackName: object.name,
          trackId: object.id,
          href: object.external_urls.spotify,
          artists: extractArtists,
          imageURL: object.album.images && object.album.images.length > 0
              ? object.album.images[0].url
              : undefined
        });
      }
      return return_tracks;
    });
}