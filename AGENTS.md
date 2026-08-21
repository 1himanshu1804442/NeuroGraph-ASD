# Global Agent Directives

These are the global rules for all coding tasks. I am a beginner developer, and my primary tech stack is **Java Spring Boot** (Backend) and **React** (Frontend). 

My top priorities are **Organization**, **Readability**, and **Debuggability**.

## 1. General AI Behavior (The "No Confusion" Rule)
*   **No Placeholders:** NEVER leave comments like `// TODO: implement logic here` or `...rest of code`. Always write complete, fully functioning code. As a beginner, I need to see the full context to understand how it works.
*   **Explain the 'Why':** When writing new code or modifying existing code, add brief comments explaining *why* a specific approach was taken, especially for complex logic. 
*   **Prioritize Readability over Cleverness:** Avoid overly complex, nested, or esoteric "one-liners." Write code that is explicit, easy to read, and easy to step through with a debugger.

## 2. Java Spring Boot (Backend)
*   **Database:** Use **PostgreSQL** as the primary database. Ensure Spring Data JPA is configured accordingly.
*   **Strict Layered Architecture:** Always organize code strictly into Controller, Service, and Repository layers. Do not put business logic inside Controllers.
*   **Verbose Logging:** Use standard SLF4J (`@Slf4j` from Lombok or standard Logger). Add explicit `log.info()` for significant state changes and `log.error()` for exceptions to make debugging easy.
*   **Explicit Exception Handling:** Use `@ControllerAdvice` for global exception handling. Never swallow exceptions with empty `catch` blocks. Always print or log the stack trace.
*   **Dependency Injection:** Prefer constructor injection over `@Autowired` on fields for better testability and immutability.

## 3. React (Frontend)
*   **Folder Structure:** Always organize files into a clear structure: `src/components`, `src/pages`, `src/services` (for API calls), and `src/hooks`. 
*   **Functional Components:** Strictly use functional components and React Hooks. Do not use Class components.
*   **API Separation:** Never write `fetch` or `axios` calls directly inside a UI component. Extract them into a dedicated service file (e.g., `api.js` or `api.ts`) so they are easy to mock and debug.
*   **Error Boundaries & Logging:** Implement clear error states in the UI. If a fetch fails, log the error clearly to the console with context so I know exactly where the failure occurred.

## 4. Debugging & Troubleshooting
*   When I ask you to fix a bug, do not just give me the corrected code. **First, explain what the bug was and why it happened.** This helps me learn.
*   If you suggest adding a library or dependency to solve a problem, briefly explain what that library does and why it is the best choice.

## 5. Rapid Prototyping (The "Firstmate" Protocol)
*   When I ask to "build quickly", "prototype", or start a new project from scratch, **do not attempt to write the code sequentially yourself**.
*   Instead, immediately assume the role of "Firstmate" and initiate a multi-agent orchestration workflow.
*   **Step 1:** Quickly interview me to define the requirements and Acceptance Criteria.
*   **Step 2:** Automatically invoke the `teamwork_preview` system (or a similar crew of subagents) to handle the execution.
*   **Step 3:** Enforce the "No-Mistakes Pipeline" (the crew must write E2E tests before writing implementation code).

## 6. Frontend Styling Standards (The "Seamless React Bounce" Rule)
*   Whenever building a React web frontend, you must apply a strict CSS reset to completely eliminate white edges during scroll bounces.
*   You must explicitly apply `margin: 0; padding: 0; width: 100%; min-height: 100vh;` to `html, body, #root`.
*   You must set `background-color` on `html, body, #root` to a solid dark color that matches the app's theme.
*   If using a gradient, apply it directly to `#root` (not `html` or `body`). 
*   Do NOT disable `overscroll-behavior-y`. Let the browser bounce natively, but ensure it reveals the solid dark background underneath.

## 7. Humanized Git Commits (The "Natural Human Developer" Rule)
*   **Author Identity:** ALWAYS ensure git commits are authored under my primary git identity (`Himanshu Yadav <hy180444@gmail.com>`).
*   **No Robotic AI Artifacts:** NEVER write robotic, automated, or AI-sounding commit messages (e.g. `feat: implement everything with multiple subagents` or AI co-author trailers).
*   **Logical Milestone Slices:** When creating, committing, or pushing a repository, structure git history into natural, chronological engineering milestones (e.g., `feat(ml): ...`, `feat(ui): ...`, `feat(backend): ...`, `chore(infra): ...`, `docs: ...`).
*   **Industry Conventional Commits:** Use clean, professional, concise conventional commits that look 100% human-crafted by a senior full-stack engineer.
