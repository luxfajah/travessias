export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { username, password } = req.body;

  // Autenticação simples baseada no script.js existente
  const validUsers = {
    'admin@duasmaos.com.br': process.env.ADMIN_PASSWORD || 'T7v#S26!Adm9Xp',
    'admin@duasmãos.com.br': process.env.ADMIN_PASSWORD || 'T7v#S26!Adm9Xp',
    'travessias@duasmaos.com.br': process.env.USER_PASSWORD || 'travessias2026'
  };

  const userLower = username?.toLowerCase();
  if (validUsers[userLower] && validUsers[userLower] === password) {
    return res.status(200).json({ success: true, username: userLower, token: `token_valid_${userLower.split('@')[0]}` });
  }

  return res.status(401).json({ success: false, error: 'Usuário ou senha incorretos' });
}
