# Recall question-paper schema — v1

This document defines the Markdown format the app can validate. Keep the syntax consistent; the app parses explicit markers and does not infer missing fields from the surrounding prose.

## Required structure

```markdown
---
schema_version: 1
paper_id: "pharmacology-respiratory-01"
title: "Respiratory Pharmacology — Test 01"
subject: "Pharmacology"
---

# Respiratory Pharmacology — Test 01

## Q1

Write the complete question stem here. It may contain **bold text**, *italics*, paragraphs and ordinary Markdown.

- **A.** First option
- **B.** Second option
- **C.** Third option
- **D.** Fourth option

**Correct answer:** B

**Explanation:**

Write the explanation here. It may include paragraphs, lists, headings, blockquotes, code blocks and Markdown tables.

## Q2

Second question stem.

- **A.** First option
- **B.** Second option
- **C.** Third option
- **D.** Fourth option

**Correct answer:** D

**Explanation:**

Second explanation.
```

## Field rules

| Field | Required? | Rule |
|---|---:|---|
| `schema_version` | Yes | Must be `1`. |
| `paper_id` | Yes | Stable identifier using letters, numbers, dots, underscores or hyphens; begins with a letter or number. Use a different ID for a different paper. |
| `title` | Yes | Display name shown inside the app. |
| `subject` | Recommended | Displayed as the paper's subject; missing value generates a warning. |
| Question heading | Yes | One heading per question, written exactly as `## Q1`, `## Q2`, etc. |
| Question stem | Yes | All question-stem content after the question heading and before option A. |
| Options | Yes | Exactly four, in A–D order, each starting on its own source line. |
| Correct answer | Yes | Exactly one capital letter A, B, C or D. |
| Explanation | Recommended | Start with a separate `**Explanation:**` line after the answer key. Missing explanation causes a warning, not a blocker. |

## Parsing behavior

1. YAML front matter at the top defines paper metadata.
2. A line matching `## Q<number>` begins a new question. Content continues until the next such heading or end of file.
3. The first option marker ends the question stem.
4. The four option markers must be exactly `- **A.**`, `- **B.**`, `- **C.**`, and `- **D.**` in that order.
5. The answer key is recognized from `**Correct answer:** B`.
6. The explanation starts after `**Explanation:**` and continues to the next question heading or end of file. It may contain additional Markdown headings such as `### Why the other options are incorrect`.
7. Missing or invalid question structure blocks starting a practice session. Missing explanations and question-number gaps are warnings.

## Current v1 limitations

- Single-correct-answer, four-option MCQs only.
- Linked local image files are not imported yet. The parser warns if a question contains Markdown image references.
- LaTeX is displayed as text rather than typeset.
- The v1 PWA keeps only the most recently imported Markdown source in local browser storage. It does not yet manage a persistent multi-paper library or preserve attempts after the session ends.
- Consolidated exam mode, negative marking and multiple-correct questions are not yet implemented.
