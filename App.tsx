import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DayScreen } from './src/screens/DayScreen';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { theme } from './src/theme';

// Keep the native splash up until the animated loading screen has rendered,
// so there is never a flash of unstyled content between the two.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 300 });

// Minimum time the loading screen stays up, so its intro animation always
// completes instead of flickering away on fast launches.
const MIN_LOADING_MS = 1500;

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [minHoldDone, setMinHoldDone] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinHoldDone(true), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <StatusBar style="light" />
          <DayScreen onHydrated={() => setHydrated(true)} />
          {!loadingDone && (
            <LoadingScreen
              dismiss={hydrated && minHoldDone}
              onDone={() => setLoadingDone(true)}
            />
          )}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
