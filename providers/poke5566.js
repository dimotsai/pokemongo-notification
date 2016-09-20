const _ = require('lodash');
const qs = require('qs');
const request = require('request-promise');
const moment = require('moment');
const debug = require('debug')('provider:poke5566');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');

class Poke5566 extends Provider {
    constructor(config) {
        super(config);
        this._deviceId = '';
        this._url = 'https://poke5566.com/pokemons';
        this._indexUrl = 'https://poke5566.com';
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
    }

    init() {
        return Promise.resolve();
    }

    getPokemons() {
        return this._getToken().then(function(token) {
            const query = {
                lat0: this._config.maxLatitude,
                lng0: this._config.maxLongitude,
                lat1: this._config.minLatitude,
                lng1: this._config.minLongitude,
                devc: 'mobile',
                zoom: 14,
                star: 1,
                ss: token
            };
            const queryString = '?' + qs.stringify(query);
            const options = {
                url: this._url + queryString,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://poke5566.com/',
                    'Cookie': 'star=1; _ga=GA1.2.144174314.1472498477;',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
                }
            };

            return request(options).then(this._processData.bind(this));
        }.bind(this));
    }

    _processData(body) {
        let entries = JSON.parse(body).pokemons;
        debug('fetch', entries.length, 'pokemons left');
        let filtered = _.filter(entries, (o) => {
            if (this._filteredPokemonIds && _.sortedIndexOf(this._filteredPokemonIds, o.id) == -1) {
                return false;
            }
            return true;
        });
        debug('filter', 'filter by filteredPokemonIds:', filtered.length, 'pokemons left');
        let processed = filtered.map((entry_) => {
            let entry = {};
            let diff = moment(entry_.time).diff(moment());
            entry.latitude = entry_.lat;
            entry.longitude = entry_.lng;
            entry.pokemonId = entry_.id;
            entry.pokemonName = pokemonNames[entry_.id];
            entry.remainingTime = moment.utc(diff);
            entry.until = moment(entry_.time);
            entry.direction = 'https://www.google.com/maps/dir/Current+Location/' + entry_.lat + ',' + entry_.lng;
            entry.uniqueId = `${entry_.id}-${entry_.time}`;
            return entry;
        });
        return processed;
    }

    _getToken() {
        return request(this._indexUrl).then(function(body) {
            let matches = body.match(/var\s+ss\s*=\s*"(.*)";/);
            if (!matches || matches.length < 2) {
                throw new SyntaxError('Could not find the token');
            }
            debug('token', matches[1]);
            return matches[1];
        });
    }
}

module.exports = Poke5566;
