import { getFuelColor, lerp } from './utils.js';
import * as C from './constants.js';

/**
 * Обновляет DOM-элементы UI (счет, топливо).
 * Логика взята из GameLevel.updateGameUI.
 */
export function updateGameUI(gameLevel) {
    const { devSettings, rocket, stabilizationEffect, fuelShakeIntensity, gameState, gameTime } = gameLevel;

    const fuelBarContainer = document.getElementById('fuel-bar-container');
    const fuelBar = document.getElementById('fuel-bar');
    const scoreDisplay = document.getElementById('score-display');

    // Обновление полосы топлива
    if (devSettings.fuelSeconds > 0) {
        fuelBar.style.width = `${Math.max(0, rocket.fuel / rocket.maxFuel * 100)}%`;
        const fuelRatio = rocket.fuel / rocket.maxFuel;
        if (stabilizationEffect > 0) {
            const normalHue = fuelRatio * 60;
            const finalLightness = 50 + (50 * stabilizationEffect);
            const finalSaturation = 100 - (100 * stabilizationEffect);
            fuelBar.style.backgroundColor = `hsl(${normalHue}, ${finalSaturation}%, ${finalLightness}%)`;
        } else {
            fuelBar.style.backgroundColor = getFuelColor(fuelRatio);
        }
    }

    // Тряска полосы топлива
    if (fuelShakeIntensity > 0.01) {
        const shakeX = (Math.random() - 0.5) * 25 * fuelShakeIntensity;
        const shakeY = (Math.random() - 0.5) * 25 * fuelShakeIntensity;
        const shakeRot = (Math.random() - 0.5) * 10 * fuelShakeIntensity;
        fuelBarContainer.style.transform = `translate(${shakeX}px, ${shakeY}px) rotate(${shakeRot}deg)`;
    } else {
        fuelBarContainer.style.transform = 'translate(0,0) rotate(0deg)';
    }
    
    // Обновление счета
    if (gameState === 'playing') {
        scoreDisplay.textContent = gameTime.toFixed(2);
    }
}

/**
 * Обновляет DOM-элементы UI во время интро.
 * Логика взята из GameLevel.draw.
 */
export function updateIntroUI(gameLevel) {
    if (gameLevel.gameState !== 'intro') return;

    const uiAnimProgress = gameLevel.animProgress(C.OUTLINE_ANIM_START, C.INTRO_DURATION - C.OUTLINE_ANIM_START);
    
    const scoreDisplay = document.getElementById('score-display');
    const pauseBtn = document.getElementById('pause-btn');
    const fuelBarContainer = document.getElementById('fuel-bar-container');
    
    if (uiAnimProgress > 0) {
        const finalAlpha = 0.5 - 0.5 * Math.cos(uiAnimProgress * Math.PI);
        scoreDisplay.style.opacity = finalAlpha;
        pauseBtn.style.opacity = finalAlpha;
        fuelBarContainer.style.opacity = finalAlpha;
    }
}

/**
 * Рисует элементы UI на канвасе (пузырьки топлива, траектория).
 * Логика взята из GameLevel.updateGameUI и GameLevel.draw.
 */
export function drawCanvasUI(gameLevel) {
    const { ctx, devSettings, canvas } = gameLevel;

    // Пузырьки топлива
    if (devSettings.fuelSeconds > 0 && gameLevel.fuelBubbles.length > 0) {
        const fuelBar = document.getElementById('fuel-bar');
        const canvasRect = canvas.getBoundingClientRect();
        const barRect = fuelBar.getBoundingClientRect();
        
        const barX = barRect.left - canvasRect.left;
        const barY = barRect.top - canvasRect.top;
        const barHeight = barRect.height;
        const currentFuelWidth = barRect.width;

        gameLevel.fuelBubbles.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.globalAlpha = b.life / 0.7;
            ctx.beginPath();
            const bubbleX = barX + currentFuelWidth * b.x + b.vx;
            const bubbleY = barY + barHeight * b.y + b.vy;
            ctx.arc(bubbleX, bubbleY, b.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    // Траектория
    if (devSettings.enableTrajectory) {
        gameLevel.trajectoryPoints.forEach(p => {
            const progress = p.life / p.initialLife;
            const radius = 3 * progress;
            const alpha = 0.4 * progress; 
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x * gameLevel.scaleFactor, p.y * gameLevel.scaleFactor, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

/**
 * Рисует туман (загрязнение).
 * Логика взята из GameLevel.drawPollutionFog.
 */
export function drawPollutionFog(gameLevel) {
    const { ctx, displayedPollution, fogColorRgb, rocket, crashSiteX, crashSiteY, scaleFactor, canvas, gameState } = gameLevel;

    if (displayedPollution <= 0) return;
    
    const maxGradientEndRadius = C.WORLD_WIDTH * 2;
    const minGradientEndRadius = 300;

    const pollutionRemapPoints = [
        { disp: 0.0,  remap: 0.0 },   
        { disp: 0.25, remap: 0.7 },  
        { disp: 0.7,  remap: 0.95 }, 
        { disp: 1.0,  remap: 1.0 }   
    ];

    let remappedPollution = 0;
    if (displayedPollution >= 1.0) {
        remappedPollution = 1.0;
    } else {
        for (let i = 1; i < pollutionRemapPoints.length; i++) {
            if (displayedPollution <= pollutionRemapPoints[i].disp) {
                const prev = pollutionRemapPoints[i - 1];
                const curr = pollutionRemapPoints[i];
                const range = curr.disp - prev.disp;
                if (range > 0) {
                    const t = (displayedPollution - prev.disp) / range;
                    remappedPollution = lerp(prev.remap, curr.remap, t);
                } else {
                    remappedPollution = prev.remap;
                }
                break; 
            }
        }
    }
    
    const currentGradientEndRadius = lerp(maxGradientEndRadius, minGradientEndRadius, remappedPollution);
    
    ctx.save();
    
    let fogCenterX, fogCenterY;
    if (gameState === 'gameover' && rocket.isDestroyed && crashSiteX !== null) {
        fogCenterX = crashSiteX * scaleFactor;
        fogCenterY = crashSiteY * scaleFactor;
    } else {
        fogCenterX = rocket.x * scaleFactor; 
        fogCenterY = rocket.y * scaleFactor;
    }
    
    const gradientEndRadiusScaled = currentGradientEndRadius * scaleFactor;
    
    const gradient = ctx.createRadialGradient(fogCenterX, fogCenterY, 0, fogCenterX, fogCenterY, gradientEndRadiusScaled);
    
    const fogColor = `rgba(${fogColorRgb.r}, ${fogColorRgb.g}, ${fogColorRgb.b}, 1)`;
    const transparentColor = `rgba(${fogColorRgb.r}, ${fogColorRgb.g}, ${fogColorRgb.b}, 0)`;
    
    gradient.addColorStop(0, transparentColor);
    gradient.addColorStop(1, fogColor);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width / gameLevel.devicePixelRatio, canvas.height / gameLevel.devicePixelRatio);
    ctx.restore();
}

/**
 * Рисует контур игровой зоны.
 * Логика взята из GameLevel.drawPlayAreaOutline.
 */
export function drawPlayAreaOutline(gameLevel) {
    const { ctx, planets, scaleFactor, currentLevelTheme } = gameLevel;

    const t_outline = gameLevel.animProgress(C.OUTLINE_ANIM_START, C.INTRO_DURATION - C.OUTLINE_ANIM_START);
    if (t_outline <= 0) return;
    
    const baseAlpha = 0.5 - 0.5 * Math.cos(t_outline * Math.PI);
    const blinkMultiplier = 0.6 + 0.4 * Math.sin(t_outline * Math.PI * 6);
    
    ctx.globalAlpha = baseAlpha * blinkMultiplier;
    ctx.strokeStyle = currentLevelTheme.outlineColor; 
    ctx.lineWidth = 2; 
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    
    const zones = planets.map(p => ({ 
        x: p.x * scaleFactor, 
        y: p.y * scaleFactor, 
        radius: p.radius * C.OUT_OF_BOUNDS_RADIUS_FACTOR * scaleFactor 
    }));
    
    if (zones.length === 1) { 
        ctx.arc(zones[0].x, zones[0].y, zones[0].radius, 0, Math.PI * 2); 
    } 
    else if (zones.length >= 2) {
        // Логика объединения двух окружностей
        const p1 = zones[0], p2 = zones[1]; const r1 = p1.radius, r2 = p2.radius;
        const d = Math.sqrt((p1.x-p2.x)**2 + (p1.y-p2.y)**2);
        if (d > r1 + r2 || d <= Math.abs(r1 - r2)) { 
            ctx.arc(p1.x, p1.y, r1, 0, Math.PI*2); 
            ctx.moveTo(p2.x+r2, p2.y); 
            ctx.arc(p2.x, p2.y, r2, 0, Math.PI*2); 
        } 
        else {
            const a = (d*d + r1*r1 - r2*r2)/(2*d); const h = Math.sqrt(r1*r1 - a*a);
            const x2 = p1.x+a*(p2.x-p1.x)/d; const y2 = p1.y+a*(p2.y-p1.y)/d;
            const pt1x = x2+h*(p2.y-p1.y)/d; const pt1y = y2-h*(p2.x-p1.x)/d;
            const pt2x = x2-h*(p2.y-p1.y)/d; const pt2y = y2+h*(p2.x-p1.x)/d;
            const a11=Math.atan2(pt1y-p1.y,pt1x-p1.x); const a12=Math.atan2(pt2y-p1.y,pt2x-p1.x);
            const a21=Math.atan2(pt1y-p2.y,pt1x-p2.x); const a22=Math.atan2(pt2y-p2.y,pt2x-p2.x);
            ctx.arc(p1.x,p1.y,r1,a12,a11); ctx.arc(p2.x,p2.y,r2,a21,a22);
        }
    }
    ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1.0;
}