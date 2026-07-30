import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { XIcon } from '../components/icons';
import { theme } from '../theme';
import { ExerciseCategory } from '../types';

export type NewExerciseInput = {
  title: string;
  category: ExerciseCategory;
  durationSeconds: number;
  segments: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (input: NewExerciseInput) => void;
};

type DurationUnit = 'sec' | 'min';

const SEGMENT_OPTIONS = [1, 2, 3];

const CATEGORY_OPTIONS: { key: ExerciseCategory; label: string }[] = [
  { key: 'warmup', label: 'Warmup' },
  { key: 'workout', label: 'Workout' },
  { key: 'cooldown', label: 'Cooldown' },
];

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AddExerciseScreen({ visible, onClose, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState<DurationUnit | null>(null);
  const [segments, setSegments] = useState<number | null>(null);
  const [category, setCategory] = useState<ExerciseCategory | null>(null);

  // Fresh form every time the screen is opened
  useEffect(() => {
    if (visible) {
      setTitle('');
      setDurationValue('');
      setDurationUnit(null);
      setSegments(null);
      setCategory(null);
    }
  }, [visible]);

  const parsedDuration = parseInt(durationValue, 10);
  const durationSeconds =
    Number.isFinite(parsedDuration) && parsedDuration > 0 && durationUnit
      ? durationUnit === 'min'
        ? parsedDuration * 60
        : parsedDuration
      : 0;
  const canAdd =
    title.trim().length > 0 &&
    durationSeconds > 0 &&
    segments !== null &&
    category !== null;

  const handleAdd = () => {
    if (!canAdd || segments === null || category === null) return;
    onAdd({
      title: title.trim(),
      category,
      durationSeconds,
      segments,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New exercise</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            hitSlop={8}
          >
            <XIcon size={14} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Jumping jacks"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="done"
            autoCorrect={false}
          />

          <Text style={styles.fieldLabel}>Duration</Text>
          <View style={styles.durationRow}>
            <TextInput
              style={[styles.input, styles.durationInput]}
              value={durationValue}
              onChangeText={(t) => setDurationValue(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="0"
              placeholderTextColor={theme.colors.textTertiary}
            />
            <Chip
              label="sec"
              selected={durationUnit === 'sec'}
              onPress={() => setDurationUnit('sec')}
            />
            <Chip
              label="min"
              selected={durationUnit === 'min'}
              onPress={() => setDurationUnit('min')}
            />
          </View>

          <Text style={styles.fieldLabel}>Segments</Text>
          <View style={styles.chipRow}>
            {SEGMENT_OPTIONS.map((n) => (
              <Chip
                key={n}
                label={String(n)}
                selected={segments === n}
                onPress={() => setSegments(n)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORY_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={category === option.key}
                onPress={() => setCategory(option.key)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleAdd}
            disabled={!canAdd}
            style={({ pressed }) => [
              styles.addButton,
              !canAdd && styles.addButtonDisabled,
              pressed && canAdd && styles.pressed,
            ]}
          >
            <Text style={styles.addButtonText}>Add exercise</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.pageTitle,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    width: 33,
    height: 33,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.buttonMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  fieldLabel: {
    ...theme.typography.sectionLabel,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  input: {
    height: 48,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.textPrimary,
    ...theme.typography.body,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  durationInput: {
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  chipRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  chip: {
    flex: 1,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  chipSelected: {
    borderWidth: 2,
    borderColor: theme.colors.textPrimary,
  },
  chipText: {
    ...theme.typography.label,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  addButton: {
    height: 48,
    backgroundColor: theme.colors.addButtonBg,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.35,
  },
  addButtonText: {
    ...theme.typography.addButton,
    color: theme.colors.addButtonText,
  },
  pressed: {
    opacity: 0.85,
  },
});
