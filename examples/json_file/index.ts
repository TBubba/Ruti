import * as fs from 'fs';
import { merge_state, TNode } from '../../src';
import { config_template, createConfigData } from './config_file';

/*
 * In this example we will load an untrusted JSON file and use merge_state to:
 * 1. Only copy the fields from the JSON that exist in our template
 * 2. Set default values for any missing fields
 * 3. Type check all fields (all incorrectly typed fields will have the default value)
 */

exampleMain();

async function exampleMain() {
  console.log('Default config:');

  console.log(createConfigData(), '\n');

  const config = await parseJsonFile('./config.json', createConfigData, config_template);

  console.log('Final config:');
  console.log(config, '\n');
}

/**
 * Parse a JSON file and enforce a template on the content.
 * @param filepath Path of the JSON file.
 * @param create Function that creates the default object.
 * @param template Template to enforce object by.
 */
async function parseJsonFile<T>(filepath: string, create: () => T, template: TNode): Promise<T> {
  let data: string;
  try {
    data = await fs.promises.readFile(filepath, { encoding: 'utf8' });
  } catch (error) {
    console.error(`Failed to read data from file "${filepath}".`, error);
  }

  let parsed_data: any;
  try {
    parsed_data = JSON.parse(data);
    console.log('File data:');
    console.log(parsed_data, '\n');
  } catch (error) {
    console.error(`Failed to parse data from file "${filepath}".`, error);
  }

  let content = create();
  try {
    content = merge_state(template, content, parsed_data, { ignore_extra: true, ignore_type: true });
  } catch (error) {
    console.error(`Failed to apply data from file "${filepath}".`, error);
  }

  return content;
}
