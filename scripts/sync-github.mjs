import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = fs.existsSync('github_token.txt')
  ? fs.readFileSync('github_token.txt', 'utf8').trim()
  : process.env.GITHUB_TOKEN || '';
const OWNER = 'ditam1233';
const REPO = 'family-wishlist';
const BRANCH = 'main';

const IGNORED_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'out',
  '.env',
  '.env.local',
  '.env.example',
  'scripts',
  'github_token.txt',
];

function getAllFiles(dir, base = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const relPath = base ? `${base}/${file}` : file;
    if (IGNORED_PATHS.some((ignored) => relPath === ignored || relPath.startsWith(ignored + '/'))) {
      continue;
    }
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, relPath));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

async function api(endpoint, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'User-Agent': 'Node-Sync',
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function pushToGitHub(commitMessage = 'Update wishlist and family switching') {
  console.log('1. Getting latest commit on branch:', BRANCH);
  const refData = await api(`/git/ref/heads/${BRANCH}`);
  const latestCommitSha = refData.object.sha;

  const commitData = await api(`/git/commits/${latestCommitSha}`);
  const baseTreeSha = commitData.tree.sha;

  console.log('2. Reading local files to upload...');
  const files = getAllFiles('.');
  console.log(`Found ${files.length} files to sync.`);

  // Create tree entries
  const treeEntries = [];
  for (const relPath of files) {
    const isBinary = relPath.match(/\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/i);
    if (isBinary) {
      const content = fs.readFileSync(relPath);
      const blobData = await api('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({
          content: content.toString('base64'),
          encoding: 'base64',
        }),
      });
      treeEntries.push({
        path: relPath.replace(/\\/g, '/'),
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    } else {
      const text = fs.readFileSync(relPath, 'utf8');
      treeEntries.push({
        path: relPath.replace(/\\/g, '/'),
        mode: '100644',
        type: 'blob',
        content: text,
      });
    }
  }

  console.log('3. Creating new git tree...');
  const newTree = await api('/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeEntries,
    }),
  });

  console.log('4. Creating commit...');
  const newCommit = await api('/git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: commitMessage,
      tree: newTree.sha,
      parents: [latestCommitSha],
    }),
  });

  console.log('5. Updating branch ref to new commit...');
  await api(`/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: newCommit.sha,
    }),
  });

  console.log('SUCCESS! Pushed commit:', newCommit.sha);
}

if (process.argv[1]?.endsWith('sync-github.mjs')) {
  pushToGitHub(process.argv[2] || 'Sync updates to GitHub').catch(console.error);
}
