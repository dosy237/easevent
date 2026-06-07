# Easevent
> Gérer vos événements n'aura jamais été aussi facile.

## Description
Easevent est une plateforme  de gestion événementielle qui permet
à tout organisateur de créer, communiquer et analyser un événement de manière
professionnelle, automatisée et centralisée — sans graphiste, sans développeur,
sans multitude d'outils disparates.

## Stack Technique
- **Backend** : Django 6.0.2 + Django REST Framework
- **Frontend** : React Native + Expo
- **Base de données** : PostgreSQL 16
- **IA** : API Claude (Anthropic)

## Structure du projet
```
easevent/
├── backend/                  # API Django REST Framework
│   ├── easevent/             # Configuration du projet Django
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py       # Configuration principale
│   │   ├── urls.py           # Routeur principal
│   │   └── wsgi.py
│   ├── venv/                 # Environnement virtuel Python (ignoré par Git)
│   ├── .env                  # Variables d'environnement (ignoré par Git)
│   ├── .gitignore
│   └── manage.py             # Outil de commandes Django
│
├── frontend/                 # Application React Native + Expo
│   ├── assets/               # Images et icônes
│   ├── node_modules/         # Dépendances (ignoré par Git)
│   ├── .gitignore
│   ├── App.js                # Point d'entrée de l'application
│   ├── app.json              # Configuration Expo
│   ├── index.js
│   └── package.json          # Dépendances npm
│
└── README.md
```

## Lancer le projet

### Backend
```bash
cd backend
source venv/bin/activate
python3 manage.py runserver
```

### Frontend
```bash
cd frontend
npm run web
```
 ## lien figma des maquettes 
```bash
https://www.figma.com/design/lQK3SWN2T1QPPuCqiSbjgO/easevent?node-id=0-1&p=f&t=bewQedMc8nmlG1ed-0
```

## Auteure
DONFACK SYNTHIA CALORINE — Bachelor Full Stack 2025-2026