# Agents

Each LLM agent lives in `agents/<name>/` and follows the same convention as
features (see `docs/architecture.md`).

## Folder layout

```
agents/<name>/
├── skills.md         # contract: purpose, can / cannot do, inputs, outputs
├── system-prompt.md  # prompt sent to LLM at runtime
├── config.ts         # model, temperature, max tokens, OmniBits cap
├── tools/            # functions the agent can call
└── index.ts          # invoke(input) → output OR stream
```

## Invocation

All agents share the same call shape:

```ts
agent.invoke(input, { stream?: boolean })
  → load skills.md + system-prompt.md
  → call lib/openrouter (with OmniBits metering wrapper)
  → return result (background) OR stream tokens (chat)
```

## When to add an agent

1. Write `skills.md` first — this is both the contract and the runtime context.
2. Add `system-prompt.md` and `config.ts`.
3. Implement `index.ts` calling `lib/openrouter` (which wraps OmniBits).
4. Wire its trigger:
   - **Inline** — server actions / Convex actions (user-driven).
   - **Scheduled** — Convex scheduled functions (cron-like).

No agents exist yet. v1 stub.
