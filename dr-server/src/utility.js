function asyncHandler(asyncFn, catchFn) {
	return function (...args) {
		return Promise.resolve(asyncFn(...args)).catch(err => catchFn(...args, err));
	}
}

module.exports = { asyncHandler };