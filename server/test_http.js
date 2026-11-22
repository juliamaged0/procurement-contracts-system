const http = require('http');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { UserId: 1, Username: 'sa', Role: 'Admin', FullName: 'المشرف العام' },
  'ASDCO_PROCUREMENT_JWT_SUPER_SECRET_KEY_2026',
  { expiresIn: '8h' }
);

console.log('JWT Token ready.');
