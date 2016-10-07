const _ = require('lodash');
const request = require('request-promise');
const moment = require('moment');
const debug = require('debug')('provider:twappx');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');

class Twappx extends Provider {
    constructor(config) {
        super(config);
        this._deviceId = '';
        this._url = 'https://tw-pogo.appx.hk';
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
    }

    init() {
        debug('init')
        return Promise.resolve();
    }

    getPokemons() {
        const options = {
            url: this._url,
            headers: {
                'Referer': 'https://tw.appx.hk/map',
                'Origin': 'https://tw.appx.hk',
            }
        };

        debug('request', 'send request with options:', options);
        return request(options).then(this._processData.bind(this));
    }

    _processData(body) {
        let entries = JSON.parse(body);
        debug('fetch', entries.length, 'pokemons left');
        let filtered = _.filter(entries, (p) => {
            if (this._filteredPokemonIds && _.sortedIndexOf(this._filteredPokemonIds, (p.i)) == -1) {
                return false;
            } else if (p.a < this._config.minLatitude
                || p.a > this._config.maxLatitude
                || p.o < this._config.minLongitude
                || p.o > this._config.maxLongitude) {
                return false;
            } else {
                return true;
            }
        });
        debug('filter', 'filter by filteredPokemonIds and lat/lng:', filtered.length, 'pokemons left');
        let processed = filtered.map((entry_) => {
            let entry = {};
            let end = entry_.t * 1000;
            let diff = moment(end).diff(moment());
            entry.latitude = entry_.a;
            entry.longitude = entry_.o;
            entry.pokemonId = entry_.i;
            entry.pokemonName = pokemonNames[entry_.i];
            entry.remainingTime = moment.utc(diff);
            entry.until = moment(end);
            entry.direction = 'https://www.google.com/maps/dir/Current+Location/' + entry_.a + ',' + entry_.o;
            entry.uniqueId = `${entry_.i}-${entry_.t}`;
            return entry;
        });
        return processed;
    }
}

module.exports = Twappx;
