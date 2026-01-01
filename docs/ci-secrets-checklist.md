# CI Secrets Checklist

**Platform:** GitHub Actions  
**Repository:** NeuralDeckProjects

---

## Required Secrets

### ✅ None Currently Required

The CI pipeline runs without any required secrets. All tests execute in public mode.

---

## Optional Secrets (For Notifications)

### SLACK_WEBHOOK (Optional)

**Purpose:** Send failure notifications to Slack channel

**When to add:** If team wants real-time failure alerts

**Setup:**
1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Copy webhook URL
3. Add to GitHub Secrets: `Settings → Secrets and variables → Actions → New repository secret`
4. Name: `SLACK_WEBHOOK`
5. Value: `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`

**Usage in workflow:**
```yaml
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### DISCORD_WEBHOOK (Optional)

**Purpose:** Send failure notifications to Discord channel

**Alternative to Slack**

**Setup:**
1. Create Discord webhook: https://discord.com/developers/docs/resources/webhook
2. Copy webhook URL
3. Add to GitHub Secrets: `DISCORD_WEBHOOK`
4. Use similar notification action

---

## Environment Variables

### CI Environment Variables (Auto-set by GitHub Actions)

These are automatically set by GitHub Actions - no configuration needed:

- `CI=true` - Indicates running in CI
- `GITHUB_REF` - Branch/tag reference
- `GITHUB_SHA` - Commit SHA
- `GITHUB_EVENT_NAME` - Event type (push, pull_request, etc.)

### Test Environment Variables

Configured in `.env` (local) or GitHub Actions secrets (CI):

- `BASE_URL` - Application URL (default: http://localhost:5173)
- `API_URL` - Backend API URL (default: http://localhost:3001/api)
- `TEST_ENV` - Environment name (local, staging, production)

**Current setup:** Uses defaults from `playwright.config.ts`

---

## Security Best Practices

### ✅ Do's

- ✅ Store secrets in GitHub Secrets (never commit)
- ✅ Use least privilege (only necessary secrets)
- ✅ Rotate secrets periodically
- ✅ Use environment-specific secrets (staging vs production)

### ❌ Don'ts

- ❌ Never commit secrets to repository
- ❌ Don't log secrets in CI output
- ❌ Don't share secrets in PR comments
- ❌ Don't use production secrets in test environments

---

## Adding New Secrets

**Process:**

1. **Identify need** - What secret is required?
2. **Create secret** - In GitHub repository settings
3. **Update workflow** - Reference secret: `${{ secrets.SECRET_NAME }}`
4. **Test locally** - Use `.env` file for local testing
5. **Document** - Update this checklist

**Example:**
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm run test:e2e
  env:
    API_KEY: ${{ secrets.API_KEY }}
```

---

## Verification

**Check secrets are configured:**

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Verify required secrets exist
3. Test workflow run to confirm secrets are accessible

**Note:** Secrets are masked in logs - you won't see their values in CI output.

---

**Last Updated:** 2025-12-20  
**Maintained by:** Test Architect (Murat)
