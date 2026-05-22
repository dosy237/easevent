/**
 * App.js — Easevent
 * ════════════════════════════════════════════════════════════════
 * Point d'entrée de l'application.
 *
 * ARCHITECTURE DE NAVIGATION :
 * ─────────────────────────────
 * L'app a deux univers distincts selon l'état d'authentification.
 *
 * VISITEUR (non connecté) :
 *   PublicStack
 *   ├── HomeScreen       → fil d'événements publics
 *   ├── EventDetailScreen → détail d'un événement
 *   └── LoginScreen      → connexion / inscription
 *
 * UTILISATEUR CONNECTÉ :
 *   AppTabs (barre de navigation permanente en bas)
 *   ├── Tab "Accueil"   → DashboardStack
 *   │   ├── DashboardScreen      → tableau de bord personnel
 *   │   └── EventDashboardScreen → gérer un événement (à venir)
 *   ├── Tab "Découvrir" → DiscoverStack
 *   │   ├── HomeScreen           → fil public
 *   │   └── EventDetailScreen    → détail événement
 *   ├── Tab "Créer"     → CreateEventScreen
 *   ├── Tab "Billets"   → TicketsScreen (à venir)
 *   └── Tab "Profil"    → ProfileScreen
 *
 * POURQUOI CETTE ARCHITECTURE ?
 * ──────────────────────────────
 * - L'utilisateur connecté a une barre de navigation permanente
 *   qui ne disparaît jamais, même en naviguant dans les sous-écrans.
 * - Chaque onglet a sa propre pile (Stack) indépendante.
 *   Naviguer dans "Découvrir" ne réinitialise pas "Accueil".
 * - Le changement visiteur ↔ connecté est instantané et automatique
 *   grâce à isAuthenticated dans AuthContext.
 * ════════════════════════════════════════════════════════════════
 */

import React                          from 'react';
import { View, ActivityIndicator,
         TouchableOpacity, Text,
         StyleSheet, Platform }       from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { SafeAreaProvider }           from 'react-native-safe-area-context';
import { StatusBar }                  from 'expo-status-bar';
import { Ionicons }                   from '@expo/vector-icons';

import { AuthProvider, useAuth }  from './context/AuthContext';
import HomeScreen                 from './screens/HomeScreen';
import EventDetailScreen          from './screens/EventDetailScreen';
import LoginScreen                from './screens/LoginScreen';
import ProfileScreen              from './screens/ProfileScreen';
import DashboardScreen            from './screens/DashboardScreen';
import CreateEventScreen          from './screens/CreateEventScreen';
import EventDashboardScreen       from './screens/EventDashboardScreen';

// ─────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────
const C = {
  green:      '#1B6B4A',
  greenLight: '#E8F5EE',
  orange:     '#E76F51',
  white:      '#FFFFFF',
  bg:         '#F7F7F7',
  text:       '#1A1A1A',
  textMut:    '#9E9E9E',
  border:     '#E8E8E8',
};

// ─────────────────────────────────────────────────────────────────
// NAVIGATEURS
// ─────────────────────────────────────────────────────────────────
const PublicStack  = createNativeStackNavigator();
const DashStack    = createNativeStackNavigator();
const DiscoverStack= createNativeStackNavigator();
const Tabs         = createBottomTabNavigator();

// ════════════════════════════════════════════════════════════════
// NAVIGATEUR PUBLIC — Visiteurs non connectés
// Accessible sans compte : découverte + connexion
// ════════════════════════════════════════════════════════════════
function PublicNavigator() {
  return (
    <PublicStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Écran d'accueil public — fil d'événements */}
      <PublicStack.Screen name="Home"        component={HomeScreen} />
      {/* Détail d'un événement public */}
      <PublicStack.Screen name="EventDetail" component={EventDetailScreen} />
      {/* Connexion / Inscription */}
      <PublicStack.Screen name="Login"       component={LoginScreen} />
    </PublicStack.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════
// STACK : Tableau de bord
// Pile d'écrans pour l'onglet "Accueil" de l'utilisateur connecté.
// Contient le dashboard + les écrans de gestion d'événement.
// ════════════════════════════════════════════════════════════════
function DashboardStackNavigator() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tableau de bord principal */}
      <DashStack.Screen name="Dashboard"    component={DashboardScreen} />
      {/* Créer un événement — accessible depuis le dashboard */}
      <DashStack.Screen name="CreateEvent"  component={CreateEventScreen} />
      {/* Gérer un événement spécifique — à implémenter Epic 3 */}
      <DashStack.Screen name="EventDashboard" component={EventDashboardScreen} />
      {/* <DashStack.Screen name="EventDashboard" component={EventDashboardScreen} /> */}
    </DashStack.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════
// STACK : Découverte
// Pile d'écrans pour l'onglet "Découvrir".
// L'utilisateur connecté peut aussi parcourir le fil public.
// ════════════════════════════════════════════════════════════════
function DiscoverStackNavigator() {
  return (
    <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Fil public d'événements */}
      <DiscoverStack.Screen name="DiscoverHome"  component={HomeScreen} />
      {/* Détail d'un événement depuis la découverte */}
      <DiscoverStack.Screen name="EventDetail"   component={EventDetailScreen} />
    </DiscoverStack.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════
// ÉCRAN : TicketsScreen (placeholder)
// Sera implémenté dans l'Epic 4.
// Affiche un message clair en attendant.
// ════════════════════════════════════════════════════════════════
function TicketsScreen() {
  return (
    <View style={placeholderStyles.root}>
      <Ionicons name="ticket-outline" size={56} color={C.textMut} />
      <Text style={placeholderStyles.title}>Mes Billets</Text>
      <Text style={placeholderStyles.sub}>
        Vos billets d'événements apparaîtront ici.{'\n'}
        Souscrivez à un événement pour commencer.
      </Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 22, fontWeight: '800', color: C.text,
    marginTop: 16, marginBottom: 8,
  },
  sub: {
    fontSize: 14, color: C.textMut,
    textAlign: 'center', lineHeight: 21,
  },
});

// ════════════════════════════════════════════════════════════════
// NAVIGATEUR TABS — Utilisateurs connectés
// Barre de navigation permanente en bas avec 5 onglets.
// ════════════════════════════════════════════════════════════════
function AppTabNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // ── Icône de chaque onglet ────────────────────────────
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            TabDashboard: focused ? 'home'          : 'home-outline',
            TabDiscover:  focused ? 'compass'       : 'compass-outline',
            TabCreate:    focused ? 'add-circle'    : 'add-circle-outline',
            TabTickets:   focused ? 'ticket'        : 'ticket-outline',
            TabProfile:   focused ? 'person'        : 'person-outline',
          };
          return (
            <Ionicons
              name={icons[route.name] || 'ellipse-outline'}
              size={route.name === 'TabCreate' ? 30 : size}
              color={color}
            />
          );
        },

        // ── Couleurs de la barre ──────────────────────────────
        tabBarActiveTintColor:   C.green,
        tabBarInactiveTintColor: C.textMut,

        // ── Style de la barre ─────────────────────────────────
        tabBarStyle: {
          backgroundColor:  C.white,
          borderTopWidth:   1,
          borderTopColor:   C.border,
          paddingBottom:    Platform.OS === 'ios' ? 20 : 8,
          paddingTop:       8,
          height:           Platform.OS === 'ios' ? 84 : 64,
        },

        // ── Style du label ────────────────────────────────────
        tabBarLabelStyle: {
          fontSize:      10,
          fontWeight:    '600',
          textTransform: 'uppercase',
          letterSpacing: 0.3,
          marginTop:     2,
        },

        // ── Style du badge ────────────────────────────────────
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      {/* ── Onglet Accueil (Dashboard) ──────────────────────── */}
      <Tabs.Screen
        name="TabDashboard"
        component={DashboardStackNavigator}
        options={{ tabBarLabel: 'Accueil' }}
      />

      {/* ── Onglet Découvrir ────────────────────────────────── */}
      <Tabs.Screen
        name="TabDiscover"
        component={DiscoverStackNavigator}
        options={{ tabBarLabel: 'Découvrir' }}
      />

      {/* ── Onglet Créer (mis en avant — orange) ────────────── */}
      <Tabs.Screen
        name="TabCreate"
        component={CreateEventScreen}
        options={{
          tabBarLabel: 'Créer',
          tabBarActiveTintColor:   C.orange,
          tabBarInactiveTintColor: C.orange,
        }}
      />

      {/* ── Onglet Billets ──────────────────────────────────── */}
      <Tabs.Screen
        name="TabTickets"
        component={TicketsScreen}
        options={{ tabBarLabel: 'Billets' }}
      />

      {/* ── Onglet Profil ───────────────────────────────────── */}
      <Tabs.Screen
        name="TabProfile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profil' }}
      />
    </Tabs.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════
// NAVIGATEUR RACINE
// Choisit automatiquement entre PublicNavigator et AppTabNavigator
// selon l'état d'authentification (isAuthenticated).
//
// isLoading = true → spinner pendant la vérification du stockage
// isAuthenticated  → AppTabNavigator (barre du bas + tous les écrans)
// non connecté     → PublicNavigator (accueil public + login)
// ════════════════════════════════════════════════════════════════
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // Pendant la vérification initiale du token stocké
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  // Choix automatique selon l'état de connexion
  return isAuthenticated ? <AppTabNavigator /> : <PublicNavigator />;
}

// ════════════════════════════════════════════════════════════════
// COMPOSANT RACINE : App
// Enveloppe toute l'app avec les providers nécessaires.
//
// SafeAreaProvider → gère les encoches iPhone et barres Android
// AuthProvider     → partage l'état d'auth dans toute l'app
// NavigationContainer → active la navigation React Navigation
// ════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}