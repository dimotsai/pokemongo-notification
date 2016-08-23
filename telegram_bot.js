module.exports = function(config) {
    const TelegramBot = require('node-telegram-bot-api');
    const token = config.telegramBotToken;

    let bot = null;
    if (config.telegramBotToken) {
        bot = new TelegramBot(token, {polling: true});
    }
    return bot;
}
