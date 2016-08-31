const _ = require('lodash');
const qs = require('qs');
const request = require('request-promise');
const moment = require('moment');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');

class PokeRadar extends Provider {
    constructor(config) {
        super(config);
        this._deviceId = '';
        this._url = 'https://poke5566.com/pokemons';
        this._ttl = 15 * 60 * 1000;
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
    }

    init() {
        return Promise.resolve();
    }

    getPokemons() {
        const query = {
            lat0: this._config.maxLatitude,
            lng0: this._config.maxLongitude,
            lat1: this._config.minLatitude,
            lng1: this._config.minLongitude,
        };
        const queryString = '?' + qs.stringify(query);

        return request(this._url + queryString).then(this._processData.bind(this));
    }

    _processData(body) {
        let entries = JSON.parse(body).pokemons;
        let filtered = _.filter(entries, (o) => {
            if (this._filteredPokemonIds && _.sortedIndexOf(this._filteredPokemonIds, o.id) == -1) {
                return false;
            }
            return true;
        });
        let processed = filtered.map((entry_) => {
            let entry = {};
            let diff = moment(entry_.time + this._ttl).diff(moment());
            entry.latitude = entry_.lat;
            entry.longitude = entry_.lng;
            entry.pokemonId = entry_.id;
            entry.pokemonName = pokemonNames[entry_.id];
            entry.remainingTime = moment.utc(diff);
            entry.until = moment().milliseconds(diff);
            entry.direction = 'https://www.google.com/maps/dir/Current+Location/' + entry_.lat + ',' + entry_.lng;
            entry.uniqueId = `${entry_.id}-${entry_.time}`;
            return entry;
        });
        return processed;
    }
}

module.exports = PokeRadar;
