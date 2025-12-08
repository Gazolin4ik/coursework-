const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Конфигурация подключения к базе данных
// Для Docker: используйте DB_PORT=5433 (порт проброшен в docker-compose.yml)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123',
    database: process.env.DB_NAME || 'coursework_db'
};

// Вывод информации о подключении (для отладки)
if (process.env.NODE_ENV !== 'production') {
    console.log('📡 Параметры подключения к БД:');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}\n`);
}

// Реалистичные русские имена и фамилии
const firstNames = [
    'Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Артем', 'Илья',
    'Кирилл', 'Михаил', 'Никита', 'Матвей', 'Роман', 'Егор', 'Арсений', 'Иван',
    'Денис', 'Евгений', 'Данил', 'Тимур', 'Владислав', 'Игорь', 'Владимир', 'Павел',
    'Руслан', 'Марк', 'Лев', 'Анна', 'Мария', 'Елена', 'Ольга', 'Татьяна',
    'Наталья', 'Ирина', 'Светлана', 'Екатерина', 'Надежда', 'Юлия', 'Анастасия', 'Дарья',
    'Валентина', 'Галина', 'Людмила', 'Лариса', 'Анжела', 'Виктория', 'Евгения', 'Ксения'
];

const lastNames = [
    'Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов', 'Попов', 'Соколов', 'Лебедев',
    'Козлов', 'Новikov', 'Морозов', 'Петров', 'Волков', 'Соловьев', 'Васильев', 'Зайцев',
    'Павлов', 'Семенов', 'Голубев', 'Виноградов', 'Богданов', 'Воробьев', 'Федоров', 'Михайлов',
    'Белов', 'Тарасов', 'Беляев', 'Комаров', 'Орлов', 'Киселев', 'Макаров', 'Андреев',
    'Ковалев', 'Ильин', 'Гусев', 'Титов', 'Кузьмин', 'Кудрявцев', 'Баранов', 'Куликов',
    'Алексеев', 'Степанов', 'Яковлев', 'Сорокин', 'Сергеев', 'Романов', 'Захаров', 'Борисов'
];

const middleNames = [
    'Александрович', 'Дмитриевич', 'Максимович', 'Сергеевич', 'Андреевич', 'Алексеевич',
    'Артемович', 'Ильич', 'Кириллович', 'Михайлович', 'Никитич', 'Матвеевич', 'Романович',
    'Егорович', 'Арсеньевич', 'Иванович', 'Денисович', 'Евгеньевич', 'Данилович', 'Тимурович',
    'Владиславович', 'Игоревич', 'Владимирович', 'Павлович', 'Русланович', 'Маркович',
    'Львович', 'Александровна', 'Дмитриевна', 'Максимовна', 'Сергеевна', 'Андреевна',
    'Алексеевна', 'Артемовна', 'Ильинична', 'Кирилловна', 'Михайловна', 'Никитична',
    'Матвеевна', 'Романовна', 'Егоровна', 'Арсеньевна', 'Ивановна', 'Денисовна',
    'Евгеньевна', 'Даниловна', 'Тимуровна', 'Владиславовна', 'Игоревна', 'Владимировна',
    'Павловна', 'Руслановна', 'Марковна', 'Львовна'
];

// Функция для получения случайного элемента из массива
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Функция для генерации случайного ФИО
function generateFullName() {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    
    // Определяем отчество в зависимости от пола имени
    const isFemale = ['Анна', 'Мария', 'Елена', 'Ольга', 'Татьяна', 'Наталья', 'Ирина',
        'Светлана', 'Екатерина', 'Надежда', 'Юлия', 'Анастасия', 'Дарья', 'Валентина',
        'Галина', 'Людмила', 'Лариса', 'Анжела', 'Виктория', 'Евгения', 'Ксения'].includes(firstName);
    
    const middleName = isFemale 
        ? getRandomElement(middleNames.filter(m => m.endsWith('на')))
        : getRandomElement(middleNames.filter(m => m.endsWith('ч')));
    
    return `${lastName} ${firstName} ${middleName}`;
}

// Функция для транслитерации русских букв в латиницу
function transliterate(text) {
    const translitMap = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    
    return text.toLowerCase()
        .split('')
        .map(char => translitMap[char] || char)
        .join('')
        .replace(/[^a-z0-9]/g, '');
}

// Функция для генерации username
function generateUsername(fullName, index) {
    const parts = fullName.toLowerCase().split(' ');
    const lastName = transliterate(parts[0]);
    const firstName = transliterate(parts[1]);
    return `${lastName}_${firstName}${index > 0 ? index : ''}`;
}

// Функция для получения случайной оценки (2-5)
function getRandomGrade() {
    const grades = [2, 3, 4, 5];
    // Больше вероятность получить 3, 4, 5
    const weights = [0.1, 0.2, 0.4, 0.3];
    const random = Math.random();
    let sum = 0;
    for (let i = 0; i < grades.length; i++) {
        sum += weights[i];
        if (random <= sum) {
            return grades[i];
        }
    }
    return 4;
}

// Функция для получения случайного булевого значения с вероятностью
function getRandomBoolean(probability = 0.8) {
    return Math.random() < probability;
}

async function generateRealisticData() {
    const client = new Client(dbConfig);
    
    try {
        console.log('🔌 Подключение к базе данных...');
        if (process.env.NODE_ENV !== 'production') {
            console.log(`   Host: ${dbConfig.host}, Port: ${dbConfig.port}, Database: ${dbConfig.database}`);
        }
        await client.connect();
        console.log('✅ Подключено успешно!\n');

        // Начинаем транзакцию
        await client.query('BEGIN');

        // 1. Очистка существующих данных (важен порядок из-за внешних ключей)
        console.log('🧹 Очистка существующих данных...');
        // Сначала удаляем зависимые таблицы
        await client.query('DELETE FROM performance_predictions');
        await client.query('DELETE FROM exam_grades');
        await client.query('DELETE FROM credit_results');
        await client.query('DELETE FROM teacher_exams');
        await client.query('DELETE FROM teacher_credits');
        await client.query('DELETE FROM teacher_groups');
        // Потом основные таблицы
        await client.query('DELETE FROM students');
        await client.query('DELETE FROM teachers');
        await client.query('DELETE FROM users WHERE role_id IN (1, 2)'); // Удаляем студентов и преподавателей, но не админов
        console.log('✅ Данные очищены\n');

        // 2. Получение справочных данных
        console.log('📚 Получение справочных данных...');
        const groupsResult = await client.query('SELECT id, group_name FROM groups ORDER BY id');
        const examsResult = await client.query('SELECT id, exam_name FROM exams ORDER BY id');
        const creditsResult = await client.query('SELECT id, credit_name FROM credits ORDER BY id');
        const studentRoleResult = await client.query("SELECT id FROM user_roles WHERE role_name = 'student'");
        const teacherRoleResult = await client.query("SELECT id FROM user_roles WHERE role_name = 'teacher'");

        const groups = groupsResult.rows;
        const exams = examsResult.rows;
        const credits = creditsResult.rows;
        const studentRoleId = studentRoleResult.rows[0].id;
        const teacherRoleId = teacherRoleResult.rows[0].id;
        const adminRoleResult = await client.query("SELECT id FROM user_roles WHERE role_name = 'admin'");
        const adminRoleId = adminRoleResult.rows[0].id;

        console.log(`   Групп: ${groups.length}`);
        console.log(`   Экзаменов: ${exams.length}`);
        console.log(`   Зачетов: ${credits.length}\n`);

        // 2.5. Создание администратора (если не существует)
        console.log('👑 Создание администратора...');
        const adminCheck = await client.query("SELECT id FROM users WHERE username = 'admin'");
        
        if (adminCheck.rows.length === 0) {
            const adminPasswordHash = await bcrypt.hash('admin123', 10);
            const adminFullName = 'Администратор Системы';
            
            await client.query(
                `INSERT INTO users (username, password_hash, full_name, role_id) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id`,
                ['admin', adminPasswordHash, adminFullName, adminRoleId]
            );
            console.log('   ✅ Администратор создан');
            console.log('   📋 Username: admin');
            console.log('   🔑 Password: admin123\n');
        } else {
            console.log('   ℹ️  Администратор уже существует\n');
        }

        // 3. Создание студентов (10 на каждую группу)
        console.log('👨‍🎓 Создание студентов...');
        const passwordHash = await bcrypt.hash('student123', 10);
        const students = [];
        let studentUserIndex = 0;

        for (const group of groups) {
            for (let i = 0; i < 10; i++) {
                const fullName = generateFullName();
                let username = generateUsername(fullName, 0);
                
                // Проверка уникальности username
                let usernameCheck = await client.query('SELECT id FROM users WHERE username = $1', [username]);
                let counter = 1;
                while (usernameCheck.rows.length > 0) {
                    username = generateUsername(fullName, counter);
                    usernameCheck = await client.query('SELECT id FROM users WHERE username = $1', [username]);
                    counter++;
                }

                // Создание пользователя
                const userResult = await client.query(
                    `INSERT INTO users (username, password_hash, full_name, role_id) 
                     VALUES ($1, $2, $3, $4) 
                     RETURNING id`,
                    [username, passwordHash, fullName, studentRoleId]
                );
                const userId = userResult.rows[0].id;

                // Создание студента
                const studentResult = await client.query(
                    `INSERT INTO students (full_name, group_id, user_id) 
                     VALUES ($1, $2, $3) 
                     RETURNING id`,
                    [fullName, group.id, userId]
                );
                students.push({
                    id: studentResult.rows[0].id,
                    userId: userId,
                    groupId: group.id,
                    fullName: fullName
                });
                studentUserIndex++;
            }
            console.log(`   ✅ Группа ${group.group_name}: 10 студентов создано`);
        }
        console.log(`✅ Всего студентов создано: ${students.length}\n`);

        // 4. Создание преподавателей (10 штук)
        console.log('👨‍🏫 Создание преподавателей...');
        const teacherPasswordHash = await bcrypt.hash('teacher123', 10);
        const teachers = [];
        const allDisciplines = [...exams, ...credits]; // Все дисциплины (экзамены + зачеты)

        for (let i = 0; i < 10; i++) {
            const fullName = generateFullName();
            let username = generateUsername(fullName, 0);
            
            // Проверка уникальности username
            let usernameCheck = await client.query('SELECT id FROM users WHERE username = $1', [username]);
            let counter = 1;
            while (usernameCheck.rows.length > 0) {
                username = generateUsername(fullName, counter);
                usernameCheck = await client.query('SELECT id FROM users WHERE username = $1', [username]);
                counter++;
            }

            // Создание пользователя
            const userResult = await client.query(
                `INSERT INTO users (username, password_hash, full_name, role_id) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id`,
                [username, teacherPasswordHash, fullName, teacherRoleId]
            );
            const userId = userResult.rows[0].id;

            // Создание преподавателя
            const teacherResult = await client.query(
                `INSERT INTO teachers (full_name, user_id) 
                 VALUES ($1, $2) 
                 RETURNING id`,
                [fullName, userId]
            );
            const teacherId = teacherResult.rows[0].id;

            // Для первых 5 преподавателей прикрепляем зачеты (каждому свой)
            if (i < 5 && credits.length > i) {
                const credit = credits[i];
                await client.query(
                    'INSERT INTO teacher_credits (teacher_id, credit_id) VALUES ($1, $2)',
                    [teacherId, credit.id]
                );
                console.log(`   ✅ ${fullName} - зачет: ${credit.credit_name}`);
            } else {
                // Для остальных преподавателей прикрепляем дисциплины как раньше
                const discipline = allDisciplines[i % allDisciplines.length];
                if (exams.find(e => e.id === discipline.id)) {
                    // Это экзамен
                    await client.query(
                        'INSERT INTO teacher_exams (teacher_id, exam_id) VALUES ($1, $2)',
                        [teacherId, discipline.id]
                    );
                } else {
                    // Это зачет
                    await client.query(
                        'INSERT INTO teacher_credits (teacher_id, credit_id) VALUES ($1, $2)',
                        [teacherId, discipline.id]
                    );
                }
                const disciplineName = discipline.exam_name || discipline.credit_name;
                console.log(`   ✅ ${fullName} - ${disciplineName}`);
            }

            // Прикрепление всех групп к преподавателю
            for (const group of groups) {
                await client.query(
                    'INSERT INTO teacher_groups (teacher_id, group_id) VALUES ($1, $2)',
                    [teacherId, group.id]
                );
            }

            // Сохраняем информацию о преподавателе
            const discipline = i < 5 && credits.length > i 
                ? credits[i] 
                : allDisciplines[i % allDisciplines.length];
            const disciplineName = discipline.exam_name || discipline.credit_name;
            teachers.push({
                id: teacherId,
                userId: userId,
                fullName: fullName,
                disciplineId: discipline.id,
                disciplineType: exams.find(e => e.id === discipline.id) ? 'exam' : 'credit',
                disciplineName: disciplineName
            });
        }
        console.log(`✅ Всего преподавателей создано: ${teachers.length}\n`);

        // 5. Проставление случайных оценок
        console.log('📝 Проставление оценок...');
        let gradesCount = 0;
        let creditsCount = 0;

        for (const student of students) {
            // Оценки по экзаменам (не все экзамены, случайно)
            for (const exam of exams) {
                if (Math.random() > 0.3) { // 70% вероятность получить оценку
                    const grade = getRandomGrade();
                    
                    // Находим преподавателя, который ведет этот экзамен
                    const teacherResult = await client.query(
                        `SELECT t.id FROM teachers t 
                         JOIN teacher_exams te ON t.id = te.teacher_id 
                         WHERE te.exam_id = $1 
                         ORDER BY RANDOM() 
                         LIMIT 1`,
                        [exam.id]
                    );
                    
                    if (teacherResult.rows.length > 0) {
                        const teacherId = teacherResult.rows[0].id;
                        await client.query(
                            `INSERT INTO exam_grades (student_id, exam_id, grade, teacher_id) 
                             VALUES ($1, $2, $3, $4)`,
                            [student.id, exam.id, grade, teacherId]
                        );
                        gradesCount++;
                    }
                }
            }

            // Результаты зачетов (проставляем для всех студентов)
            for (const credit of credits) {
                // Увеличиваем вероятность проставления зачета до 90%
                if (Math.random() > 0.1) {
                    const isPassed = getRandomBoolean(0.85); // 85% вероятность сдать
                    
                    // Находим преподавателя, который ведет этот зачет
                    const teacherResult = await client.query(
                        `SELECT t.id FROM teachers t 
                         JOIN teacher_credits tc ON t.id = tc.teacher_id 
                         WHERE tc.credit_id = $1 
                         LIMIT 1`,
                        [credit.id]
                    );
                    
                    if (teacherResult.rows.length > 0) {
                        const teacherId = teacherResult.rows[0].id;
                        // Получаем user_id преподавателя для teacher_id в credit_results
                        const teacherUserResult = await client.query(
                            'SELECT user_id FROM teachers WHERE id = $1',
                            [teacherId]
                        );
                        const teacherUserId = teacherUserResult.rows[0]?.user_id;
                        
                        await client.query(
                            `INSERT INTO credit_results (student_id, credit_id, is_passed, teacher_id) 
                             VALUES ($1, $2, $3, $4)`,
                            [student.id, credit.id, isPassed, teacherUserId || teacherId]
                        );
                        creditsCount++;
                    }
                }
            }
        }
        console.log(`✅ Оценок по экзаменам проставлено: ${gradesCount}`);
        console.log(`✅ Результатов зачетов проставлено: ${creditsCount}\n`);

        // 6. Расчет прогнозов для всех студентов
        console.log('📊 Расчет прогнозов успеваемости...');
        for (const student of students) {
            // Получение оценок по экзаменам
            const examGradesResult = await client.query(
                'SELECT grade FROM exam_grades WHERE student_id = $1',
                [student.id]
            );

            // Получение результатов зачетов
            const creditResultsResult = await client.query(
                'SELECT is_passed FROM credit_results WHERE student_id = $1',
                [student.id]
            );

            if (examGradesResult.rows.length === 0 && creditResultsResult.rows.length === 0) {
                continue; // Пропускаем если нет данных
            }

            let predictedExamGrade = null;
            let predictedCreditPassRate = null;
            let overallPerformanceScore = null;

            // Расчет средней оценки по экзаменам
            if (examGradesResult.rows.length > 0) {
                const totalGrade = examGradesResult.rows.reduce((sum, row) => sum + row.grade, 0);
                predictedExamGrade = parseFloat((totalGrade / examGradesResult.rows.length).toFixed(2));
            }

            // Расчет процента сданных зачетов
            if (creditResultsResult.rows.length > 0) {
                const passedCredits = creditResultsResult.rows.filter(row => row.is_passed).length;
                predictedCreditPassRate = parseFloat(((passedCredits / creditResultsResult.rows.length) * 100).toFixed(2));
            }

            // Расчет общего показателя успеваемости
            if (predictedExamGrade !== null && predictedCreditPassRate !== null) {
                const examWeight = 0.7;
                const creditWeight = 0.3;
                const normalizedExamScore = ((predictedExamGrade - 2) / 3) * 100;
                overallPerformanceScore = parseFloat(
                    (normalizedExamScore * examWeight + predictedCreditPassRate * creditWeight).toFixed(2)
                );
            } else if (predictedExamGrade !== null) {
                const normalizedExamScore = ((predictedExamGrade - 2) / 3) * 100;
                overallPerformanceScore = parseFloat(normalizedExamScore.toFixed(2));
            } else if (predictedCreditPassRate !== null) {
                overallPerformanceScore = predictedCreditPassRate;
            }

            if (overallPerformanceScore !== null) {
                await client.query(
                    `INSERT INTO performance_predictions 
                     (student_id, predicted_exam_grade, predicted_credit_pass_rate, overall_performance_score) 
                     VALUES ($1, $2, $3, $4)`,
                    [student.id, predictedExamGrade, predictedCreditPassRate, overallPerformanceScore]
                );
            }
        }
        console.log('✅ Прогнозы рассчитаны\n');

        // Коммитим транзакцию
        await client.query('COMMIT');
        console.log('🎉 Все данные успешно созданы!');
        console.log('\n📋 Итоговая статистика:');
        console.log(`   👨‍🎓 Студентов: ${students.length} (по 10 на каждую группу)`);
        console.log(`   👨‍🏫 Преподавателей: ${teachers.length}`);
        console.log(`   📝 Оценок по экзаменам: ${gradesCount}`);
        console.log(`   ✅ Результатов зачетов: ${creditsCount}`);
        console.log('\n🔑 Пароли по умолчанию:');
        console.log('   Администратор: admin123 (username: admin)');
        console.log('   Студенты: student123');
        console.log('   Преподаватели: teacher123');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка при создании данных:', error);
        throw error;
    } finally {
        await client.end();
        console.log('\n🔌 Соединение с базой данных закрыто.');
    }
}

// Запуск скрипта
if (require.main === module) {
    generateRealisticData()
        .then(() => {
            console.log('\n✅ Скрипт выполнен успешно!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Ошибка выполнения скрипта:', error);
            process.exit(1);
        });
}

module.exports = { generateRealisticData };

