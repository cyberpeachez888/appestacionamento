export function requirePrinterAgent(req, res, next) {
  const sharedSecret = process.env.PRINTER_AGENT_SECRET;
  if (!sharedSecret) {
    return res.status(503).json({ error: 'Printer agent integration not configured' });
  }

  const providedSecret =
    req.headers['x-printer-agent-key'] ||
    req.headers['x-printer-agent-secret'] ||
    req.query.agentKey ||
    req.body?.agentKey;

  if (!providedSecret || providedSecret !== sharedSecret) {
    return res.status(401).json({ error: 'Invalid printer agent credentials' });
  }

  const agentId =
    req.headers['x-printer-agent-id'] ||
    req.query.agentId ||
    req.body?.agentId ||
    req.headers['user-agent'];

  req.printerAgentId = agentId;
  next();
}

