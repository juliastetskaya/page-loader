import axios from 'axios';
import url from 'url';
import fs from 'mz/fs';
import path from 'path';
import cheerio from 'cheerio';
import _ from 'lodash';
import debug from 'debug';
import Listr from 'listr';

const success = debug('page-loader: success');
const warn = debug('page-loader: warn');

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

const loadResources = (mainLink, localLinks, pathToResourcesDir) => {
  const uniqueLinks = _.union(localLinks);
  const promises = uniqueLinks.map((link) => {
    const localFileName = getLocalFileName(link);
    const fullPath = path.resolve(pathToResourcesDir, localFileName);
    const fullLink = getFullLink(link, mainLink);

    const list = new Listr([
      {
        title: `${fullLink}`,
        task: () =>
          axios.get(fullLink, { responseType: 'arraybuffer' })
            .then(response => fs.writeFile(fullPath, response.data))
            .then(() => success(`The resourse '${fullLink}' was downloaded!`))
            .catch(error => warn(`The resourse '${localFileName}' is not download. Error: ${error.message}`)),
      },
    ]);
    return list.run();
  });
  return Promise.all(promises)
    .then(() => success(`All local resourses saved in directory '${pathToResourcesDir}'!\n`))
    .catch(error => warn(error));
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
      success(`Connection established! Status: ${response.status}\n`);
      ({ data } = response);
      return data;
    })
    .then((dataResponse) => {
      success('Data from the server was received!\n');
      return fs.writeFile(pathToMainFile, dataResponse);
    })
    .then(() => {
      success(`The page was downloaded as '${mainFileName}'\n`);
      localLinks = getLocalLinks(data, mainLink);
      success('Local references were collected!\n');
      const newData = replaceLinks(data, localLinks, resourcesDir);
      return fs.writeFile(pathToMainFile, newData);
    })
    .then(() => {
      success(`All local references were replaced in file ${mainFileName}!\n`);
      return fs.mkdir(pathToResourcesDir);
    })
    .then(() => {
      success(`Directory for resorces was created as '${resourcesDir}'!\n`);
      return loadResources(mainLink, localLinks, pathToResourcesDir);
    })
    .then(() => success('The application was completed successfully!\n'))
    .catch((error) => {
      warn(error.message);
      throw error;
    });
};
