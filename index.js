#!/usr/bin/env node
const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const moment = require('moment');
const _ = require('lodash');
const errors = require('request-promise/errors');

const args = require('./args.js');
const config = _.assign({
    filteredPokemonIds: null,
    trustedUserId: null,
    minLatitude: 24.783617562869416,
    maxLatitude: 24.82740393838965,
    minLongitude: 120.93629837036131,
    maxLongitude: 121.0129451751709,
    queryInterval: 10000,
    telegramChatId: null,
    telegramBotToken: null,
    telegramBotEnable: false,
    source: 'pokeradar'
}, require(path.resolve(args.config)));
const PokeRadar = require('./providers/pokeradar.js');
const telegramBot = require('./telegram_bot.js')(config);
const pokemonNames = require('./pokemon_names.js');
const pokemonStickers = require('./stickers.js');
const getReverseGeocode = require('./get_reverse_geocode.js');

let sentPokemons = [];

const pushNotifications = function(pokemons) {
    let promise = Promise.resolve();
    sentPokemons = _.filter(sentPokemons, (o) => o.until.isAfter(moment()));
    pokemons.forEach(function(v) {
        if (!_.find(sentPokemons, (o) => o.uniqueId == v.uniqueId) && v.remainingTime.diff(moment.utc(0)) > 0) {
            let message = '';
            promise = promise.then(() => getReverseGeocode(v.latitude, v.longitude)).then(function(reverseGeocode) {
                message = `#${v.pokemonName.zh} (${reverseGeocode.map((x) => '#' + x).join(' ')} #${v.pokemonName.en} #${v.pokemonId})\n`
                    + `導航: ${v.direction}\n`
                    + `剩餘時間: ${v.remainingTime.format('mm:ss')}\n`
                    + `結束於: ${v.until.format('YYYY-MM-DD HH:mm:ss')}`;
                console.log(moment().format(), 'message:', message);
            });
            if (config.telegramBotEnable && telegramBot && config.telegramChatId) {
                promise = promise
                    .then(() => telegramBot.sendSticker(config.telegramChatId, pokemonStickers[v.pokemonId]))
                    .then(() => telegramBot.sendMessage(config.telegramChatId, message))
                    .then(() => telegramBot.sendLocation(config.telegramChatId, v.latitude, v.longitude))
                    .catch(function(err) {
                        console.error(moment().format(), err.message);
                    })
            }
            sentPokemons.push(v);
        }
    });
    return promise;
}

let Provider = require('./providers/' + config.source);
let provider = new Provider(config);

provider
    .init()
    .then(function requestLoop() {
        return provider
            .getPokemons()
            .then(pushNotifications)
            .catch(errors.StatusCodeError, function (reason) {
                console.error(moment().format(), reason.message);
            })
            .catch(errors.RequestError, function (reason) {
                console.error(moment().format(), reason.message);
            })

            .delay(config.queryInterval)
            .then(requestLoop);
    })
    .catch(function(reason) {
        console.error(moment().format(), reason.message);
        console.log('Program Stopped')
        // TODO: use TelegramBot#stopPolling instead
        telegramBot._polling.abort = true;
    });
