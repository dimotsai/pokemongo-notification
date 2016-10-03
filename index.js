#!/usr/bin/env node
const Promise = require('bluebird');
const debug = require('debug')('pogono');
const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const moment = require('moment-timezone');
const _ = require('lodash');
const errors = require('request-promise/errors');
const StaticMap = require('./static_map.js');

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
    telegramTimeout: 30000,
    source: 'pokeradar',
    poGoMapAPI: null,
    poGoMapScanGlobal: true,
    IVMoveEnable: true,
    IVPokemonIds: null,
    minIVPerfection: 0,
    scoutEnable: false,
    scoutAdmins: null,
    googleAPIKey: null,
    mapFilterEnable: true,
    timezone: 'Asia/Taipei',
}, require(path.resolve(args.config)));

config.filteredPokemonIds = config.filteredPokemonIds.sort((a, b) => a-b);

if (config.centerLatitude && config.centerLongitude && config.nearbyDistance) {
    config.minLatitude = config.centerLatitude - config.nearbyDistance/110.574;
    config.maxLatitude = config.centerLatitude + config.nearbyDistance/110.574;
    config.minLongitude = config.centerLongitude - config.nearbyDistance/(111.32 * Math.cos(config.centerLatitude));
    config.maxLongitude = config.centerLongitude + config.nearbyDistance/(111.32 * Math.cos(config.centerLatitude));
};

moment.tz.setDefault(config.timezone);

const retry = require('./retry');
const TelegramBot = require('./telegram_bot.js');
const pokemonNames = require('./pokemon_names.js');
const pokemonMoves = require('./pokemon_moves.js');
const pokemonStickers = require('./stickers.js');
const getReverseGeocode = require('./get_reverse_geocode.js');
const messageTemplate = fs.readFileSync('./templates/message.md.template', 'utf-8');
const ivMoveTemplate = fs.readFileSync('./templates/iv_move.md.template', 'utf-8');

retry.setDefaults({
    max_tries: 5
}, {
    timeout: config.telegramTimeout,
    backoff: 1.5
});

let telegramBot = config.telegramBotEnable ? new TelegramBot(config, {polling: config.scoutEnable}) : null;
let sentPokemons = [];

const replace = function(template, replacements) {
    for (let placeholder in replacements) {
        template = template.replace(new RegExp(`{${placeholder}}`, 'g'), replacements[placeholder]);
    }
    return template;
}

const generateMessage = function(pokemon) {
    let iv_move = '';
    let should_display = _.reduce([
        pokemon.individualAttack,
        pokemon.individualDefense,
        pokemon.individualStamina,
        pokemon.move1,
        pokemon.move2
    ], function(sum, c) {
        return sum && !_.isNil(c) && !_.isNaN(c);
    }, true);
    if (config.IVMoveEnable && should_display) {
        iv_move = replace(ivMoveTemplate, {
            individual_attack: pokemon.individualAttack,
            individual_defense: pokemon.individualDefense,
            individual_stamina: pokemon.individualStamina,
            iv_perfection: pokemon.IVPerfection,
            move_1_en: pokemon.move1.en,
            move_2_en: pokemon.move2.en,
            move_1_zh: pokemon.move1.zh,
            move_2_zh: pokemon.move2.zh
        });
    }
    return replace(messageTemplate, {
        pokemon_id: pokemon.pokemonId,
        pokemon_name_zh: pokemon.pokemonName.zh,
        pokemon_name_en: pokemon.pokemonName.en,
        address_components: pokemon.reverseGeocode.components.map((x) => '#' + x).join(' '),
        address: pokemon.reverseGeocode.formatted_address,
        remaining_time: pokemon.remainingTime.format('mm:ss'),
        direction: pokemon.direction,
        until: pokemon.until.format('YYYY-MM-DD HH:mm:ss'),
        iv_move: iv_move
    });
}

const pushNotifications = function(pokemons) {
    sentPokemons = _.filter(sentPokemons, (s) => s.until.isAfter(moment()));

    // remove sent pokemons
    debug('fetch', 'fetch pokemons from the provider:', pokemons.length, 'pokemons left');
    let filteredPokemons = _.filter(pokemons, function (p) {
        return !_.find(sentPokemons, (s) => p.uniqueId == s.uniqueId) && p.remainingTime.diff(moment.utc(0)) > 0;
    });
    debug('filter', 'filter by sent pokemons:', filteredPokemons.length, 'pokemons left');

    if (config.IVPokemonIds !== null) {
        filteredPokemons = _.filter(filteredPokemons, function(pokemon) {
            if (config.IVPokemonIds === 'all') {
                return pokemon.IVPerfection >= config.minIVPerfection;
            } else {
                return !_.includes(config.IVPokemonIds, pokemon.pokemonId) || pokemon.IVPerfection >= config.minIVPerfection;
            }
        });
    }
    debug('filter', 'filter by IV', filteredPokemons.length, 'pokemons left');

    debug('get reverse geocode');
    return Promise.each(filteredPokemons, function(p) {
            return getReverseGeocode(p.latitude, p.longitude)
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
                    sentPokemons.push(p);
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

            if (config.telegramBotEnable && telegramBot && config.telegramChatId) {
                // push a notification
                return Promise.resolve()
                    .then(() => retry(() => telegramBot.sendSticker(config.telegramChatId, pokemonStickers[p.pokemonId], { disable_notification: true })))
                    .then(() => retry(() => telegramBot.sendLocation(config.telegramChatId, p.latitude, p.longitude, { disable_notification: true })))
                    .then(() => retry(() => telegramBot.sendMessage(config.telegramChatId, message, { parse_mode: 'Markdown' })))
                    .then(() => sentPokemons.push(p))
                    .catch(function(err) {
                        console.error(moment().format(), 'telegram bot error:', err.message);
                    })
            } else {
                sentPokemons.push(p);
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
            .catch(SyntaxError, function(reason) {
                console.error(moment().format(), 'syntax error:', reason.message);
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

if (config.source === 'pogomap' && config.scoutEnable) {
    let list_message_id = null;

    function generateList() {
        return _.range(1, pokemonNames.length).reduce(function(str, id) {
            let check = _.sortedIndexOf(config.filteredPokemonIds, id) !== -1 ? '☑️' : '◻️';
            return str + check + _.padEnd(pokemonNames[id].zh, 5, '　') + '\t/' + _.padStart(id, 3, '0') + '\n';
        }, '');
    }

    telegramBot.on('location', function(msg) {
        if (_.includes(config.scoutAdmins, msg.from.username)) {
            provider
                .nextLocation(msg.location.latitude, msg.location.longitude)
                .then(r => {
                    telegramBot.sendMessage(config.telegramChatId, "中心位置已變更。");
                    console.log('location changed:', r);
                } )
                .catch( (err) => console.error(moment().format(), 'next location error', err.message) );
        }
    })

    telegramBot.onText(/^\/(\d+)/, function(msg, match) {
        let id = parseInt(match[1], 10);
        let insertIdx = _.sortedIndex(config.filteredPokemonIds, id);

        if (list_message_id !== null) {
            if (config.filteredPokemonIds[insertIdx] === id) {
                _.pull(config.filteredPokemonIds, id);
                telegramBot.editMessageText(generateList(), { chat_id: config.telegramChatId, message_id: list_message_id });
                telegramBot.sendMessage(config.telegramChatId, `已關閉 ${pokemonNames[id].zh} 的通知`);
            } else if (id > 0 && id < pokemonNames.length) {
                config.filteredPokemonIds.splice(insertIdx, 0, id);
                telegramBot.editMessageText(generateList(), { chat_id: config.telegramChatId, message_id: list_message_id });
                telegramBot.sendMessage(config.telegramChatId, `已開啟 ${pokemonNames[id].zh} 的通知`);
            } else {
                // do nothing
            }
        } else {
            telegramBot.sendMessage(config.telegramChatId, "請先開啟清單 /list");
        }

    });

    telegramBot.onText(/^\/(list)/i, function(msg, match) {
        telegramBot.sendMessage(config.telegramChatId, generateList()).then(function(res) {
            list_message_id = res.message_id;
        });
    })

    telegramBot.onText(/^\/map/i, function(msg) {
        if (_.includes(config.scoutAdmins, msg.from.username)) {
            let staticMap = new StaticMap(config.googleAPIKey);
            let getLocation = provider
                .getLocation()
                .then(loc => {
                    staticMap.setCenter(loc.lat, loc.lng);
                });
            let getPokemon = provider
                .getPokemons(config.mapFilterEnable)
                .then(pokemons => {
                    staticMap.addPokemons(pokemons);
                });
            let pleaseWait = telegramBot.sendMessage(config.telegramChatId, '地圖製作中...');
            Promise.all([getLocation, getPokemon, pleaseWait])
                .then(() => staticMap.render())
                .then(image => {
                    debug('map url', staticMap.getUrls());
                    return telegramBot.sendPhoto(config.telegramChatId, image)
                });
        }
    });
}
