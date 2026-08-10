const net = require('net');
const https = require('https');

const IS_BUILD = process.env.NODE_ENV === 'production' || process.env.BUILD === 'true';

const BACKEND_DEV  = { host: 'localhost', port: 8090, label: 'http://localhost:8090' };
const BACKEND_PROD = { host: 'tryironflow.com', port: 443, label: 'https://tryironflow.com' };

const BACKEND = IS_BUILD ? BACKEND_PROD : BACKEND_DEV;
const TIMEOUT_MS = 5000;

function checkTcpConnection(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(TIMEOUT_MS);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')); });
    socket.on('error', (err) => { socket.destroy(); reject(err); });
    socket.connect(port, host);
  });
}

module.exports = async function globalSetup() {
  try {
    await checkTcpConnection(BACKEND.host, BACKEND.port);
    console.log(`\n✅  Backend detectado en ${BACKEND.label}\n`);
  } catch {
    const border = '═'.repeat(62);
    const startCmd = IS_BUILD
      ? '      (el backend de producción debe estar activo)'
      : '      docker compose up -d    (desde el directorio ironflow/)';

    throw new Error(
      `\n${border}\n` +
      `  ❌  BACKEND NO DISPONIBLE\n` +
      `${border}\n\n` +
      `  Los tests requieren el backend corriendo en:\n\n` +
      `      ${BACKEND.label}\n\n` +
      `  Inicia el backend antes de ejecutar los tests:\n\n` +
      `${startCmd}\n\n` +
      `${border}\n`
    );
  }
};
