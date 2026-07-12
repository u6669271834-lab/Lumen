"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Section = "cabinet" | "projects" | "production" | "store" | "archive";
type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
type Task = { id: string; title: string; stage: string; status: "active" | "waiting" | "done" };
type EventItem = { id: string; time: string; text: string };
type ActionName = "github.create_issue" | "codex.create_task";
type ActionProposal = { action: ActionName; title: string; instruction: string };
type SystemStatus = { openai: boolean; github: boolean; codex: boolean; repository: string };

const nav: { id: Section; label: string; index: string }[] = [
  { id: "cabinet", label: "Кабинет", index: "01" },
  { id: "projects", label: "Проекты", index: "02" },
  { id: "production", label: "Производство", index: "03" },
  { id: "store", label: "Lumen Store", index: "04" },
  { id: "archive", label: "Архив", index: "05" },
];

const projects = [
  { code: "LUM-001", name: "Lumen", status: "Активен", progress: 64, note: "Канон и рабочее пространство" },
  { code: "LUM-002", name: "Lumen Store", status: "Запуск", progress: 38, note: "Первая коллекция промптов" },
  { code: "LUM-003", name: "Lumen Control", status: "Подключение", progress: 72, note: "Кабинет Архитектора" },
  { code: "LUM-004", name: "Игровая студия", status: "Проектирование", progress: 18, note: "Персональные игры внутри ИИ" },
];

const storeProducts = [
  ["LUM-S01", "Brief Engine", "Контент", "40%"],
  ["LUM-S02", "Inbox Navigator", "Прототип", "25%"],
  ["LUM-S03", "GitHub Architect", "Проектирование", "15%"],
  ["LUM-S04", "Series Architect", "Концепция", "10%"],
];

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Я на связи, Архитектор. Это первый рабочий контур Lumen Control. Здесь мы можем принимать решения, формировать задания и удерживать состояние проектов. Что будем двигать сейчас?",
  },
];

function now() {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const [section, setSection] = useState<Section>("cabinet");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [coreMode, setCoreMode] = useState<"ready" | "real" | "demo" | "error">("ready");
  const [tasks, setTasks] = useState<Task[]>([
    { id: "COD-001", title: "Lumen Control v0.1", stage: "Исполнение", status: "active" },
    { id: "PRD-001", title: "Brief Engine", stage: "Подтверждение", status: "waiting" },
  ]);
  const [events, setEvents] = useState<EventItem[]>([
    { id: "e1", time: "Сейчас", text: "Lumen Control открыт" },
    { id: "e2", time: "Ранее", text: "Lumen Store v0.1 опубликован" },
  ]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [actionName, setActionName] = useState<ActionName>("codex.create_task");
  const [actionTitle, setActionTitle] = useState("Lumen Control: выполнить подтверждённую задачу");
  const [actionInstruction, setActionInstruction] = useState("");
  const [pendingAction, setPendingAction] = useState<ActionProposal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ text: string; url?: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem("lumen-control-v0.1");
      if (saved) {
        try {
          const state = JSON.parse(saved);
          if (Array.isArray(state.messages)) setMessages(state.messages);
          if (Array.isArray(state.tasks)) setTasks(state.tasks);
          if (Array.isArray(state.events)) setEvents(state.events);
        } catch {
          // Keep the safe baseline when local state is damaged.
        }
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (active) setSystemStatus(data); })
      .catch(() => { if (active) setSystemStatus(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("lumen-control-v0.1", JSON.stringify({ messages, tasks, events }));
  }, [messages, tasks, events, hydrated]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeProject = useMemo(() => projects.find((item) => item.code === "LUM-003"), []);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const clean = input.trim();
    if (!clean || loading) return;
    const userMessage: ChatMessage = { id: makeId(), role: "user", content: clean };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setEvents((current) => [{ id: makeId(), time: now(), text: "Архитектор отправил команду" }, ...current].slice(0, 8));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-12).map(({ role, content }) => ({ role, content })),
          context: { section, activeProject: activeProject?.name, tasks },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lumen Core недоступен");
      setMessages((current) => [...current, { id: makeId(), role: "assistant", content: data.text }]);
      setCoreMode(data.mode === "real" ? "real" : "demo");
      setEvents((current) => [{ id: makeId(), time: now(), text: data.mode === "real" ? "Lumen Core ответил" : "Включён демо-ответ" }, ...current].slice(0, 8));
    } catch {
      setCoreMode("error");
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "assistant", content: "Я сохранила твою команду, но сейчас не смогла связаться с Lumen Core. Повтори отправку через минуту — локальное состояние не потеряно." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function createTaskFromInput() {
    const title = input.trim() || "Новая задача Архитектора";
    const task: Task = { id: `COD-${String(tasks.length + 1).padStart(3, "0")}`, title, stage: "Черновик", status: "waiting" };
    setTasks((current) => [...current, task]);
    setEvents((current) => [{ id: makeId(), time: now(), text: `Создан черновик ${task.id}` }, ...current].slice(0, 8));
    setInput("");
  }

  function prepareAction() {
    const title = actionTitle.trim();
    const instruction = actionInstruction.trim();
    if (!title || !instruction) return;
    setPendingAction({ action: actionName, title, instruction });
    setActionResult(null);
    setEvents((current) => [{ id: makeId(), time: now(), text: "Действие подготовлено к подтверждению" }, ...current].slice(0, 8));
  }

  function cancelAction() {
    setPendingAction(null);
    setEvents((current) => [{ id: makeId(), time: now(), text: "Действие отклонено Архитектором" }, ...current].slice(0, 8));
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
      if (!response.ok && response.status !== 202) throw new Error(data.error || "Действие не выполнено");
      const queued = data.status === "codex_queued";
      const text = queued
        ? `Codex получил задачу через Issue #${data.issueNumber}`
        : `GitHub Issue #${data.issueNumber} создан${data.notice ? "; Codex ожидает активации workflow" : ""}`;
      setActionResult({ text, url: data.issueUrl });
      setEvents((current) => [{ id: makeId(), time: now(), text }, ...current].slice(0, 8));
      setPendingAction(null);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Внешнее действие не выполнено";
      setActionResult({ text });
      setEvents((current) => [{ id: makeId(), time: now(), text }, ...current].slice(0, 8));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="control-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">L</span>
          <div><strong>Lumen</strong><small>Control / 0.2</small></div>
        </div>
        <nav aria-label="Разделы Lumen Control">
          {nav.map((item) => (
            <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)} type="button">
              <span>{item.index}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="system-card">
          <span className={`status-light ${coreMode}`} />
          <div><strong>Lumen Core</strong><small>{coreMode === "real" ? "OpenAI подключён" : coreMode === "demo" ? "Демо-режим" : coreMode === "error" ? "Связь прервана" : "Готов к запросу"}</small></div>
        </div>
        <div className="connection-list" aria-label="Подключения">
          <span className={systemStatus?.openai ? "connected" : ""}><i /> OpenAI</span>
          <span className={systemStatus?.github ? "connected" : ""}><i /> GitHub</span>
          <span className={systemStatus?.codex ? "connected" : ""}><i /> Codex</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span className="overline">Архитектурный кабинет</span><h1>{nav.find((item) => item.id === section)?.label}</h1></div>
          <div className="top-actions"><span className="date">12 · 07 · 2026</span><button type="button" onClick={() => { setSection("cabinet"); setInput("Создай новую задачу: "); }}>＋ Новая задача</button></div>
        </header>

        {section === "cabinet" && (
          <div className="cabinet-grid">
            <section className="chat-panel panel">
              <div className="panel-header"><div><span className="overline">Прямой канал</span><h2>Диалог с Lumen</h2></div><span className="live-label"><i /> активен</span></div>
              <div className="messages" aria-live="polite">
                {messages.map((message) => (
                  <article className={`message ${message.role}`} key={message.id}>
                    <span>{message.role === "assistant" ? "Lumen" : "Архитектор"}</span>
                    <p>{message.content}</p>
                  </article>
                ))}
                {loading && <article className="message assistant thinking"><span>Lumen</span><p>Собираю ответ<span className="dots">…</span></p></article>}
                <div ref={chatEndRef} />
              </div>
              <form className="composer" onSubmit={sendMessage}>
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Напиши решение, вопрос или команду…" aria-label="Сообщение для Lumen" rows={3} />
                <div className="composer-footer"><button className="ghost" type="button" onClick={createTaskFromInput}>В задачу</button><span>Enter — отправить · Shift+Enter — строка</span><button className="send" type="submit" disabled={loading || !input.trim()}>Отправить ↗</button></div>
              </form>
            </section>

            <aside className="right-rail">
              <section className="panel focus-panel"><span className="overline">Текущий фокус</span><strong>Lumen Control v0.2</strong><p>Реальный Lumen Core и подтверждаемый контур GitHub / Codex.</p><div className="progress"><i style={{ width: "72%" }} /></div><small>72% · подключение производственного контура</small></section>
              <section className="panel action-panel">
                <div className="panel-title-row"><span className="overline">Action Gateway</span><span>{systemStatus?.repository || "u6669271834-lab/Lumen"}</span></div>
                <h3>Подтверждённое действие</h3>
                <p>Только Issue или отдельная ветка с pull request. Прямые изменения <code>main</code>, merge, release и удаление заблокированы.</p>
                <div className="action-kind" role="group" aria-label="Тип действия">
                  <button type="button" className={actionName === "github.create_issue" ? "active" : ""} onClick={() => setActionName("github.create_issue")}>GitHub Issue</button>
                  <button type="button" className={actionName === "codex.create_task" ? "active" : ""} onClick={() => setActionName("codex.create_task")}>Codex → PR</button>
                </div>
                <input value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} aria-label="Название действия" placeholder="Название задачи" />
                <textarea value={actionInstruction} onChange={(event) => setActionInstruction(event.target.value)} aria-label="Инструкция для действия" placeholder="Что именно нужно сделать и как проверить результат?" rows={4} />
                <button className="prepare-action" type="button" onClick={prepareAction} disabled={!actionTitle.trim() || !actionInstruction.trim()}>Подготовить к подтверждению</button>
                {actionResult && <div className="action-result">{actionResult.text}{actionResult.url && <a href={actionResult.url} target="_blank" rel="noreferrer">Открыть ↗</a>}</div>}
              </section>
              {pendingAction && <section className="panel approval-panel"><span className="overline">Ожидаю решения Архитектора</span><h3>{pendingAction.title}</h3><p>{pendingAction.action === "codex.create_task" ? "Будет создан GitHub Issue и запущен Codex workflow. Результат — отдельная ветка и pull request." : "Будет создан GitHub Issue без изменения файлов."}</p><div><button type="button" onClick={cancelAction}>Отклонить</button><button className="approve" type="button" onClick={confirmAction} disabled={actionLoading}>{actionLoading ? "Выполняю…" : "Подтвердить"}</button></div></section>}
              <section className="panel event-panel"><div className="panel-title-row"><span className="overline">Журнал</span><span>последние события</span></div>{events.slice(0, 5).map((item) => <div className="event" key={item.id}><i /><p>{item.text}<small>{item.time}</small></p></div>)}</section>
            </aside>
          </div>
        )}

        {section === "projects" && <ProjectsView />}
        {section === "production" && <ProductionView tasks={tasks} />}
        {section === "store" && <StoreView />}
        {section === "archive" && <ArchiveView />}
      </section>
    </main>
  );
}

function ProjectsView() {
  return <section className="section-view"><div className="view-intro"><span className="overline">Карта Lumen</span><h2>Четыре активных контура</h2><p>Статусы пока рабочие, а не единая утверждённая машина переходов.</p></div><div className="project-grid">{projects.map((project) => <article className="project-card panel" key={project.code}><div><span>{project.code}</span><em>{project.status}</em></div><h3>{project.name}</h3><p>{project.note}</p><div className="progress"><i style={{ width: `${project.progress}%` }} /></div><small>{project.progress}%</small></article>)}</div></section>;
}

function ProductionView({ tasks }: { tasks: Task[] }) {
  const stages = ["Черновик", "Подтверждение", "Передача Codex", "Исполнение", "Проверка"];
  return <section className="section-view"><div className="view-intro"><span className="overline">Производственный цикл</span><h2>От решения к результату</h2><p>Ни одно внешнее действие не проходит без видимого статуса и контрольной точки.</p></div><div className="pipeline">{stages.map((stage, index) => <div key={stage}><span>0{index + 1}</span><strong>{stage}</strong></div>)}</div><div className="task-table panel"><div className="table-row table-head"><span>Код</span><span>Задача</span><span>Этап</span><span>Статус</span></div>{tasks.map((task) => <div className="table-row" key={task.id}><span>{task.id}</span><strong>{task.title}</strong><span>{task.stage}</span><em className={task.status}>{task.status === "active" ? "В работе" : task.status === "done" ? "Готово" : "Ожидает"}</em></div>)}</div></section>;
}

function StoreView() {
  return <section className="section-view"><div className="view-intro"><span className="overline">Lumen Store</span><h2>Первая коллекция</h2><p>Цены опубликованы как рабочие гипотезы. Реальный продукт считается готовым только после файла, инструкции и демонстрации.</p></div><div className="store-table panel">{storeProducts.map((product) => <div className="store-row" key={product[0]}><span>{product[0]}</span><strong>{product[1]}</strong><em>{product[2]}</em><div><i style={{ width: product[3] }} /></div><b>{product[3]}</b></div>)}</div><a className="external-link" href="https://lumen-store.kto-nazhal-play.chatgpt.site" target="_blank" rel="noreferrer">Открыть публичный магазин ↗</a></section>;
}

function ArchiveView() {
  const docs = [["CAN-001", "Канон Lumen", "Зафиксировано"], ["WS-001", "Workspace v0.1", "Актуально"], ["STR-001", "Store v0.1", "Актуально"], ["CTL-001", "Control v0.1", "В сборке"]];
  return <section className="section-view"><div className="view-intro"><span className="overline">Архив</span><h2>Память, которой можно доверять</h2><p>Чат остаётся местом мышления. Утверждённое состояние закрепляется в каноне и GitHub.</p></div><div className="archive-list panel">{docs.map((doc) => <div key={doc[0]}><span>{doc[0]}</span><strong>{doc[1]}</strong><em>{doc[2]}</em><b>↗</b></div>)}</div><a className="external-link" href="https://github.com/u6669271834-lab/Lumen" target="_blank" rel="noreferrer">Открыть источник истины ↗</a></section>;
}
