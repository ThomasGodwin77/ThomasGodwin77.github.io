import { lerp, rand, distance, hexToRgb } from './utils.js';
// import { lootTypes } from './levelConfigs.js'; // Больше не нужно, импортируется в gameObjects.js
import * as C from './constants.js'; // C - 'Constants'

// --- НОВЫЕ ИМПОРТЫ ---
import { 
    createRocket, 
    updateRocketState, 
    updateRocketIntro, 
    drawRocket 
} from './rocket.js';
import { 
    spawnAsteroid, 
    createDustCloud, 
    spawnLoot, 
    createDebris, 
    createExplosion, 
    updateGameObjects, 
    drawGameObjects 
} from './gameObjects.js';
import { 
    updateGameUI, 
    updateIntroUI, 
    drawCanvasUI, 
    drawPollutionFog, 
    drawPlayAreaOutline 
} from './gameUI.js';

/**
 * Класс GameLevel управляет всем состоянием и логикой
 * активного игрового сеанса.
 * (Теперь он делегирует большую часть работы импортированным модулям)
 */
export class GameLevel {
    
    // Конструктор принимает все необходимое для запуска
    constructor(canvas, ctx, levelConfig, devSettings, generalSettings, onEndGameCallback) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.levelConfig = levelConfig;
        this.devSettings = devSettings;
        this.settings = generalSettings;
        this.onEndGameCallback = onEndGameCallback; // Функция, которую мы вызовем при 'game over'

        // --- Инициализация состояния игры ---
        this.gameState = 'intro'; // Начинаем с интро
        this.pausedState = null;
        this.gameTime = 0;
        this.animationFrameId = null;
        this.lastTime = 0;

        // --- Управление вводом ---
        this.isThrusting = false;
        this.lastTapTime = 0;
        this.lastTapPos = null;
        this.isDoubleTapHold = false;
        this.touchStartPos = null;
        this.touchCurrentPos = null;
        this.isDragging = false;

        // --- Размеры мира ---
        this.WORLD_HEIGHT = 0;
        this.scaleFactor = 1;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.stars = null; // Кэш звезд

        // --- Игровые объекты ---
        this.planets = [];
        this.rocket = {}; // Будет инициализирован в setupGameObjects
        this.particles = [];
        this.asteroids = [];
        this.debris = [];
        this.lootDrops = [];
        this.fuelBubbles = [];
        this.dustClouds = [];
        this.trajectoryPoints = []; // Оставлено здесь, т.к. связано с devSettings

        // --- Состояние игры ---
        this.currentLevelTheme = levelConfig.theme;
        this.currentLevelGameplay = levelConfig.gameplay;
        
        this.introTimer = 0;
        this.lastAsteroidSpawn = 0;
        this.fuelShakeIntensity = 0;
        this.lootCollected = 0;
        this.stabilizationEffect = 0;
        this.bgColorRgb = hexToRgb(this.currentLevelTheme.backgroundColor) || { r: 13, g: 15, b: 26 };
        this.fogColorRgb = hexToRgb(this.currentLevelTheme.fogColor) || { r: 0, g: 0, b: 0 };
        this.actualTotalPollution = 0;
        this.displayedPollution = 0;
        this.lingeringPollution = 0;
        this.lastTrajectoryPointSpawn = 0;
        this.currentAppliedThrustX = 0;
        this.currentAppliedThrustY = 0;
        this.visualThrustMagnitude = 0;
        
        this.crashSiteX = null;
        this.crashSiteY = null;

        // --- Привязка контекста (важно для requestAnimationFrame и обработчиков) ---
        this.gameLoop = this.gameLoop.bind(this);
        this.handleStart = this.handleStart.bind(this);
        this.handleMove = this.handleMove.bind(this);
        this.handleEnd = this.handleEnd.bind(this);
    }

    /**
     * Запускает игровой уровень.
     */
    start() {
        this.handleResize(); // Начальная калибровка размеров
        this.setupGameObjects();

        this.actualTotalPollution = this.currentLevelGameplay.globalPollution || 0;
        this.displayedPollution = this.actualTotalPollution;
        
        // Настраиваем топливо
        if (this.devSettings.fuelSeconds > 0) {
            this.rocket.maxFuel = this.devSettings.fuelSeconds;
            this.rocket.fuel = this.devSettings.fuelSeconds;
        } else {
            this.rocket.maxFuel = 1; this.rocket.fuel = 1;
        }

        // Привязываем обработчики событий к канвасу
        this.canvas.addEventListener('mousedown', this.handleStart);
        this.canvas.addEventListener('mousemove', this.handleMove);
        this.canvas.addEventListener('mouseup', this.handleEnd);
        this.canvas.addEventListener('mouseleave', this.handleEnd);
        this.canvas.addEventListener('touchstart', this.handleStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleEnd, { passive: false });

        // Запускаем игровой цикл
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }

    /**
     * Вызывается извне (main.js) для остановки игры и очистки.
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = null;

        // Отвязываем обработчики
        this.canvas.removeEventListener('mousedown', this.handleStart);
        this.canvas.removeEventListener('mousemove', this.handleMove);
        this.canvas.removeEventListener('mouseup', this.handleEnd);
        this.canvas.removeEventListener('mouseleave', this.handleEnd);
        this.canvas.removeEventListener('touchstart', this.handleStart);
        this.canvas.removeEventListener('touchmove', this.handleMove);
        this.canvas.removeEventListener('touchend', this.handleEnd);
        
        // Очистка массивов
        this.planets = []; this.rocket = {}; this.particles = [];
        this.asteroids = []; this.debris = []; this.lootDrops = [];
        this.fuelBubbles = []; this.dustClouds = []; this.trajectoryPoints = [];
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Вызывается извне (main.js) при изменении размера окна.
     */
    handleResize() {
        this.devicePixelRatio = window.devicePixelRatio || 1;
        // game-wrapper - родитель канваса
        const rect = this.canvas.parentElement.getBoundingClientRect(); 
        
        this.canvas.width = rect.width * this.devicePixelRatio;
        this.canvas.height = rect.height * this.devicePixelRatio;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.scaleFactor = rect.width / C.WORLD_WIDTH;
        this.WORLD_HEIGHT = rect.height / this.scaleFactor;
        
        this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
        
        this.stars = null; // Сброс кэша звезд
        if (this.gameState !== 'menu') {
             this.draw(); // Перерисовка
        }
    }

    /**
     * Пауза игры (вызывается из main.js).
     */
    pause() {
        if (this.gameState === 'playing' || this.gameState === 'intro') {
            this.pausedState = this.gameState;
            this.gameState = 'paused';
        }
    }

    /**
     * Возобновление игры (вызывается из main.js).
     */
    resume() {
        if (this.gameState === 'paused') {
            this.gameState = this.pausedState;
            this.pausedState = null;
            this.lastTime = performance.now(); // Сбрасываем таймер
        }
    }

    // --- Обработчики Ввода (остаются здесь, т.к. управляют состоянием GameLevel) ---

    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : e);
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };
    
    handleStart(e) {
        e.preventDefault();
        if (this.gameState !== 'playing' && this.gameState !== 'intro') return;
        
        const now = Date.now();
        const currentPos = this.getTouchPos(e);
        
        if (now - this.lastTapTime < C.DOUBLE_TAP_DELAY && this.lastTapPos && distance(currentPos, this.lastTapPos) < C.MAX_DOUBLE_TAP_DISTANCE) {
            this.isDoubleTapHold = true;
            this.lastTapTime = 0; 
        } else {
            this.lastTapTime = now;
            this.lastTapPos = currentPos;
        }

        if (this.devSettings.controlMode === 'mode2') {
            this.isDragging = true;
            this.touchStartPos = currentPos;
            this.touchCurrentPos = this.touchStartPos;
        }
        this.isThrusting = true;
        if (this.devSettings.controlMode === 'mode2') {
            this.draw();
        }
    };

    handleMove(e) {
        if (!this.isDragging || this.devSettings.controlMode !== 'mode2') return;
        e.preventDefault();
        this.touchCurrentPos = this.getTouchPos(e);
    };

    handleEnd(e) {
        e.preventDefault();
        this.isThrusting = false;
        this.isDoubleTapHold = false;
        this.isDragging = false;
        this.touchStartPos = null;
        this.touchCurrentPos = null;
    };

    // --- Логика Игры ---

    setupGameObjects() {
        // Создание планет (остается здесь)
        this.planets = this.currentLevelGameplay.planetConfigs.map(p => ({
            x: C.WORLD_WIDTH * p.x,
            y: (this.WORLD_HEIGHT / 2) + (p.y - 0.5) * C.WORLD_WIDTH,
            radius: C.WORLD_WIDTH * p.radiusFactor,
            gravityFactor: p.gravityFactor,
            color: p.color
        }));
        
        // --- ВЫЗОВ ФУНКЦИИ ИЗ ROCKET.JS ---
        this.rocket = createRocket(this);
    }

    calculateGravityForce(dist, planet) {
        if (dist <= 0) return 0;
        const distSq = dist * dist;
        const speedFactor = this.devSettings.speedRegulator * this.devSettings.speedRegulator;
        switch(this.devSettings.gravityMode) {
            case 'realistic': return (C.G_REALISTIC / (distSq + 10000)) * planet.gravityFactor * speedFactor; 
            case 'linear': return (C.G_LINEAR / dist) * planet.gravityFactor * speedFactor; 
            case 'constant': return C.G_CONSTANT * planet.gravityFactor * speedFactor; 
        }
        return 0;
    }

    endGame(reason) {
        if (this.gameState === 'gameover') return;
        this.gameState = 'gameover';
        
        this.crashSiteX = this.rocket.x;
        this.crashSiteY = this.rocket.y;
        
        this.currentAppliedThrustX = 0;
        this.currentAppliedThrustY = 0;
        this.visualThrustMagnitude = 0;
        
        if (reason === 'collision') { 
            this.rocket.isDestroyed = true; 
            if (this.settings.soundOn) {
                // --- ВЫЗОВ ФУНКЦИИ ИЗ GAMEOBJECTS.JS ---
                createExplosion(this, this.rocket.x, this.rocket.y, 100, '#FF4141', 1.0); 
            }
        } 
        else if (reason === 'bounds') { 
            this.rocket.isSpinning = true; 
        }
        
        this.onEndGameCallback(this.gameTime, this.lootCollected, reason);
    }
    
    // --- createExplosion, createDebris, createDustCloud, spawnLoot ПЕРЕМЕЩЕНЫ в gameObjects.js ---
    // (Оставим "публичные" методы, которые просто вызывают импортированные функции)
    
    createExplosion(x, y, count, color, life) {
        createExplosion(this, x, y, count, color, life);
    }
    
    createDebris(x, y, count) {
        createDebris(this, x, y, count);
    }

    createDustCloud(x, y, initialRadius) {
        createDustCloud(this, x, y, initialRadius);
    }
    
    spawnLoot(x, y) {
        spawnLoot(this, x, y);
    }
    
    // --- spawnAsteroid ПЕРЕМЕЩЕН в gameObjects.js ---
    spawnAsteroid() {
        spawnAsteroid(this);
    }


    isInsidePlayArea(x, y) {
        if (!this.planets || this.planets.length === 0) return false;
        return this.planets.some(p => distance({x,y}, p) < p.radius * C.OUT_OF_BOUNDS_RADIUS_FACTOR);
    }
    
    updatePlayingState(dt) {
        this.gameTime += dt;
        
        this.currentAppliedThrustX = 0;
        this.currentAppliedThrustY = 0;
        this.visualThrustMagnitude = 0;
        
        // Управление траекторией (остается здесь, т.к. это UI-эффект)
        if (this.devSettings.enableTrajectory && this.gameTime - this.lastTrajectoryPointSpawn > C.TRAJECTORY_SPAWN_INTERVAL) {
            this.trajectoryPoints.push({
                x: this.rocket.x, y: this.rocket.y,
                life: C.TRAJECTORY_POINT_LIFETIME, initialLife: C.TRAJECTORY_POINT_LIFETIME
            });
            this.lastTrajectoryPointSpawn = this.gameTime;
        }

        // --- Обновление лута ПЕРЕМЕЩЕНО в updateGameObjects ---
        // (но оно вызывается из update(), поэтому здесь его нет)

        // Расчет гравитации для ракеты (остается здесь)
        let totalGravityX = 0, totalGravityY = 0, isInsideAnyZone_flag = false;
        let dominantPlanet = null; let maxGravityInfluence = -1;

        this.planets.forEach(p => {
            const dx = p.x - this.rocket.x, dy = p.y - this.rocket.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < p.radius * C.OUT_OF_BOUNDS_RADIUS_FACTOR) {
                isInsideAnyZone_flag = true; const force = this.calculateGravityForce(dist, p);
                if (dist > 0) { totalGravityX += (force * dx / dist); totalGravityY += (force * dy / dist); }
                const influence = force / dist;
                if (influence > maxGravityInfluence) { maxGravityInfluence = influence; dominantPlanet = p; }
            }
        });

        // --- ВЫЗОВ ФУНКЦИИ ИЗ ROCKET.JS ---
        // Обновление физики ракеты
        const thrustResult = updateRocketState(this, dt, totalGravityX, totalGravityY, dominantPlanet);
        this.currentAppliedThrustX = thrustResult.appliedThrustX;
        this.currentAppliedThrustY = thrustResult.appliedThrustY;
        this.visualThrustMagnitude = thrustResult.visualThrustMagnitude;

        
        // Спавн астероидов (остается здесь)
        const effectiveSpawnRate = C.ASTEROID_SPAWN_RATE / this.devSettings.asteroidAmountMultiplier;
        if (this.gameTime - this.lastAsteroidSpawn > effectiveSpawnRate) { 
            this.spawnAsteroid(); 
            this.lastAsteroidSpawn = this.gameTime; 
        }
        
        // Проверки на Game Over (остаются здесь)
        if (!isInsideAnyZone_flag) this.endGame('bounds');
        this.planets.forEach(p => { if (distance(this.rocket, p) < p.radius + this.rocket.collisionRadius) this.endGame('collision'); });
        if (this.devSettings.playerAsteroidCollision) {
            this.asteroids.forEach(a => { if (distance(this.rocket, a) < a.radius + this.rocket.collisionRadius) this.endGame('collision'); });
        }
    }

    update(dt) {
        if (!dt) return;
        
        // Эффект стабилизации (UI)
        const isStabilizing = this.isThrusting && this.devSettings.enableStabilization && this.isDoubleTapHold;
        const transitionSpeed = 5;
        if (isStabilizing) { this.stabilizationEffect = Math.min(1, this.stabilizationEffect + dt * transitionSpeed); } 
        else { this.stabilizationEffect = Math.max(0, this.stabilizationEffect - dt * transitionSpeed); }

        // Обновление пузырьков топлива (UI)
        this.fuelBubbles.forEach(b => { b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; });
        this.fuelBubbles = this.fuelBubbles.filter(b => b.life > 0);
        
        // Обновление траектории (UI)
        if (this.devSettings.enableTrajectory) {
            this.trajectoryPoints.forEach(p => p.life -= dt);
            this.trajectoryPoints = this.trajectoryPoints.filter(p => p.life > 0);
        }
        
        // --- ВЫЗОВ ФУНКЦИИ ИЗ GAMEOBJECTS.JS ---
        // Обновление частиц, обломков, лута, облаков пыли, астероидов
        updateGameObjects(this, dt);

        
        // Обновление загрязнения (UI)
        let cloudPollution = 0;
        if (this.devSettings.enablePollution) {
            this.dustClouds.forEach(cloud => {
                const progress = 1 - (cloud.life / cloud.initialLife);
                const currentRadius = cloud.radius * (1 + progress * 2);

                if (distance(this.rocket, cloud) < currentRadius) {
                    let pollutionFactor;
                    if (progress < 0.8) {
                        pollutionFactor = 1.0 - (progress / 0.8) * 0.5;
                    } else {
                        const t_sub = (progress - 0.8) / 0.2;
                        pollutionFactor = 0.5 - t_sub * 0.5;
                    }
                    cloudPollution += cloud.pollutionAmount * pollutionFactor;
                }
            });
        }
        this.lingeringPollution = Math.max(0, this.lingeringPollution - C.POLLUTION_DECAY_RATE * dt);
        let currentLocalPollution = Math.max(cloudPollution, this.lingeringPollution);
        this.lingeringPollution = currentLocalPollution;

        this.actualTotalPollution = Math.min(1, (this.currentLevelGameplay.globalPollution || 0) + currentLocalPollution);
        this.displayedPollution = lerp(this.displayedPollution, this.actualTotalPollution, dt * 3.0);

        // --- Гравитация астероидов ПЕРЕМЕЩЕНА в updateGameObjects ---
        // --- Столкновения астероидов ПЕРЕМЕЩЕНЫ в updateGameObjects ---
        
        // Тряска (UI)
        let targetShakeIntensity = 0;
        if (this.isThrusting && this.devSettings.fuelSeconds > 0) {
            const thrustRatio = Math.min(1, this.visualThrustMagnitude / C.THRUST_FORCE);
            if (this.rocket.fuel <= 0) {
                targetShakeIntensity = 1.0; 
            } else if (thrustRatio > 0) {
                targetShakeIntensity = 0.5 + thrustRatio * 0.5;
            }
        }
        this.fuelShakeIntensity = lerp(this.fuelShakeIntensity, targetShakeIntensity, dt * 10.0);

        // Обновление состояния 'gameover'
        if (this.gameState === 'gameover') {
            if (this.rocket.isSpinning) {
                this.rocket.angle += C.ROCKET_SPIN_SPEED * dt;
                this.rocket.x += this.rocket.vx * dt; 
                this.rocket.y += this.rocket.vy * dt;
            }
            return; 
        }
        
        // Обновление состояния 'intro'
        if (this.gameState === 'intro') {
            // --- ВЫЗОВ ФУНКЦИИ ИЗ ROCKET.JS ---
            updateRocketIntro(this, dt);
            return;
        }
        
        // Обновление состояния 'playing'
        if (this.gameState === 'playing') this.updatePlayingState(dt);
    }

    animProgress(startTime, duration) {
        return this.gameState === 'intro' ? Math.min(1, Math.max(0, this.introTimer - startTime) / duration) : 1;
    }
    
    // --- spawnAsteroid ПЕРЕМЕЩЕН ---

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width / this.devicePixelRatio, this.canvas.height / this.devicePixelRatio);
        const sf = this.scaleFactor;
        
        // --- ВЫЗОВ ФУНКЦИИ ИЗ GAMEUI.JS ---
        updateIntroUI(this);

        // --- Рендеринг на Канвасе ---
        
        // Гравитационные колодцы (UI)
        const t_outline = this.animProgress(C.OUTLINE_ANIM_START, C.INTRO_DURATION - C.OUTLINE_ANIM_START);
        const wellAlpha = t_outline > 0 ? (0.5 - 0.5 * Math.cos(t_outline * Math.PI)) * (0.6 + 0.4 * Math.sin(t_outline * Math.PI * 6)) : 0;
        if(wellAlpha > 0) {
            this.ctx.save(); this.ctx.globalAlpha = wellAlpha; this.ctx.globalCompositeOperation = 'lighter';
            this.planets.forEach(p => {
                this.ctx.fillStyle = this.currentLevelTheme.gravityWellColor || 'rgba(255,255,255,0.05)';
                this.ctx.beginPath(); this.ctx.arc(p.x * sf, p.y * sf, p.radius * C.OUT_OF_BOUNDS_RADIUS_FACTOR * sf, 0, Math.PI * 2); this.ctx.fill();
            });
            this.ctx.restore();
        }

        // Звезды (Фон)
        const t_stars = this.animProgress(0.2, 1.0);
        const starVisibility = 1;
        if(t_stars > 0 && starVisibility > 0) {
            if(!this.stars) {
                this.stars = [];
                for(let i = 0; i < 100; i++) this.stars.push({x: rand(0, C.WORLD_WIDTH), y: rand(0, this.WORLD_HEIGHT), r: rand(0.5, 1.5), opacity: rand(0.2, 0.8)});
            }
            this.stars.forEach(s => { 
                this.ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * t_stars * starVisibility})`;
                this.ctx.beginPath(); this.ctx.arc(s.x * sf, s.y * sf, s.r * sf, 0, Math.PI * 2); this.ctx.fill(); 
            });
        }
        
        // --- ВЫЗОВ ФУНКЦИИ ИЗ GAMEUI.JS ---
        // Рисование траектории (перемещено в drawCanvasUI)
        // drawCanvasUI(this); // Вызовем позже, чтобы было поверх всего

        // Планеты (остается здесь)
        const t_planets = this.animProgress(0.7, 1.5);
        if(t_planets > 0) {
            this.planets.forEach(p => {
                this.ctx.save();
                const scale = this.gameState === 'intro' ? (t_planets * t_planets * (3 - 2 * t_planets)) : 1.0;
                let currentX = p.x; let currentY = p.y;
                if(this.gameState === 'intro' && this.devSettings.introPlanetsFromCenter) {
                    const centerX = C.WORLD_WIDTH / 2; const centerY = this.WORLD_HEIGHT / 2;
                    const ease = t_planets < 0.5 ? 2 * t_planets * t_planets : 1 - Math.pow(-2 * t_planets + 2, 2) / 2;
                    currentX = centerX + (p.x - centerX) * ease; currentY = centerY + (p.y - centerY) * ease;
                }
                this.ctx.translate(currentX * sf, currentY * sf);
                this.ctx.scale(scale, scale);
                this.ctx.translate(-currentX * sf, -currentY * sf);
                this.ctx.fillStyle = p.color; this.ctx.shadowColor = 'rgba(0,0,0,0.5)'; this.ctx.shadowBlur = 20 * scale;
                this.ctx.beginPath(); this.ctx.arc(currentX * sf, currentY * sf, p.radius * sf, 0, Math.PI * 2); this.ctx.fill();
                this.ctx.restore();
            });
        }
        
        // --- ВЫЗОВ ФУНКЦИИ ИЗ GAMEOBJECTS.JS ---
        // Рисование астероидов, облаков пыли, обломков, лута, частиц
        drawGameObjects(this);

        // --- ВЫЗОВ ФУНКЦИИ ИЗ ROCKET.JS ---
        // Рисование ракеты и выхлопа
        drawRocket(this);
        
        // --- ВЫЗОВ ФУНКЦИЙ ИЗ GAMEUI.JS ---
        if (this.devSettings.enablePollution) {
            drawPollutionFog(this);
        }
        
        drawPlayAreaOutline(this);

        // --- ВЫЗОВ ФУНКЦИЙ ИЗ GAMEUI.JS ---
        // Обновляем DOM
        updateGameUI(this); 
        // Рисуем UI на канвасе (поверх всего)
        drawCanvasUI(this);
    }

    // --- updateGameUI, drawPollutionFog, drawPlayAreaOutline ПЕРЕМЕЩЕНЫ в gameUI.js ---
    
    // Оставим "публичные" методы-обертки
    updateGameUI() {
        updateGameUI(this);
    }
    
    drawPollutionFog() {
        drawPollutionFog(this);
    }

    drawPlayAreaOutline() {
        drawPlayAreaOutline(this);
    }


    // --- Главный Игровой Цикл ---

    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        if (this.gameState !== 'paused') {
            this.update(Math.min(deltaTime, 0.1));
        }
        this.draw();
        
        if (this.animationFrameId) { // Проверяем, не был ли цикл остановлен
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        }
    }
}