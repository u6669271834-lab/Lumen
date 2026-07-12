export const runtime = "nodejs";

type ActionName = "github.create_issue" | "codex.create_task";

type ActionRequest = {
  action?: ActionName;
  approved?: boolean;
  title?: string;
  instruction?: string;
};

const owner = process.env.GITHUB_OWNER || "u6669271834-lab";
const repo = process.env.GITHUB_REPO || "Lumen";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function githubRequest(path: string, init: RequestInit = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("github_not_configured");

  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "lumen-control",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

async function createIssue(title: string, instruction: string) {
  const response = await githubRequest(`/repos/${owner}/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify({
      title,
      body: [
        "## Задача Lumen Control",
        "",
        instruction,
        "",
        "---",
        "Создано через подтверждённый Action Gateway Lumen Control.",
        "Прямые изменения `main`, автоматический merge и release запрещены.",
      ].join("\n"),
    }),
  });

  if (!response.ok) throw new Error(`github_issue_${response.status}`);
  return response.json() as Promise<{ number: number; html_url: string }>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ActionRequest;
    const title = cleanText(body.title, 140);
    const instruction = cleanText(body.instruction, 6000);

    if (body.approved !== true) {
      return Response.json({ error: "Требуется подтверждение Архитектора" }, { status: 409 });
    }
    if (!title || !instruction) {
      return Response.json({ error: "Нужны название и инструкция" }, { status: 400 });
    }
    if (body.action !== "github.create_issue" && body.action !== "codex.create_task") {
      return Response.json({ error: "Действие не входит в разрешённый список" }, { status: 400 });
    }
    if (!process.env.GITHUB_TOKEN) {
      return Response.json({ error: "GitHub ещё не подключён к серверному контуру" }, { status: 503 });
    }

    const issue = await createIssue(title, instruction);

    if (body.action === "codex.create_task") {
      if (process.env.CODEX_AUTOMATION_ENABLED !== "true") {
        return Response.json(
          {
            status: "issue_created",
            issueNumber: issue.number,
            issueUrl: issue.html_url,
            notice: "Codex workflow ещё не активирован",
          },
          { status: 202 },
        );
      }

      const dispatch = await githubRequest(`/repos/${owner}/${repo}/dispatches`, {
        method: "POST",
        body: JSON.stringify({
          event_type: "lumen_codex_task",
          client_payload: {
            issue_number: issue.number,
            instruction,
            source: "lumen-control",
          },
        }),
      });

      if (!dispatch.ok) throw new Error(`github_dispatch_${dispatch.status}`);
      return Response.json({
        status: "codex_queued",
        issueNumber: issue.number,
        issueUrl: issue.html_url,
      });
    }

    return Response.json({
      status: "issue_created",
      issueNumber: issue.number,
      issueUrl: issue.html_url,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "action_failed";
    const status = code === "github_not_configured" ? 503 : 502;
    return Response.json({ error: "Внешнее действие не выполнено", code }, { status });
  }
}
