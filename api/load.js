export default async function handler(req, res) {
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = 'luxfajah'; 
    const REPO_NAME = 'travessias'; 
    const FILE_PATH = 'database.json'; 

    // Usamos a API de conteúdos para garantir que pegamos a versão mais fresca com o token
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?t=${Date.now()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw+json', // .raw retorna o conteúdo direto
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(200).json({ statuses: {}, comments: {} });
      }
      const errorText = await response.text();
      throw new Error(`Load Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Load Error:', error);
    res.status(500).json({ error: error.message });
  }
}
