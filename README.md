PokeRadar Notification
======================
A Telegram bot that can push notifications about Pokemon spawn locations to a channel (or a group).

Requirements
------------
- Node >= v6.4.0

Steps
-----

1. `npm install`
2. Copy `example.config.js` to `config.js`
3. Edit your `config.js`
4. Run `./index.js`

For other command line options, see `./index.js -h`

Other utilities
---------------
- `./print_config.js [--config <config file>]` prints out the current Pokemon filter.
- `./draw_map.js` [--config <config file> --zoom <level> --size <picture size>]` draw the current scanning range on google maps.
