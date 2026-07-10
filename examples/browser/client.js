/** @type {typeof import('../../src/ruti.ts')} */
const ruti = await import('/ruti.js'); // @TODO Make this not show up as an error somehow?

// Make ruti available in the console for accessibility.
window.ruti = ruti;
console.log(`The whole ruti module is available at "window.ruti"`);

const template = ruti.create_template({ foo: 'string' });

if (ruti.is_type(template, { foo: '123' })) {
  console.log('is_type seems to work?');
}
