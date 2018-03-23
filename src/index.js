import axios from 'axios';
import url from 'url';
import fs from 'mz/fs';
import path from 'path';
import cheerio from 'cheerio';
import _ from 'lodash';

const parseTags = {
  img: 'src',
  script: 'src',
  link: 'href',
};

const getName = (link, ext) => {
  const { host, query, pathname } = url.parse(link);
  const partsUrl = [host, query, pathname].filter(value => value !== null);
  return `${partsUrl.join('').replace(/\W+/gi, '-')}${ext}`;
};

const getLocalFileName = (link) => {
  const { pathname } = url.parse(link);
  const correctPathName = pathname[0] === '/'
    ? pathname.slice(1, -path.extname(pathname).length)
    : pathname.slice(0, -path.extname(pathname).length);
  return `${correctPathName.replace(/[^A-Za-z0-9]/gi, '-')}${path.extname(pathname)}`;
};

const getOnlyLocalLinks = (links, mainLink) => {
  const mainHost = url.parse(mainLink).host;
  return links.filter((link) => {
    const { host } = url.parse(link);
    return (host === null || host === mainHost);
  });
};

const getFullLink = (link, mainLink) => {
  const { protocol } = url.parse(mainLink);
  const mainHost = url.parse(mainLink).host;
  const { host } = url.parse(link);
  return (host === null) ? url.format({ protocol, host: mainHost, pathname: link }) : link;
};

const downloadPages = (mainLink, links, folderName, pathToFolder) => {
  const localLinks = getOnlyLocalLinks(_.union(links), mainLink);
  return localLinks.forEach((link) => {
    const fullLink = getFullLink(link, mainLink);
    const fullPath = path.resolve(pathToFolder, folderName, getLocalFileName(link));

    return axios.get(fullLink, { responseType: 'arraybuffer' })
      .then(response => fs.writeFile(fullPath, response.data))
      .catch(error =>
        ((error.response.status === 404) ? Promise.resolve() : Promise.reject(error)));
  });
};

const getLinks = (data) => {
  const refs = [];
  const $ = cheerio.load(data);
  const strTags = Object.keys(parseTags).join(', ');
  $(strTags).each((index, value) => {
    const { tagName } = $(value).get(0);
    const attr = parseTags[tagName];
    refs.push($(value).attr(attr));
  });
  return refs.filter(elem => elem !== undefined);
};

const replaceLinks = (data, links, folderName) => links.reduce((acc, link) =>
  acc.replace(link, path.join(folderName, getLocalFileName(link))), data);


export default (mainLink, pathToFolder = path.resolve()) => {
  const mainFileName = getName(mainLink, '.html');
  const mainDirectory = getName(mainLink, '_files');
  const pathToMainFile = path.resolve(pathToFolder, mainFileName);
  const pathToMainDirectory = path.resolve(pathToFolder, mainDirectory);

  return axios.get(mainLink)
    .then((response) => {
      fs.writeFile(pathToMainFile, response.data);
      console.log(`Page was downloaded as '${mainFileName}'\n`);
      return response.data;
    })
    .then((data) => {
      const links = getLinks(data);
      console.log('Local references were collected!\n');
      const newData = replaceLinks(data, getOnlyLocalLinks(links, mainLink), mainDirectory);
      fs.writeFile(pathToMainFile, newData);
      console.log('All local references were replaced!\n');
      return links;
    })
    .then((links) => {
      fs.mkdir(pathToMainDirectory);
      console.log(`Directory for local files was created as '${mainDirectory}'!\n`);
      return links;
    })
    .then(links => downloadPages(mainLink, links, pathToMainDirectory, pathToFolder))
    .then(() => console.log('Local files were downloaded!'))
    .catch(error => Promise.reject(error));
};
