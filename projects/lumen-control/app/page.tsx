"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
type ActionName = "github.create_issue" | "codex.create_task";
type ActionProposal = { action: ActionName; title: string; instruction: string };
type SystemStatus = {
  openai: boolean;
  github: boolean;
  codex: boolean;
  repository: string;
  policy?: string;
};
type Project = {
  code: string;
  name: string;
  status: string;
  workState: "active" | "working" | "decision";
  goal: string;
  current: string;
  last: string;
  next: string;
};

type SavedState = {
  messages: ChatMessage[];
  decision: "recommended" | "alternative" | null;
  acceptedResults: string[];
  dailyBriefClosed: boolean;
};

const STORAGE_KEY = "lumen-control-v0.2";

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Я на связи, Архитектор. Здесь можно поставить направление обычными словами, получить проверяемый результат и передать подтверждённую техническую задачу в Codex-контур.",
  },
];

const projects: Project[] = [
  {
    code: "LUM-001",
    name: "Lumen — цифровая студия дизайна",
    status: "Активен",
    workState: "active",
    goal: "Собрать первый работающий публичный и продуктовый контур студии.",
    current: "Уточняется единая модель управления проектами.",
    last: "Утверждены публичное название и рабочая точка входа.",
    next: "Свести продуктовый и операционный контуры.",
  },
  {
    code: "LUM-002",
    name: "Публичный запуск",
    status: "Запуск",
    workState: "working",
    goal: "Запустить связный маршрут Instagram → Telegram → диалог.",
    current: "Подготавливается последовательность первых публикаций.",
    last: "Созданы публичные точки Lumen и единый аватар.",
    next: "Подготовить первую завершённую серию материалов.",
  },
  {
    code: "LUM-003",
    name: "Lumen Store GPT",
    status: "Тестирование",
    workState: "working",
    goal: "Довести закрытую версию v0.2 до критерия приёмки.",
    current: "Ожидается полный цикл проверки замороженной версии.",
    last: "Подготовлен протокол проверки.",
    next: "Завершить приёмку без изменения конфигурации.",
  },
  {
    code: "LUM-004",
    name: "Lumen Workspace / Lumen Control",
    status: "В сборке",
    workState: "decision",
    goal: "Создать единый понятный интерфейс Архитектора.",
    current: "Требуется определить роль Lumen Control.",
    last: "Подготовлена UX-модель первого экрана.",
    next: "Утвердить единый рабочий интерфейс.",
  },
  {
    code: "LUM-005",
    name: "Система обработки заявок",
    status: "Проектирование",
    workState: "working",
    goal: "Не позволять новым обращениям исчезать в переписке.",
    current: "Определён минимальный жизненный цикл заявки.",
    last: "Утверждены базовые статусы.",
    next: "Собрать простой реестр и карточку обращения.",
  },
];

const resultCards = [
  {
    id: "control-spec",
    project: "Lumen Control",
    title: "Спецификация первого рабочего экрана",
    created: "Целостная структура главного интерфейса.",
    checked: "Проекты, решения, результаты, проблемы и основной диалог.",
    notDone: "Публикация и подключение постоянного серверного реестра.",
  },
  {
    id: "store-protocol",
    project: "Lumen Store GPT",
    title: "Протокол проверки версии v0.2",
    created: "Структура полного цикла приёмки.",
    checked: "Критерии готовности и запрет ложных статусов.",
    notDone: "Финальная приёмка и публикация версии.",
  },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate() {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function loadState(): SavedState {
  if (typeof window === "undefined") {
    return {
      messages: initialMessages,
      decision: null,
      acceptedResults: [],
      dailyBriefClosed: false,
    };
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) throw new Error("empty");
    const parsed = JSON.parse(saved) as Partial<SavedState>;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : initialMessages,
      decision:
        parsed.decision === "recommended" || parsed.decision === "alternative"
          ? parsed.decision
          : null,
      acceptedResults: Array.isArray(parsed.acceptedResults)
        ? parsed.acceptedResults
        : [],
      dailyBriefClosed: Boolean(parsed.dailyBriefClosed),
    };
  } catch {
    return {
      messages: initialMessages,
      decision: null,
      acceptedResults: [],
      dailyBriefClosed: false,
    };
  }
}

export default function Home() {
  const [saved, setSaved] = useState<SavedState>({
    messages: initialMessages,
    decision: null,
    acceptedResults: [],
    dailyBriefClosed: false,
  });
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [filter, setFilter] = useState<"all" | "working" | "decision">("all");
  const [drawer, setDrawer] = useState<null | { title: string; eyebrow: string; body: React.ReactNode }>(null);
  const [actionDraft, setActionDraft] = useState<ActionProposal>({
    action: "codex.create_task",
    title: "Lumen Control v0.2: реализовать подтверждённую задачу",
    instruction: "",
  });
  const [pendingAction, setPendingAction] = useState<ActionProposal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ text: string; url?: string } | null>(null);
  const [dateLabel, setDateLabel] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = loadState();
    setSaved(state);
    setDateLabel(formatDate());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [saved, hydrated]);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setSystemStatus(data))
      .catch(() => setSystemStatus(null));
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [saved.messages, loading]);

  const visibleProjects = useMemo(() => {
    if (filter === "all") return projects;
    if (filter === "decision") return projects.filter((project) => project.workState === "decision");
    return projects.filter((project) => project.workState === "working" || project.workState === "active");
  }, [filter]);

  const readyCount = Math.max(0, resultCards.length - saved.acceptedResults.length);
  const decisionCount = saved.decision ? 0 : 1;

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const clean = input.trim();
    if (!clean || loading) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: clean };
    const nextMessages = [...saved.messages, userMessage];
    setSaved((current) => ({ ...current, messages: nextMessages }));
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-12).map(({ role, content }) => ({ role, content })),
          context: {
            interface: "Lumen Control v0.2",
            projects: projects.map(({ code, name, status, next }) => ({ code, name, status, next })),
            decision: saved.decision,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lumen Core недоступен");
      setSaved((current) => ({
        ...current,
        messages: [
          ...current.messages,
          { id: makeId(), role: "assistant", content: data.text },
        ],
      }));
    } catch {
      setSaved((current) => ({
        ...current,
        messages: [
          ...current.messages,
          {
            id: makeId(),
            role: "assistant",
            content:
              "Я сохранила команду локально, но сейчас не смогла связаться с Lumen Core. Внешнее действие не выполнялось.",
          },
        ],
      }));
    } finally {
      setLoading(false);
    }
  }

  function openProject(project: Project) {
    setDrawer({
      eyebrow: project.code,
      title: project.name,
      body: (
        <>
          <DrawerSection title="Текущая цель">{project.goal}</DrawerSection>
          <DrawerSection title="Что происходит сейчас">{project.current}</DrawerSection>
          <DrawerSection title="Последний подтверждённый результат">{project.last}</DrawerSection>
          <DrawerSection title="Следующий шаг">{project.next}</DrawerSection>
          <button
            className="button primary"
            type="button"
            onClick={() => {
              setInput(`Продолжи проект «${project.name}». Подготовь следующий проверяемый результат.`);
              setDrawer(null);
            }}
          >
            Продолжить проект
          </button>
        </>
      ),
    });
  }

  function prepareCodexTask() {
    const instruction = actionDraft.instruction.trim();
    if (!instruction) return;
    setPendingAction({ ...actionDraft, instruction });
    setActionResult(null);
  }

  async function confirmAction() {
    if (!pendingAction || actionLoading) return;
    setActionLoading(true);
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pendingAction, approved: true }),
      });
      const data = await response.json();
      if (!response.ok && response.status !== 202) {
        throw new Error(data.error || "Внешнее действие не выполнено");
      }
      const queued = data.status === "codex_queued";
      setActionResult({
        text: queued
          ? `Codex получил подтверждённую задачу через Issue #${data.issueNumber}.`
          : `GitHub Issue #${data.issueNumber} создан. Codex ожидает активации серверного workflow.`,
        url: data.issueUrl,
      });
      setPendingAction(null);
      setActionDraft((current) => ({ ...current, instruction: "" }));
    } catch (error) {
      setActionResult({
        text: error instanceof Error ? error.message : "Внешнее действие не выполнено",
      });
    } finally {
      setActionLoading(false);
    }
  }

  function acceptResult(id: string) {
    setSaved((current) => ({
      ...current,
      acceptedResults: current.acceptedResults.includes(id)
        ? current.acceptedResults
        : [...current.acceptedResults, id],
    }));
  }

  const connectionIssue = !systemStatus || !systemStatus.openai || !systemStatus.github || !systemStatus.codex;

  return (
    <main className="control-app">
      {!saved.dailyBriefClosed && (
        <div className="brief-overlay">
          <section className="brief-card">
            <span className="overline">Ежедневная сводка</span>
            <h1>Доброе утро,<br />Архитектор.</h1>
            <div className="brief-grid">
              <BriefItem label="Готово">Два результата подготовлены для оценки.</BriefItem>
              <BriefItem label="Требуется решение">Роль Lumen Control в рабочей системе.</BriefItem>
              <BriefItem label="Подключения">
                {connectionIssue ? "Не все серверные контуры активны." : "OpenAI, GitHub и Codex готовы."}
              </BriefItem>
              <BriefItem label="Главный шаг">Завершить приёмку Lumen Store GPT v0.2.</BriefItem>
            </div>
            <div className="button-row">
              <button
                className="button primary"
                type="button"
                onClick={() => setSaved((current) => ({ ...current, dailyBriefClosed: true }))}
              >
                Перейти к главному экрану
              </button>
            </div>
          </section>
        </div>
      )}

      <header className="control-header">
        <div className="brand-lockup">
          <span className="lumen-orb" aria-hidden="true" />
          <div>
            <span className="overline">Система Архитектора</span>
            <strong>Lumen Control</strong>
            <small>Проекты, решения и проверяемые результаты</small>
          </div>
        </div>
        <div className="header-status">
          <span className={`connection-chip ${systemStatus?.openai ? "connected" : ""}`}>OpenAI</span>
          <span className={`connection-chip ${systemStatus?.github ? "connected" : ""}`}>GitHub</span>
          <span className={`connection-chip ${systemStatus?.codex ? "connected" : ""}`}>Codex</span>
          <span className="date-label">{dateLabel}</span>
        </div>
      </header>

      <section className="summary-grid" aria-label="Сводка состояния">
        <SummaryStat value="5" label="активных проектов" />
        <SummaryStat value={String(readyCount)} label="результата ждут оценки" />
        <SummaryStat value={String(decisionCount)} label="решение ожидает вас" />
        <SummaryStat value={connectionIssue ? "1" : "0"} label="системная проблема" />
      </section>

      <div className="workspace-grid">
        <div className="main-column">
          <section className="panel hero-panel">
            <span className="overline">Главный следующий шаг</span>
            <h2>Завершить приёмку Lumen Store GPT v0.2</h2>
            <p>
              До окончания полного цикла проверки торговый контур нельзя считать закрытой рабочей версией. Подготовительную работу можно выполнить без публикации и изменения конфигурации.
            </p>
            <div className="tag-row">
              <span className="tag blue">Тестирование</span>
              <span className="tag green">Без внешних действий</span>
              <span className="tag">LUM-003</span>
            </div>
            <div className="button-row">
              <button
                className="button primary"
                type="button"
                onClick={() => {
                  setActionDraft({
                    action: "codex.create_task",
                    title: "Lumen Store GPT v0.2: завершить техническую подготовку приёмки",
                    instruction:
                      "Проверь актуальное состояние материалов Lumen Store GPT в репозитории. Подготовь недостающие технические артефакты для полного цикла приёмки, запусти доступные проверки и создай pull request. Не меняй публичную конфигурацию продукта и не выполняй публикацию.",
                  });
                  document.getElementById("execution")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Подготовить выполнение
              </button>
              <button className="button" type="button" onClick={() => openProject(projects[2])}>
                Открыть проект
              </button>
            </div>
          </section>

          <section className="panel section-panel">
            <SectionHeader title="Активные проекты" subtitle="Управленческая картина без технического журнала" count="5 проектов" />
            <div className="filter-row">
              <button className={filter === "all" ? "filter active" : "filter"} type="button" onClick={() => setFilter("all")}>Все</button>
              <button className={filter === "decision" ? "filter active" : "filter"} type="button" onClick={() => setFilter("decision")}>Требуют решения</button>
              <button className={filter === "working" ? "filter active" : "filter"} type="button" onClick={() => setFilter("working")}>В работе</button>
            </div>
            <div className="project-list">
              {visibleProjects.map((project) => (
                <article className="project-card" key={project.code}>
                  <div className="project-heading">
                    <div>
                      <span className="project-code">{project.code}</span>
                      <h3>{project.name}</h3>
                    </div>
                    <span className={`tag ${project.workState === "decision" ? "yellow" : project.workState === "working" ? "blue" : "green"}`}>{project.status}</span>
                  </div>
                  <div className="project-facts">
                    <ProjectFact label="Текущая цель">{project.goal}</ProjectFact>
                    <ProjectFact label="Сейчас">{project.current}</ProjectFact>
                    <ProjectFact label="Последний результат">{project.last}</ProjectFact>
                    <ProjectFact label="Следующий шаг">{project.next}</ProjectFact>
                  </div>
                  <div className="project-footer">
                    <span>{project.workState === "decision" ? "Требуется решение" : "Работа активна"}</span>
                    <button className="text-button" type="button" onClick={() => openProject(project)}>Открыть проект →</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel section-panel">
            <SectionHeader title="Готово" subtitle="Проверенные результаты, ожидающие оценки Архитектора" count={`${readyCount} ожидают`} />
            <div className="result-list">
              {resultCards.map((result) => {
                const accepted = saved.acceptedResults.includes(result.id);
                return (
                  <article className={accepted ? "result-card accepted" : "result-card"} key={result.id}>
                    <div className="result-heading">
                      <div><span className="overline">{result.project}</span><h3>{result.title}</h3></div>
                      <span className="tag green">{accepted ? "Принято" : "Проверено"}</span>
                    </div>
                    <p><b>Создано:</b> {result.created}</p>
                    <p><b>Проверено:</b> {result.checked}</p>
                    <p><b>Не выполнено:</b> {result.notDone}</p>
                    <div className="button-row">
                      {!accepted && <button className="button primary compact" type="button" onClick={() => acceptResult(result.id)}>Принять</button>}
                      <button
                        className="button compact"
                        type="button"
                        onClick={() => setDrawer({
                          eyebrow: result.project,
                          title: result.title,
                          body: <><DrawerSection title="Создано">{result.created}</DrawerSection><DrawerSection title="Проверено">{result.checked}</DrawerSection><DrawerSection title="Ограничение">{result.notDone}</DrawerSection></>,
                        })}
                      >
                        Открыть полностью
                      </button>
                      <button className="button compact" type="button" onClick={() => setInput(`Доработай результат «${result.title}»: `)}>Доработать</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="side-column">
          <section className={saved.decision ? "panel decision-panel resolved" : "panel decision-panel"}>
            <SectionHeader title="Требуется ваше решение" subtitle="Lumen Workspace / Lumen Control" count={saved.decision ? "Принято" : "Ожидает вас"} />
            {!saved.decision ? (
              <>
                <h3>Считать ли Lumen Control единственным рабочим интерфейсом?</h3>
                <DecisionOption label="Рекомендация ИИ" recommended>
                  Да. Остальные инструменты оставить скрытым исполнительным уровнем.
                </DecisionOption>
                <DecisionOption label="Альтернатива">
                  Сохранить отдельные интерфейсы для проектов и задач.
                </DecisionOption>
                <p className="muted-note">Пока ничего не изменено.</p>
                <div className="button-row vertical-mobile">
                  <button className="button primary" type="button" onClick={() => setSaved((current) => ({ ...current, decision: "recommended" }))}>Принять рекомендацию</button>
                  <button className="button" type="button" onClick={() => setSaved((current) => ({ ...current, decision: "alternative" }))}>Выбрать альтернативу</button>
                </div>
              </>
            ) : (
              <>
                <span className="overline">Решение принято</span>
                <h3>{saved.decision === "recommended" ? "Lumen Control утверждён как единый рабочий интерфейс." : "Сохранены отдельные интерфейсы проектов и задач."}</h3>
                <p className="muted-note">Решение зафиксировано локально. Для записи в постоянный реестр потребуется серверное хранилище.</p>
                <button className="button compact" type="button" onClick={() => setSaved((current) => ({ ...current, decision: null }))}>Отменить решение</button>
              </>
            )}
          </section>

          <section className="panel section-panel connections-panel">
            <SectionHeader title="Состояние системы" subtitle={systemStatus?.repository || "Проверка подключений"} count={connectionIssue ? "Есть разрыв" : "Готово"} />
            <ConnectionRow label="Главный ИИ" connected={Boolean(systemStatus?.openai)} description={systemStatus?.openai ? "OpenAI API подключён" : "Работает честный демо-ответ"} />
            <ConnectionRow label="GitHub" connected={Boolean(systemStatus?.github)} description={systemStatus?.github ? "Сервер может создавать подтверждённые задачи" : "Нужен серверный GITHUB_TOKEN"} />
            <ConnectionRow label="Codex" connected={Boolean(systemStatus?.codex)} description={systemStatus?.codex ? "Workflow активирован" : "Автоматизация пока не активирована"} />
          </section>

          <section className="panel execution-panel" id="execution">
            <SectionHeader title="Исполнение" subtitle="Подтверждённая передача в GitHub / Codex" count="Одно подтверждение" />
            <div className="action-switch">
              <button type="button" className={actionDraft.action === "codex.create_task" ? "active" : ""} onClick={() => setActionDraft((current) => ({ ...current, action: "codex.create_task" }))}>Codex</button>
              <button type="button" className={actionDraft.action === "github.create_issue" ? "active" : ""} onClick={() => setActionDraft((current) => ({ ...current, action: "github.create_issue" }))}>Только Issue</button>
            </div>
            <label className="field-label" htmlFor="action-title">Название</label>
            <input id="action-title" value={actionDraft.title} onChange={(event) => setActionDraft((current) => ({ ...current, title: event.target.value }))} />
            <label className="field-label" htmlFor="action-instruction">Проверяемый результат</label>
            <textarea id="action-instruction" rows={7} value={actionDraft.instruction} onChange={(event) => setActionDraft((current) => ({ ...current, instruction: event.target.value }))} placeholder="Опишите результат обычными словами. Система создаст подтверждённую задачу, но не изменит main и не выполнит merge." />
            <button className="button primary full" type="button" disabled={!actionDraft.title.trim() || !actionDraft.instruction.trim()} onClick={prepareCodexTask}>Подготовить подтверждение</button>
            {actionResult && (
              <div className="action-result">
                <p>{actionResult.text}</p>
                {actionResult.url && <a href={actionResult.url} target="_blank" rel="noreferrer">Открыть в GitHub →</a>}
              </div>
            )}
          </section>
        </aside>
      </div>

      <section className="chat-dock">
        <div className="chat-stream" aria-live="polite">
          {saved.messages.slice(-4).map((message) => (
            <article className={`chat-message ${message.role}`} key={message.id}>
              <span>{message.role === "assistant" ? "Lumen" : "Архитектор"}</span>
              <p>{message.content}</p>
            </article>
          ))}
          {loading && <article className="chat-message assistant"><span>Lumen</span><p>Собираю ответ…</p></article>}
          <div ref={messageEndRef} />
        </div>
        <form className="main-composer" onSubmit={sendMessage}>
          <div className="quick-row">
            <button type="button" onClick={() => setInput("Хочу создать новую идею для Lumen: ")}>Новая идея</button>
            <button type="button" onClick={() => setInput("Продолжи проект ")}>Продолжить проект</button>
            <button type="button" onClick={() => setInput("Помоги принять решение по проекту ")}>Принять решение</button>
            <button type="button" onClick={() => setInput("Проверь готовый результат проекта ")}>Проверить результат</button>
          </div>
          <div className="composer-row">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} placeholder="Сообщите, что вы хотите создать, изменить, продолжить или проверить…" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
            <button className="send-button" type="submit" disabled={!input.trim() || loading}>Отправить</button>
          </div>
        </form>
      </section>

      {pendingAction && (
        <div className="confirmation-overlay">
          <section className="confirmation-card">
            <span className="overline">Требуется подтверждение Архитектора</span>
            <h2>{pendingAction.title}</h2>
            <p>{pendingAction.instruction}</p>
            <div className="confirmation-boundary">
              <b>Что произойдёт</b>
              <span>{pendingAction.action === "codex.create_task" ? "Будет создан GitHub Issue и отправлен сигнал Codex workflow." : "Будет создан GitHub Issue."}</span>
              <b>Что не произойдёт</b>
              <span>Не будет прямого изменения main, автоматического merge или публикации.</span>
            </div>
            <div className="button-row">
              <button className="button primary" type="button" disabled={actionLoading} onClick={confirmAction}>{actionLoading ? "Выполняется…" : "Подтверждаю действие"}</button>
              <button className="button" type="button" disabled={actionLoading} onClick={() => setPendingAction(null)}>Отмена</button>
            </div>
          </section>
        </div>
      )}

      {drawer && (
        <div className="drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawer(null); }}>
          <aside className="drawer">
            <div className="drawer-head">
              <span className="overline">{drawer.eyebrow}</span>
              <button type="button" aria-label="Закрыть" onClick={() => setDrawer(null)}>×</button>
            </div>
            <h2>{drawer.title}</h2>
            {drawer.body}
          </aside>
        </div>
      )}
    </main>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return <div className="summary-stat"><strong>{value}</strong><span>{label}</span></div>;
}

function SectionHeader({ title, subtitle, count }: { title: string; subtitle: string; count: string }) {
  return <div className="section-header"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{count}</span></div>;
}

function ProjectFact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="project-fact"><b>{label}</b><span>{children}</span></div>;
}

function DecisionOption({ label, children, recommended = false }: { label: string; children: React.ReactNode; recommended?: boolean }) {
  return <div className={recommended ? "decision-option recommended" : "decision-option"}><span>{label}</span><p>{children}</p></div>;
}

function ConnectionRow({ label, connected, description }: { label: string; connected: boolean; description: string }) {
  return <div className="connection-row"><span className={connected ? "connection-light connected" : "connection-light"} /><div><b>{label}</b><small>{description}</small></div></div>;
}

function BriefItem({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="brief-item"><b>{label}</b><span>{children}</span></div>;
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="drawer-section"><h3>{title}</h3><p>{children}</p></section>;
}
