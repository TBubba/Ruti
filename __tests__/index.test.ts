import * as assert from "node:assert";
import { describe, test } from "node:test";
import { create_template, type FromTTypeArg, type FromTTypeString, is_type, merge_state, type TArgNode, type TNode, type TType, type TTypePrim } from "../src/index.ts";
import { forEachUniqueCombo } from "../tooling/loop.ts";

const advanced = ['object', 'array'] as const;

const primitives = ['boolean', 'number', 'string', 'null', 'undefined'] as const;

const all_types = [...advanced, ...primitives] as const;

const type_values = {
  object: [{}],
  array: [[]] as [][],
  boolean: [false, true],
  number: [0, 1],
  string: ['', 'abc'],
  null: [null],
  undefined: [undefined],
};

describe('internal', () => {
  describe('forEachUniqueCombo', () => {
    test('Length 0', () => {
      const array: any[] = [];
      const values = [ [] ];
  
      let index = 0;
      forEachUniqueCombo(array, 0, array.length, (indices) => {
        assert.deepStrictEqual(indices, values[index++]);
      });

      assert.strictEqual(index, values.length);
    });

    test('Length 1', () => {
      const array = [0];
      const values = [ [], [0] ];
  
      let index = 0;
      forEachUniqueCombo(array, 0, array.length, (indices) => {
        assert.deepStrictEqual(indices, values[index++]);
      });

      assert.strictEqual(index, values.length);
    });

    test('Length 2', () => {
      const array = [0, 1];
      const values = [ [], [0], [1], [0, 1] ];
  
      let index = 0;
      forEachUniqueCombo(array, 0, array.length, (indices) => {
        assert.deepStrictEqual(indices, values[index++]);
      });

      assert.strictEqual(index, values.length);
    });

    test('Length 3', () => {
      const array = [0, 1, 2];
      const values = [
        [],
        [0], [1], [2],
        [0, 1], [0, 2], [1, 2],
        [0, 1, 2],
      ];
  
      let index = 0;
      forEachUniqueCombo(array, 0, array.length, (indices) => {
        assert.deepStrictEqual(indices, values[index++]);
      });

      assert.strictEqual(index, values.length);
    });

    test('Length 4', () => {
      const array = [0, 1, 2, 3];
      const values = [
        [],
        [0], [1], [2], [3],
        [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
        [0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3],
        [0, 1, 2, 3],
      ];
  
      let index = 0;
      forEachUniqueCombo(array, 0, array.length, (indices) => {
        assert.deepStrictEqual(indices, values[index++]);
      });

      assert.strictEqual(index, values.length);
    });

    test('Length 4 - Different values', () => {
      const array = ['a', null, undefined, 3];
      const values = [
        [],
        ['a'], [null], [undefined], [3],
        ['a', null], ['a', undefined], ['a', 3], [null, undefined], [null, 3], [undefined, 3],
        ['a', null, undefined], ['a', null, 3], ['a', undefined, 3], [null, undefined, 3],
        ['a', null, undefined, 3],
      ];
  
      let index = 0;
      forEachUniqueCombo(array, 0, array.length, (indices) => {
        assert.deepStrictEqual(indices, values[index++]);
      });

      assert.strictEqual(index, values.length);
    });
  });
});

describe('create_template', () => {
  describe('Primitive', () => {
    test('Single primitive', () => {
      for (const type of primitives) {
        assert.deepStrictEqual(create_template(type), { types: [type], children: undefined, contents: undefined });
      }
    });

    test('Empty union', () => {
      assert.throws(() => create_template([]));
    });

    test('Unions', () => {
      for (let count = 1; count <= primitives.length; count++) {
        const arg = primitives.slice(0, count);
  
        assert.deepStrictEqual(create_template(arg), { types: arg, children: undefined, contents: undefined });
      }
    });
  
    test('Unions with dupe types', () => {
      for (let count = 1; count <= primitives.length; count++) {
        const arg = primitives.slice(0, count);
        arg.push(primitives[count - 1]);
  
        assert.throws(() => create_template(arg));
      }
    });
  });

  describe('Array', () => {
    test('Empty array', () => {
      assert.throws(() => create_template([[]]));
    });

    test('Array of primitive unions', () => {
      for (let count = 1; count <= primitives.length; count++) {
        const types = primitives.slice(0, count);
  
        assert.deepStrictEqual(create_template([types]), {
          types: ['array'],
          children: undefined,
          contents: types,
        });
      }
    });
  
    test('Array of primitive unions with dupe types', () => {
      for (let count = 1; count <= primitives.length; count++) {
        const types = primitives.slice(0, count);
        types.push(primitives[count - 1]);
  
        assert.throws(() => create_template([types]));
      }
    });

    test('Union of arrays', () => {
      assert.throws(() => create_template([['number'], ['string']]));
    });

    test('Array of objects', () => {
      assert.deepStrictEqual(create_template([[{ x: 'string' }]]), {
        types: ['array'],
        children: {
          x: {
            types: ['string'],
            children: undefined,
            contents: undefined,
          },
        },
        contents: ['object'],
      });
      
      assert.throws(() => create_template([[{ x: 'string' }, { y: 'number' }]]));
    });

    test('Array and primitive unions', () => {
      assert.deepStrictEqual(create_template([['string'], 'number']), {
        types: ['array', 'number'],
        children: undefined,
        contents: ['string'],
      });

      assert.deepStrictEqual(create_template([[{ x: 'string' }], 'null']), {
        types: ['array', 'null'],
        children: {
          x: {
            types: ['string'],
            children: undefined,
            contents: undefined,
          },
        },
        contents: ['object'],
      });
    });
  });

  describe('Object', () => {
    test('Empty object', () => {
      assert.deepStrictEqual(create_template({}), {
        types: ['object'],
        children: {},
        contents: undefined,
      });
    });

    test('Object with primitive unions', () => {
      const names = ['x', 'y', 'z'];

      for (let count = 1; count <= names.length; count++) {
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
            types: [type],
            children: undefined,
            contents: undefined,
          };
        }

        assert.deepStrictEqual(create_template(arg), template);
      }
    });

    test('Object with arrays', () => {
      const names = ['x', 'y', 'z'];

      for (let count = 1; count <= names.length; count++) {
        const arg: TArgNode<any> = {};
        const template: TNode = {
          types: ['object'],
          children: {},
          contents: undefined,
        };

        for (let i = 0; i < count; i++) {
          const name = names[i];
          const type = primitives[i % primitives.length];
    
          arg[name] = [[type]];
          template.children![name] = {
            types: ['array'],
            children: undefined,
            contents: [type],
          };
        }

        assert.deepStrictEqual(create_template(arg), template);
      }
    });

    test('Object with objects', () => {
      const names = ['x', 'y', 'z'];

      for (let count = 1; count <= names.length; count++) {
        const arg: TArgNode<any> = {};
        const template: TNode = {
          types: ['object'],
          children: {},
          contents: undefined,
        };

        for (let i = 0; i < count; i++) {
          const name = names[i];
          const type = primitives[i % primitives.length];
    
          arg[name] = { [name]: type };
          template.children![name] = {
            types: ['object'],
            children: {
              [name]: {
                types: [type],
                children: undefined,
                contents: undefined,
              },
            },
            contents: undefined,
          };
        }

        assert.deepStrictEqual(create_template(arg), template);
      }
    });
  });

  describe('Mixed unions', () => {
    test('Array & Primitive union', () => {
      for (let i = 0; i < primitives.length; i++) {
        const array_type = primitives[i];

        for (let count = 1; count < primitives.length; count++) {
          const primitive_types = primitives.slice(0, count);

          assert.deepStrictEqual(create_template([[array_type], ...primitive_types]), {
            types: ['array', ...primitive_types],
            children: undefined,
            contents: [array_type],
          });
        }
      }
    });

    test('Object & Primitive union', () => {
      for (let i = 0; i < primitives.length; i++) {
        const object_type = primitives[i];

        for (let count = 1; count < primitives.length; count++) {
          const primitive_types = primitives.slice(0, count);

          assert.deepStrictEqual(create_template([{ x: object_type }, ...primitive_types]), {
            types: ['object', ...primitive_types],
            children: {
              x: {
                types: [object_type],
                children: undefined,
                contents: undefined,
              },
            },
            contents: undefined,
          });
        }
      }
    });

    test('Array of objects & Primitive union', () => {
      for (let i = 0; i < primitives.length; i++) {
        const array_type = primitives[i];

        for (let count = 1; count < primitives.length; count++) {
          const primitive_types = primitives.slice(0, count);

          assert.deepStrictEqual(create_template([[{ [array_type]: array_type }], ...primitive_types]), {
            types: ['array', ...primitive_types],
            children: {
              [array_type]: {
                types: [array_type],
                children: undefined,
                contents: undefined,
              },
            },
            contents: ['object'],
          });
        }
      }
    });

    test('Array & Object union', () => {
      for (let i = 0; i < primitives.length; i++) {
        const array_type = primitives[i];

        for (let j = 0; j < primitives.length; j++) {
          const object_type = primitives[j];

          assert.deepStrictEqual(create_template([[array_type], { value: object_type }]), {
            types: ['array', 'object'],
            children: {
              value: {
                types: [object_type],
                children: undefined,
                contents: undefined,
              },
            },
            contents: [array_type],
          });
        }
      }
    });

    assert.throws(() => create_template([[{ x: 'number' }], { y: 'string' }] as any));
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
                assert.strictEqual(merge_state(template, value_a, value_b as any), value_b);
              } else {
                assert.throws(() => merge_state(template, value_a, value_b as any));
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
                  assert.strictEqual(merge_state(template, value_a, value_b as any), value_b);
                } else {
                  assert.throws(() => merge_state(template, value_a, value_b as any));
                }

              }
            }
          }
        }
      });
    });
  });

  describe('Array', () => {
    test('Array of primitives - Valid values', () => {
      for (const type of primitives) {
        const template = create_template([[type]]);

        // @TODO: Use "forEachUniqueCombo" for both loops here
        for (const content_a of type_values[type]) {
          for (const content_b of type_values[type]) {
            assert.deepStrictEqual(merge_state(template, [content_a], [content_b]), [content_b]);
          }
        }
      }
    });

    test('Array of primitives - Invalid values', () => {
      for (const type_a of primitives) {
        const template = create_template(type_a);

        for (const type_b of all_types) {
          if (type_a === type_b) { continue; } // Skip valid

          for (const content_a of type_values[type_a]) {
            const value_a = [content_a];

            for (const content_b of type_values[type_b]) {
              assert.throws(() => merge_state(template, value_a, content_b as any));

              assert.throws(() => merge_state(template, value_a, [content_b] as any));
            }
          }
        }
      }
    });

    test('Array of primitive unions - Only valid values', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_a => {
        const template = create_template([types_a]);

        const value_pool: (FromTTypeArg<TTypePrim>)[] = [];
        types_a.forEach(type => { value_pool.push(...type_values[type]) });

        forEachUniqueCombo(value_pool, 0, types_a.length, values_a => {
          forEachUniqueCombo(value_pool, 0, types_a.length, values_b => {
            assert.deepStrictEqual(merge_state(template, values_a, values_b), values_b);
          });
        });
      });
    });

    test('Array of primitive unions - Only invalid values', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_a => {
        const template = create_template([types_a]);

        const types_b = all_types.filter(type => types_a.indexOf(type as any) === -1);

        const value_pool_b: FromTTypeString<TType>[] = [];
        types_b.forEach(type => { value_pool_b.push(...type_values[type]) });

        forEachUniqueCombo(value_pool_b, 1, value_pool_b.length, values_b => {
          assert.throws(() => merge_state(template, [], values_b as any));
        });
      });
    });

    test.todo('Array of primitive unions - Mixed valid and invalid values');

    test('Array of objects - not supported', () => {
      const template = create_template([[{ x: 'string' }]]);

      assert.throws(() => merge_state(template, [], []));

      assert.throws(() => merge_state(template, [{ x: 'a' }], []));

      assert.throws(() => merge_state(template, [{ x: 'a' }], [{ x: 'b' }]));

      assert.throws(() => merge_state(template, [], [{ x: 'b' }] as any));
    });

    test('Array of object and primitives unions - not supported', () => {
      const template = create_template([[{ x: 'string' }, 'number']] as const);

      assert.throws(() => merge_state(template, [], []));

      assert.throws(() => merge_state(template, [{ x: 'a' }], []));

      assert.throws(() => merge_state(template, [{ x: 'a' }], [{ x: 'b' }]));

      assert.throws(() => merge_state(template, [], [{ x: 'b' }] as any));

      assert.throws(() => merge_state(template, [1], []));

      assert.throws(() => merge_state(template, [1], [2]));

      assert.throws(() => merge_state(template, [], [2] as any));
    });
  });

  describe('Object', () => {
    test('Empty object', () => {
      const template = create_template({});

      assert.deepStrictEqual(merge_state(template, {}, {}), {});
      
      for (const type of all_types) {
        for (const value of type_values[type]) {
          assert.throws(() => merge_state(template, {}, { x: value }));
        }
      }
      
      for (const type of all_types) {
        for (const value of type_values[type]) {
          assert.deepStrictEqual(merge_state(template, {}, { x: value }, { ignore_extra: true }), {});
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

        assert.deepStrictEqual(merge_state(template, {}, value), value);
      });
    });

    test('Primitives - Invalid values', () => {
      for (const type_a of primitives) {
        const template = create_template({ x: type_a });

        const value_a = { x: type_values[type_a][0] };

        for (const type_b of all_types) {
          if (type_a === type_b) { continue; } // Skip valid

          const value_b = { x: type_values[type_b][0] };

          assert.throws(() => merge_state(template, value_a, value_b as any));
        }
      }
    });

    test('Missing value & Unexpected value', () => {
      assert.throws(() => merge_state(create_template({ x: 'number' }), { x: 0 }, { y: 0 } as any));

      assert.throws(() => merge_state(create_template({ x: 'undefined' }), { x: undefined }, { y: 0 } as any));
    });
  });

  describe('Mixed unions', () => {
    // @TODO This is VERY slow! It takes over a minute to run on my machine!
    test('Array & Primitive union', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_a_array => {
        forEachUniqueCombo(primitives, 1, primitives.length, types_a_prim => {

          const template = create_template([types_a_array, ...types_a_prim]);
          
          // Array values
          forEachUniqueCombo(all_types, 1, all_types.length, types_b => {
            const value = types_b.map(type_b => type_values[type_b][0]);

            const is_valid = types_b.every(type_b => (types_a_array as string[]).indexOf(type_b) !== -1);

            if (is_valid) {
              assert.deepStrictEqual(merge_state(template, [], value as any), value);
            } else {
              assert.throws(() => merge_state(template, [], value as any));
            }
          });

          // Non-array values
          for (const type_b of all_types) {
            if (type_b === 'array') { continue; }

            for (const value of type_values[type_b]) {
              
              const is_valid = (types_a_prim as string[]).indexOf(type_b) !== -1;

              if (is_valid) {
                assert.deepStrictEqual(merge_state(template, [], value as any), value);
              } else {
                assert.throws(() => merge_state(template, [], value as any));
              }
            }
          }
        });
      });
    });

    test('Object & Primitive union', () => {
      // @TODO Test the options as well (ignore_extra and ignore_type)

      const all_names = ['x', 'y', 'z', 'v', 'w'];
      
      assert.strictEqual(all_names.length, primitives.length); // Make sure there are enough names!

      forEachUniqueCombo(primitives, 1, primitives.length, types_a_object => {
        forEachUniqueCombo(primitives, 1, primitives.length, types_a_prim => {

          const arg_object_names = all_names.slice(0, types_a_object.length);

          const arg_object: TArgNode<any> = {};
          for (let i = 0; i < types_a_object.length; i++) {
            arg_object[arg_object_names[i]] = types_a_object[i];
          }

          const template = create_template([ arg_object, ...types_a_prim ]);
          
          // Object values
          forEachUniqueCombo(primitives, 0, primitives.length, types_b => {
            const arg_b: any = {};
            const value: any = {};
            for (let i = 0; i < types_b.length; i++) {
              const name = all_names[i];
              const type = types_b[i];

              arg_b[name] = type;
              value[name] = type_values[type][0];
            }

            let is_valid = true;
            for (let i = 0; i < arg_object_names.length; i++) {
              const name = arg_object_names[i];
              const type_a = arg_object[name];
              const type_b = arg_b[name];

              if (type_b === undefined) { continue; }
              if (type_b === 'undefined') { continue; }
              if (type_a === type_b) { continue; }
              
              is_valid = false;
              break;
            }
            for (let i = 0; i < types_b.length; i++) {
              if (arg_object_names.indexOf(all_names[i]) === -1) {
                is_valid = false; // B contains at least one invalid type
                break;
              }
            }

            if (is_valid) {
              assert.deepStrictEqual(merge_state(template, {}, value as any), value);
            } else {
              assert.throws(() => merge_state(template, {}, value as any));
            }
          });

          // Non-object values
          for (const type_b of all_types) {
            if (type_b === 'object') { continue; }

            for (const value of type_values[type_b]) {
              
              const is_valid = (types_a_prim as string[]).indexOf(type_b) !== -1;

              if (is_valid) {
                assert.deepStrictEqual(merge_state(template, {}, value as any), value);
              } else {
                assert.throws(() => merge_state(template, {}, value as any));
              }
            }
          }
        });
      });
    });

    test('Object & Primitive union - Primitive to Object', () => {
      for (const type_prim of primitives) {
        for (const value_prim of type_values[type_prim]) {

          const template = create_template([ { x: 'boolean' }, type_prim ]);

          assert.deepStrictEqual(merge_state(template, value_prim, { x: true } as any), { x: true });

          assert.throws(() => merge_state(template, value_prim, {} as any));
        }
      }
    });

    test.todo('Array & Object union');
  });
});

describe('is_type', () => {
  describe('Primitive', () => {
    test('Single type', () => {
      for (const type_t of primitives) {
        const template = create_template(type_t);

        for (const type_v of all_types) {
          const is_valid = type_t === type_v;

          for (const value_v of type_values[type_v]) {
            assert.strictEqual(is_type(template, value_v), is_valid);
          }
        }
      }
    });

    test('Union', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_t => {

        const template = create_template(types_t);

          for (const type_v of all_types) {

          const is_valid = (types_t as string[]).indexOf(type_v) !== -1;            

          for (const value_v of type_values[type_v]) {
            assert.strictEqual(is_type(template, value_v), is_valid);
          }
        }
      });
    });
  });

  describe('Array', () => {
    test('Primitive array - Valid values', () => {
      for (const type of primitives) {
        const template = create_template([[type]]);

        forEachUniqueCombo(type_values[type] as any[], 1, type_values[type].length, value => {
          assert.strictEqual(is_type(template, value), true);
        });
      }
    });

    test('Primitive array - Invalid values', () => {
      for (const type_t of primitives) {
        const template = create_template([[type_t]]);

        for (const type_v of primitives) {
          if (type_t === type_v) { continue; } // Skip valid

          forEachUniqueCombo(type_values[type_v] as any[], 1, type_values[type_v].length, value => {
            assert.strictEqual(is_type(template, value), false);
          });
        }
      }
    });

    test('Primitive union array - Valid values', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types => {
        const template = create_template([types]);

        const all_valid_values: (FromTTypeArg<TTypePrim>)[] = [];
        types.forEach(type => { all_valid_values.push(...type_values[type]) });

        forEachUniqueCombo(all_valid_values, 0, types.length, values => {
          assert.strictEqual(is_type(template, values), true);
        });
      });
    });

    test('Primitive union array - Only invalid values', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_t => {
        const template = create_template([types_t]);

        const types_v = all_types.filter(type => types_t.indexOf(type as any) === -1);

        const all_invalid_values: FromTTypeString<TType>[] = [];
        types_v.forEach(type => { all_invalid_values.push(...type_values[type]) });

        forEachUniqueCombo(all_invalid_values, 1, all_invalid_values.length, values => {
          assert.strictEqual(is_type(template, values), false);
        });
      });
    });
    
    test.todo('Primitive union array - Some invalid values');

    test('Object array', () => {
      let template: TNode;

      template = create_template([[ { x: 'string' } ]]);
      assert.strictEqual(is_type(template, []), true);
      assert.strictEqual(is_type(template, [{ x: 'a' }]), true);
      assert.strictEqual(is_type(template, [{ x: 1 }]), false);
      assert.strictEqual(is_type(template, [{}]), false);
    });

    test('Object and primitive array', () => {
      let template: TNode;

      template = create_template([[ { x: 'string' }, 'number' ]]);
      assert.strictEqual(is_type(template, []), true);
      assert.strictEqual(is_type(template, [{ x: 'a' }]), true);
      assert.strictEqual(is_type(template, [{ x: 1 }]), false);
      assert.strictEqual(is_type(template, [{}]), false);
      assert.strictEqual(is_type(template, [0]), true);
      assert.strictEqual(is_type(template, [{ x: 'a' }, 0]), true);
      assert.strictEqual(is_type(template, [{ x: 1 }, 0]), false);
      assert.strictEqual(is_type(template, ['a']), false);
    });
  });

  describe('Object', () => {
    test('Empty object', () => {
      const template = create_template({});

      assert.strictEqual(is_type(template, {}), true);
      
      for (const type of all_types) {
        for (const value of type_values[type]) {
          assert.strictEqual(is_type(template, { x: value }), false);
        }
      }
      
      for (const type of all_types) {
        for (const value of type_values[type]) {
          assert.strictEqual(is_type(template, { x: value }, { ignore_extra: true }), true);
        }
      }
    });

    test('Primitives - Only valid values', () => {
      // @TODO Try multiple values of each type
      forEachUniqueCombo(primitives, 1, primitives.length, types => {
        const arg: any = {};
        types.forEach(type => { arg[type] = type; });

        const template = create_template(arg);

        const value: any = {};
        types.forEach(type => { value[type] = type_values[type][0]; });

        assert.strictEqual(is_type(template, value), true);
      });
    });

    test('Primitives - Only invalid values', () => {
      for (const type_t of primitives) {
        const template = create_template({ x: type_t });

        for (const type_v of all_types) {
          if (type_t === type_v) { continue; } // Skip valid

          for (const value of type_values[type_v]) {
            assert.strictEqual(is_type(template, { x: value }), false);
          }
        }
      }
    });

    test.todo('Primitives - Mixed valid and invalid values');

    test('Missing value & Unexpected value', () => {
      assert.strictEqual(is_type(create_template({ x: 'number' }), { y: 0 }), false);

      assert.strictEqual(is_type(create_template({ x: 'undefined' }), { y: 0 }), false);
    });
  });

  describe('Mixed unions', () => {
    test('Array & Primitive union', () => {
      forEachUniqueCombo(primitives, 1, primitives.length, types_t_array => {
        forEachUniqueCombo(primitives, 1, primitives.length, types_t_prim => {

          const template = create_template([types_t_array, ...types_t_prim]);
          
          // Array values
          forEachUniqueCombo(all_types, 1, all_types.length, types_v => {
            const value = types_v.map(type_v => type_values[type_v][0]);

            const is_valid = types_v.every(type_v => (types_t_array as string[]).indexOf(type_v) !== -1);

            assert.strictEqual(is_type(template, value), is_valid);
          });

          // Non-array values
          for (const type_v of all_types) {
            if (type_v === 'array') { continue; }

            for (const value of type_values[type_v]) {
              const is_valid: boolean = (types_t_prim as string[]).indexOf(type_v) !== -1;

              assert.strictEqual(is_type(template, value), is_valid);
            }
          }
        });
      });
    });

    test('Object & Primitive union', () => {
      // @TODO Test the options as well (ignore_extra)
      // @TODO Test objects with children of non-primitive types as well

      const all_names = ['x', 'y', 'z', 'v', 'w'];

      assert.strictEqual(all_names.length, primitives.length); // Make sure there are enough names!

      forEachUniqueCombo(primitives, 1, primitives.length, types_t_object => {
        forEachUniqueCombo(primitives, 1, primitives.length, types_t_prim => {

          const arg_object_names = all_names.slice(0, types_t_object.length);

          const arg_object: TArgNode<any> = {};
          for (let i = 0; i < types_t_object.length; i++) {
            arg_object[arg_object_names[i]] = types_t_object[i];
          }

          const template = create_template([ arg_object, ...types_t_prim ]);
          
          // Object values
          forEachUniqueCombo(primitives, 0, primitives.length, types_v => {
            const arg_v: any = {};
            const value: any = {};
            for (let i = 0; i < types_v.length; i++) {
              const name = all_names[i];
              const type = types_v[i];

              arg_v[name] = type;
              value[name] = type_values[type][0];
            }

            let is_valid = true;
            for (let i = 0; i < arg_object_names.length; i++) {
              const name = arg_object_names[i];
              const type_t = arg_object[name];
              const type_v = arg_v[name];

              if (type_t === 'undefined' && type_v === undefined) { continue; } // Missing keys are equivalent to undefined 
              if (type_t === type_v) { continue; }
              
              is_valid = false;
              break;
            }
            for (let i = 0; i < types_v.length; i++) {
              if (arg_object_names.indexOf(all_names[i]) === -1) {
                is_valid = false; // Value contains at least one invalid type
                break;
              }
            }

            assert.strictEqual(is_type(template, value), is_valid);
          });

          // Non-object values
          for (const type_v of all_types) {
            if (type_v === 'object') { continue; }

            for (const value of type_values[type_v]) {
              const is_valid: boolean = (types_t_prim as string[]).indexOf(type_v) !== -1;

              assert.strictEqual(is_type(template, value), is_valid);
            }
          }
        });
      });
    });

    test('Array & Object union', () => {
      // @TODO Test mixed unions

      for (let i = 0; i < primitives.length; i++) {
        const template_array_type = primitives[i];

        for (let j = 0; j < primitives.length; j++) {
          const template_object_type = primitives[j];

          const template = create_template([[template_array_type], { value: template_object_type }]);

          assert.strictEqual(is_type(template, []), true);

          for (let k = 0; k < primitives.length; k++) {
            const value_type = primitives[k];
            const values = type_values[value_type];
            const is_valid = (value_type === template_array_type);
            for (const value of values) {
              assert.strictEqual(is_type(template, [value]), is_valid);
            }
          }

          for (let k = 0; k < primitives.length; k++) {
            const value_type = primitives[k];
            const values = type_values[value_type];
            const is_valid = (value_type === template_object_type);
            for (const value of values) {
              assert.strictEqual(is_type(template, { value }), is_valid);
            }
          }
        }
      }
    });
  });

});
