SHELL := /bin/bash

.PHONY: test e2e seed lint typecheck

test:
	npm run test

e2e:
	npm run e2e

seed:
	npm run seed

lint:
	npm run lint

typecheck:
	npm run typecheck

