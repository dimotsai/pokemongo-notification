const _ = require('lodash');
const request = require('request-promise');
const moment = require('moment');
const crypto = require('crypto');
const qs = require('qs');
const uuid = require('uuid');
const debug = require('debug')('provider:dorahunter');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');
const pokemonMoves = require('../pokemon_moves.js');

module.exports = class DoraHunter extends Provider {
    constructor(config) {
        super(config);
        this._deviceId = '68042f1c-5ad6-4df7-81cb-dadfcbde5b19';
        this._url = 'http://go.poedb.tw/pmgo/rawc.php';
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
        this._iv = Buffer.from([101, 103, 126, 79, 53, 71, 29, 124, 32, 49, 118, 78, 37, 47, 54, 108]);
        this._key = Buffer.from([83, 89, 69, 59, 11, 57, 61, 38, 23, 111, 37, 45, 108, 114, 9, 83, 127, 93, 83, 74, 112, 101, 56, 36, 47, 125, 108, 101, 31, 22, 120, 100]);
        this._algorithm = 'AES-256-CBC';
    }

    init() {
        debug('init')
        return Promise.resolve();
    }

    getPokemons() {
        const data = {
            deviceID: this._deviceId,
            ids: this._filteredPokemonIds || [],
            max: 0,
            neLat: this._config.maxLatitude,
            neLng: this._config.maxLongitude,
            timestamp: Date.now(),
            rarity: 1,
            source: 'DoraHunterAndroid',
            swLat: this._config.minLatitude,
            swLng: this._config.minLongitude,
            zoom: 16.0,
        };
        const query = {
            deviceID: this._deviceId,
            data: this._encrypt(JSON.stringify(data), this._key, this._iv)
        };
        const queryString = '?' + qs.stringify(query);

        const options = {
            url: this._url + queryString,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
            }
        };

        return request(options).then(this._processData.bind(this));
    }

    _processData(body) {
        let entries = [];
        entries = JSON.parse(body).pokemons;
        debug('fetch', entries.length, 'pokemons left');
        let filtered = _.filter(entries, (o) => {
            if (this._filteredPokemonIds && _.sortedIndexOf(this._filteredPokemonIds, parseInt(o.i)) == -1) {
                return false;
            }
            return true;
        });
        debug('filter', 'filter by filteredPokemonIds:', filtered.length, 'pokemons left');
        let processed = filtered.map((entry_) => {
            let entry = {};
            let end = entry_.t * 1000;
            let diff = moment(end).diff(moment());
            let iv = _.isArray(entry_.iv) ? entry_.iv.map(parseFloat) : [];
            let move = _.isArray(entry_.m) ? entry_.m.map(parseFloat) : [];
            entry.latitude = parseFloat(entry_.a);
            entry.longitude = parseFloat(entry_.o);
            entry.pokemonId = parseInt(entry_.i);
            entry.pokemonName = pokemonNames[entry_.i];
            entry.remainingTime = moment.utc(diff);
            entry.until = moment(end);
            entry.direction = 'https://www.google.com/maps/dir/Current+Location/' + entry_.a + ',' + entry_.o;
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

    _pad(buffer) {
        let len = 16 - buffer.byteLength % 16;
        if (len === 0) {
            return buffer;
        }
        let padding = Buffer.alloc(len);
        padding.fill(0);
        return Buffer.concat([buffer, padding]);
    }

    _encrypt(text, key, iv){
        let buffer = this._pad(new Buffer(text));
        let cipher = crypto.createCipheriv(this._algorithm, key, iv)
        cipher.setAutoPadding(false);
        let crypted = cipher.update(buffer, 'binary', 'base64');
        crypted += cipher.final('base64');
        return crypted;
    }

    _decrypt(data, key, iv){
        let decipher = crypto.createDecipheriv(this._algorithm, key, iv)
        decipher.setAutoPadding(false);
        let dec = decipher.update(data, 'base64', 'binary');
        dec += decipher.final('binary');
        dec = dec.slice(0, dec.indexOf('\0'));
        return dec.toString('utf8');
    }
}
