# Contributing

Contributions to `nestjs-shield` are welcome. Bug reports, documentation fixes, focused improvements, and tests all help make the package more useful.

## Before you start

- Search existing [issues](https://github.com/Yassinos-coder/nestjs-shield/issues) to avoid duplicates.
- For a larger feature or behavior change, open an issue first to agree on the scope.
- For a security vulnerability, use GitHub's private **Report a vulnerability** option on the repository's Security page instead of opening a public issue.

## Set up the project

The package requires Node.js 18 or newer.

```bash
git clone https://github.com/Yassinos-coder/nestjs-shield.git
cd nestjs-shield
npm ci
npm test
```

`npm test` builds the TypeScript package and runs the test suite. Redis integration tests can be enabled with `SHIELD_TEST_REDIS_URL` pointing to a test Redis instance.

## Open a pull request

1. Create a focused branch from `main`.
2. Make the smallest change that addresses the issue and add or update tests when behavior changes.
3. Run `npm test` and describe any checks you could not run.
4. Open a pull request against `main`. Explain the problem, the change, and any user-facing or compatibility impact.

Keep pull requests focused and documentation accurate. If you're unsure about an approach, open an issue or draft a pull request and ask.
