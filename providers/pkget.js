const _ = require('lodash');
const qs = require('qs');
const request_ = require('request-promise');
const moment = require('moment');
const debug = require('debug')('provider:pkget');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');
const pokemonMoves = require('../pokemon_moves.js');
const jar = request_.jar();
const request = request_.defaults({jar: jar});

class Pkget extends Provider {
    constructor(config) {
        super(config);
        this._deviceId = '';
        this._url = 'https://pkget.com/pkm333.ashx';
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
    }

    init() {
        // get session id and store into the cookie jar
        return request('https://pkget.com/');
    }

    getPokemons() {
        const query = {
            v1: 111,
            v2: this._config.maxLatitude,
            v3: this._config.maxLongitude,
            v4: this._config.minLatitude,
            v5: this._config.minLongitude
        };
        const queryString = '?' + qs.stringify(query);

        const options = {
            url: this._url + queryString,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://pkget.com/'
            }
        };

        return request(options).then(this._processData.bind(this));
    }

    _processData(body) {
        let entries = [];
        try {
            entries = JSON.parse(body).pk123;
        } catch (err) {
            console.error('if you are getting this error, it means that your scanning range is too large');
            throw err;
        }
        debug('fetch', entries.length, 'pokemons left');
        let filtered = _.filter(entries, (o) => {
            if (this._filteredPokemonIds && _.sortedIndexOf(this._filteredPokemonIds, parseInt(o.d1)) == -1) {
                return false;
            }
            return true;
        });
        debug('filter', 'filter by filteredPokemonIds:', filtered.length, 'pokemons left');
        let processed = filtered.map((entry_) => {
            let entry = {};
            let end = parseInt(entry_.d3);
            let diff = moment(end).diff(moment());
            let iv_move = entry_.d9.split('^').map(parseFloat);
            entry.latitude = parseFloat(entry_.d4);
            entry.longitude = parseFloat(entry_.d5);
            entry.pokemonId = parseInt(entry_.d1);
            entry.pokemonName = pokemonNames[entry_.d1];
            entry.remainingTime = moment.utc(diff);
            entry.until = moment(end);
            entry.direction = 'https://www.google.com/maps/dir/Current+Location/' + entry_.d4+ ',' + entry_.d5;
            entry.uniqueId = `${entry_.d1}-${entry_.d3}`;
            entry.individualAttack =  iv_move[0];
            entry.individualDefense = iv_move[1];
            entry.individualStamina = iv_move[2];
            entry.IVPerfection = Math.floor(((entry.individualAttack + entry.individualDefense + entry.individualStamina) / 45) * 100);
            entry.move1 = pokemonMoves[iv_move[3]];
            entry.move2 = pokemonMoves[iv_move[4]];
            return entry;
        });
        return processed;
    }
}

module.exports = Pkget;
