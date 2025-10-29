// Этот файл хранит конфигурации для всех уровней в игре.
// Я разделил конфиг на секции, как ты и просил,
// добавив "meta" для карты мира и "gameplay" для логики уровня.

export const levels = [
    {
        // --- МЕТА-ДАННЫЕ (для карты мира, выбора уровня, авто-подбора) ---
        id: 1,
        title: "Спокойный Пояс", // (Новое поле) Название для UI
        description: "Тихий сектор, идеален для тренировки.", // (Новое поле) Описание для UI
        difficulty: 1, // (Новое поле) Для системы авто-подбора
        mapCoordinates: { x: 10, y: 15 }, // (Новое поле) Для будущей карты мира
        
        // --- ВНУТРИИГРОВЫЕ ДАННЫЕ (используются при запуске уровня) ---
        gameplay: {
            globalPollution: 0,
            planetConfigs: [ { x: 0.5, y: 0.5, radiusFactor: 0.1, gravityFactor: 1.0, color: '#4A4E69' } ],
            asteroidSpawnSectors: [ { start: -160, end: -20 }, { start: 110, end: 250 } ]
        },
        
        // --- ВИЗУАЛЬНЫЕ ДАННЫЕ (для рендеринга уровня и UI) ---
        theme: {
            backgroundColor: '#0D0F1A',
            fogColor: '#08090F',
            buttonColor: '#4A4E69', // Используется в меню выбора уровня
            outlineColor: 'rgba(0, 162, 255, 0.2)',
            asteroidColor: '#525f7f',
            gravityWellColor: 'rgba(80, 100, 150, 0.0175)'
        }
    },
    {
        // --- МЕТА-ДАННЫЕ ---
        id: 2,
        title: "Двойная Проблема",
        description: "Две планеты создают сложные гравитационные поля.",
        difficulty: 3,
        mapCoordinates: { x: 12, y: 18 },
        
        // --- ВНУТРИИГРОВЫЕ ДАННЫЕ ---
        gameplay: {
            globalPollution: 0,
            planetConfigs: [
                { x: 0.5, y: 0.40, radiusFactor: 0.1, gravityFactor: 1.0, color: '#4A694E' },
                { x: 0.4, y: 1.0, radiusFactor: 0.075, gravityFactor: 0.75, color: '#3A593E' }
            ],
            asteroidSpawnSectors: [ { start: -170, end: 10 }, { start: 100, end: 170 } ]
        },
        
        // --- ВИЗУАЛЬНЫЕ ДАННЫЕ ---
        theme: {
            backgroundColor: '#0D1A0F',
            fogColor: '#080F09',
            buttonColor: '#3A593E',
            outlineColor: 'rgba(144, 238, 144, 0.3)',
            asteroidColor: '#586454',
            gravityWellColor: 'rgba(144, 238, 144, 0.0125)'
        }
    },
    {
        // --- МЕТА-ДАННЫЕ ---
        id: 3,
        title: "Пыльное Облако",
        description: "Плохая видимость и высокая концентрация пыли.",
        difficulty: 5,
        mapCoordinates: { x: 15, y: 12 },

        // --- ВНУТРИИГРОВЫЕ ДАННЫЕ ---
        gameplay: {
            globalPollution: 0.4,
            planetConfigs: [ { x: 0.5, y: 0.5, radiusFactor: 0.1, gravityFactor: 1.0, color: '#4E3A59' } ],
            asteroidSpawnSectors: [ { start: -160, end: -20 }, { start: 110, end: 250 } ]
        },

        // --- ВИЗУАЛЬНЫЕ ДАННЫЕ ---
        theme: {
            backgroundColor: '#1A0D1A',
            fogColor: '#0F080F',
            buttonColor: '#4E3A59',
            outlineColor: 'rgba(221, 160, 221, 0.3)',
            asteroidColor: '#645464',
            gravityWellColor: 'rgba(221, 160, 221, 0.0125)'
        }
    },
    {
        // --- МЕТА-ДАННЫЕ ---
        id: 4,
        title: "Красный Гигант",
        description: "Высокая температура и сильное загрязнение.",
        difficulty: 7,
        mapCoordinates: { x: 18, y: 20 },

        // --- ВНУТРИИГРОВЫЕ ДАННЫЕ ---
        gameplay: {
            globalPollution: 1.0,
            planetConfigs: [ { x: 0.5, y: 0.5, radiusFactor: 0.1, gravityFactor: 1.0, color: '#59423A' } ],
            asteroidSpawnSectors: [ { start: -160, end: -20 }, { start: 110, end: 250 } ]
        },

        // --- ВИЗУАЛЬНЫЕ ДАННЫЕ ---
        theme: {
            backgroundColor: '#1A120D',
            fogColor: '#0F0B08',
            buttonColor: '#59423A',
            outlineColor: 'rgba(255, 140, 0, 0.3)',
            asteroidColor: '#645A54',
            gravityWellColor: 'rgba(255, 140, 0, 0.0125)'
        }
    }
];

export const lootTypes = {
    small: { radius: 16, magneticRadius: 120, color: '#FFD700', value: 1 },
    medium: { radius: 24, magneticRadius: 160, color: '#FFA500', value: 3 },
    large: { radius: 32, magneticRadius: 200, color: '#FF4500', value: 5 }
};