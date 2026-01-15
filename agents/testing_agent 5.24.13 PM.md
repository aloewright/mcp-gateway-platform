# Testing Agent

**Role**: Test creation, test maintenance, and quality assurance

## Responsibilities
- Write comprehensive test suites
- Maintain existing tests
- Implement E2E testing with playwright
- Generate test reports
- Ensure code coverage standards
- Test tool implementations (auto-execute vs confirmation)

## When to Use
- Writing tests for new features
- Improving test coverage
- Debugging failing tests
- Setting up test infrastructure
- Implementing E2E test scenarios

## Tools & Resources
- testsprite for test automation
- playwright for browser testing
- Vitest/Jest for unit testing
- Browser-tabs for UI testing

## Testing Standards
```bash
# Unit tests
doppler run -- npm test

# Linting and type checking
doppler run -- npm run check

# E2E tests (if configured)
doppler run -- npm run test:e2e
```

## Test Coverage Goals
- All new features have tests
- Critical paths have E2E tests
- Edge cases covered
- Error scenarios tested

## Handoff Criteria
- Test suite expanded for new features
- All tests passing
- Coverage targets met
- Test documentation updated

---
**Note**: This is a stub file. Actual agent implementation should be pulled from the designated GitHub repository when needed.
