PokemonGo Notification
======================
[![license](https://img.shields.io/github/license/dimotsai/pokemongo-notification.svg)](https://github.com/dimotsai/pokemongo-notification/blob/master/LICENSE) [![GitHub release](https://img.shields.io/github/release/dimotsai/pokemongo-notification.svg)](https://github.com/dimotsai/pokemongo-notification/releases/latest)


A Telegram bot that can push notifications of Pokemon spawn locations to a channel (or a group).

Prerequisites
------------
- Node >= v6.4.0

Installation
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

Upgrade
-------
Simply run:
```
git pull && npm update
```

Utilities
---------
- `./print_config.js [--config <config file>]` prints out the current Pokemon filter.
- `./draw_map.js [--config <config file> --zoom <level> --size <picture size>]` draw the current scanning range on google maps.

Credits
-------
* Joseph Tsai<br/>
  Provide the idea of disabling notifications on Telegram APIs
* Kao Yu-Hao<br/>
  Provide pokemon_moves.js and the format of PokemonGo-Map API (IVs-and-Moves PR)
* [Cojad](https://github.com/Cojad)<br>
  Provide pkget's encryption/decryption algorithm (including key and iv)
