# GitHub Copilot Budget Guide

## How to Increase Your GitHub Copilot Budget

This guide explains how to manage and increase your GitHub Copilot usage budget and token limits.

## Understanding Copilot Budgets

GitHub Copilot has different budget considerations depending on what you're using:

### 1. **GitHub Copilot Subscription (IDE Usage)**
- **Individual Plan**: $10/month or $100/year
- **Business Plan**: $19/user/month
- **Enterprise Plan**: $39/user/month

For IDE usage, there's no strict "budget" or token limit - your subscription gives you unlimited completions.

### 2. **GitHub Copilot Workspace**
Copilot Workspace has token budget limits for AI operations:
- Default budget varies by organization settings
- Can be increased through organization settings

### 3. **GitHub Models API**
If you're using GitHub Models with Copilot:
- Free tier has rate limits
- Paid tiers available for higher usage

## How to Increase Your Budget

### For Individual Accounts

#### Upgrading Your Plan
1. Go to [GitHub Settings](https://github.com/settings/billing)
2. Navigate to **"Billing and plans"**
3. Click on **"Plans and usage"**
4. Under GitHub Copilot section, click **"Edit"**
5. Choose to upgrade from Individual to Business (if applicable)

#### Increasing Workspace Token Budget
1. Go to your [GitHub Copilot settings](https://github.com/settings/copilot)
2. Look for "Workspace" or "Token Budget" settings
3. Adjust the budget slider or input field
4. Save your changes

### For Organization Accounts

#### Managing Organization Budget
1. Go to your organization settings: `https://github.com/organizations/YOUR_ORG/settings/billing`
2. Navigate to **"Billing and plans"** → **"Plans and usage"**
3. Click on **"GitHub Copilot"**
4. Click **"Settings"** or **"Manage"**
5. Adjust the following:
   - Number of seats (users)
   - Token budget per user (if available)
   - Workspace limits

#### Organization-Wide Settings
1. Go to `https://github.com/organizations/YOUR_ORG/settings/copilot`
2. Configure:
   - **Suggestions matching public code**: Allow/Block
   - **Content exclusions**: Configure which files are excluded
   - **Token budgets**: Set organization-wide token budgets

### For Enterprise Accounts

1. Contact your GitHub Enterprise administrator
2. Request budget increase through your organization's billing admin
3. Enterprise admins can:
   - Adjust per-user limits
   - Set organization-wide budgets
   - Configure custom token allocations

## Token Budget Best Practices

### Monitor Your Usage
- Check usage regularly in GitHub settings
- Review the "Usage" tab under Billing
- Set up notifications for when approaching limits

### Optimize Token Usage
- Use more specific prompts (fewer tokens)
- Break large tasks into smaller chunks
- Leverage context efficiently
- Use Copilot suggestions instead of full generations when possible

### Budget Allocation Strategies
- **Development teams**: Higher budgets for active development
- **Maintenance teams**: Lower budgets for bug fixes
- **Learning/Training**: Moderate budgets for onboarding

## Troubleshooting Budget Issues

### "Budget Exceeded" Messages
1. Check current usage in settings
2. Wait for budget reset (usually monthly)
3. Request increase from organization admin
4. Upgrade plan if on free/basic tier

### Workspace Budget Limits
If you hit Copilot Workspace limits:
1. Complete current workspace session
2. Wait for budget reset
3. Contact organization admin for increase
4. Consider breaking work into smaller tasks

### Rate Limiting
If experiencing rate limits:
1. Slow down request frequency
2. Batch operations when possible
3. Upgrade to higher tier
4. Contact GitHub Support for custom limits

## Getting Help

### Documentation Resources
- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [Copilot Billing Guide](https://docs.github.com/billing/managing-billing-for-github-copilot)
- [GitHub Models Documentation](https://docs.github.com/models)

### Support Channels
- **GitHub Support**: https://support.github.com
- **Community Forum**: https://github.community
- **Enterprise Support**: Contact your account manager

### Frequently Asked Questions

**Q: How do I check my current Copilot budget?**
A: Go to Settings → Billing → Plans and usage → GitHub Copilot

**Q: Does increasing budget cost more money?**
A: Depends on your plan. Individual/Business plans have flat rates. Custom enterprise limits may incur additional costs.

**Q: How often does the budget reset?**
A: Typically monthly, aligned with your billing cycle.

**Q: Can I get unlimited budget?**
A: Enterprise plans can request custom limits. Contact GitHub Sales for details.

**Q: What happens if I exceed my budget?**
A: Services may be rate-limited or throttled until the next billing cycle. Critical operations may still work with reduced capacity.

## Related Documentation
For more information about this project, see:
- [README.md](./README.md) - Main project documentation
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) - Administrator guide
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment instructions

---

**Last Updated**: November 2025
