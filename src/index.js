import axios from 'axios';
import url from 'url';
import fs from 'mz/fs';
import path from 'path';
import cheerio from 'cheerio';
import _ from 'lodash';
import debug from 'debug';

const ERROR = debug('page-loader: ERROR');
const debugMainFunc = debug('page-loader: debugMainFunc');
const debugLoadPages = debug('page-loader: debugLoadPages');
const log = console.log.bind(console);

const parseTags = {
  img: 'src',
  script: 'src',
  link: 'href',
};

const getName = (link, ext) => {
  const { host, pathname } = url.parse(link);
  return `${[host, pathname].join('').replace(/\W+/gi, '-')}${ext}`;
};

const getLinks = (data) => {
  const links = [];
  const $ = cheerio.load(data);
  const strTags = Object.keys(parseTags).join(', ');
  $(strTags).each((index, value) => {
    const { tagName } = $(value).get(0);
    const attr = parseTags[tagName];
    links.push($(value).attr(attr));
  });
  return links.filter(elem => elem !== undefined);
};

const getLocalLinks = (data, mainLink) => {
  const links = getLinks(data);
  const mainHost = url.parse(mainLink).host;
  return links.filter((link) => {
    const { host } = url.parse(link);
    return (host === null || host === mainHost);
  });
};

const getLocalFileName = (link) => {
  const { pathname } = url.parse(link);
  const pathNameWithoutExt = pathname.slice(0, -path.extname(pathname).length);
  return `${pathNameWithoutExt.replace(/[^A-Za-z0-9]/gi, '-')}${path.extname(pathname)}`;
};

const getFullLink = (link, mainLink) => {
  const { protocol, host } = url.parse(mainLink);
  const localHost = url.parse(link).host;
  return (localHost === null) ? url.format({ protocol, hostname: host, pathname: link }) : link;
};

const downloadPages = (mainLink, localLinks, pathToResourcesDir) => {
  const promises = _.union(localLinks).map((link) => {
    const fullLink = getFullLink(link, mainLink);
    const fullPath = path.resolve(pathToResourcesDir, getLocalFileName(link));

    return axios.get(fullLink, { responseType: 'arraybuffer' })
      .then((response) => {
        debugLoadPages('The local file was downloaded!');
        return fs.writeFile(fullPath, response.data);
      })
      .catch((error) => {
        ERROR(`The file is not download. Error: ${error.message}`);
        return Promise.resolve();
      });
  });
  return Promise.all(promises)
    .then(() => log('All local files were downloaded!\n'))
    .catch(error => ERROR(error.message));
};

const replaceLinks = (data, localLinks, resourcesDir) => localLinks.reduce((acc, link) =>
  acc.replace(link, path.join(resourcesDir, getLocalFileName(link))), data);


export default (mainLink, pathToTmp = path.resolve()) => {
  const mainFileName = getName(mainLink, '.html');
  const resourcesDir = getName(mainLink, '_files');
  const pathToMainFile = path.resolve(pathToTmp, mainFileName);
  const pathToResourcesDir = path.resolve(pathToTmp, resourcesDir);
  let data = '';
  let localLinks = [];

  return axios.get(mainLink)
    .then((response) => {
      debugMainFunc('Data from the server was received!\n');
      ({ data } = response);
      return data;
    })
    .then(dataResponse => fs.writeFile(pathToMainFile, dataResponse))
    .then(() => log(`The page was downloaded as '${mainFileName}'\n`))
    .then(() => {
      localLinks = getLocalLinks(data, mainLink);
      debugMainFunc('Local references were collected!\n');
      const newData = replaceLinks(data, localLinks, resourcesDir);
      return fs.writeFile(pathToMainFile, newData);
    })
    .then(() => {
      debugMainFunc('All local references were replaced!\n');
      return fs.mkdir(pathToResourcesDir);
    })
    .then(() => {
      debugMainFunc(`Directory for resorces was created as '${resourcesDir}'!\n`);
      return downloadPages(mainLink, localLinks, pathToResourcesDir);
    })
    .then(() => log('The application was completed successfully!\n'))
    .catch(error => ERROR(error.message));
};
