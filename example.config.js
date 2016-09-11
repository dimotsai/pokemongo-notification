module.exports = {
    /*
     * An array of pokemonId that will be filtered
     * Disable the filter if null is set
     */
    filteredPokemonIds: [130, 131, 134, 135, 136, 142, 143, 149],

    /*
     * An array of address keywords
     * The notification will be sent, if one of those keywords matches its address
     * disable the filter if null is set
     */
    filteredAddressKeywords: ['新竹市', '新竹縣'],

    /*
     * The range that you want to monitor
     *   swLat -> minLatitude
     *   neLat -> maxLatitude
     *   swLng -> minLongitude
     *   neLng -> maxLongitude
     *
     *   Tool: https://dimotsai.github.io/map-selector/
     */
    minLatitude: 24.714712,
    maxLatitude: 24.860896,
    minLongitude: 120.874672,
    maxLongitude: 121.080666,

    /*
     * If you want to find the nearby pokemons in X kms, you can enable the following options and just only assign the latitude and longitdue value for center point.
     * It will override the min/max Lat and Long assign above.
     * http://stackoverflow.com/questions/1253499/simple-calculations-for-working-with-lat-lon-km-distance
     */
    centerLatitude: null,
    centerLongitude: null,
    nearbyDistance: null,

    /*
     * The interval of querying an API (milliseconds)
     */
    queryInterval: 10000,

    /*
     * Telegram bot access token
     * Contact @BotFather to create a new telegram bot
     */
    telegramBotToken: null,

    /*
     * Telegram group chatId
     * This could be obtained from https://api.telegram.org/bot<YourBOTToken>/getUpdates
     * e.g. '@channelname' or -12345678
     */
    telegramChatId: null,

    /*
     * Enabling Telegram bot
     */
    telegramBotEnable: false,

    /*
     * Pokemon Data Source
     * It supports: pokeradar, goradar(not working), pkget, poke5566, pogomap
     */
    source: 'pokeradar',

    /*
     * PokemonGo-Map API
     * This url will be applied when the source is pogomap.
     */
    poGoMapAPI:'http://localhost:5000/raw_data'
};
