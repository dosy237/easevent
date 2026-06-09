"""
fixtures/seed_data.py
═══════════════════════════════════════════════════════════════
Script d'injection de données de test réalistes pour Easevent.

OBJECTIF :
Ce script permet de remplir rapidement la base de données avec des
données fictives mais réalistes. Il est utile pour :
- Tester l'application en développement
- Faire des démonstrations
- Valider les fonctionnalités (invitations, RSVP, feedbacks, analytics...)

UTILISATION :
    cd backend
    python manage.py shell < fixtures/seed_data.py

ATTENTION :
- Ce script supprime TOUTES les données existantes avant de recréer les nouvelles.
- Les images de couverture sont des liens externes (Pexels) pour simplifier
  le seed. En production réelle, les utilisateurs uploaderont leurs propres images.

═══════════════════════════════════════════════════════════════
"""

import json
import hashlib
import secrets
from datetime import timedelta

from django.utils import timezone
from django.db import transaction

# Import des modèles
from users.models import User, UserPreferences, Domain
from events.models import Event, EventMedia, TemplateGeneration, EventCollaborator
from invitations.models import Invitation, RSVPQuestion, RSVPResponse
from analytics.models import Feedback, EventAnalytics
from subscriptions.models import Subscription


print("\n" + "═" * 65)
print("DÉMARRAGE DU SCRIPT DE SEED - EASEVENT")
print("═" * 65 + "\n")


# ─────────────────────────────────────────────────────────────
# FONCTIONS UTILITAIRES
# ─────────────────────────────────────────────────────────────

def dt(days: int = 0, hour: int = 12, minute: int = 0):
    """
    Retourne un datetime avec fuseau horaire.
    Utile pour créer des dates cohérentes par rapport à aujourd'hui.
    """
    base = timezone.now().replace(hour=hour, minute=minute, second=0, microsecond=0)
    return base + timedelta(days=days)


def sha256_config(config: dict) -> str:
    """
    Calcule une empreinte SHA-256 d'un dictionnaire de configuration.
    Permet d'identifier de manière unique une configuration de template.
    """
    serialized = json.dumps(config, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode()).hexdigest()


# ─────────────────────────────────────────────────────────────
# TRANSACTION ATOMIQUE
# Si une erreur survient, rien n'est enregistré en base.
# ─────────────────────────────────────────────────────────────
with transaction.atomic():

    # =========================================================
    # 1. NETTOYAGE COMPLET DE LA BASE
    # =========================================================
    print("Nettoyage des données existantes...")

    # On supprime d'abord les tables enfants (celles qui ont des clés étrangères)
    RSVPResponse.objects.all().delete()
    RSVPQuestion.objects.all().delete()
    EventAnalytics.objects.all().delete()
    Feedback.objects.all().delete()
    Invitation.objects.all().delete()
    EventCollaborator.objects.all().delete()
    TemplateGeneration.objects.all().delete()
    EventMedia.objects.all().delete()
    Event.objects.all().delete()
    Subscription.objects.all().delete()
    Domain.objects.all().delete()
    UserPreferences.objects.all().delete()
    User.objects.all().delete()

    print("   ✓ Base de données nettoyée\n")

    # =========================================================
    # 2. CRÉATION DES UTILISATEURS
    # =========================================================
    print("Création des utilisateurs de test...")

    # Super administrateur
    admin = User.objects.create_superuser(
        email="admin@easevent.app",
        password="Admin@2025!",
        first_name="Admin",
        last_name="Easevent",
    )

    # Organisatrice - Plan Pro (Mariage)
    sarah = User.objects.create_user(
        email="sarah.dupont@gmail.com",
        password="Sarah@2025!",
        first_name="Sarah",
        last_name="Dupont",
        bio="J'organise mon mariage avec passion. Amoureuse de la décoration florale et des moments authentiques.",
        is_verified=True,
        subscription_plan="pro",
    )

    # Organisateur - Plan Standard (Conférences & Coaching)
    julien = User.objects.create_user(
        email="julien.martin@coaching-life.fr",
        password="Julien@2025!",
        first_name="Julien",
        last_name="Martin",
        bio="Coach en développement personnel. J'organise entre 8 et 10 événements par an pour aider les entrepreneurs.",
        is_verified=True,
        subscription_plan="standard",
    )

    # Participante - Plan Gratuit
    marie = User.objects.create_user(
        email="marie.leclerc@hotmail.fr",
        password="Marie@2025!",
        first_name="Marie",
        last_name="Leclerc",
        is_verified=True,
    )

    # Participant - Plan Gratuit
    thomas = User.objects.create_user(
        email="thomas.bernard@outlook.com",
        password="Thomas@2025!",
        first_name="Thomas",
        last_name="Bernard",
        is_verified=True,
    )

    # Utilisateur non vérifié (pour tester le flux de vérification email)
    keya = User.objects.create_user(
        email="keya.mathurin@easevent.app",
        password="Keya@2025!",
        first_name="Keya",
        last_name="Mathurin",
        is_verified=False,
    )

    print(f"   ✓ {User.objects.count()} utilisateurs créés\n")

    # =========================================================
    # 3. CRÉATION DES PRÉFÉRENCES UTILISATEUR
    # =========================================================
    for user in User.objects.all():
        UserPreferences.objects.get_or_create(user=user)

    # =========================================================
    # 4. CRÉATION DES ABONNEMENTS
    # =========================================================
    Subscription.objects.create(
        user=sarah,
        plan="pro",
        status="active",
        current_period_start=dt(-15),
        current_period_end=dt(15),
    )

    Subscription.objects.create(
        user=julien,
        plan="standard",
        status="active",
        current_period_start=dt(-5),
        current_period_end=dt(25),
    )

    # =========================================================
    # 5. CRÉATION DES ÉVÉNEMENTS (avec belles images)
    # =========================================================
    print("Création des événements avec visuels de qualité...")

    # --- Mariage élégant ---
    mariage = Event.objects.create(
        organizer=sarah,
        title="Mariage de Sarah & Thomas",
        event_type="mariage",
        description="Nous avons le bonheur de vous inviter à célébrer notre union le 14 juin dans le magnifique Château de Vaux-le-Vicomte. Une journée magique vous attend.",
        start_date=dt(120, heure=14, minute=30),
        end_date=dt(120, heure=23, minute=59),
        location_address="Château de Vaux-le-Vicomte, 77950 Maincy, France",
        visibility="private",
        status="published",
        cover_image="https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
        view_count=312,
    )

    # --- Conférence / Masterclass ---
    conference = Event.objects.create(
        organizer=julien,
        title="Masterclass : Construire sa Marque Personnelle en 2025",
        event_type="conference",
        description="Une masterclass de 3 heures pour définir votre positionnement unique et transformer votre expertise en revenus. Places limitées.",
        start_date=dt(30, heure=9, minute=0),
        end_date=dt(30, heure=12, minute=30),
        location_address="WeWork Nation, 6 Place de la Nation, 75012 Paris",
        visibility="public",
        status="published",
        cover_image="https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
        view_count=587,
    )

    # --- Anniversaire ---
    anniversaire = Event.objects.create(
        organizer=marie,
        title="30 ans de Marie — Soirée surprise !",
        event_type="anniversaire",
        description="Chut... C'est une surprise ! Rejoignez-nous pour célébrer les 30 ans de Marie dans une ambiance festive et chaleureuse.",
        start_date=dt(60, heure=20, minute=0),
        end_date=dt(60, heure=23, minute=59),
        visibility="private",
        status="draft",
        cover_image="https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    )

    print(f"   ✓ {Event.objects.count()} événements créés\n")

    # =========================================================
    # 6. CRÉATION D'INVITATIONS ET RSVP (exemple simplifié)
    # =========================================================
    print("Création des invitations et questions RSVP...")

    # Invitation pour Marie au mariage
    inv_marie = Invitation.objects.create(
        event=mariage,
        invited_user=marie,
        token=secrets.token_urlsafe(32),
        status="confirmed",
        channel="platform_notification",
        opened_at=dt(-12),
        responded_at=dt(-10),
    )

    # Question RSVP
    q_alim = RSVPQuestion.objects.create(
        event=mariage,
        order=1,
        question_text="Avez-vous des restrictions alimentaires ou allergies ?",
        question_type="text",
        is_required=False,
    )

    RSVPResponse.objects.create(
        question=q_alim,
        invitation=inv_marie,
        answer="Allergie aux fruits à coque",
    )

    print(f"   ✓ Invitations et RSVP créés\n")

    # =========================================================
    # 7. CRÉATION DE FEEDBACKS
    # =========================================================
    print("Création des feedbacks...")

    Feedback.objects.create(
        event=conference,
        author=thomas,
        rating=5,
        comment="Masterclass exceptionnelle. Les conseils sont concrets et directement applicables. J'ai refait mon profil LinkedIn le soir même !",
        is_anonymous=False,
        sentiment="positive",
        sentiment_score=0.96,
    )

    Feedback.objects.create(
        event=conference,
        author=None,
        rating=4,
        comment="Très bonne organisation. Seul point négatif : la durée de 3h sans pause est un peu longue.",
        is_anonymous=True,
        sentiment="positive",
        sentiment_score=0.82,
    )

    print(f"   ✓ {Feedback.objects.count()} feedbacks créés\n")

    # =========================================================
    # RÉSUMÉ FINAL
    # =========================================================
    print("\n" + "═" * 65)
    print("SEED TERMINÉ AVEC SUCCÈS")
    print("═" * 65)
    print(f"   Utilisateurs     : {User.objects.count()}")
    print(f"   Événements       : {Event.objects.count()}")
    print(f"   Invitations      : {Invitation.objects.count()}")
    print(f"   Questions RSVP   : {RSVPQuestion.objects.count()}")
    print(f"   Feedbacks        : {Feedback.objects.count()}")
    print("═" * 65)

    print("\nComptes de test disponibles :")
    print("   admin@easevent.app        → Admin@2025!     (Superuser)")
    print("   sarah.dupont@gmail.com    → Sarah@2025!     (Plan Pro)")
    print("   julien.martin@coaching-life.fr → Julien@2025! (Plan Standard)")
    print("   marie.leclerc@hotmail.fr  → Marie@2025!     (Gratuit)")
    print("   thomas.bernard@outlook.com → Thomas@2025!   (Gratuit)\n")