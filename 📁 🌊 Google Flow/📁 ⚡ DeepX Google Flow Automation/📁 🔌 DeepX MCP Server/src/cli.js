// DeepX CLI Tool
import { program } from "commander";
import { WebSocket } from "ws";

const VERSION = "1.0.0";

program
  .name("deepx-auto")
  .description("DeepX CLI for Google Flow automation & Antigravity bridge")
  .version(VERSION);

program
  .command("status")
  .description("Check DeepX bridge and Google Flow session connection")
  .action(async () => {
    const wsUrl = "ws://127.0.0.1:8792/ws";
    console.log(`Connecting to DeepX bridge at ${wsUrl}...`);

    let done = false;
    const ws = new WebSocket(wsUrl);

    const timer = setTimeout(() => {
      if (!done) {
        console.log("NOT CONNECTED: DeepX bridge is not running on port 8792.");
        console.log("DeepX MCP server will be launched automatically by Antigravity via mcp_config.json.");
        process.exit(1);
      }
    }, 3000);

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "PROBE_STATUS" }));
    });

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString("utf8"));
        if (data.type === "PROBE_STATUS_RESPONSE") {
          done = true;
          clearTimeout(timer);

          console.log("\nRAW DATA:", JSON.stringify(data, null, 2));
          console.log("\n==========================================");
          console.log("        DeepX Flow Bridge Status          ");
          console.log("==========================================");
          console.log(`DeepX Bridge:     RUNNING (Port 8792)`);
          console.log(`Extension:        ${data.extensionConnected ? "CONNECTED ✅" : "NOT CONNECTED ❌"}`);

          if (data.flowTab) {
            const acc = data.flowTab.account;
            const userStr = acc?.email ? `${acc.accountName || "User"} (${acc.email}) [${acc.plan || "Standard"}]` : (acc?.isLoggedIn ? (acc.accountName || "Google User") : "NOT SIGNED IN ❌");
            console.log(`Google Account:   ${userStr}`);
            console.log(`Connection State: ${(data.flowTab.connectionState || "UNKNOWN").toUpperCase()} ${data.flowTab.ready ? "🟢" : "⚠️"}`);
            console.log(`Google Flow Tab:  ${data.flowTab.flowTabOpen ? "OPEN ✅" : "NOT OPEN ❌"}`);
            console.log(`Extension Toggle: ${data.flowTab.flowActive ? "ON (Active) 🟢" : "OFF (Standby) ⚪"}`);
            console.log(`Project ID:       ${data.flowTab.projectId || "None (Open a project in Flow)"}`);
            console.log(`Session Token:    ${data.flowTab.hasToken ? "CAPTURED ✅" : "COOKIE SESSION ONLY (Will capture on first action)"}`);
            if (data.flowTab.stateReason) {
              console.log(`State Info:       ${data.flowTab.stateReason}`);
            }
          } else {
            console.log(`Google Flow Tab:  Awaiting Extension Connection`);
          }
          console.log("==========================================\n");

          if (data.extensionConnected && data.flowTab?.ready) {
            console.log("Connected! I can generate images and videos on Google Flow now — just ask.");
          } else if (data.flowTab?.stateReason) {
            console.log(`Action needed: ${data.flowTab.stateReason}`);
          } else if (!data.extensionConnected) {
            console.log("Action needed: Load the DeepX extension in Chrome and open https://flow.google.com");
          }

          ws.close();
          process.exit(0);
        }
      } catch (err) {
        console.error("Error parsing response:", err);
        ws.close();
        process.exit(1);
      }
    });

    ws.on("error", () => {
      if (!done) {
        clearTimeout(timer);
        console.log("NOT CONNECTED: DeepX bridge is not reachable.");
        process.exit(1);
      }
    });
  });

program.parse(process.argv);
