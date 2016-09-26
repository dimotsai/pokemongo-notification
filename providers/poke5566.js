const _ = require('lodash');
const qs = require('qs');
const request = require('request-promise');
const moment = require('moment');
const debug = require('debug')('provider:poke5566');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');
const pokemonMoves = require('../pokemon_moves.js');

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
            lat0: this._config.maxLatitude,
            lng0: this._config.maxLongitude,
            lat1: this._config.minLatitude,
            lng1: this._config.minLongitude,
            devc: 'mobile',
            zoom: 14,
            star: 1
        };
        const queryString = '?' + qs.stringify(query);
        const options = {
            url: this._url + queryString,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://poke5566.com/',
                'Cookie': `ss=poke5566; iv=0; star=1; _ga=GA1.2.645874393.${moment().unix()};`,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
            }
        };

        return request(options).then(this._processData.bind(this));
    }

    _processData(body) {
        let entries = JSON.parse(body).pokemons;
        debug('fetch', entries.length, 'pokemons left');
        let filtered = _.filter(entries, (o) => {
            if (this._filteredPokemonIds && _.sortedIndexOf(this._filteredPokemonIds, o.i) == -1) {
                return false;
            }
            return true;
        });
        debug('filter', 'filter by filteredPokemonIds:', filtered.length, 'pokemons left');
        let processed = filtered.map((entry_) => {
            let entry = {};
            let diff = moment(entry_.t).diff(moment());
            let iv = entry_.v;
            let move = entry_.m;
            entry.latitude = entry_.a;
            entry.longitude = entry_.n;
            entry.pokemonId = entry_.i;
            entry.pokemonName = pokemonNames[entry_.i];
            entry.remainingTime = moment.utc(diff);
            entry.until = moment(entry_.t);
            entry.direction = 'https://www.google.com/maps/dir/Current+Location/' + entry_.a + ',' + entry_.n;
            entry.uniqueId = `${entry_.i}-${entry_.t}`;
            entry.individualAttack =  iv[0];
            entry.individualDefense = iv[1];
            entry.individualStamina = iv[2];
            entry.IVPerfection = Math.floor(((entry.individualAttack + entry.individualDefense + entry.individualStamina) / 45) * 100);
            entry.move1 = pokemonMoves[move[0]];
            entry.move2 = pokemonMoves[move[1]];
            return entry;
        });
        return processed;
    }
}

module.exports = Poke5566;
