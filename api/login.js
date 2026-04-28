export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { username, password } = req.body;

  // Autenticação simples baseada no script.js existente
  const validUsers = {
    // Admin variations
    'admin@duasmaos.com.br': 'T7v#S26!Adm9Xp',
    'admin@duasmãos.com.br': 'T7v#S26!Adm9Xp',
    'admin': 'T7v#S26!Adm9Xp',
    
    // Client variations
    'travessias@duasmaos.com.br': 'travessias2026',
    'travessias@duasmãos.com.br': 'travessias2026',
    'travessias': 'travessias2026'
  };

  const userLower = username?.toLowerCase().trim();
  if (validUsers[userLower] && validUsers[userLower] === password) {
    return res.status(200).json({ success: true, username: userLower, token: `token_valid_${userLower.replace(/[^a-z0-9]/g, '')}` });
  }

  return res.status(401).json({ success: false, error: 'Usuário ou senha incorretos' });
}
