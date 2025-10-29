// Глобальные константы игрового мира и физики
export const WORLD_WIDTH = 1000;
export const ROCKET_COLOR = '#F0F0F0';
export const PIXELS_PER_CM = 37.8;

// Константы управления и физики
export const DOUBLE_TAP_DELAY = 300;
export const MAX_DOUBLE_TAP_DISTANCE = PIXELS_PER_CM * 1.5;
export const gravityMult = 150 * 30;
export const G_REALISTIC = 8000 * gravityMult;
export const G_LINEAR = 1200 * Math.sqrt(gravityMult);
export const G_CONSTANT = 1.0 * gravityMult;
export const THRUST_FORCE = 600;
export const OUT_OF_BOUNDS_RADIUS_FACTOR = 2.8 * 1.6;
export const ROCKET_SPIN_SPEED = 2 * Math.PI;
export const ASTEROID_SPAWN_RATE = 1.5;
export const STABILIZATION_SPEED_THRESHOLD = 5.0;
export const STABILIZATION_RADIAL_THRESHOLD = 2.0;
export const POLLUTION_DECAY_RATE = 0.25;

// Константы интро
export const INTRO_DURATION = 4.5;
export const SHIP_ANIM_START = 1.0;
export const OUTLINE_ANIM_START = 3.0;

// Константы траектории
export const TRAJECTORY_SPAWN_INTERVAL = 1 / 5; 
export const TRAJECTORY_POINT_LIFETIME = 1.0;