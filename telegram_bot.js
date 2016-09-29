const TelegramBot = require('node-telegram-bot-api');
module.exports = class TelegramBot_ extends TelegramBot {
    constructor(config, options = { polling: false }) {
        super(config.telegramBotToken, options);
    }
}
