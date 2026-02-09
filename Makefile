dev-backend:
	cd src && uvicorn main:app --reload

dev-frontend:
	cd src/frontend && npm start

docker-up:
	docker-compose up --build

docker-down:
	docker-compose down -v

savepoint:
	@if [ -z "$(VERSION)" ]; then echo "VERSION is required"; exit 1; fi
	git tag -a $(VERSION) -m "EOEX stable $(VERSION)"
	git push origin $(VERSION)

rollback:
	@if [ -z "$(VERSION)" ]; then echo "VERSION is required"; exit 1; fi
	git checkout $(VERSION)
	git checkout -b hotfix/rollback-$(VERSION)
