const { Pool } = require('pg');

// Конфигурация подключения к базе данных
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123',
    database: process.env.DB_NAME || 'coursework_db',
    max: 20, // максимальное количество клиентов в пуле
    idleTimeoutMillis: 30000, // время неактивности клиента
    connectionTimeoutMillis: 2000, // время ожидания подключения
    // Принудительно использовать IPv4
    family: 4,
    // Дополнительные настройки для Docker
    ssl: false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 0
});

// Обработка событий пула
pool.on('connect', () => {
    console.log('🔌 Подключение к базе данных установлено');
});

pool.on('error', (err) => {
    console.error('❌ Ошибка подключения к базе данных:', err);
});

// Функция для выполнения запросов
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`📊 SQL запрос выполнен за ${duration}ms:`, text.substring(0, 50) + '...');
        return res;
    } catch (error) {
        console.error('❌ Ошибка SQL запроса:', error);
        throw error;
    }
};

// Функция для получения одного клиента из пула
const getClient = () => {
    return pool.connect();
};

// Функция для закрытия пула
const closePool = async () => {
    await pool.end();
    console.log('🔌 Пул подключений к базе данных закрыт');
};

module.exports = {
    query,
    getClient,
    closePool,
    pool
}; 