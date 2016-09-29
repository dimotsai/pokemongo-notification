const Promise = require('bluebird');

class Provider {
    constructor(config) {
        this._config = config;
    }

    /**
     * initialize the provide api, such as auth or things needed to be done
     * before going to next step
     *
     * @return Promise<>
     */
    init() {}

    /**
     * get pokemons from the provider api
     *
     * @return Promise<Array<{
     *  pokemonId: number,
     *  pokemonName: {zh: string, en: string},
     *  remainingTime: Moment,
     *  until: Moment,
     *  direction: string,
     *  uniqueId: string
     * }>>
     */
    getPokemons() {}

    nextLocation(lat, lng) {}
}

module.exports = Provider;
