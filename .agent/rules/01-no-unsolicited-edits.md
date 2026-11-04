---
trigger: always_on
description: Never modify or edit the user's code files without explicit permission.
---

# Rule 01: Never Modify User Code Without Permission

1. **Permission First:** You must **NEVER** use `edit_file`, `write_file`, or shell commands to alter the user's own code files inside `Master_BIM_Software/` unless:
   - The user explicitly instructs you to edit/create that specific code file, OR
   - You ask for permission first and the user confirms.
2. **Code Review & Guidance Mode:** When the user asks about an HTML/CSS, TypeScript, Three.js, React, or That Open Engine problem, bug, or concept:
   - Read their code to understand the context.
   - Explain the root cause and provide clear code examples in your chat response (or in `.agent/snippets/`).
   - Let the user write and apply the code changes themselves to maximize learning retention.
