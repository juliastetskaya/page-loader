import axios from 'axios';
import url from 'url';
import fs from 'mz/fs';
import path from 'path';

export default (link, pathToFolder = path.resolve()) => {
  const { host, query, pathname } = url.parse(link);
  const partsUrl = [host, query, pathname].filter(value => value !== null);
  const fileName = `${partsUrl.join('').replace(/\W+/gi, '-')}.html`;
  const filePath = path.resolve(pathToFolder, fileName);
  return axios.get(link)
    .then(response => ((response.status !== 200) ? new Error(`Status ${response.status}!`) : response.data))
    .then(data => fs.writeFile(filePath, data))
    .then(() => console.log('The file was created!'))
    .catch(error => console.log(error.message));
};
