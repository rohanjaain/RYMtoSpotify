const request = require('request');
const cheerio = require('cheerio');
const spotifyWebAPI = require('spotify-web-api-node');
const util = require('util');
//import { initSpotifyToken } from './spotifyFunctions.js';

 var spotifyApi = new spotifyWebAPI({
    clientId: '3dc94d80ed874a2b9c244bfefecb0f20',
    clientSecret: '9e1a82bbec4b4f8b9881a53445d29f1b',
    callbackURI: 'http://localhost:8888/callback'
});

// Now you can use the initSpotifyToken function in this file
var AuthParameters = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body:'grant_type=client_credentials&client_id=' + "3dc94d80ed874a2b9c244bfefecb0f20" + '&client_secret=' + "9e1a82bbec4b4f8b9881a53445d29f1b"
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

RYM_URL = "https://rateyourmusic.com/list/thicccc/growing-up-in-the-scene-indie-surf-bands-in-southern-california-from-the-early_mid-2010s-people-listened-to/"
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

fullRequest();

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
          imageURL: object.images[0].url
        });
      }
      return return_albums;
    });
}

async function searchArtistsAndGetTopTracks(search_parameter){
    return spotifyApi.searchArtists(search_parameter, {limit: 3}).then(async (result) => {
      let return_artist = [];
      console.log(result.body.artists.items[0])
      for (index in result.body.artists.items){
        currArtist = result.body.artists.items[index]
        console.log(currArtist)
        let extractTopFive = await getArtistTopTracks(currArtist.id)
        return_artist.push({
            artistName: currArtist.name,
            artistId: currArtist.id,
            href: currArtist.external_urls.spotify,
            imageURL: currArtist.images && currArtist.images.length > 0
              ? currArtist.images[0].url
              : undefined,
            topSongs: extractTopFive,
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
            artists: extractArtists
        });
      }
      return return_tracks;
    });
}


//FIXME: right now it is not getting the tracks
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
          artists: extractArtists
        });
      }
      return return_tracks;
    });
}