# 🤖 Automated Code Review

NeuralDeck uses GitHub Actions to automatically review pull requests for security, performance, and architectural issues.

## 📋 How It Works

When you create or update a PR, the automated review bot will:

1. **Security Review** 🔒 - Checks for:
   - Hardcoded secrets or API keys
   - Dangerous code patterns (eval, innerHTML)
   - Console statements in production code
   - Potential security vulnerabilities

2. **Performance Review** ⚡ - Checks for:
   - PR size (warns if >500 lines, blocks if >1000)
   - New dependencies and bundle impact
   - TODO/FIXME comments
   - Performance anti-patterns

3. **Architecture Review** 🏗️ - Checks for:
   - TypeScript usage (no .js/.jsx files)
   - Test coverage for new files
   - Proper error handling in async code
   - File organization and structure

## 🚀 Triggering a Review

### Automatic
Reviews run automatically when you:
- Open a new PR
- Push changes to an existing PR
- Synchronize the PR branch

### Manual
To re-run a review, comment on the PR:
```
/review
```

Or use the CLI helper:
```bash
./scripts/review-pr.sh <PR_NUMBER>
```

## 📊 Review Results

The bot will post a summary comment with:
- ✅ Passed checks
- ⚠️ Warnings (non-blocking)
- 🚨 Issues (blocking)
- Auto-applied labels

### Labels Applied

- `security-review-required` - Security issues found
- `needs-optimization` - Performance issues found
- `needs-refactoring` - Architecture issues found
- `ready-for-review` - All checks passed

## ⚙️ Configuration

The review behavior is configured in `.github/review-config.yml`:

```yaml
review:
  auto-trigger: true
  required-checks:
    - security
    - architecture
  optional-checks:
    - performance
    - style
```

## 🔧 Customizing Rules

### Adding Security Patterns

Edit `.github/review-config.yml`:

```yaml
security:
  patterns:
    - pattern: 'dangerousFunction\s*\('
      severity: critical
      message: 'This function is dangerous'
```

### Adjusting Size Limits

```yaml
performance:
  limits:
    max-lines-per-pr: 500
    max-files-per-pr: 20
```

## 📝 PR Template

Use the PR template to provide context:

```markdown
## 📝 Description
Brief description of changes

## 🔄 Changes Made
- Change 1
- Change 2

## 🧪 Testing
- [x] Unit tests added
- [x] Manual testing completed

## 📋 Review Focus Areas
- [x] Security implications
- [ ] Performance impact
```

## 🛠️ Local Testing

Test the review scripts locally:

```bash
# Review a specific PR
./scripts/review-pr.sh 123

# Review with focus
./scripts/review-pr.sh 123 --security
```

## 📚 Best Practices

1. **Keep PRs Small** - Aim for <500 lines changed
2. **Add Tests** - Include tests for new functionality
3. **Remove Console Logs** - Clean up before submitting
4. **Use TypeScript** - No .js/.jsx files in src/
5. **Handle Errors** - Add try/catch to async functions

## 🔐 Security Notes

- The review bot uses `GITHUB_TOKEN` with limited permissions
- No code is executed during review (static analysis only)
- Secrets scanning uses pattern matching, not actual secret detection

## 🆘 Troubleshooting

### Review Not Running

1. Check if the workflow file exists: `.github/workflows/auto-code-review.yml`
2. Ensure GitHub Actions is enabled for the repository
3. Verify the PR is not in draft mode (unless configured)

### False Positives

If the bot reports an issue incorrectly:
1. Comment on the specific line explaining why it's safe
2. The issue will be reviewed by a human
3. Update `.github/review-config.yml` if needed

### Review Taking Too Long

Large PRs (>1000 lines) may timeout. Consider:
- Breaking into smaller PRs
- Using `/review` to re-trigger
- Running locally with `./scripts/review-pr.sh`

## 📖 Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI](https://cli.github.com/manual/)
- [NeuralDeck Contributing Guide](../CONTRIBUTING.md)

---

**Questions?** Open an issue or ask in the discussions tab.
