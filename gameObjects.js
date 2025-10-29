import * as C from './constants.js';
import { rand, distance } from './utils.js';
import { lootTypes } from './levelConfigs.js';

/**
 * Спавнит астероид.
 * Логика взята из GameLevel.spawnAsteroid.
 */
export function spawnAsteroid(gameLevel) {
    const { currentLevelGameplay, devSettings, WORLD_HEIGHT, planets, currentLevelTheme } = gameLevel;
    
    const spawnDist = C.WORLD_WIDTH * 1.2;
    const sectors = currentLevelGameplay.asteroidSpawnSectors || [{ start: 0, end: 360 }];
    const sector = sectors[Math.floor(Math.random() * sectors.length)];
    const angleRad = rand(sector.start, sector.end) * (Math.PI / 180);

    const x = C.WORLD_WIDTH/2 + Math.cos(angleRad) * spawnDist; 
    const y = WORLD_HEIGHT/2 + Math.sin(angleRad) * spawnDist;

    const avgPlanetX = planets.reduce((acc, p) => acc + p.x, 0) / planets.length;
    const avgPlanetY = planets.reduce((acc, p) => acc + p.y, 0) / planets.length;

    const directAngle = Math.atan2(avgPlanetY - y, avgPlanetX - x);
    const tangentFactor = devSettings.asteroidsHaveGravity ? rand(-0.6, 0.6) : rand(-0.05, 0.05);
    const finalAngle = directAngle + (Math.PI / 2) * tangentFactor;
    
    const speed = rand(150, 300) * devSettings.asteroidSpeedMultiplier * devSettings.speedRegulator;
    const radius = rand(15, 35);
    const points = []; const pointCount = Math.round(rand(6, 8));
    for (let j = 0; j < pointCount; j++) {
        const pAngle = (j / pointCount) * Math.PI * 2;
        const pDist = rand(radius * 0.8, radius); 
        points.push({ x: Math.cos(pAngle) * pDist, y: Math.sin(pAngle) * pDist });
    }
    const color = devSettings.colorAsteroidsByLevel 
        ? currentLevelTheme.asteroidColor 
        : getComputedStyle(document.documentElement).getPropertyValue('--asteroid-color-default');
        
    gameLevel.asteroids.push({ 
        x, y, vx: Math.cos(finalAngle) * speed, vy: Math.sin(finalAngle) * speed, 
        radius, angle: 0, spin: rand(-Math.PI, Math.PI), points, color 
    });
}

/**
 * Создает облако пыли.
 * Логика взята из GameLevel.createDustCloud.
 */
export function createDustCloud(gameLevel, x, y, initialRadius) {
    const createPoints = () => {
        const points = []; const anim = []; const offsets = [];
        const pointCount = Math.round(rand(8, 12));
        for (let j = 0; j < pointCount; j++) {
            const angle = (j / pointCount) * Math.PI * 2;
            const dist = rand(initialRadius * 0.5, initialRadius);
            points.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
            offsets.push({ x: 0, y: 0 }); 
            anim.push({
                phase: rand(0, Math.PI * 2),
                speed: rand(Math.PI * 0.5, Math.PI * 1.5),
                maxOffset: rand(initialRadius * 0.1, initialRadius * 0.3)
            });
        }
        return { points, anim, offsets };
    };

    const layer1 = createPoints();
    const layer2 = createPoints();

    gameLevel.dustClouds.push({
        x, y, vx: 0, vy: 0, radius: initialRadius, life: 10, initialLife: 10, age: 0,
        angle: rand(0, Math.PI * 2), spin: rand(-Math.PI * 0.3, Math.PI * 0.3),
        points1: layer1.points, anim1: layer1.anim, offsets1: layer1.offsets,
        points2: layer2.points, anim2: layer2.anim, offsets2: layer2.offsets,
        pollutionAmount: 1.0,
    });
}

/**
 * Спавнит лут.
 * Логика взята из GameLevel.spawnLoot.
 */
export function spawnLoot(gameLevel, x, y) {
    if (gameLevel.devSettings.lootOnlyInZone && !gameLevel.isInsidePlayArea(x, y)) return;
    const chance = Math.random();
    let type = chance < 0.6 ? lootTypes.small : (chance < 0.9 ? lootTypes.medium : lootTypes.large);
    gameLevel.lootDrops.push({ 
        x, y, 
        vx: rand(-30, 30) * gameLevel.devSettings.speedRegulator, 
        vy: rand(-30, 30) * gameLevel.devSettings.speedRegulator, 
        ...type, 
        age: 0, life: 30 
    });
}

/**
 * Создает обломки.
 * Логика взята из GameLevel.createDebris.
 */
export function createDebris(gameLevel, x, y, count) {
    for (let i = 0; i < count; i++) {
        gameLevel.debris.push({ 
            x, y, 
            vx: rand(-50, 50) * gameLevel.devSettings.speedRegulator, 
            vy: rand(-50, 50) * gameLevel.devSettings.speedRegulator, 
            radius: rand(4, 10),
            life: rand(0.5, 1.5), 
            angle: rand(0, Math.PI*2), 
            spin: rand(-Math.PI, Math.PI) 
        });
    }
}

/**
 * Создает взрыв (частицы).
 * Логика взята из GameLevel.createExplosion.
 */
export function createExplosion(gameLevel, x, y, count, color, life) {
     for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2; 
        const speed = (Math.random() * 150 + 50) * gameLevel.devSettings.speedRegulator;
        gameLevel.particles.push({ 
            x, y, 
            vx: Math.cos(angle) * speed, 
            vy: Math.sin(angle) * speed,
            radius: rand(2, 8), 
            life: Math.random() * life + 0.2, 
            initialLife: life + 0.2, 
            color
        });
    }
}

/**
 * Обновляет все игровые объекты (астероиды, лут, пыль, частицы).
 * Логика взята из GameLevel.update и GameLevel.updatePlayingState.
 */
export function updateGameObjects(gameLevel, dt) {
    const { devSettings, rocket, planets, settings } = gameLevel;

    // Обновление частиц (взрывы)
    gameLevel.particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; });
    gameLevel.particles = gameLevel.particles.filter(p => p.life > 0);

    // Обновление обломков
    gameLevel.debris.forEach(d => {d.life -= dt; d.x += d.vx * dt; d.y += d.vy * dt; }); 
    gameLevel.debris = gameLevel.debris.filter(d => d.life > 0);
    
    // Обновление лута (включая притягивание к ракете)
    gameLevel.lootDrops.forEach((l, index) => {
        l.life -= dt; 
        l.age += dt;
        
        if (gameLevel.gameState === 'playing') { // Лут притягивается только в игре
            const distToRocket = distance(rocket, l);
            if (distToRocket < rocket.collisionRadius + l.radius) { 
                gameLevel.lootCollected += l.value; 
                gameLevel.lootDrops.splice(index, 1); 
                return; 
            }
            if (distToRocket < l.magneticRadius) {
                const pullSpeed = 400 * devSettings.speedRegulator;
                l.vx += (rocket.x - l.x) / distToRocket * pullSpeed * dt;
                l.vy += (rocket.y - l.y) / distToRocket * pullSpeed * dt;
            }
        }
        l.vx *= 0.98; l.vy *= 0.98; l.x += l.vx * dt; l.y += l.vy * dt;
    }); 
    gameLevel.lootDrops = gameLevel.lootDrops.filter(l => l.life > 0);

    // Обновление облаков пыли
    gameLevel.dustClouds.forEach((cloud, index) => {
        cloud.age += dt;
        cloud.life -= dt;
        if (cloud.life <= 0) { gameLevel.dustClouds.splice(index, 1); return; }
        cloud.angle += cloud.spin * dt;
        
        // Анимация точек
        cloud.anim1.forEach((anim, i) => {
            const point = cloud.points1[i];
            const originalAngle = Math.atan2(point.y, point.x);
            const offsetMag = Math.sin(cloud.age * anim.speed + anim.phase) * anim.maxOffset;
            cloud.offsets1[i].x = -Math.sin(originalAngle) * offsetMag;
            cloud.offsets1[i].y = Math.cos(originalAngle) * offsetMag;
        });
        cloud.anim2.forEach((anim, i) => {
            const point = cloud.points2[i];
            const originalAngle = Math.atan2(point.y, point.x);
            const offsetMag = Math.sin(cloud.age * anim.speed + anim.phase) * anim.maxOffset;
            cloud.offsets2[i].x = -Math.sin(originalAngle) * offsetMag;
            cloud.offsets2[i].y = Math.cos(originalAngle) * offsetMag;
        });

        // Движение облаков
        if (devSettings.dustCloudsMove) {
            const dx = cloud.x - C.WORLD_WIDTH / 2; const dy = cloud.y - gameLevel.WORLD_HEIGHT / 2;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            cloud.vx += (dx / dist) * 15 * dt * devSettings.speedRegulator; 
            cloud.vy += (dy / dist) * 15 * dt * devSettings.speedRegulator;
            cloud.vx *= 0.99; cloud.vy *= 0.99;
            cloud.x += cloud.vx * dt; cloud.y += cloud.vy * dt;
        }
    });

    // Обновление астероидов (гравитация)
    if (devSettings.asteroidsHaveGravity) {
        gameLevel.asteroids.forEach(a => {
            let asteroidGravityX = 0, asteroidGravityY = 0;
            planets.forEach(p => {
                 if (gameLevel.isInsidePlayArea(a.x, a.y)) {
                    const dx = p.x - a.x, dy = p.y - a.y; const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > 0) {
                        const force = gameLevel.calculateGravityForce(dist, p) * devSettings.asteroidSpeedMultiplier; 
                        asteroidGravityX += (force * dx/dist); asteroidGravityY += (force * dy/dist);
                    }
                 }
            });
            a.vx += asteroidGravityX * dt; a.vy += asteroidGravityY * dt;
        });
    }

    // Обновление астероидов (движение и столкновения с планетами)
    gameLevel.asteroids.forEach((a, index) => {
        a.x += a.vx * dt; a.y += a.vy * dt; a.angle += a.spin * dt;
        let removed = false;
        planets.forEach(p => {
            if (!removed && distance(a, p) < p.radius + a.radius) {
                if (settings.soundOn) createDebris(gameLevel, a.x, a.y, 5);
                if (devSettings.enablePollution) createDustCloud(gameLevel, a.x, a.y, a.radius);
                if (devSettings.enableLoot && Math.random() < 0.5) spawnLoot(gameLevel, a.x, a.y);
                gameLevel.asteroids.splice(index, 1); removed = true;
            }
        });
    });
    
    // Обновление астероидов (столкновения друг с другом)
    if (devSettings.asteroidAsteroidCollision) {
        for (let i = 0; i < gameLevel.asteroids.length; i++) {
            for (let j = i + 1; j < gameLevel.asteroids.length; j++) {
                const a1 = gameLevel.asteroids[i]; const a2 = gameLevel.asteroids[j];
                if (distance(a1, a2) < a1.radius + a2.radius) {
                    if (settings.soundOn) {
                        const cx = (a1.x + a2.x)/2, cy = (a1.y + a2.y)/2;
                        createDebris(gameLevel, cx, cy, 5);
                        if (devSettings.enablePollution) createDustCloud(gameLevel, cx, cy, (a1.radius + a2.radius) / 2);
                        if (devSettings.enableLoot && Math.random() < 0.5) spawnLoot(gameLevel, cx, cy);
                    }
                    gameLevel.asteroids.splice(j, 1); gameLevel.asteroids.splice(i, 1); i--; break;
                }
            }
        }
    }
}

/**
 * Рисует все игровые объекты.
 * Логика взята из GameLevel.draw.
 */
export function drawGameObjects(gameLevel) {
    const { ctx, scaleFactor: sf } = gameLevel;

    // Астероиды
    ctx.globalAlpha = 1.0;
    gameLevel.asteroids.forEach(a => {
        ctx.save(); ctx.translate(a.x * sf, a.y * sf); ctx.rotate(a.angle);
        ctx.fillStyle = a.color; ctx.beginPath();
        ctx.moveTo(a.points[0].x * sf, a.points[0].y * sf);
        for (let i = 1; i < a.points.length; i++) ctx.lineTo(a.points[i].x * sf, a.points[i].y * sf);
        ctx.closePath(); ctx.fill(); ctx.restore();
    });

    // Облака пыли
    gameLevel.dustClouds.forEach(cloud => {
        const progress = 1 - (cloud.life / cloud.initialLife);
        const currentScale = 1 + progress * 2;
        const currentAlpha = 0.35 * (1 - progress);
        
        ctx.save(); 
        ctx.translate(cloud.x * sf, cloud.y * sf);
        ctx.rotate(cloud.angle); 
        ctx.scale(currentScale, currentScale);
        ctx.fillStyle = `rgba(120, 120, 120, ${currentAlpha})`; 

        ctx.beginPath();
        ctx.moveTo((cloud.points1[0].x + cloud.offsets1[0].x) * sf, (cloud.points1[0].y + cloud.offsets1[0].y) * sf);
        for (let i = 1; i < cloud.points1.length; i++) ctx.lineTo((cloud.points1[i].x + cloud.offsets1[i].x) * sf, (cloud.points1[i].y + cloud.offsets1[i].y) * sf);
        ctx.closePath(); ctx.fill();

        ctx.beginPath();
        ctx.moveTo((cloud.points2[0].x + cloud.offsets2[0].x) * sf, (cloud.points2[0].y + cloud.offsets2[0].y) * sf);
        for (let i = 1; i < cloud.points2.length; i++) ctx.lineTo((cloud.points2[i].x + cloud.offsets2[i].x) * sf, (cloud.points2[i].y + cloud.offsets2[i].y) * sf);
        ctx.closePath(); ctx.fill();
        
        ctx.restore();
    });

    // Обломки
    gameLevel.debris.forEach(d => {
        ctx.save(); ctx.translate(d.x * sf, d.y * sf); ctx.rotate(d.angle);
        ctx.fillStyle = `rgba(154, 140, 152, ${d.life / 1.5})`;
        ctx.fillRect(-d.radius * sf, -d.radius * sf, d.radius * 2 * sf, d.radius * 2 * sf);
        ctx.restore();
    });
    
    // Лут
    gameLevel.lootDrops.forEach(l => {
        ctx.save(); ctx.translate(l.x * sf, l.y * sf);
        const spawnScale = Math.min(1, l.age / 0.3);
        const alpha = l.life < 10 && Math.floor(l.life * 5) % 2 === 0 ? 0.5 : 1.0;
        ctx.fillStyle = l.color; ctx.globalAlpha = alpha; ctx.shadowColor = l.color; ctx.shadowBlur = 15 * sf * spawnScale;
        const size = l.radius * sf * spawnScale; ctx.fillRect(-size/2, -size/2, size, size);
        ctx.restore();
    });
    
    // Частицы (взрывы)
    gameLevel.particles.forEach(p => {
        ctx.globalAlpha = p.life / p.initialLife; ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = p.radius * sf;
        ctx.arc(p.x * sf, p.y * sf, r, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}