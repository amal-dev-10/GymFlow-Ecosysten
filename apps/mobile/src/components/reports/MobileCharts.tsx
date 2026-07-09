import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Line, Polyline, G } from 'react-native-svg';
import { useTheme } from '../../theme/theme';

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export function BarChart({ data, height = 150, color }: BarChartProps) {
  const { colors, spacing, radius } = useTheme();
  const activeColor = color || colors.primary;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.chartContainer, { height: height + 40 }]}>
      <View style={[styles.barWrapper, { height }]}>
        {data.map((item, idx) => {
          const barHeightPercent = (item.value / maxVal) * 100;
          return (
            <View key={idx} style={styles.barCol}>
              <View style={[styles.barBackground, { backgroundColor: colors.border, borderRadius: radius.xs }]}>
                <View 
                  style={[
                    styles.barFill, 
                    { 
                      height: `${barHeightPercent}%`, 
                      backgroundColor: activeColor,
                      borderRadius: radius.xs 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface LineChartProps {
  data: number[];
  labels: string[];
  height?: number;
  color?: string;
}

export function LineChart({ data, labels, height = 150, color }: LineChartProps) {
  const { colors } = useTheme();
  const activeColor = color || colors.primary;
  const maxVal = Math.max(...data, 1);
  
  const width = 300;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 20) + 10;
      const y = height - (val / maxVal) * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={styles.chartContainer}>
      <Svg height={height} width="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* Draw Trend Line */}
        <Polyline
          fill="none"
          stroke={activeColor}
          strokeWidth="3"
          points={points}
        />
        {/* Draw points */}
        {data.map((val, idx) => {
          const x = (idx / (data.length - 1)) * (width - 20) + 10;
          const y = height - (val / maxVal) * (height - 20) - 10;
          return (
            <Circle
              key={idx}
              cx={x}
              cy={y}
              r="4"
              fill={activeColor}
            />
          );
        })}
      </Svg>
      <View style={styles.lineLabelsRow}>
        {labels.map((lbl, idx) => (
          <Text key={idx} style={[styles.barLabel, { color: colors.textSecondary }]}>
            {lbl}
          </Text>
        ))}
      </View>
    </View>
  );
}

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function ProgressRing({ percentage, size = 60, strokeWidth = 6, color }: ProgressRingProps) {
  const { colors } = useTheme();
  const activeColor = color || colors.primary;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  barWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barBackground: {
    width: 14,
    height: '80%',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  lineLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 6,
  }
});
