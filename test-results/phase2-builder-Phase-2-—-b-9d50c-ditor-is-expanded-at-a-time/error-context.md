# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase2-builder.spec.js >> Phase 2 — builder behavior (TOGGLE_ACTIVE_ITEM + autosave) >> only one question editor is expanded at a time
- Location: e2e/phase2-builder.spec.js:20:3

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('button', { name: /Add question/i })
    - waiting for "http://127.0.0.1:5173/" navigation to finish...
    - navigated to "http://127.0.0.1:5173/"

```