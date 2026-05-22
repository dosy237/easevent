/**
 * context/AuthContext.js — Easevent
 * ════════════════════════════════════════════════════════════════
 * Contexte React d'authentification global.
 *
 * C'est quoi un Context React ?
 * ──────────────────────────────
 * Imagine que tu as plusieurs écrans : HomeScreen, EventDetail,
 * LoginScreen, ProfileScreen... Tous ont besoin de savoir si
 * l'utilisateur est connecté et qui il est.
 *
 * Sans contexte → tu devrais passer ces infos de composant en
 * composant via les props, ce qui devient vite ingérable.
 *
 * Avec un contexte → tu crées une "boîte partagée" accessible
 * depuis n'importe quel écran sans passer par les props.
 * C'est comme une variable globale, mais propre et réactive.
 *
 * Ce fichier fait 3 choses :
 * 1. Crée le contexte (la boîte partagée)
 * 2. Crée le Provider (celui qui remplit la boîte)
 * 3. Crée le hook useAuth (pour lire la boîte depuis n'importe où)
 *
 * Nouveau dans cette version :
 * - refreshAccessToken() : renouvelle automatiquement le token
 *   quand il expire après 15 minutes, sans déconnecter l'utilisateur.
 *   Si le refresh token est aussi expiré (après 7 jours) →
 *   déconnexion forcée propre.
 * ════════════════════════════════════════════════════════════════
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import * as SecureStore from 'expo-secure-store';

// ─────────────────────────────────────────────────────────────────
// CLÉS DE STOCKAGE
// Ce sont les noms sous lesquels on stocke les données
// dans le trousseau sécurisé du téléphone.
// SecureStore fonctionne comme un dictionnaire clé → valeur.
// ─────────────────────────────────────────────────────────────────
const KEYS = {
  ACCESS_TOKEN:  'easevent_access_token',
  REFRESH_TOKEN: 'easevent_refresh_token',
  USER:          'easevent_user',
};

// ─────────────────────────────────────────────────────────────────
// ADRESSE DU BACKEND
// Centralisée ici pour ne pas la répéter dans chaque fonction.
// ─────────────────────────────────────────────────────────────────
const API_BASE = 'http://192.168.1.87:8000';

// ─────────────────────────────────────────────────────────────────
// CRÉATION DU CONTEXTE
// createContext(null) crée une boîte vide.
// null = valeur par défaut si on oublie d'envelopper avec Provider.
// ─────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ════════════════════════════════════════════════════════════════
// PROVIDER : AuthProvider
// Composant qui enveloppe toute l'app et fournit les données
// d'authentification à tous les écrans enfants.
//
// Props :
// - children : tous les composants enfants (toute l'app)
// ════════════════════════════════════════════════════════════════
export function AuthProvider({ children }) {

  // user : objet utilisateur connecté, ou null si non connecté
  // { id, email, first_name, last_name, avatar_url, subscription_plan }
  const [user,         setUser]         = useState(null);

  // accessToken : JWT d'accès (durée de vie 15 minutes)
  // Envoyé dans le header Authorization de chaque requête API
  const [accessToken,  setAccessToken]  = useState(null);

  // isLoading : true pendant la vérification initiale du stockage
  // Évite d'afficher LoginScreen une fraction de seconde si
  // l'utilisateur est déjà connecté
  const [isLoading,    setIsLoading]    = useState(true);

  // isAuthenticated : dérivé de user — true si user n'est pas null
  // Utilisé dans HomeScreen pour savoir si l'utilisateur est connecté
  const isAuthenticated = user !== null;

  // ── Vérification au démarrage de l'app ───────────────────────
  // useEffect avec [] = exécuté une seule fois au montage.
  // On vérifie si des tokens sont stockés depuis une session
  // précédente. Si oui → l'utilisateur reste connecté.
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      // SecureStore.getItemAsync lit une valeur depuis le stockage
      // sécurisé. Retourne null si la clé n'existe pas.
      const storedToken = await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
      const storedUser  = await SecureStore.getItemAsync(KEYS.USER);

      if (storedToken && storedUser) {
        // Des tokens existent → restaurer la session
        setAccessToken(storedToken);
        // JSON.parse reconvertit la chaîne JSON en objet JavaScript
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      // En cas d'erreur de lecture → on reste déconnecté
      console.error('Erreur lecture stockage auth:', err);
    } finally {
      // Dans tous les cas, on arrête le chargement
      setIsLoading(false);
    }
  };

  // ── Connexion ─────────────────────────────────────────────────
  // Appelée depuis LoginScreen après une réponse réussie de l'API.
  // Stocke les tokens et met à jour l'état global.
  //
  // Paramètres :
  // - userData : objet utilisateur retourné par Django
  // - access   : token JWT d'accès (15 min)
  // - refresh  : token JWT de rafraîchissement (7 jours)
  const login = useCallback(async ({ userData, access, refresh }) => {
    try {
      // Stocker dans le trousseau sécurisé du téléphone
      // setItemAsync(clé, valeur) — valeur doit être une chaîne
      await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN,  access);
      await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh);
      // JSON.stringify convertit l'objet en chaîne pour le stockage
      await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(userData));

      // Mettre à jour l'état React
      setAccessToken(access);
      setUser(userData);
    } catch (err) {
      console.error('Erreur stockage auth:', err);
      throw err;
    }
  }, []);

  // ── Déconnexion ───────────────────────────────────────────────
  // Supprime tous les tokens du stockage et réinitialise l'état.
  const logout = useCallback(async () => {
    try {
      // deleteItemAsync supprime une clé du stockage sécurisé
      await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(KEYS.USER);
    } catch (err) {
      console.error('Erreur suppression tokens:', err);
    } finally {
      // Réinitialiser l'état — même si la suppression échoue
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  // ── Rafraîchissement automatique du token ─────────────────────
  // Pourquoi cette fonction est-elle nécessaire ?
  // ─────────────────────────────────────────────
  // L'access token expire après 15 minutes (sécurité).
  // Quand un écran reçoit une erreur 401 (token expiré),
  // il appelle refreshAccessToken() au lieu de déconnecter
  // l'utilisateur brutalement.
  //
  // Fonctionnement étape par étape :
  // 1. On lit le refresh token stocké (valide 7 jours)
  // 2. On l'envoie à POST /api/auth/token/refresh/
  // 3. Django retourne un nouvel access token
  // 4. On le stocke et on met à jour l'état
  // 5. On retourne le nouveau token pour que l'écran
  //    puisse réessayer sa requête immédiatement
  //
  // Si le refresh token est aussi expiré (après 7 jours) :
  // → déconnexion forcée propre → l'utilisateur voit l'écran de connexion
  //
  // Retourne :
  // - Le nouveau access token (string) si succès
  // - null si échec (refresh expiré ou erreur réseau)
  const refreshAccessToken = useCallback(async () => {
    try {
      // Lire le refresh token depuis le stockage sécurisé
      const storedRefresh = await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);

      if (!storedRefresh) {
        // Pas de refresh token stocké → déconnexion propre
        await logout();
        return null;
      }

      // Envoyer le refresh token à Django pour obtenir un nouveau access token
      const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh: storedRefresh }),
      });

      if (!res.ok) {
        // Le refresh token est expiré ou invalide
        // → déconnexion forcée, l'utilisateur doit se reconnecter
        await logout();
        return null;
      }

      const data = await res.json();

      // Stocker le nouveau access token dans le trousseau sécurisé
      await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, data.access);

      // Mettre à jour l'état React pour que tous les écrans
      // utilisent automatiquement le nouveau token
      setAccessToken(data.access);

      // Retourner le nouveau token pour que l'écran qui a appelé
      // cette fonction puisse réessayer sa requête
      return data.access;

    } catch (err) {
      // Erreur réseau ou autre → déconnexion propre
      console.error('Erreur rafraîchissement token:', err);
      await logout();
      return null;
    }
  }, [logout]);

  // ── Mise à jour du profil ─────────────────────────────────────
  // Appelée depuis ProfileScreen quand l'utilisateur modifie
  // son prénom, nom, bio ou photo.
  // Met à jour à la fois le stockage sécurisé ET l'état React.
  const updateUser = useCallback(async (updatedUserData) => {
    try {
      // On fusionne les nouvelles données avec les anciennes
      // { ...user } copie toutes les propriétés existantes
      // { ...updatedUserData } écrase celles qui ont changé
      const newUser = { ...user, ...updatedUserData };
      await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(newUser));
      setUser(newUser);
    } catch (err) {
      console.error('Erreur mise à jour user:', err);
    }
  }, [user]);

  // ── Valeurs exposées au reste de l'app ────────────────────────
  // Tout ce qu'un écran peut lire ou appeler via useAuth()
  const value = {
    user,                // objet utilisateur (ou null)
    accessToken,         // token JWT pour les requêtes API
    isAuthenticated,     // boolean — true si connecté
    isLoading,           // boolean — true pendant l'init
    login,               // fonction — appeler après login API réussi
    logout,              // fonction — déconnecter l'utilisateur
    updateUser,          // fonction — mettre à jour les infos profil
    refreshAccessToken,  // fonction — renouveler le token expiré
  };

  // On enveloppe children dans le Provider qui partage la valeur
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════
// HOOK : useAuth
// Raccourci pour lire le contexte depuis n'importe quel écran.
//
// Utilisation dans un écran :
//   const { user, isAuthenticated, login, logout } = useAuth();
//
// Sans ce hook, il faudrait écrire :
//   const context = useContext(AuthContext);
// Ce qui est plus verbeux et moins lisible.
// ════════════════════════════════════════════════════════════════
export function useAuth() {
  const context = useContext(AuthContext);

  // Si useAuth est appelé en dehors du Provider, on le signale
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }

  return context;
}