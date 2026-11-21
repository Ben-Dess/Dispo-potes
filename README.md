# 📅 DispoPotes

Une appli gratuite pour organiser une journée entre amis : chacun saisit son **prénom**, coche ses disponibilités sur un calendrier et découvre automatiquement les dates où le plus grand nombre est libre.

## Accès

Site prévu : https://ben-dess.github.io/Dispo-potes/

## Fonctionnement

- Crée un événement avec un nom et une période.
- Ouvre son lien depuis un navigateur.
- Saisis ton prénom (sans compte ni WhatsApp).
- Coche les jours disponibles.
- Consulte les meilleures dates et la liste des prénoms présents.

## ⚠️ Mode démonstration / mode partagé

**Sans Firebase :** l'application fonctionne en local dans le navigateur. Les données ne sont **pas** partagées entre appareils, même avec le lien.

**Pour synchroniser les disponibilités sur plusieurs téléphones**, configure Firebase (offre Spark gratuite) :

1. Crée un projet https://console.firebase.google.com/.
2. Active **Authentication → Sign-in method → Anonymous**.
3. Crée une base **Firestore Database**.
4. Copie le fichier `firestore.rules` dans Firestore → Rules et publie-les.
5. Crée une application Web dans les paramètres Firebase. Récupère `apiKey`, `authDomain`, `projectId` et `appId`.
6. Copie `firebase-config.example.json` en `firebase-config.json` à la racine du dépôt et remplace les valeurs d'exemple.
7. Recharge le site.

La configuration Web Firebase n'est pas une clé d'administration ; la sécurité est assurée par les règles Firestore et l'authentification anonyme. Toute personne disposant d'un lien d'événement peut consulter les prénoms et dates : n'y mets pas d'informations sensibles.

## Déploiement GitHub Pages

Dans le dépôt, ouvre **Settings → Pages → Build and deployment → Source → GitHub Actions**.

Le workflow `.github/workflows/pages.yml` publie le site à chaque modification de la branche `main`. Tu peux aussi le lancer via **Actions → Deploy DispoPotes to GitHub Pages → Run workflow**.

Le site utilise un simple `index.html` statique, sans dépendance à installer ni build nécessaire.

## Limites de la V1

- Le mode local est limité à un seul navigateur/appareil.
- En mode Firebase, l'identité d'un participant repose sur l'identifiant anonyme attribué à son navigateur. Sur un autre navigateur, il pourra participer à nouveau.
- Les événements sont accessibles à toute personne possédant leur lien ; aucune connexion nominative n'est demandée.
- Pas de suppression d'événements ni de prévention avancée de l'abus en V1.
