const fs = require('fs');
const request = require('request');
const moment = require('moment');
const _ = require('lodash');

const config = _.assign({
    filteredPokemonIds: null,
    trustedUserId: null,
    minLatitude: 24.783617562869416,
    maxLatitude: 24.82740393838965,
    minLongitude: 120.93629837036131,
    maxLongitude: 121.0129451751709,
    deviceId: '289cc3b0645c11e68c725f3accebce0f',
    queryInterval: 10000,
    telegramChatId: null,
    telegramBotToken: null,
    telegramBotEnable: false
}, require('./config.js'));
const telegramBot = require('./telegram_bot.js')(config);
const pokemonNames = require('./pokemon_names.js');
const pokemonStickers = require('./stickers.js');

const ttl = 15 * 60;
const getQueryString = (obj) => Object.keys(obj).map((k) => k + '=' + obj[k]).join('&');

let query = {
    deviceId: config.deviceId,
    minLatitude: config.minLatitude,
    maxLatitude: config.maxLatitude,
    minLongitude: config.minLongitude,
    maxLongitude: config.maxLongitude,
    pokemonId: 0
};

let filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
let sentPokemons = [];

let url = 'https://www.pokeradar.io/api/v1/submissions?' + getQueryString(query);
let callback = function (error, response, body) {
    if (!error && response.statusCode == 200) {
        let entries = JSON.parse(body).data;
        let filtered = _.filter(entries, function(o) {
            if (config.trustedUserId && o.userId != config.trustedUserId) {
                return false;
            }
            if (filteredPokemonIds && _.sortedIndexOf(filteredPokemonIds, o.pokemonId) == -1) {
                return false;
            }
            return true;
        });
        let processed = filtered.map((entry_) => {
            let entry = _.cloneDeep(entry_);
            let secs = entry.created + ttl - moment().unix();
            entry.pokemonName = pokemonNames[entry.pokemonId];
            entry.remainingTime = moment.utc(0).seconds(secs).format('mm:ss');
            entry.direction = 'https://www.google.com/maps/dir/Current+Location/' + entry.latitude + ',' + entry.longitude;
            entry.realId = `${entry.pokemonId}-${entry.created}`;
            return entry;
        });
        sentPokemons = _.filter(sentPokemons, (o) => o.expires > moment().unix());
        let promise = Promise.resolve();
        processed.forEach(function(v, k) {
            if (!_.find(sentPokemons, (o) => o.realId == v.realId)) {
                let message = `#${v.pokemonName.zh} #${v.pokemonName.en} #${v.pokemonId}\nLocation: ${v.direction}\nRemaining time: ${v.remainingTime}`;
                console.log(moment().format(), 'message:', message);
                if (config.telegramBotEnable && telegramBot && config.telegramChatId) {
                    promise = promise
                        .then(() => telegramBot.sendSticker(config.telegramChatId, pokemonStickers[v.pokemonId]))
                        .then(() => telegramBot.sendMessage(config.telegramChatId, message))
                        .then(() => telegramBot.sendLocation(config.telegramChatId, v.latitude, v.longitude))
                }
                sentPokemons.push({
                    realId: v.realId,
                    expires: v.created + ttl
                });
            }
        });
    } else {
        console.error('Oops!');
    }
};

setInterval(function() {
    request(url, callback);
}, config.queryInterval);
