// Barrel artwork and click-to-move interaction adapted from Ms. Orret's p5 sketch.
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const countInput = document.getElementById('barrel-count');
const status = document.getElementById('status');
const pegButtons = [...document.querySelectorAll('[data-peg]')];
let barrelCount = 4;
let pegs = [];
let selected = null;
let moves = 0;
let won = false;

function startGame() {
  const count = Number(countInput.value);
  if (!Number.isInteger(count) || count < 1 || count > 7) { countInput.reportValidity(); return; }
  barrelCount = count;
  pegs = [Array.from({ length: count }, (_, index) => count - index), [], []];
  selected = null;
  moves = 0;
  won = false;
  status.textContent = '';
  document.getElementById('minimum').textContent = 2 ** count - 1;
  render();
}

function choosePeg(index) {
  if (won) return;
  if (selected === null) {
    if (!pegs[index].length) { status.textContent = 'This stack is empty.'; return; }
    selected = index;
    status.textContent = 'Choose a destination stack.';
  } else if (selected === index) {
    selected = null;
    status.textContent = '';
  } else {
    const source = pegs[selected];
    const target = pegs[index];
    const barrel = source[source.length - 1];
    if (target.length && target[target.length - 1] < barrel) {
      status.textContent = 'A larger barrel cannot go on a smaller one.';
    } else {
      target.push(source.pop());
      moves++;
      selected = null;
      won = pegs[2].length === barrelCount;
      status.textContent = won ? `You win! ${moves} moves.` : '';
    }
  }
  render();
}

function drawBarrel(x, y, size, highlighted) {
  const w = 60 + (size - 1) * 23;
  const h = 32;
  ctx.fillStyle = '#b5763e';
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 9); ctx.fill();
  ctx.fillStyle = '#c48c4e';
  ctx.fillRect(x - w * .3, y - h / 2, w * .6, h);
  ctx.fillStyle = '#c99658';
  ctx.beginPath(); ctx.ellipse(x, y - h / 2, w / 2, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#785028'; ctx.lineWidth = 2;
  for (const offset of [-4, 8]) {
    ctx.beginPath(); ctx.ellipse(x, y + offset, w / 2, 6, 0, 0, Math.PI); ctx.stroke();
  }
  for (const direction of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + direction * w * .25, y - 11); ctx.lineTo(x + direction * w * .25, y + 12); ctx.stroke();
  }
  if (highlighted) {
    ctx.strokeStyle = '#487e00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x - w / 2 - 5, y - h / 2 - 9, w + 10, h + 17, 12); ctx.stroke();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(0, -35);
  const positions = [180, 450, 720];
  ctx.strokeStyle = '#64503a'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(65, 365); ctx.lineTo(835, 365); ctx.stroke();
  positions.forEach((x, index) => {
    ctx.strokeStyle = selected === index ? '#487e00' : '#826745'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 350); ctx.stroke();
    pegs[index].forEach((size, level) => drawBarrel(x, 339 - level * 40, size, selected === index && level === pegs[index].length - 1));
    ctx.fillStyle = '#315d73'; ctx.font = '700 18px "DM Sans", Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(['START', '', 'END'][index], x, 408);
    pegButtons[index].setAttribute('aria-pressed', String(selected === index));
    pegButtons[index].setAttribute('aria-label', `${['Start', 'Middle', 'End'][index]} stack: ${pegs[index].join(', ') || 'empty'}, bottom to top`);
  });
  ctx.restore();
  document.getElementById('moves').textContent = moves;
}

pegButtons.forEach((button, index) => button.addEventListener('click', () => choosePeg(index)));
document.getElementById('settings').addEventListener('submit', event => { event.preventDefault(); startGame(); });
startGame();
document.fonts.ready.then(render);
