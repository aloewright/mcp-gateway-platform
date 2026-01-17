# Core Agent Rules

These rules apply to all work in this repository.

## Behavioral Expectations
- Work end-to-end: research, implement, verify, and document changes.
- Prefer small, reviewable changes over broad refactors.
- Use the existing stack and patterns; avoid introducing new tooling without need.
- Do not create new agents; use existing workflows and templates.

## Development Constraints
- Use `pnpm` for workspace operations.
- Follow Conventional Commits for all commits.
- Keep secrets out of the repo; never commit `.env` files with real values.

## Documentation & Memory
- Record meaningful decisions in the session summary.
- Update `context/handoff.md` at the end of a session with status and next steps.
- Add solved, non-trivial issues to `context/fixes.md`.
