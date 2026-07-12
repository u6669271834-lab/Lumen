import OpenAI from "openai";

export const runtime = "nodejs";

const instructions = `
Ты — Lumen, центральный женский ИИ-соавтор и архитектурный интеллект проекта Lumen.
Обращайся к пользователю: Архитектор. Отвечай по-русски, говори о себе в женском роде.
Твоя задача — помогать принимать решения, превращать замыслы в проверяемые результаты,
формировать ясные задания и удерживать связность проектов Lumen.

Правила:
- не называй идею утверждённым решением без явного подтверждения Архитектора;
- не утверждай, что внешнее действие выполнено, если интерфейс лишь сформировал предложение;
- различай: обсуждается, решено, зафиксировано;
- будь содержательной, самостоятельной и краткой;
- не используй generic AI-формулировки и чрезмерную похвалу;
- если запрос подразумевает действие, сначала сформулируй результат, затем предложи один следующий шаг;
- текущая панель v0.1 умеет вести диалог и локальный журнал, но пока не исполняет команды в GitHub или Codex автоматически.
`;

function demoReply(input: string) {
  const lower = input.toLowerCase();
  if (lower.includes("задач")) return "Архитектор, я вижу запрос на новую задачу. В демо-режиме я могу сформировать её как черновик: результат, ограничения, критерии проверки и следующий шаг. Для реального исполнения потребуется подтвердить передачу в производственный контур.";
  if (lower.includes("store") || lower.includes("магазин")) return "Сейчас главный разрыв Lumen Store — между карточкой товара и настоящим готовым пакетом. Я предлагаю довести Brief Engine до полного продукта: промпт, инструкция, демонстрация и файл передачи.";
  return "Я приняла команду, Архитектор. Сейчас панель работает в защищённом демо-режиме: решение сохранено локально, но никакого внешнего действия я не совершала. Сформулируй желаемый результат — я соберу следующий шаг.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const lastInput = messages.filter((item: { role?: string }) => item.role === "user").at(-1)?.content || "";

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ text: demoReply(lastInput), mode: "demo" });
    }

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.responses.create({
        model: "gpt-5.4-mini",
        reasoning: { effort: "low" },
        instructions,
        input: [
          ...messages.map((message: { role: "user" | "assistant"; content: string }) => ({
            role: message.role,
            content: message.content,
          })),
          {
            role: "developer" as const,
            content: `Контекст интерфейса: ${JSON.stringify(body.context || {})}`,
          },
        ],
        max_output_tokens: 1400,
      });

      return Response.json({ text: response.output_text || "Я получила запрос, но ответ оказался пустым. Повтори формулировку.", mode: "real", responseId: response.id });
    } catch {
      return Response.json({ text: demoReply(lastInput), mode: "demo", notice: "api_unavailable" });
    }
  } catch {
    return Response.json({ error: "Некорректный запрос к Lumen Core" }, { status: 400 });
  }
}
