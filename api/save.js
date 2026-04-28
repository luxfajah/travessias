export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { data, username, token } = req.body;
  
  // 1. Camada de Segurança simples
  if (!username || !token) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: 'Erro de Configuração: GITHUB_TOKEN não encontrado nas variáveis de ambiente da Vercel.' });
    }

    const REPO_OWNER = 'luxfajah'; 
    const REPO_NAME = 'travessias'; 
    const FILE_PATH = 'database.json'; 

    // 2. Resgata o "sha" atual do arquivo (com cache-busting para evitar erro 409)
    const getRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });

    let sha;
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    } else if (getRes.status !== 404) {
      const errorText = await getRes.text();
      throw new Error(`GitHub API Error (GET): ${getRes.status} ${errorText}`);
    }

    // 3. Converte os dados em string base64
    const newContent = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

    // 4. Salva (Commit) os dados no GitHub
    const putRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update database [skip ci]', 
        content: newContent,
        sha: sha
      })
    });

    if (!putRes.ok) {
      const errorText = await putRes.text();
      throw new Error(`GitHub API Error (PUT): ${putRes.status} ${errorText}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Save Error:', error);
    res.status(500).json({ error: error.message });
  }
}
