// --- ИМПОРТЫ ---
// Импортируем класс GameLevel, который управляет игровым процессом
import { GameLevel } from './GameLevel.js';
// Импортируем конфиги уровней
import { levels } from './levelConfigs.js';
// Импортируем общие константы
import { WORLD_WIDTH } from './constants.js';

// --- Инициализация при загрузке DOM ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Получение DOM-элементов ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const gameWrapper = document.querySelector('.game-wrapper');
    const fuelBarContainer = document.getElementById('fuel-bar-container');
    const scoreDisplay = document.getElementById('score-display');
    const pauseBtn = document.getElementById('pause-btn');

    const screens = {
        mainMenu: document.getElementById('main-menu'),
        levelSelect: document.getElementById('level-select-screen'),
        game: document.getElementById('game-screen'),
        stats: document.getElementById('stats-screen'),
        rules: document.getElementById('rules-screen'),
        settings: document.getElementById('settings-screen'),
        devSettings: document.getElementById('dev-settings-screen'),
        worldMap: document.getElementById('world-map-screen'),
        station: document.getElementById('station-screen'),
        hangar: document.getElementById('hangar-screen'),
        workshop: document.getElementById('workshop-screen'),
        store: document.getElementById('store-screen'),
    };
    
    const modals = {
        pause: document.getElementById('pause-modal'),
        gameOver: document.getElementById('game-over-modal'),
    };
    
    // --- Глобальное состояние приложения ---
    let stats, settings, devSettings;
    let currentLevelConfig; // Хранит конфиг *выбранного* уровня
    let activeGameLevel = null; // Хранит *экземпляр* активной игры
    let isTransitioning = false; // Флаг для анимаций экрана

    // --- Функции Загрузки/Сохранения (остаются здесь) ---
    const getDefaultStats = () => ({ bestTime: 0, attempts: 0, unlockedLevel: 99 });
    const getDefaultSettings = () => ({ musicOn: true, soundOn: true });
    const getDefaultDevSettings = () => ({
        controlMode: 'mode2', gravityMode: 'linear', playerAsteroidCollision: true,
        asteroidAsteroidCollision: true, asteroidsHaveGravity: true, fuelSeconds: 10,
        enablePollution: true, dustCloudsMove: true, playIntro: true,
        enableLoot: true, asteroidSpeedMultiplier: 0.3, colorAsteroidsByLevel: true,
        lootOnlyInZone: true, introPlanetsFromCenter: true, decayingOrbitFactor: 1.0,
        enableStabilization: true, mode2ThrustMultiplier: 0.3, asteroidAmountMultiplier: 2.0,
        enableTrajectory: true, speedRegulator: 0.8, 
    });

    function loadData() {
        try {
            const savedStats = localStorage.getItem('orbitalGuardianStats');
            stats = savedStats ? { ...getDefaultStats(), ...JSON.parse(savedStats) } : getDefaultStats();
            
            const savedSettings = localStorage.getItem('orbitalGuardianSettings');
            settings = savedSettings ? { ...getDefaultSettings(), ...JSON.parse(savedSettings) } : getDefaultSettings();

            const savedDevSettings = localStorage.getItem('orbitalGuardianDevSettings');
            devSettings = savedDevSettings ? { ...getDefaultDevSettings(), ...JSON.parse(savedDevSettings) } : getDefaultDevSettings();
        } catch(e) { 
            console.error("Ошибка загрузки данных, сброс к значениям по умолчанию.", e); 
            stats = getDefaultStats(); settings = getDefaultSettings(); devSettings = getDefaultDevSettings();
        }
        updateUI();
    }

    function saveData(key, data) { 
        try { localStorage.setItem(key, JSON.stringify(data)); } 
        catch(e) { console.error("Ошибка сохранения данных", e); } 
    }

    // --- Функции Управления UI (Меню) ---

    function switchScreen(screenName) {
        // Автоматически закрываем выкидное меню при смене экрана
        document.getElementById('popup-menu').classList.remove('active');
        // ИЗМЕНЕНИЕ 5: Также убираем .active с кнопки
        document.getElementById('popup-toggle-btn').classList.remove('active');
        
        Object.values(screens).forEach(s => s.classList.remove('active'));
        if (screens[screenName]) screens[screenName].classList.add('active');
    }
    function showModal(modalName) { if (modals[modalName]) modals[modalName].classList.add('active'); }
    function hideModals() { Object.values(modals).forEach(m => m.classList.remove('active')); }

    function updateUI() {
        // Эта функция обновляет только меню и настройки
        document.getElementById('best-time-stat').textContent = stats.bestTime.toFixed(2);
        document.getElementById('attempts-stat').textContent = stats.attempts;
        document.getElementById('music-toggle').checked = settings.musicOn;
        document.getElementById('sound-toggle').checked = settings.soundOn;
        
        document.querySelector(`input[name="controlMode"][value="${devSettings.controlMode}"]`).checked = true;
        document.querySelector(`input[name="gravity"][value="${devSettings.gravityMode}"]`).checked = true;
        document.getElementById('stabilization-toggle').checked = devSettings.enableStabilization;
        document.getElementById('player-collision-toggle').checked = devSettings.playerAsteroidCollision;
        document.getElementById('asteroid-collision-toggle').checked = devSettings.asteroidAsteroidCollision;
        document.getElementById('asteroid-gravity-toggle').checked = devSettings.asteroidsHaveGravity;
        document.getElementById('intro-toggle').checked = devSettings.playIntro;
        document.getElementById('loot-toggle').checked = devSettings.enableLoot;
        document.getElementById('level-asteroids-color-toggle').checked = devSettings.colorAsteroidsByLevel;
        document.getElementById('loot-in-zone-toggle').checked = devSettings.lootOnlyInZone;
        document.getElementById('intro-planets-center-toggle').checked = devSettings.introPlanetsFromCenter;
        document.getElementById('fuel-seconds-slider').value = devSettings.fuelSeconds;
        document.getElementById('fuel-seconds-value').textContent = devSettings.fuelSeconds;
        document.getElementById('poor-visibility-toggle').checked = devSettings.enablePollution;
        document.getElementById('dust-clouds-move-toggle').checked = devSettings.dustCloudsMove;
        document.getElementById('decaying-orbit-factor-slider').value = devSettings.decayingOrbitFactor;
        document.getElementById('decaying-orbit-factor-value').textContent = devSettings.decayingOrbitFactor.toFixed(2);
        document.getElementById('mode2-thrust-slider').value = devSettings.mode2ThrustMultiplier;
        document.getElementById('mode2-thrust-value').textContent = `${Math.round(devSettings.mode2ThrustMultiplier * 100)}%`;
        document.getElementById('asteroid-amount-slider').value = devSettings.asteroidAmountMultiplier;
        document.getElementById('asteroid-amount-value').textContent = `${Math.round(devSettings.asteroidAmountMultiplier * 100)}%`;
        document.getElementById('trajectory-toggle').checked = devSettings.enableTrajectory;
        document.getElementById('speed-regulator-slider').value = devSettings.speedRegulator;
        document.getElementById('speed-regulator-value').textContent = `${Math.round(devSettings.speedRegulator * 100)}%`;
    }
            
    function populateLevelGrid() {
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';
        const totalSlots = 20; // Логика сетки
        for (let i = 1; i <= totalSlots; i++) {
            const levelData = levels.find(l => l.id === i);
            const btn = document.createElement('button');
            btn.classList.add('level-btn');
            if (levelData) {
                btn.dataset.level = levelData.id;
                btn.textContent = levelData.id; 
                btn.style.backgroundColor = levelData.theme.buttonColor;
                if (levelData.id > stats.unlockedLevel) { 
                    btn.classList.add('locked'); btn.disabled = true; 
                }
            } else { 
                btn.style.visibility = 'hidden'; btn.disabled = true; 
            }
            grid.appendChild(btn);
        }
    }

    // --- Логика Запуска / Остановки Игры ---

    function startGame(levelId) {
        if (isTransitioning || activeGameLevel) return;
        isTransitioning = true;
        
        currentLevelConfig = levels.find(l => l.id === levelId);
        if (!currentLevelConfig) { 
            isTransitioning = false; 
            console.error(`Уровень с ID ${levelId} не найден!`);
            return; 
        }

        // Сброс UI
        scoreDisplay.style.opacity = 0;
        pauseBtn.style.opacity = 0;
        fuelBarContainer.style.opacity = 0;
        scoreDisplay.textContent = "0.00";
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        hideModals();
        gameWrapper.style.backgroundColor = currentLevelConfig.theme.backgroundColor;
        
        stats.attempts++; 
        saveData('orbitalGuardianStats', stats); 
        updateUI();

        // Настраиваем UI для топлива
        if (devSettings.fuelSeconds > 0) {
            fuelBarContainer.style.display = 'block';
            const fuelBar = document.getElementById('fuel-bar');
            fuelBar.style.width = '100%';
            fuelBar.style.backgroundColor = '#FFD700'; // Начальный цвет
        } else {
            fuelBarContainer.style.display = 'none';
        }

        document.getElementById('final-loot').style.display = devSettings.enableLoot ? 'block' : 'none';
        
        switchScreen('game');

        // --- Создание экземпляра игры ---
        const onGameOverCallback = (finalTime, finalLoot, reason) => {
            endGame(finalTime, finalLoot, reason);
        };

        // Создаем и запускаем игру
        activeGameLevel = new GameLevel(canvas, ctx, currentLevelConfig, devSettings, settings, onGameOverCallback);
        
        setTimeout(() => {
            isTransitioning = false;
            scoreDisplay.style.opacity = 1; 
            pauseBtn.style.opacity = 1; 
            fuelBarContainer.style.opacity = (devSettings.fuelSeconds > 0) ? 1 : 0;
            
            activeGameLevel.start();
        }, 500); // Задержка для анимации перехода экрана
    }

    /**
     * Эта функция теперь вызывается *из колбэка* GameLevel.
     */
    function endGame(finalTime, finalLoot, reason) {
        if (finalTime > stats.bestTime) { 
            stats.bestTime = finalTime; 
            saveData('orbitalGuardianStats', stats); 
        }
        updateUI(); 
        
        document.querySelector('#final-score span').textContent = finalTime.toFixed(2);
        document.querySelector('#final-best span').textContent = stats.bestTime.toFixed(2);
        if (devSettings.enableLoot) {
            document.querySelector('#final-loot span').textContent = finalLoot;
        }

        setTimeout(() => showModal('gameOver'), 1000); 
    }

    /**
     * Выход в главное меню из любого места.
     */
    function quitToMenu() {
         if (isTransitioning) return;
         
         if (activeGameLevel) {
            activeGameLevel.destroy();
            activeGameLevel = null;
         }
         
         hideModals();
         gameWrapper.style.backgroundColor = 'var(--primary-bg)';
         switchScreen('mainMenu');
         currentLevelConfig = null;
         
         scoreDisplay.style.opacity = 0;
         pauseBtn.style.opacity = 0;
         fuelBarContainer.style.opacity = 0;
         
         ctx.clearRect(0,0,canvas.width,canvas.height);
    }

    // --- Инициализация Приложения ---

    function init() {
        loadData(); 
        populateLevelGrid(); 
        setupMenuEventListeners(); 
        
        switchScreen('mainMenu');
        
        handleResize();
        window.addEventListener('resize', handleResize);
    }

    /**
     * Обработчик изменения размера окна.
     */
    function handleResize() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const rect = gameWrapper.getBoundingClientRect();
        canvas.width = rect.width * devicePixelRatio; 
        canvas.height = rect.height * devicePixelRatio;
        canvas.style.width = `${rect.width}px`; 
        canvas.style.height = `${rect.height}px`;
        
        ctx.scale(devicePixelRatio, devicePixelRatio);

        if (activeGameLevel) {
            activeGameLevel.handleResize();
        }
    }

    /**
     * Настройка слушателей меню.
     */
    function setupMenuEventListeners() {
        document.getElementById('main-play-btn').addEventListener('click', () => switchScreen('levelSelect'));
        
        document.getElementById('world-map-btn').addEventListener('click', () => switchScreen('worldMap'));
        document.getElementById('station-btn').addEventListener('click', () => switchScreen('station'));

        // ИЗМЕНЕНИЕ 5: Логика выкидного меню
        const popupToggle = document.getElementById('popup-toggle-btn');
        const popupMenu = document.getElementById('popup-menu');
        if(popupToggle && popupMenu) {
            popupToggle.addEventListener('click', (e) => {
                e.stopPropagation(); 
                popupMenu.classList.toggle('active');
                popupToggle.classList.toggle('active'); // Переключаем класс на самой кнопке
            });
            
            // Закрытие меню по клику вне его
            document.addEventListener('click', (e) => {
                // Проверяем, что клик был не по кнопке и не внутри меню
                if (!popupMenu.contains(e.target) && !popupToggle.contains(e.target)) {
                    popupMenu.classList.remove('active');
                    popupToggle.classList.remove('active');
                }
            });
        }

        // --- Старые слушатели ---
        
        document.getElementById('level-grid').addEventListener('click', (e) => {
            const levelButton = e.target.closest('.level-btn');
            if (levelButton && !levelButton.disabled) {
                startGame(parseInt(levelButton.dataset.level, 10));
            }
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => { 
            if (!isTransitioning && currentLevelConfig) { 
                hideModals(); 
                if (activeGameLevel) {
                    activeGameLevel.destroy();
                    activeGameLevel = null;
                }
                startGame(currentLevelConfig.id); 
            } 
        });
        
        document.getElementById('menu-btn-gameover').addEventListener('click', () => { 
            if (!isTransitioning) { 
                hideModals(); 
                quitToMenu(); 
            } 
        });
        
        document.getElementById('pause-btn').addEventListener('click', () => {
            if (activeGameLevel) {
                activeGameLevel.pause();
                showModal('pause');
            }
        });
        
        document.getElementById('resume-btn').addEventListener('click', () => {
            if (activeGameLevel) {
                activeGameLevel.resume();
                hideModals();
            }
        });

        document.getElementById('quit-to-menu-btn').addEventListener('click', quitToMenu);
        
        // ИЗМЕНЕНИЕ 6: Разделяем слушатели кнопок "Назад"
        // Эти ведут в Главное меню
        document.querySelectorAll('#level-select-screen .btn-back, #stats-screen .btn-back, #rules-screen .btn-back, #settings-screen .btn-back, #dev-settings-screen .btn-back, #world-map-screen .btn-back, #station-screen .btn-back').forEach(btn => {
            btn.addEventListener('click', quitToMenu);
        });
        
        // ИЗМЕНЕНИЕ 6: Эти ведут на экран "Станция"
        document.querySelectorAll('#hangar-screen .btn-back, #workshop-screen .btn-back, #store-screen .btn-back').forEach(btn => {
            btn.addEventListener('click', () => switchScreen('station'));
        });


        // Слушатели кнопок из выкидного меню
        document.getElementById('rules-btn-menu').addEventListener('click', () => switchScreen('rules'));
        document.getElementById('stats-btn-menu').addEventListener('click', () => switchScreen('stats'));
        document.getElementById('settings-btn-menu').addEventListener('click', () => switchScreen('settings'));
        document.getElementById('dev-settings-btn-menu').addEventListener('click', () => switchScreen('devSettings'));
        
        // Слушатели кнопок Станции
        document.getElementById('hangar-btn').addEventListener('click', () => switchScreen('hangar'));
        document.getElementById('workshop-btn').addEventListener('click', () => switchScreen('workshop'));
        document.getElementById('store-btn').addEventListener('click', () => switchScreen('store'));

        document.getElementById('reset-settings-btn').addEventListener('click', () => {
            // TODO: Заменить 'confirm' на кастомное модальное окно
            if (confirm('Вы уверены, что хотите сбросить все настройки и статистику?')) {
                localStorage.removeItem('orbitalGuardianStats');
                localStorage.removeItem('orbitalGuardianSettings');
                localStorage.removeItem('orbitalGuardianDevSettings');
                location.reload();
            }
        });

        // --- Слушатели Настроек (без изменений) ---
        document.getElementById('music-toggle').addEventListener('change', e => { settings.musicOn = e.target.checked; saveData('orbitalGuardianSettings', settings); });
        document.getElementById('sound-toggle').addEventListener('change', e => { settings.soundOn = e.target.checked; saveData('orbitalGuardianSettings', settings); });
        document.getElementById('control-mode-group').addEventListener('change', e => { if (e.target.name === 'controlMode') { devSettings.controlMode = e.target.value; saveData('orbitalGuardianDevSettings', devSettings); }});
        document.getElementById('gravity-mode-group').addEventListener('change', e => { if (e.target.name === 'gravity') { devSettings.gravityMode = e.target.value; saveData('orbitalGuardianDevSettings', devSettings); }});
        document.getElementById('stabilization-toggle').addEventListener('change', e => { devSettings.enableStabilization = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('player-collision-toggle').addEventListener('change', e => { devSettings.playerAsteroidCollision = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('asteroid-collision-toggle').addEventListener('change', e => { devSettings.asteroidAsteroidCollision = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('asteroid-gravity-toggle').addEventListener('change', e => { devSettings.asteroidsHaveGravity = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('intro-toggle').addEventListener('change', e => { devSettings.playIntro = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('loot-toggle').addEventListener('change', e => { devSettings.enableLoot = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('level-asteroids-color-toggle').addEventListener('change', e => { devSettings.colorAsteroidsByLevel = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('loot-in-zone-toggle').addEventListener('change', e => { devSettings.lootOnlyInZone = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('intro-planets-center-toggle').addEventListener('change', e => { devSettings.introPlanetsFromCenter = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('decaying-orbit-factor-slider').addEventListener('input', e => {
            const value = parseFloat(e.target.value);
            devSettings.decayingOrbitFactor = value; document.getElementById('decaying-orbit-factor-value').textContent = value.toFixed(2);
            saveData('orbitalGuardianDevSettings', devSettings);
        });
        document.getElementById('fuel-seconds-slider').addEventListener('input', e => {
            const value = parseInt(e.target.value, 10);
            devSettings.fuelSeconds = value; document.getElementById('fuel-seconds-value').textContent = value;
            saveData('orbitalGuardianDevSettings', devSettings);
        });
        document.getElementById('poor-visibility-toggle').addEventListener('change', e => { devSettings.enablePollution = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('dust-clouds-move-toggle').addEventListener('change', e => { devSettings.dustCloudsMove = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('trajectory-toggle').addEventListener('change', e => { devSettings.enableTrajectory = e.target.checked; saveData('orbitalGuardianDevSettings', devSettings); });
        document.getElementById('mode2-thrust-slider').addEventListener('input', e => {
            const value = parseFloat(e.target.value);
            devSettings.mode2ThrustMultiplier = value;
            document.getElementById('mode2-thrust-value').textContent = `${Math.round(value * 100)}%`;
            saveData('orbitalGuardianDevSettings', devSettings);
        });
        document.getElementById('asteroid-amount-slider').addEventListener('input', e => {
            const value = parseFloat(e.target.value);
            devSettings.asteroidAmountMultiplier = value;
            document.getElementById('asteroid-amount-value').textContent = `${Math.round(value * 100)}%`;
            saveData('orbitalGuardianDevSettings', devSettings);
        });
        document.getElementById('speed-regulator-slider').addEventListener('input', e => {
            const value = parseFloat(e.target.value);
            devSettings.speedRegulator = value;
            document.getElementById('speed-regulator-value').textContent = `${Math.round(value * 100)}%`;
            saveData('orbitalGuardianDevSettings', devSettings);
        });
    }

    // --- Старт Приложения ---
    init();
});