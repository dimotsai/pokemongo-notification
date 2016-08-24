const config = require('./config.js');
const pokemonNames = require('./pokemon_names.js');
const _ = require('lodash');

const filteredPokemonIds = config.filteredPokemonIds.sort((a, b) => a - b);

pokemonNames.forEach(function(v, k) {
    if(_.sortedIndexOf(filteredPokemonIds, k) != -1) {
        console.log(`[v]#${k} ${v.zh} ${v.en}`);
    } else {
        console.log(`[ ]#${k} ${v.zh} ${v.en}`);
    }
})
