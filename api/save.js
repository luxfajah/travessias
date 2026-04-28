export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { data, username, token } = req.body;
  
  // 1. Camada de Segurança simples
  if (!username || !token) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: 'Erro de Configuração: GITHUB_TOKEN não encontrado.' });
      }

      const REPO_OWNER = 'luxfajah'; 
      const REPO_NAME = 'travessias'; 
      const FILE_PATH = 'database.json'; 

      // 1. Resgata o "sha" atual
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
        throw new Error(`GitHub GET Error: ${getRes.status} ${errorText}`);
      }

      // 2. Prepara e Salva
      const newContent = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
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

      if (putRes.status === 409 && attempts < maxAttempts - 1) {
        // Conflito de SHA, tenta novamente
        attempts++;
        await new Promise(r => setTimeout(r, 1000)); // Espera 1s antes de tentar novamente
        continue;
      }

      if (!putRes.ok) {
        const errorText = await putRes.text();
        throw new Error(`GitHub PUT Error: ${putRes.status} ${errorText}`);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Save Error:', error);
      if (attempts >= maxAttempts - 1) {
        return res.status(500).json({ error: error.message });
      }
      attempts++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
