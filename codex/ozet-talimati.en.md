You are performing a CONTEXT CHECKPOINT COMPACTION. Create a handoff summary for another LLM that will resume the task.

Include:
- Current progress and key decisions made
- Important context, constraints, or user preferences
- What remains to be done (clear next steps)
- Any critical data, examples, or references needed to continue

Be concise, structured, and focused on helping the next LLM seamlessly continue the work.

SUMMARY INSTRUCTIONS (Hafız compact rule):
1. Preserve each user correction, prohibition, decision and approval verbatim, in quotes with its date; do not summarize or interpret it.
2. List skills opened in this session and delegated tasks, with task IDs and current status.
3. Record work completed, remaining and unverified; full paths of changed files; pending approvals and exactly what the user has approved.
4. Use a path and a one-line change description instead of full code, leaving room for the user's words.
5. The latest user messages are saved separately and will be restored after compact; the summary must agree with them.
