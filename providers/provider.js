const Promise = require('bluebird');

class Provider {
    constructor(config) {
        this._config = config;
    }

    init() {}

    /**
     * @return Promise
     */
    getPokemons(minLatitude, minLongitude, maxLatitude, maxLongitude) {}
}

module.exports = Provider;
