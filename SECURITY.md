# Sécurité de DispoPotes

## Signaler une faille
Ne publiez **pas** de secrets ou de données utilisateurs dans une issue publique.
Contactez le propriétaire du dépôt directement via GitHub (ou l'option `Report a vulnerability` si elle est activée dans Settings → Security).

## Configuration et secrets
- `firebase-config.json` est une configuration **web publique** nécessaire à GitHub Pages, **pas** une clé d'administration.
- Ne jamais ajouter de clé privée Firebase Admin, de jeton GitHub, de fichier `.env` ni de compte de service au dépôt.
- Le fichier `.gitignore` bloque les fichiers locaux sensibles courants ; le workflow `Repository security checks` recherche quelques signatures de secrets dans les fichiers versionnés. Ces contrôles ne remplacent **pas** GitHub Secret Scanning ni un audit de l'historique Git.
- Si une clé privée a été publiée, **révoquez-la immédiatement** : supprimer un fichier dans un commit ne l'efface pas de l'historique.

## Firestore
- **Source canonique unique** : `firestore.rules` à la racine. Les anciennes règles de `v2/` ont été retirées.
- GitHub Pages ne déploie pas les règles : tout changement des permissions doit être testé puis publié séparément dans **Firebase Console → Firestore Database → Rules**.
- Les règles du dépôt ne prouvent pas que celles de la production sont identiques. Vérifier la version publiée dans la console.
- Les liens de groupe sont actuellement des **invitations par possession du lien**, sans approbation du propriétaire : ne partagez pas ces liens publiquement.
- Les anciennes sorties V1 doivent encore faire l'objet d'un durcissement du contrôle d'accès et de tests dans l'émulateur Firestore, avant diffusion ouverte.

## Réglages GitHub recommandés (à faire par le propriétaire)
1. **Settings → Code security and analysis** : activer Secret Scanning et Push Protection si disponibles, ainsi que les alertes Dependabot.
2. **Settings → Rules → Rulesets** : protéger `main`, exiger les tests automatiques et les pull requests, empêcher les force-push et les suppressions. Selon l'offre GitHub, certaines règles peuvent ne pas être appliquées aux dépôts privés.
3. **Settings → Actions → General** : laisser les autorisations de workflow à `Read repository contents` par défaut ; les permissions d'écriture restent limitées au job GitHub Pages qui les demande explicitement.
4. Utiliser la double authentification sur le compte GitHub et limiter les collaborateurs aux personnes nécessaires.
5. Si la confidentialité du **code source** est souhaitée, passer le dépôt en privé et adapter la stratégie d'hébergement GitHub Pages. Cela ne masque pas le JavaScript exécuté par les navigateurs.

## Avant chaque nouvelle publication
- Contrôler que `Repository security checks` et `Validate V2` passent.
- Inspecter les modifications de `firestore.rules` et des workflows.
- Vérifier qu'aucun secret n'apparaît dans le diff **ni dans l'historique**.
