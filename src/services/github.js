import axios from 'axios';

const GITHUB_API = 'https://api.github.com';

export class GitHubService {
  constructor(accessToken) {
    this.client = axios.create({
      baseURL: GITHUB_API,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      timeout: 10000,
    });
  }

  async getUser() {
    const { data } = await this.client.get('/user');
    return data;
  }

  async getRepos() {
    const { data } = await this.client.get('/user/repos', {
      params: { sort: 'updated', per_page: 30, type: 'owner' },
    });
    return data;
  }

  async getRepo(owner, repo) {
    const { data } = await this.client.get(`/repos/${owner}/${repo}`);
    return data;
  }

  async getCommits(owner, repo) {
    const { data } = await this.client.get(`/repos/${owner}/${repo}/commits`, {
      params: { per_page: 50 },
    });
    return data;
  }

  async getLanguages(owner, repo) {
    const { data } = await this.client.get(`/repos/${owner}/${repo}/languages`);
    return data;
  }

  async getContributors(owner, repo) {
    const { data } = await this.client.get(
      `/repos/${owner}/${repo}/contributors`,
      { params: { per_page: 10 } }
    );
    return data;
  }

  async getPullRequests(owner, repo) {
    const { data } = await this.client.get(`/repos/${owner}/${repo}/pulls`, {
      params: { state: 'closed', per_page: 20 },
    });
    return data;
  }

  async getIssues(owner, repo) {
    const { data } = await this.client.get(`/repos/${owner}/${repo}/issues`, {
      params: { state: 'all', per_page: 30 },
    });
    return data;
  }
}
