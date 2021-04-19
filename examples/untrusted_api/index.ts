import { is_type } from '../../src';
import * as api from './api';
import { math_result_template } from './api_templates';

// In this example we will use is_type to check if the functions from a third party api
// actually returns the types its type declarations says it should.

// Assume that api.ts is a third party API that you suspect has incorrect type declarations.

// Before we begin we need to create a templates for the return types of the api's functions.
// In this example there is only one type returned by the api, see api_templates.ts.
// (For more information about templates, see ruti's README)



// Basic usage:
// Here we use is_type just to see if the returned value from the api is correctly typed.
// If is_type returns true then the value is correctly typed, otherwise it is incorrect in some way.
// For this example addNumber has a bug that makes it set result.text to undefined if the sum is 0.

console.log('--- basic usage ---');

{
  const first_sum = api.addNumbers(2, 2); // The sum is 4, so first_sum.text will be a string

  console.log('first_sum:', first_sum);

  if (is_type(math_result_template, first_sum)) { // true
    console.log('first_sum is correctly typed!');
  } else {
    console.log('first_sum is incorrectly typed!');
  }

  const second_sum = api.addNumbers(0, 0); // Uh oh! The sum is 0, so second_sum.text will be undefined!

  console.log('second_sum:', second_sum);

  if (is_type(math_result_template, second_sum)) { // false (because second_sum.text is undefined when it is supposed to be a string)
    console.log('second_sum is correctly typed!');
  } else {
    console.log('second_sum is incorrectly typed!');
  }
}



// on_fail callback:
// The 4th argument of is_type is a callback that is called if the value does not conform to the template.
// It has one argument which is a string containing the reason for why the value failed the type check.

console.log('\n--- on_fail callback ---');

{
  const sum = api.addNumbers(0, 0); // Uh oh! The sum is 0, so sum.text will be undefined!

  console.log('sum:', sum);

  let reason: string | undefined;
  if (!is_type(math_result_template, sum, undefined, r => { reason = r; })) {
    console.log('sum is incorrectly typed!');
    console.log('Reason:', reason);
  }
}



// ignore_extra:
// The 3rd argument of is_type is an options object. At the moment it has only one option which is ignore_extra.
// By default is_type will return false if the value is an object and has a property that is not declared in the template.
// But when ignore_extra is set to true, it will instead ignore these properties.

console.log('\n--- ignore_extra ---');

{
  // Oh no! subtractNumbers is bugged and adds an additional property to the result!
  const dif = api.subtractNumbers(5, 3);

  console.log('dif:', dif);

  if (is_type(math_result_template, dif)) { // false (because dif.debug is set but is not declared in the template!)
    console.log('dif is correctly typed!');
  } else {
    console.log('dif is incorrectly typed!');
  }

  if (is_type(math_result_template, dif, { ignore_extra: true })) { // true
    console.log('dif is correctly typed (when "ignore_extra" is enabled)!');
  } else {
    console.log('dif is incorrectly typed (when "ignore_extra" is enabled)!');
  }
}
