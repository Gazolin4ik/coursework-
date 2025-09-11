const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Конфигурация подключения к базе данных
const dbConfig = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123',
    database: 'coursework_db'
};

async function setupDatabase() {
    const client = new Client(dbConfig);
    
    try {
        console.log('Подключение к базе данных PostgreSQL...');
        await client.connect();
        console.log('Успешно подключились к базе данных!');
        
        // Чтение SQL-скрипта
        const sqlScript = fs.readFileSync(path.join(__dirname, 'database_schema.sql'), 'utf8');
        
        console.log('Выполнение SQL-скрипта для создания таблиц...');
        await client.query(sqlScript);
        
        console.log('✅ База данных успешно настроена!');
        console.log('Созданы следующие таблицы:');
        console.log('- user_roles (роли пользователей)');
        console.log('- users (пользователи)');
        console.log('- groups (группы)');
        console.log('- students (студенты)');
        console.log('- exams (экзамены)');
        console.log('- credits (зачеты)');
        console.log('- exam_grades (оценки по экзаменам)');
        console.log('- credit_results (результаты зачетов)');
        console.log('- performance_predictions (прогнозы успеваемости)');
        
        // Проверка создания таблиц
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `;
        
        const tablesResult = await client.query(tablesQuery);
        console.log('\nСозданные таблицы:');
        tablesResult.rows.forEach(row => {
            console.log(`- ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Ошибка при настройке базы данных:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('Соединение с базой данных закрыто.');
    }
}

// Запуск настройки базы данных
if (require.main === module) {
    setupDatabase()
        .then(() => {
            console.log('\n🎉 Настройка базы данных завершена успешно!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Ошибка при настройке базы данных:', error);
            process.exit(1);
        });
}

module.exports = { setupDatabase, dbConfig }; 