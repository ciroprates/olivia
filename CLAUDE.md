## Agent skills

### Issue tracker

Issues are tracked as GitHub issues in `ciroprates/olivia`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

`CONTEXT.md` is the canonical glossary — the single source of truth for the domain language. Use its terms (e.g. **Transação**, not "item"; **Parcela**, not "recorrente") in code, comments, and docs, and keep it up to date as the language evolves. Do not duplicate its definitions elsewhere.
