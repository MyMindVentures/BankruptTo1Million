# Hostinger VPS deployment

This deployment keeps Traefik as the public reverse proxy and runs the website as its own Docker container.

## 1. DNS

Point both records to the public IPv4 address of the Hostinger VPS:

- `A` record: `@`
- `A` record: `www`

## 2. Confirm the existing Traefik configuration

Run on the VPS:

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
docker network ls
docker inspect $(docker ps -q --filter "ancestor=traefik") --format '{{json .NetworkSettings.Networks}}'
docker inspect $(docker ps -q --filter "ancestor=traefik") --format '{{json .Config.Cmd}}'
```

Use the results to confirm the network, HTTPS entrypoint and certificate resolver names.

## 3. Clone and configure

```bash
cd /opt
git clone https://github.com/MyMindVentures/BankruptTo1Million.git
cd BankruptTo1Million
cp .env.hostinger.example .env.hostinger
nano .env.hostinger
```

Do not commit `.env.hostinger`. Add a GitHub token only when the public GitHub API rate limit is insufficient.

## 4. Build and start

```bash
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml config
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml up -d --build
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml ps
docker logs --tail 100 bankrupt-to-1-million
```

The container listens internally on port `3000`. No host port is published; Traefik reaches it through the shared external Docker network.

## 5. Verify

```bash
curl -I https://bankruptto1million.com
curl -I https://www.bankruptto1million.com
curl https://bankruptto1million.com/api/impact
```

`www` is redirected permanently to the root domain.

## 6. Updating the website

```bash
cd /opt/BankruptTo1Million
git pull origin main
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml up -d --build
docker image prune -f
```

Keep Railway running until the Hostinger deployment, HTTPS, API routes and Supabase-backed functionality have all been verified.
