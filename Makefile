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

debug:
	DEBUG=page-loader:* npm run babel-node -- src/bin/page-loader.js http://posteluxe.ru/catalog/detskoe

debug-test:
	DEBUG=page-loader:* npm test
