const characters = [
  { name: 'Devi', clue: 'Academics are one of her interests.', color: '#efd0ef' },
  { name: 'Cady', clue: 'She likes wildlife.', color: '#c8e9b7' },
  { name: 'Lara Jean', clue: 'Look closely at the letters in her name.', color: '#c8e4ef' },
  { name: 'Rory', clue: 'Academics are one of her interests.', color: '#f6efbb' },
  { name: 'Aaron', clue: 'Look closely at the letters in his name.', color: '#c3d3c9' },
  { name: 'Annie', clue: 'She has a half sister.', color: '#f8e3c3' },
  { name: 'Paxton', clue: 'His name could be a connection.', color: '#dedbd3' },
  { name: 'Ellis', clue: 'He likes wildlife.', color: '#ded2ed' },
  { name: 'Peter', clue: 'His name could be a connection.', color: '#c9d9e4' },
  { name: 'Jess', clue: 'He has a half sister.', color: '#efc8cb' }
];
const matches = [
  ['Devi', 'Rory', 'Both like academics.'],
  ['Annie', 'Jess', 'Both have a half sister.'],
  ['Peter', 'Paxton', 'Both names start with P.'],
  ['Ellis', 'Cady', 'Both like wildlife.'],
  ['Aaron', 'Lara Jean', 'Both have repeated A\u2019s in their first names.']
];
const teacherView = new URLSearchParams(location.search).get('view') === 'teacher';
let selected = null;
let pairs = [];
const attempts = [];
const key = pair => [...pair].sort().join('|');
const solutions = new Set(matches.map(match => key(match.slice(0, 2))));
const characterBoard = document.getElementById('characters');
const pairBoard = document.getElementById('pairs');
const checkButton = document.getElementById('check');
const result = document.getElementById('result');
let draggedCharacter = null;
const preview = document.getElementById('card-preview');
preview.addEventListener('click', event => {
  const bounds = document.querySelector('#preview-image img').getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) preview.close();
});
function showCard(name) {
  preview.setAttribute('aria-label', `${name}'s character card`);
  document.getElementById('preview-image').replaceChildren(cardImage(name));
  preview.showModal();
}

function cardImage(name) {
  const image = document.createElement('img');
  image.src = `assets/${name.toLowerCase().replaceAll(' ', '')}.png`;
  image.alt = `${name}'s character profile card`;
  image.draggable = false;
  return image;
}

function formPair(first, second) {
  const used = new Set(pairs.flat());
  if (first === second || used.has(first) || used.has(second)) return;
  if (![first, second].every(name => characters.some(character => character.name === name))) return;
  pairs.push([first, second]);
  selected = null;
  result.textContent = '';
  render();
}

function render() {
  characterBoard.replaceChildren();
  const used = new Set(pairs.flat());
  characters.forEach(character => {
    if (used.has(character.name)) return;
    const button = document.createElement('button');
    button.className = 'character';
    button.dataset.name = character.name;
    button.draggable = true;
    button.setAttribute('aria-label', `Enlarge ${character.name}'s card`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-pressed', String(selected === character.name));
    button.append(cardImage(character.name));
    button.ondragstart = event => {
      draggedCharacter = character.name;
      event.dataTransfer.setData('text/plain', character.name);
      event.dataTransfer.effectAllowed = 'move';
      button.classList.add('dragging');
    };
    button.ondragend = () => {
      draggedCharacter = null;
      document.querySelectorAll('.drop-target, .dragging').forEach(element => element.classList.remove('drop-target', 'dragging'));
    };
    button.ondragover = event => {
      if (!draggedCharacter || draggedCharacter === character.name) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      button.classList.add('drop-target');
    };
    button.ondragleave = () => button.classList.remove('drop-target');
    button.ondrop = event => {
      event.preventDefault();
      const source = draggedCharacter;
      draggedCharacter = null;
      if (source) formPair(source, character.name);
    };
    button.onclick = () => {
      showCard(character.name);
    };
    characterBoard.append(button);
  });
  pairBoard.replaceChildren();
  pairs.forEach((pair, index) => {
    const row = document.createElement('div');
    row.className = 'pair';
    const names = document.createElement('div');
    names.className = 'paired-cards';
    pair.forEach(name => {
      const button = document.createElement('button');
      button.className = 'character';
      button.setAttribute('aria-label', `Enlarge ${name}'s card`);
      button.setAttribute('aria-haspopup', 'dialog');
      button.append(cardImage(name));
      button.onclick = () => showCard(name);
      names.append(button);
    });
    const remove = document.createElement('button');
    remove.className = 'secondary';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove pair ${pair.join(' and ')}`);
    remove.onclick = () => { pairs.splice(index, 1); selected = null; result.textContent = ''; render(); characterBoard.firstChild.focus(); };
    row.append(names, remove);
    pairBoard.append(row);
  });
  checkButton.disabled = pairs.length !== 5;
  document.getElementById('clear').disabled = pairs.length === 0 && selected === null;
}

checkButton.onclick = () => {
  if (pairs.length !== 5) return;
  const score = pairs.filter(pair => solutions.has(key(pair))).length;
  result.textContent = score === 5 ? '5 out of 5 — You win!' : `${score} out of 5`;
  if (score === 5) document.getElementById('win-dialog').showModal();
  const signature = pairs.map(key).sort().join(';');
  if (attempts.some(attempt => attempt.signature === signature)) {
    return;
  }
  attempts.push({ signature, pairs: pairs.map(pair => [...pair]), score });
  const history = document.getElementById('history');
  history.replaceChildren();
  attempts.forEach((attempt, index) => {
    const entry = document.createElement('div');
    entry.className = 'attempt';
    const heading = document.createElement('strong');
    heading.textContent = `Attempt ${index + 1}: ${attempt.score} / 5 correct`;
    const list = document.createElement('ul');
    attempt.pairs.forEach(pair => { const item = document.createElement('li'); item.textContent = pair.join(' + '); list.append(item); });
    entry.append(heading, list);
    history.prepend(entry);
  });
};
document.getElementById('clear').onclick = () => { pairs = []; selected = null; result.textContent = ''; render(); };
document.getElementById('play-again').onclick = () => {
  document.getElementById('win-dialog').close();
  pairs = [];
  selected = null;
  attempts.length = 0;
  result.textContent = '';
  document.getElementById('history').replaceChildren();
  render();
  characterBoard.firstChild.focus();
};

if (teacherView) {
  document.querySelector('.teacher-home').hidden = false;
  document.body.classList.add('teacher-detail');
  const header = document.querySelector('header');
  header.insertAdjacentHTML('beforeend', `<p></p><ul class="detail-tags" aria-label="Game tags"><li>Student Led</li><li>Groups</li><li>&lt;30 minutes</li></ul>`);
  document.title = 'Perfect Match | Teacher';
  document.getElementById('student').hidden = true;
  const guide = document.getElementById('teacher');
  guide.hidden = false;
  guide.innerHTML = `<div class="app-preview match-preview" aria-label="Perfect Match character cards"><img src="assets/devi.png" alt="Devi's card"><img src="assets/rory.png" alt="Rory's card"><img src="assets/paxton.png" alt="Paxton's card"><img src="assets/peter.png" alt="Peter's card"></div>
    <div class="visit-row"><a id="open" class="visit-app">Visit app ↗</a></div>
    <section><h2>Share the student board</h2>
    <p>Students work in groups on one device per group. Each board keeps its own attempt notebook. Share the link below; keep this teacher tab for the answer key.</p>
    <label for="student-link">Student link</label><input id="student-link" readonly>
    <div class="actions"><button id="copy">Copy student link</button></div><p id="copy-status" role="status"></p></section>
    <section><h2>How to lead the game</h2><p>Ten characters have five secret perfect matches. Have students read the cards and pair everyone before checking. The board reports only the total number of correct pairs. It never marks individual pairs right or wrong.</p><p>Encourage groups to record a prediction, change just a few pairs, and compare totals in the attempt notebook. Clear board removes the current pairs but keeps checked attempts. Reloading starts a fresh game.</p><p>Students read the original character profile cards and drag one card onto another to make a pair. They can also select two cards using touch or a keyboard.</p></section>
    <section><details><summary>Reveal teacher answer key</summary><ul id="answer-key"></ul></details></section>`;
  const url = new URL('index.html', location.href).href;
  document.getElementById('student-link').value = url;
  const open = document.getElementById('open');
  open.href = url;
  open.target = 'perfect-match-student';
  open.rel = 'noopener';
  matches.forEach(([a, b, reason]) => { const item = document.createElement('li'); item.textContent = `${a} + ${b}: ${reason}`; document.getElementById('answer-key').append(item); });
  document.getElementById('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(url); document.getElementById('copy-status').textContent = 'Student link copied.'; }
    catch { document.getElementById('student-link').select(); document.getElementById('copy-status').textContent = 'Copy the selected link with Ctrl+C or Command+C.'; }
  };
} else render();

