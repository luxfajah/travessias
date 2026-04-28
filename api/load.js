export default async function handler(req, res) {
  try {
    const REPO_OWNER = 'luxfajah'; 
    const REPO_NAME = 'travessias'; 
    const FILE_PATH = 'database.json'; 

    // Bate diretamente no raw do github para não pegar cache do Vercel/Next
    // Passando um timestamp para forçar bypass total de cache do Github
    const timestamp = new Date().getTime();
    const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}?t=${timestamp}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) return res.status(200).json({}); // Retorna vazio caso o arquivo ainda não exista
      throw new Error('Falha ao carregar');
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
