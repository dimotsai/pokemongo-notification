const _ = require('lodash');
const qs = require('qs');
const request = require('request-promise');
const moment = require('moment');
const debug = require('debug')('provider:pogomap');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');
const pokemonMoves = require('../pokemon_moves.js');

class PoGoMap extends Provider {
    constructor(config) {
        super(config);
        if (!config.poGoMapAPI) {
            throw new ReferenceError('the field `poGoMapAPI` is null or undefined');
        }
        this._url = _.trimEnd(config.poGoMapAPI, '/') + '/';
    }

    init() {
        return Promise.resolve();
    }

    getPokemons(filter = true) {
        let query = {
            pokemon: true,
            pokestops: false,
            gym: false,
            scanned: false,
            spawnpoints: false
        };
        if (!this._config.poGoMapScanGlobal) {
            _.assign(query, {
                swLat: this._config.minLatitude,
                swLng: this._config.minLongitude,
                neLat: this._config.maxLatitude,
                neLng: this._config.maxLongitude,
            });
        }
        const queryString = 'raw_data?' + qs.stringify(query);

        return request(this._url + queryString).then(body => this._processData(body, filter));
    }

    nextLocation(lat, lng) {
        let query = {
            lat: lat,
            lon: lng
        };
        return request.post(this._url + 'next_loc?' + qs.stringify(query));
    }

    getLocation() {
        return request(this._url + 'loc').then( body => JSON.parse(body) );
    }

    _processData(body, filter) {
        let pokemons = [];
        let entries = JSON.parse(body).pokemons;
        debug('fetch', entries.length, 'pokemons');
        let filtered = _.filter(entries, (o) => {
            if (filter && this._config.filteredPokemonIds && _.sortedIndexOf(this._config.filteredPokemonIds, o.pokemon_id) == -1) {
                return false;
            }
            return true;
        });
        let processed = filtered.map((entry) => {
            return {
                pokemonId: entry.pokemon_id,
                latitude: entry.latitude,
                longitude: entry.longitude,
                pokemonName: pokemonNames[entry.pokemon_id],
                remainingTime: moment.utc(moment(entry.disappear_time).diff(moment())),
                until: moment(entry.disappear_time),
                direction: 'https://www.google.com/maps/dir/Current+Location/' + entry.latitude + ',' + entry.longitude,
                uniqueId: entry.encounter_id,
                individualAttack: entry.individual_attack,
                individualDefense: entry.individual_defense,
                individualStamina: entry.individual_stamina,
                IVPerfection: Math.floor(((entry.individual_attack + entry.individual_defense + entry.individual_stamina) / 45) * 100),
                move1: pokemonMoves[entry.move_1],
                move2: pokemonMoves[entry.move_2],
            };
        });
        return processed;
    }
}

module.exports = PoGoMap;
