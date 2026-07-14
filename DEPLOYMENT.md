# MathGenius Deployment Guide

## Production Checklist

### Pre-Deployment
- [ ] All tests pass locally: `pytest` + `npm test`
- [ ] No secrets in .env files committed to git
- [ ] Code reviewed and approved
- [ ] Security audit completed
- [ ] Database migrations tested
- [ ] Environment variables documented
- [ ] CI/CD pipeline is green

### Infrastructure
- [ ] Cloud provider account set up (Heroku, Railway, Render, AWS, GCP, Azure)
- [ ] Database configured (Supabase production instance)
- [ ] Storage configured (file uploads if needed)
- [ ] CDN configured (for static assets)
- [ ] Custom domain configured

---

## Environment Variables (Production)

### Backend
Set these in your deployment platform (NOT in .env file):

```env
# Application
APP_NAME=MathGenius
ENVIRONMENT=production
LOG_LEVEL=INFO

# API Keys
GROQ_API_KEY=your_production_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_production_service_key

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100

# Optional: Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project

# Optional: Mail Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password
```

### Frontend
Set in deployment platform:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key
```

---

## Deployment Platforms

### Option 1: Heroku (Simple, Recommended for Learning)

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create mathgenius-prod

# Set environment variables
heroku config:set GROQ_API_KEY=xxx SUPABASE_URL=yyy

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Option 2: Docker to Cloud Run (GCP)

```bash
# Build image
docker build -t mathgenius .

# Tag for GCP
docker tag mathgenius gcr.io/your-project/mathgenius

# Push to Google Container Registry
docker push gcr.io/your-project/mathgenius

# Deploy to Cloud Run
gcloud run deploy mathgenius \
  --image gcr.io/your-project/mathgenius \
  --set-env-vars=GROQ_API_KEY=xxx,SUPABASE_URL=yyy
```

### Option 3: Railway.app (Modern Alternative)

```bash
# Connect GitHub repo via Railway dashboard
# Detect Dockerfile automatically
# Configure environment variables in Railway UI
# Deploy with git push
```

### Option 4: AWS (EC2 + ECS)

```bash
# Create ECR repository
aws ecr create-repository --repository-name mathgenius

# Build and push
docker build -t mathgenius .
docker tag mathgenius:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/mathgenius:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/mathgenius:latest

# Deploy with ECS task
```

---

## Database Setup (Supabase)

### Production Instance
1. Create a new Supabase project (separate from dev)
2. Run migrations:
   ```bash
   # Use your production Supabase credentials
   ```

### Backup Strategy
```bash
# Daily automated backups via Supabase
# Manual backup:
pg_dump "postgresql://user:pass@db.supabase.co/postgres" > backup.sql

# Restore:
psql "postgresql://user:pass@db.supabase.co/postgres" < backup.sql
```

### Row-Level Security (RLS)
Ensure RLS policies are enabled on all tables:
```sql
-- Users can only see/modify their own data
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

---

## SSL/TLS Certificate

### Automatic (Recommended)
Most platforms handle this automatically. Just use `https://yourdomain.com`

### Manual (Let's Encrypt)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d yourdomain.com

# Renew automatically
sudo systemctl enable certbot.timer
```

---

## Monitoring & Logging

### Error Tracking (Sentry)
```python
# In backend/app/main.py
import sentry_sdk
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=settings.environment,
    traces_sample_rate=0.1,
)
```

### Application Metrics
- Response time P95: Target < 500ms
- Error rate: Target < 1%
- Uptime: Target > 99.9%

### Log Aggregation
Options:
- Heroku: Built-in logging
- GCP: Cloud Logging
- AWS: CloudWatch
- Self-hosted: ELK Stack, Loki, Datadog

---

## Performance Optimization

### Frontend
```javascript
// Enable production mode
NODE_ENV=production npm run build

// Result should be highly optimized bundle
```

### Backend
```python
# Use production ASGI server
gunicorn --workers 4 --worker-class uvicorn.workers.UvicornWorker app.main:app
```

### Caching
- Redis for session caching
- CDN for static assets
- Browser caching via HTTP headers

---

## Security Hardening

### HTTPS
- Enforce HTTPS only
- Set HSTS header: `Strict-Transport-Security: max-age=31536000`

### CORS
Configure specific origins:
```python
allowed_origins = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
```

### Rate Limiting
```bash
# Production rate limits
RATE_LIMIT_PER_MINUTE=100
```

### Database
- Enable Supabase database backups
- Restrict access by IP (if applicable)
- Use strong passwords
- Never use production credentials locally

---

## Disaster Recovery

### If Database Fails
1. Restore from latest backup
2. Test restored data
3. Switch to backup database

### If API Server Fails
1. Kubernetes auto-restarts (if using k8s)
2. Manual restart via cloud provider dashboard
3. Health checks trigger alerts

### If DNS Fails
1. Update DNS records
2. Switch to backup domain if configured
3. Update client apps with new URL

---

## Continuous Deployment (CD)

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: "mathgenius-prod"
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
```

---

## Monitoring Commands

### Check health
```bash
curl https://yourdomain.com/health
```

### View logs
```bash
# Heroku
heroku logs --tail

# Docker
docker logs -f container_name

# Kubernetes
kubectl logs -f deployment/mathgenius
```

### Database stats
```sql
-- Connection count
SELECT COUNT(*) FROM pg_stat_activity;

-- Slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

---

## Rollback Procedure

If a deployment causes issues:

```bash
# Heroku
heroku releases
heroku rollback v123

# Docker/Kubernetes
kubectl rollout history deployment/mathgenius
kubectl rollout undo deployment/mathgenius

# Manual
git revert <commit-hash>
git push origin main
# Re-deploy
```

---

## Support & Debugging

### Common Issues

**"502 Bad Gateway"**
- Check backend service is running: `curl https://api.yourdomain.com/health`
- Check error logs for crashes
- Verify environment variables are set

**"Database connection refused"**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Check network connectivity to Supabase
- Verify IP whitelist if configured

**"Rate limit exceeded"**
- Increase `RATE_LIMIT_PER_MINUTE`
- Implement client-side request caching
- Implement exponential backoff retry

### Get Help
- GitHub Issues: Report bugs
- Discussions: Ask questions
- Discord/Community: Real-time chat
