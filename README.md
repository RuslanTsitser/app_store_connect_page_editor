# ASC Page Editor

Веб-редактор метаданных App Store Connect с **одновременным редактированием всех локалей** в одной таблице, просмотром текущих значений и diff для текста и скриншотов.

## Возможности

- Ant Design UI на русском
- Ввод API ключа (Issuer ID, Key ID, приватный ключ `.p8`) — хранится в `localStorage`
- Выбор приложения и версии
- Просмотр и редактирование:
  - **App Store Version** — описание, ключевые слова, What's New, promotional text, URLs
  - **App Info** — название, подзаголовок, privacy policy
- Diff текста (side-by-side) перед сохранением
- Просмотр скриншотов по локалям и image diff с базовой локалью

## Запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

Для доступа с другого устройства в сети используйте Network URL из терминала (`npm run dev`). Если HMR не подключается, добавьте IP хоста в `allowedDevOrigins` в `next.config.ts`.

## API ключ

1. [App Store Connect](https://appstoreconnect.apple.com) → Users and Access → Integrations → **App Store Connect API**
2. Создайте ключ с ролью Admin или App Manager
3. Скачайте `.p8` и скопируйте **Issuer ID**, **Key ID** и содержимое ключа в настройки приложения

Запросы идут через локальный прокси `/api/asc/*`, который подписывает JWT (ES256) и обращается к `https://api.appstoreconnect.apple.com/v1`.

## Безопасность

Ключ хранится только в браузере и передаётся на ваш локальный сервер Next.js в заголовках. Не используйте на публичном хостинге без дополнительной защиты.

## Ограничения

- Загрузка новых скриншотов через API не реализована (только просмотр и сравнение)
- Редактирование возможно только когда версия в подходящем состоянии (например `PREPARE_FOR_SUBMISSION`)
