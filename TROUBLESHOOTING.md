# Устранение проблем с генерацией данных

## Проблема: Скрипт запускает сервер вместо генерации данных

**Решение:** Исправлено в `docker-compose.yml` - теперь сервис `generate-data` использует свой entrypoint и не запускает сервер.

## Проблема: Ошибки с триггерами при запуске setup_database.js

**Решение:** Исправлено в `setup_database.js` - теперь игнорируются ошибки о существующих объектах (коды 42P07, 42710, 42P16).

## Проблема: Скрипт не может подключиться к БД

**Проверьте:**

1. **БД запущена:**
   ```bash
   docker compose ps
   ```
   Должен быть запущен контейнер `coursework-db`

2. **БД доступна:**
   ```bash
   docker compose exec db psql -U postgres -d coursework_db -c "SELECT 1;"
   ```

3. **Переменные окружения правильные:**
   В docker-compose.yml для `generate-data`:
   - `DB_HOST=db` (имя сервиса, не localhost!)
   - `DB_PORT=5432` (внутренний порт контейнера, не 5433!)

## Правильный запуск

```bash
# 1. Убедитесь, что БД запущена
docker compose up -d db

# 2. Подождите 10-15 секунд
sleep 15

# 3. Запустите генерацию данных
docker compose --profile tools run --rm generate-data
```

## Проверка результатов

После выполнения скрипта проверьте:

```bash
# Подключитесь к БД
docker compose exec db psql -U postgres -d coursework_db

# Проверьте количество студентов
SELECT COUNT(*) FROM students;

# Должно быть 50

# Проверьте количество преподавателей
SELECT COUNT(*) FROM teachers;

# Должно быть 10

# Проверьте администратора
SELECT username, full_name FROM users WHERE username = 'admin';

# Должен быть один администратор
```

## Если данные не добавились

1. **Проверьте логи:**
   ```bash
   docker compose --profile tools run --rm generate-data
   ```
   Ищите ошибки в выводе

2. **Проверьте транзакцию:**
   Скрипт использует транзакцию, если произошла ошибка - все изменения откатятся

3. **Проверьте права доступа:**
   ```bash
   docker compose exec db psql -U postgres -d coursework_db -c "\du"
   ```

4. **Очистите и пересоздайте:**
   ```bash
   docker compose down -v
   docker compose up -d db
   sleep 15
   docker compose --profile tools run --rm generate-data
   ```

## Частые ошибки

### "relation does not exist"
**Причина:** Таблицы не созданы  
**Решение:** Выполните `docker compose exec server node setup_database.js` или пересоздайте БД

### "password authentication failed"
**Причина:** Неправильный пароль  
**Решение:** Проверьте `DB_PASSWORD` в docker-compose.yml (должен быть `123`)

### "connection refused"
**Причина:** БД не запущена или неправильный хост  
**Решение:** 
- Проверьте `docker compose ps`
- Убедитесь, что `DB_HOST=db` (не localhost!)

### Скрипт зависает
**Причина:** БД еще не готова  
**Решение:** Увеличьте время ожидания или проверьте healthcheck БД

