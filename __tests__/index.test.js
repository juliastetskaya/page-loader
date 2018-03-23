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
const nameLocalFile = 'design-posteluxe-light-css-animation-1-0-min.css';
const expectedLocalFile = '__tests__/__fixtures__/design-posteluxe-light-css-animation-1-0-min.css';
const mainFileName = 'posteluxe-ru-catalog-detskoe.html';
const localDirectoryName = 'posteluxe-ru-catalog-detskoe_files';

beforeAll(() => nock.disableNetConnect());

beforeEach(() =>
  nock(host, { allowUnmocked: true }).get(pathname).replyWithFile(200, fileBefore));


describe('pageLoader', () => {
  it('#The file is created and filled', async () => {
    const pathToTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pageLoader-'));
    const pathToFile = path.resolve(pathToTmp, mainFileName);

    await pageLoader(`${host}${pathname}`, pathToTmp);

    expect((await fs.stat(pathToFile)).isFile()).toBe(true);
    expect((await fs.stat(pathToFile)).isDirectory()).toBe(false);
  });


  it('#Local files', async () => {
    const pathToTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pageLoader-'));
    const pathToLocalFile = path.join(pathToTmp, localDirectoryName, nameLocalFile);

    await pageLoader(`${host}${pathname}`, pathToTmp);

    const expectedData = await fs.readFile(expectedLocalFile, 'utf-8');
    const receivedData = await fs.readFile(pathToLocalFile, 'utf-8');

    expect(receivedData).toBe(expectedData);
  });


  it('#The file and the directory names', async () => {
    const pathToTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pageLoader-'));

    await pageLoader(`${host}${pathname}`, pathToTmp);

    const files = await fs.readdir(pathToTmp);

    expect(files).toHaveLength(2);
    expect(files[0]).toEqual(mainFileName);
    expect(files[1]).toEqual(localDirectoryName);
  });


  it('#Data replacement', async () => {
    const pathToTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pageLoader-'));
    const pathToFile = path.resolve(pathToTmp, mainFileName);

    await pageLoader(`${host}${pathname}`, pathToTmp);

    expect(await fs.readFile(pathToFile, 'utf-8')).toBe(await fs.readFile(fileAfter, 'utf-8'));
  });
});
