# Zed360 Git workflow

## Stable main branch

`main` represents the latest reviewed, working version of Zed360. Major
features are developed on separate branches and merged into `main` through a
pull request after checks pass.

The first repository commit is a baseline containing the product foundation,
request and business onboarding, business authentication and linking, and the
admin review workflow already built before Git history was established.

## Starting a major feature

From the project directory:

```powershell
git switch main
git pull --ff-only
git switch -c feature/short-feature-name
```

Examples:

- `feature/business-request-access`
- `feature/business-responses`
- `feature/owner-notifications`
- `fix/session-refresh`
- `docs/verification-policy`

Use lowercase words separated by hyphens. Prefix branches with `feature/`,
`fix/`, `chore/`, or `docs/` according to their purpose.

## While working

- Make focused commits that describe an outcome, not a file list.
- Run relevant tests, type checks, lint, and production builds before pushing.
- Do not combine unrelated product features in one branch.
- Do not rewrite or discard another contributor's work.

## Publishing and merging

```powershell
git push -u origin feature/short-feature-name
```

Open a pull request into `main`, review the behavior and automated checks, then
merge it. Delete the remote feature branch after a successful merge when it is
no longer needed.

## Never commit

- `.env`, `.env.local`, database URLs, access tokens, or private keys
- Raw survey exports or respondent contact information
- Generated build output, dependency folders, logs, or local uploads
- Screenshots containing personal information unless they have been redacted

If a secret is committed accidentally, removing the file in a later commit is
not enough. Revoke or rotate the secret and clean it from Git history before
publishing the repository.
