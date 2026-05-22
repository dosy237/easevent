"""
fixtures/seed_data.py
═══════════════════════════════════════════════════════════════
Script d'injection de données fictives pour les tests.

Comment l'utiliser :
─────────────────────
    cd ~/easevent/backend
    source venv/bin/activate
    mkdir -p fixtures
    # Copie ce fichier dans fixtures/
    python3 manage.py shell < fixtures/seed_data.py

Ce script :
- Nettoie toutes les données existantes (pour pouvoir relancer)
- Crée 6 utilisateurs avec des profils réalistes
- Crée 2 abonnements actifs
- Crée 3 événements (mariage, conférence, anniversaire)
- Crée des invitations, questions RSVP, feedbacks et analytics

IMPORTANT : lancer APRÈS python3 manage.py migrate
═══════════════════════════════════════════════════════════════
"""

import uuid
import json
import hashlib
import secrets
from datetime import timedelta
from django.utils import timezone
from django.db import transaction

# Import de tous nos modèles
from users.models        import User, UserPreferences, Domain
from events.models       import Event, EventMedia, TemplateGeneration, EventCollaborator
from invitations.models  import Invitation, RSVPQuestion, RSVPResponse
from analytics.models    import Feedback, EventAnalytics
from subscriptions.models import Subscription

print("\n Démarrage du seed Easevent...\n")


# ── Fonctions utilitaires ─────────────────────────────────────

def sha256_config(config: dict) -> str:
    """
    Calcule l'empreinte SHA-256 d'une configuration JSON.
    sort_keys=True → garantit que le même contenu donne
    toujours la même empreinte, quel que soit l'ordre des clés.
    """
    serialized = json.dumps(config, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode()).hexdigest()

def dt(jours=0, heure=12, minute=0):
    """Retourne un datetime avec fuseau horaire, décalé de N jours."""
    base = timezone.now().replace(hour=heure, minute=minute, second=0, microsecond=0)
    return base + timedelta(days=jours)


# ── Transaction atomique : tout ou rien ──────────────────────
# Si une erreur se produit au milieu, rien n'est enregistré.
# Évite d'avoir une base à moitié remplie en cas de bug.
with transaction.atomic():

    # ── 1. Nettoyage ─────────────────────────────────────────
    print(" Nettoyage...")
    # Ordre important : supprimer d'abord les tables enfants
    # (celles qui ont des FK vers d'autres tables)
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
    print("   ✓ Nettoyage terminé\n")

    # ── 2. Utilisateurs ──────────────────────────────────────
    print(" Création des utilisateurs...")

    # Superutilisateur — accès à l'interface admin Django
    admin = User.objects.create_superuser(
        email      = "admin@easevent.app",
        password   = "Admin@2025!",
        first_name = "Admin",
        last_name  = "Easevent",
    )

    # Organisatrice Plan Pro — organise un mariage
    sarah = User.objects.create_user(
        email             = "sarah.dupont@gmail.com",
        password          = "Sarah@2025!",
        first_name        = "Sarah",
        last_name         = "Dupont",
        bio               = "J'organise mon mariage 💍 Passionnée de déco florale.",
        is_verified       = True,
        subscription_plan = "pro",
        stripe_customer_id= "cus_test_sarah_001",
    )

    # Organisateur Plan Standard — coach/conférencier
    julien = User.objects.create_user(
        email             = "julien.martin@coaching-life.fr",
        password          = "Julien@2025!",
        first_name        = "Julien",
        last_name         = "Martin",
        bio               = "Coach en développement personnel 🎤 | 8 à 10 événements/an",
        is_verified       = True,
        subscription_plan = "standard",
        stripe_customer_id= "cus_test_julien_002",
    )

    # Membres Plan Gratuit — participent aux événements
    marie = User.objects.create_user(
        email      = "marie.leclerc@hotmail.fr",
        password   = "Marie@2025!",
        first_name = "Marie",
        last_name  = "Leclerc",
        is_verified= True,
    )
    thomas = User.objects.create_user(
        email      = "thomas.bernard@outlook.com",
        password   = "Thomas@2025!",
        first_name = "Thomas",
        last_name  = "Bernard",
        is_verified= True,
    )

    # Compte non vérifié — pour tester le flow de vérification email
    keya = User.objects.create_user(
        email      = "keya.mathurin@easevent.app",
        password   = "Keya@2025!",
        first_name = "Keya",
        last_name  = "Mathurin",
        is_verified= False,  # ← test du flow de vérification
    )

    print(f"   ✓ {User.objects.count()} utilisateurs créés")

    # ── 3. Préférences ────────────────────────────────────────
    # Normalement créées automatiquement par le signal post_save.
    # On les crée manuellement ici car le signal ne se déclenche
    # pas toujours dans le contexte d'un shell script.
    print("  Création des préférences...")
    for user in User.objects.all():
        UserPreferences.objects.get_or_create(user=user)
    print(f"   ✓ {UserPreferences.objects.count()} préférences créées")

    # ── 4. Abonnements ────────────────────────────────────────
    print(" Création des abonnements...")
    Subscription.objects.create(
        user                 = sarah,
        plan                 = 'pro',
        status               = 'active',
        stripe_sub_id        = 'sub_test_sarah_pro_001',
        current_period_start = dt(-15),
        current_period_end   = dt(15),
        billing_interval     = 'monthly',
    )
    Subscription.objects.create(
        user                 = julien,
        plan                 = 'standard',
        status               = 'active',
        stripe_sub_id        = 'sub_test_julien_std_001',
        current_period_start = dt(-5),
        current_period_end   = dt(25),
        billing_interval     = 'annual',
    )
    print(f"   ✓ {Subscription.objects.count()} abonnements créés")

    # ── 5. Domaine personnalisé Plan Pro ──────────────────────
    print(" Création du domaine personnalisé...")
    domaine_sarah = Domain.objects.create(
        user               = sarah,
        domain_name        = "mariage-sarah-thomas.fr",
        status             = "active",
        namecheap_order_id = "NC-ORDER-2025-00142",
        purchased_at       = dt(-14),
        expires_at         = dt(351),
    )
    print(f"   ✓ Domaine '{domaine_sarah.domain_name}' créé")

    # ── 6. Événements ─────────────────────────────────────────
    print("🎉 Création des événements...")

    palette_mariage = {
        "primary":  "#C4A882",
        "secondary":"#F5E6D3",
        "accent":   "#8B6F47",
        "text":     "#2C1810",
        "bg_light": "#FDFAF6",
        "bg_dark":  "#3D2B1F"
    }

    template_mariage = {
        "event_type": "mariage",
        "palette":    palette_mariage,
        "zones": {
            "header": {"component": "hero_3", "animation": "fade_parallax"},
            "corps":  [
                {"component": "programme_2",       "animation": "slide_left"},
                {"component": "galerie_1",          "animation": "zoom_in"},
                {"component": "compte_a_rebours_1", "animation": "pulse"},
            ],
            "rsvp":   {"component": "rsvp_2"},
            "footer": {"component": "footer_1", "show_branding": False}
        }
    }

    mariage = Event.objects.create(
        organizer        = sarah,
        title            = "Mariage de Sarah & Thomas",
        event_type       = "mariage",
        description      = (
            "Nous avons le bonheur de vous inviter à célébrer notre union "
            "le 14 juin dans le Château de Vaux-le-Vicomte. "
            "Une journée magique en votre compagnie. Tenue de soirée exigée."
        ),
        start_date       = dt(120, heure=14, minute=30),
        end_date         = dt(120, heure=23, minute=59),
        location_address = "Château de Vaux-le-Vicomte, 77950 Maincy, France",
        latitude         = 48.5671,
        longitude        = 2.7136,
        visibility       = "private",
        status           = "published",
        template_config  = template_mariage,
        palette          = palette_mariage,
        ambiance         = "elegant",
        subdomain        = "mariage-sarah-thomas",
        custom_domain    = domaine_sarah,
        cover_image      = "https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg?auto=compress&cs=tinysrgb&w=800",
        view_count       = 247,
    )

    conference = Event.objects.create(
        organizer        = julien,
        title            = "Masterclass : Construire sa Marque Personnelle en 2025",
        event_type       = "conference",
        description      = (
            "Durant cette masterclass de 3 heures, nous verrons comment définir "
            "votre positionnement unique et transformer votre expertise en revenus. "
            "Places limitées à 50 participants. Café offert."
        ),
        start_date       = dt(30, heure=9, minute=0),
        end_date         = dt(30, heure=12, minute=30),
        location_address = "WeWork Nation, 6 Pl. de la Nation, 75012 Paris",
        latitude         = 48.8484,
        longitude        = 2.3964,
        visibility       = "public",
        status           = "published",
        ambiance         = "professionnel",
        subdomain        = "masterclass-marque-perso-juin25",
        cover_image      = "https://images.pexels.com/photos/7648047/pexels-photo-7648047.jpeg?auto=compress&cs=tinysrgb&w=800",
        view_count       = 512,
    )

    anniversaire = Event.objects.create(
        organizer   = marie,
        title       = "30 ans de Marie — Soirée surprise !",
        event_type  = "anniversaire",
        description = "Chut, c'est une surprise !",
        start_date  = dt(60, heure=20, minute=0),
        end_date    = dt(60, heure=23, minute=59),
        visibility  = "draft",
        status      = "draft",
        cover_image = "https://images.pexels.com/photos/1840608/pexels-photo-1840608.jpeg?auto=compress&cs=tinysrgb&w=800",
    )

    Event.objects.create(
        organizer        = julien,
        title            = "Gala de Charité 2025",
        event_type       = "conference",
        description      = (
            "Une soirée exceptionnelle au profit des enfants défavorisés. "
            "Dîner gastronomique, vente aux enchères et spectacle live. "
            "Dress code : tenue de soirée."
        ),
        start_date       = dt(45, heure=19, minute=0),
        end_date         = dt(45, heure=23, minute=30),
        location_address = "Emerald Hall, 12 Avenue Montaigne, 75008 Paris",
        latitude         = 48.8656,
        longitude        = 2.3021,
        visibility       = "public",
        status           = "published",
        ambiance         = "elegant",
        subdomain        = "gala-charite-2025",
        cover_image      = "https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg?auto=compress&cs=tinysrgb&w=800",
        view_count       = 834,
    )

    Event.objects.create(
        organizer        = sarah,
        title            = "Neon Night Party",
        event_type       = "soiree",
        description      = (
            "La soirée la plus colorée de l'année. DJ sets, performances artistiques, "
            "open bar et décoration néon immersive sur 3 étages. 18+ uniquement."
        ),
        start_date       = dt(20, heure=22, minute=0),
        end_date         = dt(21, heure=5,  minute=0),
        location_address = "Le Batofar, Port de la Gare, 75013 Paris",
        latitude         = 48.8308,
        longitude        = 2.3746,
        visibility       = "public",
        status           = "published",
        ambiance         = "festif",
        subdomain        = "neon-night-party-2025",
        cover_image      = "https://images.pexels.com/photos/1407322/pexels-photo-1407322.jpeg?auto=compress&cs=tinysrgb&w=800",
        view_count       = 1203,
    )

    Event.objects.create(
        organizer        = julien,
        title            = "Fashion Week Preview — Printemps 2026",
        event_type       = "conference",
        description      = (
            "Avant-première exclusive des collections Printemps-Été 2026. "
            "Défilés, rencontres avec les créateurs et cocktail de clôture. "
            "Sur invitation uniquement."
        ),
        start_date       = dt(55, heure=17, minute=30),
        end_date         = dt(55, heure=21, minute=0),
        location_address = "Palais Royal, Place du Palais Royal, 75001 Paris",
        latitude         = 48.8638,
        longitude        = 2.3369,
        visibility       = "public",
        status           = "published",
        ambiance         = "elegant",
        subdomain        = "fashion-week-preview-2026",
        cover_image      = "https://images.pexels.com/photos/1840608/pexels-photo-1840608.jpeg?auto=compress&cs=tinysrgb&w=800",
        view_count       = 2156,
    )

    Event.objects.create(
        organizer        = marie,
        title            = "Summit Innovation AI — Paris",
        event_type       = "conference",
        description      = (
            "Le rendez-vous incontournable des acteurs de l'intelligence artificielle "
            "en France. Keynotes, ateliers pratiques, networking et démonstrations live."
        ),
        start_date       = dt(35, heure=9,  minute=0),
        end_date         = dt(35, heure=18, minute=0),
        location_address = "Station F, 5 Parvis Alan Turing, 75013 Paris",
        latitude         = 48.8300,
        longitude        = 2.3750,
        visibility       = "public",
        status           = "published",
        ambiance         = "professionnel",
        subdomain        = "summit-innovation-ai-paris",
        cover_image      = "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800",
        view_count       = 3421,
    )

    Event.objects.create(
        organizer        = sarah,
        title            = "Rooftop Jazz & Wine Evening",
        event_type       = "soiree",
        description      = (
            "Une soirée jazz intimiste sur les toits de Paris. "
            "Quartet de jazz live, sélection de vins naturels, tapas gastronomiques "
            "et vue panoramique sur la ville lumière."
        ),
        start_date       = dt(25, heure=19, minute=30),
        end_date         = dt(25, heure=23, minute=0),
        location_address = "Rooftop Le Perchoir, 14 Rue Crespin du Gast, 75011 Paris",
        latitude         = 48.8633,
        longitude        = 2.3807,
        visibility       = "public",
        status           = "published",
        ambiance         = "elegant",
        subdomain        = "rooftop-jazz-wine-2025",
        cover_image      = "https://images.pexels.com/photos/1407322/pexels-photo-1407322.jpeg?auto=compress&cs=tinysrgb&w=800",
        view_count       = 678,
    )

    print(f"   ✓ {Event.objects.count()} événements créés")

    # ── 7. Templates générés (SHA-256) ────────────────────────
    print(" Création des templates...")
    for i in range(7):
        config = {
            "event_type": "mariage",
            "version":    i,
            "palette":    palette_mariage,
            "zones": {
                "header": {"component": f"hero_{i+1}", "animation": "fade_parallax"},
                "corps":  [{"component": "programme_2"}, {"component": "galerie_1"}],
            }
        }
        TemplateGeneration.objects.create(
            event        = mariage,
            config_hash  = sha256_config(config),
            config_json  = config,
            was_selected = (i == 2),   # le 3ème a été sélectionné
            ml_score     = round(0.45 + i * 0.07, 2),
        )
    print(f"   ✓ {TemplateGeneration.objects.count()} templates créés")

    # ── 8. Collaborateur ──────────────────────────────────────
    print(" Création du collaborateur...")
    EventCollaborator.objects.create(
        event = mariage,
        user  = thomas,
        permissions = {
            "can_read":            True,
            "can_add_media":       True,   # peut ajouter des photos
            "can_edit_components": False,  # ne peut PAS modifier le design
            "can_manage_guests":   False,  # ne peut PAS gérer les invités
        },
        accepted_at = dt(-3),
    )
    print(f"   ✓ {EventCollaborator.objects.count()} collaborateur créé")

    # ── 9. Questions RSVP ─────────────────────────────────────
    print(" Création des questions RSVP...")
    q_alim = RSVPQuestion.objects.create(
        event=mariage, order=1,
        question_text = "Avez-vous des restrictions alimentaires ou allergies ?",
        question_type = "text", is_required=False,
    )
    q_navette = RSVPQuestion.objects.create(
        event=mariage, order=2,
        question_text = "Avez-vous besoin de la navette depuis Paris ?",
        question_type = "yes_no", is_required=True,
    )
    q_menu = RSVPQuestion.objects.create(
        event=mariage, order=3,
        question_text = "Quel menu préférez-vous ?",
        question_type = "radio", is_required=True,
        options = ["Menu Classique", "Menu Végétarien", "Menu Enfant"],
    )
    q_session = RSVPQuestion.objects.create(
        event=conference, order=1,
        question_text = "Quelle thématique vous intéresse le plus ?",
        question_type = "checkbox", is_required=False,
        options = [
            "Personal Branding sur LinkedIn",
            "Créer une offre de coaching",
            "Monétiser son expertise",
        ],
    )
    print(f"   ✓ {RSVPQuestion.objects.count()} questions créées")

    # ── 10. Invitations ───────────────────────────────────────
    print("📨 Création des invitations...")
    inv_marie = Invitation.objects.create(
        event=mariage, invited_user=marie,
        token=secrets.token_urlsafe(32),
        status="confirmed", channel="platform_notification",
        opened_at=dt(-10), responded_at=dt(-9), expires_at=dt(127),
    )
    inv_ext = Invitation.objects.create(
        event=mariage, phone_number="+33612345678",
        token=secrets.token_urlsafe(32),
        status="opened", channel="sms",
        opened_at=dt(-5), expires_at=dt(127),
    )
    inv_thomas = Invitation.objects.create(
        event=conference, invited_user=thomas,
        token=secrets.token_urlsafe(32),
        status="confirmed", channel="platform_notification",
        opened_at=dt(-8), responded_at=dt(-7), expires_at=dt(37),
    )
    print(f"   ✓ {Invitation.objects.count()} invitations créées")

    # ── 11. Réponses RSVP ─────────────────────────────────────
    print("📝 Création des réponses RSVP...")
    RSVPResponse.objects.create(
        question=q_alim, invitation=inv_marie,
        answer="Allergie aux fruits à coque"
    )
    RSVPResponse.objects.create(
        question=q_navette, invitation=inv_marie,
        answer="Oui"
    )
    RSVPResponse.objects.create(
        question=q_menu, invitation=inv_marie,
        answer="Menu Végétarien"
    )
    RSVPResponse.objects.create(
        question=q_session, invitation=inv_thomas,
        answer=json.dumps(["Personal Branding sur LinkedIn", "Monétiser son expertise"])
    )
    print(f"   ✓ {RSVPResponse.objects.count()} réponses créées")

    # ── 12. Feedbacks (avec résultats NLP simulés) ────────────
    print(" Création des feedbacks...")
    feedbacks_data = [
        {
            "user": thomas, "rating": 5, "anon": False,
            "comment": (
                "Masterclass absolument exceptionnelle. Les exemples concrets "
                "sont directement applicables. J'ai refait mon profil LinkedIn "
                "le soir même. Merci !"
            ),
            "sentiment": "positive", "score": 0.97,
            "topics": ["pédagogie", "contenu", "applicabilité"]
        },
        {
            "user": marie, "rating": 4, "anon": False,
            "comment": (
                "Très bonne conférence, bien organisée. Seul bémol : "
                "3 heures sans pause c'est un peu long."
            ),
            "sentiment": "positive", "score": 0.81,
            "topics": ["organisation", "durée"]
        },
        {
            "user": None, "rating": 5, "anon": True,
            "comment": "La meilleure formation de l'année. Julien est généreux dans ses partages.",
            "sentiment": "positive", "score": 0.99,
            "topics": ["formateur", "ambiance"]
        },
        {
            "user": None, "rating": 3, "anon": True,
            "comment": "Contenu intéressant mais j'attendais plus de cas pratiques.",
            "sentiment": "neutral", "score": 0.72,
            "topics": ["contenu", "pratique"]
        },
        {
            "user": None, "rating": 2, "anon": True,
            "comment": "Déçu par rapport au programme annoncé. Pas assez interactif.",
            "sentiment": "negative", "score": 0.79,
            "topics": ["programme", "interactivité"]
        },
    ]
    for fd in feedbacks_data:
        Feedback.objects.create(
            event=conference, author=fd["user"],
            rating=fd["rating"], comment=fd["comment"],
            is_anonymous=fd["anon"],
            sentiment=fd["sentiment"], sentiment_score=fd["score"],
            topics=fd["topics"],
        )
    print(f"   ✓ {Feedback.objects.count()} feedbacks créés")

    # ── 13. Analytics ─────────────────────────────────────────
    print(" Création des analytics...")
    for delta, vues, confirms, score in [
        (-7, 89, 12, None), (-6, 134, 18, None), (-5, 201, 27, None),
        (-4, 287, 35, None), (-3, 356, 41, None), (-2, 420, 45, None),
        (-1, 512, 48, 84.0),
    ]:
        from datetime import timedelta
        EventAnalytics.objects.create(
            event              = conference,
            date               = (timezone.now() + timedelta(days=delta)).date(),
            view_count         = vues,
            confirmation_count = confirms,
            satisfaction_score = score,
            attendance_predicted  = 0.83 if delta == -1 else None,
            attendance_confidence = 0.11 if delta == -1 else None,
            nlp_summary = {
                "global_score": 84,
                "positive_pct": 60, "neutral_pct": 20, "negative_pct": 20,
                "top_topics": ["pédagogie", "contenu", "organisation"],
                "best_comments":  ["Masterclass exceptionnelle...", "Très bien organisée..."],
                "worst_comments": ["Pas assez interactif...", "Programme décevant..."],
            } if delta == -1 else None,
        )
    print(f"   ✓ {EventAnalytics.objects.count()} enregistrements analytics créés")

    # ── 14. Médias ────────────────────────────────────────────
    print(" Création des médias...")
    EventMedia.objects.create(
        event=mariage, uploader=sarah,
        r2_key="events/mariage-sarah-thomas/hero_photo.jpg",
        processing_status="done",
        original_url="https://r2.easevent.app/original/hero_photo.jpg",
        processed_url="https://r2.easevent.app/processed/hero_photo.jpg",
        dominant_colors=[[196, 168, 130], [245, 230, 211], [139, 111, 71]],
    )
    EventMedia.objects.create(
        event=mariage, uploader=thomas,   # collaborateur avec can_add_media
        r2_key="events/mariage-sarah-thomas/venue_photo.jpg",
        processing_status="pending",      # en cours de traitement
    )
    print(f"   ✓ {EventMedia.objects.count()} médias créés")

    # ── Résumé ────────────────────────────────────────────────
    print("\n" + "═"*50)
    print("  SEED TERMINÉ — Données créées :")
    print("═"*50)
    print(f"   👤  Utilisateurs  : {User.objects.count()}")
    print(f"   💳  Abonnements   : {Subscription.objects.count()}")
    print(f"   🌐  Domaines      : {Domain.objects.count()}")
    print(f"   🎉  Événements    : {Event.objects.count()}")
    print(f"   🎨  Templates     : {TemplateGeneration.objects.count()}")
    print(f"   📨  Invitations   : {Invitation.objects.count()}")
    print(f"   ❓  Questions RSVP: {RSVPQuestion.objects.count()}")
    print(f"   ⭐  Feedbacks     : {Feedback.objects.count()}")
    print(f"   📊  Analytics     : {EventAnalytics.objects.count()}")
    print(f"   📸  Médias        : {EventMedia.objects.count()}")
    print("═"*50)
    print("\n🔑 Comptes de test :")
    print("   admin@easevent.app              → Admin@2025!  (superuser)")
    print("   sarah.dupont@gmail.com          → Sarah@2025!  (Plan Pro)")
    print("   julien.martin@coaching-life.fr  → Julien@2025! (Plan Standard)")
    print("   marie.leclerc@hotmail.fr        → Marie@2025!  (Gratuit)")
    print("   thomas.bernard@outlook.com      → Thomas@2025! (Gratuit)")
    print("   keya.mathurin@easevent.app      → Keya@2025!   (non vérifié)\n")
