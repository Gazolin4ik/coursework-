# Веб-приложение для прогнозирования успеваемости студентов

Веб-приложение на React с Node.js и PostgreSQL для прогнозирования успеваемости студентов.

## Функциональность

- **Авторизация пользователей** с ролями "студент" и "преподаватель"
- **Управление данными студентов** (группы, ФИО, оценки)
- **Прогнозирование успеваемости** на основе исторических данных
- **Разграничение доступа**: преподаватели могут добавлять данные, студенты только просматривать прогнозы

## Структура базы данных

### Таблицы:
- `user_roles` - роли пользователей (студент/преподаватель)
- `users` - пользователи системы
- `groups` - группы студентов
- `students` - информация о студентах
- `exams` - экзамены
- `credits` - зачеты
- `exam_grades` - оценки по экзаменам
- `credit_results` - результаты зачетов
- `performance_predictions` - прогнозы успеваемости

### Предметы:
**Экзамены:**
- Программирование
- Схемотехника
- Безопасность операционных систем
- Математическая логика
- Математический анализ

**Зачеты:**
- Философия
- Правоведение
- Основы информационной безопасности
- Теория вероятности
- Дискретная математика

**Группы:**
- АБс-322
- АБс-323
- АБс-324
- АБ-321
- АБ-322

## Установка и настройка

### Предварительные требования

1. **Node.js** (версия 14 или выше)
2. **PostgreSQL** (версия 12 или выше)
3. **pgAdmin4** (для управления базой данных)

### Шаг 1: Клонирование репозитория

```bash
git clone <repository-url>
cd student-performance-prediction
```

### Шаг 2: Установка зависимостей

```bash
# Установка серверных зависимостей
npm install

# Установка клиентских зависимостей
npm run install-client
```

### Шаг 3: Настройка базы данных

1. **Создайте базу данных в PostgreSQL:**
   ```sql
   CREATE DATABASE coursework_db;
   ```

2. **Настройте подключение в pgAdmin4:**
   - Server name: coursework
   - Host name: localhost
   - Port: 5432
   - Username: postgres
   - Password: 123
   - Database: coursework_db

3. **Запустите скрипт создания таблиц:**
   ```bash
   npm run setup-db
   ```

### Шаг 4: Настройка переменных окружения

Создайте файл `.env` в корневой директории:

```env
# База данных
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123
DB_NAME=coursework_db

# JWT секрет
JWT_SECRET=your-super-secret-jwt-key

# Порт сервера
PORT=5000

# Режим разработки
NODE_ENV=development
```

### Шаг 5: Запуск приложения

```bash
# Запуск в режиме разработки (сервер + клиент)
npm run dev

# Или запуск только сервера
npm start

# Или запуск только клиента
npm run client
```

## Структура проекта

```
student-performance-prediction/
├── client/                 # React приложение
│   ├── public/
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── pages/         # Страницы приложения
│   │   ├── services/      # API сервисы
│   │   ├── utils/         # Утилиты
│   │   └── App.js
│   └── package.json
├── server/                 # Node.js сервер
│   ├── routes/            # API маршруты
│   ├── middleware/        # Промежуточное ПО
│   ├── models/            # Модели данных
│   ├── utils/             # Утилиты сервера
│   └── server.js
├── database_schema.sql    # SQL скрипт создания БД
├── setup_database.js      # Скрипт настройки БД
├── package.json
└── README.md
```

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/profile` - Получение профиля пользователя

### Студенты
- `GET /api/students` - Получение списка студентов
- `POST /api/students` - Добавление студента (только преподаватели)
- `GET /api/students/:id` - Получение информации о студенте
- `PUT /api/students/:id` - Обновление данных студента

### Оценки
- `GET /api/grades` - Получение оценок
- `POST /api/grades` - Добавление оценок (только преподаватели)
- `PUT /api/grades/:id` - Обновление оценок

### Прогнозы
- `GET /api/predictions` - Получение прогнозов
- `POST /api/predictions/calculate` - Расчет прогноза

## Разработка

### Добавление новых функций

1. Создайте компонент в `client/src/components/`
2. Добавьте маршрут в `client/src/App.js`
3. Создайте API endpoint в `server/routes/`
4. Обновите базу данных при необходимости

### Тестирование

```bash
# Запуск тестов клиента
cd client && npm test

# Запуск тестов сервера
npm test
```

## Развертывание

### Локальное развертывание

```bash
# Сборка клиента
npm run build

# Запуск продакшн сервера
NODE_ENV=production npm start
```

### Развертывание на Heroku

1. Создайте приложение в Heroku
2. Добавьте PostgreSQL addon
3. Настройте переменные окружения
4. Запустите деплой

```bash
heroku create your-app-name
heroku addons:create heroku-postgresql
heroku config:set NODE_ENV=production
git push heroku main
```

## Лицензия

MIT License

## Поддержка

При возникновении проблем создайте issue в репозитории проекта.
