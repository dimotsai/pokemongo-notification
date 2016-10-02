const Promise = require('bluebird');
const retry_ = require('bluebird-retry');
const _ = require('lodash');
const debug = require('debug')('retry');

let defaults = {
    retry_options: {},
    func_options: {
        timeout: 1000,
        backoff: 1
    }
}

function retry(func, retry_options_, func_options_) {
    let retry_options = _.assign(defaults.retry_options, retry_options_)
    let func_options = _.assign(defaults.func_options, func_options_);
    let timeout = func_options.timeout;
    let count = 1;

    return retry_(function() {
        if (timeout > 0) {
            debug(func.name, 'times:', count++, 'timeout:', timeout);
            let timeout_ = timeout;
            timeout *= func_options.backoff;
            return func().timeout(timeout_);
        } else {
            return func();
        }
    }, retry_options);
}

retry.setDefaults = function(retry_options = {}, func_options = {}) {
    defaults.retry_options = _.assign(defaults.retry_options, retry_options);
    defaults.func_options = _.assign(defaults.func_options, func_options);
};

module.exports = retry;
