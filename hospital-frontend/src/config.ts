// src/config.js

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export const API_URL = isLocalhost 
  ? 'http://localhost:8080' // (Change this to whatever your local backend port usually is)
  : 'https://hospitalsystem-x5md.onrender.com';