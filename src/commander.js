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
    .action((link, options) => pageLoader(link, options.output));

  program.parse(process.argv);
};
