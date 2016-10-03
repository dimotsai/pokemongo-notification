const _ = require('lodash');
const moment = require('moment');
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
            } else if (body.status != 'OK') {
                reject(body.error_message);
            } else {
                let components = [];
                let formatted_address = '';
                if (body && body.results && body.results.length > 0) {
                    let head = body.results.shift();
                    components = _.filter(head.address_components, (c) => {
                        for (let type of c.types) {
                            if (type.match(/^administrative_area_level/)) {
                                return true;
                            }
                        }
                        return false;
                    }).map((c) => c.long_name.replace(/\s/g, '\\_'));
                    formatted_address = head.formatted_address;
                }
                resolve({components, formatted_address});
            }
        });
    })
    .catch(function(err) {
        console.error(moment().format(), 'reverse geocode error:', err);
        return {components: [], formatted_address: ''};
    });
}

