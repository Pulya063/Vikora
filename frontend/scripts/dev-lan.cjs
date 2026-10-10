const { spawn } = require('node:child_process');

const server = spawn(process.execPath, [
  require.resolve('next/dist/bin/next'),
  'dev', '--hostname', '0.0.0.0', ...process.argv.slice(2),
], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_DEV_DIST_DIR: '.next-lan' },
});

server.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
server.on('exit', (code) => { process.exitCode = code ?? 1; });
