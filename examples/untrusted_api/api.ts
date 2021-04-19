// Imagine that this file is a random package from npm (that has incorrect type declarations)

type MathResult = {
  value: number;
  text: string;
}

export function addNumbers(a: number, b: number): MathResult {
  const value = a + b;
  const text = (value === 0) ? undefined as any : value.toString(); // <- Someone messed up and set text to the wrong type!
  return { value, text };
}

export function subtractNumbers(a: number, b: number): MathResult {
  const value = a - b;
  const text = value.toString();
  return { value, text, debug: '*<|:)' } as any; // <- Some doofus added an additional property!
}
