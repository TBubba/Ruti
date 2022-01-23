import { create_template, FromTTypeArg, is_type } from '../../src';
import * as api from './api';

/*
 * In this example we will use is_type to check if the return values of some third party
 * functions actually are of the correct data types.
 * 
 * Assume that api.ts is a third party API and that you don't trust their documentation or
 * type declarations (which you probably shouldn't).
 */



/*
 * Before we begin type checking we need to create some ruti templates, one for each type
 * you want to type check. Luckily for us the example API only has a single type (how nice).
 * (For more information about templates, see ruti's README)
 */

const math_result_arg = {
  value: 'number',
  text: 'string',
} as const;
const math_result_template = create_template(math_result_arg);
type MathResultData = FromTTypeArg<typeof math_result_arg>

const complicated_arg = {
  points: [[{
    x: 'number',
    y: 'number',
    meta: {
      favorite_colors: [[{
        color_name: 'string',
        hex_value: 'number',
      }]],
    },
  }]],
} as const;
const compliated_template = create_template(complicated_arg);
type ComplicatedData = FromTTypeArg<typeof complicated_arg>



/*
 * Basic usage:
 * 
 * Here we use is_type to type check the return value from one of the API functions.
 * If is_type returns true then the value is of the correct type. Otherwise it is incorrect in some way.
 * 
 * I made it so addNumber returns data of the correct types AS LONG AS the sum of the arguments is not 0.
 * When it's 0, addNumber will set result.text to undefined (instead of a string).
 */

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



/*
 * on_fail callback:
 * 
 * is_type accepts a callback (called on_fail) which gets called when a value is of the incorrect type.
 * on_fail takes one argument, which is a string containing the reason for why the value failed the type check.
 * 
 * If you're wondering why this is a callback and not the return value of is_type, it's because is_type is a "type guard"
 * which means it has to return a boolean (unless you're willing to do some wacky type casting, which I'm not).
 * 
 * I strongly recommend using this callback since it can help you debug errors in the template or type checked values.
 */

console.log('\n--- on_fail callback ---');

{
  const sum = api.addNumbers(0, 0); // Uh oh! The sum is 0, so sum.text will be undefined!
  console.log('sum:', sum);

  let reason: string | undefined;
  if (!is_type(math_result_template, sum, undefined, r => { reason = r; })) {
    console.log('sum is incorrectly typed!');
    console.log('Reason:', reason);
  }

  // Bonus example of a more complex template!

  const complex_data = api.complexOperation(false);
  console.log('complex:', complex_data);

  if (!is_type(compliated_template, complex_data, undefined, r => { reason = r; })) {
    console.log('complex is incorrectly typed!');
    console.log('Reason:', reason);
  }
}



/*
 * ignore_extra:
 * 
 * is_type accepts an optional options object. At the moment it has only one option which is ignore_extra.
 * 
 * By default is_type will fail the type check if any object in the value has a property that is not declared in the template.
 * To disable this, set ignore_extra to true.
 */

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
