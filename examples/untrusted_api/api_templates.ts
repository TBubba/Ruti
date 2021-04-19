import { create_template, FromTTypeArg } from '../../src';

const math_result_arg = {
  value: 'number',
  text: 'string',
} as const;

export const math_result_template = create_template(math_result_arg);

export type MathResultData = FromTTypeArg<typeof math_result_arg>
