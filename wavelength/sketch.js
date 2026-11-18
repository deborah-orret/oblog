let teams = [
  { name: "Green",    color: "#32c759" },
  { name: "Red",  color: "#ff3a30" },
  { name: "Blue",    color: "#0161fd" },
  { name: "Yellow",  color: "#ffcc02" },

];

let targetZones = [];

// stores each team's guess angle
let guesses = [null, null, null, null];

// which team is currently placing a guess
let selectedTeam = null;


// -----------------------------
// DIAL SETTINGS
// -----------------------------

let dialX;
let dialY;

let dialRadius = 300;

// width of each target strip in radians
let zoneAngleWidth = 0.24;

// minimum angular gap between strips
let minZoneGap = 0.055;


// -----------------------------
// COVER ANIMATION
// -----------------------------

let coverState = "hidden";

/*
hidden
revealing
revealed
hiding
*/

let revealProgress = 0;
let revealSpeed = 0.02;
let left, right;
const studentView = new URLSearchParams(location.search).get("view") === "student";
let syncChannel;
const syncKey = "black-cat-wavelength-message";
function createSyncId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function getTeacherId() {
  if (studentView) return null;
  try {
    let id = sessionStorage.getItem('wavelength-teacher-id');
    if (!id) {
      id = createSyncId();
      sessionStorage.setItem('wavelength-teacher-id', id);
    }
    return id;
  } catch {
    return createSyncId();
  }
}
const teacherId = getTeacherId();
let activeTeacherId = studentView ? null : teacherId;
let roundId = studentView ? null : createSyncId();
// Middle-school classroom prompts: familiar objects, activities, stories, and ideas.
const spectrumCategories = [
  ['Hot', 'Cold'],
  ['Quiet', 'Loud'],
  ['Tiny', 'Huge'],
  ['Slow', 'Fast'],
  ['Light', 'Heavy'],
  ['Soft', 'Hard'],
  ['Smooth', 'Rough'],
  ['Dry', 'Wet'],
  ['Bright', 'Dark'],
  ['Sweet', 'Sour'],
  ['Mild', 'Spicy'],
  ['Crunchy', 'Chewy'],
  ['Snack', 'Full meal'],
  ['Breakfast food', 'Dinner food'],
  ['Everyday food', 'Special occasion food'],
  ['Easy', 'Difficult'],
  ['Simple', 'Complicated'],
  ['Boring', 'Exciting'],
  ['Relaxing', 'Stressful'],
  ['Serious', 'Silly'],
  ['Ordinary', 'Extraordinary'],
  ['Predictable', 'Surprising'],
  ['Familiar', 'Unfamiliar'],
  ['Realistic', 'Fantastical'],
  ['Old-fashioned', 'Futuristic'],
  ['Useful', 'Useless'],
  ['Fragile', 'Sturdy'],
  ['Cheap', 'Expensive'],
  ['Common', 'Rare'],
  ['Temporary', 'Permanent'],
  ['Natural', 'Human-made'],
  ['Indoor activity', 'Outdoor activity'],
  ['Solo activity', 'Group activity'],
  ['Summer activity', 'Winter activity'],
  ['Morning activity', 'Nighttime activity'],
  ['Work', 'Play'],
  ['Planning', 'Improvising'],
  ['Luck', 'Skill'],
  ['Uses imagination', 'Uses calculation'],
  ['Practical', 'Decorative'],
  ['Book is better', 'Movie is better'],
  ['Funny movie', 'Scary movie'],
  ['Hero', 'Villain'],
  ['Side character', 'Main character'],
  ['Happy ending', 'Sad ending'],
  ['Easy to learn', 'Hard to learn'],
  ['Easy to carry', 'Hard to carry'],
  ['Needs patience', 'Needs quick thinking'],
  ['Quiet hobby', 'Active hobby'],
  ['Small discovery', 'World-changing discovery']
];
let lastCategoryIndex = -1;

function chooseRandomCategory() {
  // Choose a different pair from the previous click.
  let index = Math.floor(Math.random() * (spectrumCategories.length - 1));
  if (lastCategoryIndex === -1) index = Math.floor(Math.random() * spectrumCategories.length);
  else if (index >= lastCategoryIndex) index++;
  lastCategoryIndex = index;
  const [leftLabel, rightLabel] = spectrumCategories[index];
  left.value(leftLabel);
  right.value(rightLabel);
  publishState();
}

// =====================================================
// SETUP
// =====================================================

function setup() {
  const canvas = createCanvas(900, 650);
  canvas.parent("game");
  textFont('DM Sans');

  dialX = width / 2;
  dialY = 430;

  textAlign(CENTER, CENTER);

  left = createInput();
  left.parent("game");
  left.attribute("aria-label", "Left end of the spectrum");
  left.addClass("spectrum-input");
  left.addClass("spectrum-left");

  right = createInput();
  right.parent("game");
  right.attribute("aria-label", "Right end of the spectrum");
  right.addClass("spectrum-input");
  right.addClass("spectrum-right");

  generateTargetZones();
  setupViews();
}


// =====================================================
// DRAW
// =====================================================

function draw() {
  background("#fffef6");

  updateCoverAnimation();

  drawTitle();
  drawDial();
  drawGuesses();
  drawTeamButtons();
}


// =====================================================
// TITLE
// =====================================================

function drawTitle() {
  fill("#17213c");
  noStroke();

  textStyle(BOLD);
  textSize(34);

  text("Westridge Wavelength", width / 2+5, 65);

  textStyle(NORMAL);

  fill("#555");
  textSize(16);
}


// =====================================================
// DIAL
// =====================================================

function drawDial() {

  // OUTER BORDER
  stroke("#17213c");
  strokeWeight(18);
  noFill();

  

  arc(
    dialX,
    dialY,
    dialRadius * 2,
    dialRadius * 2,
    PI,
    TWO_PI
  );


  // BACKGROUND
  noStroke();
  fill("#fffef6");

  arc(
    dialX,
    dialY,
    dialRadius * 2 - 22,
    dialRadius * 2 - 22,
    PI,
    TWO_PI,
    CHORD
  );


  // TARGETS
  drawTargetZones();


  // COVER
  drawCover();


  // CENTER
  fill("#d7263d");
  noStroke();

  circle(
    dialX,
    dialY,
    80
  );
}


// =====================================================
// TARGET ZONES
// =====================================================

function drawTargetZones() {

  let targetRadius = dialRadius - 20;

  for (let zone of targetZones) {

    fill(zone.color);
    noStroke();

    arc(
      dialX,
      dialY,
      targetRadius * 2,
      targetRadius * 2,
      zone.startAngle,
      zone.endAngle,
      PIE
    );
  }
}


// =====================================================
// COVER
// =====================================================

function drawCover() {

  if (revealProgress >= 1) {
    return;
  }

  let coverRadius = dialRadius - 20;

  let startAngle = lerp(
    PI,
    TWO_PI,
    revealProgress
  );

  fill("#14204a");
  noStroke();

  arc(
    dialX,
    dialY,
    coverRadius * 2,
    coverRadius * 2,
    startAngle,
    TWO_PI,
    PIE
  );
}


// =====================================================
// DRAW GUESSES
// =====================================================

function drawGuesses() {

  for (let i = 0; i < guesses.length; i++) {

    if (guesses[i] === null) {
      continue;
    }

    let guess = guesses[i];

    stroke("white");
    strokeWeight(5);

    fill(teams[i].color);

    circle(
      guess.x,
      guess.y,
      24
    );
  }
}


// =====================================================
// RANDOM TARGET GENERATION
// =====================================================

function generateTargetZones() {

  targetZones = [];

  let attempts = 0;

  while (
    targetZones.length < teams.length &&
    attempts < 10000
  ) {

    attempts++;

    let startAngle = random(
      PI + 0.15,
      TWO_PI - zoneAngleWidth - 0.15
    );

    let endAngle =
      startAngle + zoneAngleWidth;

    let valid = true;


    for (let zone of targetZones) {

      if (
        startAngle <
        zone.endAngle + minZoneGap
        &&
        endAngle >
        zone.startAngle - minZoneGap
      ) {

        valid = false;
      }
    }


    if (valid) {

      let index = targetZones.length;

      targetZones.push({
        team: index,
        color: teams[index].color,
        startAngle: startAngle,
        endAngle: endAngle
      });
    }
  }

  // Guarantee a target for every team if random placement runs out of space.
  if (targetZones.length < teams.length) {
    const slot = (PI - 0.3) / teams.length;
    targetZones = teams.map((team, index) => {
      const startAngle = PI + 0.15 + index * slot;
      return { team: index, color: team.color, startAngle, endAngle: startAngle + zoneAngleWidth };
    });
  }
  shuffle(targetZones, true);
}


// =====================================================
// COVER ANIMATION
// =====================================================

function updateCoverAnimation() {

  if (coverState === "revealing") {

    revealProgress += revealSpeed;

    if (revealProgress >= 1) {
      revealProgress = 1;
      coverState = "revealed";
    }
  }


  else if (coverState === "hiding") {

    revealProgress -= revealSpeed;

    if (revealProgress <= 0) {
      revealProgress = 0;
      coverState = "hidden";
    }
  }
}


// =====================================================
// REVEAL / HIDE
// =====================================================

function revealTargets() {

  if (
    coverState === "hidden" ||
    coverState === "hiding"
  ) {
    coverState = "revealing";
  }
}


function hideTargets() {

  if (
    coverState === "revealed" ||
    coverState === "revealing"
  ) {
    coverState = "hiding";
  }
}


function toggleTargets() {

  if (
    coverState === "hidden" ||
    coverState === "hiding"
  ) {

    revealTargets();

  } else {

    hideTargets();
  }
}


// =====================================================
// NEXT ROUND
// =====================================================

function nextRound() {
  roundId = createSyncId();

  generateTargetZones();

  guesses = Array(teams.length).fill(null);

  selectedTeam = null;

  revealProgress = 0;
  coverState = "hidden";
  publishState();
}


// =====================================================
// CONTROLS
// =====================================================

function drawControls() {

  let toggleLabel = "Reveal Targets";

  if (
    coverState === "revealed" ||
    coverState === "revealing"
  ) {
    toggleLabel = "Hide Targets";
  }


  drawButton(
    width / 2 - 120,
    580,
    200,
    55,
    toggleLabel
  );


  drawButton(
    width / 2 + 120,
    580,
    200,
    55,
    "Next Round"
  );
}


// =====================================================
// TEAM BUTTONS
// =====================================================

function drawTeamButtons() {

  let spacing = Math.min(100, 700 / teams.length);
  let startX = width / 2 - (teams.length - 1) * spacing / 2;
  let y = 500;

  for (let i = 0; i < teams.length; i++) {

    let x =
      startX +
      i * spacing;

    // selected team gets a thicker outline
    if (selectedTeam === i) {

      stroke("#ffffff");
      strokeWeight(6);

    } else {

      noStroke()
    }

    fill(teams[i].color);

    ellipse(
      x,
      y,
      55,
      55,
      10
    );


    fill("#17213c");
    noStroke();

    textSize(12);
    text(teams[i].name.slice(0, 12), x, y + 40);

  }

  rectMode(CORNER);
}


// =====================================================
// BUTTON DRAWING
// =====================================================

function drawButton(x, y, w, h, label) {

  rectMode(CENTER);

  fill("#78c2c4");
  noStroke()
 
  rect(
    x,
    y,
    w,
    h,
    10
  );


  fill("#ffffff");
  noStroke();

  textSize(18);

  text(
    label,
    x,
    y
  );

  textStyle(NORMAL);

  rectMode(CORNER);
}


// =====================================================
// BUTTON HIT TEST
// =====================================================

function buttonClicked(x, y, w, h) {

  return (
    mouseX > x - w / 2 &&
    mouseX < x + w / 2 &&
    mouseY > y - h / 2 &&
    mouseY < y + h / 2
  );
}


// =====================================================
// CHECK IF CLICK IS ON THE DIAL
// =====================================================

function isOnDial() {

  let dx =
    mouseX - dialX;

  let dy =
    mouseY - dialY;

  let distanc =
    sqrt(
      dx * dx +
      dy * dy
    );

  // must be inside the circle
  // AND above the center line

  return (
    distanc <= dialRadius &&
    mouseY <= dialY
  );
}


// =====================================================
// MOUSE
// =====================================================

function mousePressed() {
  if (!studentView) return;

  // ---------------------------------
  // TEAM BUTTONS
  // ---------------------------------

  let spacing = Math.min(100, 700 / teams.length);
  let startX = width / 2 - (teams.length - 1) * spacing / 2;
  let teamButtonY = 500;

  for (let i = 0; i < teams.length; i++) {

    let x =
      startX +
      i * spacing;

    if (
      buttonClicked(
        x,
        teamButtonY,
        55,
        55
      )
    ) {

      selectedTeam = i;
      if (studentView) sendMessage({ type: 'select-team', team: i, teacherId: activeTeacherId, roundId });
      publishState();

      return;
    }
  }


  // ---------------------------------
  // PLACE GUESS
  // ---------------------------------

    if (selectedTeam !== null &&isOnDial()) {
  
    guesses[selectedTeam] = {
      x: mouseX,
      y: mouseY
    };
    if (studentView) {
      sendMessage({ type: 'place-guess', team: selectedTeam, guess: guesses[selectedTeam], teacherId: activeTeacherId, roundId });
    }
  
    selectedTeam = null;
    publishState();
  }
}

// The teacher owns round settings; students select teams and place guesses.
function sendMessage(message) {
  if (syncChannel) {
    syncChannel.postMessage(message);
  } else {
    try {
      localStorage.setItem(syncKey, JSON.stringify({ ...message, nonce: Math.random() }));
    } catch (error) {
      document.getElementById('sync-status').textContent = 'Tab syncing is unavailable. Open the game through your website or a local web server.';
    }
  }
}

function publishState() {
  if (studentView) return;
  sendMessage({
    type: 'state', teacherId, roundId, teams, targetZones, guesses, selectedTeam,
    revealed: coverState === 'revealed' || coverState === 'revealing',
    leftLabel: left.value(), rightLabel: right.value()
  });
  const button = document.getElementById('toggle-targets');
  if (button) {
    const revealed = coverState === 'revealed' || coverState === 'revealing';
    button.textContent = revealed ? 'Hide Spectrum' : 'Reveal Spectrum';
    button.classList.toggle('is-revealed', revealed);
  }
}

function receiveMessage(message) {
  if (!message || typeof message !== 'object') return;
  if (message.type === 'teacher-ready' && studentView) {
    // A newly opened or reloaded teacher tab explicitly reconnects its student.
    activeTeacherId = message.teacherId;
    sendMessage({ type: 'request', teacherId: activeTeacherId });
  } else if (message.type === 'request' && !studentView) {
    if (message.teacherId && message.teacherId !== teacherId) return;
    publishState();
  } else if (message.type === 'select-team' && !studentView) {
    if (message.teacherId !== teacherId) return;
    if (message.roundId !== roundId) { publishState(); return; }
    if (!Number.isInteger(message.team) || message.team < 0 || message.team >= teams.length) return;
    selectedTeam = message.team;
    publishState();
  } else if (message.type === 'place-guess' && !studentView) {
    if (message.teacherId !== teacherId) return;
    if (message.roundId !== roundId) { publishState(); return; }
    if (!Number.isInteger(message.team) || message.team < 0 || message.team >= teams.length) return;
    const guess = message.guess;
    if (!guess || !Number.isFinite(guess.x) || !Number.isFinite(guess.y)) return;
    if (guess.y > dialY || Math.hypot(guess.x - dialX, guess.y - dialY) > dialRadius) return;
    guesses[message.team] = { x: guess.x, y: guess.y };
    selectedTeam = null;
    publishState();
  } else if (message.type === 'state' && studentView) {
    // Ignore other open teacher tabs so an old game cannot restore its guesses.
    if (activeTeacherId && message.teacherId !== activeTeacherId) return;
    activeTeacherId = message.teacherId;
    if (roundId !== message.roundId) {
      guesses = Array(message.teams.length).fill(null);
      selectedTeam = null;
      revealProgress = 0;
      coverState = 'hidden';
    }
    roundId = message.roundId;
    teams = message.teams;
    targetZones = message.targetZones;
    guesses = message.guesses;
    selectedTeam = message.selectedTeam;
    left.value(message.leftLabel);
    right.value(message.rightLabel);
    document.getElementById('spectrum-left-label').textContent = message.leftLabel;
    document.getElementById('spectrum-right-label').textContent = message.rightLabel;
    if (message.revealed) revealTargets();
    else hideTargets();
  }
}

function setupViews() {
  document.querySelector('.teacher-home').hidden = studentView;
  document.title = studentView ? 'Westridge Wavelength | Student' : 'Westridge Wavelength | Teacher';
  document.body.classList.add(studentView ? 'student-view' : 'teacher-view');
  const status = document.createElement('p');
  status.id = 'sync-status';
  status.setAttribute('role', 'status');
  document.body.append(status);
  if (typeof BroadcastChannel !== 'undefined') {
    syncChannel = new BroadcastChannel('black-cat-wavelength');
    syncChannel.onmessage = event => receiveMessage(event.data);
  } else {
    window.addEventListener('storage', event => {
      if (event.key !== syncKey || !event.newValue) return;
      try { receiveMessage(JSON.parse(event.newValue)); } catch (error) { /* Ignore invalid messages. */ }
    });
  }
  if (studentView) {
    left.hide();
    right.hide();
    for (const side of ['left', 'right']) {
      const label = document.createElement('span');
      label.id = `spectrum-${side}-label`;
      label.className = `spectrum-label spectrum-${side}`;
      document.getElementById('game').append(label);
    }
    // Request again after setup so either order of opening the tabs works.
    sendMessage({ type: 'request' });
    window.addEventListener('pageshow', () => sendMessage({ type: 'request', teacherId: activeTeacherId }));
    return;
  }
  left.input(publishState);
  right.input(publishState);
  const panel = document.createElement('section');
  panel.className = 'teacher-controls';
  panel.setAttribute('aria-label', 'Teacher controls');
  panel.innerHTML = `
    <h1>Teacher controls</h1>
    <button type="button" id="toggle-targets">Reveal Spectrum</button>
    <div class="round-controls">
      <label>Teams <input id="team-count" type="number" min="1" max="8" value="${teams.length}"></label>
    </div>
    <div id="team-settings"></div>
    <button type="button" id="next-round">Next round</button>`;
  const workspace = document.createElement('div');
  workspace.className = 'teacher-workspace';
  const board = document.getElementById('game');
  const sidebar = document.createElement('div');
  sidebar.className = 'teacher-sidebar';
  const setupDirections = document.createElement('section');
  setupDirections.className = 'teacher-directions';
  setupDirections.setAttribute('aria-label', 'Getting started');
  setupDirections.innerHTML = `
    <h2>Getting started</h2>
    <p>Select Visit app to open the student tab. Display that tab on the projector and keep the teacher tab on your device.</p>
    <p>Set the number of teams, then choose each team's name and color below.</p>`;
  sidebar.append(setupDirections, panel);
  const boardColumn = document.createElement('div');
  boardColumn.className = 'teacher-board-column';
  const gameDirections = document.createElement('section');
  gameDirections.className = 'teacher-directions';
  gameDirections.setAttribute('aria-label', 'How to play');
  gameDirections.innerHTML = `
    <h2>How to play</h2>
    <ol>
      <li>Enter the two ends of the spectrum in the boxes on your board, such as <strong>Hot</strong> and <strong>Cold</strong>. These labels appear on the student board automatically.</li>
      <li>Choose one guesser for each team. Ask the guessers to put their heads down or close their eyes, then select <strong>Reveal Spectrum</strong> so the rest of each team can see the target in its team's color.</li>
      <li>While the guessers aren't looking, each team works together to come up with a clue that fits its target's position between the two labels. Select <strong>Hide Spectrum</strong> before asking the guessers to look up or open their eyes.</li>
      <li>Each team gives its clue to its guesser. The guesser decides where the clue belongs between the two ends of the spectrum.</li>
      <li>On the student tab, select the circle in a team's color, then click the dial to place that team's guess. Select the team again to change its guess. Guesses also appear on the teacher board.</li>
      <li>Once every team has guessed, select <strong>Reveal Spectrum</strong> and compare the guesses with the targets. A team earns <strong>2 points</strong> if its guess hits the target in its own color. If a team's guess hits another team's target, the team that owns that target earns <strong>1 point</strong>.</li>
      <li>Select <strong>Next round</strong> to clear the guesses and generate new hidden targets. Update the spectrum labels for the next round.</li>
    </ol>`;
  const boardToolbar = document.createElement('div');
  boardToolbar.className = 'teacher-board-toolbar';
  const visitApp = document.createElement('a');
  visitApp.className = 'visit-app';
  visitApp.href = '?view=student';
  visitApp.target = 'wavelength-student';
  visitApp.rel = 'noopener';
  visitApp.textContent = 'Visit app ↗';
  const randomCategoryButton = document.createElement('button');
  randomCategoryButton.type = 'button';
  randomCategoryButton.textContent = 'Random Category';
  randomCategoryButton.onclick = chooseRandomCategory;
  boardToolbar.append(visitApp, randomCategoryButton);
  boardColumn.append(boardToolbar, board, gameDirections);
  document.body.prepend(workspace);
  workspace.append(sidebar, boardColumn);
  panel.append(status);
  document.getElementById('toggle-targets').onclick = () => { toggleTargets(); publishState(); };
  document.getElementById('next-round').onclick = nextRound;
  document.getElementById('team-count').onchange = event => {
    const requested = Number(event.target.value);
    if (!Number.isInteger(requested) || requested < 1 || requested > 8) {
      event.target.value = teams.length;
      return;
    }
    const colors = ['#32c759', '#ff3a30', '#0161fd', '#ffcc02', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];
    teams = Array.from({ length: requested }, (_, i) => teams[i] || { name: `Team ${i + 1}`, color: colors[i] });
    renderTeamSettings();
    nextRound();
  };
  renderTeamSettings();
  sendMessage({ type: 'teacher-ready', teacherId });
  publishState();
}

function renderTeamSettings() {
  const container = document.getElementById('team-settings');
  container.replaceChildren();
  teams.forEach((team, i) => {
    const row = document.createElement('div');
    row.className = 'team-setting';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = `Team ${i + 1} `;
    const nameInput = document.createElement('input');
    nameInput.value = team.name;
    nameInput.maxLength = 40;
    nameInput.oninput = () => { team.name = nameInput.value; publishState(); };
    nameLabel.append(nameInput);
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Color ';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = team.color;
    colorInput.oninput = () => {
      team.color = colorInput.value;
      targetZones.forEach(zone => { if (zone.team === i) zone.color = team.color; });
      publishState();
    };
    colorLabel.append(colorInput);
    row.append(nameLabel, colorLabel);
    container.append(row);
  });
}
