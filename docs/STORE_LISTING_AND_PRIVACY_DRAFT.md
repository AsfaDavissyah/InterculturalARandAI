# Engora Store Listing and Privacy Draft

Dokumen ini adalah draf operasional, bukan nasihat hukum. Client sebagai publisher dan pengendali data harus memeriksa serta menyetujuinya sebelum dipublikasikan.

## Store Listing Draft

**App name:** Engora

**Short description:** Practice intercultural English conversations with guided AI partners.

**Full description:**

Engora is an AI-assisted intercultural English speaking practice application. Students can practice guided topics, structured scenarios, and free conversations with virtual partners. Speech recognition helps capture spoken responses, while session history and assessment features help students and lecturers review practice progress.

Key capabilities include guided speaking practice, scenario-based conversations, optional AR presentation, realtime voice interaction, transcript review, objective tracking, and lecturer-authorized research review.

Engora supports learning and research activities. AI responses and assessments may be inaccurate and should not be treated as professional, legal, medical, or academic decisions.

## Asset Checklist

- [ ] Final app icon and adaptive icon.
- [ ] Android phone screenshots from the release build.
- [ ] Feature graphic for Google Play.
- [ ] iPhone screenshots for each required display size.
- [ ] Optional iPad screenshots only if iPad distribution is supported.
- [ ] Support website and support email.
- [ ] Privacy policy URL.
- [ ] Account deletion URL.
- [ ] Reviewer demo account and review instructions.
- [ ] Explanation of microphone, camera, speech recognition, AI, and AR use.

## Privacy Policy Draft Structure

### 1. Identity of the Data Controller

Publisher/data controller: `[CLIENT LEGAL NAME]`

Address: `[CLIENT ADDRESS]`

Privacy contact: `[PRIVACY EMAIL]`

### 2. Data Collected

Depending on enabled features, Engora may process:

- account and participant identity data;
- research consent status and lecturer relationship;
- microphone audio while the user is speaking;
- speech transcripts confirmed or submitted by the user;
- AI partner responses and conversation history;
- scenario, topic, objective, score, feedback, duration, turn, latency, and end-reason metadata;
- technical logs required for reliability, security, and abuse prevention;
- camera imagery used locally to present AR content when AR is enabled.

The final policy must explicitly state whether raw audio and camera frames are stored. If they are not stored, say so clearly and ensure the implementation matches that statement.

### 3. Purposes

- provide conversational English practice;
- generate and play AI responses;
- produce learning feedback and progress records;
- permit authorized lecturer review;
- support consented research activities;
- maintain security, reliability, and cost controls.

### 4. Service Providers

The final policy should name or categorize the providers actually used in production, including:

- OpenAI for AI conversation, speech, and assessment features;
- MongoDB Atlas for application and research records;
- the client-owned VPS/provider for backend processing;
- Vercel for the authorized dashboard, if retained in production;
- Google and Apple for application distribution and platform services.

### 5. Research Participation

Research consent must be voluntary and separate from ordinary acceptance of app terms. The policy should explain withdrawal, whether previously analyzed data can be removed, and who can access the research dataset.

### 6. Retention and Deletion

Define a concrete retention period for each data category. Users must be able to request account deletion from within the application and through a public web route. Explain any lawful or research-related retention exceptions in plain language.

### 7. Security

Describe reasonable controls such as encrypted transport, role-based access, server-side API keys, access logging, backup protection, and credential rotation. Do not promise absolute security.

### 8. User Rights and Contact

Explain how users can request access, correction, export, withdrawal of consent, or deletion. Include the client-owned privacy email and response process.

### 9. Children and Age Eligibility

State the approved minimum age and whether the application is intended for children. Store declarations and actual onboarding must be consistent.

### 10. AI Notice

Explain that users interact with AI-generated speech and text, that outputs can be incomplete or inaccurate, and how users can report inappropriate or incorrect content.

