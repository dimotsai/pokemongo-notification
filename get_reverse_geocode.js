const _ = require('lodash');
const GoogleMapsAPI = require('googlemaps');

const gmAPI = new GoogleMapsAPI();

module.exports = function(latitude, longitude, language = 'zh-TW') {
    return new Promise(function(resolve, reject) {
        gmAPI.reverseGeocode({
            latlng: `${latitude},${longitude}`,
            language: language
        }, function(err, body) {
            if (err) {
                reject(err);
            }
            let components = body.results.length > 0 ? body.results[0].address_components : [];
            components = _.filter(components, (o) => {
                for (let type of o.types) {
                    if (/*type.match(/^route$/) || */type.match(/^administrative_area_level/)) {
                        return true;
                    }
                }
                return false;
            }).map((o) => o.long_name);
            resolve(components);
        });
    });
}

