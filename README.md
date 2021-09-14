**WORK IN PROGRESS!**

Ruti is still in development. I won't call it production ready, but the test coverage is close to 100% and I've been using it in production for months. Everything is subject to change, so pay close attention when updating (even between semver patches)!

---

# Ruti

Ruti is a TypeScript library for type checking at runtime.

## Introduction

TypeScript is missing one major feature: _runtime type checking_. This library is an attempt at solving this issue.

But to do type checking at runtime you first need to make your types accessible at runtime. A simple way to achieve this is to declare your types as JavaScript values inside your code _instead_ of TypeScript types, and to then generate TypeScript types from those values. That way you can use the TypeScript types as usual, but you can also use the JavaScript values at runtime. This is the approach Ruti takes.

The JavaScript values, later referred to as ``Arg`` (placeholder name!), are human-readable and resemble TypeScript type declarations somewhat. Because they are optimized for human usability they are not used directly for type checking. Instead they are used to generate machine friendly data structures, referred to as ``Templates``. These ``templates``, together with the generated TypeScript types and the value you want to type check, can then be passed to Ruti's type checking function at any time in your code for runtime type checking!

I'm also experimenting with ways of safely merging two objects of the same type (``merge_state``).

## Examples

You can find code examples in the "examples" directory.

Use ``npm run example <name>`` to run an example (replace ``<name>`` with ``help`` for more information).

## Quickstart

The following code is also hosted on [CodeSandbox](https://codesandbox.io/s/ruti-playground-e4zpg?file=/src/index.ts), in case you prefer a more interactive experience.

### Setting up a template

```ts
// Create a type declaration object
// (The somewhat weird way you declare types for Ruti)
const person_arg = {
  name: 'string',
  age: 'number',
  address: {
    street: 'string',
    zip_code: 'number',
  },
  nicknames: [['string']],
} as const;

// Generate a template
// (Creates machine-friendly data from the human-readable data)
const person_template = create_template(person_arg);

// Generate a TypeScript type
type Person = FromTTypeArg<typeof person_arg>
```

### Creating and updating state

```ts
// Create initial state
const person: Person = {
  name: 'Peter',
  age: 30,
  address: {
    street: 'Somewhere 2',
    zip_code: 12345,
  },
  nicknames: ['Pete', 'Big P'],
};

// Update state
// Note: This does not manipulate "person", instead it returns a copy
const updated_person = merge_state(person_template, person, { age: 31 });

// person.age === 30
// updated_person.age === 31
```

### Checking types

```ts
const person = {
  name: 'Johan',
  age: 55,
  address: {
    street: 'Somewhere 4',
    zip_code: 12345,
  },
  nicknames: ['Mr J'],
};

if (is_type<Person>(person_template, person)) {
  // Note: is_type uses a type guard, so "person" is of type "Person" inside this scope!
  console.log(`"person" is a Person! Their name is ${person.name}.`);
} else {
  console.log('"person" is not a Person. :(');
}
```

## Terms

There are three main concepts in *Ruti*: ``arg``, ``template`` and ``state``.

Note: ``Arg`` and ``State`` are not very fitting terms. They should be replaced.

**Arg** is the human-friendly type declaration that the TypeScript type and template are generated from.

**Template** is the machine-friendly translation of the type declaration. It is used at runtime to determine what types and shapes different states should have (to remain type safe).

**State** is the data that is type checked against a template at runtime. This includes both the data being modified and the data modifying it.

## Functions

### ``create_template(arg)``

This generates a ``template`` from an ``arg``. The purpose is to make the type declarations more concise and readable (and also to make it easier to generate TypeScript types from). This function is optional, you can write templates by hand or load them at runtime.

**Arguments**

* ``arg``: Arg to generate a template from.

**Returns** A ``template`` corresponding to ``arg``. (TODO: Be more specific & list edge cases)

**Throws** if ...

* ``arg`` is not a valid **Arg**.

### ``merge_state(template, a, b, opts?)``

Merge ``b`` into ``a`` and return the result. No argument is modified by this function. Objects are merged recursively (and arrays are *not*).

**Arguments**

* ``template``: Template that ``a`` already conforms to, and ``b`` is compared against.
* ``a``: Current state.
* ``b``: State to apply to ``a``.
* ``opts``: Options for how to merge the states. These options are applied to child objects recursively. (Optional)

**Returns** ...

* ``a``, if ``a`` and ``b`` are strictly equal.
* ``b``, if ``b`` is a primitive value (``boolean``, ``number``, ``string``, ``null`` or ``undefined``).
* A new array, if ``b`` is an array. The new array is a copy of ``b``.
* A new object, if ``b`` is an object. The new object is a copy of ``a`` (or an empty object if ``a`` is not an object) with all properties (listed in ``template.children``) of ``b`` applied to it (if a property is an object, then this function is applied to that as well).

**Throws** if ...

* ``b`` is not of a type listed in ``template.types``.
* ``b`` is an array, and contains a value of a type not that is not listed in ``template.contents``.
* ``b`` is an array, and ``template.contents`` contains ``object`` (because merging arrays of objects is not supported!).
* ``b`` is an object, and contains a property that is not listed in ``template.children`` (unless ``opts.ignore_extra`` is ``true``).
* ``b`` is an object, and contains a property that is listed in ``template.children``, but the types of the properties does not match.
* ``b`` is an object, ``a`` is not an object, and ``b`` does not contain every property listed in ``template.children``.
* ``template`` is not a valid template (this may not catch all template issues).

### ``is_type(template, value, opts?, on_fail?)``

Check if ``value`` conforms to ``template``.

**Arguments**

* ``template``: Template to check conformity against.
* ``value``: Value to check conformity with.
* ``opts``: Options for how to perform the conformity check. These options are applied to child objects recursively. (Optional)
* ``on_fail``: Called if ``value`` does not conform to ``template``. Arguments contains information about how it failed. (Optional)

**Returns** ``true`` if  ``value`` comforms to ``template``, otherwise ``false``.

**Throws** if ...

* ``template`` is not a valid template (this may not catch all template issues).

## Arg structure

### Data types

There are 7 different data types, and they are divided into two categories:

Primitive: ``boolean``, ``number``, ``string``, ``null`` and ``undefined``.

Advanced: ``object`` and ``array``.

### Syntax

Each value can be one of the following:

*Format: ``value`` => ``type``*

* A single primitive type
  - Example: ``'string'`` => ``string``
* An array of primitive types (this results in a union of all the types)
  - Example: ``['string', 'number']`` => ``string | number``
* An array inside another array (this results in an array)
  - Example: ``[['boolean']]`` => ``boolean[]``
  - Example 2: ``[['string', 'number']]`` => ``(string | number)[]``
  - Example 3: ``[['boolean'], ['string', 'number']]`` => ``boolean[] | (string | number)[]``
* An object with primitive or advanced types
  - Example: ``{ x: 'number' }`` => ``{ x: number }``
  - Example: ``{ y: [['string']] }`` => ``{ y: string[] }``
  - Example: ``{ z: { w: 'string' } }`` => ``{ z: { w: string } }``

Notes:
* Unions may not contain more than one object (including inside an array if it is part of the union).
  - ``[[ { x: 'number' } ], 'string']`` and ``[[ 'number' ], { y: 'string' }]`` are fine.
  - ``[[ { x: 'number' } ], { y: 'string' }]`` is forbidden.
* Arrays only support primitive types and _up to_ one object. No nested arrays!
  - ``[[ { x: 'number' } ]]`` and ``[[ { x: 'number' }, 'string' ]]`` are fine.
  - ``[[ { x: 'number' }, { y: 'string' } ]]`` and ``[[ { x: 'number' }, ['string'] ]]`` are forbidden.
* Arrays with objects are _NOT_ supported by ``merge_state`` (because I haven't decided what way they should merge).
* Ruti treats ``null`` as its own primitive (even though it's treated as an ``object`` by Javascript).
