# Hermes Pilot for Lumen Control

## Статус

Экспериментальный контур. Он не входит в `main`, не заменяет Claude Code и не получает право управлять внешними действиями.

Зафиксированная версия Hermes: `v2026.7.7.2` (`0.18.2`).

## Что подготовлено

- `.hermes.md` — ограничения и первая задача агента;
- `scripts/setup-hermes-pilot.ps1` — установка закреплённой версии через официальный установщик;
- `scripts/run-hermes-pilot.ps1` — диагностика и первый аудит проекта;
- `.hermes-pilot/` — локальная папка результатов, исключённая из Git.

## Запуск на Windows

Открой PowerShell в локальном репозитории и выполни:

```powershell
git fetch origin
git switch experiment/hermes-pilot
cd projects/lumen-control
powershell -ExecutionPolicy Bypass -File .\scripts\setup-hermes-pilot.ps1
```

Во время мастера модели выбери **OpenAI Codex**. Авторизация проходит через ChatGPT OAuth, поэтому ключ проекта `OPENAI_API_KEY` для пилота не нужен.

После установки открой новое окно PowerShell, снова перейди в `projects/lumen-control` и запусти:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-hermes-pilot.ps1
```

Результаты появятся локально:

```text
.hermes-pilot/doctor.txt
.hermes-pilot/first-run.md
```

## Что проверяет первый запуск

Hermes читает `README.md`, `package.json` и доступную структуру проекта, после чего возвращает:

- назначение приложения;
- стек и команды запуска;
- действующие ограничения;
- три возможные роли Hermes;
- три риска подключения;
- один итоговый вердикт совместимости.

## Ограничения пилота

- запуск на `main` блокируется скриптом;
- исходный код и проектные данные не должны меняться;
- Git-запись, публикация, Telegram, gateway, cron и субагенты запрещены;
- секреты и файлы окружения не читаются;
- результат сохраняется только в `.hermes-pilot/`.

## Откат

Для возврата к обычной работе достаточно переключиться обратно:

```powershell
git switch main
```

Hermes не подключён к производственному контуру и не добавлен как зависимость приложения.
