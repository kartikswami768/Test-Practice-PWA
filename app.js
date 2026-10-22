/* Recall PWA — v1 Markdown parser and regular-practice engine. */
(() => {
  'use strict';

  const STORAGE_MARKDOWN = 'recall.lastMarkdown.v1';
  const STORAGE_FILENAME = 'recall.lastFilename.v1';
  const SAMPLE_FILENAME = 'pharmacology-sample.md';
  const SAMPLE_MARKDOWN = `---
schema_version: 1
paper_id: "pharmacology-practice-01"
title: "Pharmacology — Sample Practice Paper"
subject: "Pharmacology"
---

# Pharmacology — Sample Practice Paper

## Q1

Which drug is a relatively selective β1-adrenergic blocker at usual therapeutic doses?

- **A.** Propranolol
- **B.** Metoprolol
- **C.** Carvedilol
- **D.** Labetalol

**Correct answer:** B

**Explanation:**

Metoprolol is relatively selective for β1-adrenergic receptors at usual therapeutic doses. Its selectivity decreases as the dose increases.

### Why the other options are incorrect

- **A. Propranolol:** Non-selective β-blocker.
- **C. Carvedilol:** Blocks β1, β2 and α1 receptors.
- **D. Labetalol:** Blocks α1 and β receptors.

## Q2

Which receptor is primarily responsible for bronchodilation produced by salbutamol?

- **A.** β1-adrenergic receptor
- **B.** β2-adrenergic receptor
- **C.** Muscarinic M3 receptor
- **D.** α1-adrenergic receptor

**Correct answer:** B

**Explanation:**

Salbutamol is a short-acting β2-adrenergic agonist. Activation of β2 receptors in bronchial smooth muscle increases intracellular cAMP and promotes relaxation.

## Q3

Which adverse effect is classically associated with angiotensin-converting enzyme inhibitors?

- **A.** Dry cough
- **B.** Hypokalaemia
- **C.** Reflex tachycardia as the defining effect
- **D.** Ototoxicity

**Correct answer:** A

**Explanation:**

ACE inhibitors can cause a persistent dry cough, associated with reduced degradation of bradykinin and other peptides. They can also cause hyperkalaemia and, rarely, angioedema.

## Q4

Which drug directly inhibits HMG-CoA reductase?

- **A.** Ezetimibe
- **B.** Fenofibrate
- **C.** Atorvastatin
- **D.** Cholestyramine

**Correct answer:** C

**Explanation:**

Atorvastatin is a statin that competitively inhibits HMG-CoA reductase, the rate-limiting enzyme in cholesterol synthesis. Reduced hepatic cholesterol content upregulates LDL receptors and increases clearance of LDL from plasma.

## Q5

Which insulin preparation is generally used for rapid prandial glucose control?

- **A.** Insulin glargine
- **B.** Insulin lispro
- **C.** Insulin degludec
- **D.** NPH insulin

**Correct answer:** B

**Explanation:**

Insulin lispro is a rapid-acting insulin analogue used around mealtimes. Glargine and degludec are long-acting basal insulins, while NPH has an intermediate duration of action.
`;

  const el = (id) => document.getElementById(id);
  const state = {
    markdown: '', filename: '', paper: null, validation: null,
    practice: null, timerInterval: null, toastTimeout: null, deferredInstallPrompt: null
  };
  const VIEW_IDS = ['import-view', 'paper-view', 'practice-view', 'results-view'];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function inlineMarkdown(source) {
    // Escape all source HTML first. This renderer intentionally does not permit raw HTML.
    let s = escapeHtml(source);
    const codeSlots = [];
    s = s.replace(/`([^`]+)`/g, (_, code) => {
      const token = `\u0000CODE${codeSlots.length}\u0000`;
      codeSlots.push(`<code>${code}</code>`);
      return token;
    });
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt) =>
      `<span class="image-placeholder" role="note">Image not loaded in v1: ${alt ? escapeHtml(alt) : 'referenced image'}</span>`);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label) => `<span class="markdown-link-label">${label}</span>`);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
    s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
    s = s.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => codeSlots[Number(index)] || '');
    return s;
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    const isBlank = (line) => !line || !line.trim();
    const isTableDivider = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || '');
    const isSpecial = (line, next) => {
      const t = (line || '').trim();
      return !t || /^```/.test(t) || /^#{1,6}\s+/.test(t) || /^[-*_]{3,}\s*$/.test(t) || /^>/.test(t) || /^\s*[-*+]\s+/.test(line || '') || /^\s*\d+[.)]\s+/.test(line || '') || (t.includes('|') && next && isTableDivider(next));
    };
    while (i < lines.length) {
      const raw = lines[i];
      const t = raw.trim();
      if (isBlank(raw)) { i++; continue; }
      if (t.startsWith('```')) {
        const codeLines = []; i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(lines[i]); i++; }
        if (i < lines.length) i++;
        out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        continue;
      }
      const heading = t.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = Math.min(6, heading[1].length);
        out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); i++; continue;
      }
      if (/^[-*_]{3,}\s*$/.test(t)) { out.push('<hr>'); i++; continue; }
      if (/^>/.test(t)) {
        const quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { quote.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push(`<blockquote>${renderMarkdown(quote.join('\n'))}</blockquote>`); continue;
      }
      if (t.includes('|') && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
        const splitCells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
        const headers = splitCells(lines[i]); i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes('|') && !isBlank(lines[i])) { rows.push(splitCells(lines[i])); i++; }
        const headHtml = headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('');
        const bodyHtml = rows.map((row) => `<tr>${headers.map((_, index) => `<td>${inlineMarkdown(row[index] || '')}</td>`).join('')}</tr>`).join('');
        out.push(`<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`); continue;
      }
      if (/^\s*[-*+]\s+/.test(raw)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i++; }
        out.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`); continue;
      }
      if (/^\s*\d+[.)]\s+/.test(raw)) {
        const items = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i++; }
        out.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ol>`); continue;
      }
      const paragraph = [raw.trim()]; i++;
      while (i < lines.length && !isSpecial(lines[i], lines[i + 1])) { paragraph.push(lines[i].trim()); i++; }
      out.push(`<p>${paragraph.map(inlineMarkdown).join(' ')}</p>`);
    }
    return out.join('\n');
  }

  function parseFrontmatter(markdown) {
    const match = String(markdown).replace(/^\uFEFF/, '').match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
    const meta = {};
    if (!match) return { meta, body: markdown, found: false };
    match[1].split('\n').forEach((line) => {
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/);
      if (!m) return;
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      meta[m[1]] = value;
    });
    return { meta, body: markdown.slice(match[0].length), found: true };
  }

  function parsePaper(markdown, filename = 'question-paper.md') {
    const front = parseFrontmatter(markdown);
    const errors = [];
    const warnings = [];
    const meta = front.meta;
    const titleMatch = front.body.match(/^#\s+(.+)$/m);
    const inferredTitle = titleMatch ? titleMatch[1].trim() : filename.replace(/\.(md|markdown)$/i, '');
    const paper = {
      schemaVersion: meta.schema_version || '',
      id: meta.paper_id || '',
      title: meta.title || inferredTitle || 'Untitled question paper',
      subject: meta.subject || 'Unspecified subject',
      questions: [],
      metadata: meta
    };
    if (!front.found) errors.push('Missing YAML front matter. Add schema_version, paper_id, title and subject at the top of the file.');
    if (front.found && String(meta.schema_version) !== '1') errors.push(`schema_version must be 1 (found “${meta.schema_version || 'nothing'}”).`);
    if (!meta.paper_id) errors.push('Missing required metadata: paper_id.');
    else if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(meta.paper_id)) errors.push('paper_id may contain only letters, numbers, dots, underscores and hyphens, and must start with a letter or number.');
    if (!meta.title) errors.push('Missing required metadata: title. The app can infer a display title, but the source file must include title metadata.');
    if (!meta.subject) warnings.push('No subject metadata found; subject will display as “Unspecified subject”.');

    const body = front.body;
    const headingRegex = /^##\s+Q(\d+)\s*$/gm;
    const markers = [];
    let marker;
    while ((marker = headingRegex.exec(body)) !== null) markers.push({ number: Number(marker[1]), label: `Q${marker[1]}`, start: marker.index, bodyStart: headingRegex.lastIndex });
    if (!markers.length) errors.push('No question headings found. Each question must begin with a heading such as “## Q1”.');

    const seen = new Set();
    markers.forEach((markerInfo, idx) => {
      const end = idx + 1 < markers.length ? markers[idx + 1].start : body.length;
      const raw = body.slice(markerInfo.bodyStart, end).trim();
      const qErrors = [];
      const qWarnings = [];
      if (!Number.isInteger(markerInfo.number) || markerInfo.number < 1) qErrors.push('Question number must be a positive integer.');
      if (seen.has(markerInfo.number)) qErrors.push(`Duplicate question number Q${markerInfo.number}.`);
      seen.add(markerInfo.number);
      if (idx === 0 && markerInfo.number !== 1) qWarnings.push(`The first question is Q${markerInfo.number}, not Q1.`);
      if (idx > 0 && markerInfo.number !== markers[idx - 1].number + 1) qWarnings.push(`Question numbering jumps from Q${markers[idx - 1].number} to Q${markerInfo.number}.`);

      const lines = raw.split('\n');
      const optionMatches = [];
      const optionRegex = /^\s*-\s+\*\*([A-D])\.\*\*\s*(.*)\s*$/;
      lines.forEach((line, lineIndex) => {
        const m = line.match(optionRegex);
        if (m) optionMatches.push({ label: m[1], text: m[2] || '', lineIndex });
      });
      const answerMatch = raw.match(/^\s*\*\*Correct answer:\*\*\s*(.*?)\s*$/m);
      const explanationMatch = raw.match(/^\s*\*\*Explanation:\*\*\s*(.*)$/m);
      const firstOptionLine = optionMatches.length ? optionMatches[0].lineIndex : lines.length;
      const statement = lines.slice(0, firstOptionLine).join('\n').trim();
      if (!statement) qErrors.push('Question text is empty.');
      if (optionMatches.length !== 4) qErrors.push(`Expected exactly four options (A–D); found ${optionMatches.length}.`);
      const foundLabels = optionMatches.map((option) => option.label);
      if (optionMatches.length && foundLabels.join('') !== 'ABCD') qErrors.push(`Options must appear once each in A, B, C, D order; found ${foundLabels.join(', ') || 'none'}.`);
      const options = optionMatches.map((option, optionIndex) => {
        const next = optionMatches[optionIndex + 1];
        const possibleEnd = next ? next.lineIndex : (lines.findIndex((line, li) => li > option.lineIndex && /^\s*\*\*(Correct answer|Explanation):\*\*/.test(line)) >= 0 ? lines.findIndex((line, li) => li > option.lineIndex && /^\s*\*\*(Correct answer|Explanation):\*\*/.test(line)) : lines.length);
        const extraLines = lines.slice(option.lineIndex + 1, possibleEnd).filter((line) => line.trim());
        return { label: option.label, text: [option.text, ...extraLines].filter(Boolean).join('\n').trim() };
      });
      options.forEach((option) => { if (!option.text) qErrors.push(`Option ${option.label} is empty.`); });
      if (!answerMatch) qErrors.push('Missing “**Correct answer:** X” line.');
      let correctAnswer = '';
      if (answerMatch) {
        const answerValue = answerMatch[1].trim();
        if (!/^[A-D]$/.test(answerValue)) qErrors.push(`Correct answer must be a single capital letter A–D; found “${answerValue}”.`);
        else {
          correctAnswer = answerValue;
          if (options.length && !foundLabels.includes(correctAnswer)) qErrors.push(`Correct answer ${correctAnswer} does not match any parsed option.`);
        }
      }
      let explanation = '';
      if (!explanationMatch) qWarnings.push('No explanation found. The app will show a placeholder after answering.');
      else {
        const explanationStart = raw.indexOf(explanationMatch[0]) + explanationMatch[0].length;
        explanation = raw.slice(explanationStart).trim();
        if (explanationMatch[1].trim()) explanation = `${explanationMatch[1].trim()}${explanation ? `\n${explanation}` : ''}`;
        if (answerMatch && raw.indexOf(explanationMatch[0]) < raw.indexOf(answerMatch[0])) qErrors.push('Explanation must come after the correct-answer line.');
        if (!explanation.trim()) qWarnings.push('Explanation section is empty.');
      }
      if (/!\[[^\]]*\]\([^)]+\)/.test(raw)) qWarnings.push('This question references an image. Local image files are not imported in this version.');
      const question = {
        number: markerInfo.number,
        label: markerInfo.label,
        stem: statement,
        options,
        correctAnswer,
        explanation,
        errors: qErrors,
        warnings: qWarnings,
        source: raw
      };
      paper.questions.push(question);
      qErrors.forEach((msg) => errors.push(`${question.label}: ${msg}`));
      qWarnings.forEach((msg) => warnings.push(`${question.label}: ${msg}`));
    });

    if (markers.length && markers.some((m) => m.number < 1)) errors.push('Question numbers must be positive integers.');
    if (/!\[[^\]]*\]\([^)]+\)/.test(markdown)) warnings.push('The paper contains image references. This version imports the Markdown file only; ZIP/image-folder import is not implemented yet.');
    if (/\$\$?[\s\S]+?\$\$?/.test(markdown)) warnings.push('The paper may contain LaTeX math. Mathematical typesetting is not implemented in this version; expressions will display as text.');
    const counts = {
      questions: paper.questions.length,
      validQuestions: paper.questions.filter((q) => q.errors.length === 0).length,
      answerKeys: paper.questions.filter((q) => /^[A-D]$/.test(q.correctAnswer)).length,
      explanations: paper.questions.filter((q) => q.explanation.trim()).length
    };
    return { paper, errors, warnings, counts, valid: errors.length === 0 && paper.questions.length > 0 };
  }

  function showToast(message) {
    const toast = el('toast');
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(state.toastTimeout);
    state.toastTimeout = window.setTimeout(() => toast.classList.remove('show'), 2700);
  }

  function showView(viewId) {
    VIEW_IDS.forEach((id) => el(id).classList.toggle('hidden', id !== viewId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    el('main-content').focus({ preventScroll: true });
  }

  function setPaper(markdown, filename = 'question-paper.md') {
    stopTimer();
    state.markdown = markdown.replace(/^\uFEFF/, '');
    state.filename = filename || 'question-paper.md';
    state.validation = parsePaper(state.markdown, state.filename);
    state.paper = state.validation.paper;
    state.practice = null;
    try {
      // Persist only the latest source paper on-device, to make reopening convenient.
      localStorage.setItem(STORAGE_MARKDOWN, state.markdown);
      localStorage.setItem(STORAGE_FILENAME, state.filename);
    } catch (_) {
      // Import should still work if browser storage is unavailable or full.
    }
    renderPaperView();
    showView('paper-view');
  }

  function renderStat(label, value, foot = '') {
    return `<div class="stat-card"><span class="stat-label">${escapeHtml(label)}</span><strong class="stat-value">${escapeHtml(value)}</strong>${foot ? `<span class="stat-foot">${escapeHtml(foot)}</span>` : ''}</div>`;
  }

  function renderNotice(kind, message) {
    const icon = kind === 'error' ? '!' : kind === 'warning' ? '!' : '✓';
    return `<div class="notice ${kind}"><span class="notice-icon">${icon}</span><p>${escapeHtml(message)}</p></div>`;
  }

  function questionOptionPreview(option, question) {
    const correct = question.correctAnswer === option.label;
    return `<div class="preview-option ${correct ? 'is-correct' : ''}"><span class="opt-letter">${escapeHtml(option.label)}.</span><div class="markdown-content">${renderMarkdown(option.text)}</div></div>`;
  }

  function renderQuestionPreview(question) {
    const invalid = question.errors.length > 0;
    const stateText = invalid ? `${question.errors.length} issue${question.errors.length === 1 ? '' : 's'}` : question.explanation.trim() ? `Answer key: ${question.correctAnswer}` : `Answer key: ${question.correctAnswer} · Explanation missing`;
    const optionsHtml = question.options.map((option) => questionOptionPreview(option, question)).join('');
    const explanationHtml = question.explanation.trim()
      ? `<div class="preview-explanation"><h4>Explanation</h4><div class="markdown-content">${renderMarkdown(question.explanation)}</div></div>`
      : `<div class="preview-explanation"><h4>Explanation</h4><p class="muted small-text">No explanation included in source.</p></div>`;
    const issueHtml = question.errors.length ? `<div class="notice error"><span class="notice-icon">!</span><p>${question.errors.map(escapeHtml).join('<br>')}</p></div>` : '';
    const warningHtml = question.warnings.length ? `<div class="notice warning"><span class="notice-icon">!</span><p>${question.warnings.map(escapeHtml).join('<br>')}</p></div>` : '';
    return `<details class="preview-item ${invalid ? 'invalid' : ''}"><summary class="preview-summary"><span class="question-number-chip">${escapeHtml(question.label)}</span><span class="preview-summary-text"><strong>${renderMarkdown(question.stem).replace(/^<p>|<\/p>$/g, '') || 'Question text missing'}</strong><small>${escapeHtml(stateText)}</small></span></summary><div class="preview-body">${issueHtml}${warningHtml}<div class="preview-options">${optionsHtml || '<p class="muted small-text">No options parsed.</p>'}</div>${question.correctAnswer ? `<p class="answer-key">Correct answer: ${escapeHtml(question.correctAnswer)}</p>` : ''}${explanationHtml}</div></details>`;
  }

  function renderPaperView() {
    const { paper, errors, warnings, counts, valid } = state.validation;
    el('paper-title').textContent = paper.title;
    el('paper-subtitle').textContent = `${paper.subject} · ${state.filename}`;
    el('validation-badge').textContent = valid ? 'Ready to practise' : 'Needs correction';
    el('validation-badge').classList.toggle('error', !valid);
    el('validation-summary').innerHTML = [
      renderStat('Questions found', counts.questions, `${counts.validQuestions} structurally valid`),
      renderStat('Answer keys', counts.answerKeys, 'One correct option per question'),
      renderStat('Explanations', counts.explanations, 'Explanation sections found'),
      renderStat('Issues', errors.length, warnings.length ? `${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : 'No warnings')
    ].join('');
    const notices = [];
    errors.forEach((msg) => notices.push(renderNotice('error', msg)));
    warnings.forEach((msg) => notices.push(renderNotice('warning', msg)));
    if (valid && !warnings.length) notices.push(renderNotice('success', 'The paper passed validation. Expand any question below to inspect its options, answer key and explanation.'));
    el('validation-messages').innerHTML = notices.join('');
    el('preview-count').textContent = `${counts.questions} question${counts.questions === 1 ? '' : 's'}`;
    el('preview-list').innerHTML = paper.questions.length ? paper.questions.map(renderQuestionPreview).join('') : '<div class="notice error"><span class="notice-icon">!</span><p>No questions could be parsed. Check that each question starts with a heading like “## Q1”.</p></div>';
    el('start-practice').disabled = !valid;
    el('start-practice').title = valid ? 'Start regular practice' : 'Correct the errors before starting';
  }

  function startPractice() {
    if (!state.validation?.valid) { showToast('Correct the validation errors before starting.'); return; }
    const timerInput = document.querySelector('input[name="practice-timer"]:checked');
    const timerSeconds = timerInput ? Number(timerInput.value) : 0;
    state.practice = {
      index: 0,
      limitSeconds: timerSeconds,
      answers: state.paper.questions.map(() => null),
      remainingMs: state.paper.questions.map(() => timerSeconds * 1000),
      activeStartedAt: null,
      startedAt: Date.now()
    };
    el('practice-paper-title').textContent = state.paper.title;
    el('practice-mode-label').textContent = timerSeconds ? `${timerSeconds / 60} min/question` : 'Untimed practice';
    showView('practice-view');
    renderPracticeQuestion(true);
    startTimer();
  }

  function answeredCount() {
    return state.practice ? state.practice.answers.filter(Boolean).length : 0;
  }

  function questionStatusText(answer) {
    if (!answer) return 'Not answered';
    if (answer.status === 'timeout') return 'Time expired';
    return answer.status === 'correct' ? 'Correct' : 'Incorrect';
  }

  function answerFeedback(question, answer) {
    if (!answer) return '';
    const isCorrect = answer.status === 'correct';
    const isTimeout = answer.status === 'timeout';
    const cls = isCorrect ? 'correct' : 'incorrect';
    const heading = isCorrect ? 'Correct' : isTimeout ? 'Time is up' : 'Not quite';
    const symbol = isCorrect ? '✓' : isTimeout ? '!' : '×';
    const selected = answer.selected ? `You selected <strong>${escapeHtml(answer.selected)}</strong>. ` : 'You did not select an answer. ';
    const correctOption = question.options.find((option) => option.label === question.correctAnswer);
    const answerLine = question.correctAnswer
      ? `<div class="feedback-answer">${selected}Correct answer: <strong>${escapeHtml(question.correctAnswer)}${correctOption ? ` — ${renderMarkdown(correctOption.text).replace(/^<p>|<\/p>$/g, '')}` : ''}</strong></div>`
      : `<div class="feedback-answer">No valid answer key was included in the source.</div>`;
    const explanation = question.explanation.trim()
      ? `<div class="feedback-explanation-label">Explanation</div><div class="markdown-content">${renderMarkdown(question.explanation)}</div>`
      : `<div class="feedback-explanation-label">Explanation</div><p class="muted small-text">No explanation was included in the source paper.</p>`;
    return `<div class="feedback-heading ${cls}"><span class="feedback-symbol">${symbol}</span>${heading}</div>${answerLine}${explanation}`;
  }

  function renderPracticeQuestion(shouldScroll = false) {
    if (!state.practice) return;
    const practice = state.practice;
    const index = practice.index;
    const question = state.paper.questions[index];
    const answer = practice.answers[index];
    el('question-position').textContent = `QUESTION ${index + 1} OF ${state.paper.questions.length}`;
    const statusEl = el('question-status');
    statusEl.textContent = questionStatusText(answer);
    statusEl.className = 'question-status';
    if (answer?.status === 'correct') statusEl.classList.add('correct');
    else if (answer?.status === 'incorrect') statusEl.classList.add('incorrect');
    else if (answer?.status === 'timeout') statusEl.classList.add('timeout');
    el('practice-question').innerHTML = renderMarkdown(question.stem);
    el('practice-options').innerHTML = question.options.map((option) => {
      const isCorrect = option.label === question.correctAnswer;
      const chosen = answer?.selected === option.label;
      const classes = ['answer-option'];
      if (answer && isCorrect) classes.push('correct-answer');
      if (answer && chosen && !isCorrect) classes.push('chosen-wrong');
      return `<button type="button" class="${classes.join(' ')}" data-option="${escapeHtml(option.label)}" ${answer ? 'disabled' : ''}><span class="option-letter">${escapeHtml(option.label)}</span><span class="markdown-content">${renderMarkdown(option.text)}</span></button>`;
    }).join('');
    el('practice-options').querySelectorAll('button[data-option]').forEach((button) => button.addEventListener('click', () => selectAnswer(button.dataset.option)));
    const feedback = el('answer-feedback');
    if (answer) {
      feedback.innerHTML = answerFeedback(question, answer);
      feedback.classList.remove('hidden', 'incorrect');
      if (answer.status !== 'correct') feedback.classList.add('incorrect');
    } else {
      feedback.innerHTML = '';
      feedback.classList.add('hidden');
      feedback.classList.remove('incorrect');
    }
    el('previous-question').disabled = index === 0;
    el('next-question').textContent = index === state.paper.questions.length - 1 ? 'View results →' : 'Next question →';
    el('answered-count').textContent = `${answeredCount()} of ${state.paper.questions.length} answered`;
    el('nav-answered-count').textContent = `${answeredCount()}/${state.paper.questions.length}`;
    el('progress-fill').style.width = `${(answeredCount() / state.paper.questions.length) * 100}%`;
    el('question-palette').innerHTML = state.paper.questions.map((q, qIndex) => {
      const a = practice.answers[qIndex];
      const classes = ['palette-button'];
      if (qIndex === index) classes.push('current');
      if (a?.status === 'correct') classes.push('done');
      else if (a && a.status !== 'correct') classes.push('wrong');
      return `<button class="${classes.join(' ')}" type="button" data-index="${qIndex}" aria-label="Go to question ${q.number}" aria-current="${qIndex === index ? 'step' : 'false'}">${escapeHtml(q.number)}</button>`;
    }).join('');
    el('question-palette').querySelectorAll('button[data-index]').forEach((button) => button.addEventListener('click', () => navigateToQuestion(Number(button.dataset.index))));
    const timerChip = el('question-timer');
    timerChip.classList.toggle('hidden', !practice.limitSeconds);
    if (practice.limitSeconds) {
      if (!answer && practice.activeStartedAt === null) beginCurrentClock();
      updateTimerDisplay();
    }
    if (shouldScroll) el('practice-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pauseCurrentClock() {
    const practice = state.practice;
    if (!practice || !practice.limitSeconds || practice.activeStartedAt === null) return;
    const elapsed = Date.now() - practice.activeStartedAt;
    practice.remainingMs[practice.index] = Math.max(0, practice.remainingMs[practice.index] - elapsed);
    practice.activeStartedAt = null;
  }

  function beginCurrentClock() {
    const practice = state.practice;
    if (!practice || !practice.limitSeconds || practice.answers[practice.index]) return;
    if (practice.remainingMs[practice.index] <= 0) {
      timeExpired();
      return;
    }
    practice.activeStartedAt = Date.now();
  }

  function startTimer() {
    stopTimer();
    if (!state.practice?.limitSeconds) return;
    state.timerInterval = window.setInterval(timerTick, 200);
    updateTimerDisplay();
  }

  function stopTimer() {
    if (state.timerInterval !== null) window.clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  function timerTick() {
    const practice = state.practice;
    if (!practice || !practice.limitSeconds || practice.activeStartedAt === null) return;
    const remaining = practice.remainingMs[practice.index] - (Date.now() - practice.activeStartedAt);
    updateTimerDisplay(remaining);
    if (remaining <= 0) timeExpired();
  }

  function updateTimerDisplay(remainingOverride) {
    const practice = state.practice;
    if (!practice?.limitSeconds) return;
    let remaining = practice.remainingMs[practice.index];
    if (remainingOverride !== undefined) remaining = remainingOverride;
    else if (practice.activeStartedAt !== null) remaining -= Date.now() - practice.activeStartedAt;
    remaining = Math.max(0, remaining);
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    el('question-timer').querySelector('span').textContent = `${minutes}:${seconds}`;
    el('question-timer').classList.toggle('urgent', totalSeconds <= 15 && totalSeconds > 0);
  }

  function selectAnswer(optionLabel) {
    const practice = state.practice;
    if (!practice || practice.answers[practice.index]) return;
    const question = state.paper.questions[practice.index];
    pauseCurrentClock();
    practice.answers[practice.index] = {
      selected: optionLabel,
      status: optionLabel === question.correctAnswer ? 'correct' : 'incorrect',
      at: Date.now()
    };
    renderPracticeQuestion();
    if (practice.index < state.paper.questions.length - 1) showToast(practice.answers[practice.index].status === 'correct' ? 'Correct answer.' : 'Answer recorded. Review the explanation below.');
    else showToast('Answer recorded. You can review it before finishing.');
  }

  function timeExpired() {
    const practice = state.practice;
    if (!practice || practice.answers[practice.index]) return;
    practice.remainingMs[practice.index] = 0;
    practice.activeStartedAt = null;
    practice.answers[practice.index] = { selected: null, status: 'timeout', at: Date.now() };
    renderPracticeQuestion();
    showToast('Time expired for this question. The answer is now revealed.');
  }

  function navigateToQuestion(nextIndex) {
    const practice = state.practice;
    if (!practice || nextIndex < 0 || nextIndex >= state.paper.questions.length || nextIndex === practice.index) return;
    pauseCurrentClock();
    practice.index = nextIndex;
    if (practice.limitSeconds && !practice.answers[nextIndex]) beginCurrentClock();
    renderPracticeQuestion();
  }

  function finishPractice() {
    if (!state.practice) return;
    pauseCurrentClock();
    stopTimer();
    renderResults();
    showView('results-view');
  }

  function renderResults() {
    const questions = state.paper.questions;
    const answers = state.practice.answers;
    const correct = answers.filter((answer) => answer?.status === 'correct').length;
    const incorrect = answers.filter((answer) => answer && answer.status !== 'correct').length;
    const unanswered = answers.filter((answer) => !answer).length;
    const percent = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const elapsedMs = Date.now() - state.practice.startedAt;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
    el('results-subtitle').textContent = `${state.paper.title} · Time in session ${String(elapsedMinutes).padStart(2, '0')}:${String(elapsedSeconds).padStart(2, '0')}`;
    el('results-stats').innerHTML = [
      renderStat('Score', `${correct}/${questions.length}`, `${percent}% correct`),
      renderStat('Correct', correct, 'Answers matching the key'),
      renderStat('Incorrect / timed out', incorrect, 'Answered incorrectly or ran out of time'),
      renderStat('Unanswered', unanswered, 'Questions left blank')
    ].join('');
    el('results-review-list').innerHTML = questions.map((question, index) => {
      const answer = answers[index];
      const answerStatus = !answer ? 'unanswered' : answer.status === 'correct' ? 'correct' : 'incorrect';
      const statusLabel = !answer ? 'Unanswered' : answer.status === 'timeout' ? 'Timed out' : answer.status === 'correct' ? 'Correct' : 'Incorrect';
      const userLabel = answer?.selected ? `Your answer: ${answer.selected}` : 'Your answer: —';
      return `<details class="preview-item"><summary class="preview-summary"><span class="question-number-chip">${escapeHtml(question.label)}</span><span class="preview-summary-text"><strong>${renderMarkdown(question.stem).replace(/^<p>|<\/p>$/g, '')}</strong><span class="result-line"><span class="result-pill ${answerStatus}">${statusLabel}</span><span>${escapeHtml(userLabel)}</span><span>Key: ${escapeHtml(question.correctAnswer || 'Missing')}</span></span></span></summary><div class="preview-body"><div class="preview-options">${question.options.map((option) => {
        const isCorrect = option.label === question.correctAnswer;
        const chosenWrong = answer?.selected === option.label && !isCorrect;
        return `<div class="preview-option ${isCorrect ? 'is-correct' : ''} ${chosenWrong ? 'chosen-wrong' : ''}"><span class="opt-letter">${escapeHtml(option.label)}.</span><div class="markdown-content">${renderMarkdown(option.text)}</div></div>`;
      }).join('')}</div><p class="answer-key">Correct answer: ${escapeHtml(question.correctAnswer || 'Missing')} · ${escapeHtml(userLabel)}</p><div class="preview-explanation"><h4>Explanation</h4>${question.explanation.trim() ? `<div class="markdown-content">${renderMarkdown(question.explanation)}</div>` : '<p class="muted small-text">No explanation included in source.</p>'}</div></div></details>`;
    }).join('');
  }

  function loadFile(file) {
    if (!file) return;
    if (!/\.(md|markdown)$/i.test(file.name) && file.type !== 'text/markdown' && file.type !== 'text/plain') {
      showToast('Choose a Markdown text file (.md or .markdown).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPaper(String(reader.result || ''), file.name);
    reader.onerror = () => showToast('Could not read that file. Try saving it as UTF-8 Markdown.');
    reader.readAsText(file);
  }

  function downloadSource() {
    if (!state.markdown) return;
    const blob = new Blob([state.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = state.filename || 'question-paper.md';
    document.body.appendChild(anchor);
    anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exitPractice() {
    if (answeredCount() > 0 && !window.confirm('Exit this session? Your answers from the current session will be discarded.')) return;
    pauseCurrentClock();
    stopTimer();
    state.practice = null;
    showView('paper-view');
  }

  function updateRecentPaper() {
    const section = el('recent-paper');
    let markdown = '', filename = '';
    try { markdown = localStorage.getItem(STORAGE_MARKDOWN) || ''; filename = localStorage.getItem(STORAGE_FILENAME) || 'question-paper.md'; } catch (_) { /* no storage */ }
    if (!markdown) { section.classList.add('hidden'); return; }
    const validation = parsePaper(markdown, filename);
    section.classList.remove('hidden');
    section.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap"><div><p class="eyebrow" style="margin-bottom:6px">LAST OPENED PAPER</p><strong>${escapeHtml(validation.paper.title)}</strong><p class="muted small-text" style="margin:5px 0 0">${escapeHtml(filename)} · ${validation.counts.questions} questions</p></div><button id="restore-recent" class="button button-secondary" type="button">Reopen paper →</button></div>`;
    el('restore-recent').addEventListener('click', () => setPaper(markdown, filename));
  }

  function registerEvents() {
    el('paper-file').addEventListener('change', (event) => { loadFile(event.target.files && event.target.files[0]); event.target.value = ''; });
    el('sample-button').addEventListener('click', () => setPaper(SAMPLE_MARKDOWN, SAMPLE_FILENAME));
    el('back-to-import').addEventListener('click', () => { updateRecentPaper(); showView('import-view'); });
    el('brand-home').addEventListener('click', (event) => { event.preventDefault(); if (state.practice) exitPractice(); else { updateRecentPaper(); showView('import-view'); } });
    el('start-practice').addEventListener('click', startPractice);
    el('export-paper').addEventListener('click', downloadSource);
    el('previous-question').addEventListener('click', () => navigateToQuestion(state.practice.index - 1));
    el('next-question').addEventListener('click', () => {
      if (state.practice.index === state.paper.questions.length - 1) finishPractice();
      else navigateToQuestion(state.practice.index + 1);
    });
    el('finish-practice').addEventListener('click', () => {
      if (answeredCount() < state.paper.questions.length && !window.confirm(`Finish now? ${state.paper.questions.length - answeredCount()} question(s) are still unanswered.`)) return;
      finishPractice();
    });
    el('exit-practice').addEventListener('click', exitPractice);
    el('retry-paper').addEventListener('click', startPractice);
    el('results-back').addEventListener('click', () => showView('paper-view'));
    window.addEventListener('online', () => { el('connection-status').innerHTML = '<span class="status-dot"></span> Online'; });
    window.addEventListener('offline', () => { el('connection-status').innerHTML = '<span class="status-dot"></span> Offline-ready'; });
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault(); state.deferredInstallPrompt = event; el('install-button').classList.remove('hidden');
    });
    el('install-button').addEventListener('click', async () => {
      if (!state.deferredInstallPrompt) return;
      state.deferredInstallPrompt.prompt();
      await state.deferredInstallPrompt.userChoice;
      state.deferredInstallPrompt = null;
      el('install-button').classList.add('hidden');
    });
    // Keyboard shortcuts for desktop testing; ignore them while typing in form fields.
    document.addEventListener('keydown', (event) => {
      if (el('practice-view').classList.contains('hidden') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
      if (!state.practice) return;
      if (['1','2','3','4'].includes(event.key)) {
        const question = state.paper.questions[state.practice.index];
        const option = question.options[Number(event.key) - 1];
        if (option && !state.practice.answers[state.practice.index]) selectAnswer(option.label);
      } else if (event.key.toLowerCase() === 'n' && state.practice.index < state.paper.questions.length - 1) navigateToQuestion(state.practice.index + 1);
      else if (event.key.toLowerCase() === 'p' && state.practice.index > 0) navigateToQuestion(state.practice.index - 1);
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {
        // A service worker is an enhancement; the app remains usable without it.
      });
    }
  }

  function init() {
    registerEvents();
    registerServiceWorker();
    updateRecentPaper();
    if (!navigator.onLine) el('connection-status').innerHTML = '<span class="status-dot"></span> Offline-ready';
    // Direct file-open works for basic testing, but installation/offline caching needs HTTPS or localhost.
    if (location.protocol === 'file:') showToast('For Home Screen installation, serve this folder over HTTPS. See README.');
  }

  init();
})();
