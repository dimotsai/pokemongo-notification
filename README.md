PokemonGo Notification
======================
[![GitHub release](https://img.shields.io/github/release/dimotsai/pokemongo-notification.svg)](https://github.com/dimotsai/pokemongo-notification/releases/latest)


A Telegram bot that can push notifications of Pokemon spawn locations to a channel (or a group).

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
```
  Usage: index [options]

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -c, --config [path]  set a config file. defaults to ./config.js
```

Other utilities
---------------
- `./print_config.js [--config <config file>]` prints out the current Pokemon filter.
- `./draw_map.js [--config <config file> --zoom <level> --size <picture size>]` draw the current scanning range on google maps.
