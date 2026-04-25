const http = require('http');

// ChaiBook's own user database
const users = [
  { id: 1, name: 'Kamal Hossain',  email: 'kamal@chaibook.com',   role: 'owner',   department: 'Management' },
  { id: 2, name: 'Fatima Begum',   email: 'fatima@chaibook.com',  role: 'cashier', department: 'Sales' },
  { id: 3, name: 'Rahim Uddin',    email: 'rahim@chaibook.com',   role: 'cashier', department: 'Sales' },
  { id: 4, name: 'Tania Akter',    email: 'tania@chaibook.com',   role: 'staff',   department: 'Inventory' },
  { id: 5, name: 'Jubayer Ali',    email: 'jubayer@chaibook.com', role: 'staff',   department: 'Inventory' },
];

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/api/users' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ users, total: users.length }));
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', app: 'chaibook' }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not found' }));
  }
});

server.listen(5050, () => {
  console.log('ChaiBook API running on http://localhost:5050');
  console.log('  GET /api/users  — returns 5 users');
  console.log('  GET /health     — health check');
});
