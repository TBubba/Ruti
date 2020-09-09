type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

type Arr<T> = T[] | readonly T[]

export type FromTTypeArg<T> =
  T extends Arr<infer A> ? (
    A extends Arr<infer B> ?
      FromTTypePrim<B>[] :
      FromTTypePrim<T[number]>
  ) :
  T extends object ? ({
    -readonly [K in keyof T]: FromTTypeArg<T[K]>;
  }) :
  FromTTypePrim<T>

type FromTTypePrim<T> =
  T extends 'boolean' ? boolean :
  T extends 'number' ? number :
  T extends 'string' ? string :
  T extends 'undefined' ? undefined :
  never

export type FromTTypeString<T> =
  T extends 'array' ? [] :
  T extends 'object' ? {} :
  FromTTypePrim<T>

export type TArgNode<T> =
  | TTypePrim
  | Arr<TTypePrim>
  | Arr<Arr<TTypePrim>>
  | [Arr<TTypePrim>, ...TTypePrim[]]
  | { [K in keyof T]: TArgNode<T[K]> }

export type TNode<
  T extends TType[] = TType[],
  C extends { [key: string]: TNode } | undefined = { [key: string]: TNode } | undefined,
  CC extends TType[] = TType[],
> = {
  types: T;
  /** Child types (for non-array objects). */
  children?: C;
  /** Child types (for arrays). */
  contents?: CC;
}

export type TType =
  | 'array'
  | 'object'
  | TTypePrim

export type TTypePrim =
  | 'boolean'
  | 'number'
  | 'string'
  | 'undefined'

export type UOpts = {
  /**
   * Ignore properties that exist in B but not in T (instead of throwing an error).
   * Defaults to false.
   */
  ignore_extra?: boolean;
  /**
   * Ignore properties in B that are not one of the legal types in T (instead of throwing an error).
   * Defaults to false.
   */
  ignore_type?: boolean;
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
    node.types.push(arg);
  }
  // Union
  else if (Array.isArray(arg)) {
    let array_index = -1;

    if (arg.length === 0) { throw new Error('Empty union array.'); }

    for (let i = 0; i < arg.length; i++) {
      const item = arg[i];

      // Array
      if (Array.isArray(item)) {
        if (array_index >= 0) { throw new Error(`No more than one array can be used in a union (first array index: ${array_index}, second array index: ${i}).`); }
        array_index = i;

        if (item.length === 0) { throw new Error('Empty array.'); }

        // Validate array types
        for (let j = 0; j < item.length; j++) {
          if (!isTTypePrim(item[j])) { throw new Error(`Invalid type: ${item[j]}`); }
          if (item.indexOf(item[j], j + 1) >= 0) { throw new Error(`Duplicate type: ${item[j]}`); }
        }

        node.types.push('array');
        node.contents = [ ...item ];
      }
      else {
        if (!isTTypePrim(item)) { throw new Error(`Invalid type: ${item}`); }
        if (arg.indexOf(item, i + 1) >= 0) { throw new Error(`Duplicate type: ${item}`); }

        node.types.push(item);
      }
    }
  }
  // Object
  else if (typeof arg === 'object' && arg !== null) {
    node.types.push('object');
    node.children = {};

    const keys = Object.keys(arg);
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

function isTTypePrim(value: unknown): value is TTypePrim {
  switch (value) {
    case 'boolean':
    case 'number':
    case 'string':
    case 'undefined':
      return true;
    default:
      return false;
  }
}

// @TODO Make it optional to copy missing/invalid values from A (so it becomes a dif instead of a new & updated A)
export function merge_state<T>(t: TNode, a: T, b: DeepPartial<T>, opts?: UOpts): T {
  if (a === b) { return a as any; }

  const b_type = getTType(b);

  if (b_type === undefined) {
    if (opts?.ignore_type) { return a as any; }
    throw new Error(`B is not of an accepted type.`);
  }
  if (t.types.indexOf(b_type) === -1) {
    if (opts?.ignore_type) { return a as any; }
    throw new Error(`B is not of an accepted type for T (B: ${b_type}, T: ${tnodeToString(t)})`);
  }

  switch (b_type) {
    case 'array': {
      if (!t.contents) { throw new Error('Array is missing "contents"'); }

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
          if (t.contents.indexOf(val_type) === -1) {
            if (opts?.ignore_type) { return a as any; }
            throw new Error(`B[${i}] is not of an accepted type for T (B[${i}]: ${val_type}, T: ${typesToString(t.contents)})`);
          }
        }

        return [ ...b_array ] as any;
      } else {
        return a_array as any;
      }

    } break;

    case 'object': {
      if (!t.children) { throw new Error('Object is missing "children"'); }

      const a_object = a as any as { [key: string]: unknown; };
      const b_object = b as any as { [key: string]: unknown; };

      const a_is_not_object = (getTType(a) !== 'object');

      let d_object: { [key: string]: unknown; } | undefined;

      const keys = Object.keys(b_object);
  
      for (const key of keys) {
        if (!(key in t.children)) {
          if (opts?.ignore_extra) { continue; }
          throw new Error(`B has a key that is not present in T (key: "${key}")`);
        }

        const result = merge_state(t.children[key], a_object[key] as any, b_object[key] as any, opts);

        if (a_is_not_object || !(key in a_object) || result !== a_object[key]) {
          if (!d_object) {
            d_object = a_is_not_object
              ? {}
              : { ...a_object };
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
    case 'undefined':
      return b as any; // no need to compare primitives
    
    default:
      throw new Error(`Type "${b_type}" is not implemented!`);
  }
}

function getTType(value: unknown): TType | undefined {
  if (Array.isArray(value)) { return 'array'; }

  switch (typeof value) {
    case 'object':
      if (value !== null) { return 'object'; }
      break;
    case 'boolean': return 'boolean';
    case 'number': return 'number';
    case 'string': return 'string';
    case 'undefined': return 'undefined';
  }

  return undefined;
}

function tnodeToString(node: TNode): string {
  return `[${node.types.join(', ')}]`;
}

function typesToString(types: unknown[]): string {
  return `[${types.join(', ')}]`;
}
