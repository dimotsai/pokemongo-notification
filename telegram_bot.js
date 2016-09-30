const TelegramBot = require('node-telegram-bot-api');
module.exports = class TelegramBot_ extends TelegramBot {
    constructor(config) {
        super(config.telegramBotToken, { polling: false });
    }
}
