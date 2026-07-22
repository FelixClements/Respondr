function timestamp() {
  return new Date().toISOString();
}

function info(message) {
  console.log(`[${timestamp()}] [INFO] ${message}`);
}

function error(message) {
  console.error(`[${timestamp()}] [ERROR] ${message}`);
}

module.exports = { info, error };
