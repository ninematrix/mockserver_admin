docker compose down
docker image rm mockserver_admin-admin
docker compose build --no-cache
docker compose up -d
docker logs mockserver -f