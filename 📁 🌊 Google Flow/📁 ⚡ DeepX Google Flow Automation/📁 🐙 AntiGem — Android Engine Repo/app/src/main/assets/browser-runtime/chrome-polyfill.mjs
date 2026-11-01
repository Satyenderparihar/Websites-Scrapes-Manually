import { createChromeAPI } from './chrome-api.mjs';
// One API surface for every extension context; platform operations live in the host.
export function createChromePolyfill({ extension, context, host }) {
  const client = createChromeAPI({ id: extension.id, manifest: extension.manifest, contextType: context.type,
    contextId: context.id, resourceBase: host.resourceBase(extension), rpc: (method, args) => host.request(context, method, args) });
  context.client = client; return client.chrome;
}
