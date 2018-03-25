import program from 'commander';
import path from 'path';
import pageLoader from '.';
import { version } from '../package.json';

export default () => {
  program
    .version(version)
    .description('Utility for downloading pages from the network.')
    .arguments('<link>')
    .usage('[options] <pathToFolder> <link>')
    .option('-o, --output [pathToFolder]', 'output path to folder', `${path.resolve()}`)
    .action((link, options) => pageLoader(link, options.output)
      .catch((error) => {
        if (error.config) {
          console.error(`Problem with URL: ${error.config.url}`);
        }
        if (error.path) {
          console.error(`Problem with path: ${error.path}`);
        }
        process.exit(1);
      }));

  program.parse(process.argv);
};
