# Contributing to Bankrupt to 1 Million

Thank you for helping build this project.

## Before you begin

1. Read the README.
2. Choose an open issue.
3. Comment `I'd like to work on this.`
4. Wait until the issue is assigned to you.
5. Build only the documented scope.

## Local setup

```bash
git clone https://github.com/MyMindVentures/BankruptTo1Million.git
cd BankruptTo1Million
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Required checks

Before opening a Pull Request, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
```

## Branch naming

```text
feature/issue-number-short-title
fix/issue-number-short-title
docs/issue-number-short-title
test/issue-number-short-title
```

## Pull Requests

Keep Pull Requests focused and connect them to one issue using:

```text
Closes #123
```

Visible changes must include desktop and mobile screenshots.

## Design references

Approved mockups and screenshots are the visual Source of Truth. Discuss significant deviations before implementing them.

## Accessibility

Use semantic HTML, clear labels, visible focus states, keyboard-friendly controls, meaningful alt text and sufficient colour contrast.

## Security and privacy

Never commit secrets, private API keys, tokens, personal documents or private contributor data.

## Recognition

Merged contributors may be invited to create a public Founding Builder Profile. Publication is always optional and requires permission.
