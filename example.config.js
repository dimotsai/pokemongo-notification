module.exports = {
    /*
     * An array of pokemonId that will be filtered
     * Disable the filter if null is set
     */
    filteredPokemonIds: [148, 149],

    /*
     * The range of the scanner
     */
    minLatitude: 24.783617562869416,
    maxLatitude: 24.82740393838965,
    minLongitude: 120.93629837036131,
    maxLongitude: 121.0129451751709,
    
    
    /*
     * If you want to find the nearby pokemons in X kms, you can enable the following options and just only assign the latitude and longitdue value for center point.
     * It will override the min/max Lat and Long assign above.
     * http://stackoverflow.com/questions/1253499/simple-calculations-for-working-with-lat-lon-km-distance
     */	
    centerLatitude: null,
    centerLongitude: null,
    nearbyDistance: null, 	

    /*
     * The interval of querying PokeRadar API (milliseconds)
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
     * Telegram bot switch
     */
    telegramBotEnable: false,

    /*
     * Pokemon Data Source
     */
    source: 'pokeradar',

    /*
     * PokemonGo-Map API
     * this url will be applied when the source is pogomap
     */
    poGoMapAPI:'http://localhost:5000/raw_data'
};
