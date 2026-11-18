# Architecture cible

```text
UI Next.js
  ↓ contrats Zod / états explicites
API autorisée et services métier
  ├── LocalFileRepository (IndexedDB/local workspace phase 1)
  ├── FirebaseRepository (opt-in authentifié)
  ├── JobRepository
  ├── ProjectRepository
  └── ApprovalRepository
  ↓
Moteurs déterministes PDF / jobs locaux
  ├── inspectPdf
  ├── preflight
  ├── bleed
  ├── bat
  └── cutline
  ↓ événements vérifiables
Agent tools allowlistés
  ↓ consentement minimal
Gemini/OpenAI côté serveur
```

## Choix de persistance

La phase 1 est local-first : les octets et metadata de fichiers sont stockés dans IndexedDB sur l’appareil. Cela évite une fuite cloud implicite et fonctionne sans Firebase Storage, qui n’est pas disponible sur le forfait gratuit actuel. Les repositories doivent permettre une implémentation Firebase ultérieure sans exposer leurs détails à l’UI.

## Contrats de fichier phase 1

```ts
StoredLocalFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  lastModified: number;
  sha256?: string;
  createdAt: string;
  blob: Blob;
}
```

Le `Blob` ne quitte pas le navigateur. Une preview PDF ne vaut pas validation prépresse ; les futures opérations déterministes devront produire un rapport séparé.

## Evénements

Les opérations publient des états `queued`, `running`, `needs_review`, `completed`, `failed`, `cancelled`. Une UI ne transforme jamais `queued` ou un résultat local temporaire en succès vérifié.

## Extension cloud

Firebase reste le candidat actuel pour Auth/Firestore. Storage ne s’active qu’après consentement et vérification du plan. Les routes serveur devront vérifier l’utilisateur et l’appartenance du projet ; aucun `userId` reçu du client ne sera une preuve.
