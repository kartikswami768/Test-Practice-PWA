# Recall — MCQ Practice PWA (v2)

A local-first Progressive Web App that imports a Markdown question paper, validates the v1 schema, previews the content, and supports regular practice plus consolidated-timer exam mode.

## Included in this prototype

- Markdown `.md` / `.markdown` file import.
- YAML metadata and question-structure validation.
- Question preview with options, answer key and explanation.
- Regular practice in untimed mode or with a per-question 2-minute timer.
- Exam mode with one consolidated countdown (configurable minutes per question; default 1 minute per question).
- Hidden answer feedback during exams; exam answers may be changed until submission.
- Exam setup hides answer keys and explanations in the preview while exam mode is selected.
- Previous/next navigation and a question-number palette that shows answered vs unanswered questions without marking correctness.
- Manual exam submission with an unanswered-question confirmation, plus automatic submission when time expires.
- Exam results with correct/incorrect/unanswered counts and a full answer/explanation review.
- The exam countdown uses a wall-clock deadline, so backgrounding Safari does not pause or extend the exam.
- Local persistence of the most recently imported Markdown file (browser storage only).
- PWA manifest and service worker for install/offline caching when hosted on HTTPS or localhost.
- No backend, account, analytics or third-party libraries.

## Not included yet

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
4. Start untimed regular practice; select an answer and verify feedback appears immediately. Navigate away and confirm the answer remains locked when you return.
5. Start regular timed practice; verify the timer is per question and time expiry reveals that question's answer.
6. Select Exam mode. Confirm the preview hides answer keys/explanations and the total duration equals question count multiplied by minutes per question.
7. Start an exam; verify the countdown remains consolidated when navigating, choices can be changed, and no correctness or explanation is revealed.
8. Submit an exam with unanswered questions and confirm the warning; submit and check the score, unanswered count, and explanations.
9. Test automatic submission using a short paper and 0.25 minutes per question.
10. Import a deliberately malformed file and confirm the Start button is disabled and errors are reported.
11. When hosted via HTTPS, reload once online, then test reopening while offline.
