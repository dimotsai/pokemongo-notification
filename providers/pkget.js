const _ = require('lodash');
const qs = require('qs');
const request = require('request-promise');
const moment = require('moment');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');

class Pkget extends Provider {
    constructor(config) {
        super(config);
        this._deviceId = '';
        this._url = 'https://pkget.com/pkm111.aspx';
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
    }

    init() {
        return Promise.resolve();
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
        let entries = JSON.parse(body).pk123;
        let filtered = _.filter(entries, (o) => {
            if (this._filteredPokemonIds && _.sortedIndexOf(this._filteredPokemonIds, parseInt(o.d1)) == -1) {
                return false;
            }
            return true;
        });
        let processed = filtered.map((entry_) => {
            let entry = {};
            let end = parseInt(entry_.d3);
            let diff = moment(end).diff(moment());
            entry.latitude = entry_.d4;
            entry.longitude = entry_.d5;
            entry.pokemonId = entry_.d1;
            entry.pokemonName = pokemonNames[entry_.d1];
            entry.remainingTime = moment.utc(diff);
            entry.until = moment(end);
            entry.direction = 'https://www.google.com/maps/dir/Current+Location/' + entry_.d4+ ',' + entry_.d5;
            entry.uniqueId = `${entry_.d1}-${entry_.d3}`;
            return entry;
        });
        console.log(processed);
        return processed;
    }
}

module.exports = Pkget;
