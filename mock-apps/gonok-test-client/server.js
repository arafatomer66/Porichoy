const http = require('http');
const crypto = require('crypto');
const url = require('url');

const PORT = 3333;
const PORICHOY_API = 'http://localhost:3400';
const PORICHOY_UI = 'http://localhost:3401';
const CLIENT_ID = 'gonok-web';
const REDIRECT_URI = 'http://localhost:3333/auth/callback';

// In-memory store (single user for demo)
var codeVerifier = null;

var homePage = [
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Gonok — ERP for Small Business</title>',
  '<style>',
  '*{margin:0;padding:0;box-sizing:border-box}',
  'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center}',
  '.container{max-width:480px;width:100%;padding:2rem}',
  'h1{font-size:2.2rem;margin-bottom:.25rem;color:#f8fafc;text-align:center}',
  '.tagline{color:#64748b;text-align:center;margin-bottom:2.5rem;font-size:.95rem}',
  '.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:2rem;text-align:center}',
  '.card-icon{width:64px;height:64px;background:linear-gradient(135deg,#38bdf8,#818cf8);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:28px}',
  '.card p{color:#94a3b8;font-size:.9rem;margin-bottom:1.5rem;line-height:1.6}',
  '.sso-btn{display:flex;align-items:center;justify-content:center;gap:.75rem;width:100%;padding:.9rem 1.5rem;background:#2563eb;color:white;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;text-decoration:none;transition:all .2s}',
  '.sso-btn:hover{background:#3b82f6;transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.3)}',
  '.sso-btn svg{width:20px;height:20px}',
  '.divider{display:flex;align-items:center;gap:1rem;margin:1.5rem 0;color:#475569;font-size:.8rem}',
  '.divider::before,.divider::after{content:"";flex:1;border-top:1px solid #334155}',
  '.features{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-top:1.5rem}',
  '.feature{background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:.6rem;font-size:.75rem;color:#64748b;text-align:left}',
  '.feature span{color:#94a3b8;font-weight:500}',
  '.powered{text-align:center;margin-top:1.5rem;font-size:.75rem;color:#475569}',
  '.powered a{color:#38bdf8;text-decoration:none}',
  '</style></head><body>',
  '<div class="container">',
  '<h1>Gonok</h1>',
  '<div class="tagline">ERP for Small Business</div>',
  '<div class="card">',
  '<div class="card-icon">G</div>',
  '<p>Manage your sales, finance, and inventory all in one place. Sign in with your company identity to continue.</p>',
  '<a class="sso-btn" href="/auth/login">',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>',
  'Sign in with Porichoy SSO',
  '</a>',
  '<div class="divider">powered by</div>',
  '<div class="powered"><a href="http://localhost:3401" target="_blank">Porichoy</a> Identity &amp; Access Management</div>',
  '</div>',
  '<div class="features">',
  '<div class="feature"><span>Sales</span><br>Transactions &amp; approvals</div>',
  '<div class="feature"><span>Finance</span><br>Reports &amp; compliance</div>',
  '<div class="feature"><span>Inventory</span><br>Stock management</div>',
  '<div class="feature"><span>Audit</span><br>Full trail &amp; reports</div>',
  '</div>',
  '</div>',
  '</body></html>',
].join('\n');

function buildDashboard(tokenData) {
  var decoded = {};
  try {
    var parts = tokenData.access_token.split('.');
    decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch (e) {
    decoded = { error: 'Could not decode' };
  }
  var ent = decoded.entitlements || [];

  // Build permission cards based on entitlements
  var permCards = '';
  var canDo = { transactions: [], finance: [], inventory: [], reports: [] };
  ent.forEach(function(e) {
    var p = e.split(':');
    var mod = p[1] || 'unknown';
    var act = p[2] || 'unknown';
    if (canDo[mod]) canDo[mod].push(act);
  });

  var modules = [
    { key: 'transactions', name: 'Sales & Transactions', icon: '💰', color: '#22c55e' },
    { key: 'finance', name: 'Finance', icon: '📊', color: '#3b82f6' },
    { key: 'inventory', name: 'Inventory', icon: '📦', color: '#f59e0b' },
    { key: 'reports', name: 'Reports', icon: '📋', color: '#8b5cf6' },
  ];

  modules.forEach(function(m) {
    var actions = canDo[m.key] || [];
    var hasAccess = actions.length > 0;
    permCards += '<div style="background:' + (hasAccess ? '#1e293b' : '#0f172a') + ';border:1px solid ' + (hasAccess ? '#334155' : '#1e293b') + ';border-radius:12px;padding:1.25rem;' + (hasAccess ? '' : 'opacity:.4') + '">';
    permCards += '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.75rem">';
    permCards += '<span style="font-size:1.3rem">' + m.icon + '</span>';
    permCards += '<span style="font-weight:600;color:' + (hasAccess ? '#f8fafc' : '#64748b') + '">' + m.name + '</span>';
    permCards += '</div>';
    if (hasAccess) {
      actions.forEach(function(a) {
        permCards += '<span style="display:inline-block;background:#065f46;color:#34d399;padding:2px 10px;border-radius:12px;font-size:.75rem;font-weight:600;margin:2px">' + a + '</span>';
      });
    } else {
      permCards += '<span style="font-size:.8rem;color:#475569">No access</span>';
    }
    permCards += '</div>';
  });

  return [
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Gonok — Dashboard</title>',
    '<style>',
    '*{margin:0;padding:0;box-sizing:border-box}',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}',
    '.topbar{background:#1e293b;border-bottom:1px solid #334155;padding:0 2rem;height:56px;display:flex;align-items:center;justify-content:space-between}',
    '.topbar-brand{font-size:1.2rem;font-weight:700;color:#f8fafc}',
    '.topbar-user{display:flex;align-items:center;gap:.75rem}',
    '.avatar{width:32px;height:32px;background:linear-gradient(135deg,#38bdf8,#818cf8);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:.8rem;color:white}',
    '.user-name{font-size:.9rem;font-weight:500}',
    '.user-email{font-size:.75rem;color:#64748b}',
    '.logout-btn{background:#334155;color:#94a3b8;border:none;padding:.4rem .8rem;border-radius:6px;font-size:.8rem;cursor:pointer;margin-left:.5rem}',
    '.logout-btn:hover{background:#475569;color:#e2e8f0}',
    '.main{max-width:900px;margin:0 auto;padding:2rem}',
    '.welcome{margin-bottom:2rem}',
    '.welcome h1{font-size:1.5rem;color:#f8fafc;margin-bottom:.25rem}',
    '.welcome p{color:#64748b;font-size:.9rem}',
    '.section{margin-bottom:2rem}',
    '.section h2{font-size:1rem;color:#94a3b8;margin-bottom:1rem;text-transform:uppercase;letter-spacing:.05em;font-weight:600}',
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}',
    '.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:1.5rem}',
    '.card h3{font-size:.9rem;color:#38bdf8;margin-bottom:1rem;border-bottom:1px solid #334155;padding-bottom:.5rem}',
    '.field{display:flex;justify-content:space-between;padding:.3rem 0;font-size:.85rem}',
    '.field-l{color:#64748b}',
    '.field-v{color:#f8fafc;font-weight:500;text-align:right;max-width:60%;overflow:hidden;text-overflow:ellipsis}',
    '.badge{display:inline-block;background:#1e3a5f;color:#38bdf8;padding:2px 8px;border-radius:12px;font-size:.7rem;font-weight:600;margin:2px}',
    'pre{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:1rem;font-size:.7rem;color:#64748b;overflow-x:auto;max-height:200px;overflow-y:auto}',
    '.token-box{background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:.5rem;word-break:break-all;font-size:.65rem;color:#475569;max-height:60px;overflow-y:auto;margin-top:.5rem}',
    '.sso-badge{display:inline-flex;align-items:center;gap:.4rem;background:#1e293b;border:1px solid #334155;padding:.3rem .8rem;border-radius:20px;font-size:.75rem;color:#94a3b8;margin-top:.75rem}',
    '.sso-badge .dot{width:8px;height:8px;background:#22c55e;border-radius:50%}',
    '@media(max-width:640px){.grid{grid-template-columns:1fr}}',
    '</style></head><body>',
    '<div class="topbar">',
    '<span class="topbar-brand">Gonok</span>',
    '<div class="topbar-user">',
    '<div class="avatar">' + ((decoded.name || '?').charAt(0).toUpperCase()) + '</div>',
    '<div><div class="user-name">' + (decoded.name || 'User') + '</div><div class="user-email">' + (decoded.email || '') + '</div></div>',
    '<a class="logout-btn" href="/">Sign out</a>',
    '</div></div>',
    '<div class="main">',
    '<div class="welcome">',
    '<h1>Welcome back, ' + ((decoded.name || 'User').split(' ')[0]) + '</h1>',
    '<p>You\'re signed in via Porichoy SSO. Your permissions are loaded from your JWT.</p>',
    '<div class="sso-badge"><span class="dot"></span> Authenticated via Porichoy SSO</div>',
    '</div>',
    '<div class="section">',
    '<h2>Your Modules & Permissions</h2>',
    '<div class="grid">' + permCards + '</div>',
    '</div>',
    '<div class="section">',
    '<h2>Session Details</h2>',
    '<div class="grid">',
    '<div class="card"><h3>Identity (from JWT)</h3>',
    '<div class="field"><span class="field-l">Name</span><span class="field-v">' + (decoded.name || '-') + '</span></div>',
    '<div class="field"><span class="field-l">Email</span><span class="field-v">' + (decoded.email || '-') + '</span></div>',
    '<div class="field"><span class="field-l">UUID</span><span class="field-v" style="font-size:.7rem">' + (decoded.sub || '-') + '</span></div>',
    '<div class="field"><span class="field-l">Admin</span><span class="field-v">' + (decoded.is_admin ? 'Yes' : 'No') + '</span></div>',
    '<div class="field"><span class="field-l">Audience</span><span class="field-v">' + (decoded.aud || '-') + '</span></div>',
    '<div class="field"><span class="field-l">Expires</span><span class="field-v">' + (decoded.exp ? new Date(decoded.exp * 1000).toLocaleString() : '-') + '</span></div>',
    '</div>',
    '<div class="card"><h3>Entitlements in JWT</h3>',
    '<p style="font-size:.8rem;color:#64748b;margin-bottom:.75rem">Baked in by Porichoy\'s Token Bridge at login time:</p>',
    (ent.length > 0 ? ent.map(function(e) { return '<span class="badge">' + e + '</span>'; }).join('') : '<span style="color:#475569;font-size:.8rem">No entitlements</span>'),
    '</div>',
    '</div></div>',
    '<div class="section">',
    '<h2>Raw JWT Payload</h2>',
    '<pre>' + JSON.stringify(decoded, null, 2) + '</pre>',
    '</div>',
    '<div class="section">',
    '<h2>Raw Tokens</h2>',
    '<div class="card">',
    '<h3>Access Token</h3><div class="token-box">' + tokenData.access_token + '</div>',
    '<h3 style="margin-top:1rem">Refresh Token</h3><div class="token-box">' + tokenData.refresh_token + '</div>',
    '</div></div>',
    '</div>',
    '</body></html>',
  ].join('\n');
}

function buildErrorPage(title, detail) {
  return [
    '<!DOCTYPE html><html><head><title>Error</title>',
    '<style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}',
    '.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:2rem;max-width:500px}',
    'h1{color:#ef4444;margin-bottom:1rem}pre{background:#0f172a;padding:1rem;border-radius:8px;font-size:.8rem;color:#94a3b8;overflow-x:auto;white-space:pre-wrap}',
    'a{color:#38bdf8}</style></head>',
    '<body><div class="card"><h1>' + title + '</h1><pre>' + detail + '</pre><br><a href="/">Try again</a></div></body></html>',
  ].join('\n');
}

var server = http.createServer(async function(req, res) {
  var parsed = url.parse(req.url, true);

  // Home / landing page
  if (parsed.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(homePage);
    return;
  }

  // Initiate PKCE flow — redirect browser to Porichoy's OAuth authorize page
  if (parsed.pathname === '/auth/login' && req.method === 'GET') {
    codeVerifier = crypto.randomBytes(32).toString('base64url');
    var codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    var state = crypto.randomBytes(16).toString('hex');

    // Redirect to Porichoy's FRONTEND (not the API) — this is the SSO experience
    var authUrl = PORICHOY_UI + '/oauth/authorize'
      + '?client_id=' + CLIENT_ID
      + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI)
      + '&response_type=code'
      + '&scope=' + encodeURIComponent('openid profile email entitlements')
      + '&code_challenge=' + codeChallenge
      + '&code_challenge_method=S256'
      + '&state=' + state;

    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  // OAuth callback — exchange auth code for JWT
  if (parsed.pathname === '/auth/callback' && req.method === 'GET') {
    var code = parsed.query.code;
    var error = parsed.query.error;

    if (error) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(buildErrorPage('Access Denied', 'You denied access to Gonok.\n\nError: ' + error));
      return;
    }
    if (!code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(buildErrorPage('No Authorization Code', 'No code received from Porichoy.'));
      return;
    }
    if (!codeVerifier) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(buildErrorPage('Session Expired', 'PKCE code_verifier not found. Please try again.'));
      return;
    }

    try {
      var tokenRes = await fetch(PORICHOY_API + '/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI,
          code_verifier: codeVerifier,
          client_id: CLIENT_ID,
        }),
      });
      var tokenData = await tokenRes.json();

      if (tokenData.error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(buildErrorPage('Token Exchange Failed', JSON.stringify(tokenData, null, 2)));
        return;
      }

      codeVerifier = null;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(buildDashboard(tokenData));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(buildErrorPage('Error', err.message));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, function() {
  console.log('');
  console.log('=================================');
  console.log('  Gonok Test Client');
  console.log('  http://localhost:' + PORT);
  console.log('=================================');
  console.log('');
  console.log('This simulates a real app that uses Porichoy SSO.');
  console.log('Click "Sign in with Porichoy SSO" to start the PKCE flow.');
  console.log('');
});
