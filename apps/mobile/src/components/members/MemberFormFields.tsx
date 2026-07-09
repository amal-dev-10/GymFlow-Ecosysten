import React from 'react';
import { StyleSheet, Text, TextInput, View, Pressable, Modal, Platform } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../theme/theme';
import type { Control, FieldErrors, UseFormRegister, Controller as RHFController } from 'react-hook-form';
import { Controller } from 'react-hook-form';

// ---------------------------------------------------------------------------
// Shared form field components for Create/Edit member screens.
// Uses react-hook-form Controller for seamless integration.
// ---------------------------------------------------------------------------

interface FieldProps {
  control: any;
  errors: FieldErrors<any>;
}

// --- Text Field ---

interface TextFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  control: any;
  errors: FieldErrors<any>;
  required?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
}

export const FormTextField: React.FC<TextFieldProps> = ({
  name,
  label,
  placeholder,
  control,
  errors,
  required = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
}) => {
  const { colors, typography, spacing, radius } = useTheme();
  const error = errors[name];

  return (
    <View style={[styles.fieldContainer, { marginBottom: spacing.lg }]}>
      <Text
        style={[
          styles.label,
          {
            color: colors.textSecondary,
            fontSize: typography.sizes.caption.fontSize,
            fontWeight: '600',
            marginBottom: spacing.xs,
          },
        ]}
      >
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>

      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder || label}
            placeholderTextColor={colors.textMuted}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            accessibilityLabel={label}
            style={[
              styles.input,
              {
                color: colors.text,
                fontSize: typography.sizes.body.fontSize,
                backgroundColor: colors.surfaceElevated,
                borderRadius: radius.md,
                borderColor: error ? colors.error : colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                minHeight: multiline ? 80 : 48,
                textAlignVertical: multiline ? 'top' : 'center',
              },
            ]}
          />
        )}
      />

      {error && (
        <Text
          style={{
            color: colors.error,
            fontSize: typography.sizes.overline.fontSize,
            marginTop: spacing.xs,
          }}
        >
          {(error.message as string) || 'This field is required'}
        </Text>
      )}
    </View>
  );
};

interface DateFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  control: any;
  errors: FieldErrors<any>;
  required?: boolean;
}

export const FormDateField: React.FC<DateFieldProps> = ({
  name,
  label,
  placeholder,
  control,
  errors,
  required = false,
}) => {
  const { colors, typography, spacing, radius } = useTheme();
  const [show, setShow] = React.useState(false);
  const error = errors[name];

  return (
    <View style={[styles.fieldContainer, { marginBottom: spacing.lg }]}>
      <Text
        style={[
          styles.label,
          {
            color: colors.textSecondary,
            fontSize: typography.sizes.caption.fontSize,
            fontWeight: '600',
            marginBottom: spacing.xs,
          },
        ]}
      >
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>

      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => {
          const displayDate = value ? new Date(value) : null;
          const displayStr = displayDate && !isNaN(displayDate.getTime()) ? displayDate.toISOString().split('T')[0] : '';

          const handleDateChange = (event: any, selectedDate?: Date) => {
            if (Platform.OS === 'android') {
              setShow(false);
            }
            if (selectedDate) {
              const dateStr = selectedDate.toISOString().split('T')[0];
              onChange(dateStr);
            }
          };

          return (
            <>
              <Pressable
                onPress={() => setShow(true)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={[
                  styles.input,
                  styles.selectInput,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: radius.md,
                    borderColor: error ? colors.error : colors.border,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <Text style={{ color: displayStr ? colors.text : colors.textMuted, fontSize: typography.sizes.body.fontSize, flex: 1 }}>
                  {displayStr || placeholder || 'Select Date'}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </Pressable>

              {show && Platform.OS === 'ios' && (
                <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShow(false)}>
                  <View style={styles.iosModalContainer}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShow(false)} />
                    <View style={[styles.iosPickerBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }]}>
                      <DateTimePicker
                        value={displayDate && !isNaN(displayDate.getTime()) ? displayDate : new Date(Date.now() - 30 * 365 * 24 * 60 * 60 * 1000)} // Default to ~30 years ago for DOB
                        mode="date"
                        display="inline"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                      />
                      <Pressable
                        onPress={() => setShow(false)}
                        style={[styles.iosDoneButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '700' }}>Done</Text>
                      </Pressable>
                    </View>
                  </View>
                </Modal>
              )}

              {show && Platform.OS === 'android' && (
                <DateTimePicker
                  value={displayDate && !isNaN(displayDate.getTime()) ? displayDate : new Date(Date.now() - 30 * 365 * 24 * 60 * 60 * 1000)}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </>
          );
        }}
      />

      {error && (
        <Text
          style={{
            color: colors.error,
            fontSize: typography.sizes.overline.fontSize,
            marginTop: spacing.xs,
          }}
        >
          {(error.message as string) || 'This field is required'}
        </Text>
      )}
    </View>
  );
};

interface DropdownFieldProps {
  name: string;
  label: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  control: any;
  errors: FieldErrors<any>;
  required?: boolean;
}

export const FormDropdownField: React.FC<DropdownFieldProps> = ({
  name,
  label,
  options,
  placeholder,
  control,
  errors,
  required = false,
}) => {
  const { colors, typography, spacing, radius } = useTheme();
  const [show, setShow] = React.useState(false);
  const error = errors[name];

  return (
    <View style={[styles.fieldContainer, { marginBottom: spacing.lg }]}>
      <Text
        style={[
          styles.label,
          {
            color: colors.textSecondary,
            fontSize: typography.sizes.caption.fontSize,
            fontWeight: '600',
            marginBottom: spacing.xs,
          },
        ]}
      >
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>

      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => {
          const selectedOption = options.find(o => o.value === value);
          const displayLabel = selectedOption ? selectedOption.label : '';

          const handleSelect = (val: string) => {
            onChange(val);
            setShow(false);
          };

          return (
            <>
              <Pressable
                onPress={() => setShow(true)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={[
                  styles.input,
                  styles.selectInput,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: radius.md,
                    borderColor: error ? colors.error : colors.border,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <Text style={{ color: displayLabel ? colors.text : colors.textMuted, fontSize: typography.sizes.body.fontSize, flex: 1 }}>
                  {displayLabel || placeholder || `Select ${label}`}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </Pressable>

              {show && (
                <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShow(false)}>
                  <View style={styles.dropdownModalContainer}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShow(false)} />
                    <View style={[styles.dropdownPickerBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }]}>
                      <Text style={{ color: colors.text, fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700', marginBottom: spacing.md }}>
                        Select {label}
                      </Text>
                      {options.map((opt) => (
                        <Pressable
                          key={opt.value}
                          onPress={() => handleSelect(opt.value)}
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            {
                              backgroundColor: value === opt.value ? colors.primary + '12' : pressed ? colors.background : 'transparent',
                              borderRadius: radius.sm,
                              paddingVertical: spacing.md,
                              paddingHorizontal: spacing.sm,
                            }
                          ]}
                        >
                          <Text style={{ color: value === opt.value ? colors.primary : colors.text, fontSize: typography.sizes.body.fontSize, fontWeight: value === opt.value ? '700' : '500' }}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </Modal>
              )}
            </>
          );
        }}
      />

      {error && (
        <Text
          style={{
            color: colors.error,
            fontSize: typography.sizes.overline.fontSize,
            marginTop: spacing.xs,
          }}
        >
          {(error.message as string) || 'This field is required'}
        </Text>
      )}
    </View>
  );
};

interface PhoneFieldProps {
  name: string;
  label: string;
  control: any;
  errors: FieldErrors<any>;
  required?: boolean;
}

const COUNTRY_CODES = [
  { label: '🇮🇳 India (+91)', code: '+91' },
  { label: '🇺🇸 United States (+1)', code: '+1' },
  { label: '🇬🇧 United Kingdom (+44)', code: '+44' },
  { label: '🇦🇪 United Arab Emirates (+971)', code: '+971' },
  { label: '🇸🇬 Singapore (+65)', code: '+65' },
  { label: '🇦🇺 Australia (+61)', code: '+61' },
];

export const FormPhoneField: React.FC<PhoneFieldProps> = ({
  name,
  label,
  control,
  errors,
  required = false,
}) => {
  const { colors, typography, spacing, radius } = useTheme();
  const [showPicker, setShowPicker] = React.useState(false);
  const error = errors[name];

  return (
    <View style={[styles.fieldContainer, { marginBottom: spacing.lg }]}>
      <Text
        style={[
          styles.label,
          {
            color: colors.textSecondary,
            fontSize: typography.sizes.caption.fontSize,
            fontWeight: '600',
            marginBottom: spacing.xs,
          },
        ]}
      >
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>

      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => {
          let currentCode = '+91';
          let localNum = value || '';

          for (const item of COUNTRY_CODES) {
            if (localNum.startsWith(item.code)) {
              currentCode = item.code;
              localNum = localNum.slice(item.code.length);
              break;
            }
          }

          const updateValue = (code: string, num: string) => {
            const sanitizedNum = num.replace(/\D/g, '');
            onChange(code + sanitizedNum);
          };

          return (
            <>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable
                  onPress={() => setShowPicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Country Code"
                  style={[
                    styles.input,
                    {
                      width: 80,
                      backgroundColor: colors.surfaceElevated,
                      borderRadius: radius.md,
                      borderColor: error ? colors.error : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 4,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text, fontSize: typography.sizes.body.fontSize, fontWeight: '600' }}>
                    {currentCode}
                  </Text>
                  <ChevronDown size={12} color={colors.textMuted} />
                </Pressable>

                <TextInput
                  value={localNum}
                  onChangeText={(text) => updateValue(currentCode, text)}
                  placeholder="Phone Number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      color: colors.text,
                      fontSize: typography.sizes.body.fontSize,
                      backgroundColor: colors.surfaceElevated,
                      borderRadius: radius.md,
                      borderColor: error ? colors.error : colors.border,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      minHeight: 48,
                    },
                  ]}
                />
              </View>

              {showPicker && (
                <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
                  <View style={styles.dropdownModalContainer}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPicker(false)} />
                    <View style={[styles.dropdownPickerBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }]}>
                      <Text style={{ color: colors.text, fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700', marginBottom: spacing.md }}>
                        Select Country Code
                      </Text>
                      {COUNTRY_CODES.map((opt) => (
                        <Pressable
                          key={opt.code}
                          onPress={() => {
                            updateValue(opt.code, localNum);
                            setShowPicker(false);
                          }}
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            {
                              backgroundColor: currentCode === opt.code ? colors.primary + '12' : pressed ? colors.background : 'transparent',
                              borderRadius: radius.sm,
                              paddingVertical: spacing.md,
                              paddingHorizontal: spacing.sm,
                            }
                          ]}
                        >
                          <Text style={{ color: currentCode === opt.code ? colors.primary : colors.text, fontSize: typography.sizes.body.fontSize, fontWeight: currentCode === opt.code ? '700' : '500' }}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </Modal>
              )}
            </>
          );
        }}
      />

      {error && (
        <Text
          style={{
            color: colors.error,
            fontSize: typography.sizes.overline.fontSize,
            marginTop: spacing.xs,
          }}
        >
          {(error.message as string) || 'This field is required'}
        </Text>
      )}
    </View>
  );
};

// --- Select Field (Pressable that opens a picker or action sheet) ---

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  error?: string;
}

export const FormSelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  placeholder,
  onPress,
  error,
}) => {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.fieldContainer, { marginBottom: spacing.lg }]}>
      <Text
        style={[
          styles.label,
          {
            color: colors.textSecondary,
            fontSize: typography.sizes.caption.fontSize,
            fontWeight: '600',
            marginBottom: spacing.xs,
          },
        ]}
      >
        {label}
      </Text>

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label}`}
        style={[
          styles.input,
          styles.selectInput,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.md,
            borderColor: error ? colors.error : colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          },
        ]}
      >
        <Text
          style={{
            color: value ? colors.text : colors.textMuted,
            fontSize: typography.sizes.body.fontSize,
            flex: 1,
          }}
        >
          {value || placeholder || `Select ${label}`}
        </Text>
        <ChevronDown size={16} color={colors.textMuted} />
      </Pressable>

      {error && (
        <Text
          style={{
            color: colors.error,
            fontSize: typography.sizes.overline.fontSize,
            marginTop: spacing.xs,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

// --- Step Indicator ---

interface StepIndicatorProps {
  steps: string[];
  current: number;
}

export const FormStepIndicator: React.FC<StepIndicatorProps> = ({ steps, current }) => {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.stepRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
      {steps.map((label, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: isDone ? colors.success : isActive ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={{
                  color: isDone || isActive ? colors.textOnPrimary : colors.textMuted,
                  fontSize: 10,
                  fontWeight: '700',
                }}
              >
                {isDone ? '✓' : i + 1}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{
                color: isActive ? colors.primary : colors.textMuted,
                fontSize: 9,
                fontWeight: isActive ? '700' : '500',
                marginTop: 2,
                textAlign: 'center',
              }}
            >
              {label}
            </Text>
            {i < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor: isDone ? colors.success : colors.border,
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

// --- Section Title ---

interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export const FormSectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle }) => {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md, marginTop: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm }}>
      <Text style={{ color: colors.text, fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700' }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ color: colors.textMuted, fontSize: typography.sizes.caption.fontSize, marginTop: 2 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {},
  label: {},
  input: {
    borderWidth: 1,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepDot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: 12,
    left: '60%',
    right: '-40%',
    height: 2,
    zIndex: -1,
  },
  iosModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosPickerBox: {
    width: '90%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  iosDoneButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dropdownModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownPickerBox: {
    width: '85%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: {
    marginVertical: 2,
  },
});
