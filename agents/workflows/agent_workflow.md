# AI Agent Coding Workflow

A systematic, opinionated approach to handling coding tasks. Designed to work with any LLM-powered coding assistant.

---

## Critical Behavioral Rules

These rules are **mandatory** for all agent operations.

### Autonomous Problem Solving

**Rule: Try at least 5 different solutions before asking the user.**

- Work autonomously through problems
- Use available tools and documentation to solve issues
- Only escalate after exhausting reasonable approaches
- Document what you tried when you do ask for help

### Complete Task Execution

**Rule: Do not stop until the task is fully complete.**

- Execute tasks to 100% completion
- Fix all bugs encountered during development
- For deployment tasks, provide working URLs
- Never leave tasks in a half-finished state

### Token Usage & Memory Planning

**Rule: Plan memory save points for complex tasks.**

For any task requiring more than 2 steps:

1. Estimate token usage for each phase
2. Plan when to save progress to memory
3. Create checkpoints before major changes
4. Save solutions to memory for future reference

### Secret Management

**Rule: Use a secret manager — never hardcode secrets.**

**Preferred: Doppler**

```bash
# Setup Doppler for a project
doppler setup --project <project-name> --config dev

# Verify Doppler is working
doppler run -- npm test

# All development commands should use doppler run prefix
doppler run -- npm start
doppler run -- npm run dev
```

**Doppler configurations:**

- Development: `<project>/dev`
- Staging: `<project>/stg`
- Production: `<project>/prd`

**Alternatives:** 1Password CLI, HashiCorp Vault, AWS Secrets Manager

**Rules:**

- Never commit `.env` files with real secrets
- Never hardcode API keys or tokens
- If no secret manager exists, ask user to configure one

---

## Phase 0: SESSION INITIALIZATION

Before starting any work, establish context and environment.

### 0.1 Review Previous Context

1. **Check for existing project documentation:**

   - README.md — project overview and setup instructions
   - CONTRIBUTING.md — contribution guidelines
   - CHANGELOG.md — recent changes and version history
   - TODO.md or similar — outstanding tasks and priorities

2. **Review conversation history** (if available):

   - What was the user working on previously?
   - Are there unfinished tasks or pending decisions?
   - Were there any blockers or issues encountered?

3. **Scan for project state indicators:**
   - Open pull requests or branches
   - Uncommitted changes in the working directory
   - Failed builds or test results
   - Linting errors or warnings

### 0.2 Establish the Tech Stack

Before writing any code, explicitly confirm the technology stack:

| Category            | Questions to Resolve                           |
| ------------------- | ---------------------------------------------- |
| **Language**        | TypeScript/JavaScript? Python? Rust? Go?       |
| **Runtime**         | Node.js? Deno? Bun? Browser?                   |
| **Framework**       | React? Vue? Next.js? Express? FastAPI?         |
| **Styling**         | Vanilla CSS? Tailwind? Styled Components?      |
| **Database**        | PostgreSQL? MongoDB? SQLite? Convex? Supabase? |
| **Auth**            | Clerk? Auth0? NextAuth? Firebase Auth?         |
| **Package Manager** | npm? pnpm? yarn? bun?                          |
| **Build Tool**      | Vite? Webpack? Rollup? esbuild?                |
| **Testing**         | Jest? Vitest? Playwright? Cypress?             |
| **Linting**         | ESLint? Biome? Prettier?                       |

**Preferred Linting: Biome**

Biome provides fast, unified formatting and linting in a single tool:

```bash
# Run all quality checks
npm run check              # Biome format + lint + TypeScript check

# Individual checks
npx biome check .          # Format + lint
npx biome format .         # Format only
npx biome lint .           # Lint only

# Fix issues automatically
npx biome check --write .
```

**Quality gates before commit:**

```bash
npm run check              # All Biome checks must pass
npm test                   # All tests must pass
npx tsc --noEmit          # TypeScript compilation
npm run build             # Build must succeed
```

**Rules:**

- Never assume the stack — always verify by checking config files
- If starting a new project, ask the user for explicit preferences
- Document stack decisions in README.md or a dedicated STACK.md

### 0.3 Verify Git Repository Status

Check the current state of version control:

```bash
# Check if inside a git repository
git status

# View recent commit history
git log --oneline -10

# Check current branch
git branch --show-current

# List all branches (local and remote)
git branch -a

# Check for uncommitted changes
git diff --stat
```

---

## Phase 1: REPOSITORY SETUP

### 1.1 Initialize Git (If Needed)

If no repository exists:

```bash
# Initialize a new git repository
git init

# Create initial commit
git add .
git commit -m "Initial commit"
```

### 1.2 Establish Remote Repository

Use GitHub CLI to create and link a remote:

```bash
# Check if GitHub CLI is authenticated
gh auth status

# Create a new private repository (preferred default)
gh repo create <repo-name> --private --source=. --push

# Or create public if explicitly requested
gh repo create <repo-name> --public --source=. --push
```

**If a remote already exists:**

```bash
# Verify remote configuration
git remote -v

# Fetch latest from remote
git fetch origin
```

### 1.3 Branch Strategy

Create a feature branch for any new work:

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create and switch to a feature branch
git checkout -b feature/<descriptive-name>

# Examples:
git checkout -b feature/add-dark-mode
git checkout -b fix/auth-token-refresh
git checkout -b refactor/api-client
```

**Branch naming conventions:**

- `feature/<name>` — new functionality
- `fix/<name>` — bug fixes
- `refactor/<name>` — code improvements without behavior change
- `docs/<name>` — documentation updates
- `chore/<name>` — maintenance tasks

---

## Phase 2: PLANNING

### 2.1 Understand the Request

- Parse the user's objective carefully
- Identify ambiguities and ask clarifying questions upfront
- Batch all independent questions into a single prompt

**Good questions to ask:**

- "Should this support X edge case?"
- "Do you prefer approach A or B?"
- "What's the priority: speed or completeness?"

**Avoid:**

- Asking for general approval ("Does this plan look good?")
- Questions you could answer by reading the codebase

### 2.2 Research the Codebase

Before proposing changes, understand what exists:

| Goal                       | How to Accomplish                       |
| -------------------------- | --------------------------------------- |
| Find files by name/pattern | Search filesystem with glob patterns    |
| Search for code patterns   | Grep/ripgrep for text patterns          |
| List directory contents    | Directory traversal commands            |
| Understand file structure  | View file outlines, function signatures |
| Trace dependencies         | Follow imports, check package.json      |

### 2.3 Create a Task Breakdown

Document the work to be done:

```markdown
# Task: [Brief Description]

## Context

- Related files: [list key files]
- Dependencies: [external packages, APIs]
- Risks: [potential issues to watch for]

## Checklist

- [ ] Research existing implementation
- [ ] Identify files to modify
- [ ] Plan changes
- [ ] Implement changes
- [ ] Write unit tests for new code
- [ ] Update existing tests if needed
- [ ] Run full test suite
- [ ] Verify changes manually
- [ ] Commit and push
- [ ] Create pull request
```

### 2.4 Write an Implementation Plan

For complex changes, document your approach:

```markdown
# Implementation Plan: [Feature Name]

## Problem Statement

[What problem are we solving?]

## Proposed Solution

[High-level approach]

## Changes Required

### [Component/Package Name]

#### [filename.ts] — [NEW/MODIFY/DELETE]

- [Specific changes to make]
- [Functions to add/modify]
- [Imports needed]

## Verification Plan

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing steps
- [ ] Edge cases validated

## Rollback Plan

[How to revert if something goes wrong]
```

### 2.5 Get User Approval

For significant changes:

- Present the implementation plan
- Highlight breaking changes or risky decisions
- Wait for explicit approval before executing
- Iterate on feedback while staying in planning mode

---

## Phase 3: EXECUTION

### 3.1 Work Systematically

1. Update your task checklist as you progress
2. Make changes in dependency order (shared code first)
3. Keep commits atomic and well-described
4. Test incrementally, not just at the end

### 3.2 Commit Frequently

```bash
# Stage specific files
git add <file1> <file2>

# Or stage all changes
git add .

# Commit with a descriptive message
git commit -m "feat: add dark mode toggle to settings page"
```

**Commit message format (Conventional Commits):**

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

| Type       | Usage                                                   |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Formatting, no code change                              |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                                |
| `chore`    | Maintenance tasks                                       |

**Examples:**

```bash
git commit -m "feat(auth): add OAuth2 login flow"
git commit -m "fix(api): handle null response from user endpoint"
git commit -m "refactor(utils): extract date formatting to shared module"
git commit -m "docs: update API documentation with rate limits"
```

### 3.3 Push Changes Regularly

```bash
# Push current branch to remote
git push origin <branch-name>

# If first push of a new branch
git push -u origin <branch-name>
```

### 3.4 Write Tests

**Rule: Every new feature or fix must have accompanying tests before verification.**

#### Test Types

| Type                  | Purpose                                           | When to Write                           |
| --------------------- | ------------------------------------------------- | --------------------------------------- |
| **Unit tests**        | Test individual functions/components in isolation | Always required for new code            |
| **Integration tests** | Test how components work together                 | For features involving multiple systems |
| **E2E tests**         | Test complete user flows                          | For critical user journeys              |

#### Testing Workflow

```bash
# Run existing tests first to ensure baseline
npm test

# Write tests for new functionality
# Create test file adjacent to source: foo.ts → foo.test.ts

# Run specific test file during development
npm test -- <test-file>

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

#### Testing Patterns

```typescript
// Good: Descriptive test names
describe("UserService", () => {
  describe("createUser", () => {
    it("should create a user with valid email", async () => {
      // Arrange
      const input = { email: "test@example.com", name: "Test" };

      // Act
      const result = await userService.createUser(input);

      // Assert
      expect(result.email).toBe(input.email);
      expect(result.id).toBeDefined();
    });

    it("should throw ValidationError for invalid email", async () => {
      const input = { email: "invalid", name: "Test" };

      await expect(userService.createUser(input)).rejects.toThrow(
        ValidationError
      );
    });
  });
});
```

#### Test Checklist

- [ ] Happy path tested
- [ ] Edge cases tested (empty input, null, undefined)
- [ ] Error cases tested (invalid input, failures)
- [ ] Boundary conditions tested (min/max values)
- [ ] Async behavior tested (if applicable)
- [ ] Mocks/stubs used appropriately for external dependencies

### 3.5 Handle Unexpected Issues

If you encounter unexpected complexity:

1. **Stop and reassess** — don't push through blindly
2. **Update the plan** — document new findings
3. **Communicate blockers** — tell the user what's wrong
4. **Return to planning** if fundamental changes are needed

---

## Phase 4: VERIFICATION

### 4.1 Run Automated Checks

```bash
# Run the test suite
npm test
# or: pnpm test, yarn test, bun test

# Run linting
npm run lint
# or: npx eslint . --fix

# Run type checking (TypeScript)
npx tsc --noEmit

# Run build to catch errors
npm run build
```

### 4.2 Manual Testing

- Test the specific feature implemented
- Verify no regressions in related functionality
- Check edge cases identified in planning
- For UI changes, visually confirm across breakpoints

### 4.3 Handle Test Failures

| Situation           | Action                               |
| ------------------- | ------------------------------------ |
| Minor bug found     | Fix immediately, update commit       |
| Test needs updating | Update test, document reason         |
| Fundamental flaw    | Return to planning phase             |
| Flaky test          | Investigate root cause, don't ignore |

### 4.4 Final Review

Before considering work complete:

```bash
# Review all changes made
git diff main..HEAD

# Check commit history
git log main..HEAD --oneline

# Ensure all tests pass
npm test

# Ensure build succeeds
npm run build
```

---

## Phase 5: DELIVERY

### 5.1 Create Pull Request

```bash
# Push final changes
git push origin <branch-name>

# Create pull request via GitHub CLI
gh pr create --title "feat: add dark mode support" --body "
## Summary
Added dark mode toggle to settings page.

## Changes
- Added ThemeProvider component
- Created dark mode CSS variables
- Added toggle switch in settings

## Testing
- [x] Unit tests added
- [x] Manual testing on Chrome, Firefox, Safari
- [x] Mobile responsive verified

## Screenshots
[Include if applicable]
"
```

### 5.2 Pull Request Best Practices

- **Title**: Use conventional commit format
- **Description**: Explain what and why, not just how
- **Size**: Keep PRs focused; split large changes
- **Screenshots**: Include for any UI changes
- **Testing notes**: Document how to verify

### 5.3 Respond to Review Feedback

```bash
# Make requested changes
git add .
git commit -m "fix: address PR feedback"
git push origin <branch-name>
```

### 5.4 Merge and Cleanup

After approval:

```bash
# Merge via GitHub CLI
gh pr merge --squash --delete-branch

# Or merge via git
git checkout main
git pull origin main
git merge --squash <branch-name>
git push origin main

# Delete local branch
git branch -d <branch-name>
```

### 5.5 Cloudflare Workers Deployment

**Preferred deployment platform: Cloudflare Workers**

```bash
# Install Wrangler CLI (if not installed)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to development/preview
wrangler deploy --env dev

# Deploy to production
wrangler deploy --env production

# View deployment logs
wrangler tail

# Run locally for testing
wrangler dev
```

**Wrangler configuration (`wrangler.json` or `wrangler.toml`):**

```json
{
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",
  "env": {
    "dev": { "name": "my-worker-dev" },
    "production": { "name": "my-worker" }
  }
}
```

**Cloudflare development patterns:**

- Use Durable Objects for stateful agents
- Use KV for key-value storage
- Use D1 for SQLite databases
- Use R2 for object storage
- Use Queues for async processing

**Always provide the deployed URL** when completing deployment tasks.

---

## Quick Reference: Git Commands

### Daily Workflow

```bash
# Start of session
git status
git pull origin main

# Create feature branch
git checkout -b feature/<name>

# During development
git add <files>
git commit -m "<type>: <message>"

# End of session / logical stopping point
git push origin <branch-name>

# Ready for review
gh pr create
```

### Useful Commands

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all uncommitted changes (DANGEROUS)
git checkout -- .

# Stash changes temporarily
git stash
git stash pop

# View diff of staged changes
git diff --staged

# Interactive rebase (clean up commits)
git rebase -i HEAD~3

# Cherry-pick a specific commit
git cherry-pick <commit-hash>

# View file at specific commit
git show <commit>:<file>
```

### GitHub CLI Quick Reference

```bash
# Authentication
gh auth login
gh auth status

# Repository
gh repo create <name> --private --source=. --push
gh repo view --web

# Pull Requests
gh pr create
gh pr list
gh pr view <number>
gh pr checkout <number>
gh pr merge --squash --delete-branch

# Issues
gh issue create
gh issue list
gh issue view <number>
```

---

## Communication Principles

### When to Ask Questions

**Do ask when:**

- Multiple valid approaches exist
- Requirements are ambiguous
- Breaking changes are necessary
- Security implications are unclear

**Don't ask when:**

- The answer is in the codebase
- It's a matter of personal style covered by the linter
- You're seeking general validation

### How to Communicate Progress

1. **Be concise** — no fluff or excessive summary
2. **Be specific** — cite files, functions, line numbers
3. **Be honest** — acknowledge mistakes and uncertainty
4. **Be proactive** — flag potential issues early

### Error Handling

When something goes wrong:

1. **State what happened** — the actual error
2. **State what you tried** — debugging steps taken
3. **State what you need** — specific help required
4. **Don't guess** — ask rather than assume

---

## Anti-Patterns to Avoid

| ❌ Don't                        | ✅ Do Instead                   |
| ------------------------------- | ------------------------------- |
| Skip planning for complex tasks | Always plan before implementing |
| Assume the tech stack           | Verify by checking config files |
| Make giant commits              | Commit frequently, atomically   |
| Push directly to main           | Use feature branches and PRs    |
| Ignore failing tests            | Fix or document why they fail   |
| Guess at missing info           | Ask clarifying questions        |
| Overwrite user's code style     | Follow existing conventions     |
| Use placeholder content         | Implement real functionality    |
| Skip verification               | Test before declaring done      |

---

## Checklist: Before Starting Any Task

- [ ] Read `.agent/context/handoff.md` for previous session context
- [ ] Check `.agent/context/fixes.md` for known issues
- [ ] Reviewed previous context and conversation history
- [ ] Verified the tech stack by checking config files
- [ ] Confirmed Git repository status
- [ ] Remote repository exists (or created one)
- [ ] Working on a feature branch, not main
- [ ] Understand the user's requirements
- [ ] Created a task breakdown
- [ ] Got approval for significant changes

---

## Example Session Flow

```
1. USER: "Add user authentication to my app"

2. SESSION INITIALIZATION:
   - Check for existing auth patterns
   - Review package.json for auth dependencies
   - Verify git status and branch

3. REPOSITORY SETUP:
   - Create feature branch: feature/add-auth
   - Push initial branch to remote

4. PLANNING:
   - Research if existing auth provider preference is mentioned, if not:
   - Ask: "Preferred auth provider? (Clerk, Auth0, etc.)"
   - Research existing user model
   - Write implementation plan
   - Get user approval

5. EXECUTION:
   - Install auth dependencies
   - Implement auth provider
   - Add protected routes
   - Commit frequently with descriptive messages

6. VERIFICATION:
   - Run tests
   - Manually test login/logout flow
   - Verify protected routes work

7. DELIVERY:
   - Push final changes
   - Create pull request
   - Respond to feedback
   - Merge and cleanup

8. MEMORY UPDATE:
   - Save session summary to .agent/sessions/
   - Update context handoff for next session
   - Log any new fixes to problem-solving memory
```

---

## Phase 6: MEMORY & KNOWLEDGE MANAGEMENT

Agents must maintain persistent memory across sessions. All memory lives in the `.agent/` folder at the project root.

### 6.1 The .agent Folder Structure

```
.agent/
├── agents/           # Agent configurations (DO NOT CREATE NEW AGENTS)
├── context/          # Summarized context and handoffs between sessions
├── knowledge/        # User-provided reference docs (API docs, specs, etc.)
├── mcp/              # MCP server configurations
├── rules/            # Agent behavioral rules
├── sessions/         # Saved conversation histories
├── skills/           # Reusable skill definitions
├── templates/        # Code and document templates
└── workflows/        # Defined workflows (like this document)
```

### 6.2 Session Management

Save conversation summaries after each session:

```markdown
<!-- .agent/sessions/YYYY-MM-DD-HH-MM-<brief-title>.md -->

# Session: [Brief Title]

**Date:** YYYY-MM-DD HH:MM
**Duration:** ~X minutes
**Branch:** feature/xxx

## Objective

[What the user wanted to accomplish]

## Completed

- [x] Task 1
- [x] Task 2
- [ ] Task 3 (incomplete - see handoff)

## Key Decisions

- Decision 1: [rationale]
- Decision 2: [rationale]

## Files Changed

- `path/to/file1.ts` — [what changed]
- `path/to/file2.ts` — [what changed]

## Handoff Notes

[What the next session needs to know to continue]
```

### 6.3 Context Handoffs

At the end of each session, update the context handoff file:

```markdown
<!-- .agent/context/handoff.md -->

# Context Handoff

**Last Updated:** YYYY-MM-DD HH:MM
**Last Session:** [link to session file]

## Current State

- Active branch: `feature/xxx`
- Build status: passing/failing
- Test status: X passing, Y failing

## In Progress

- [ ] Task currently being worked on
- [ ] Next steps planned

## Blockers

- [Any issues preventing progress]

## Recent Decisions

- [Decisions that affect future work]

## TODO (Priority Order)

1. [Highest priority]
2. [Next priority]
3. [Lower priority]
```

### 6.4 Problem-Solving Memory

**Rule: Never repeat the same mistake twice.**

Maintain a shorthand fixes file:

```markdown
<!-- .agent/context/fixes.md -->

# Quick Fixes Reference

## Build Errors

| Error Pattern                | Cause              | Fix                              |
| ---------------------------- | ------------------ | -------------------------------- |
| `Cannot find module 'X'`     | Missing dependency | `npm install X`                  |
| `Type 'X' is not assignable` | Type mismatch      | Check interface definitions      |
| `ENOENT: no such file`       | Missing file/path  | Verify path exists, check casing |

## Runtime Errors

| Error Pattern                 | Cause                 | Fix                        |
| ----------------------------- | --------------------- | -------------------------- |
| `undefined is not a function` | Null reference        | Add null check before call |
| `CORS error`                  | Missing headers       | Add CORS middleware        |
| `401 Unauthorized`            | Token expired/missing | Check auth flow            |

## Project-Specific Fixes

| Issue                        | Solution           | Date Added |
| ---------------------------- | ------------------ | ---------- |
| [Specific issue encountered] | [How it was fixed] | YYYY-MM-DD |
```

**Update this file whenever you solve a non-trivial problem.**

### 6.5 Structured Changelogs

Changelogs must be agent-readable for fast parsing:

```markdown
<!-- CHANGELOG.md -->

# Changelog

## [Unreleased]

### Added

- feat(auth): OAuth2 login flow (#123)
- feat(ui): Dark mode toggle (#124)

### Changed

- refactor(api): Migrate to fetch from axios (#125)

### Fixed

- fix(auth): Token refresh race condition (#126)

### Removed

- chore: Remove deprecated v1 endpoints (#127)

---

## [1.2.0] - 2024-01-15

### Added

- feat(search): Full-text search implementation

### Fixed

- fix(perf): Reduce bundle size by 40%
```

**Format rules:**

- Use conventional commit prefixes
- Include PR/issue numbers
- Group by type (Added, Changed, Fixed, Removed)
- Keep entries single-line for fast scanning

### 6.6 Knowledge Folder

The `knowledge/` folder contains user-provided reference materials:

```
.agent/knowledge/
├── api-docs/         # API documentation
├── specs/            # Technical specifications
├── examples/         # Reference implementations
└── vendor/           # Third-party documentation
```

**Usage:**

- Reference these docs when working on related features
- Ask the user if you need documentation that doesn't exist
- Keep docs organized by domain/package

### 6.7 Agent Management

**Critical Rule: Do NOT create new agents.**

If an agent is needed but missing:

1. Check `.agent/agents/` for existing agents
2. If missing, add to TODO:

```markdown
<!-- Add to .agent/context/handoff.md TODO section -->

- [ ] TODO: Pull missing agent `<agent-name>` from repository
```

3. Continue work without the agent, or ask user for guidance

### 6.8 MCP Server Configuration

Agents must use Model Context Protocol (MCP) servers for external integrations.

#### Required MCP Servers

Ensure the following are configured in `.agent/mcp/`:

| MCP Server            | Purpose                            |
| --------------------- | ---------------------------------- |
| **Context7**          | Documentation fetching and updates |
| **Cloudflare**        | Edge deployment, Workers, KV       |
| **Brave**             | Web search                         |
| **GitHub**            | Repository operations beyond CLI   |
| **Firecrawl**         | Web scraping and crawling          |
| **Sentry**            | Error monitoring and debugging     |
| **Playwright**        | Browser automation and testing     |
| **PostHog**           | Analytics and feature flags        |
| **Rube**              | (Verify specific use case)         |
| **Perplexity**        | AI-powered search                  |
| **Stripe**            | Payment processing                 |
| **Chrome DevTools**   | Browser debugging                  |
| **Desktop Commander** | System-level operations            |

#### Context7 Documentation Management

**Rule: Keep documentation current.**

```markdown
<!-- .agent/mcp/context7-schedule.md -->

# Documentation Update Schedule

## Monthly Updates (1st of month)

- [ ] Fetch latest docs for all core dependencies
- [ ] Update any deprecated API references
- [ ] Add docs for newly introduced packages

## On Package Addition

When adding a new package:

1. Immediately fetch documentation via Context7
2. Store summary in .agent/knowledge/vendor/<package>/
3. Add to monthly update checklist
```

#### Creating New MCP Tools

**Assess need for new MCP tools** when you find yourself:

- Repeatedly performing the same multi-step task
- Needing to integrate with an API not covered by existing MCPs
- Automating a workflow that could benefit other sessions

```markdown
<!-- .agent/mcp/proposed-tools.md -->

# Proposed MCP Tools

## [Tool Name]

- **Trigger:** [What recurring task prompted this?]
- **Purpose:** [What would the tool do?]
- **API/Service:** [What would it integrate with?]
- **Priority:** High/Medium/Low
- **Status:** Proposed/In Development/Deployed
```

---

## Emergency Protocols

When things go wrong, follow these guidelines:

### Build/Test Failures

1. **Stop immediately** — don't push broken code
2. **Check fixes.md** — have you seen this error before?
3. **Rollback if needed** — `git checkout -- .` or `git reset --soft HEAD~1`
4. **Isolate the change** — break into smaller steps
5. **Test after each step** — find exactly where it breaks
6. **Document the fix** — add to `.agent/context/fixes.md`

### Major Refactoring

Before starting:

1. Save progress to memory
2. Create a backup branch: `git checkout -b backup/pre-refactor`
3. Plan rollback strategy
4. Work incrementally, test frequently

### Unexpected Complexity

If a task grows beyond initial estimates:

1. Stop and update the plan
2. Communicate with user via notify
3. Break into smaller subtasks
4. Consider returning to planning phase

### Git Emergency Commands

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all uncommitted changes
git checkout -- .

# Recover deleted branch
git reflog
git checkout -b recovered-branch <commit-hash>

# Abort a bad merge
git merge --abort

# Stash everything and start fresh
git stash -u
```

---

## Checklist: End of Session Memory Update

- [ ] Session summary saved to `.agent/sessions/`
- [ ] Context handoff updated in `.agent/context/handoff.md`
- [ ] New fixes added to `.agent/context/fixes.md`
- [ ] CHANGELOG.md updated with changes (if applicable)
- [ ] Any new packages documented via Context7
- [ ] Missing agents noted in TODO (if applicable)
