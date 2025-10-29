// Вспомогательные ("чистые") функции

/**
 * Линейная интерполяция между двумя значениями.
 * @param {number} a - Начальное значение
 * @param {number} b - Конечное значение
 * @param {number} t - Коэффициент интерполяции (0.0 до 1.0)
 * @returns {number}
 */
export const lerp = (a, b, t) => a * (1 - t) + b * t;

/**
 * Генерирует случайное число в диапазоне.
 * @param {number} min - Минимальное значение
 * @param {number} max - Максимальное значение
 * @returns {number}
 */
export const rand = (min, max) => Math.random() * (max - min) + min;

/**
 * Рассчитывает расстояние между двумя точками.
 * @param {{x: number, y: number}} p1 - Точка 1
 * @param {{x: number, y: number}} p2 - Точка 2
 * @returns {number}
 */
export const distance = (p1, p2) => Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);

/**
 * Конвертирует HEX-цвет в RGB-объект.
 * @param {string} hex - Цвет в формате #RRGGBB
 * @returns {{r: number, g: number, b: number} | null}
 */
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

/**
 * Возвращает цвет топлива в зависимости от остатка.
 * @param {number} ratio - Остаток топлива (0.0 до 1.0)
 * @returns {string} - CSS-строка HSL
 */
export function getFuelColor(ratio) {
    const hue = ratio * 60;
    return `hsl(${hue}, 100%, 50%)`;
}