// Imagine that this file is a random package from npm (that has incorrect type declarations)

type MathResult = {
  value: number;
  text: string;
}

export function addNumbers(a: number, b: number): MathResult {
  const value = a + b;
  const text = (value === 0)
    ? undefined as any // <- Someone messed up and set text to the wrong type!
    : value.toString();

  return { value, text };
}

export function subtractNumbers(a: number, b: number): MathResult {
  const value = a - b;
  const text = value.toString();

  return { value, text, debug: '*<|:)' } as any; // <- Some doofus added an additional property!
}

type ComplexOperationResult = {
  points: {
    x: number;
    y: number;
    meta: {
      favorite_colors: {
        color_name: string;
        hex_value: number;
      }[];
    };
  }[];
}

export function complexOperation(success: boolean): ComplexOperationResult {
  return {
    points: [
      {
        x: 0,
        y: 0,
        meta: {
          favorite_colors: [
            {
              color_name: 'red',
              hex_value: 0xff0000,
            },
          ],
        },
      },
      {
        x: 1337,
        y: 1337,
        meta: {
          favorite_colors: [
            {
              color_name: 'green',
              hex_value: success
                ? 0x00ff00
                : '0x00ff00' as any, // <- Some conehead doesn't know the difference between a string and a number
            },
          ],
        },
      },
    ],
  };
}
