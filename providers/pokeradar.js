const _ = require('lodash');
const qs = require('qs');
const request = require('request-promise');
const moment = require('moment');
const errors = require('request-promise/errors');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');

class PokeRadar extends Provider {
    constructor(config) {
        super(config);
        this._deviceId = '';
        this._url = 'https://www.pokeradar.io/api/v1/submissions'
        this._trustedUserId = '13661365';
        this._ttl = 15 * 60;
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
    }

    init() {
        return request
            .post('https://www.pokeradar.io/api/v1/users')
            .then(function(body) {
                const deviceId = JSON.parse(body).data.deviceId;
                this._deviceId = deviceId;
                return deviceId;
            }.bind(this));
    }

    getPokemons() {
        const query = {
            deviceId: this._deviceId,
            minLatitude: this._config.minLatitude,
            maxLatitude: this._config.maxLatitude,
            minLongitude: this._config.minLongitude,
            maxLongitude: this._config.maxLongitude,
            pokemonId: 0
        };
        const queryString = '?' + qs.stringify(query);

        return request(this._url + queryString).then(this._processData.bind(this));
    }

    _processData(body) {
        let pokemons = [];
        let entries = JSON.parse(body).data;
        let filtered = _.filter(entries, (o) => {
            if (this._config.trustedUserId && o.userId != this._config.trustedUserId) {
                return false;
            }
            if (this._filteredPokemonIds && _.sortedIndexOf(this._filteredPokemonIds, o.pokemonId) == -1) {
                return false;
            }
            return true;
        });
        let processed = filtered.map((entry_) => {
            let entry = _.cloneDeep(entry_);
            let secs = entry.created + this._ttl - moment().unix();
            entry.pokemonName = pokemonNames[entry.pokemonId];
            entry.remainingTime = moment.utc(0).seconds(secs);
            entry.until = moment().seconds(secs);
            entry.direction = 'https://www.google.com/maps/dir/Current+Location/' + entry.latitude + ',' + entry.longitude;
            entry.uniqueId = `${entry.pokemonId}-${entry.created}`;
            return entry;
        });
        return processed;
    }
}

module.exports = PokeRadar;
