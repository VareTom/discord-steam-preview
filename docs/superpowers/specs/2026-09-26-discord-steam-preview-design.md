# Discord Steam Preview Bot — Design

## Contexte & objectif

Bot Discord qui écoute un ou plusieurs channels d'un serveur et, quand un
lien Steam (`store.steampowered.com/app/<id>`) est partagé, répond avec un
embed résumant le jeu : image, nom, description, prix, évaluation (%
d'avis positifs), et catégories (Solo, Coop, Survie, etc.).

Hébergement : VPS existant, géré via pm2 aux côtés d'un autre bot déjà en
place. Process Node.js/TypeScript long-running connecté au Gateway
Discord — pas de framework (pas de NestJS, scope trop petit pour
justifier la structure modules/DI).

## Sources de données

- **Steam Store API publique (non-officielle), pas de clé requise :**
  - `https://store.steampowered.com/api/appdetails?appids=<id>&cc=FR&l=french`
    → nom, description courte, image (`header_image`), prix
    (`price_overview`), catégories/genres.
  - `https://store.steampowered.com/appreviews/<id>?json=1`
    → `query_summary.review_score_desc`,
    `query_summary.total_positive`/`total_reviews` pour calculer le %
    d'avis positifs.
- Locale fixée à `cc=FR&l=french` (prix en EUR, textes en français).

## Architecture

Pas de framework. Structure de fichiers :

```
src/
  index.ts                    # bootstrap: login discord.js, listener messageCreate
  config.ts                   # lecture + validation Zod des variables d'env
  steam/
    extract-app-ids.ts        # regex: message -> appIds uniques
    steam-client.ts           # appels appdetails + appreviews
  discord/
    build-embed.ts            # données Steam -> EmbedBuilder
```

### Config (variables d'environnement)

- `DISCORD_TOKEN` — token du bot
- `DISCORD_CHANNEL_ID` — id du channel à écouter (un seul au départ)

Validées au démarrage avec un schéma Zod ; le process s'arrête avec une
erreur claire si une variable manque.

## Flux de données

1. `messageCreate` reçu → si `message.channelId !== DISCORD_CHANNEL_ID`,
   ignorer.
2. `extract-app-ids.ts` extrait tous les appIDs Steam uniques du contenu
   du message (dédupliqués).
3. Si aucun appID trouvé → ne rien faire.
4. Pour chaque appID (en parallèle) :
   a. Appel `appdetails`. Si `success !== true` → logger l'erreur et
      passer au suivant (pas de message Discord).
   b. Appel `appreviews` pour le % d'avis positifs (best-effort : si
      l'appel échoue, l'embed est quand même posté sans le champ
      évaluation).
   c. `build-embed.ts` construit l'`EmbedBuilder` : image, titre,
      description, prix (ou "Gratuit" si `is_free`, ou "Non disponible"
      si pas de `price_overview`), évaluation, catégories/genres.
   d. `message.reply({ embeds: [embed] })`.
5. Un embed est posté par appID valide trouvé dans le message — plusieurs
   liens dans un même message donnent plusieurs embeds.

## Gestion des erreurs

- Chaque appel Steam est entouré d'un try/catch ; les erreurs sont
  loguées (`console.error`) avec l'appID concerné et ne font pas planter
  le bot.
- Un appID invalide/jeu retiré est ignoré silencieusement côté Discord
  (pas de message d'erreur visible dans le channel).
- Le rate-limiting Discord est géré nativement par discord.js.
- Pas de cache : chaque lien déclenche un appel API frais (volume attendu
  faible, pas de contrainte de quota connue sur cette API publique).

## Tests

Vitest, sur la logique pure uniquement :

- `extract-app-ids.ts` : un lien, plusieurs liens, liens dupliqués,
  message sans lien, lien malformé.
- `build-embed.ts` : mapping payload Steam → structure d'embed, cas
  gratuit, cas sans prix, cas sans données d'évaluation.

Pas de test d'intégration contre le vrai Gateway Discord (hors scope,
pas de valeur ajoutée pour ce projet).

## Hors scope (explicitement exclu)

- Cache des réponses Steam.
- Messages d'erreur visibles dans Discord en cas d'échec.
- Support multi-channels/multi-serveurs (un seul `DISCORD_CHANNEL_ID` au
  départ).
- Suppression/édition du message original de l'utilisateur.
