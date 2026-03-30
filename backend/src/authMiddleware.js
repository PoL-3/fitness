const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Нужен заголовок Authorization: Bearer <token>' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = Number(payload.sub);
    if (!req.userId) {
      return res.status(401).json({ ok: false, error: 'Неверный токен' });
    }
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Токен просрочен или неверный' });
  }
}

module.exports = { authMiddleware };
