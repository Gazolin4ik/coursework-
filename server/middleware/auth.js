const jwt = require('jsonwebtoken');
const { query } = require('../utils/database');

// Middleware для проверки JWT токена
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            message: 'Требуется токен доступа' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
        
        // Получаем информацию о пользователе из базы данных
        const userResult = await query(
            `SELECT u.id, u.username, u.full_name, u.role_id, ur.role_name 
             FROM users u 
             JOIN user_roles ur ON u.role_id = ur.id 
             WHERE u.id = $1`,
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Invalid token',
                message: 'Недействительный токен' 
            });
        }

        req.user = userResult.rows[0];
        next();
    } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(403).json({ 
            error: 'Invalid token',
            message: 'Недействительный токен' 
        });
    }
};

// Middleware для проверки роли преподавателя
const requireTeacher = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Требуется аутентификация' 
        });
    }

    if (req.user.role_name !== 'teacher') {
        return res.status(403).json({ 
            error: 'Teacher access required',
            message: 'Доступ только для преподавателей' 
        });
    }

    next();
};

// Middleware для проверки роли студента
const requireStudent = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Требуется аутентификация' 
        });
    }

    if (req.user.role_name !== 'student') {
        return res.status(403).json({ 
            error: 'Student access required',
            message: 'Доступ только для студентов' 
        });
    }

    next();
};

// Middleware для проверки роли администратора
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Требуется аутентификация' 
        });
    }

    if (req.user.role_name !== 'admin') {
        return res.status(403).json({ 
            error: 'Admin access required',
            message: 'Доступ только для администраторов' 
        });
    }

    next();
};

// Middleware для проверки, что пользователь может просматривать данные студента
const canViewStudent = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Требуется аутентификация' 
        });
    }

    const studentId = req.params.id || req.params.studentId;

    if (!studentId) {
        return res.status(400).json({ 
            error: 'Student ID required',
            message: 'Требуется ID студента' 
        });
    }

    // Преподаватели могут просматривать всех студентов
    if (req.user.role_name === 'teacher') {
        return next();
    }

    // Студенты могут просматривать только свои данные
    if (req.user.role_name === 'student') {
        const studentResult = await query(
            'SELECT id FROM students WHERE user_id = $1',
            [req.user.id]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Student not found',
                message: 'Студент не найден' 
            });
        }

        const studentUserId = studentResult.rows[0].id;
        
        if (parseInt(studentId) !== studentUserId) {
            return res.status(403).json({ 
                error: 'Access denied',
                message: 'Доступ запрещен' 
            });
        }
    }

    next();
};

module.exports = {
    authenticateToken,
    requireTeacher,
    requireStudent,
    requireAdmin,
    canViewStudent
}; 