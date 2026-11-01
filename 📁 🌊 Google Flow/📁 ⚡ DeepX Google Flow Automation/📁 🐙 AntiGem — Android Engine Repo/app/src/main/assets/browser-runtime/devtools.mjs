import net from 'node:net';
import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

function address(endpoint) {
  if (endpoint.socket) return { path: '\0' + endpoint.socket };
  const url = new URL(endpoint.url); return { host: url.hostname, port: Number(url.port || 80) };
}
export async function listTargets(endpoint) {
  return new Promise((resolve, reject) => {
    const options = endpoint.socket ? { socketPath: '\0' + endpoint.socket, path: '/json/list', headers: { Host: 'localhost' } } : new URL('/json/list', endpoint.url);
    const req = http.get(options, res => {
      let data = ''; res.on('data', d => data += d); res.on('end', () => { try { if (res.statusCode !== 200) throw new Error(data); resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }); req.on('error', reject); req.setTimeout(5000, () => req.destroy(new Error('WebView DevTools discovery timed out')));
  });
}
export class DevToolsConnection extends EventEmitter {
  constructor() { super(); this.pending = new Map(); this.counter = 0; this.closed = false; this.buffer = Buffer.alloc(0); this.fragments = []; }
  static async connect(endpoint, targetId) {
    const connection = new DevToolsConnection();
    await connection.open(endpoint, targetId); return connection;
  }
  async open(endpoint, targetId) {
    return new Promise((resolve, reject) => {
      const key = randomBytes(16).toString('base64'); let upgraded = false;
      const socket = this.socket = net.createConnection(address(endpoint));
      const timer = setTimeout(() => socket.destroy(new Error('DevTools handshake timed out')), 5000);
      socket.on('connect', () => socket.write(`GET /devtools/page/${encodeURIComponent(targetId)} HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`));
      socket.on('data', data => {
        this.buffer = Buffer.concat([this.buffer, data]);
        if (!upgraded) {
          const end = this.buffer.indexOf('\r\n\r\n'); if (end < 0) return;
          const headers = this.buffer.subarray(0, end).toString(); this.buffer = this.buffer.subarray(end + 4);
          const expected = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
          if (!/^HTTP\/1.1 101\b/.test(headers) || !headers.toLowerCase().includes(`sec-websocket-accept: ${expected}`.toLowerCase())) { socket.destroy(new Error('WebView rejected the DevTools connection')); return; }
          upgraded = true; clearTimeout(timer); resolve();
        }
        try { this.readFrames(); } catch (error) { socket.destroy(error); }
      });
      socket.on('error', error => { clearTimeout(timer); reject(error); this.fail(error); });
      socket.on('close', () => { clearTimeout(timer); if (!upgraded) reject(new Error('DevTools socket closed during handshake')); this.fail(new Error('WebView DevTools connection closed')); });
    });
  }
  readFrames() {
    while (this.buffer.length >= 2) {
      const b = this.buffer; const opcode = b[0] & 15, final = !!(b[0] & 128), masked = !!(b[1] & 128); let size = b[1] & 127, offset = 2;
      if (size === 126) { if (b.length < 4) return; size = b.readUInt16BE(2); offset = 4; }
      else if (size === 127) { if (b.length < 10) return; const n = b.readBigUInt64BE(2); if (n > 128n * 1024n * 1024n) throw new Error('DevTools frame exceeds 128 MiB'); size = Number(n); offset = 10; }
      const mask = masked ? b.subarray(offset, offset + 4) : null; if (masked) offset += 4;
      if (b.length < offset + size) return;
      const payload = Buffer.from(b.subarray(offset, offset + size)); this.buffer = b.subarray(offset + size);
      if (mask) for (let i = 0; i < size; i++) payload[i] ^= mask[i % 4];
      if (opcode === 8) { this.close(); return; } if (opcode === 9) { this.writeFrame(payload, 10); continue; } if (opcode === 10) continue;
      if (opcode === 1 || opcode === 0) { this.fragments.push(payload); if (!final) continue; const value = JSON.parse(Buffer.concat(this.fragments).toString()); this.fragments = [];
        if (value.id) { const waiter = this.pending.get(value.id); if (waiter) { this.pending.delete(value.id); clearTimeout(waiter.timer); value.error ? waiter.reject(new Error(`${value.error.message}${value.error.data ? ': ' + value.error.data : ''}`)) : waiter.resolve(value.result || {}); } }
        else if (value.method) this.emit('event', value.method, value.params || {});
      }
    }
  }
  writeFrame(data, opcode = 1) {
    if (this.closed) throw new Error('DevTools connection is closed');
    const mask = randomBytes(4), length = data.length; let head;
    if (length < 126) head = Buffer.from([128 | opcode, 128 | length]);
    else if (length <= 65535) { head = Buffer.alloc(4); head[0] = 128 | opcode; head[1] = 254; head.writeUInt16BE(length, 2); }
    else { head = Buffer.alloc(10); head[0] = 128 | opcode; head[1] = 255; head.writeBigUInt64BE(BigInt(length), 2); }
    const payload = Buffer.from(data); for (let i = 0; i < length; i++) payload[i] ^= mask[i % 4];
    this.socket.write(Buffer.concat([head, mask, payload]));
  }
  send(method, params = {}, timeout = 60000) {
    if (this.closed) return Promise.reject(new Error('DevTools connection is closed'));
    return new Promise((resolve, reject) => { const id = ++this.counter; const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} timed out`)); }, timeout);
      this.pending.set(id, { resolve, reject, timer }); try { this.writeFrame(Buffer.from(JSON.stringify({ id, method, params }))); } catch (e) { clearTimeout(timer); this.pending.delete(id); reject(e); }
    });
  }
  fail(error) { if (this.closed) return; this.closed = true; for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(error); } this.pending.clear(); this.emit('closed', error); }
  close() { this.socket?.destroy(); this.fail(new Error('DevTools connection closed')); }
}
