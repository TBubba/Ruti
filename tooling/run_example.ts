import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

const cmd = 'npm run example';

main();

async function main() {
  const names = process.argv.slice(2);

  if (names.length === 0) {
    help();
  } else if (names.length > 1) {
    console.log(`You must only enter one example name. For help run "${cmd}"`);
  } else {
    const example_name = names[0];

    if (example_name === 'help') {
      help();
      return;
    }

    const examples_directory = path.resolve(__dirname, '../examples');

    const example_path = path.join(examples_directory, example_name);
    
    if (!example_path.startsWith(example_path)) {
      console.log(`The example name must not contain "../"! For help run "${cmd}"`);
      return;
    }

    if (!await exists(path.join(example_path, 'index.ts'))) {
      console.log(`The example was not found. For help run "${cmd}"`);
      return;
    }

    child_process.fork(example_path, [], { cwd: example_path });
  }
}

function help() {
  console.log(
  `Usage: ${cmd} (<name> | help)\n\n`+
  `<name> is the name of an example to run (see the "examples" directory).\n\n`+
  `If "help" or no name is entered, this message will be shown.\n\n`+
  `Examples: ${cmd} json_file\n`+
  `          ${cmd} help\n`);
}

function exists(filepath: string): Promise<boolean> {
  return fs.promises.stat(filepath)
    .then(()  => true)
    .catch(() => false);
}
