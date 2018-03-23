#Makefile

install:
	npm install

start:
	npm run babel-node -- src/bin/page-loader.js --output /var/tmp http://posteluxe.ru/catalog/detskoe

publish:
	npm publish

lint:
	npm run eslint .

test:
	npm test

coverage:
	npm test -- --coverage
