import { create_template, FromTTypeArg, FromTTypeString, merge_state, TArgNode, TNode, TType, TTypePrim } from '../src';
import { forEachCombo, forEachUniqueCombo } from '../tooling/loop';

const advanced = ['object', 'array'] as const;

const primitives = ['boolean', 'number', 'string', 'undefined'] as const;

const all_types = [...advanced, ...primitives] as const;

const type_values = {
  object: [{}],
  array: [[]] as [][],
  boolean: [false, true],
  number: [0, 1],
  string: ['', 'abc'],
  undefined: [undefined],
};

describe('create_template', () => {
  describe('Primitive', () => {
    test('Single primitive', () => {
      for (const type of primitives) {
        expect(create_template(type))
        .toEqual({ types: [type] });
      }
    });
  
    test('Empty union', () => {
      expect(() => create_template([]))
      .toThrowError();
    });
  
    test('Unions', () => {
      for (let count = 1; count <= primitives.length; count++) {
        const arg = primitives.slice(0, count);
  
        expect(create_template(arg))
        .toEqual({ types: arg });
      }
    });
  
    test('Unions with dupe types', () => {
      for (let count = 1; count <= primitives.length; count++) {
        const arg = primitives.slice(0, count);
        arg.push(primitives[count - 1]);
  
        expect(() => create_template(arg))
        .toThrowError();
      }
    });
  });

  describe('Array', () => {
    test('Empty array', () => {
      expect(() => create_template([[]]))
      .toThrowError();
    });
  
    test('Array of primitive unions', () => {
      for (let count = 1; count <= primitives.length; count++) {
        const types = primitives.slice(0, count);
  
        expect(create_template([types]))
        .toEqual({
          types: ['array'],
          contents: types,
        });
      }
    });
  
    test('Array of primitive unions with dupe types', () => {
      for (let count = 1; count <= primitives.length; count++) {
        const types = primitives.slice(0, count);
        types.push(primitives[count - 1]);
  
        expect(() => create_template([types]))
        .toThrowError();
      }
    });

    test('Union of arrays', () => {
      expect(() => create_template([['number'], ['string']]))
      .toThrowError();
    });
  });

  describe('Object', () => {
    test('Empty object', () => {
      expect(create_template({}))
      .toEqual({
        types: ['object'],
        children: {},
      });
    });

    test('Object with primitive unions', () => {
      const names = ['x', 'y', 'z'];

      for (let count = 1; count < names.length; count++) {
        const arg: TArgNode<any> = {};
        const template: TNode = {
          types: ['object'],
          children: {},
          contents: undefined,
        };

        for (let i = 0; i < count; i++) {
          const name = names[i];
          const type = primitives[i % primitives.length];
    
          arg[name] = type;
          template.children![name] = {
            types: [type]
          };
        }

        expect(create_template(arg))
        .toEqual(template);
      }
    });

    test.todo('Object with arrays');

    test.todo('Object with objects');
  });

  describe('Mixed unions', () => {
    test.todo('Array & Primitive union');
  
    test.todo('Object & Primitive union');
  
    test.todo('Array & Object union');
  });
});

describe('merge_state', () => {
  describe('Primitive', () => {
    test('Single type', () => {
      for (const type_a of primitives) {

        const template = create_template(type_a);

        for (const type_b of all_types) {

          const is_valid = type_a === type_b;

          for (const value_a of type_values[type_a]) {
            for (const value_b of type_values[type_b]) {

              if (is_valid) {
                expect(merge_state(template, value_a, value_b as any))
                .toStrictEqual(value_b);
              } else {
                expect(() => merge_state(template, value_a, value_b as any))
                .toThrowError();
              }

            }
          }
        }
      }
    });

    test('Union', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_a => {

        const template = create_template(types_a);

        for (const type_a of types_a) {
          for (const type_b of all_types) {

            const is_valid = (types_a as string[]).indexOf(type_b) !== -1;            

            for (const value_a of type_values[type_a]) {
              for (const value_b of type_values[type_b]) {

                if (is_valid) {
                  expect(merge_state(template, value_a, value_b as any))
                  .toStrictEqual(value_b);
                } else {
                  expect(() => merge_state(template, value_a, value_b as any))
                  .toThrowError();
                }

              }
            }
          }
        }
      });
    });
  });

  describe('Array', () => {
    test('Single type array - Valid values', () => {
      for (const type of primitives) {
        const template = create_template([[type]]);

        // @TODO: Use "forEachUniqueCombo" for both loops here
        for (const content_a of type_values[type]) {
          for (const content_b of type_values[type]) {
            expect(merge_state(template, [content_a], [content_b]))
            .toStrictEqual([content_b]);
          }
        }
      }
    });

    test('Single type array - Invalid values', () => {
      for (const type_a of primitives) {
        const template = create_template(type_a);

        for (const type_b of all_types) {
          if (type_a === type_b) { continue; } // Skip valid

          for (const content_a of type_values[type_a]) {
            const value_a = [content_a];

            for (const content_b of type_values[type_b]) {
              expect(() => merge_state(template, value_a, content_b as any))
              .toThrowError();

              expect(() => merge_state(template, value_a, [content_b] as any))
              .toThrowError();
            }
          }
        }
      }
    });

    test('Union type array - Valid values', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_a => {
        const template = create_template([types_a]);

        const value_pool: (FromTTypeArg<TTypePrim>)[] = [];
        types_a.forEach(type => { value_pool.push(...type_values[type]) });

        forEachCombo(value_pool, 0, types_a.length, values_a => {
          forEachCombo(value_pool, 0, types_a.length, values_b => {
            expect(merge_state(template, values_a, values_b))
            .toStrictEqual(values_b);
          });
        });
      });
    });

    test('Union type array - Invalid values', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_a => {
        const template = create_template([types_a]);

        const types_b = all_types.filter(type => types_a.indexOf(type as any) === -1);

        const value_pool_b: FromTTypeString<TType>[] = [];
        for (const type of types_b) {
          value_pool_b.push(...type_values[type]);
        }

        forEachUniqueCombo(value_pool_b, 1, value_pool_b.length, values_b => {
          expect(() => merge_state(template, [], values_b as any))
          .toThrowError();
        });
      });
    });

    test('Union type array - Mixed valid and invalid values', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_a => {
        const template = create_template([types_a]);

        for (const type_b of primitives) {
          if (types_a.indexOf(type_b) !== -1) { continue; } // Skip valid

          for (const value_b of type_values[type_b]) {
            expect(() => merge_state(template, [], [value_b] as any))
            .toThrowError();
          }
        }
      });
    });
  });

  describe('Object', () => {
    test('Empty object', () => {
      const template = create_template({});

      expect(merge_state(template, {}, {}))
      .toStrictEqual({});
      
      for (const type of all_types) {
        for (const value of type_values[type]) {
          expect(() => merge_state(template, {}, { x: value }))
          .toThrowError();
        }
      }
      
      for (const type of all_types) {
        for (const value of type_values[type]) {
          expect(merge_state(template, {}, { x: value }, { ignore_extra: true }))
          .toStrictEqual({});
        }
      }
    });

    test('Primitives - Valid values', () => {
      // @TODO Try multiple values of each type
      forEachUniqueCombo(primitives, 1, primitives.length, types => {
        const arg = {};
        for (const type of types) {
          (arg as any)[type] = type;
        }

        const template = create_template(arg);

        const value = {};
        for (const type of types) {
          (value as any)[type] = type_values[type][0];
        }

        expect(merge_state(template, {}, value))
        .toStrictEqual(value);
      });
    });

    test('Primitive - Invalid values', () => {
      for (const type_a of primitives) {
        const template = create_template({ x: type_a });

        const value_a = { x: type_values[type_a][0] };

        for (const type_b of all_types) {
          if (type_a === type_b) { continue; } // Skip valid

          const value_b = { x: type_values[type_b][0] };

          expect(() => merge_state(template, value_a, value_b as any))
          .toThrowError();
        }
      }
    });

    test('Missing value & Unexpected value', () => {
      expect(() => merge_state(create_template({ x: 'number' }), { x: 0 }, { y: 0 } as any))
      .toThrowError();

      expect(() => merge_state(create_template({ x: 'undefined' }), { x: undefined }, { y: 0 } as any))
      .toThrowError();
    });
  });

  describe('Mixed unions', () => {
    test('Array & Primitive union', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_a_array => {
        forEachUniqueCombo(primitives, 1, primitives.length, types_a_prim => {

          const template = create_template([types_a_array, ...types_a_prim]);
          
          // Array values
          forEachUniqueCombo(types_a_array, 1, types_a_array.length, types_b_pool => {
            for (let i = 1; i < types_b_pool.length; i++) {

              const types_b = types_b_pool.slice(0, i);
              const value = types_b.map(type_b => type_values[type_b][0]);

              const is_valid = types_b.every(type_b => types_a_array.indexOf(type_b) !== -1);

              if (is_valid) {
                expect(merge_state(template, [], value as any))
                .toStrictEqual(value);
              } else {
                expect(() => merge_state(template, [], value as any))
                .toThrowError();
              }
            }
          });

          // Non-array values
          for (const type_b of all_types) {
            if (type_b === 'array') { continue; }

            for (const value of type_values[type_b]) {
              
              const is_valid = (types_a_prim as string[]).indexOf(type_b) !== -1;

              if (is_valid) {
                expect(merge_state(template, [], value as any))
                .toStrictEqual(value);
              } else {
                expect(() => merge_state(template, [], value as any))
                .toThrowError();
              }
            }
          }
        });
      });
    });

    test.todo('Object & Primitive union');

    test.todo('Array & Object union');
  });
});
