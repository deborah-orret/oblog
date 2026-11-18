const get = id => document.getElementById(id);
const isStudent = new URLSearchParams(location.search).get('view') === 'student';
const wagers = [2, 4, 6, 8];
const finalIndex = 16;
const teacherKey = 'bcdt-teacher-setup';
let game;
let progress;
let gradingKey;
let teacherPosition = 0;
let teacherFinalWager = false;

function element(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {
    get('status').textContent = 'Browser storage is unavailable. Keep this tab open to retain your work.';
  }
}

function field(parent, label, name, max, value) {
  const wrapper = element('label', label);
  const input = element('input');
  Object.assign(input, { name, value: value || '', maxLength: max, required: true, autocomplete: 'off' });
  wrapper.append(input);
  parent.append(wrapper);
}

function buildEditor() {
  const editor = get('editor');
  editor.replaceChildren();
  function question(parent, prefix, title, values) {
    const group = element('fieldset');
    group.append(element('legend', title));
    field(group, 'Question', `${prefix}-prompt`, 500, values?.prompt);
    field(group, 'Answer key', `${prefix}-answer`, 200, values?.answer);
    if (prefix !== 'final') {
      const label = element('label', 'Allow half credit');
      const input = element('input');
      Object.assign(input, { type: 'checkbox', name: `${prefix}-half`, checked: Boolean(values?.halfCredit) });
      label.className = 'checkbox-label';
      label.prepend(input);
      group.append(label);
    }
    parent.append(group);
  }
  for (let index = 0; index < 4; index++) {
    const category = game?.categories[index];
    const section = element('section');
    section.append(element('h3', `Category ${index + 1}`));
    field(section, 'Category name', `category-${index}`, 80, category?.name);
    for (let number = 0; number < 4; number++) {
      question(section, `${index}-${number}`, `Question ${number + 1}`, category?.questions[number]);
    }
    editor.append(section);
  }
  question(editor, 'final', 'Final question', game?.final);
}

function roundName(index, names) {
  return index === finalIndex ? 'Final question' : `${names[Math.floor(index / 4)]} · Question ${index % 4 + 1}`;
}

function studentLink(includeKey = false) {
  const url = new URL(location.href);
  url.search = '?view=student';
  const fragment = new URLSearchParams({
    game: JSON.stringify({
      id: game.id,
      categories: game.categories.map(category => category.name),
      halfCredit: game.categories.flatMap(({ questions }, category) =>
        questions.flatMap((question, index) => question.halfCredit ? [category * 4 + index] : [])),
    }),
  });
  if (includeKey) {
    url.searchParams.set('grade', '1');
    fragment.set('answers', JSON.stringify([
      ...game.categories.flatMap(category => category.questions.map(question => question.answer)),
      game.final.answer,
    ]));
  }
  url.hash = fragment;
  return url.href;
}

function copyLink(label, url, fallback) {
  const button = element('button', label);
  button.type = 'button';
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      get('status').textContent = 'Link copied.';
    } catch {
      get('status').textContent = fallback;
    }
  });
  return button;
}

function renderTeacher() {
  get('author').hidden = true;
  get('live').hidden = false;
  get('teacher-controls').hidden = false;
  get('share').hidden = false;
  get('identity').textContent = 'Teacher view';
  const link = element('a', 'Open student worksheet');
  link.className = 'button-link';
  link.href = studentLink();
  link.target = '_blank';
  link.rel = 'noopener';
  const copy = copyLink('Copy student link', link.href, 'Use your browser’s Copy Link command on “Open student worksheet.”');
  get('share').replaceChildren(link, copy);
  const names = game.categories.map(category => category.name);
  const index = teacherPosition;
  const question = index === finalIndex ? game.final : game.categories[Math.floor(index / 4)]?.questions[index % 4];
  get('round').textContent = index > finalIndex ? 'Review the answers' : roundName(index, names);
  get('read-aloud').textContent = index > finalIndex ? 'Share the grading link once everyone has locked in their final answer. Students should open it in the same browser they used to play.' :
    teacherFinalWager ? 'Ask students to lock their final wager before you read the question.' : question?.prompt || '';
  get('key').textContent = question && !teacherFinalWager ?
    `Answer key · ${question.answer}${question.halfCredit ? ' (half credit for one correct part)' : ''}` : '';
  get('advance').hidden = index > finalIndex;
  get('advance').textContent = index === finalIndex - 1 && !game.final.prompt ? 'Add final question' :
    teacherFinalWager ? 'Show final question' :
    index === finalIndex ? 'Review answer key' : index === finalIndex - 1 ? 'Collect final wagers' : 'Show next question';
  const answerKey = index > finalIndex ? [...game.categories, { name: 'Final question', questions: [game.final] }] : [];
  if (index > finalIndex) {
    const gradingLink = element('a', 'Open grading link');
    gradingLink.href = studentLink(true);
    gradingLink.className = 'button-link';
    get('share').append(gradingLink, copyLink('Copy grading link', gradingLink.href,
      'Use your browser’s Copy Link command on “Open grading link.”'));
  }
  get('scorecard').replaceChildren(...answerKey.map(category => {
    const section = element('section');
    const list = element('ol');
    list.append(...category.questions.map(({ prompt, answer, halfCredit }) =>
      element('li', `${prompt} — ${answer}${halfCredit ? ' (half credit for one correct part)' : ''}`)));
    section.append(element('h3', category.name), list);
    return section;
  }));
}

function points(entry, index) {
  if (entry.half) return entry.wager / 2;
  if (entry.correct) return entry.wager;
  return index === finalIndex ? -entry.wager : 0;
}

function score() {
  return progress.entries.reduce((total, entry, index) => total + points(entry, index), 0);
}

function normalize(answer) {
  return answer.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/\b(?:a|an|the)\b/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function gradeWorksheet() {
  if (!gradingKey || progress?.entries.length !== finalIndex + 1 ||
      !progress.entries.every(entry => entry?.answer)) return;
  progress.entries.forEach((entry, index) => {
    const answer = normalize(entry.answer);
    const parts = gradingKey[index].split(';');
    const matched = parts.filter(part => part.split('|').some(alternative => {
      const expected = normalize(alternative);
      return expected && (parts.length === 1 ? answer === expected : ` ${answer} `.includes(` ${expected} `));
    })).length;
    entry.correct = matched === parts.length;
    entry.half = !entry.correct && matched === 1 && parts.length === 2 && game.halfCredit?.includes(index);
  });
  progress.phase = 'done';
  saveProgress();
}

function worksheetAnswer(entry) {
  const row = element('div');
  row.className = 'worksheet-answer';
  const bet = element('span', entry?.wager ?? '—');
  bet.setAttribute('aria-label', entry ? `Wager ${entry.wager} points` : 'No wager');
  row.append(element('span', entry?.answer || (entry ? 'Wager locked' : '—')), bet);
  return row;
}

function worksheetRow(index) {
  const entry = progress.entries[index];
  const row = element(index === finalIndex ? 'div' : 'li');
  row.append(worksheetAnswer(entry));
  if (progress.phase === 'done') {
    const result = entry.half ? 'Half credit' : entry.correct ? 'Correct' : 'Incorrect';
    const earned = points(entry, index);
    row.append(element('small', `${result} · ${earned > 0 ? '+' : ''}${earned} pts`));
  }
  return row;
}

function renderStudent() {
  const { position, phase, entries, name } = progress;
  const entry = entries[position];
  const form = get('submit');
  const canAnswer = phase === 'answer' && !entry?.answer;
  const canWager = phase === 'final-wager' && !entry;
  get('join').hidden = true;
  get('live').hidden = false;
  get('identity').textContent = name;
  get('summary').textContent = phase === 'done' ? `${score()} points` : '';
  get('round').textContent = phase === 'done' ? 'Game complete' : phase === 'grade' ? 'Open your teacher’s grading link to see your score' :
    phase === 'final-wager' ? 'Place your final wager' : roundName(position, game.categories);

  form.reset();
  form.hidden = !canAnswer && !canWager;
  const showWager = canWager || (canAnswer && position < finalIndex);
  get('wager-label').hidden = !showWager;
  form.elements.wager.disabled = !showWager;
  get('answer-label').hidden = !canAnswer;
  form.elements.answer.disabled = !canAnswer;
  form.elements.answer.required = canAnswer;
  const used = entries.slice(position - position % 4, position).map(record => record.wager);
  const choices = canWager ? Array.from({ length: 20 }, (_, index) => index + 1) : wagers.filter(value => !used.includes(value));
  form.elements.wager.replaceChildren(...choices.map(value => new Option(value, value)));
  form.elements.wager.selectedIndex = 0;

  const next = get('continue');
  next.hidden = !entry || phase === 'grade' || phase === 'done';
  next.textContent = phase === 'final-wager' ? 'Teacher has read the final question' : 'Next Question';
  if (position === finalIndex && entry?.answer) {
    next.hidden = true;
    if (phase !== 'done') get('round').textContent = 'Final answer locked · Wait for the grading link';
  }
  if (!next.hidden) get('round').textContent += ' · Locked in';

  const board = game.categories.map((name, category) => {
    const section = element('section');
    const list = element('ol');
    for (let index = 0; index < 4; index++) list.append(worksheetRow(category * 4 + index));
    section.append(element('h3', name), list);
    return section;
  });
  const final = element('section');
  final.append(element('h3', 'Final question'), worksheetRow(finalIndex));
  get('scorecard').replaceChildren(...board, final);
}

function saveProgress() {
  save(`bcdt-worksheet-${game.id}`, progress);
}

get('author').addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const read = name => fields.get(name).trim();
  if ([...fields.values()].some(value => !value.trim())) {
    get('status').textContent = 'Fill in all categories, questions, and answer keys.';
    return;
  }
  const question = prefix => ({
    prompt: read(`${prefix}-prompt`),
    answer: read(`${prefix}-answer`),
    halfCredit: fields.has(`${prefix}-half`),
  });
  const categories = Array.from({ length: 4 }, (_, category) => ({
    name: read(`category-${category}`),
    questions: Array.from({ length: 4 }, (_, index) => question(`${category}-${index}`)),
  }));
  const sameQuestions = JSON.stringify(categories) === JSON.stringify(game?.categories.map(category => ({
    name: category.name,
    questions: category.questions.map(({ prompt, answer, halfCredit }) => ({
      prompt, answer, halfCredit: Boolean(halfCredit),
    })),
  })));
  game = {
    id: sameQuestions && game.id ? game.id :
      Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join(''),
    categories,
    final: question('final'),
  };
  if (!sameQuestions) {
    teacherPosition = 0;
    teacherFinalWager = false;
  }
  get('status').textContent = '';
  save(teacherKey, game);
  renderTeacher();
});

get('advance').addEventListener('click', () => {
  if (teacherPosition === finalIndex - 1 && !game.final.prompt) {
    get('new-room').click();
    get('author').elements.namedItem('final-prompt').focus();
    return;
  }
  if (teacherFinalWager) {
    teacherFinalWager = false;
  } else {
    teacherPosition++;
    teacherFinalWager = teacherPosition === finalIndex;
  }
  renderTeacher();
});

get('new-room').addEventListener('click', () => {
  get('live').hidden = true;
  buildEditor();
  get('author').hidden = false;
});

get('load-preset').addEventListener('click', () => {
  game = { ...novemberQuestions, final: game?.final || novemberQuestions.final };
  teacherPosition = 0;
  teacherFinalWager = false;
  buildEditor();
});

get('join').addEventListener('submit', event => {
  event.preventDefault();
  const name = event.currentTarget.elements.name.value.trim();
  if (!name) return;
  progress = { name, position: 0, phase: 'answer', entries: [] };
  saveProgress();
  renderStudent();
});

get('submit').addEventListener('submit', event => {
  event.preventDefault();
  const { position, phase, entries } = progress;
  const fields = new FormData(event.currentTarget);
  const answer = String(fields.get('answer') || '').trim();
  const wager = Number(fields.get('wager'));
  if (phase === 'final-wager') {
    if (entries[position] || !Number.isInteger(wager) || wager < 1 || wager > 20) return;
    entries[position] = { wager };
  } else if (phase === 'answer' && answer && !entries[position]?.answer) {
    if (position === finalIndex) {
      if (!entries[position]) return;
      entries[position].answer = answer;
      progress.phase = 'grade';
    } else {
      const used = entries.slice(position - position % 4).map(entry => entry.wager);
      if (!wagers.includes(wager) || used.includes(wager)) return;
      entries[position] = { answer, wager };
    }
  } else {
    get('status').textContent = 'Enter an answer before locking in.';
    return;
  }
  get('status').textContent = '';
  saveProgress();
  gradeWorksheet();
  renderStudent();
});

get('continue').addEventListener('click', () => {
  if (get('continue').hidden) return;
  if (progress.phase === 'final-wager') {
    progress.phase = 'answer';
  } else {
    progress.position++;
    if (progress.position === finalIndex) progress.phase = 'final-wager';
  }
  saveProgress();
  renderStudent();
});

if (isStudent) {
  const fragment = new URLSearchParams(location.hash.slice(1));
  try {
    game = JSON.parse(fragment.get('game'));
    const key = JSON.parse(fragment.get('answers'));
    if (Array.isArray(key) && key.length === finalIndex + 1 && key.every(answer => typeof answer === 'string' && answer.trim())) gradingKey = key;
  } catch { game = null; }
  if (!/^[a-f0-9]{32}$/.test(game?.id) || game?.categories?.length !== 4 ||
      !Array.isArray(game.categories) || !game.categories.every(name => typeof name === 'string' && name.trim() && name.length <= 80)) {
    get('status').textContent = 'Open the worksheet link shared by your teacher.';
  } else {
    progress = load(`bcdt-worksheet-${game.id}`);
    if (progress) {
      gradeWorksheet();
      renderStudent();
    }
    else get('join').hidden = false;
  }
} else {
  document.querySelector('.teacher-home').hidden = false;
  game = load(teacherKey) || novemberQuestions;
  renderTeacher();
}
