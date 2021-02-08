import * as fs from 'fs';
import { merge_state, TNode } from '../../src';
import { config_template, createConfigData } from './config_file';

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
  let content = create();

  try {
    const data = await fs.promises.readFile(filepath, { encoding: 'utf8' });

    try {
      const parsed_data = JSON.parse(data);

      console.log('File data:');
      console.log(parsed_data, '\n');

      try {
        content = merge_state(template, content, parsed_data, { ignore_extra: true, ignore_type: true });

      } catch (error) {
        console.error(`Failed to apply data from file "${filepath}".`, error);
      }
    } catch (error) {
      console.error(`Failed to parse data from file "${filepath}".`, error);
    }
  } catch (error) {
    console.error(`Failed to read data from file "${filepath}".`, error);
  }

  return content;
}
