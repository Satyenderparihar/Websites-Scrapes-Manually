// DeepX WebSocket Bridge Server
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";

export class DeepXWsBridge {
  constructor(port = 8792) {
    this.port = port;
    this.httpServer = null;
    this.wss = null;
    this.extensionClient = null;
    this.extensionClients = new Set();
    this.clients = new Map(); // ws -> { client, version, connectedAt, lastSeen, account, flowTabOpen, projectId, projectName, ready, connectionState }
    this.pendingCommands = new Map();
    this.progressListeners = new Map();
    this.extensionInfo = null;
    this.isManuallyDisconnected = false;
    this.zombieCleanerInterval = null;
  }

  getBestClient(preferredEmail = null) {
    if (this.isManuallyDisconnected) return null;
    let best = null;
    let bestScore = -Infinity;
    const now = Date.now();
    for (const [ws, data] of this.clients.entries()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      // Stale zombie socket guard: if no message received for >45s, do not consider active
      if (data.lastSeen && (now - data.lastSeen > 45000)) continue;

      let score = 0;
      const email = data.account?.email?.toLowerCase() || "";
      if (preferredEmail && email === preferredEmail.toLowerCase()) {
        score += 50000;
      }
      // Universal Active Flow Session Priority (Worldwide Production)
      if (data.flowTabOpen) score += 10000;
      if (data.projectId && data.projectId !== "default") score += 5000;
      if (data.account?.isLoggedIn) score += 2000;
      if (data.ready) score += 1000;
      if (data.account?.plan === "PRO") score += 500;
      
      // Penalties for non-Flow or locked profiles
      if (data.flowTabOpen === false) score -= 10000;
      if (data.isUnlocked === false || data.connectionState === "locked") score -= 100000;
      if (data.lastSeen) score += Math.min((data.lastSeen || 0) / 1e12, 100);

      if (score > bestScore) {
        bestScore = score;
        best = data;
      }
    }
    return best;
  }

  async probeSocketContext(ws) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      const probeId = "probe_" + randomUUID();
      const packet = JSON.stringify({ id: probeId, command: "status", payload: {} });
      const timer = setTimeout(() => {
        this.pendingCommands.delete(probeId);
      }, 4000);
      this.pendingCommands.set(probeId, {
        resolve: (res) => {
          clearTimeout(timer);
          if (res && typeof res === "object") {
            const cData = this.clients.get(ws);
            if (cData) {
              if (res.isUnlocked !== undefined) cData.isUnlocked = !!res.isUnlocked;
              if (res.flowTabOpen !== undefined) cData.flowTabOpen = !!res.flowTabOpen;
              if (res.account) cData.account = res.account;
              if (res.projectId) cData.projectId = res.projectId;
              if (res.projectName) cData.projectName = res.projectName;
              if (res.ready !== undefined) cData.ready = !!res.ready;
              if (res.connectionState) cData.connectionState = res.connectionState;
            }
            const best = this.getBestClient();
            if (best) {
              this.extensionClient = best.ws;
              this.extensionInfo = {
                client: best.client || "deepx-flow-extension",
                version: best.version || "1.2.0",
                connectedAt: best.connectedAt || Date.now(),
                account: best.account || null,
                flowTabOpen: !!best.flowTabOpen,
                projectId: best.projectId || null,
                ready: !!best.ready
              };
            }
            if (res.flowTabOpen) {
              console.error(`[DeepX Bridge] Active Flow Session Bound: ${res.account?.email || "User"} (Project: ${res.projectName || res.projectId || "Active"})`);
            }
          }
        },
        reject: () => {
          clearTimeout(timer);
        },
        timer
      });
      ws.send(packet);
    } catch (e) {
      // probe non-blocking
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = createServer((req, res) => {
          if (req.url === "/status") {
            const best = this.getBestClient();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              status: "ok",
              extensionConnected: this.isConnected(),
              connectedClients: this.clients.size,
              extensionInfo: this.extensionInfo || (best ? {
                client: best.client,
                version: best.version,
                account: best.account,
                flowTabOpen: best.flowTabOpen,
                projectId: best.projectId,
                ready: best.ready
              } : null)
            }, null, 2));
            return;
          }
          if (req.method === "POST" && (req.url === "/api/command" || req.url === "/command")) {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            req.on("end", async () => {
              try {
                const parsed = JSON.parse(body);
                if (parsed.command === "disconnect") {
                  this.isManuallyDisconnected = true;
                  for (const [ws] of this.clients.entries()) {
                    try { ws.close(1000, "Manually disconnected"); } catch {}
                  }
                  this.clients.clear();
                  this.extensionClients.clear();
                  this.extensionClient = null;
                  this.extensionInfo = null;
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ success: true, message: "Bridge disconnected manually." }));
                  return;
                }
                if (parsed.command === "connect") {
                  this.isManuallyDisconnected = false;
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ success: true, message: "Bridge connect enabled." }));
                  return;
                }
                const result = await this.sendCommand(parsed.command, parsed.payload || {}, parsed.timeout || 60000);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true, result }));
              } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }
          res.writeHead(404).end("Not found");
        });

        this.httpServer.on("error", async (err) => {
          if (err.code === "EADDRINUSE") {
            try {
              const probe = await fetch(`http://127.0.0.1:${this.port}/status`, { signal: AbortSignal.timeout(2000) });
              if (probe.ok) {
                const data = await probe.json();
                if (data.status === "ok") {
                  console.error(`[DeepX Bridge] Port ${this.port} is already active. Operating in proxy mode.`);
                  this.isProxy = true;
                  resolve();
                  return;
                }
              }
            } catch (e) {
              // Not a deepx bridge or request failed
            }
          }
          console.error(`[DeepX Bridge] Server error:`, err);
          reject(err);
        });

        this.httpServer.listen(this.port, () => {
          console.error(`[DeepX Bridge] Listening on http://127.0.0.1:${this.port} & ws://127.0.0.1:${this.port}/ws`);
          this.wss = new WebSocketServer({ server: this.httpServer, path: "/ws" });

          this.wss.on("error", (err) => {
            console.error("[DeepX Bridge] WebSocketServer error:", err);
          });

          if (!this.zombieCleanerInterval) {
            this.zombieCleanerInterval = setInterval(() => {
              const now = Date.now();
              for (const [ws, data] of this.clients.entries()) {
                if (ws.readyState !== WebSocket.OPEN || (data.lastSeen && now - data.lastSeen > 40000)) {
                  try { ws.terminate(); } catch {}
                  this.clients.delete(ws);
                  this.extensionClients.delete(ws);
                }
              }
              for (const ws of this.extensionClients) {
                if (ws.readyState !== WebSocket.OPEN) {
                  this.extensionClients.delete(ws);
                }
              }
            }, 10000);
          }

          this.wss.on("connection", (ws, req) => {
            if (this.isManuallyDisconnected) {
              console.error(`[DeepX Bridge] Rejecting connection from ${req.socket.remoteAddress} because bridge is manually disconnected.`);
              try { ws.close(1008, "Bridge is manually disconnected"); } catch {}
              return;
            }
            console.error(`[DeepX Bridge] Client connected from ${req.socket.remoteAddress}`);
            this.extensionClients.add(ws);
            setTimeout(() => this.probeSocketContext(ws), 200);

            ws.on("message", async (raw) => {
              try {
                const msg = JSON.parse(raw.toString("utf8"));
                await this.handleMessage(msg, ws);
              } catch (err) {
                console.error("[DeepX Bridge] Invalid JSON from client:", err);
              }
            });

            ws.on("close", () => {
              this.clients.delete(ws);
              this.extensionClients.delete(ws);
              const best = this.getBestClient();
              this.extensionClient = best ? best.ws : null;
              if (!this.extensionClient) {
                this.extensionInfo = null;
              } else {
                this.extensionInfo = {
                  client: best.client || "deepx-flow-extension",
                  version: best.version || "1.2.0",
                  connectedAt: best.connectedAt || Date.now(),
                  account: best.account || null,
                  flowTabOpen: !!best.flowTabOpen,
                  projectId: best.projectId || null,
                  ready: !!best.ready
                };
              }
              console.error(`[DeepX Bridge] Extension socket closed. Active connected profiles: ${this.clients.size}`);
            });

            ws.on("error", (err) => {
              console.error("[DeepX Bridge] Client connection error:", err);
            });
          });

          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async handleMessage(msg, ws) {
    // 1. Extension Hello Handshake
    if (msg.type === "HELLO" && (msg.client === "deepx-flow-extension" || msg.client?.includes("extension"))) {
      const clientData = {
        ws,
        client: msg.client,
        version: msg.version || "1.2.0",
        connectedAt: Date.now(),
        lastSeen: Date.now(),
        account: msg.account || null,
        flowTabOpen: !!msg.flowTabOpen,
        projectId: msg.projectId || null,
        projectName: msg.projectName || null,
        ready: !!msg.ready,
        connectionState: msg.connectionState || (msg.ready ? "ready" : "needs_attention")
      };
      this.clients.set(ws, clientData);
      this.extensionClients.add(ws);

      const best = this.getBestClient();
      this.extensionClient = best ? best.ws : ws;
      this.extensionInfo = {
        client: best?.client || msg.client,
        version: best?.version || msg.version,
        connectedAt: best?.connectedAt || Date.now(),
        account: best?.account || msg.account,
        flowTabOpen: best?.flowTabOpen ?? msg.flowTabOpen,
        projectId: best?.projectId || msg.projectId,
        ready: best?.ready ?? msg.ready
      };
      console.error(`[DeepX Bridge] Registered profile client: ${msg.client} v${msg.version} (Account: ${msg.account?.email || "unknown"}, flowOpen: ${!!msg.flowTabOpen}, ready: ${!!msg.ready})`);
      this.probeSocketContext(ws);
      return;
    }

    // 2. Client Manual Disconnect
    if (msg.type === "CLIENT_DISCONNECT") {
      this.clients.delete(ws);
      this.extensionClients.delete(ws);
      try { ws.close(1000, "Client disconnected"); } catch {}
      const best = this.getBestClient();
      this.extensionClient = best ? best.ws : null;
      if (!this.extensionClient) {
        this.extensionInfo = null;
      }
      console.error("[DeepX Bridge] Client disconnected manually via CLIENT_DISCONNECT.");
      return;
    }

    // 3. Periodic Heartbeat to maintain MV3 connection & state
    if (msg.type === "HEARTBEAT") {
      let clientData = this.clients.get(ws);
      if (!clientData) {
        clientData = { ws, client: msg.client || "deepx-flow-extension", version: msg.version || "1.2.0", connectedAt: Date.now() };
        this.clients.set(ws, clientData);
      }
      clientData.lastSeen = Date.now();
      if (msg.account) clientData.account = msg.account;
      if (typeof msg.flowTabOpen === "boolean") clientData.flowTabOpen = msg.flowTabOpen;
      if (msg.projectId !== undefined) clientData.projectId = msg.projectId;
      if (msg.projectName !== undefined) clientData.projectName = msg.projectName;
      if (msg.ready !== undefined) clientData.ready = msg.ready;
      if (msg.connectionState) clientData.connectionState = msg.connectionState;

      const best = this.getBestClient();
      this.extensionClient = best ? best.ws : ws;
      this.extensionInfo = {
        client: best?.client || clientData.client,
        version: best?.version || clientData.version,
        connectedAt: best?.connectedAt || clientData.connectedAt,
        account: best?.account || clientData.account,
        flowTabOpen: best?.flowTabOpen ?? clientData.flowTabOpen,
        projectId: best?.projectId || clientData.projectId,
        ready: best?.ready ?? clientData.ready
      };

      try {
        ws.send(JSON.stringify({ type: "HEARTBEAT_ACK", timestamp: Date.now() }));
      } catch {}
      return;
    }

    // 3. Status Probe (CLI or testing)
    if (msg.type === "PROBE_STATUS") {
      if (!this.isConnected()) {
        ws.send(JSON.stringify({
          type: "PROBE_STATUS_RESPONSE",
          extensionConnected: false,
          extensionInfo: null,
          flowTab: null
        }));
        return;
      }
      try {
        const flowTabStatus = await this.sendCommand("status", {}, 5000);
        ws.send(JSON.stringify({
          type: "PROBE_STATUS_RESPONSE",
          extensionConnected: true,
          extensionInfo: this.extensionInfo,
          flowTab: flowTabStatus
        }));
      } catch (err) {
        ws.send(JSON.stringify({
          type: "PROBE_STATUS_RESPONSE",
          extensionConnected: true,
          extensionInfo: this.extensionInfo,
          error: err.message
        }));
      }
      return;
    }

    // 4. Progress Update from Extension
    if (msg.type === "PROGRESS" && msg.id) {
      const listener = this.progressListeners.get(msg.id);
      if (listener) {
        listener(msg.progress);
      }
      return;
    }

    // 5. Response to a pending command from Extension
    if (msg.id && this.pendingCommands.has(msg.id)) {
      const { resolve, reject, timer } = this.pendingCommands.get(msg.id);
      clearTimeout(timer);
      this.pendingCommands.delete(msg.id);
      this.progressListeners.delete(msg.id);

      if (msg.success) {
        resolve(msg.result);
      } else {
        reject(new Error(msg.error || "Command execution failed in extension"));
      }
    }
  }

  isConnected() {
    if (this.isManuallyDisconnected) return false;
    if (this.isProxy && this.httpServer) return true;
    const best = this.getBestClient();
    return !!(best && best.ws && best.ws.readyState === WebSocket.OPEN);
  }

  async sendCommand(command, payload = {}, timeoutMs = 180000, onProgress = null) {
    if (this.isProxy) {
      try {
        const response = await fetch(`http://127.0.0.1:${this.port}/api/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, payload, timeout: timeoutMs }),
          signal: AbortSignal.timeout(Math.min(timeoutMs + 5000, 15000))
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Proxy command failed");
        }
        return data.result;
      } catch (err) {
        console.error(`[DeepX Bridge] Proxy command failed (${err.message}). Resetting proxy mode to reclaim port.`);
        this.isProxy = false;
        try {
          await this.start();
        } catch (e) {}
      }
    }

    if (!this.isConnected()) {
      // Grace period (up to 3s) allowing idle MV3 service worker or reconnecting tab to handshake
      const startWait = Date.now();
      while (!this.isConnected() && Date.now() - startWait < 3000) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    if (!this.isConnected()) {
      throw new Error(
        "DeepX Chrome Extension is not connected. Please ensure Chrome is running with the DeepX extension loaded and a Google Flow tab (https://flow.google.com) is open."
      );
    }

    // Determine target client via intelligent multi-profile scoring
    const bestClientObj = this.getBestClient(payload?.preferredEmail || payload?.email);
    let targetSocket = bestClientObj?.ws;
    if (!targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
      targetSocket = (this.extensionClient && this.extensionClient.readyState === WebSocket.OPEN)
        ? this.extensionClient
        : Array.from(this.extensionClients).find(c => c.readyState === WebSocket.OPEN);
    }

    if (!targetSocket) {
      throw new Error("No active Google Flow extension client connected.");
    }

    const executeOnSocket = (wsClient, timeout) => {
      const id = "cmd_" + randomUUID();
      const packet = JSON.stringify({ id, command, payload });

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingCommands.delete(id);
          this.progressListeners.delete(id);
          reject(new Error(`DeepX command '${command}' timed out after ${timeout / 1000}s`));
        }, timeout);

        this.pendingCommands.set(id, { resolve, reject, timer });
        if (onProgress) {
          this.progressListeners.set(id, onProgress);
        }

        try {
          wsClient.send(packet);
        } catch (sendErr) {
          this.pendingCommands.delete(id);
          this.progressListeners.delete(id);
          clearTimeout(timer);
          reject(sendErr);
        }
      });
    };

    try {
      const result = await executeOnSocket(targetSocket, timeoutMs);
      
      // Cache returned context in clientData for intelligent routing
      if (result && typeof result === "object") {
        const cData = this.clients.get(targetSocket);
        if (cData) {
          if (result.flowTabOpen !== undefined) cData.flowTabOpen = !!result.flowTabOpen;
          if (result.isUnlocked !== undefined) cData.isUnlocked = !!result.isUnlocked;
          if (result.account) cData.account = result.account;
          if (result.projectId) cData.projectId = result.projectId;
          if (result.projectName) cData.projectName = result.projectName;
          if (result.ready !== undefined) cData.ready = !!result.ready;
          if (result.connectionState) cData.connectionState = result.connectionState;
        }
      }

      // If status result indicates tab_not_found or locked but multiple profiles are connected, auto-failover!
      if (command === "status" && result && (result.flowTabOpen === false || result.connectionState === "locked" || result.isUnlocked === false) && this.clients.size > 1) {
        for (const [altSocket, altData] of this.clients.entries()) {
          if (altSocket !== targetSocket && altSocket.readyState === WebSocket.OPEN) {
            console.error(`[DeepX Bridge] Status not ready on profile (${result.account?.email || "unknown"}, locked: ${result.connectionState === "locked"}); probing alternative profile (${altData.account?.email || "alt"})...`);
            try {
              const altResult = await executeOnSocket(altSocket, 8000);
              if (altResult && typeof altResult === "object") {
                if (altResult.isUnlocked !== undefined) altData.isUnlocked = !!altResult.isUnlocked;
                if (altResult.flowTabOpen !== undefined) altData.flowTabOpen = !!altResult.flowTabOpen;
                if (altResult.account) altData.account = altResult.account;
                if (altResult.projectId) altData.projectId = altResult.projectId;
                if (altResult.projectName) altData.projectName = altResult.projectName;
                if (altResult.ready !== undefined) altData.ready = !!altResult.ready;
                if (altResult.connectionState) altData.connectionState = altResult.connectionState;
              }
              if (altResult && altResult.flowTabOpen && altResult.connectionState !== "locked" && altResult.isUnlocked !== false) {
                console.error(`[DeepX Bridge] Found active Flow tab on unlocked alternative profile (${altResult.account?.email})! Switching primary client.`);
                this.extensionClient = altSocket;
                return altResult;
              }
            } catch {}
          }
        }
      }
      return result;
    } catch (primaryErr) {
      // If error indicates no tab open or locked, attempt failover to another connected client if available
      const errMsg = primaryErr?.message || "";
      if ((errMsg.includes("No Google Flow tab") || errMsg.includes("tab_not_found") || errMsg.includes("LOCKED") || errMsg.includes("locked")) && this.clients.size > 1) {
        for (const [altSocket, altData] of this.clients.entries()) {
          if (altSocket !== targetSocket && altSocket.readyState === WebSocket.OPEN) {
            console.error(`[DeepX Bridge] Primary client failed (${errMsg}); failing over command '${command}' to alt profile (${altData.account?.email || "alt"})...`);
            try {
              const failoverResult = await executeOnSocket(altSocket, timeoutMs);
              if (failoverResult && typeof failoverResult === "object") {
                if (failoverResult.flowTabOpen !== undefined) altData.flowTabOpen = !!failoverResult.flowTabOpen;
                if (failoverResult.account) altData.account = failoverResult.account;
                if (failoverResult.projectId) altData.projectId = failoverResult.projectId;
              }
              this.extensionClient = altSocket;
              return failoverResult;
            } catch (failoverErr) {
              console.error("[DeepX Bridge] Failover client also failed:", failoverErr.message);
            }
          }
        }
      }
      throw primaryErr;
    }
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
  }
}
