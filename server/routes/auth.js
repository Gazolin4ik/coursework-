const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Регистрация пользователя
router.post('/register', [
    body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('Имя пользователя должно быть от 3 до 50 символов')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Имя пользователя может содержать только буквы, цифры и подчеркивания'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Пароль должен быть не менее 6 символов'),
    body('fullName')
        .isLength({ min: 2, max: 100 })
        .withMessage('ФИО должно быть от 2 до 100 символов'),
    body('role')
        .isIn(['student', 'teacher'])
        .withMessage('Роль должна быть student или teacher')
], async (req, res) => {
    try {
        // Проверка валидации
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { username, password, fullName, role } = req.body;

        // Проверка существования пользователя
        const existingUser = await query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                error: 'User already exists',
                message: 'Пользователь с таким именем уже существует'
            });
        }

        // Хеширование пароля
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Получение ID роли
        const roleResult = await query(
            'SELECT id FROM user_roles WHERE role_name = $1',
            [role]
        );

        if (roleResult.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid role',
                message: 'Неверная роль'
            });
        }

        const roleId = roleResult.rows[0].id;

        // Создание пользователя
        const newUser = await query(
            `INSERT INTO users (username, password_hash, full_name, role_id) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, username, full_name, role_id, created_at`,
            [username, hashedPassword, fullName, roleId]
        );

        const user = newUser.rows[0];

        // Создание JWT токена
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: role,
                createdAt: user.created_at
            },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            message: 'Ошибка при регистрации'
        });
    }
});

// Вход в систему
router.post('/login', [
    body('username')
        .notEmpty()
        .withMessage('Имя пользователя обязательно'),
    body('password')
        .notEmpty()
        .withMessage('Пароль обязателен')
], async (req, res) => {
    try {
        // Проверка валидации
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { username, password } = req.body;

        // Поиск пользователя
        const userResult = await query(
            `SELECT u.id, u.username, u.password_hash, u.full_name, u.role_id, ur.role_name 
             FROM users u 
             JOIN user_roles ur ON u.role_id = ur.id 
             WHERE u.username = $1`,
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Неверное имя пользователя или пароль'
            });
        }

        const user = userResult.rows[0];

        // Проверка пароля
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Неверное имя пользователя или пароль'
            });
        }

        // Создание JWT токена
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Успешный вход в систему',
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role_name
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'Ошибка при входе в систему'
        });
    }
});

// Получение профиля пользователя
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Получение информации о пользователе
        const userResult = await query(
            `SELECT u.id, u.username, u.full_name, u.role_id, ur.role_name, u.created_at 
             FROM users u 
             JOIN user_roles ur ON u.role_id = ur.id 
             WHERE u.id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'Пользователь не найден'
            });
        }

        const user = userResult.rows[0];

        // Если пользователь - студент, получаем дополнительную информацию
        let studentInfo = null;
        if (user.role_name === 'student') {
            const studentResult = await query(
                `SELECT s.id, s.full_name, g.group_name 
                 FROM students s 
                 JOIN groups g ON s.group_id = g.id 
                 WHERE s.user_id = $1`,
                [userId]
            );

            if (studentResult.rows.length > 0) {
                studentInfo = studentResult.rows[0];
            } else {
                // Резервный поиск по полному имени, если привязки по user_id нет
                const fallbackResult = await query(
                    `SELECT s.id, s.full_name, g.group_name, s.user_id
                     FROM students s
                     JOIN groups g ON s.group_id = g.id
                     WHERE s.full_name = $1
                     ORDER BY s.id ASC
                     LIMIT 1`,
                    [user.full_name]
                );

                if (fallbackResult.rows.length > 0) {
                    const found = fallbackResult.rows[0];
                    studentInfo = { id: found.id, full_name: found.full_name, group_name: found.group_name };

                    // Автопривязка, если не было user_id
                    if (!found.user_id) {
                        await query(
                            `UPDATE students SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                            [userId, found.id]
                        );
                    }
                }
            }
        }

        res.json({
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role_name,
                createdAt: user.created_at,
                studentInfo
            }
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            error: 'Profile retrieval failed',
            message: 'Ошибка при получении профиля'
        });
    }
});

// Обновление профиля пользователя
router.put('/profile', authenticateToken, [
    body('fullName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('ФИО должно быть от 2 до 100 символов'),
    body('currentPassword')
        .optional()
        .notEmpty()
        .withMessage('Текущий пароль обязателен для изменения пароля'),
    body('newPassword')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Новый пароль должен быть не менее 6 символов')
], async (req, res) => {
    try {
        // Проверка валидации
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const userId = req.user.id;
        const { fullName, currentPassword, newPassword } = req.body;

        // Получение текущего пользователя
        const userResult = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'Пользователь не найден'
            });
        }

        const user = userResult.rows[0];

        // Если изменяется пароль, проверяем текущий
        if (newPassword && currentPassword) {
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    error: 'Invalid current password',
                    message: 'Неверный текущий пароль'
                });
            }
        }

        // Подготовка данных для обновления
        let updateFields = [];
        let updateValues = [];
        let valueIndex = 1;

        if (fullName) {
            updateFields.push(`full_name = $${valueIndex++}`);
            updateValues.push(fullName);
        }

        if (newPassword) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            updateFields.push(`password_hash = $${valueIndex++}`);
            updateValues.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                message: 'Нет полей для обновления'
            });
        }

        updateValues.push(userId);

        // Обновление пользователя
        const updateResult = await query(
            `UPDATE users 
             SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $${valueIndex} 
             RETURNING id, username, full_name, updated_at`,
            updateValues
        );

        res.json({
            message: 'Профиль успешно обновлен',
            user: {
                id: updateResult.rows[0].id,
                username: updateResult.rows[0].username,
                fullName: updateResult.rows[0].full_name,
                updatedAt: updateResult.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            error: 'Profile update failed',
            message: 'Ошибка при обновлении профиля'
        });
    }
});

module.exports = router; 