import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  FlatList,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

// ─── Design Tokens ───────────────────────────────────────────────
const COLORS = {
  primary: '#1B6B4A',       // deep forest green
  primaryLight: '#2D9164',  // medium green
  accent: '#F97316',        // vibrant orange (date badges)
  accentSoft: '#FFF3EA',    // orange tint
  bg: '#F8FAF9',            // near white with green tint
  card: '#FFFFFF',
  textPrimary: '#0F1F18',
  textSecondary: '#5C7268',
  textMuted: '#9AB5A8',
  border: '#E2EDE8',
  pillActive: '#1B6B4A',
  pillInactive: '#FFFFFF',
  shadow: 'rgba(27,107,74,0.12)',
};

const FONTS = {
  logo: Platform.select({ web: "'Playfair Display', Georgia, serif", default: 'serif' }),
  heading: Platform.select({ web: "'DM Sans', system-ui, sans-serif", default: 'System' }),
  body: Platform.select({ web: "'DM Sans', system-ui, sans-serif", default: 'System' }),
};

// ─── Event Data ───────────────────────────────────────────────────
const EVENTS = [
  {
    id: '1',
    title: 'Annual Tech Gala 2024',
    date: 'OCT 24',
    location: 'Grand Ballroom, New York',
    guests: 150,
    category: 'Tech',
    image: 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800',
    saved: false,
  },
  {
    id: '2',
    title: 'Emerald Gardens Private Soirée',
    date: 'NOV 02',
    location: 'Private Estate, Beverly Hills',
    guests: 45,
    category: 'Private',
    image: 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg?auto=compress&cs=tinysrgb&w=800',
    saved: false,
  },
  {
    id: '3',
    title: 'Modernism Art Unveiling',
    date: 'NOV 15',
    location: 'Lumière Gallery, London',
    guests: 210,
    category: 'Gala',
    image: 'https://images.pexels.com/photos/1840608/pexels-photo-1840608.jpeg?auto=compress&cs=tinysrgb&w=800',
    saved: false,
  },
  {
    id: '4',
    title: 'Rooftop Jazz Evening',
    date: 'DEC 01',
    location: 'Sky Lounge, Paris',
    guests: 80,
    category: 'Gala',
    image: 'https://images.pexels.com/photos/1407322/pexels-photo-1407322.jpeg?auto=compress&cs=tinysrgb&w=800',
    saved: false,
  },
  {
    id: '5',
    title: 'Startup Pitch Night',
    date: 'DEC 10',
    location: 'Innovation Hub, Berlin',
    guests: 320,
    category: 'Tech',
    image: 'https://images.pexels.com/photos/7648047/pexels-photo-7648047.jpeg?auto=compress&cs=tinysrgb&w=800',
    saved: false,
  },
];

const CATEGORIES = ['All Events', 'Gala', 'Tech', 'Private', 'Wedding'];

// ─── BookmarkIcon ─────────────────────────────────────────────────
const BookmarkIcon = ({ filled }) => (
  <View style={styles.bookmarkIcon}>
    <Text style={{ color: filled ? COLORS.accent : COLORS.card, fontSize: 16, fontWeight: '700' }}>
      {filled ? '🔖' : '◻'}
    </Text>
  </View>
);

// ─── LocationIcon ─────────────────────────────────────────────────
const LocationPin = () => (
  <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>📍</Text>
);

const GuestIcon = () => (
  <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>👥</Text>
);

// ─── EventCard ────────────────────────────────────────────────────
const EventCard = ({ event, onSave }) => {
  const [saved, setSaved] = useState(event.saved);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSave = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    setSaved(!saved);
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.cardImageWrapper}>
        <Image
          source={{ uri: event.image }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        {/* Gradient overlay */}
        <View style={styles.cardImageOverlay} />
        {/* Date badge */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{event.date}</Text>
        </View>
        {/* Save button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <View style={styles.saveButtonInner}>
            <Text style={{ color: saved ? COLORS.accent : COLORS.textSecondary, fontSize: 13, fontWeight: '700' }}>
              {saved ? '★' : '☆'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaItem}>
            <LocationPin />
            <Text style={styles.cardMetaText}>{event.location}</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <GuestIcon />
            <Text style={styles.cardMetaText}>{event.guests} guests attending</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── CategoryPill ─────────────────────────────────────────────────
const CategoryPill = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── BottomTab ────────────────────────────────────────────────────
const BottomTab = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
    <Text style={[styles.tabIcon, active && { color: COLORS.primary }]}>{icon}</Text>
    <Text style={[styles.tabLabel, active && { color: COLORS.primary, fontWeight: '700' }]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Main HomeScreen ──────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('All Events');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('explore');
  const [events, setEvents] = useState(EVENTS);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const filteredEvents = events.filter(e => {
    const matchCat = activeCategory === 'All Events' || e.category === activeCategory;
    const matchSearch =
      !searchText ||
      e.title.toLowerCase().includes(searchText.toLowerCase()) ||
      e.location.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  const containerStyle = IS_WEB
    ? { maxWidth: 480, alignSelf: 'center', width: '100%' }
    : {};

  return (
    <View style={[styles.root, containerStyle]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>

        {/* ── Header ─────────────────────────────── */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerLeft}>
            {/* Logo */}
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoIconText}>⟳</Text>
              </View>
              <Text style={styles.logoText}>
                <Text style={styles.logoEas}>Eas</Text>
                <Text style={styles.logoEven}>Even</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.avatarButton} activeOpacity={0.8}>
            <View style={styles.avatar}>
              <Text style={{ color: COLORS.card, fontSize: 16 }}>👤</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Scrollable content ─────────────────── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search bar */}
          <Animated.View style={[styles.searchRow, { opacity: fadeAnim }]}>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search exclusive events..."
                placeholderTextColor={COLORS.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Category pills */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              {CATEGORIES.map(cat => (
                <CategoryPill
                  key={cat}
                  label={cat}
                  active={activeCategory === cat}
                  onPress={() => setActiveCategory(cat)}
                />
              ))}
            </ScrollView>
          </Animated.View>

          {/* Section label */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeCategory === 'All Events' ? 'Upcoming Events' : activeCategory}
            </Text>
            <Text style={styles.sectionCount}>{filteredEvents.length} events</Text>
          </View>

          {/* Events list */}
          {filteredEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🗓</Text>
              <Text style={styles.emptyStateText}>No events found</Text>
              <Text style={styles.emptyStateSubtext}>Try a different search or category</Text>
            </View>
          ) : (
            filteredEvents.map((event, index) => (
              <Animated.View
                key={event.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                <EventCard event={event} />
              </Animated.View>
            ))
          )}

          {/* Bottom spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Bottom Navigation ──────────────────── */}
        <View style={styles.bottomNav}>
          <BottomTab icon="🧭" label="Explore" active={activeTab === 'explore'} onPress={() => setActiveTab('explore')} />
          <BottomTab icon="🔖" label="Saved" active={activeTab === 'saved'} onPress={() => setActiveTab('saved')} />
          <BottomTab icon="🎟" label="Tickets" active={activeTab === 'tickets'} onPress={() => setActiveTab('tickets')} />
          <BottomTab icon="👤" label="Profile" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
        </View>

      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 12,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconText: {
    color: COLORS.card,
    fontSize: 18,
    fontWeight: '800',
  },
  logoText: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  logoEas: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  logoEven: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  avatarButton: {
    padding: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 20,
  },

  // Search
  searchRow: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    padding: 0,
    margin: 0,
  },

  // Pills
  pillsRow: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 8,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1.5,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillInactive: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  pillText: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  pillTextActive: {
    color: COLORS.card,
  },
  pillTextInactive: {
    color: COLORS.textSecondary,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // Card
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImageWrapper: {
    height: 200,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dateBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dateBadgeText: {
    color: COLORS.card,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  saveButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  cardMeta: {
    gap: 6,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardMetaText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabIcon: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});