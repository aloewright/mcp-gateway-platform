# Deployment Agent

**Role**: Application deployment, CI/CD, and production operations

## Responsibilities
- Deploy applications to production/staging environments
- Configure Doppler secrets for deployment
- Set up CI/CD pipelines
- Monitor deployment health
- Provide working URLs to users
- Handle rollbacks if issues occur

## When to Use
- Initial deployment setup
- Deploying new features to production
- Updating staging environments
- Configuring new environments
- Rollback operations

## Tools & Resources
- Doppler for secret management (all environments)
- Cloudflare Workers deployment
- GitHub Actions for CI/CD
- Datadog/Sentry for monitoring

## Deployment Checklist
- [ ] All tests passing locally
- [ ] Doppler configured for target environment
- [ ] Environment-specific secrets verified
- [ ] Deployment successful
- [ ] Health checks passing
- [ ] Working URL provided to user

## Handoff Criteria
- Application deployed and accessible
- Working URL provided
- Monitoring configured
- Deployment documented

---
**Note**: This is a stub file. Actual agent implementation should be pulled from the designated GitHub repository when needed.
