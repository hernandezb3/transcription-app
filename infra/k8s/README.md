# Deploying the transcription app to DigitalOcean Kubernetes

Target: DOKS cluster `okeanoslabs-cluster` (sfo2), namespace `transcription`.

- **Frontend** (`transcription-ui`) — public, at `https://transcriptions-uconn.okeanoslabs.com`
- **Backend** (`transcription-api`) — internal only (ClusterIP); the Next.js server proxies to it
- **Registry** — `registry.digitalocean.com/okeanoslabs-registry` (images `transcription-ui`, `transcription-api`)
- **Database** — `transcriptions` DB + user in the `portfolio-management` managed Postgres cluster
- **Storage** — DigitalOcean Spaces (S3), configured via the `storage_config` secret key
- **TLS** — cert-manager `letsencrypt-prod` (issues after DNS resolves to the ingress LB `178.128.128.110`)

Everyday deploys happen automatically via GitHub Actions (`.github/workflows/deploy.yml`)
on push to `main`. The steps below are the one-time bootstrap / manual fallback.

## Prerequisites
```bash
export DIGITALOCEAN_ACCESS_TOKEN=<do token>        # from secrets.env
doctl kubernetes cluster kubeconfig save okeanoslabs-cluster
```

## 1. Registry pull secret (once per namespace)
```bash
kubectl apply -f infra/k8s/namespace.yaml
doctl registry kubernetes-manifest --namespace transcription | kubectl apply -f -
# creates Secret `registry-okeanoslabs-registry` in the transcription namespace
```

## 2. App secret (never committed — created from real values)
```bash
kubectl -n transcription create secret generic transcription-api-settings \
  --from-literal=db_connection_string='postgresql+asyncpg://transcriptions:<PW>@portfolio-management-do-user-36216379-0.g.db.ondigitalocean.com:25060/transcriptions' \
  --from-literal=storage_config='{"Bucket":"<bucket>","ContainerName":"<bucket>","Region":"<region>","Endpoint":"https://<region>.digitaloceanspaces.com","AccessKey":"<key>","SecretKey":"<secret>"}' \
  --from-literal=JWT_SECRET_KEY='<long-random-string>' \
  --dry-run=client -o yaml | kubectl apply -f -
```
See `secret.example.yaml` for the shape.

## 3. Deploy workloads
```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/api.yaml
kubectl apply -f infra/k8s/ui.yaml
kubectl apply -f infra/k8s/ingress.yaml
kubectl -n transcription rollout status deploy/transcription-api
kubectl -n transcription rollout status deploy/transcription-ui
```

## 4. DNS (manual — okeanoslabs.com is not managed in DigitalOcean)
Add an A record:
```
transcriptions-uconn.okeanoslabs.com  →  178.128.128.110
```
cert-manager issues the Let's Encrypt cert automatically once the record resolves.
Check with: `kubectl -n transcription get certificate,order,challenge`.

## Database migrations
Alembic migrations run against the `transcriptions` DB. See `backend/alembic`.
```bash
cd backend
AppEnvironment=public db_connection_string='postgresql+psycopg2://...' alembic upgrade head
```
