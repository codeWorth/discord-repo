const crypto = require('crypto');
const murmur = require('murmurhash3js');

function asyncHandler(asyncFn, catchFn) {
	return function (...args) {
		return Promise.resolve(asyncFn(...args)).catch(err => catchFn(err, ...args));
	}
}

function hash128(str) {
	return murmur.x64.hash128(str);
}

module.exports = { asyncHandler, hash128 };