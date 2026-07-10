// ------------------------------ Store Built-ins ------------------------------

// Note: Store built-in methods on module load to prevent later scripts from replacing them.
//       This safeguards against global & prototype pollution that happens AFTER this code is loaded.

declare const Array: never;
declare const Object: never;

const Object_assign = (Object as unknown as ObjectConstructor).assign;
const Object_hasOwn = (Object as unknown as ObjectConstructor).hasOwn;
const Object_keys   = (Object as unknown as ObjectConstructor).keys;

const Array_isArray = (Array as unknown as ArrayConstructor).isArray;

const Array_join    = (Array as unknown as ArrayConstructor).prototype.join;
const Array_indexOf = (Array as unknown as ArrayConstructor).prototype.indexOf;
const Array_push    = (Array as unknown as ArrayConstructor).prototype.push;
const Array_pop     = (Array as unknown as ArrayConstructor).prototype.pop;
const Array_slice   = (Array as unknown as ArrayConstructor).prototype.slice;

// ------------------------------ ... ------------------------------

type TODO_any = any; // @TODO This type is used to patch stuff that broke when updating TypeScript :<

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

type Arr<T> = T[] | readonly T[]

export type FromTTypeArg<T> =
  T extends Arr<infer A> ? (
    A extends Arr<infer B> ? (
      B extends object ? ({ // [[ { B } ]]
        -readonly [K in keyof B]: FromTTypeArg<B[K]>;
      }[]) :
      FromTTypePrim<B>[] // [[ B ]]
    ) :
    A extends object ? ({ // [{ A }]
      -readonly [K in keyof A]: FromTTypeArg<A[K]>;
    }) :
    FromTTypePrim<T[number]> // [ A ]
  ) :
  T extends object ? ({ // { T }
    -readonly [K in keyof T]: FromTTypeArg<T[K]>;
  }) :
  FromTTypePrim<T> // 'T'

type FromTTypePrim<T> =
  T extends 'boolean' ? boolean :
  T extends 'number' ? number :
  T extends 'string' ? string :
  T extends 'null' ? null :
  T extends 'undefined' ? undefined :
  never

export type FromTTypeString<T> =
  T extends 'array' ? [] :
  T extends 'object' ? {} :
  FromTTypePrim<T>

export type TArgNode<T> =
  | TTypePrim // PRIM
  | Arr<TTypePrim> // [PRIM]
  | Arr<Arr<TTypePrim>> // [[PRIM]]
  |          [Arr<TTypePrim>, ...TTypePrim[]] // [[PRIM], ...PRIM]
  | readonly [Arr<TTypePrim>, ...TTypePrim[]] // ^ but readonly
  |          [Arr<{ [K in keyof T]: TArgNode<T[K]> }>, ...TTypePrim[]] // [[{}], ...PRIM]
  | readonly [Arr<{ [K in keyof T]: TArgNode<T[K]> }>, ...TTypePrim[]] // ^ but readonly
  |          [         [{ [K in keyof T]: TArgNode<T[K]> }, ...TTypePrim[]]] // [[{}, ...PRIM]]
  |          [readonly [{ [K in keyof T]: TArgNode<T[K]> }, ...TTypePrim[]]] // ^ but readonly (inner)
  | readonly [         [{ [K in keyof T]: TArgNode<T[K]> }, ...TTypePrim[]]] // ^ but readonly (outer)
  | readonly [readonly [{ [K in keyof T]: TArgNode<T[K]> }, ...TTypePrim[]]] // ^ but readonly (both)
  |          [         [{ [K in keyof T]: TArgNode<T[K]> }, ...TTypePrim[]], ...TTypePrim[]] // [[{}, ...PRIM], ...PRIM]
  |          [readonly [{ [K in keyof T]: TArgNode<T[K]> }, ...TTypePrim[]], ...TTypePrim[]] // ^ but readonly (inner)
  | readonly [         [{ [K in keyof T]: TArgNode<T[K]> }, ...TTypePrim[]], ...TTypePrim[]] // ^ but readonly (outer)
  | readonly [readonly [{ [K in keyof T]: TArgNode<T[K]> }, ...TTypePrim[]], ...TTypePrim[]] // ^ but readonly (both)
  |          [{ [K in keyof T]: TArgNode<T[K]> }, ...TTypePrim[]] // [{}, ...PRIM]
  | readonly [{ [K in keyof T]: TArgNode<T[K]> }, ...TTypePrim[]] // ^ but readonly
  |          [Arr<TTypePrim>, { [K in keyof T]: TArgNode<T[K]> }] // [[PRIM], {}]
  | readonly [Arr<TTypePrim>, { [K in keyof T]: TArgNode<T[K]> }] // ^ but readonly
  | { [K in keyof T]: TArgNode<T[K]> } // {}

export type TNode = {
  types: TType[];
  /** Child types (for non-array objects, or arrays of objects). */
  children?: { [key: string]: TNode } | undefined;
  /** Child types (for arrays). */
  contents?: TType[];
}

export type TType =
  | 'array'
  | 'object'
  | TTypePrim

export type TTypePrim =
  | 'boolean'
  | 'number'
  | 'string'
  | 'null'
  | 'undefined'

export type MergeStateOpts = {
  /**
   * Ignore properties that exist in B but not in T (instead of throwing an error).
   * Defaults to false.
   */
  ignore_extra?: boolean;
  /**
   * Ignore properties in B that are not one of the legal types in T (instead of throwing an error).
   * Defaults to false.
   * 
   * @TODO Is this not just a silly option? Why not just make a template where all values are of all types?
   */
  ignore_type?: boolean;
}

export type IsTypeOpts = {
  /**
   * Ignore properties that exist in V but not in T (instead of throwing an error).
   * Defaults to false.
   */
  ignore_extra?: boolean;
}

type IsTypeOnFail = (reason: string) => void

// Perf: This could be replaced with a module scoped stack array to reduce garbage
type IsTypeContext = {
  stack: (string | number)[]; // string = key of object, number = index of array
}

export function create_template<T extends TArgNode<any>>(arg: T): TNode {
  const node: TNode = {
    types: [],
    children: undefined,
    contents: undefined,
  };

  // Single primitive type
  if (typeof arg === 'string') {
    if (!isTTypePrim(arg)) { throw new Error(`Invalid type: ${arg}`); }
    Array_push.call(node.types, arg);
  }
  // Union
  else if (Array_isArray(arg)) {
    let array_index = -1;
    let object_index = -1;
    let array_object_index = -1;

    if (arg.length === 0) { throw new Error('Empty union array.'); }

    for (let i = 0; i < arg.length; i++) {
      const item = arg[i];

      // Array
      if (Array_isArray(item)) {
        if (array_index >= 0) { throw new Error(`No more than one array can be used in a union (first array index: ${array_index}, second array index: ${i}).`); }
        array_index = i;
        
        if (item.length === 0) { throw new Error('Empty array.'); }

        // Validate array types
        for (let j = 0; j < item.length; j++) {
          if (!isTTypePrim(item[j])) {
            if (getTType(item[j]) === 'object') {
              if (array_object_index !== -1) { throw new Error(`An array can only contain one object (array index: ${array_index}, object index in sub-array: ${array_object_index})`); }
              if (object_index !== -1) { throw new Error(`Unions may not contain more than one objects. This union contains one object as well as another object as part of an array (array index: ${array_index}, object index in sub-array: ${array_object_index}, object index: ${object_index})`); }
              array_object_index = j;
            } else { throw new Error(`Invalid type: ${item[j]}`); }
          }
          if (Array_indexOf.call(item, (item as TODO_any)[j], j + 1) >= 0) {
            throw new Error(`Duplicate type: ${item[j]}`);
          }
        }

        Array_push.call(node.types, 'array');
        node.contents = Array_slice.call(item) as TODO_any[];

        // Array of objects
        if (array_object_index !== -1) {
          node.contents[array_object_index] = 'object';

          node.children = {};
  
          const obj = item[array_object_index];

          const keys = Object_keys(obj);
          for (let j = 0; j < keys.length; j++) {
            const key = keys[j];

            node.children[key] = create_template((obj as TODO_any)[key as keyof typeof obj] as any);
          }
        }
      }
      // Object
      else if (typeof item === 'object' && item !== null) {
        if (object_index >= 0) { throw new Error(`No more than one object can be used in a union (first object index: ${object_index}, second object index: ${i}).`); }
        if (array_object_index !== -1) { throw new Error(`Unions may not contain more than one objects. This union contains one object as well as another object as part of an array (array index: ${array_index}, object index in sub-array: ${array_object_index}, object index: ${object_index})`); }
        object_index = i;
        
        Array_push.call(node.types, 'object');
        node.children = {};

        const keys = Object_keys(item);
        for (let j = 0; j < keys.length; j++) {
          const key = keys[j];

          node.children[key] = create_template((item as TODO_any)[key as keyof typeof item] as any);
        }
      }
      // Primitive
      else {
        if (!isTTypePrim(item)) { throw new Error(`Invalid type: ${item}`); }
        if (Array_indexOf.call(arg, item as TODO_any, i + 1) >= 0) {
          throw new Error(`Duplicate type: ${item}`);
        }

        Array_push.call(node.types, item);
      }
    }
  }
  // Object
  else if (typeof arg === 'object' && arg !== null) {
    Array_push.call(node.types, 'object');
    node.children = {};

    const keys = Object_keys(arg);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      node.children[key] = create_template(arg[key as keyof T] as any);
    }
  }
  // Unknown
  else {
    throw new Error(`Invalid argument.`);
  }

  return node;
}

// @TODO Make it optional to copy missing/invalid values from A (so it becomes a dif instead of a new & updated A)
export function merge_state<T>(t: TNode, a: T, b: DeepPartial<T>, opts?: MergeStateOpts): T {
  if (a === b) { return a as any; }

  const b_type = getTType(b);

  if (b_type === undefined) {
    if (opts?.ignore_type) { return a as any; }
    throw new Error(`B is not of an accepted type.`);
  }
  if (Array_indexOf.call(t.types, b_type) === -1) {
    if (opts?.ignore_type) { return a as any; }
    throw new Error(`B is not of an accepted type for T (B: ${b_type}, T: ${tnodeToString(t)})`);
  }

  switch (b_type) {
    case 'array': {
      if (!t.contents) { throw new Error('T is missing "contents". This means the template is invalid!'); }

      if (Array_indexOf.call(t.contents, 'object') !== -1) {
        throw new Error(`Template has a node that is an array of objects. Merging arrays of objects is not supported. This may be supported in the future.`);
      }

      const a_array = a as any as unknown[];
      const b_array = b as any as unknown[];

      let not_equal = false;

      if (getTType(a) === 'array' && a_array.length === b_array.length) {
        for (let i = 0; i < a_array.length; i++) {
          if (a_array[i] !== b_array[i]) {
            not_equal = true;
            break;
          }
        }
      } else {
        not_equal = true;
      }

      if (not_equal) {
        for (let i = 0; i < b_array.length; i++) {
          const val = b_array[i];
          const val_type = getTType(val);

          if (val_type === undefined) {
            if (opts?.ignore_type) { return a as any; }
            throw new Error(`B[${i}] is not of an accepted type.`);
          }
          if (Array_indexOf.call(t.contents, val_type) === -1) {
            if (opts?.ignore_type) { return a as any; }
            throw new Error(`B[${i}] is not of an accepted type for T (B[${i}]: ${val_type}, T: ${typesToString(t.contents)})`);
          }
          if (val_type === 'object') {
            throw new Error(`B[${i}] is an object. Merging arrays of objects is not supported.`);
          }
        }

        return Array_slice.call(b_array) as any;
      } else {
        return a_array as any;
      }

    } break;

    case 'object': {
      if (!t.children) { throw new Error('T is missing "children". This means the template is invalid!'); }

      const a_object = a as any as { [key: string]: unknown; };
      const b_object = b as any as { [key: string]: unknown; };

      const a_is_not_object = (getTType(a) !== 'object');

      let d_object: { [key: string]: unknown; } | undefined;

      const keys_b = Object_keys(b_object);

      if (a_is_not_object) {
        for (const key_t in t.children) {
          if (!Object_hasOwn(t.children, key_t)) {
            continue; // Ignore properties up the prototype chain.
          }

          if (!Object_hasOwn(b_object, key_t)) {
            if (Array_indexOf.call(t.children[key_t].types, 'undefined') !== -1) { continue; } // values that can be undefined can also be missing (@TODO Make this an option?)

            // Note: If A is a non-object and B is an object all keys have to be present.
            // This is because when A is an object it is assumed that it already has all keys (so B may be partial)
            throw new Error(`B is missing a key that is required in T (key: "${key_t}")`);
          }
        }
      }

      for (let i = 0; i < keys_b.length; i++) {
        const key = keys_b[i];

        if (!Object_hasOwn(t.children, key)) {
          if (opts?.ignore_extra) { continue; }
          throw new Error(`B has a key that is not present in T (key: "${key}")`);
        }

        const a_value = a_is_not_object ? undefined : a_object[key];

        const result = merge_state(t.children[key], a_value as any, b_object[key] as any, opts);

        if (a_is_not_object || !Object_hasOwn(a_object, key) || result !== a_object[key]) {
          if (!d_object) {
            d_object = a_is_not_object
              ? {}
              : Object_assign({}, a_object);
          }

          d_object[key] = result;
        }
      }

      return (d_object || a_object) as any;
    } break;

    // Primitives
    case 'boolean':
    case 'number':
    case 'string':
    case 'null':
    case 'undefined':
      return b as any; // no need to compare primitives

    case undefined:
      throw new Error('Type of T is undefined. This means the template is invalid!');
    default:
      throw new Error(`Type "${b_type}" is not implemented!`);
  }
}

const DEFAULT_IS_TYPE_OPTIONS: IsTypeOpts = {
  ignore_extra: false,
};

export function is_type<T>(t: TNode, v: unknown, opts?: IsTypeOpts, on_fail: IsTypeOnFail = noop): v is T {
  return is_type_internal(t, v, opts || DEFAULT_IS_TYPE_OPTIONS, on_fail, { stack: [] });
}

function is_type_internal<T>(t: TNode, v: unknown, opts: IsTypeOpts, on_fail: IsTypeOnFail, context: IsTypeContext): v is T {
  const v_type = getTType(v);

  if (v_type === undefined) {
    on_fail(`Type of V is not implemented (stack: ${stackToString(context)})`);
    return false;
  }
  if (Array_indexOf.call(t.types, v_type) === -1) {
    on_fail(`V is not of an accepted type for T (type of V: ${v_type}, type of T: ${tnodeToString(t)}, stack: ${stackToString(context)})`);
    return false;
  }

  switch (v_type) {
    case 'array': {
      if (!t.contents) { throw new Error(`T is missing "contents". This means the template is invalid! (stack: ${stackToString(context)})`); }

      const v_array = v as any as unknown[];

      for (let i = 0; i < v_array.length; i++) {
        const item = v_array[i];
        const item_type = getTType(item);

        if (Array_indexOf.call(t.contents, item_type as any) === -1) {
          on_fail(`V[${i}] is not of an accepted type for T (V[${i}]: ${item_type}, T: ${typesToString(t.contents)}, stack: ${stackToString(context)})`); // or B[i] is just undefined
          return false;
        }

        if (item_type === 'object') {
          Array_push.call(context.stack, i);
          if (!is_type_object(t, item, opts, on_fail, context)) { return false; }
          Array_pop.call(context.stack);
        }
      }

      return true;
    } break;

    case 'object':
      return is_type_object(t, v, opts, on_fail, context);

    // Primitives
    case 'boolean':
    case 'number':
    case 'string':
    case 'null':
    case 'undefined':
      return true; // no need to compare primitives

    case undefined:
      throw new Error(`Type of T is undefined. This means the template is invalid! (stack: ${stackToString(context)})`);
    default:
      throw new Error(`Type "${v_type}" is not implemented! (stack: ${stackToString(context)})`);
  }
}

function is_type_object(t: TNode, v: unknown, opts: IsTypeOpts, on_fail: IsTypeOnFail, context: IsTypeContext): boolean {
  if (!t.children) { throw new Error(`T is missing "children". This means the template is invalid! (stack: ${stackToString(context)})`); }

  const v_object = v as any as { [key: string]: unknown; };

  for (const key in t.children) {
    if (!Object_hasOwn(t.children, key)) {
      continue; // Ignore properties up the prototype chain.
    }

    if (Array_indexOf.call(t.children[key].types, 'undefined') !== -1) { continue; }

    if (!Object_hasOwn(v_object, key)) {
      on_fail(`V is missing a key that is required in T (key: "${key}", stack: ${stackToString(context)})`);
      return false;
    }
  }

  const keys_v = Object_keys(v_object);

  for (let i = 0; i < keys_v.length; i++) {
    const key = keys_v[i]; 

    if (!Object_hasOwn(t.children, key)) {
      if (opts.ignore_extra) { continue; }
      on_fail(`V has a key that is not present in T (key: "${key}", stack: ${stackToString(context)})`);
      return false;
    }

    Array_push.call(context.stack, key);
    if (!is_type_internal(t.children[key], v_object[key], opts, on_fail, context)) { return false; }
    Array_pop.call(context.stack);
  }

  return true;
}

function isTTypePrim(value: unknown): value is TTypePrim {
  switch (value) {
    case 'boolean':
    case 'number':
    case 'string':
    case 'null':
    case 'undefined':
      return true;
    default:
      return false;
  }
}

function getTType(value: unknown): TType | undefined {
  if (Array_isArray(value)) { return 'array'; }

  switch (typeof value) {
    case 'object': return (value === null) ? 'null' : 'object';
    case 'boolean': return 'boolean';
    case 'number': return 'number';
    case 'string': return 'string';
    case 'undefined': return 'undefined';
  }

  return undefined;
}

function tnodeToString(node: TNode): string {
  return `[${Array_join.call(node.types, ', ')}]`;
}

function typesToString(types: unknown[]): string {
  return `[${Array_join.call(types, ', ')}]`;
}

function stackToString(context: IsTypeContext): string {
  let str = '';

  if (context.stack.length > 0) {
    str += context.stack[0];

    for (let i = 1; i < context.stack.length; i++) {
      const name_or_index = context.stack[i];
      str += (typeof name_or_index === 'number')
        ? `[${name_or_index}]`
        : `.${name_or_index}`;
    }
  }

  return str;
}

function noop() {}
