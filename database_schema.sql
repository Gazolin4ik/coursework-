-- Создание базы данных (если не существует)
-- CREATE DATABASE coursework_db;

-- Подключение к базе данных
-- \c coursework_db;

-- Создание таблицы ролей пользователей
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES user_roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы групп
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы студентов
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    group_id INTEGER REFERENCES groups(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы преподавателей
CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы экзаменов
CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    exam_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы зачетов
CREATE TABLE IF NOT EXISTS credits (
    id SERIAL PRIMARY KEY,
    credit_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы оценок по экзаменам
CREATE TABLE IF NOT EXISTS exam_grades (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    exam_id INTEGER REFERENCES exams(id),
    grade INTEGER CHECK (grade >= 2 AND grade <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, exam_id)
);

-- Создание таблицы результатов зачетов
CREATE TABLE IF NOT EXISTS credit_results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    credit_id INTEGER REFERENCES credits(id),
    is_passed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, credit_id)
);

-- Создание таблицы прогнозов успеваемости
CREATE TABLE IF NOT EXISTS performance_predictions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    predicted_exam_grade DECIMAL(3,2),
    predicted_credit_pass_rate DECIMAL(5,2),
    overall_performance_score DECIMAL(5,2),
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы связи преподаватель-экзамен
CREATE TABLE IF NOT EXISTS teacher_exams (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id),
    exam_id INTEGER REFERENCES exams(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, exam_id)
);

-- Создание таблицы связи преподаватель-зачет
CREATE TABLE IF NOT EXISTS teacher_credits (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id),
    credit_id INTEGER REFERENCES credits(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, credit_id)
);

-- Создание таблицы связи преподаватель-группа
CREATE TABLE IF NOT EXISTS teacher_groups (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id),
    group_id INTEGER REFERENCES groups(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, group_id)
);

-- Добавление поля teacher_id в exam_grades для отслеживания, кто поставил оценку
ALTER TABLE exam_grades ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id);

-- Добавление поля teacher_id в credit_results для отслеживания, кто поставил оценку
ALTER TABLE credit_results ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id);

-- Вставка начальных данных для ролей
INSERT INTO user_roles (role_name) VALUES 
    ('student'),
    ('teacher'),
    ('admin')
ON CONFLICT (role_name) DO NOTHING;

-- Вставка групп
INSERT INTO groups (group_name) VALUES 
    ('АБс-322'),
    ('АБс-323'),
    ('АБс-324'),
    ('АБ-321'),
    ('АБ-322')
ON CONFLICT (group_name) DO NOTHING;

-- Вставка экзаменов
INSERT INTO exams (exam_name) VALUES 
    ('программирование'),
    ('схемотехника'),
    ('безопасность операционных систем'),
    ('математическая логика'),
    ('математический анализ')
ON CONFLICT (exam_name) DO NOTHING;

-- Вставка зачетов
INSERT INTO credits (credit_name) VALUES 
    ('философия'),
    ('правоведение'),
    ('основы информационной безопасности'),
    ('теория вероятности'),
    ('дискретная математика')
ON CONFLICT (credit_name) DO NOTHING;

-- Создание индексов для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_students_group_id ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_grades_student_id ON exam_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_grades_exam_id ON exam_grades(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_grades_teacher_id ON exam_grades(teacher_id);
CREATE INDEX IF NOT EXISTS idx_credit_results_student_id ON credit_results(student_id);
CREATE INDEX IF NOT EXISTS idx_credit_results_credit_id ON credit_results(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_results_teacher_id ON credit_results(teacher_id);
CREATE INDEX IF NOT EXISTS idx_performance_predictions_student_id ON performance_predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_exams_teacher_id ON teacher_exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_exams_exam_id ON teacher_exams(exam_id);
CREATE INDEX IF NOT EXISTS idx_teacher_credits_teacher_id ON teacher_credits(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_credits_credit_id ON teacher_credits(credit_id);
CREATE INDEX IF NOT EXISTS idx_teacher_groups_teacher_id ON teacher_groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_groups_group_id ON teacher_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

-- Создание представления для удобного просмотра данных студентов
CREATE OR REPLACE VIEW student_performance_view AS
SELECT 
    s.id as student_id,
    s.full_name,
    g.group_name,
    e.exam_name,
    eg.grade as exam_grade,
    c.credit_name,
    cr.is_passed as credit_passed
FROM students s
JOIN groups g ON s.group_id = g.id
LEFT JOIN exam_grades eg ON s.id = eg.student_id
LEFT JOIN exams e ON eg.exam_id = e.id
LEFT JOIN credit_results cr ON s.id = cr.student_id
LEFT JOIN credits c ON cr.credit_id = c.id;

-- Создание функции для обновления времени изменения
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_grades_updated_at BEFORE UPDATE ON exam_grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_results_updated_at BEFORE UPDATE ON credit_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 