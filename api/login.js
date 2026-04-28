export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { username, password } = req.body;

  // Autenticação simples baseada no script.js existente
  const validUsers = {
    'admin': process.env.ADMIN_PASSWORD || 'admin',
    'gabriellylima': process.env.USER_PASSWORD || 'gabrielly'
  };

  if (validUsers[username] && validUsers[username] === password) {
    return res.status(200).json({ success: true, username, token: `token_valid_${username}` });
  }

  return res.status(401).json({ success: false, error: 'Usuário ou senha incorretos' });
}
