const _ = require('lodash');
const request = require('request-promise');
const moment = require('moment');
const crypto = require('crypto');
const qs = require('qs');
const uuid = require('uuid');
const debug = require('debug')('provider:dorahunter');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');

module.exports = class DoraHunter extends Provider {
    constructor(config) {
        super(config);
        this._deviceId = uuid.v4();
        this._url = 'http://go.poedb.tw/pmgo/raw.php';
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
        this._iv = Buffer.from([77, 90, 80, 0, 2, 0, 122, 9, 4, 0, 15, 127, 95, 47, 3, 6]);
        this._key = Buffer.from([82, 97, 114, 33, 26, 7, 0, 63, 32, 115, 2, 31, 13, 122, 119, 68, 51, 0, 2, 0, 121, 108, 116, 32, 2, 63, 0, 23, 97, 0, 0, 62]);
        this._algorithm = 'AES-256-CBC';
    }

    init() {
        debug('init')
        return Promise.resolve();
    }

    getPokemons() {
        const data = {
            devicdeID: this._devicdeId,
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
            devicdeID: this._devicdeId,
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
