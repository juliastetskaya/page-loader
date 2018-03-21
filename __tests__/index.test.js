import nock from 'nock';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import fs from 'mz/fs';
import os from 'os';
import path from 'path';
import pageLoader from '../src';

axios.defaults.adapter = httpAdapter;

const host = 'https://hexlet.io';
const pathname = '/courses';
const body = `Data from page ${host}${pathname}`;

beforeAll(() => {
  nock.disableNetConnect();
  nock(host).get(pathname).reply(200, body);
});

describe('pageLoader', () => {
  it('#The file is created and filled', async () => {
    const pathToTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pageLoader-'));
    const pathToFile = path.resolve(pathToTmp, 'hexlet-io-courses.html');

    await pageLoader(`${host}${pathname}`, pathToTmp);

    expect((await fs.stat(pathToFile)).isFile()).toBe(true);
    expect((await fs.stat(pathToFile)).isDirectory()).toBe(false);
    expect(await fs.readFile(pathToFile, 'utf-8')).toBe(body);
  });
});
