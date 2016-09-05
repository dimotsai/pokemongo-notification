#!/usr/bin/env node
const _ = require('lodash');
const path = require('path');
const program = require('commander');
const staticMapAPI = 'http://maps.google.com/maps/api/staticmap';
const getQueryString = (obj) => '?' + Object.keys(obj).map((k) => k + '=' + obj[k]).join('&');

program
    .version('0.0.1')
    .option('-c, --config [path]', 'set a config file. defaults to ./config.js', './config.js')
    .option('-z, --zoom [level]', 'set the google map zoom level. defaults to 12', 12)
    .option('-s, --size [WxH]', 'set the picture size. defaults to 800x600', '800x600')
    .parse(process.argv);

const config = _.assign({
    minLatitude: 24.783617562869416,
    maxLatitude: 24.82740393838965,
    minLongitude: 120.93629837036131,
    maxLongitude: 121.0129451751709,
}, require(path.resolve(program.config)));

if(config.centerLatitude && config.centerLongitude && config.nearbyDistance) {
    config.minLatitude = config.centerLatitude - config.nearbyDistance/110.574;
    config.maxLatitude = config.centerLatitude + config.nearbyDistance/110.574;
    config.minLongitude = config.centerLongitude - config.nearbyDistance/(111.32 * Math.cos(config.centerLatitude));
    config.maxLongitude = config.centerLongitude + config.nearbyDistance/(111.32 * Math.cos(config.centerLatitude));
};


const getPathString = function(weight, ...points) {
    let path = 'weight:'+weight;
    for (let p of points) {
        path += '|' + p[0] + ',' + p[1];
    }
    return path;
};

const getRectPathString = function(weight, north, east, south, west) {
    return getPathString(weight, [north, west], [north, east], [south, east], [south, west], [north, west]);
};

const getCenterString = function(minLat, maxLat, minLng, maxLng) {
    return (minLat + maxLat)/2 + ',' + (minLng + maxLng)/2;
};

let params = {
    center: getCenterString(config.minLatitude, config.maxLatitude, config.minLongitude, config.maxLongitude),
    size: program.size,
    zoom: program.zoom,
    path: getRectPathString(5, config.maxLatitude, config.maxLongitude, config.minLatitude, config.minLongitude)
}

console.log(staticMapAPI + getQueryString(params));
