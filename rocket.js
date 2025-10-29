import * as C from './constants.js';
import { distance } from './utils.js';

/**
 * Инициализирует и возвращает объект ракеты.
 * Логика взята из GameLevel.setupGameObjects.
 */
export function createRocket(gameLevel) {
    const primaryPlanet = gameLevel.planets[0];
    const spawnDistance = primaryPlanet.radius + (primaryPlanet.radius * C.OUT_OF_BOUNDS_RADIUS_FACTOR - primaryPlanet.radius) * 0.5;
    
    const gravityForceAtSpawn = gameLevel.calculateGravityForce(spawnDistance, primaryPlanet);
    const stableOrbitalSpeed = Math.sqrt(gravityForceAtSpawn * spawnDistance);
    const orbitalSpeed = stableOrbitalSpeed * gameLevel.devSettings.decayingOrbitFactor;
    
    const spawnAngle = Math.random() * Math.PI * 2;
    
    const rocketRadius = 15;
    const rocket = {
        x: 0, y: 0, vx: 0, vy: 0, radius: rocketRadius,
        collisionRadius: rocketRadius * 0.8, angle: 0, isDestroyed: false, 
        isSpinning: false, fuel: 1, maxFuel: 1,
    };

    const targetX = primaryPlanet.x + Math.cos(spawnAngle) * spawnDistance;
    const targetY = primaryPlanet.y + Math.sin(spawnAngle) * spawnDistance;
    const targetVx = -Math.sin(spawnAngle) * orbitalSpeed;
    const targetVy = Math.cos(spawnAngle) * orbitalSpeed;

    rocket.target = { x: targetX, y: targetY, vx: targetVx, vy: targetVy };

    if (gameLevel.devSettings.playIntro) {
        const p2 = { x: targetX, y: targetY }; const targetVel = { x: targetVx, y: targetVy };
        const p0_left = { x: -100, y: gameLevel.WORLD_HEIGHT / 2 }; const p0_right = { x: C.WORLD_WIDTH + 100, y: gameLevel.WORLD_HEIGHT / 2 };
        const getControlPoint = (p0, p2_v, targetVel_v) => {
            const dist = distance(p0, p2_v); const tangent = { x: -targetVel_v.x, y: -targetVel_v.y };
            const mag = Math.sqrt(tangent.x**2 + tangent.y**2) || 1;
            return { x: p2_v.x + (tangent.x / mag) * dist * 0.8, y: p2_v.y + (tangent.y / mag) * dist * 0.8 };
        };
        const p1_left = getControlPoint(p0_left, p2, targetVel); const p1_right = getControlPoint(p0_right, p2, targetVel);
        const endTangentLeft = { x: p2.x - p1_left.x, y: p2.y - p1_left.y }; const endTangentRight = { x: p2.x - p1_right.x, y: p2.y - p1_right.y };
        const magTarget = Math.sqrt(targetVel.x**2 + targetVel.y**2) || 1; const magLeft = Math.sqrt(endTangentLeft.x**2 + endTangentLeft.y**2) || 1;
        const magRight = Math.sqrt(endTangentRight.x**2 + endTangentRight.y**2) || 1;
        const dotLeft = (endTangentLeft.x * targetVel.x + endTangentLeft.y * targetVel.y) / (magLeft * magTarget);
        const dotRight = (endTangentRight.x * targetVel.x + endTangentRight.y * targetVel.y) / (magRight * magTarget);
        const startPoint = dotLeft > dotRight ? p0_left : p0_right; const controlPoint = dotLeft > dotRight ? p1_left : p1_right;
        rocket.x = startPoint.x; rocket.y = startPoint.y;
        rocket.introPath = { p0: startPoint, p1: controlPoint, p2: p2 };
        gameLevel.gameState = 'intro'; gameLevel.introTimer = 0;
    } else {
        rocket.x = targetX; rocket.y = targetY;
        rocket.vx = targetVx; rocket.vy = targetVy;
        gameLevel.gameState = 'playing';
    }
    
    return rocket;
}

/**
 * Обновляет физику ракеты в состоянии 'playing'.
 * Логика взята из GameLevel.updatePlayingState.
 */
export function updateRocketState(gameLevel, dt, totalGravityX, totalGravityY, dominantPlanet) {
    let totalForceX = totalGravityX;
    let totalForceY = totalGravityY;
    let appliedThrustX = 0;
    let appliedThrustY = 0;
    let visualThrustMagnitude = 0;

    const { rocket, devSettings, isThrusting, isDoubleTapHold, isDragging, touchStartPos, touchCurrentPos, canvas } = gameLevel;

    if (isThrusting && (devSettings.fuelSeconds <= 0 || rocket.fuel > 0)) {
        let currentThrustForce = C.THRUST_FORCE * devSettings.speedRegulator * devSettings.speedRegulator;

        const isStabilizing = devSettings.enableStabilization && isDoubleTapHold;

        if (devSettings.controlMode === 'mode2' && isStabilizing) {
            currentThrustForce *= devSettings.mode2ThrustMultiplier;
        }

        if (isStabilizing && dominantPlanet) {
            const dx = dominantPlanet.x - rocket.x;
            const dy = dominantPlanet.y - rocket.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            let vCorrectionX = 0, vCorrectionY = 0, hCorrectionX = 0, hCorrectionY = 0;

            if (dist > 0) {
                const radialX = dx / dist; const radialY = dy / dist;
                const radialVelocity = rocket.vx * radialX + rocket.vy * radialY;
                if (Math.abs(radialVelocity) > C.STABILIZATION_RADIAL_THRESHOLD * devSettings.speedRegulator) {
                    const verticalCorrectionForce = -radialVelocity * 80;
                    vCorrectionX = radialX * verticalCorrectionForce;
                    vCorrectionY = radialY * verticalCorrectionForce;
                }
                
                const gravityAtDist = gameLevel.calculateGravityForce(dist, dominantPlanet);
                const stableSpeed = Math.sqrt(gravityAtDist * dist);
                const tangentX = -dy / dist; const tangentY = dx / dist;
                const currentTangentialSpeed = rocket.vx * tangentX + rocket.vy * tangentY;
                const orbitDirection = Math.sign(currentTangentialSpeed) || 1;
                const targetTangentialSpeed = stableSpeed * orbitDirection;
                const speedDiff = targetTangentialSpeed - currentTangentialSpeed;

                if (Math.abs(speedDiff) > C.STABILIZATION_SPEED_THRESHOLD * devSettings.speedRegulator) {
                    const horizontalCorrectionForce = speedDiff * 60;
                    hCorrectionX = tangentX * horizontalCorrectionForce;
                    hCorrectionY = tangentY * horizontalCorrectionForce;
                }
            }

            const requiredCorrectionX = vCorrectionX + hCorrectionX;
            const requiredCorrectionY = vCorrectionY + hCorrectionY;
            const requiredForceMagnitude = Math.sqrt(requiredCorrectionX**2 + requiredCorrectionY**2);
            
            if (requiredForceMagnitude <= currentThrustForce) {
                appliedThrustX = 0; appliedThrustY = 0;
                
                const tangentX = -dy / dist; const tangentY = dx / dist;
                const gravityAtDist = gameLevel.calculateGravityForce(dist, dominantPlanet);
                const stableSpeed = Math.sqrt(gravityAtDist * dist);
                const currentTangentialSpeed = rocket.vx * tangentX + rocket.vy * tangentY;
                const orbitDirection = Math.sign(currentTangentialSpeed) || 1;
                const targetTangentialSpeed = stableSpeed * orbitDirection;

                rocket.vx = tangentX * targetTangentialSpeed;
                rocket.vy = tangentY * targetTangentialSpeed;
            } else {
                const requiredDirX = requiredCorrectionX / requiredForceMagnitude;
                const requiredDirY = requiredCorrectionY / requiredForceMagnitude;
                appliedThrustX = requiredDirX * currentThrustForce;
                appliedThrustY = requiredDirY * currentThrustForce;
            }
        }
        else if (devSettings.controlMode === 'mode1') {
            const gravityMagnitude = Math.sqrt(totalGravityX**2 + totalGravityY**2);
            if(gravityMagnitude > 0) {
                appliedThrustX = -(totalGravityX / gravityMagnitude) * currentThrustForce;
                appliedThrustY = -(totalGravityY / gravityMagnitude) * currentThrustForce;
            }
        } else if (devSettings.controlMode === 'mode2') {
            if (isDragging && touchStartPos && touchCurrentPos) {
                const deltaY = touchCurrentPos.y - touchStartPos.y;
                const maxDragDist = (canvas.getBoundingClientRect().width / gameLevel.devicePixelRatio) * 0.25;
                const input = Math.max(-1, Math.min(1, -deltaY / maxDragDist));
                
                let unscaledThrustMagnitude = Math.abs(input) * C.THRUST_FORCE * devSettings.mode2ThrustMultiplier;
                const thrustMagnitude = unscaledThrustMagnitude * devSettings.speedRegulator * devSettings.speedRegulator;
                const direction = Math.sign(input);

                visualThrustMagnitude = unscaledThrustMagnitude;

                const speed = Math.sqrt(rocket.vx**2 + rocket.vy**2);
                if (speed > 0) {
                    appliedThrustX = (rocket.vx / speed) * thrustMagnitude * direction;
                    appliedThrustY = (rocket.vy / speed) * thrustMagnitude * direction;
                } else if (direction > 0) {
                    appliedThrustX = Math.cos(rocket.angle - Math.PI / 2) * thrustMagnitude;
                    appliedThrustY = Math.sin(rocket.angle - Math.PI / 2) * thrustMagnitude;
                }
            }
        }
       
        if (visualThrustMagnitude === 0) {
            visualThrustMagnitude = Math.sqrt(appliedThrustX**2 + appliedThrustY**2);
        }

       totalForceX += appliedThrustX; totalForceY += appliedThrustY;
       
       if (devSettings.fuelSeconds > 0) {
            const appliedThrustMagnitude = Math.sqrt(appliedThrustX**2 + appliedThrustY**2);
            const baseMaxThrust = C.THRUST_FORCE * devSettings.speedRegulator * devSettings.speedRegulator;
            let thrustRatio = appliedThrustMagnitude / baseMaxThrust;
            if (devSettings.controlMode === 'mode2') {
                thrustRatio /= devSettings.mode2ThrustMultiplier;
            }

            rocket.fuel = Math.max(0, rocket.fuel - (dt * thrustRatio));
            
            if (rocket.fuel > 0 && thrustRatio > 0) {
                const effectRatio = 0.5 + thrustRatio * 0.5;
                const maxBubbleSpawnChance = 0.9;
                if (Math.random() < maxBubbleSpawnChance * effectRatio) {
                    gameLevel.fuelBubbles.push({
                        x: Math.random(), y: Math.random() * 0.6 + 0.2, // rand(0.2, 0.8)
                        vx: 0, vy: (Math.random() * -20 - 10) * effectRatio, // rand(-10 * effectRatio, -30 * effectRatio)
                        radius: (Math.random() * 6 + 6) * effectRatio, // rand(6 * effectRatio, 12 * effectRatio)
                        life: Math.random() * 0.3 + 0.4, // rand(0.4, 0.7)
                        color: Math.random() < 0.5 ? '#FFA500' : '#FF4500'
                    });
                }
            }
       }
    }

    rocket.vx += totalForceX * dt; rocket.vy += totalForceY * dt;
    
    if (!rocket.isDestroyed) {
         rocket.x += rocket.vx * dt; rocket.y += rocket.vy * dt;
         rocket.angle = Math.atan2(rocket.vy, rocket.vx) + Math.PI / 2;
    }

    // Возвращаем примененные силы для UI
    return { appliedThrustX, appliedThrustY, visualThrustMagnitude };
}

/**
 * Обновляет ракету в состоянии 'intro'.
 * Логика взята из GameLevel.update.
 */
export function updateRocketIntro(gameLevel, dt) {
    const { rocket } = gameLevel;
    
    gameLevel.introTimer += dt;
    const shipAnimDuration = C.INTRO_DURATION - C.SHIP_ANIM_START;
    const t_ship = Math.min(1, Math.max(0, gameLevel.introTimer - C.SHIP_ANIM_START) / shipAnimDuration);
    
    if (t_ship > 0) {
        const t_ease = t_ship < 0.5 ? 4 * t_ship * t_ship * t_ship : 1 - Math.pow(-2 * t_ship + 2, 3) / 2;
        const p = rocket.introPath;
        const prev_x = rocket.x; const prev_y = rocket.y;
        
        rocket.x = (1 - t_ease)**2 * p.p0.x + 2 * (1 - t_ease) * t_ease * p.p1.x + t_ease**2 * p.p2.x;
        rocket.y = (1 - t_ease)**2 * p.p0.y + 2 * (1 - t_ease) * t_ease * p.p1.y + t_ease**2 * p.p2.y;
        
        if(t_ship > 0.01 && dt > 0) {
             rocket.vx = (rocket.x - prev_x) / dt; rocket.vy = (rocket.y - prev_y) / dt;
             rocket.angle = Math.atan2(rocket.vy, rocket.vx) + Math.PI/2;
        }
    }
    
    if (gameLevel.introTimer >= C.INTRO_DURATION) {
        const overflowDt = gameLevel.introTimer - C.INTRO_DURATION;
        rocket.x = rocket.target.x; rocket.y = rocket.target.y;
        rocket.vx = rocket.target.vx; rocket.vy = rocket.target.vy;
        rocket.angle = Math.atan2(rocket.vy, rocket.vx) + Math.PI / 2;
        gameLevel.gameState = 'playing'; gameLevel.gameTime = 0;
        gameLevel.updatePlayingState(overflowDt); // Вызовет updatePlayingState с "остатком" времени
    }
}

/**
 * Рисует ракету и ее эффекты (выхлоп).
 * Логика взята из GameLevel.draw.
 */
export function drawRocket(gameLevel) {
    const { ctx, rocket, scaleFactor: sf, gameTime, visualThrustMagnitude, currentAppliedThrustX, currentAppliedThrustY } = gameLevel;
    
    if (rocket.isDestroyed) return;

    const t_ship_appear = gameLevel.animProgress(C.SHIP_ANIM_START, 0.5);
    if(t_ship_appear > 0) {
         ctx.save();
         ctx.globalAlpha = t_ship_appear;
         ctx.translate(rocket.x * sf, rocket.y * sf);
         ctx.rotate(rocket.angle);
         
        if (visualThrustMagnitude > 1.0) {
            let thrustRatio = Math.min(1, visualThrustMagnitude / C.THRUST_FORCE);
            if (gameLevel.devSettings.controlMode === 'mode2'){
                thrustRatio = Math.min(1, thrustRatio /= gameLevel.devSettings.mode2ThrustMultiplier);
            }
            const minThrustRatio = 0.2;
            const displayThrustRatio = minThrustRatio + (1 - minThrustRatio) * thrustRatio;
            const thrustAngle = Math.atan2(currentAppliedThrustY, currentAppliedThrustX);
            const shipForwardAngle = rocket.angle - Math.PI / 2;
            const relativeThrustAngle = thrustAngle - shipForwardAngle;

            ctx.save();
            ctx.rotate(relativeThrustAngle); 

            const baseFlameLength = rocket.radius * 3.5;
            const baseFlameWidth = rocket.radius * 1.0;
            const flicker = 1.0 + Math.sin(gameTime * 50) * 0.15;
            const flameLength = baseFlameLength * displayThrustRatio * flicker;
            const flameWidth = baseFlameWidth * displayThrustRatio * flicker;
            
            const grad = ctx.createLinearGradient(0, rocket.radius * sf, 0, (rocket.radius + flameLength) * sf);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            grad.addColorStop(0.6, 'rgba(255, 215, 0, 0.7)');
            grad.addColorStop(1, 'rgba(255, 69, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, rocket.radius * 0.8 * sf);
            ctx.lineTo(-flameWidth / 2 * sf, rocket.radius * 1.2 * sf);
            ctx.lineTo(0, (rocket.radius + flameLength) * sf);
            ctx.lineTo(flameWidth / 2 * sf, rocket.radius * 1.2 * sf);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }

         ctx.fillStyle = C.ROCKET_COLOR; ctx.beginPath();
         const r = rocket.radius * sf;
         ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, r); ctx.lineTo(-r * 0.7, r);
         ctx.closePath(); ctx.fill();
         ctx.restore();
    }
}