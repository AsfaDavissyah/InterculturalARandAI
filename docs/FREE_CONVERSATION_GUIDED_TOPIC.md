# Free Conversation Guided Topic

## Experience

- Topic: `Free Conversation`
- Setting: `GENERAL-FREE-CONVERSATION`
- AI partner: Daniel Moore
- Realtime voice: `cedar`
- Completion: manual through the flag button
- Required objectives: none
- Recommended evidence: at least five confirmed student responses and 30 words

The learner speaks first and controls the subject. Daniel follows the learner's
latest intent, answers directly, and permits natural topic changes. The prompt
does not impose scenario stages or quietly redirect toward predetermined goals.

## Assessment

Free Conversation still uses grammar, vocabulary, fluency, politeness,
pragmatic appropriateness, and intercultural awareness. A session remains
`Insufficient evidence` until the normal evidence threshold is met. Since the
mode intentionally has no objectives, objective coverage does not block an
otherwise valid assessment.

## Deployment

After deploying the backend commit, run the idempotent seed script once:

```bash
cd /opt/engora/app/backend
node scripts/seed_topics_and_settings.js
pm2 restart engora-api --update-env
pm2 save
```

The seed uses insert-only upserts, so existing dashboard edits are preserved.
