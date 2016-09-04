const _ = require('lodash');
const qs = require('qs');
const request = require('request-promise');
const moment = require('moment');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');

class Poke5566 extends Provider {
    constructor(config) {
        super(config);
        this._deviceId = '';
        this._url = 'https://poke5566.com/pokemons';
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
    }

    init() {
        return Promise.resolve();
    }

    getPokemons() {
        const query = {
            latBL: this._config.maxLatitude,
            lngBL: this._config.maxLongitude,
            latTR: this._config.minLatitude,
            lngTR: this._config.minLongitude,
        };
        const queryString = '?' + qs.stringify(query);
        const options = {
            url: this._url + queryString,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://poke5566.com/',
                'Cookie': '_ga=GA1.2.144174314.1472498477;',
                'User-Agent': 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_1_2 like Mac OS X; en-us) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile/7D11 Safari/528.16'
            }
        };

        return request(options).then(this._processData.bind(this));
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
}

module.exports = Poke5566;
