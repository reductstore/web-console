# Contributing to Reduct Web Console

Thanks for contributing.

We want Reduct Web Console to be straightforward to work on, especially for people joining the project for the first time.
This guide explains the workflow maintainers expect so you can focus on useful changes instead of guessing how review should work.

## Start with an Issue

Open a pull request only for an existing issue.

If you want to work on an issue, comment there first and wait to be assigned before you start coding.
If you found a bug, open or comment on the issue with the browser, ReductStore version, console version, and a short reproduction path.
If you have a new feature idea or workflow change, start with a GitHub issue or a thread on the [ReductStore community forum](https://community.reduct.store) before writing code.

For a small first task, start with [good first issue](https://github.com/reductstore/web-console/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22) or [help wanted](https://github.com/reductstore/web-console/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22help%20wanted%22).

## Prepare Your Branch

Before you start coding, sync your fork with the latest `upstream/main`, or update your local `main` from `origin/main` if you work directly in the repository.
Create a fresh branch from the latest `main` and keep it focused on one issue.

This repository expects every PR to be based on the newest default branch commit.
If possible, start the branch name with the issue ID, for example `218-replication-prefix`.
That makes the branch easier to connect with the issue and review history.

## Run the Console Locally

Install dependencies with npm:

```bash
npm install
```

The console needs a ReductStore API endpoint.
For a quick local setup, point it at the public demo server by creating a `.env` file:

```bash
VITE_STORAGE_URL=https://play.reduct.store
```

Then start the development server:

```bash
npm start
```

The demo token is `reductstore`.

If your change affects runtime behavior, test it against a real ReductStore instance when possible, not only against mocks or static UI state.
For a local server, start ReductStore with CORS enabled:

```bash
docker run --network=host --env RS_API_TOKEN=TOKEN --env RS_CORS_ALLOW_ORIGIN='*' -d reduct/store:main
```

Then point `.env` at the local server:

```bash
VITE_STORAGE_URL=http://127.0.0.1:8383
```

Exercise the bucket, entry, query, token, replication, lifecycle, upload, attachment, or deletion path that your change touches.
UI changes should be checked in the browser, including loading, empty, error, and permission-limited states when they apply.

## Build and Test

Run the smallest relevant set locally before opening a PR:

```bash
npm run fmt:check
npm run lint
npm run typecheck
npm run test
```

For changes that affect routing, forms, authentication, data browsing, uploads, downloads, or destructive actions, also run the end-to-end tests that cover the touched path:

```bash
npm run e2e
```

Build the production bundle when you change dependency, Vite, TypeScript, asset, or environment handling:

```bash
npm run build
```

If you skip a relevant check, explain why in the PR.

## UI and Product Changes

Reduct Web Console is an administration UI for ReductStore, so contributors should optimize for clarity and predictable operation.
Keep screens useful for repeated work: concise labels, stable layouts, readable tables, clear confirmation flows, and visible feedback for long-running actions.

Prefer existing components and Ant Design patterns already used in the repository.
When adding a new interaction, check similar bucket, token, replication, lifecycle, entry, and query views before introducing a new pattern.
Destructive operations need careful copy, explicit confirmation, and tests for disabled or permission-limited states.

Screenshots are useful for UI PRs.
Include before and after screenshots, or a short recording, when the change affects layout, navigation, charts, forms, tables, modals, or error display.

## AI-Assisted Changes

Generated code is allowed.

The contributor submitting the PR is responsible for it:

- Read and understand every generated change before you submit it.
- Remove dead code, vague comments, and accidental scope creep.
- Re-run tests and manual browser checks yourself.
- Be ready to explain the design and tradeoffs in review.

Human judgment is required.
"The AI wrote it" is not enough.

## Open the Pull Request

When you open the PR, link the issue it resolves and explain the user or maintainer problem you fixed.
List the validation you ran, including browser checks against a real ReductStore instance when applicable.
Mention command, output, configuration, screenshots, or environment details that help reviewers verify behavior quickly.

Update `CHANGELOG.md` when the change affects users, operators, or visible console behavior.
For purely internal changes, tests, refactoring, or documentation-only updates, skip changelog noise unless a maintainer asks for it.

## Update the Changelog

If your PR changes behavior that users may notice, add an entry to `CHANGELOG.md`.

Add the entry in the relevant unreleased section.
Keep it short and factual.
Focus on what changed for users or operators, not on internal implementation details.
Include the pull request number if the surrounding entries already follow that style.

For example:

```markdown
## Unreleased

### Added

- Add support for editing lifecycle policy modes from the lifecycle detail page, [PR-000](https://github.com/reductstore/web-console/pull/000)
```

## Review Expectations

Recent ReductStore contributor PRs show a consistent pattern: focused PRs tied to an assigned issue move faster, changes with local validation are easier to review, and ambiguous feature additions usually need issue discussion before code review starts.

Treat review as collaboration.
Maintainers may ask for behavior changes, test updates, smaller scope, or clearer UI states before merge.
The goal is to land solid changes with as little friction as possible.

## Need Help?

Ask on the [community forum](https://community.reduct.store), comment on the issue you want to work on, or open a draft PR early if you want feedback on direction.
