# Документация для разработчиков

[<kbd>English version</kbd>](DEVELOPMENT.en.md)

## Архитектура

- `src/main.ts` управляет жизненным циклом Obsidian-плагина, командами, статус-баром, восстановлением сессии и регистрацией views.
- `src/domain/` содержит чистую бизнес-логику: дефолты сессий, формирование записей, merge сохранённых данных и текст статус-бара.
- `src/services/` содержит прикладные сервисы: таймер, Focus Shield, системные focus-команды, статистику и управление активной сессией.
- `src/ui/` содержит модальные окна, экран фокуса, экран статистики и вкладку настроек.
- `src/i18n.ts` задаёт поддерживаемые языки и общий helper для выбора русской или английской строки.

## Локальная разработка

```bash
npm install
npm run dev
```

`npm run dev` запускает esbuild в watch-режиме и пересобирает `main.js` при изменениях. Для локальной проверки в Obsidian удобно подключить репозиторий как папку `.obsidian/plugins/study-zen/` в тестовом vault.

## Проверки

Перед PR запускайте:

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run package
```

`npm run build` создаёт production `main.js`. `npm run package` берёт `main.js`, `manifest.json` и `styles.css`, затем создаёт установочный архив `release/study-zen-<version>.zip`.

## Release-процесс

- `CI` запускается на pull request и push в `main`, проверяет тесты, типы, lint, build и собирает установочный zip как artifact `study-zen-plugin`.
- `Release` запускается по git tag, выполняет те же проверки, собирает zip и прикладывает его к GitHub Release.
- Версия плагина хранится в `manifest.json`; совместимость с Obsidian хранится в `versions.json`.
- Для версии используйте `npm version` или обновляйте `manifest.json` и `versions.json` через существующий `npm run version` workflow проекта.

## Чеклист PR

- Изменения относятся к одному понятному product/developer scope.
- UI-тексты проходят через языковую настройку, если они видимы пользователю.
- Есть тесты для новой бизнес-логики или изменённого поведения.
- README или docs обновлены, если меняется пользовательский или developer workflow.
- Локально пройдены typecheck, test, lint, build и package.
