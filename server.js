const express = require('express');
require('dotenv').config();

const authRoutes = require('./server/routes/auth');
const studentRoutes = require('./server/routes/students');
const gradeRoutes = require('./server/routes/grades');
const predictionRoutes = require('./server/routes/predictions');
const adminRoutes = require('./server/routes/admin');
const groupsRoutes = require('./server/routes/groups');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - ПЕРВЫЙ MIDDLEWARE!
app.use((req, res, next) => {
    console.log(`🔥 CORS: ${req.method} ${req.path} from ${req.get('Origin')}`);
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        console.log('🔥 CORS: Handling OPTIONS');
        return res.sendStatus(200);
    }
    next();
});

// Middleware безопасности (временно отключен для отладки CORS)
// app.use(helmet());

// Ограничение запросов (временно отключено для отладки CORS)
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 минут
//     max: 100 // максимум 100 запросов с одного IP
// });
// app.use('/api/', limiter);

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupsRoutes);

// Проверка здоровья сервера
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Обработка ошибок 404
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.path 
    });
});

// Глобальная обработка ошибок
app.use((error, req, res, next) => {
    console.error('Error:', error);
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({ 
            error: 'Validation Error', 
            details: error.message 
        });
    }
    
    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({ 
            error: 'Unauthorized' 
        });
    }
    
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API доступен по адресу: http://localhost:${PORT}/api`);
});

module.exports = app; 