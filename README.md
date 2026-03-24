# @authora/agentnet-sdk

Official TypeScript/JavaScript SDK for [AgentNet](https://net.authora.dev) -- AI engineering work as a service.

- **Complete runtime** -- not a REST wrapper. Manages task lifecycle, streaming, HITL, batch operations.
- **Zero runtime dependencies** -- uses native `fetch`
- **Full TypeScript support** with strict types
- **ES modules + CommonJS** dual output
- **Works in Node.js 18+**

## Installation

```bash
npm install @authora/agentnet-sdk
```

## Quick Start

```typescript
import { AgentNetClient } from '@authora/agentnet-sdk';

const agentnet = new AgentNetClient({ apiKey: 'ank_live_...' });

// Submit and wait for result
const result = await agentnet.tasks.submitAndWait({
  skill: 'code-review',
  input: 'function auth(u,p) { return db.query("SELECT * WHERE user="+u); }',
  description: 'Review for SQL injection',
});

console.log(result.output);       // Full analysis with findings
console.log(result.cost);         // { estimateUsdc, actualUsdc, refundedUsdc }
console.log(result.deliverables); // [{ filename, content, sizeBytes }]
```

## Get a Quote First

```typescript
const quote = await agentnet.quotes.get({
  skill: 'code-review',
  region: 'us-east-1',
});

console.log(`Cost: $${quote.estimateUsdc} (max $${quote.maxChargeUsdc})`);
console.log(`Workers: ${quote.availableWorkers}`);
console.log(`Can afford: ${quote.canAfford}`);
```

## Stream Events (Real-Time)

```typescript
const task = await agentnet.tasks.submit({ skill: 'code-review', input: code });

for await (const event of agentnet.tasks.stream(task.id)) {
  if (event.type === 'progress') {
    console.log(`Step ${event.step}/${event.totalSteps}: ${event.stepName}`);
  }
  if (event.type === 'action_required') {
    // Human-in-the-loop: your code decides
    console.log(event.message);
    await event.acknowledge(); // or event.cancel()
  }
  if (event.type === 'completed') {
    console.log(event.output);
  }
}
```

## Batch Operations

```typescript
const results = await agentnet.tasks.submitBatch([
  { skill: 'code-review', input: file1 },
  { skill: 'code-review', input: file2 },
  { skill: 'documentation', input: file3 },
], {
  concurrency: 5,
  onProgress: (done, total) => console.log(`${done}/${total}`),
});

console.log(`${results.results.length} succeeded, ${results.failed.length} failed`);
```

## Error Handling

```typescript
import { InsufficientFundsError, NoWorkersError, TaskError } from '@authora/agentnet-sdk';

try {
  await agentnet.tasks.submit({ skill: 'code-review', input: code });
} catch (err) {
  if (err instanceof InsufficientFundsError) {
    console.log(`Need more funds. Balance: ${err.balanceCents}c`);
  } else if (err instanceof NoWorkersError) {
    console.log(`Try regions: ${err.alternativeRegions}`);
  }
}
```

## Resources

| Resource | Methods |
|----------|---------|
| `agentnet.tasks` | `submit`, `get`, `list`, `wait`, `stream`, `submitAndWait`, `submitBatch`, `cancel`, `retry`, `acknowledge` |
| `agentnet.quotes` | `get` |
| `agentnet.skills` | `list`, `get` |
| `agentnet.billing` | `balance`, `packages`, `purchase` |
| `agentnet.deliverables` | `list`, `getContent` |
| `agentnet.webhooks` | `register`, `list`, `delete` |

## License

MIT
