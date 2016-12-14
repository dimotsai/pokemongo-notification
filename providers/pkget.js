const _ = require('lodash');
const request_ = require('request-promise');
const moment = require('moment');
const debug = require('debug')('provider:pkget');
const Provider = require('./provider.js');
const pokemonNames = require('../pokemon_names.js');
const pokemonMoves = require('../pokemon_moves.js');
const jar = request_.jar();
const request = request_.defaults({jar: jar});
const crypto = require('crypto');
const qs = require('qs');

class Pkget extends Provider {
    constructor(config) {
        super(config);
        this._deviceId = '';
        this._url = 'https://pkget.com/fp.ashx';
        this._filteredPokemonIds = config.filteredPokemonIds ? config.filteredPokemonIds.sort((a,b) => a-b) : null;
        this._key = 'XYzrs0zrsrsAXYzrs0zrsrsA';
        this._iv = 'jkSTU012S0STUAB0';
        this._algorithm = 'AES-192-CBC';
    }

    init() {
        // get session id and store into the cookie jar
        this._time = Date.now();
        return request('https://pkget.com/');
    }

    getPokemons() {
        const diffTime = Math.floor((Date.now() - this._time)/1000);
        const token1 = this._encrypt(`${this._config.maxLatitude}^${moment().format('YYYY-MM-DD HH:mm:ss')}`, this._key, this._iv);
        const token2 = this._encrypt(`${this._config.minLongitude}^${diffTime}`, this._key, this._iv);
        const query = {
            a: this._config.maxLatitude,
            b: this._config.maxLongitude,
            c: this._config.minLatitude,
            d: this._config.minLongitude,
            e: 0,
            f: token1, // token1
            g: token2, // token2
            h: "",
            j: 765
        };

        const queryString = qs.stringify(query);

        console.log(queryString);

        const options = {
            url: this._url + '?' + queryString,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://pkget.com/'
            },
            gzip: true
        };

        return request(options).then(this._processData.bind(this));
    }

    _processData(body) {
        let entries = [];
        try {
            entries = JSON.parse(body).fp;
        } catch (err) {
            console.error('if you are getting this error, it means that your scanning range is too large');
            throw err;
        }
        debug('fetch', entries.length, 'pokemons left');
        let filtered = _.filter(entries, (o) => {
            if (this._filteredPokemonIds && _.sortedIndexOf(this._filteredPokemonIds, this._decodeId(o.a)) == -1) {
                return false;
            }
            return true;
        });
        debug('filter', 'filter by filteredPokemonIds:', filtered.length, 'pokemons left');
        let processed = filtered.map((entry_) => {
            let entry = {};
            let id = this._decodeId(entry_.a);
            let end = parseInt(entry_.b, 10) - 1000 * parseInt(entry_.a, 10);
            let diff = moment(end).diff(moment());
            let iv_move = entry_.f.split('^').map(parseFloat);
            entry.latitude = parseFloat(entry_.c);
            entry.longitude = parseFloat(entry_.d);
            entry.pokemonId = id;
            entry.pokemonName = pokemonNames[id];
            entry.remainingTime = moment.utc(diff);
            entry.until = moment(end);
            entry.direction = 'https://www.google.com/maps/dir/Current+Location/' + entry_.c + ',' + entry_.d;
            entry.uniqueId = `${id}-${end}`;
            entry.individualAttack =  iv_move[0];
            entry.individualDefense = iv_move[1];
            entry.individualStamina = iv_move[2];
            entry.IVPerfection = Math.floor(((entry.individualAttack + entry.individualDefense + entry.individualStamina) / 45) * 100);
            entry.move1 = pokemonMoves[iv_move[3]];
            entry.move2 = pokemonMoves[iv_move[4]];
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

    _encrypt(text, key, iv) {
        let buffer = this._pad(new Buffer(text));
        let cipher = crypto.createCipheriv(this._algorithm, key, iv)
        cipher.setAutoPadding(false);
        let crypted = cipher.update(buffer, 'binary', 'base64');
        crypted += cipher.final('base64');
        return crypted;
    }

    _decrypt(data, key, iv) {
        let decipher = crypto.createDecipheriv(this._algorithm, key, iv)
        decipher.setAutoPadding(false);
        let dec = decipher.update(data);
        dec = Buffer.concat([dec, decipher.final()]);
        return dec;
    }

    _decodeId(id) {
        return parseInt(id, 10) / 17 - 1945;
    }
}

module.exports = Pkget;
