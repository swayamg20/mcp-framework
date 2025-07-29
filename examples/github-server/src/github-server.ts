import { BaseMCPServer, type BaseMCPServerOptions } from '@sg20/mcp-oauth-framework/base';
import { type OAuthProvider } from '@sg20/mcp-oauth-framework';

export class GitHubMCPServer extends BaseMCPServer {
  constructor() {
    const githubProvider: OAuthProvider = {
      name: 'github',
      clientId: process.env.GITHUB_CLIENT_ID || '',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scope: ['repo', 'user:email', 'read:org'],
      additionalParams: {
        allow_signup: 'false'
      }
    };

    // Add client secret if provided
    if (process.env.GITHUB_CLIENT_SECRET) {
      githubProvider.clientSecret = process.env.GITHUB_CLIENT_SECRET;
    }

    const options: BaseMCPServerOptions = {
      name: 'github-mcp-server',
      version: '1.0.0',
      providers: [githubProvider],
      debug: process.env.DEBUG === 'true'
    };

    super(options);
  }

  protected async initialize(): Promise<void> {
    this.log('Initializing GitHub MCP Server...');
    
    // Validate environment variables
    if (!process.env.GITHUB_CLIENT_ID) {
      throw new Error('GITHUB_CLIENT_ID environment variable is required');
    }

    // Register all GitHub tools
    this.registerGitHubTools();
    
    this.log('GitHub MCP Server initialized successfully');
  }

  protected async cleanup(): Promise<void> {
    this.log('Cleaning up GitHub MCP Server...');
    // Add any cleanup logic here
  }

  private registerGitHubTools(): void {
    // User information tools
    this.addTool({
      name: 'get-user',
      description: 'Get information about the authenticated user',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['user:email']
      },
      handler: this.getUser.bind(this)
    });

    this.addTool({
      name: 'get-user-profile',
      description: 'Get public profile information for any GitHub user',
      handler: this.getUserProfile.bind(this)
    });

    // Repository tools
    this.addTool({
      name: 'list-repos',
      description: 'List repositories for the authenticated user',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.listRepositories.bind(this)
    });

    this.addTool({
      name: 'get-repo',
      description: 'Get detailed information about a specific repository',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.getRepository.bind(this)
    });

    this.addTool({
      name: 'create-repo',
      description: 'Create a new repository',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.createRepository.bind(this)
    });

    // Issues tools
    this.addTool({
      name: 'list-issues',
      description: 'List issues for a repository',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.listIssues.bind(this)
    });

    this.addTool({
      name: 'create-issue',
      description: 'Create a new issue in a repository',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.createIssue.bind(this)
    });

    this.addTool({
      name: 'update-issue',
      description: 'Update an existing issue',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.updateIssue.bind(this)
    });

    // Pull Request tools
    this.addTool({
      name: 'list-pull-requests',
      description: 'List pull requests for a repository',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.listPullRequests.bind(this)
    });

    this.addTool({
      name: 'create-pull-request',
      description: 'Create a new pull request',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.createPullRequest.bind(this)
    });

    // File operations
    this.addTool({
      name: 'get-file-content',
      description: 'Get the content of a file from a repository',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.getFileContent.bind(this)
    });

    this.addTool({
      name: 'create-or-update-file',
      description: 'Create or update a file in a repository',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.createOrUpdateFile.bind(this)
    });

    // Search tools
    this.addTool({
      name: 'search-repositories',
      description: 'Search for repositories on GitHub',
      handler: this.searchRepositories.bind(this)
    });

    this.addTool({
      name: 'search-code',
      description: 'Search for code in repositories',
      auth: {
        required: true,
        provider: 'github',
        scopes: ['repo']
      },
      handler: this.searchCode.bind(this)
    });
  }

  // User Tools
  private async getUser(params: any, context: any) {
    const response = await this.makeAuthenticatedRequest(
      'github',
      'https://api.github.com/user',
      {},
      ['user:email']
    );
    return await response.json();
  }

  private async getUserProfile(params: any, context: any) {
    const { username } = params;
    if (!username) {
      throw new Error('Username parameter is required');
    }

    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-MCP-Server/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // Repository Tools
  private async listRepositories(params: any, context: any) {
    const { type = 'all', sort = 'updated', per_page = 30, page = 1 } = params;
    
    const url = new URL('https://api.github.com/user/repos');
    url.searchParams.set('type', type);
    url.searchParams.set('sort', sort);
    url.searchParams.set('per_page', per_page.toString());
    url.searchParams.set('page', page.toString());

    const response = await this.makeAuthenticatedRequest(
      'github',
      url.toString(),
      {},
      ['repo']
    );
    
    return await response.json();
  }

  private async getRepository(params: any, context: any) {
    const { owner, repo } = params;
    if (!owner || !repo) {
      throw new Error('Both owner and repo parameters are required');
    }

    const response = await this.makeAuthenticatedRequest(
      'github',
      `https://api.github.com/repos/${owner}/${repo}`,
      {},
      ['repo']
    );

    return await response.json();
  }

  private async createRepository(params: any, context: any) {
    const { name, description, private: isPrivate = false, auto_init = true } = params;
    if (!name) {
      throw new Error('Repository name is required');
    }

    const response = await this.makeAuthenticatedRequest(
      'github',
      'https://api.github.com/user/repos',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          private: isPrivate,
          auto_init
        })
      },
      ['repo']
    );

    return await response.json();
  }

  // Issues Tools
  private async listIssues(params: any, context: any) {
    const { owner, repo, state = 'open', per_page = 30, page = 1 } = params;
    if (!owner || !repo) {
      throw new Error('Both owner and repo parameters are required');
    }

    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues`);
    url.searchParams.set('state', state);
    url.searchParams.set('per_page', per_page.toString());
    url.searchParams.set('page', page.toString());

    const response = await this.makeAuthenticatedRequest(
      'github',
      url.toString(),
      {},
      ['repo']
    );

    return await response.json();
  }

  private async createIssue(params: any, context: any) {
    const { owner, repo, title, body, assignees, labels } = params;
    if (!owner || !repo || !title) {
      throw new Error('Owner, repo, and title parameters are required');
    }

    const response = await this.makeAuthenticatedRequest(
      'github',
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          body,
          assignees,
          labels
        })
      },
      ['repo']
    );

    return await response.json();
  }

  private async updateIssue(params: any, context: any) {
    const { owner, repo, issue_number, title, body, state, assignees, labels } = params;
    if (!owner || !repo || !issue_number) {
      throw new Error('Owner, repo, and issue_number parameters are required');
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (body) updateData.body = body;
    if (state) updateData.state = state;
    if (assignees) updateData.assignees = assignees;
    if (labels) updateData.labels = labels;

    const response = await this.makeAuthenticatedRequest(
      'github',
      `https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      },
      ['repo']
    );

    return await response.json();
  }

  // Pull Request Tools
  private async listPullRequests(params: any, context: any) {
    const { owner, repo, state = 'open', per_page = 30, page = 1 } = params;
    if (!owner || !repo) {
      throw new Error('Both owner and repo parameters are required');
    }

    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`);
    url.searchParams.set('state', state);
    url.searchParams.set('per_page', per_page.toString());
    url.searchParams.set('page', page.toString());

    const response = await this.makeAuthenticatedRequest(
      'github',
      url.toString(),
      {},
      ['repo']
    );

    return await response.json();
  }

  private async createPullRequest(params: any, context: any) {
    const { owner, repo, title, head, base, body, draft = false } = params;
    if (!owner || !repo || !title || !head || !base) {
      throw new Error('Owner, repo, title, head, and base parameters are required');
    }

    const response = await this.makeAuthenticatedRequest(
      'github',
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          head,
          base,
          body,
          draft
        })
      },
      ['repo']
    );

    return await response.json();
  }

  // File Operations
  private async getFileContent(params: any, context: any) {
    const { owner, repo, path, ref = 'main' } = params;
    if (!owner || !repo || !path) {
      throw new Error('Owner, repo, and path parameters are required');
    }

    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
    if (ref) url.searchParams.set('ref', ref);

    const response = await this.makeAuthenticatedRequest(
      'github',
      url.toString(),
      {},
      ['repo']
    );

    const data = await response.json();
    
    // Decode base64 content if it's a file
    if (data.type === 'file' && data.content) {
      data.decoded_content = Buffer.from(data.content, 'base64').toString('utf-8');
    }

    return data;
  }

  private async createOrUpdateFile(params: any, context: any) {
    const { owner, repo, path, message, content, branch = 'main', sha } = params;
    if (!owner || !repo || !path || !message || !content) {
      throw new Error('Owner, repo, path, message, and content parameters are required');
    }

    const requestBody: any = {
      message,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      branch
    };

    if (sha) {
      requestBody.sha = sha;
    }

    const response = await this.makeAuthenticatedRequest(
      'github',
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      },
      ['repo']
    );

    return await response.json();
  }

  // Search Tools
  private async searchRepositories(params: any, context: any) {
    const { q, sort, order = 'desc', per_page = 30, page = 1 } = params;
    if (!q) {
      throw new Error('Query parameter (q) is required');
    }

    const url = new URL('https://api.github.com/search/repositories');
    url.searchParams.set('q', q);
    if (sort) url.searchParams.set('sort', sort);
    url.searchParams.set('order', order);
    url.searchParams.set('per_page', per_page.toString());
    url.searchParams.set('page', page.toString());

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-MCP-Server/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async searchCode(params: any, context: any) {
    const { q, sort, order = 'desc', per_page = 30, page = 1 } = params;
    if (!q) {
      throw new Error('Query parameter (q) is required');
    }

    const url = new URL('https://api.github.com/search/code');
    url.searchParams.set('q', q);
    if (sort) url.searchParams.set('sort', sort);
    url.searchParams.set('order', order);
    url.searchParams.set('per_page', per_page.toString());
    url.searchParams.set('page', page.toString());

    const response = await this.makeAuthenticatedRequest(
      'github',
      url.toString(),
      {},
      ['repo']
    );

    return await response.json();
  }
}