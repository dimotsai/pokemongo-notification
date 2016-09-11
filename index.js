#!/usr/bin/env node
const Promise = require('bluebird');
const debug = require('debug')('pogono');
const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const moment = require('moment');
const _ = require('lodash');
const errors = require('request-promise/errors');

const args = require('./args.js');
const config = _.assign({
    filteredPokemonIds: null,
    filteredAddressKeywords: null,
    trustedUserId: null,
    minLatitude: 24.783617562869416,
    maxLatitude: 24.82740393838965,
    minLongitude: 120.93629837036131,
    maxLongitude: 121.0129451751709,
    queryInterval: 10000,
    telegramChatId: null,
    telegramBotToken: null,
    telegramBotEnable: false,
    source: 'pokeradar',
    pokemonGoMapAPI: null
}, require(path.resolve(args.config)));

if (config.centerLatitude && config.centerLongitude && config.nearbyDistance) {
    config.minLatitude = config.centerLatitude - config.nearbyDistance/110.574;
    config.maxLatitude = config.centerLatitude + config.nearbyDistance/110.574;
    config.minLongitude = config.centerLongitude - config.nearbyDistance/(111.32 * Math.cos(config.centerLatitude));
    config.maxLongitude = config.centerLongitude + config.nearbyDistance/(111.32 * Math.cos(config.centerLatitude));
};

const TelegramBot = require('./telegram_bot.js');
const pokemonNames = require('./pokemon_names.js');
const pokemonStickers = require('./stickers.js');
const getReverseGeocode = require('./get_reverse_geocode.js');
const messageTemplate = fs.readFileSync('./message_template.md.raw', 'utf-8');

let telegramBot = config.telegramBotEnable ? new TelegramBot(config) : null;
let sentPokemons = [];

const generateMessage = function(pokemon) {
    let message = messageTemplate;
    let replacements = {
        pokemon_id: pokemon.pokemonId,
        pokemon_name_zh: pokemon.pokemonName.zh,
        pokemon_name_en: pokemon.pokemonName.en,
        address_components: pokemon.reverseGeocode.components.map((x) => '#' + x).join(' '),
        address: pokemon.reverseGeocode.formatted_address,
        remaining_time: pokemon.remainingTime.format('mm:ss'),
        direction: pokemon.direction,
        until: pokemon.until.format('YYYY-MM-DD HH:mm:ss')
    };
    for (let placeholder in replacements) {
        message = message.replace('{' + placeholder + '}', replacements[placeholder]);
    }
    return message;
}

const pushNotifications = function(pokemons) {
    sentPokemons = _.filter(sentPokemons, (s) => s.until.isAfter(moment()));

    // remove sent pokemons
    debug('fetch', 'fetch pokemons from the provider:', pokemons.length, 'pokemons left');
    let filteredPokemons = _.filter(pokemons, function (p) {
        return !_.find(sentPokemons, (s) => p.uniqueId == s.uniqueId) && p.remainingTime.diff(moment.utc(0)) > 0;
    });
    debug('filter', 'filter by sent pokemons:', filteredPokemons.length, 'pokemons left');

    debug('get reverse geocode');
    return Promise.each(filteredPokemons, function(p) {
            return getReverseGeocode(p.latitude, p.longitude)
                .catch(function(err) {
                    console.error(moment().format(), 'reverse geocode error:', err);
                    return [];
                })
                .then((reverseGeocode) => p.reverseGeocode = reverseGeocode);
        })
        .then(function filterByAddressKeywords() {
            filteredPokemons = _.filter(filteredPokemons, function(p) {
                if (config.filteredAddressKeywords) {
                    let keywords = _.isArray(config.filteredAddressKeywords) ? config.filteredAddressKeywords : [config.filteredAddressKeywords];
                    for (let keyword of keywords) {
                        if (p.reverseGeocode.formatted_address.includes(keyword) || p.reverseGeocode.components.join(',').includes(keyword)) {
                            return true;
                        }
                    }
                    return false;
                }
                return true;
            });
            debug('filter', 'filter by address keywords', config.filteredAddressKeywords, ':', filteredPokemons.length, 'pokemons left');
            debug('notify', filteredPokemons.length, 'pokemons');
            return filteredPokemons;
        })
        .each(function(p) {
            let message = generateMessage(p);
            console.log(moment().format(), 'message:', message);
            sentPokemons.push(p);

            if (config.telegramBotEnable && telegramBot && config.telegramChatId) {
                // push a notification
                return Promise.resolve()
                    .then(() => telegramBot.sendSticker(config.telegramChatId, pokemonStickers[p.pokemonId]))
                    .then(() => telegramBot.sendLocation(config.telegramChatId, p.latitude, p.longitude))
                    .then(() => telegramBot.sendMessage(config.telegramChatId, message, { parse_mode: 'Markdown' }))
                    .catch(function(err) {
                        console.error(moment().format(), 'telegram bot error:', err.message);
                    });
            }
        });
}

let Provider = require('./providers/' + config.source);
let provider = new Provider(config);

debug('request loop starts');

provider
    .init()
    .then(function requestLoop() {
        return provider
            .getPokemons()
            .then(pushNotifications)
            .catch(errors.StatusCodeError, function (reason) {
                console.error(moment().format(), 'status code error:', reason.message);
            })
            .catch(errors.RequestError, function (reason) {
                console.error(moment().format(), 'request error:', reason.message);
            })
            .delay(config.queryInterval)
            .then(requestLoop);
    })
    .catch(function(reason) {
        console.error(moment().format(), reason);
        // TODO: use TelegramBot#stopPolling instead
        telegramBot._polling.abort = true;
        console.error('the program has been terminated')
    });
