/*
  ZAndwich client configuration.
  For GitHub Pages, keep this endpoint HTTPS-capable.
  Local development should use the local backend on localhost:3000.
*/
const ORACLE_API_HOST = '145.241.187.87:14532';
const isLocalOrigin = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || '') || window.location.protocol === 'file:';
const apiBase = isLocalOrigin
  ? 'http://localhost:3000/api'
  : `https://${ORACLE_API_HOST}/api`;

window.ZANDWICH_CONFIG = {
  apiBase
};
