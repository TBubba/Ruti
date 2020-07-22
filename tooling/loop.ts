/**
 * Iterates over all combinations of values from an array.
 * 
 * __Example:__
 * Input: `[1, 2]`
 * Callback: `[1]`, `[2]`, `[1, 1]`, `[1, 2]`, `[2, 1]`, `[2, 2]`
 * @param array Array to iterate over.
 * @param start Lowest number of elements in "args" (inclusive).
 * @param end Highest number of elements in "args" (exclusive).
 * @param callback Called once per iteration. The "args" array is re-used.
 */
export function forEachCombo<T>(
  array: T[] | readonly T[],
  start: number,
  end: number,
  callback: (args: T[]) => void
): void {
  if (end > array.length) { throw new Error(`"end" must not be higher than the length of "array" (end: ${end}, array.length: ${array.length})`); }
  if (array.length === 0) { return; }

  const indices: number[] = [];
  const args: T[] = [];

  for (let len = start; len < end; len++) {
    if (len === 0) {
      callback(args);
      continue;
    }

    // initialize
    for (let i = 0; i < len; i++) {
      indices[i] = 0;
      args[i] = array[0];
    }

    while (true) {
      callback(args);

      if (indices[len - 1] + 1 < array.length) { // increment
        indices[len - 1] += 1;
        args[len - 1] = array[indices[len - 1]];
      }
      else { // carry
        let index = -1;

        for (let i = len - 2; i >= 0; i--) {
          if (indices[i] < len) {
            index = i;
            break;
          }
        }

        if (index >= 0) {
          indices[index] += 1;
          args[index] = array[indices[index]];

          for (let i = index + 1; i < len; i++) {
            indices[i] = 0;
            args[i] = array[0];
          }
        } else { break; }
      }
    }
  }
}

/**
 * Iterates over all unique combinations of values from an array.
 * 
 * __Example:__
 * Input: `[0, 1, 2]`
 * Callback: `[0]`, `[1]`, `[2]`, `[0, 1]`, `[0, 2]`, `[1, 2]`, `[0, 1, 2]`
 * @param array Array to iterate over.
 * @param start Lowest number of elements in "args" (inclusive).
 * @param end Highest number of elements in "args" (exclusive).
 * @param callback Called once per iteration. The "args" array is re-used.
 */
export function forEachUniqueCombo<T>(
  array: T[] | readonly T[],
  start: number,
  end: number,
  callback: (indices: T[]) => void
): void {
  if (start < 0) { throw new Error(`"start" must not be less than 0 (start: ${start})`); }
  if (end > array.length) { throw new Error(`"end" must not be higher than the length of "array" (end: ${end}, array.length: ${array.length})`); }

  const indices: number[] = [];
  const args: T[] = [];

  for (let len = start; len < end; len++) {
    if (len === 0) {
      callback(args);
      continue;
    }

    // initialize
    for (let i = 0; i < len; i++) {
      indices[i] = i;
      args[i] = array[i];
    }

    while (true) {
      callback(args);

      if (indices[len - 1] + 1 < array.length) { // increment
        indices[len - 1] += 1;
        args[len - 1] = array[indices[len - 1]];
      }
      else { // carry
        let index = -1;

        for (let i = len - 2; i >= 0; i--) {
          if (indices[i] < array.length - (len - i)) {
            index = i;
            break;
          }
        }

        if (index >= 0) {
          indices[index] += 1;
          args[index] = array[indices[index]];

          for (let i = index + 1; i < len; i++) {
            indices[i] = indices[index] + i - index;
            args[i] = array[indices[i]];
          }
        } else { break; }
      }
    }
  }
}
