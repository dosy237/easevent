#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  deploy.sh — Easevent · Script de déploiement production (Render.com)
# ═══════════════════════════════════════════════════════════════════════
#
#  USAGE :
#    chmod +x deploy.sh
#     
#    # Premier déploiement (configure tout)
#    ./deploy.sh --first-run
#
#    # Redéploiement classique (après commit)
#    ./deploy.sh
#
#    # Forcer un redéploiement sans commit
#    ./deploy.sh --force
#
#    # Vérifier l'état des services
#    ./deploy.sh --status
#
#  PRÉ-REQUIS :
#    • Render CLI installé  : npm install -g @render/cli
#    • Render CLI connecté  : render login
#    • Git configuré avec un remote "origin" pointant vers GitHub/GitLab
#
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Couleurs ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Helpers ─────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✓${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✗${NC}  $*" >&2; }
section() { echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${NC}"; }

die() { error "$*"; exit 1; }

# ── Configuration du projet ─────────────────────────────────────────────
BACKEND_SERVICE="easevent-backend"
CELERY_SERVICE="easevent-celery"
FRONTEND_SERVICE="easevent-frontend"
REDIS_SERVICE="easevent-redis"
DB_SERVICE="easevent-db"
SECRETS_GROUP="easevent-secrets"

# ── Bannière ────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          EASEVENT  —  Déploiement Production             ║"
echo "║              Render.com · Frankfurt                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Parsing des arguments ───────────────────────────────────────────────
FIRST_RUN=false
FORCE=false
STATUS_ONLY=false

for arg in "$@"; do
  case $arg in
    --first-run) FIRST_RUN=true ;;
    --force)     FORCE=true ;;
    --status)    STATUS_ONLY=true ;;
    --help|-h)
      echo "Usage: $0 [--first-run] [--force] [--status]"
      echo ""
      echo "  --first-run  Premier déploiement complet"
      echo "  --force      Déclencher un redéploiement sans nouveau commit"
      echo "  --status     Afficher l'état des services seulement"
      exit 0
      ;;
    *) die "Argument inconnu : $arg" ;;
  esac
done

# ════════════════════════════════════════════════════════════════════════
#  VÉRIFICATIONS PRÉ-DÉPLOIEMENT
# ════════════════════════════════════════════════════════════════════════
section "Vérifications pré-déploiement"

# Git
command -v git &>/dev/null || die "git n'est pas installé"
[ -d ".git" ] || die "Ce script doit être exécuté depuis la racine du dépôt easevent/"

# Render CLI
if ! command -v render &>/dev/null; then
  warn "Render CLI introuvable."
  info "Installation : npm install -g @render/cli"
  info "Connexion    : render login"
  info ""
  info "Le déploiement sera déclenché via git push uniquement."
  info "Certaines commandes CLI seront ignorées."
  HAS_RENDER_CLI=false
else
  HAS_RENDER_CLI=true
  # Vérifier la connexion
  render whoami &>/dev/null || die "Render CLI non connecté. Lancer : render login"
  success "Render CLI connecté"
fi

# Fichier render.yaml
[ -f "render.yaml" ] || die "render.yaml introuvable à la racine du projet"
success "render.yaml trouvé"

# Build scripts
[ -f "backend/build.sh" ] || die "backend/build.sh introuvable"
[ -f "frontend/build.sh" ] || die "frontend/build.sh introuvable"
success "Scripts de build trouvés"

# Celery app
[ -f "backend/easevent/celery.py" ] || \
  die "backend/easevent/celery.py introuvable — fichier requis pour le worker Celery"
success "celery.py trouvé"

# ════════════════════════════════════════════════════════════════════════
#  MODE STATUS SEULEMENT
# ════════════════════════════════════════════════════════════════════════
if $STATUS_ONLY; then
  section "État des services"
  if $HAS_RENDER_CLI; then
    render services list 2>/dev/null | grep -E "easevent|ÉTAT|STATE" || true
  else
    warn "Render CLI requis pour afficher l'état. Vérifier sur https://dashboard.render.com"
  fi
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════
#  PREMIER DÉPLOIEMENT
# ════════════════════════════════════════════════════════════════════════
if $FIRST_RUN; then
  section "Checklist premier déploiement"

  echo -e "${BOLD}Avant de continuer, vérifier que ces étapes sont faites :${NC}"
  echo ""
  echo "  1. ${YELLOW}CORS settings.py${NC}"
  echo "     Dans backend/easevent/settings.py, remplacer :"
  echo "       CORS_ALLOWED_ORIGINS = [\"https://easevent-backend.onrender.com\"]"
  echo "     Par :"
  echo "       _cors_raw = config('CORS_ALLOWED_ORIGINS',"
  echo "                          default='https://easevent-frontend.onrender.com')"
  echo "       CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_raw.split(',')]"
  echo ""
  echo "  2. ${YELLOW}Secrets à saisir dans Render Dashboard${NC}"
  echo "     Dashboard → Env Groups → ${SECRETS_GROUP} :"
  echo "     ┌────────────────────────────────┬──────────────────────────┐"
  echo "     │  SENDGRID_API_KEY              │  clé API SendGrid        │"
  echo "     │  DEFAULT_FROM_EMAIL            │  noreply@easevent.app    │"
  echo "     │  CLOUDINARY_CLOUD_NAME         │  votre cloud name        │"
  echo "     │  CLOUDINARY_API_KEY            │  votre API key           │"
  echo "     │  CLOUDINARY_API_SECRET         │  votre API secret        │"
  echo "     └────────────────────────────────┴──────────────────────────┘"
  echo ""
  echo "  3. ${YELLOW}Superutilisateur Django${NC}"
  echo "     Après le premier déploiement, dans Render → easevent-backend"
  echo "     → Shell :"
  echo "       python manage.py createsuperuser"
  echo ""
  echo "  4. ${YELLOW}Fixtures (données initiales)${NC} [optionnel]"
  echo "     python manage.py loaddata fixtures/*.json"
  echo ""

  read -rp "Tout est prêt ? Continuer le déploiement ? [o/N] " confirm
  [[ "$confirm" =~ ^[oO]$ ]] || { info "Déploiement annulé."; exit 0; }
fi

# ════════════════════════════════════════════════════════════════════════
#  VÉRIFICATIONS GIT
# ════════════════════════════════════════════════════════════════════════
section "Vérification Git"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
info "Branche active : ${BOLD}$BRANCH${NC}"

if [[ "$BRANCH" != "main" && "$BRANCH" != "master" ]]; then
  warn "Vous n'êtes pas sur main/master (branche : $BRANCH)"
  read -rp "Continuer quand même ? [o/N] " confirm
  [[ "$confirm" =~ ^[oO]$ ]] || { info "Déploiement annulé."; exit 0; }
fi

# Vérifier les modifications non committées
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  warn "Des modifications non committées existent."
  git status --short
  echo ""
  read -rp "Committer et pusher maintenant ? [o/N] " do_commit
  if [[ "$do_commit" =~ ^[oO]$ ]]; then
    read -rp "Message de commit : " commit_msg
    git add -A
    git commit -m "${commit_msg:-deploy: production update $(date '+%Y-%m-%d %H:%M')}"
    success "Commit créé"
  else
    info "Modifications non committées ignorées."
  fi
fi

# ════════════════════════════════════════════════════════════════════════
#  PUSH GIT (déclenche l'auto-deploy Render)
# ════════════════════════════════════════════════════════════════════════
section "Push Git → Render auto-deploy"

if $FORCE && ! git diff-index --quiet HEAD -- 2>/dev/null; then
  # Commit vide pour forcer un redéploiement
  git commit --allow-empty -m "chore: force redeploy $(date '+%Y-%m-%d %H:%M')"
  info "Commit vide créé pour forcer le redéploiement"
fi

REMOTE=$(git remote get-url origin 2>/dev/null || echo "inconnu")
info "Remote : $REMOTE"

git push origin "$BRANCH"
success "Push effectué — Render va démarrer le déploiement automatiquement"

# ════════════════════════════════════════════════════════════════════════
#  SURVEILLANCE DU DÉPLOIEMENT (Render CLI)
# ════════════════════════════════════════════════════════════════════════
if $HAS_RENDER_CLI; then
  section "Surveillance des déploiements"

  info "Attente du démarrage des builds Render..."
  sleep 10

  echo ""
  echo -e "${BOLD}Backend + Celery :${NC}"
  render deploys list --service "$BACKEND_SERVICE" --limit 3 2>/dev/null || \
    warn "Impossible de récupérer les déploiements backend"

  echo ""
  echo -e "${BOLD}Frontend :${NC}"
  render deploys list --service "$FRONTEND_SERVICE" --limit 3 2>/dev/null || \
    warn "Impossible de récupérer les déploiements frontend"
fi

# ════════════════════════════════════════════════════════════════════════
#  RÉSUMÉ FINAL
# ════════════════════════════════════════════════════════════════════════
section "Déploiement lancé ✓"

echo ""
echo -e "${BOLD}URLs de production :${NC}"
echo -e "  🌐 Frontend  → ${GREEN}https://easevent-frontend.onrender.com${NC}"
echo -e "  🔌 Backend   → ${GREEN}https://easevent-backend.onrender.com${NC}"
echo -e "  🔧 Admin     → ${GREEN}https://easevent-backend.onrender.com/admin/${NC}"
echo ""
echo -e "${BOLD}Dashboard Render :${NC}"
echo -e "  ${CYAN}https://dashboard.render.com${NC}"
echo ""
echo -e "${YELLOW}⏱  Le build prend généralement 3–7 minutes.${NC}"
echo -e "${YELLOW}   Surveiller les logs dans le Dashboard Render.${NC}"
echo ""

if $FIRST_RUN; then
  echo -e "${BOLD}Étapes post-déploiement :${NC}"
  echo "  1. Vérifier que tous les services sont 'Live' dans le Dashboard"
  echo "  2. Créer un superutilisateur Django :"
  echo "     Dashboard → easevent-backend → Shell :"
  echo "     $ python manage.py createsuperuser"
  echo "  3. Tester l'API : curl https://easevent-backend.onrender.com/api/events/publics/"
  echo "  4. Ouvrir le frontend : https://easevent-frontend.onrender.com"
  echo ""
fi
