export function asyncHandler(asyncFn, catchFn) {
	return function (...args) {
		return Promise.resolve(asyncFn(...args)).catch(catchFn);
	}
}