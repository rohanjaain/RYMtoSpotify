const request = require('request');
const cheerio = require('cheerio');
const spotifyWebAPI = require('spotify-web-api-node');

var spotifyApi = new spotifyWebAPI({
    clientId: '3dc94d80ed874a2b9c244bfefecb0f20',
    clientSecret: '9e1a82bbec4b4f8b9881a53445d29f1b',
});  

spotifyApi.sear

RYM_URL = "https://www.rateyourmusic.com/list/kether82/workout_singles/"
if (/^(www\.)?rateyourmusic\.com\/list/.test(RYM_URL)){
    RYM_URL = "https://" + RYM_URL;
    console.log(RYM_URL)
}



if (!/^(https:\/\/)?(www.)?rateyourmusic\.com\/list/.test(RYM_URL)) {
    throw new Error("Input URL must start with https://rateyourmusic.com/list");
    // Alternatively, you can use `process.exit(1)` to exit the script with an error code
  }

const options = {
    url: RYM_URL,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
    }
};

songsOrAlbums = []

request(options, (error, response, html) => {
    if (!error && response.statusCode == 200) {
        const $ = cheerio.load(html);

        const userTable = $('#user_list');

        const trodds = userTable.find('.trodd');
        const trevens = userTable.find('.treven');
        trodds.each(function(i, elem) {
            // do something with the current `trodd` element
            const artists = $(this).find('.list_artist');
            const albumOrSingleName = $(this).find('.list_album');
            const releaseDate = $(this).find('.rel_date');
            // do something with the `mainElem` object
            if(artists.text() != '' && albumOrSingleName.text() != '' && releaseDate.text() != '')
                songsOrAlbums.push({
                    'artist': artists.text(),
                    'albumOrSingleName': albumOrSingleName.text(),
                    'releaseDate': releaseDate.text()
            });
        });

        trevens.each(function(i, elem) {
        // do something with the current `trodd` element
        const artists = $(this).find('.list_artist');
        const albumOrSingleName = $(this).find('.list_album');
        const releaseDate = $(this).find('.rel_date');
        // do something with the `mainElem` object
        if(artists.text() != '' || albumOrSingleName.text() != '' || releaseDate.text() != '')
            songsOrAlbums.push({
                'artist': artists.text(),
                'albumOrSingleName': albumOrSingleName.text(),
                'releaseDate': releaseDate.text()
            })
        });

          console.log(songsOrAlbums)
          console.log(songsOrAlbums.length)

          for (song of songsOrAlbums){
            if (/Single/.test(song.releaseDate)) {
                object = spotifyApi.searchTracks(song.albumOrSingleName + ' ' + song.artist)
                console.log(object)
            }
        }
    } else {
        console.log(response.statusCode)
    }
});

