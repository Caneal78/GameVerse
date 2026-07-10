const { spawn, execSync } = require("child_process");
const path = require("path");
const os = require("os");

const projectRoot = path.resolve(__dirname, "..");
const port = process.env.DEV_PORT || "5173";
let viteProcess = null;
let electronProcess = null;
let shuttingDown = false;

function log(...args) {
  console.log("[dev-runner]", ...args);
}

function killProcess(pid) {
  if (!pid || pid === process.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGTERM");
    }
  } catch (error) {
    // ignore failures for already-dead processes
  }
}

function killPort(portToKill) {
  try {
    if (process.platform === "win32") {
      const stdout = execSync(
        `netstat -ano | findstr /R /C:":${portToKill} " /C:":${portToKill}$"`,
        { encoding: "utf8" },
      );
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== String(process.pid)) {
          log(`Killing stale process ${pid} listening on port ${portToKill}`);
          killProcess(pid);
        }
      });
    } else {
      const stdout = execSync(
        `lsof -i tcp:${portToKill} -sTCP:LISTEN -t || true`,
        { encoding: "utf8" },
      );
      const pids = stdout.split(/\r?\n/).filter(Boolean);
      pids.forEach((pid) => {
        if (pid && pid !== String(process.pid)) {
          log(`Killing stale process ${pid} listening on port ${portToKill}`);
          killProcess(pid);
        }
      });
    }
  } catch (error) {
    // No stale process or platform-specific command failed.
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("Shutting down...");
  if (electronProcess) {
    killProcess(electronProcess.pid);
  }
  if (viteProcess) {
    killProcess(viteProcess.pid);
  }
  killPort(port);
  process.exit(exitCode);
}

function spawnChild(command, args, options) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: "development" },
    shell: process.platform === "win32",
    ...options,
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });
  child.on("close", (code) => {
    if (!shuttingDown) {
      shutdown(code || 0);
    }
  });
  return child;
}

function startElectron() {
  log("Starting Electron...");
  electronProcess = spawnChild("npm", ["run", "dev:electron"]);
}

function startVite() {
  log(`Killing any stale port ${port} owner before starting Vite...`);
  killPort(port);
  log("Starting Vite...");
  viteProcess = spawnChild("npm", ["run", "dev:vite"]);

  viteProcess.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    if (
      /ready in/.test(text) ||
      /Local:\s+http:\/\/localhost:${port}/.test(text)
    ) {
      startElectron();
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("uncaughtException", (err) => {
  console.error(err);
  shutdown(1);
});
process.on("unhandledRejection", (reason) => {
  console.error(reason);
  shutdown(1);
});

startVite();
