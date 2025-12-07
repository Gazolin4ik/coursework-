-- Добавление тестовых пользователей
-- Пароль для всех тестовых пользователей: password
INSERT INTO users (username, password_hash, full_name, role_id) VALUES 
    ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Админ Админов Админович', 3),
    ('teacher1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Преподаватель Преподавателев', 2),
    ('student1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Студент Студентов Студентович', 1),
    ('student2', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Иванов Иван Иванович', 1),
    ('student3', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Петров Петр Петрович', 1)
ON CONFLICT (username) DO NOTHING;

-- Добавление студентов
INSERT INTO students (full_name, group_id, user_id) VALUES 
    ('Студент Студентов Студентович', 1, 3),
    ('Иванов Иван Иванович', 2, 4),
    ('Петров Петр Петрович', 1, 5)
ON CONFLICT DO NOTHING;

-- Добавление оценок по экзаменам
INSERT INTO exam_grades (student_id, exam_id, grade) VALUES 
    (1, 1, 5), (1, 2, 4), (1, 3, 5),
    (2, 1, 3), (2, 2, 4), (2, 3, 3),
    (3, 1, 4), (3, 2, 5), (3, 3, 4)
ON CONFLICT (student_id, exam_id) DO NOTHING;

-- Добавление результатов зачетов
INSERT INTO credit_results (student_id, credit_id, is_passed) VALUES 
    (1, 1, true), (1, 2, true), (1, 3, true),
    (2, 1, false), (2, 2, true), (2, 3, false),
    (3, 1, true), (3, 2, true), (3, 3, true)
ON CONFLICT (student_id, credit_id) DO NOTHING;

-- Добавление прогнозов успеваемости
INSERT INTO performance_predictions (student_id, predicted_exam_grade, predicted_credit_pass_rate, overall_performance_score) VALUES 
    (1, 4.67, 100.00, 85.5),
    (2, 3.33, 33.33, 45.2),
    (3, 4.33, 100.00, 78.9)
ON CONFLICT DO NOTHING;
