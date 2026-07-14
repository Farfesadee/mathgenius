# Security Guidelines

## Environment Variables

### Never Commit Secrets
- `GROQ_API_KEY` — Groq LLM API key
- `SUPABASE_SERVICE_KEY` — Database admin key (backend only!)
- `SUPABASE_URL` — Can be public, but service key must be secret
- Any private/test API keys

### Safe Practices

1. **Use .env files locally** (never commit)
   ```bash
   cp backend/.env.example backend/.env
   # Fill in credentials
   ```

2. **Use environment variables in production**
   - GitHub Secrets for CI/CD
   - Docker environment variables
   - Cloud provider secrets (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault)

3. **Rotate exposed credentials immediately**
   ```bash
   # If credentials are ever committed:
   # 1. Rotate the credentials immediately
   # 2. Use git filter-branch to remove from history
   # 3. Force-push (if you have permission)
   ```

### Production Deployment

#### Option 1: Docker with Secrets
```bash
docker run -e GROQ_API_KEY=xxx -e SUPABASE_URL=yyy mathgenius:latest
```

#### Option 2: CI/CD with GitHub Secrets
```yaml
env:
  GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
```

#### Option 3: Cloud Provider Secrets
- **AWS**: Use AWS Secrets Manager
- **GCP**: Use Secret Manager
- **Azure**: Use Key Vault
- **Heroku**: Use Config Vars

### Supabase Security

#### Backend
- Use `SUPABASE_SERVICE_KEY` (admin key)
- Keep it secret — never expose to frontend
- Only use in backend code

#### Frontend
- Use `SUPABASE_ANON_KEY` (public key)
- Safe to commit to frontend/.env (it's anonymous)
- Row-Level Security (RLS) protects data

### Authentication

#### JWT Tokens
- Supabase provides signed JWT tokens
- Backend verifies with `require_auth` dependency
- Tokens expire (default: 1 hour)
- Refresh tokens used to get new access tokens

#### API Keys in Frontend
Never expose these in frontend:
- Service role key
- Database passwords
- Admin API keys
- Private encryption keys

---

## Threat Prevention

### SQL Injection
- All database queries use Supabase PostgREST (parameterized)
- Pydantic validates input before DB operations
- ✅ Safe

### Cross-Site Scripting (XSS)
- React auto-escapes template strings
- Math content sanitized with KaTeX
- ✅ Safe

### CSRF
- CORS configured for trusted origins only
- Credentials required for state-changing requests
- ✅ Safe

### Rate Limiting
- Backend: slowapi rate limiter (60 req/min default)
- Set `RATE_LIMIT_PER_MINUTE` in .env
- ✅ Implemented

### CORS
Configure allowed origins in `backend/.env`:
```bash
# Default allows localhost for development
# Production: set specific domains only
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

---

## Monitoring & Logging

### Error Tracking
Integrate Sentry for production errors:
```bash
# Backend
pip install sentry-sdk
```

Update `backend/app/main.py`:
```python
import sentry_sdk
sentry_sdk.init("your-sentry-dsn", environment="production")
```

### Audit Logs
Track:
- User authentication (success/failure)
- Data access patterns
- Sensitive operations (grading, score updates)

---

## Data Privacy

### User Data
- GDPR compliance: Users can request data deletion
- Implement DELETE endpoint for profile
- Database RLS prevents users from accessing others' data

### Student Data Protection
- Use pseudonymous user IDs internally
- Never store PII (phone numbers, addresses) unnecessarily
- Encrypt sensitive fields if stored

### Third-Party Services
- Groq LLM: Read their privacy policy
- Supabase: Read their security docs
- No data shared beyond what's necessary

---

## Checklist Before Production

- [ ] All `.env` files added to `.gitignore`
- [ ] No hardcoded secrets in code
- [ ] CORS configured for production domains only
- [ ] Database RLS policies enabled
- [ ] JWT token expiration set (not infinite)
- [ ] Rate limiting configured
- [ ] Error tracking (Sentry) enabled
- [ ] HTTPS enforced (not HTTP)
- [ ] Database backups configured
- [ ] Security headers set (CSP, X-Frame-Options, etc)
- [ ] Dependencies audited (no known vulnerabilities)
- [ ] Penetration testing planned

---

## Incident Response

### If credentials are exposed:

1. **Immediate**: Rotate all exposed credentials
2. **Within 1 hour**: Run `git filter-branch` to remove from history
3. **Within 24 hours**: Security audit of access logs
4. **Notify users**: If user data was exposed

### Steps to remove from git history:
```bash
# Remove all occurrences of backend/.env
git filter-branch --tree-filter 'rm -f backend/.env' HEAD

# Force push (use with caution)
git push origin --force-with-lease
```

---

## Resources

- OWASP Top 10: https://owasp.org/Top10/
- Supabase Security: https://supabase.com/docs/guides/security
- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
