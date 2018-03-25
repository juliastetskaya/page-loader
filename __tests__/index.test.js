import nock from 'nock';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import fs from 'mz/fs';
import os from 'os';
import path from 'path';
import pageLoader from '../src';

axios.defaults.adapter = httpAdapter;

const host = 'http://posteluxe.ru';
const pathname = '/catalog/detskoe';
const fileBefore = '__tests__/__fixtures__/fileBefore.html';
const fileAfter = '__tests__/__fixtures__/fileAfter.html';
const localFileName = 'design-posteluxe-light-css-bootstrap-min.css';
const pathToExpectedFile = '__tests__/__fixtures__/design-posteluxe-light-css-bootstrap-min.css';
const mainFileName = 'posteluxe-ru-catalog-detskoe.html';
const resoursesDir = 'posteluxe-ru-catalog-detskoe_files';

beforeAll(() => nock.disableNetConnect());

beforeEach(() =>
  nock(host)
    .get(pathname)
    .replyWithFile(200, fileBefore)
    .get('/design/posteluxe_light/css/bootstrap.min.css')
    .replyWithFile(200, pathToExpectedFile));


describe('pageLoader', () => {
  it('#The file and the directory names', async () => {
    const pathToTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pageLoader-'));

    await pageLoader(`${host}${pathname}`, pathToTmp);

    const files = await fs.readdir(pathToTmp);

    expect(files).toHaveLength(2);
    expect(files[0]).toEqual(mainFileName);
    expect(files[1]).toEqual(resoursesDir);
  });


  it('#Local files', async () => {
    const pathToTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pageLoader-'));
    const pathToReceivedFile = path.join(pathToTmp, resoursesDir, localFileName);

    await pageLoader(`${host}${pathname}`, pathToTmp);

    const expectedData = await fs.readFile(pathToExpectedFile, 'utf-8');
    const receivedData = await fs.readFile(pathToReceivedFile, 'utf-8');

    expect(receivedData).toBe(expectedData);
  });


  it('#Data replacement', async () => {
    const pathToTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pageLoader-'));
    const pathToFile = path.resolve(pathToTmp, mainFileName);

    await pageLoader(`${host}${pathname}`, pathToTmp);

    const mainDataBefore = await fs.readFile(pathToFile, 'utf-8');
    const mainDataAfter = await fs.readFile(fileAfter, 'utf-8');

    expect((await fs.stat(pathToFile)).isFile()).toBe(true);
    expect((await fs.stat(pathToFile)).isDirectory()).toBe(false);
    expect(mainDataBefore).toBe(mainDataAfter);
  });

  it('#Error EEXIST', async () => {
    nock(host).get(pathname).reply(200);
    const pathToTmp = '/home/juliast/Документы/posteluxe-ru-catalog-detskoe_files';

    try {
      await pageLoader(`${host}${pathname}`, pathToTmp);
    } catch (err) {
      expect(err.code).toEqual('EEXIST');
    }
  });


  it('#Error 404', async () => {
    nock(host).get('/badpage').reply(404);
    const pathToTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pageLoader-'));

    try {
      await pageLoader(`${host}/badpage`, pathToTmp);
    } catch (err) {
      expect(err.message).toEqual('Request failed with status code 404');
    }
  });


  it('#Error path', async () => {
    nock(host).get(pathname).reply(200);

    try {
      await pageLoader(`${host}${pathname}`, '/home/juliast/Документы/posteluxe');
    } catch (err) {
      expect(err.code).toEqual('ENOENT');
    }
  });
});
