const crypto = require('crypto');

function asyncHandler(asyncFn, catchFn) {
	return function (...args) {
		return Promise.resolve(asyncFn(...args)).catch(err => catchFn(err, ...args));
	}
}


module.exports = { asyncHandler };