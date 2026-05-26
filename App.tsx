import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { DayScreen } from './src/screens/DayScreen';
import { theme } from './src/theme';

export default function App() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <DayScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
