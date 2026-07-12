const STORAGE_KEY = "lumen-game-v0.1";

const elements = {
  worldTitle: document.querySelector("#world-title"),
  worldVersion: document.querySelector("#world-version"),
  sceneEyebrow: document.querySelector("#scene-eyebrow"),
  sceneTitle: document.querySelector("#scene-title"),
  sceneDescription: document.querySelector("#scene-description"),
  sceneAtmosphere: document.querySelector("#scene-atmosphere"),
  characters: document.querySelector("#characters"),
  choices: document.querySelector("#choices"),
  journal: document.querySelector("#journal"),
  progress: document.querySelector("#progress"),
  cycleStatus: document.querySelector("#cycle-status"),
  resetButton: document.querySelector("#reset-button"),
  errorMessage: document.querySelector("#error-message"),
};

let manifest;
let initialState;
let state;
const locationCache = new Map();
const characterCache = new Map();

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
  }
  return response.json();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadSavedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return clone(initialState);

  try {
    const parsed = JSON.parse(raw);
    if (!manifest.locations[parsed.currentLocationId]) return clone(initialState);
    if (!Array.isArray(parsed.visitedLocationIds) || !Array.isArray(parsed.journal)) {
      return clone(initialState);
    }
    return parsed;
  } catch {
    return clone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function getLocation(locationId) {
  if (locationCache.has(locationId)) return locationCache.get(locationId);
  const path = manifest.locations[locationId];
  if (!path) throw new Error(`Локация ${locationId} отсутствует в manifest.json`);
  const location = await fetchJson(path);
  locationCache.set(locationId, location);
  return location;
}

async function getCharacter(characterId) {
  if (characterCache.has(characterId)) return characterCache.get(characterId);
  const path = manifest.characters[characterId];
  if (!path) throw new Error(`Персонаж ${characterId} отсутствует в manifest.json`);
  const character = await fetchJson(path);
  characterCache.set(characterId, character);
  return character;
}

function hasRequirements(choice) {
  const required = choice.requiresVisited ?? [];
  return required.every((locationId) => state.visitedLocationIds.includes(locationId));
}

function renderJournal() {
  elements.journal.replaceChildren();
  state.journal.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    elements.journal.append(item);
  });

  const total = Object.keys(manifest.locations).length;
  const visited = new Set(state.visitedLocationIds).size;
  elements.progress.textContent = `${visited}/${total} пространств`;
}

async function renderCharacters(characterIds) {
  elements.characters.replaceChildren();
  if (!characterIds?.length) return;

  const characters = await Promise.all(characterIds.map(getCharacter));
  characters.forEach((character) => {
    const card = document.createElement("article");
    card.className = "character-card";

    const name = document.createElement("strong");
    name.textContent = character.name;

    const role = document.createElement("span");
    role.className = "character-role";
    role.textContent = character.role;

    const description = document.createElement("p");
    description.textContent = character.description;

    const speech = document.createElement("p");
    speech.className = "character-speech";
    speech.textContent = `«${character.speech}»`;

    card.append(name, role, description, speech);
    elements.characters.append(card);
  });
}

function renderChoices(choices) {
  elements.choices.replaceChildren();

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.textContent = choice.label;
    button.disabled = !hasRequirements(choice);

    if (button.disabled) {
      button.title = "Сначала посетите все необходимые пространства";
    }

    button.addEventListener("click", async () => {
      state.currentLocationId = choice.to;
      if (!state.visitedLocationIds.includes(choice.to)) {
        state.visitedLocationIds.push(choice.to);
      }
      state.journal.push(choice.log);
      saveState();
      await renderScene();
    });

    elements.choices.append(button);
  });
}

async function renderScene() {
  elements.errorMessage.hidden = true;
  const location = await getLocation(state.currentLocationId);

  elements.sceneEyebrow.textContent = location.eyebrow;
  elements.sceneTitle.textContent = location.title;
  elements.sceneAtmosphere.textContent = location.atmosphere;
  elements.sceneDescription.replaceChildren();

  location.description.forEach((paragraphText) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = paragraphText;
    elements.sceneDescription.append(paragraph);
  });

  elements.cycleStatus.textContent = location.ending ? "Первый цикл завершён" : "Цикл продолжается";
  elements.cycleStatus.classList.toggle("complete", Boolean(location.ending));

  await renderCharacters(location.characterIds);
  renderChoices(location.choices);
  renderJournal();
}

async function resetGame() {
  const accepted = window.confirm("Удалить локальный журнал и начать первый цикл заново?");
  if (!accepted) return;
  state = clone(initialState);
  saveState();
  await renderScene();
}

async function start() {
  try {
    manifest = await fetchJson("world/manifest.json");
    initialState = await fetchJson(manifest.initialStatePath);
    state = loadSavedState();

    elements.worldTitle.textContent = manifest.title;
    elements.worldVersion.textContent = `world ${manifest.version}`;
    elements.resetButton.addEventListener("click", resetGame);

    await renderScene();
  } catch (error) {
    console.error(error);
    elements.errorMessage.hidden = false;
    elements.errorMessage.textContent = "Мир не загрузился. Запусти игру через локальный HTTP-сервер и проверь файлы world/.";
  }
}

start();
