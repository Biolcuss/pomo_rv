// Punto di avvio dell'app: importa i vari moduli e li fa partire.
import { initTheme } from './theme.js';
import { initTodo } from './todo.js';
import { initJourney } from './journey.js';
import { initTimer } from './timer.js';
import { initSound } from './sound.js';
import { initRewards } from './rewards.js';
import { initSettings } from './settings.js';

initTheme();
initSound();
initRewards();
initSettings();
initTodo();
initJourney();
initTimer();
