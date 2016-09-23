const _ = require('lodash');
const qs = require('qs');
const request = require('request-promise');
const moment = require('moment');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');
const pokemonMoves = require('../pokemon_moves.js');

class PoGoMap extends Provider {
    constructor(config) {
        super(config);
        if (!config.poGoMapAPI) {
            throw new ReferenceError('the field `poGoMapAPI` is null or undefined');
        }
        this._url = config.poGoMapAPI;
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;

    }

    init() {
        return Promise.resolve();
    }

    getPokemons() {
        const query = {
            swLat: this._config.minLatitude,
            swLng: this._config.minLongitude,
            neLat: this._config.maxLatitude,
            neLng: this._config.maxLongitude,
            pokemon: true,
            pokestops: false,
            gym: false,
            scanned: false,
            spawnpoints: false
        };
        const queryString = '?' + qs.stringify(query);

        return request(this._url + queryString).then(this._processData.bind(this));
    }

    _processData(body) {
        let pokemons = [];
        let entries = JSON.parse(body).pokemons;
        let filtered = _.filter(entries, (o) => {
            if (this._filteredPokemonIds && _.sortedIndexOf(this._filteredPokemonIds, o.pokemon_id) == -1) {
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
				individual_attack: entry.individual_attack,
				individual_defense: entry.individual_defense,
				individual_stamina: entry.individual_stamina,
				pokemonIv: Math.floor(((entry.individual_attack + entry.individual_defense + entry.individual_stamina) /45) *100),
				move1: pokemonMoves[entry.move_1],
				move2: pokemonMoves[entry.move_2],
            };
        });
        return processed;
    }
}

module.exports = PoGoMap;
