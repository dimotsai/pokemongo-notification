const _ = require('lodash');
const path = require('path');
const program = require('commander');
const qs = require('qs');
const jimp = require('jimp');
const GoogleMapsAPI = require('googlemaps');
const iconBaseUrl = 'http://cdn.rawgit.com/PokemonGoMap/PokemonGo-Map/develop/static/pixel_icons/'

module.exports = class StaticMap {
    constructor(key) {
        this.center = {lat: 0, lng: 0};
        this.zoom = 15;
        this.markers = [];
        this.size = '640x640';
        this.gmAPI = new GoogleMapsAPI({ key });
    }

    setCenter(lat, lng) {
        this.center = {lat, lng};
        return this;
    }

    addPokemons(pokemons) {
        let lastId = 0;
        let markers = [];
        let sorted = pokemons.sort((a, b) => a.pokemonId - b.pokemonId);
        for (let p of sorted) {
            if (p.pokemonId > lastId) {
                lastId = p.pokemonId;
                let marker = {};
                marker.icon = iconBaseUrl + p.pokemonId + '.png';
                marker.location = `${p.latitude},${p.longitude}`;
                markers.push(marker);
            } else {
                markers[markers.length - 1].location += '|' + `${p.latitude},${p.longitude}`;
            }
        }
        this.markers = markers;
    }

    getParams(params) {
        return _.assign({
            center: `${this.center.lat},${this.center.lng}`,
            zoom: this.zoom,
            size: this.size,
            language: 'zh-TW',
        }, params);
    }

    getUrls() {
        let markers = this.markers;
        let chunks = _.chunk(markers, 5);
        let urls = chunks.map(chunk => this.gmAPI.staticMap(this.getParams({
            markers: _.flatten(chunk),
            style: [ { rules: {visibility: 'off'} } ]
        })));
        urls.unshift(this.gmAPI.staticMap(this.getParams({
            markers: [ {size: 'tiny', location: `${this.center.lat},${this.center.lng}`} ]
        })));
        return urls;
    }

    render() {
        return Promise.all(this.getUrls().map(url => jimp.read(url)))
            .then(function(images) {
                let base = images.shift();
                for (let image of images) {
                    base.composite(image, 0, 0);
                }
                return new Promise(function(resolve, reject) {
                    base.getBuffer(jimp.MIME_PNG, function(err, buffer) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(buffer);
                        }
                    });
                });
            });
    }
}
