---
trigger: always_on
description: Always record and update discussions in both .agent/discussions/ and Obsidian. Never delete past logs, always notify before additions, and prompt user to recheck critical changes.
---

# Rule 03: Always Log Discussions & Mirror to Obsidian (`Never Forget Protocol`)

1. **Mandatory Discussion Logging & Obsidian Sync:** Every time you answer a question, review code, debug an issue, or update course progress:
   - **Log in `.agent/`:** Update `D:\Coding\MyLearning\ThatOpenCompany\.agent\discussions\00-discussion-index.md` and the daily session log `YYYY-MM-DD-session-log.md`.
   - **Mirror to Obsidian:** Synchronize the discussion summary to `D:\MyDocs\Obsidien\Myspace\Snippets & Agent Logs\Discussions - ThatOpenCompany BIM.md`.
2. **Never Delete Past Discussions:**
   - Discussions and session logs are permanent append-only memory. Never overwrite, truncate, or delete historical logs.
3. **No Unsolicited Additions / Changes:**
   - **Always tell the user before adding or changing anything.** Never create, edit, or introduce project files or dependencies without explaining what will be done and getting explicit confirmation.
4. **Critical Message & Verification Prompt:**
   - When presenting critical changes, architectural decisions, or bugs, explicitly ask the user to recheck and confirm before proceeding.
