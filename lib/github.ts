import "server-only";
import { Octokit } from "octokit";

export type GitHubRepoConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
};

export function getGitHubRepoConfig(): GitHubRepoConfig {
  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.CONTENT_REPO_OWNER?.trim();
  const repo = process.env.CONTENT_REPO_NAME?.trim() || "component-library";
  const branch = process.env.CONTENT_REPO_BRANCH?.trim() || "main";

  if (!token || !owner || !repo) {
    throw new Error("GITHUB_TOKEN and CONTENT_REPO_OWNER are required.");
  }

  return { token, owner, repo, branch };
}

export function createGitHubClient(config = getGitHubRepoConfig()) {
  return new Octokit({
    auth: config.token,
  });
}
