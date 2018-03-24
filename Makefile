#Makefile

install:
	npm install

start:
	npm run babel-node -- src/bin/page-loader.js http://posteluxe.ru/catalog/detskoe

publish:
	npm publish

lint:
	npm run eslint .

test:
	npm test

coverage:
	npm test -- --coverage

start-debug:
	DEBUG=page-loader:* npm run babel-node -- src/bin/page-loader.js http://posteluxe.ru/catalog/detskoe

test-debug:
	DEBUG=page-loader:* npm test

total-debug:
	DEBUG=* npm run babel-node -- src/bin/page-loader.js http://posteluxe.ru/catalog/detskoe
