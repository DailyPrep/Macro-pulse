// Clean Start Script - Kills process on port 3000 and starts server
const { exec } = require('child_process');
const { spawn } = require('child_process');

console.log('🔍 Checking for processes on port 3000...');

// Find and kill processes on port 3000 (Windows)
exec('netstat -ano | findstr :3000', (err, stdout) => {
  if (stdout) {
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== 'PID' && !isNaN(pid)) {
        pids.add(pid);
      }
    });
    
    if (pids.size > 0) {
      console.log(`⚠️  Found ${pids.size} process(es) on port 3000. Killing...`);
      pids.forEach(pid => {
        exec(`taskkill /F /PID ${pid}`, (killErr) => {
          if (!killErr) {
            console.log(`   ✅ Killed process ${pid}`);
          }
        });
      });
      
      // Wait 1 second for processes to be killed
      setTimeout(() => {
        startServer();
      }, 1000);
    } else {
      startServer();
    }
  } else {
    console.log('✅ No processes found on port 3000');
    startServer();
  }
});

function startServer() {
  console.log('🚀 Starting server...\n');
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });
  
  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...');
    server.kill('SIGINT');
    process.exit(0);
  });
}

