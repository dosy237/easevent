 /**
 * HomeScreen.js — Easevent
 * ════════════════════════════════════════════════════════════════
 * Page d'accueil publique — Epic 2 US-08
 * - Barre de recherche connectée au backend
 * - Délai anti-rebond 400ms (évite un appel API à chaque frappe)
 * - Filtres par type d'événement corrigés (vrais types en base)
 * - Historique des 5 dernières recherches (stockage local)
 * - Affichage du nombre de résultats
 * ════════════════════════════════════════════════════════════════
 */
import { StatusBar as RNStatusBar } from 'react-native';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, StatusBar, Animated, Platform,
  ActivityIndicator, RefreshControl, Linking, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

// ─────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────
import { API_BASE } from '../config';
// ─────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────
const C = {
  green:       '#1B6B4A',
  greenDark:   '#155C3C',
  greenLight:  '#E8F5EE',
  orange:      '#E76F51',
  orangeLight: '#FFF0EB',
  white:       '#FFFFFF',
  bg:          '#F7F7F7',
  text:        '#1A1A1A',
  textSub:     '#555555',
  textMut:     '#9E9E9E',
  border:      '#E8E8E8',
};

// ─────────────────────────────────────────────────────────────────
// FILTRES PAR TYPE
// Correspondent exactement aux valeurs stockées en base de données.
// value: null = pas de filtre (tous les événements)
// ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { label: 'Tous',         value: null,           icon: 'apps-outline' },
  { label: 'Conférence',   value: 'conference',   icon: 'mic-outline' },
  { label: 'Soirée',       value: 'soiree',       icon: 'musical-notes-outline' },
  { label: 'Mariage',      value: 'mariage',      icon: 'heart-outline' },
  { label: 'Anniversaire', value: 'anniversaire', icon: 'gift-outline' },
  { label: 'Concert',      value: 'concert',      icon: 'headset-outline' },
];

// ─────────────────────────────────────────────────────────────────
// FONCTION : ouvrir Google Maps
// ─────────────────────────────────────────────────────────────────
const openGoogleMaps = async (address) => {
  if (!address) return;
  const query  = encodeURIComponent(address);
  const appUrl = `comgooglemaps://?q=${query}`;
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpen ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
};

// ════════════════════════════════════════════════════════════════
// COMPOSANT : FilterPill
// ════════════════════════════════════════════════════════════════
const FilterPill = ({ label, icon, active, onPress }) => (
  <TouchableOpacity
    style={[styles.pill, active && styles.pillActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Ionicons name={icon} size={13} color={active ? C.white : C.textMut} />
    <Text style={[styles.pillText, active && styles.pillTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ════════════════════════════════════════════════════════════════
// COMPOSANT : LocationRow — lieu cliquable Google Maps
// ════════════════════════════════════════════════════════════════
const LocationRow = ({ address, color = C.textSub }) => (
  <TouchableOpacity
    style={styles.locationRow}
    onPress={() => openGoogleMaps(address)}
    activeOpacity={0.7}
  >
    <Ionicons name="location-outline" size={13} color={color} />
    <Text style={[styles.locationText, { color }]} numberOfLines={1}>
      {address}
    </Text>
    <Ionicons name="chevron-forward-outline" size={11} color={color} style={{ opacity: 0.5 }} />
  </TouchableOpacity>
);

// ════════════════════════════════════════════════════════════════
// COMPOSANT : InvitationCard
// Grande card section "Vos Invitations"
// ════════════════════════════════════════════════════════════════
const InvitationCard = ({ event, onPress, isLoggedIn, onLoginPress }) => {
  if (!isLoggedIn) {
    return (
      <View style={styles.loginCard}>
        <View style={styles.loginCardIcon}>
          <Ionicons name="mail-outline" size={28} color={C.green} />
        </View>
        <View style={styles.loginCardText}>
          <Text style={styles.loginCardTitle}>Vos invitations vous attendent</Text>
          <Text style={styles.loginCardSub}>
            Connectez-vous pour accéder aux événements privés auxquels vous avez été invité.
          </Text>
        </View>
        <TouchableOpacity style={styles.loginCardBtn} onPress={onLoginPress}>
          <Text style={styles.loginCardBtnText}>Se connecter</Text>
          <Ionicons name="arrow-forward-outline" size={14} color={C.white} />
        </TouchableOpacity>
      </View>
    );
  }

  if (!event) return null;

  return (
    <TouchableOpacity style={styles.invitCard} onPress={() => onPress(event)} activeOpacity={0.92}>
      <Image source={{ uri: event.cover_image }} style={styles.invitImage} resizeMode="cover" />
      <View style={styles.invitBody}>
        <View style={styles.invitHeaderRow}>
          <View style={styles.invitBadge}>
            <Text style={styles.invitBadgeText}>EXCLUSIF</Text>
          </View>
          <Text style={styles.invitDateText}>{event.date_formatted}</Text>
        </View>
        <Text style={styles.invitTitle}>{event.title}</Text>
        <LocationRow address={event.location_address} />
        <TouchableOpacity style={styles.invitBtn} onPress={() => onPress(event)} activeOpacity={0.85}>
          <Text style={styles.invitBtnText}>Voir l'invitation</Text>
          <Ionicons name="arrow-forward-outline" size={16} color={C.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ════════════════════════════════════════════════════════════════
// COMPOSANT : CardFeatured
// ════════════════════════════════════════════════════════════════
const CardFeatured = ({ event, onPress }) => (
  <TouchableOpacity style={styles.cardFeatured} onPress={() => onPress(event)} activeOpacity={0.92}>
    <Image source={{ uri: event.cover_image }} style={styles.cardFeaturedImg} resizeMode="cover" />
    <View style={styles.cardFeaturedBadge}>
      <Text style={styles.cardFeaturedBadgeTxt}>{event.event_type?.toUpperCase()}</Text>
    </View>
    <View style={styles.cardFeaturedFooter}>
      <Text style={styles.cardFeaturedDate}>{event.date_formatted}</Text>
      <View style={styles.cardFeaturedRow}>
        <Text style={styles.cardFeaturedTitle} numberOfLines={1}>{event.title}</Text>
        <View style={styles.addCircle}>
          <Ionicons name="add" size={18} color={C.green} />
        </View>
      </View>
      <LocationRow address={event.location_address} color={C.textMut} />
    </View>
  </TouchableOpacity>
);

// ════════════════════════════════════════════════════════════════
// COMPOSANT : CardSmall
// ════════════════════════════════════════════════════════════════
const CardSmall = ({ event, onPress }) => (
  <TouchableOpacity style={styles.cardSmall} onPress={() => onPress(event)} activeOpacity={0.88}>
    <Image source={{ uri: event.cover_image }} style={styles.cardSmallImg} resizeMode="cover" />
    <View style={styles.cardSmallBody}>
      <Text style={styles.cardSmallDate}>{event.date_formatted}</Text>
      <Text style={styles.cardSmallTitle} numberOfLines={2}>{event.title}</Text>
      <TouchableOpacity style={styles.inscribeBtn} onPress={() => onPress(event)} activeOpacity={0.75}>
        <Text style={styles.inscribeTxt}>S'inscrire</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

// ════════════════════════════════════════════════════════════════
// COMPOSANT : CardStandard
// ════════════════════════════════════════════════════════════════
const CardStandard = ({ event, onPress }) => {
  const [saved, setSaved] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleBookmark = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    setSaved(!saved);
  };

  return (
    <TouchableOpacity style={styles.cardStd} onPress={() => onPress(event)} activeOpacity={0.92}>
      <View style={styles.cardStdImgBox}>
        <Image source={{ uri: event.cover_image }} style={styles.cardStdImg} resizeMode="cover" />
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeTxt}>{event.date_formatted}</Text>
        </View>
        <Animated.View style={[styles.bookmarkBtn, { transform: [{ scale: scaleAnim }] }]}>
          <TouchableOpacity onPress={handleBookmark} activeOpacity={0.8}>
            <View style={styles.bookmarkInner}>
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={15}
                color={saved ? C.orange : C.textMut}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
      <View style={styles.cardStdBody}>
        <Text style={styles.cardStdTitle} numberOfLines={1}>{event.title}</Text>
        <View style={styles.cardStdMeta}>
          <LocationRow address={event.location_address} />
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={13} color={C.textMut} />
            <Text style={styles.metaTxt}>
              {event.confirmed_count} participant{event.confirmed_count > 1 ? 's' : ''} confirmé{event.confirmed_count > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ════════════════════════════════════════════════════════════════
// ÉCRAN PRINCIPAL : HomeScreen
// ════════════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }) {

  const { isAuthenticated: isLoggedIn, user } = useAuth();

  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [activeTab,    setActiveTab]    = useState('home');
  // Réinitialiser l'onglet actif quand on revient sur HomeScreen
  // useFocusEffect s'exécute chaque fois que l'écran devient visible
  useFocusEffect(
  useCallback(() => {
    setActiveTab('home');
  }, [])
);
  // ── Recherche ─────────────────────────────────────────────────
  // searchText : texte saisi par l'utilisateur
  const [searchText,    setSearchText]    = useState('');

  // searchActive : true quand la barre de recherche est ouverte
  const [searchActive,  setSearchActive]  = useState(false);

  // recentSearches : historique des 5 dernières recherches
  const [recentSearches, setRecentSearches] = useState([]);

  // debounceTimer : référence au timer du délai anti-rebond
  // useRef car on ne veut pas re-rendre quand il change
  const debounceTimer = useRef(null);

  // ── Appel API avec tous les paramètres ───────────────────────
  const fetchEvents = useCallback(async (search = '', filter = activeFilter) => {
    try {
      // Construction de l'URL avec les paramètres de filtrage
      const params = new URLSearchParams();

      // Ajoute ?search=... si une recherche est active
      if (search.trim()) params.append('search', search.trim());

      // Ajoute ?type=... si un filtre autre que "Tous" est actif
      if (filter.value) params.append('type', filter.value);

      const url = `${API_BASE}/api/events/publics/${params.toString() ? '?' + params.toString() : ''}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);

      const data = await res.json();
      setEvents(data.events || []);
      setError(null);
    } catch (err) {
      setError('Impossible de charger les événements.');
      console.error('Erreur API:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  // Premier chargement
  useEffect(() => { fetchEvents('', activeFilter); }, [activeFilter]);

  // ── Recherche avec délai anti-rebond 400ms ───────────────────
  // Pourquoi un délai ? Si on faisait un appel API à chaque frappe,
  // taper "jazz" ferait 4 appels API : "j", "ja", "jaz", "jazz".
  // Avec le délai, on attend 400ms après la dernière frappe.
  // Si l'utilisateur tape vite, on annule le timer précédent.
  const handleSearchChange = (text) => {
    setSearchText(text);

    // Annuler le timer précédent s'il existe
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Démarrer un nouveau timer de 400ms
    debounceTimer.current = setTimeout(() => {
      setLoading(true);
      fetchEvents(text, activeFilter);
    }, 400);
  };

  // ── Valider la recherche (appui sur Entrée) ──────────────────
  const handleSearchSubmit = () => {
    if (!searchText.trim()) return;

    // Ajouter à l'historique (max 5, sans doublons)
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== searchText.trim());
      return [searchText.trim(), ...filtered].slice(0, 5);
    });

    // Lancer la recherche immédiatement
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setLoading(true);
    fetchEvents(searchText, activeFilter);
  };

  // ── Effacer la recherche ─────────────────────────────────────
  const handleClearSearch = () => {
    setSearchText('');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setLoading(true);
    fetchEvents('', activeFilter);
  };

  // ── Fermer la recherche ──────────────────────────────────────
  const handleCloseSearch = () => {
    setSearchActive(false);
    handleClearSearch();
  };

  // ── Changement de filtre ─────────────────────────────────────
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setLoading(true);
    // fetchEvents sera appelé par useEffect sur activeFilter
  };

  // Pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents(searchText, activeFilter);
  };

  // Navigation
  const goToDetail = (event) => navigation?.navigate('EventDetail', { event });
  const goToLogin  = ()      => navigation?.navigate('Login');

  // Découpe des événements pour les sections
  const featuredEvent = events[0]    || null;
  const smallEvents   = events.slice(1, 3);
  const restEvents    = events.slice(3);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <SafeAreaView style={styles.safe}>

        {/* ══ HEADER ══════════════════════════════════════════ */}
        <View style={styles.header}>

          {/* Mode recherche active — affiche la barre de recherche */}
          {searchActive ? (
            <View style={styles.searchBarActive}>
              <Ionicons name="search-outline" size={18} color={C.green} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un événement..."
                placeholderTextColor={C.textMut}
                value={searchText}
                onChangeText={handleSearchChange}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              {/* Bouton effacer — visible seulement si du texte est saisi */}
              {searchText.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch}>
                  <Ionicons name="close-circle" size={18} color={C.textMut} />
                </TouchableOpacity>
              )}
              {/* Bouton annuler la recherche */}
              <TouchableOpacity onPress={handleCloseSearch} style={styles.cancelBtn}>
                <Text style={styles.cancelTxt}>Annuler</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Mode normal — logo + icônes
            <>
              <View style={styles.logoRow}>
                <View style={styles.logoMark}>
                  <Ionicons name="calendar-outline" size={20} color={C.white} />
                </View>
                <Text style={styles.logoTxt}>
                  <Text style={styles.logoEas}>Eas</Text>
                  <Text style={styles.logoEven}>Even</Text>
                </Text>
              </View>
              <View style={styles.headerRight}>
                {/* Icône loupe — active la barre de recherche */}
                <TouchableOpacity
                  style={styles.hdrBtn}
                  onPress={() => setSearchActive(true)}
                >
                  <Ionicons name="search-outline" size={22} color={C.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.hdrBtn}>
                  <View style={styles.notifWrap}>
                    <Ionicons name="notifications-outline" size={22} color={C.text} />
                    <View style={styles.notifDot} />
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ══ SCROLL PRINCIPAL ════════════════════════════════ */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollPad}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.green}
              colors={[C.green]}
            />
          }
        >

          {/* ── Recherches récentes (mode recherche active) ─── */}
          {searchActive && !searchText && recentSearches.length > 0 && (
            <View style={styles.recentBox}>
              <Text style={styles.recentTitle}>Recherches récentes</Text>
              {recentSearches.map((term, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.recentItem}
                  onPress={() => {
                    setSearchText(term);
                    handleSearchChange(term);
                  }}
                >
                  <Ionicons name="time-outline" size={15} color={C.textMut} />
                  <Text style={styles.recentTxt}>{term}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setRecentSearches([])}
                style={styles.clearRecentBtn}
              >
                <Text style={styles.clearRecentTxt}>Effacer l'historique</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Titre et filtres (mode normal) ───────────────── */}
          {!searchActive && (
            <>
              <Text style={styles.pageTitle}>Fil de Découverte</Text>

              {/* Filtres par type */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersRow}
              >
                {FILTERS.map(f => (
                  <FilterPill
                    key={f.label}
                    label={f.label}
                    icon={f.icon}
                    active={activeFilter.label === f.label}
                    onPress={() => handleFilterChange(f)}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* ── Résumé de la recherche ────────────────────────── */}
          {searchText && !loading && (
            <View style={styles.searchSummary}>
              <Text style={styles.searchSummaryTxt}>
                {events.length} résultat{events.length > 1 ? 's' : ''} pour
                <Text style={styles.searchSummaryQuery}> "{searchText}"</Text>
              </Text>
            </View>
          )}

          {/* ── Chargement ───────────────────────────────────── */}
          {loading && (
            <ActivityIndicator size="large" color={C.green} style={{ marginTop: 60 }} />
          )}

          {/* ── Erreur ───────────────────────────────────────── */}
          {!loading && error && (
            <View style={styles.errorBox}>
              <Ionicons name="wifi-outline" size={40} color={C.textMut} />
              <Text style={styles.errorTitle}>Connexion impossible</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchEvents(searchText, activeFilter)}
              >
                <Text style={styles.retryTxt}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Contenu principal ────────────────────────────── */}
          {!loading && !error && (
            <>
              {/* Section invitations — masquée en mode recherche */}
              {!searchActive && !searchText && (
                <View style={styles.sec}>
                  <View style={styles.secRow}>
                    <Text style={styles.secTitle}>Vos Invitations</Text>
                    {isLoggedIn && (
                      <TouchableOpacity>
                        <Text style={styles.secLink}>Voir tout</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <InvitationCard
                    event={featuredEvent}
                    onPress={isLoggedIn ? goToDetail : goToLogin}
                    isLoggedIn={isLoggedIn}
                    onLoginPress={goToLogin}
                  />
                </View>
              )}

              {/* Section événements publics */}
              <View style={styles.sec}>
                {!searchText && (
                  <View style={styles.secRow}>
                    <Text style={styles.secTitle}>Événements Publics</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{events.length}</Text>
                    </View>
                  </View>
                )}

                {/* Aucun résultat */}
                {events.length === 0 && (
                  <View style={styles.emptyBox}>
                    <Ionicons name="search-outline" size={44} color={C.textMut} />
                    <Text style={styles.emptyTitle}>Aucun résultat</Text>
                    <Text style={styles.emptySub}>
                      {searchText
                        ? `Aucun événement ne correspond à "${searchText}"`
                        : 'Aucun événement disponible pour ce filtre.'
                      }
                    </Text>
                    {searchText && (
                      <TouchableOpacity style={styles.retryBtn} onPress={handleClearSearch}>
                        <Text style={styles.retryTxt}>Effacer la recherche</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* En mode recherche — toutes les cards en format standard */}
                {searchText && events.map(ev => (
                  <CardStandard key={ev.id} event={ev} onPress={goToDetail} />
                ))}

                {/* Mode normal — layout Figma */}
                {!searchText && events.length > 0 && (
                  <>
                    {featuredEvent && (
                      <CardFeatured event={featuredEvent} onPress={goToDetail} />
                    )}
                    {smallEvents.length > 0 && (
                      <View style={styles.smallRow}>
                        {smallEvents.map(ev => (
                          <CardSmall key={ev.id} event={ev} onPress={goToDetail} />
                        ))}
                      </View>
                    )}
                    {restEvents.map(ev => (
                      <CardStandard key={ev.id} event={ev} onPress={goToDetail} />
                    ))}
                  </>
                )}
              </View>

              {/* Bannière téléchargement — masquée en mode recherche */}
              {!searchText && (
                <View style={styles.dlBanner}>
                  <View style={styles.dlLeft}>
                    <View style={styles.dlIconBox}>
                      <Ionicons name="phone-portrait-outline" size={24} color={C.white} />
                    </View>
                    <View>
                      <Text style={styles.dlTitle}>Organisez vos événements</Text>
                      <Text style={styles.dlSub}>Télécharger l'application</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.dlBtn} activeOpacity={0.85}>
                    <Text style={styles.dlBtnTxt}>Installer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
       </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  root: { flex: 1, backgroundColor: C.bg },
  safe: {
  flex: 1,
  backgroundColor: C.white,
  paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
},
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
    minHeight: 60,
  },
  logoRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  logoTxt:  { fontSize: 22, letterSpacing: -0.3 },
  logoEas:  { color: C.text,   fontWeight: '800' },
  logoEven: { color: C.orange, fontWeight: '800' },
  headerRight: { flexDirection: 'row', gap: 2 },
  hdrBtn:      { padding: 8 },
  notifWrap:   { position: 'relative' },
  notifDot: {
    position: 'absolute', top: 1, right: 1,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: C.orange,
    borderWidth: 1, borderColor: C.white,
  },

  // Barre de recherche active
  searchBarActive: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: C.text,
    paddingVertical: 8,
  },
  cancelBtn: { paddingLeft: 4 },
  cancelTxt: { fontSize: 14, color: C.green, fontWeight: '600' },

  // Scroll
  scroll:    { flex: 1, backgroundColor: C.bg },
  scrollPad: { paddingBottom: 20 },

  // Titre
  pageTitle: {
    fontSize: 26, fontWeight: '800', color: C.text,
    letterSpacing: -0.5,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },

  // Filtres
  filtersRow: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 100, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.white,
    marginRight: 4,
  },
  pillActive:     { backgroundColor: C.green, borderColor: C.green },
  pillText:       { fontSize: 13, fontWeight: '600', color: C.textSub },
  pillTextActive: { color: C.white },

  // Recherches récentes
  recentBox: { padding: 20, paddingBottom: 0 },
  recentTitle: {
    fontSize: 13, fontWeight: '700',
    color: C.textMut, marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  recentTxt: { fontSize: 15, color: C.text, fontWeight: '500' },
  clearRecentBtn: { paddingVertical: 14, alignItems: 'center' },
  clearRecentTxt: { fontSize: 13, color: C.orange, fontWeight: '600' },

  // Résumé recherche
  searchSummary: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  searchSummaryTxt:   { fontSize: 14, color: C.textSub },
  searchSummaryQuery: { color: C.text, fontWeight: '700' },

  // Sections
  sec: { paddingHorizontal: 20, marginBottom: 10 },
  secRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  secTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  secLink:  { fontSize: 14, fontWeight: '600', color: C.green },
  countBadge: {
    backgroundColor: C.greenLight, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countText: { fontSize: 12, fontWeight: '700', color: C.green },

  // Card connexion
  loginCard: {
    backgroundColor: C.white, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: C.border,
    marginBottom: 8,
  },
  loginCardIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: C.greenLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  loginCardText:    { marginBottom: 16 },
  loginCardTitle:   { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  loginCardSub:     { fontSize: 13, color: C.textSub, lineHeight: 19 },
  loginCardBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: C.green, borderRadius: 12, paddingVertical: 13,
  },
  loginCardBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

  // InvitCard
  invitCard: {
    backgroundColor: C.white, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  invitImage:     { width: '100%', height: 230 },
  invitBody:      { padding: 16 },
  invitHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  invitBadge: {
    backgroundColor: C.orangeLight, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.orange,
  },
  invitBadgeText: { fontSize: 10, fontWeight: '800', color: C.orange, letterSpacing: 0.5 },
  invitDateText:  { fontSize: 13, color: C.textMut, fontWeight: '500' },
  invitTitle: {
    fontSize: 19, fontWeight: '800', color: C.text,
    letterSpacing: -0.3, marginBottom: 8,
  },
  invitBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: C.green, borderRadius: 12,
    paddingVertical: 14, marginTop: 12,
  },
  invitBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

  // LocationRow
  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, marginBottom: 4,
  },
  locationText: { fontSize: 12.5, fontWeight: '500', flex: 1 },

  // CardFeatured
  cardFeatured: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardFeaturedImg: { width: '100%', height: 220 },
  cardFeaturedBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  cardFeaturedBadgeTxt: { fontSize: 10, fontWeight: '800', color: C.green, letterSpacing: 0.5 },
  cardFeaturedFooter: {
    backgroundColor: C.white, padding: 14,
    borderWidth: 1, borderTopWidth: 0, borderColor: C.border,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  cardFeaturedDate:  { fontSize: 12, color: C.orange, fontWeight: '700', marginBottom: 4 },
  cardFeaturedRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  cardFeaturedTitle: { fontSize: 17, fontWeight: '800', color: C.text, flex: 1, letterSpacing: -0.2 },
  addCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // CardSmall
  smallRow:  { flexDirection: 'row', gap: 12, marginBottom: 12 },
  cardSmall: {
    flex: 1, backgroundColor: C.white,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
  },
  cardSmallImg:   { width: '100%', height: 110 },
  cardSmallBody:  { padding: 10 },
  cardSmallDate:  { fontSize: 11, color: C.orange, fontWeight: '700', marginBottom: 3 },
  cardSmallTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8, lineHeight: 17 },
  inscribeBtn: {
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 8, paddingVertical: 7, alignItems: 'center',
  },
  inscribeTxt: { fontSize: 12, fontWeight: '600', color: C.text },

  // CardStandard
  cardStd: {
    backgroundColor: C.white, borderRadius: 16, overflow: 'hidden',
    marginBottom: 16, borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardStdImgBox: { height: 200, position: 'relative' },
  cardStdImg:    { width: '100%', height: '100%' },
  dateBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: C.orange, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  dateBadgeTxt:  { color: C.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  bookmarkBtn:   { position: 'absolute', top: 10, right: 10 },
  bookmarkInner: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  cardStdBody:  { padding: 14 },
  cardStdTitle: { fontSize: 17, fontWeight: '800', color: C.green, marginBottom: 10, letterSpacing: -0.2 },
  cardStdMeta:  { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontSize: 12.5, color: C.textMut, fontWeight: '500', flex: 1 },

  // Bannière
  dlBanner: {
    marginHorizontal: 20, marginTop: 4, marginBottom: 12,
    backgroundColor: C.green, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dlLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dlIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  dlTitle:  { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  dlSub:    { fontSize: 15, color: C.white, fontWeight: '800' },
  dlBtn:    { backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  dlBtnTxt: { color: C.white, fontSize: 14, fontWeight: '800' },

  // États
  errorBox:   { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 40 },
  errorTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 12, marginBottom: 6 },
  errorText:  { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  retryBtn:   { backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryTxt:   { color: C.white, fontSize: 14, fontWeight: '700' },

  emptyBox:   { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 12, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: C.textMut, textAlign: 'center', lineHeight: 19, marginBottom: 16 },

  // Navigation bas
  bottomNav: {
    flexDirection: 'row', backgroundColor: C.white,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 3, position: 'relative', paddingVertical: 4,
  },
  tabLbl: {
    fontSize: 10, fontWeight: '600', color: C.textMut,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  tabIndicator: {
    position: 'absolute', top: 0,
    width: 20, height: 2.5,
    backgroundColor: C.green, borderRadius: 2,
  },
});