# Recall — MCQ Practice PWA (v1)

A local-first Progressive Web App prototype that imports a Markdown question paper, validates the v1 schema, previews the content and runs regular practice with immediate feedback.

## Included in this prototype

- Markdown `.md` / `.markdown` file import.
- YAML metadata and question-structure validation.
- Question preview with options, answer key and explanation.
- Regular practice in untimed mode or with a per-question 2-minute timer.
- Immediate answer feedback and explanation after selecting an option.
- Previous/next navigation and a question-number palette.
- Session result summary and review of every answer.
- Local persistence of the most recently imported Markdown file (browser storage only).
- PWA manifest and service worker for install/offline caching when hosted on HTTPS or localhost.
- No backend, account, analytics or third-party libraries.

## Not included yet

- Consolidated exam-mode timer.
- Importing a ZIP with local image files.
- Typeset LaTeX / equations.
- Multi-select questions, negative marking, randomized options, or persistent attempt history.
- Synchronization across devices.

The first version deliberately targets single-correct-answer, four-option MCQs. If a source Markdown file references local images, the parser flags that limitation rather than claiming the image was loaded.

## Markdown schema — v1

```markdown
---
schema_version: 1
paper_id: "pharmacology-respiratory-01"
title: "Respiratory Pharmacology — Test 01"
subject: "Pharmacology"
---

# Respiratory Pharmacology — Test 01

## Q1

Question statement goes here.

- **A.** First option
- **B.** Second option
- **C.** Third option
- **D.** Fourth option

**Correct answer:** B

**Explanation:**

Explanation text goes here.

## Q2

...
```

### Parser rules

- YAML front matter is required. `schema_version` must be `1`; `paper_id` and `title` are required. `subject` is recommended.
- Each question starts with a heading exactly matching `## Q1`, `## Q2`, and so on. Question numbers should be unique; gaps are warnings.
- Exactly four options are expected, in A, B, C, D order. Each option begins on its own source line with `- **A.**`, `- **B.**`, `- **C.**`, or `- **D.**`.
- Use exactly one answer line: `**Correct answer:** B`, with a capital letter from A to D.
- Start the explanation with a separate `**Explanation:**` line after the answer key.
- The question statement begins after the question heading and ends immediately before the first option.
- Explanation content continues to the next `## Q<number>` heading or end of file. It can use normal Markdown paragraphs, headings, lists, code blocks, quotes and tables.
- Do not place another `## Q<number>` heading inside an explanation.

## Run locally on a computer

The simplest route is to serve this folder from a local development server. With Python 3 installed, open a terminal in this folder and run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser on that computer. The PWA service worker works on localhost.

For the iPad, the app needs to be served from an HTTPS URL. `localhost` on your computer is not the same as `localhost` on the iPad. You can deploy the folder to a static HTTPS host (for example, a private repository deployment or another static web host), then open the HTTPS address in Safari on iPad. Safari's Share menu has **Add to Home Screen**; the installed icon opens the app in a standalone window. A basic static host is enough; no application server is needed.

## Important storage note

The most recently imported Markdown text is stored in the browser's local storage to make reopening the paper convenient. It remains on that device/browser profile. Clearing website data can remove it. This prototype does not yet save an in-progress attempt or cross-device-sync content.

## Smoke test checklist

1. Load the included sample paper.
2. Confirm 5 questions, 5 answer keys and 5 explanations are found with no errors.
3. Expand a preview and inspect an answer and explanation.
4. Start untimed practice; select an answer and verify feedback appears immediately.
5. Navigate backward and forward; confirm answers stay locked and visible.
6. Finish and review the score and all explanations.
7. Import a deliberately malformed file and confirm the Start button is disabled and errors are reported.
8. When hosted via HTTPS, reload once online, then test reopening while offline.
