const request = require('request');
const fs = require('fs');
const pokemon_names = require('./pokemon_names.js');
const config = require('./config.js');
const _ = require('lodash');

let getQueryString = (obj) => Object.keys(obj).map((k) => k + '=' + obj[k]).join('&');

let query = {
    deviceId: config.deviceId,
    minLatitude: config.minLatitude,
    maxLatitude: config.maxLatitude,
    minLongitude: config.minLongitude,
    maxLongitude: config.maxLongitude,
    pokemonId: 0
};

let url = 'https://www.pokeradar.io/api/v1/submissions?' + getQueryString(query);
let callback = function (error, response, body) {
	if (!error && response.statusCode == 200) {
		let entries = JSON.parse(body).data;
		let filtered = _.filter(entries, function(o) {
			if (config.trustedUserId && o.userId != config.trustedUserId) {
				return false;
			}
			if (config.filteredPokemonIds && config.filteredPokemonIds.indexOf(o.pokemonId) == -1) {
				return false;
			}
			return true;
		});
		let processed = filtered.map((entry_) => {
			let entry = _.cloneDeep(entry_);
			let secs = entry.created + 15 * 60 - Math.floor(new Date().getTime()/1000);
			entry.pokemonName = pokemon_names[entry.pokemonId];
			entry.remainTime = Math.floor(secs/60) + ':' + secs%60;
			entry.direction = 'https://www.google.com/maps?q=' + entry.latitude + ',' + entry.longitude;
			return entry;
		});
		console.log(processed);
	} else {
		console.error('Oops!');
	}
};

setInterval(function() {
	request(url, callback);
}, 10000);
