# Ruti

**WORK IN PROGRESS! NOT READY FOR PRODUCTION!**

Enforce type safety at runtime with declarative type definitions.

## Purpose

Writing and maintaining type safe parsers can be exhausting and error prone. With *Ruti* you only have to declare a type once to get type safety at both runtime and compile time.

## Quickstart

### Setting up a template

```ts
// Create a type declaration object
const person_arg = {
  name: 'string',
  age: 'number',
  address: {
    street: 'string',
    city: 'string',
    zip_code: 'number',
  },
  nicknames: [['string']],
} as const;

// Generate a template
const person_template = tt_create(arg);

// Optional: Generate a type
type Person = FromTTypeArg<typeof arg>
```

### Creating and updating state

```ts
// Create initial state
const person: Person = {
  name: 'Aaron',
  age: 30,
  address: {
    street: 'Somewhere 2',
    city: 'Someplace',
    zip_code: 12345,
  },
  nicknames: ['A Aron', 'oi'],
};

// Update state
// Note: This does not manipulate "person", instead it returns a copy
const updated_person = tt_update(person_template, person, { age: 31 });

// person.age === 30
// updated_person.age === 31
```

## Terms

There are three main concepts in *Ruti*: ``arg``, ``template`` and ``state``.

Note: ``Arg`` and ``State`` are not very fitting terms. They should be replaced.

**Arg** is the human-friendly type declaration that the TypeScript type and template are generated from.

**Template** is the machine-friendly translation of the type declaration. It is used at runtime to determine what types and shapes different states should have (to remain type safe).

**State** is the data that is type checked against a template at runtime. This includes both the data being modified and the data modifying it.

## Functions

### ``tt_create(arg)``

This generates a ``template`` from an ``arg``. The purpose is to make the type declarations more concise and readable (and also to make it easier to generate TypeScript types from). This function is optional, you can write templates by hand or load them at runtime.

**Arguments**

* ``arg``: Arg to generate a template from.

**Returns** A ``template`` corresponding to ``arg``.

**Throws** if ...

* ``arg`` is not a valid **Arg**.

### ``tt_update(template, a, b, opts?)``

Merge ``b`` into ``a`` and return the result. No argument is modified by this function. Objects are merged recursively (and arrays are *not*).

**Arguments**

* ``template``: Template that ``a`` already conforms to, and ``b`` is compared against.
* ``a``: Current state.
* ``b``: State to apply to ``a``.
* ``opts``: Options for how to apply the update. This is applied recursively. (Optional)

**Returns** ...

* ``a``, if ``a`` and ``b`` are strictly equal.
* ``b``, if ``b`` is a primitive value (``boolean``, ``number``, ``string`` or ``undefined``).
* A new array, if ``b`` is an array. The new array is a copy of ``b``.
* A new object, if ``b`` is an object. The new object is a copy of ``a`` (or an empty object if ``a`` is not an object) with all properties (listed in ``template.children``) of ``b`` applied to it (if a property is an object, then this function is applied to that as well).

**Throws** if ...

* ``b`` is not a valid type of ``template``.
* ``b`` is an array, and contains a type that is not listed in ``template.contents``.
* ``b`` is an object, and contains a property not listed in ``template.children`` (unless ``opts.ignore_extra`` is ``true``).
* ``b`` is an object, and contains a property that is listed in ``template.children`` but is not of the same type.

## Arg structure

### Data types

There are 6 different data types, and they are divided into two categories:

Primitive: ``boolean``, ``number``, ``string`` and ``undefined``.

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

Notes:
* Only primitive types can be used in unions (you must not use ``objects`` or ``arrays`` in unions).
* Arrays only support primitive types (no nested arrays and no objects).
