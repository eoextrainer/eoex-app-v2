dev-backend:
	cd src && uvicorn main:app --reload

dev-frontend:
	cd src/frontend && npm start

docker-up:
	docker-compose up --build

docker-down:
	docker-compose down -v
