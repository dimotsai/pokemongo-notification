const program = require('commander');
const path = require('path');

program
    .option('-c, --config [path]', 'set a config file. defaults to ./config.js', './config.js')
    .parse(process.argv);

module.exports = program;
