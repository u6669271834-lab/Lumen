export const runtime = "nodejs";

const owner = process.env.GITHUB_OWNER || "u6669271834-lab";
const repo = process.env.GITHUB_REPO || "Lumen";

export async function GET() {
  const openai = Boolean(process.env.OPENAI_API_KEY);
  const token = process.env.GITHUB_TOKEN;
  let github = false;

  if (token) {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "lumen-control",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      });
      github = response.ok;
    } catch {
      github = false;
    }
  }

  return Response.json(
    {
      openai,
      github,
      codex: github && process.env.CODEX_AUTOMATION_ENABLED === "true",
      repository: `${owner}/${repo}`,
      policy: "issue-or-pr-only",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
