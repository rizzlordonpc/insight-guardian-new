---
description: Auto-commit and push after every task
---

After completing any task that modifies files in the project, automatically run the following git commands:

// turbo-all

1. Stage all changes:
```
git add .
```

2. Commit with a descriptive message summarizing what was changed:
```
git commit -m "<type>: <short description>"
```
Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `style:`, `test:`

3. Push to remote:
```
git push origin master
```

4. Confirm to the user that the commit and push succeeded.

**Notes:**
- Remote origin: `https://github.com/rizzlordonpc/insight-guardian-new.git`
- Branch: `master`
- Git user is already configured locally in the repo.
- Do NOT ask for permission before committing — the user has opted into auto-commit.
