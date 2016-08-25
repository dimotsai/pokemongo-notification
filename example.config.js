module.exports = {
    /*
     * An array of pokemonId that will be filtered
     * Disable the filter if null is set
     */
    filteredPokemonIds: [148, 149],

    /*
     * PoekRadar userId
     * Receive data from all users if null is set
     */
    trustedUserId: '13661365',

    /*
     * The range of the scanner
     */
    minLatitude: 24.783617562869416,
    maxLatitude: 24.82740393838965,
    minLongitude: 120.93629837036131,
    maxLongitude: 121.0129451751709,

    /*
     * The interval of querying PokeRadar API (milliseconds)
     */
    queryInterval: 10000,

    /*
     * Telegram bot access token
     */
    telegramBotToken: null,

    /*
     * Telegram group chatId
     * This could be obtained from https://api.telegram.org/bot<YourBOTToken>/getUpdates
     */
    telegramChatId: null,

    /*
     * Telegram bot switch
     */
    telegramBotEnable: false
};
