/**
 * Type representing a successful operation result
 * @template T - The type of the successful data
 */
type Success<T> = {
	data: T;
	error: null;
};

/**
 * Type representing a failed operation result
 * @template E - The type of the error
 */
type Failure<E> = {
	data: null;
	error: E;
};

/**
 * Union type representing either a successful or failed operation
 * @template T - The type of the successful data
 * @template E - The type of the error (defaults to Error)
 */
type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Wraps a Promise in a try-catch block and returns a Result type
 * @template T - The type of the successful data
 * @template E - The type of the error (defaults to Error)
 * @param {Promise<T>} promise - The promise to wrap
 * @returns {Promise<Result<T, E>>} A promise that resolves to either a Success or Failure result
 * @example
 * const result = await tryCatch(someAsyncOperation());
 * if (result.error) {
 *   // Handle error
 * } else {
 *   // Use result.data
 * }
 */
export async function tryCatch<T, E = Error>(
	promise: Promise<T>,
): Promise<Result<T, E>> {
	try {
		const data = await promise;
		return { data, error: null };
	} catch (error) {
		return { data: null, error: error as E };
	}
}
