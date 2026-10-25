import { initialState, elapsed, remaining, toggleWork, toggleDay, format, validState } from './timer.js';
const KEY = 'worktimer.v1';
const $ = id => document.getElementById(id);
let state = initialState();
let storageAvailable = true;
try { const raw = localStorage.getItem(KEY); if (raw) { const parsed = JSON.parse(raw); if (!validState(parsed)) throw new Error('invalid'); state = parsed; } } catch { storageAvailable = false; }
function message(text) { $('message').textContent = text; }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageAvailable = true; } catch { storageAvailable = false; }
  updateSaveNote();
}
function updateSaveNote() {
  const note = document.querySelector('.save-note');
  note.querySelector('strong').textContent = storageAvailable ? 'Ваше время сохранено' : 'Не удалось сохранить данные';
  note.querySelector('p').textContent = storageAvailable ? 'Можно закрыть вкладку и вернуться позже. Данные хранятся в этом браузере и не синхронизируются между устройствами.' : 'Хранилище браузера недоступно или данные повреждены. Сохраните резервную копию перед закрытием вкладки.';
}
let audio;
function unlockAudio() {
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume().catch(() => {}); } catch { /* Browser has no audio support. */ }
}
function chime() {
  try { if (!audio || audio.state !== 'running') return; [0, .25, .5].forEach(delay => { const osc = audio.createOscillator(), gain = audio.createGain(); osc.connect(gain); gain.connect(audio.destination); osc.frequency.value = 660; gain.gain.setValueAtTime(.12, audio.currentTime + delay); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + delay + .2); osc.start(audio.currentTime + delay); osc.stop(audio.currentTime + delay + .2); }); } catch { /* Visual completion remains available. */ }
}
function render() {
  const now = Date.now(), worked = elapsed(state.work, now), left = remaining(state.day, now);
  const working = state.work.startedAt !== null;
  const dayRunning = state.day.startedAt !== null && left > 0;
  const dayDone = left <= 0;
  $('work-time').textContent = format(worked);
  $('day-time').textContent = format(left, true);
  $('work-status').textContent = working ? 'В работе' : worked > 0 ? 'На паузе' : 'Готовы начать';
  $('work-status').classList.toggle('active', working);
  $('work-toggle').textContent = working ? 'Ⅱ  Пауза' : worked > 0 ? '▶  Продолжить работу' : '▶  Начать работу';
  $('work-caption').textContent = working ? 'Вы в потоке. Всё остальное подождёт.' : worked > 0 ? 'Время на передышку. Секундомер ждёт.' : 'Один шаг — и вы в потоке';
  $('day-status').textContent = dayDone ? 'День завершён' : dayRunning ? 'День идёт' : left < state.day.duration ? 'На паузе' : 'Не запущен';
  $('day-status').classList.toggle('active', dayRunning);
  $('day-status').classList.toggle('done', dayDone);
  $('day-toggle').textContent = dayDone ? '▶  Начать заново' : dayRunning ? 'Ⅱ  Пауза дня' : left < state.day.duration ? '▶  Продолжить день' : '▶  Начать день';
  $('day-caption').textContent = dayDone ? 'Рабочее время прошло. Пора отдохнуть.' : dayRunning ? 'Завершение: ' + new Date(now + left).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : left < state.day.duration ? 'Таймер дня приостановлен' : 'Выберите длительность и запустите таймер';
  const progress = Math.min(100, Math.max(0, 100 * (1 - left / state.day.duration)));
  $('progress').style.width = progress + '%';
  document.querySelector('.progress').setAttribute('aria-valuenow', Math.round(progress));
  const locked = state.day.startedAt !== null || state.day.remaining !== state.day.duration;
  $('hours').disabled = locked; $('minutes').disabled = locked;
  document.title = working ? format(worked) + ' — Worktimer' : 'Worktimer — время для работы';
  if (dayDone && state.day.startedAt !== null && !state.day.announced) {
    state.day.remaining = 0; state.day.startedAt = null; state.day.announced = true; save();
    message('Рабочий день завершён. Отличная работа!'); chime();
  }
  $('date').textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}
function updateDurationInputs() {
  $('hours').value = Math.floor(state.day.duration / 3600000);
  $('minutes').value = Math.floor(state.day.duration / 60000) % 60;
}
$('work-toggle').onclick = () => { unlockAudio(); toggleWork(state); save(); render(); };
$('day-toggle').onclick = () => { unlockAudio(); toggleDay(state); save(); render(); };
$('work-reset').onclick = () => { if (elapsed(state.work) > 0 && !confirm('Сбросить отработанное время?')) return; state.work = initialState().work; save(); render(); };
$('day-reset').onclick = () => { if ((state.day.startedAt !== null || state.day.remaining !== state.day.duration) && !confirm('Сбросить таймер рабочего дня?')) return; state.day = { ...initialState().day, duration: state.day.duration, remaining: state.day.duration }; save(); render(); };
function setDuration() {
  if (state.day.startedAt !== null || state.day.remaining !== state.day.duration) return;
  const hours = Number($('hours').value), minutes = Number($('minutes').value);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 99 || minutes < 0 || minutes > 59 || hours * 60 + minutes <= 0) { message('Укажите от 1 минуты до 99 часов 59 минут.'); updateDurationInputs(); return; }
  state.day.duration = state.day.remaining = (hours * 60 + minutes) * 60000;
  state.day.announced = false; save(); render(); message('Длительность рабочего дня сохранена.');
}
$('hours').onchange = setDuration; $('minutes').onchange = setDuration;
window.addEventListener('storage', event => {
  if (event.key !== KEY) return;
  try { const next = event.newValue ? JSON.parse(event.newValue) : initialState(); if (validState(next)) { state = next; updateDurationInputs(); render(); } } catch { message('Не удалось прочитать данные из другой вкладки.'); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
window.addEventListener('pageshow', render);
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'worktimer-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  message('Резервная копия сохранена. Её можно загрузить на другом устройстве.');
};
$('import').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try { if (file.size > 100000) throw new Error(); const next = JSON.parse(await file.text()); if (!validState(next)) throw new Error(); if (!confirm('Заменить текущие таймеры данными из резервной копии?')) return; state = next; save(); updateDurationInputs(); render(); message('Таймеры восстановлены.'); } catch { message('Не удалось загрузить копию. Выберите корректный файл Worktimer.'); } finally { event.target.value = ''; }
};
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('install').hidden = false; });
$('install').onclick = async () => { if (!installPrompt) return; await installPrompt.prompt(); installPrompt = null; $('install').hidden = true; };
window.addEventListener('appinstalled', () => { $('install').hidden = true; });
$('install-help').onclick = () => $('help-dialog').showModal();
$('close-help').onclick = () => $('help-dialog').close();
updateDurationInputs(); updateSaveNote(); render(); setInterval(render, 250);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => message('Офлайн-режим недоступен. Онлайн-приложение работает как обычно.'));
