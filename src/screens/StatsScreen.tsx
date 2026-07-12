import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Storage } from '../utils/storage';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';

export const StatsScreen = ({ onBack }: { onBack: () => void }) => {
  const [allTime, setAllTime] = useState(0);
  const [levels, setLevels] = useState(0);
  useEffect(() => { Storage.loadHighScores().then(scores => { if (scores) { setAllTime(scores.allTime); setLevels(Object.keys(scores.byLevel).length); } }); }, []);
  return <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}><SafeAreaView style={styles.safeArea}>
    <View style={styles.header}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBack} style={styles.back}><Text style={styles.backText}>{'<'}</Text></TouchableOpacity><Text style={styles.headerTitle}>Lab notes</Text><View style={styles.spacer} /></View>
    <View style={styles.content}><Text style={styles.kicker}>Your record</Text><Text style={styles.title}>A clean history</Text>
      <View style={styles.scoreCard}><Text style={styles.label}>Best score</Text><Text style={styles.score}>{allTime.toLocaleString()}</Text></View>
      <View style={styles.row}><View style={styles.tile}><Text style={styles.tileValue}>{levels}</Text><Text style={styles.label}>Trays cleared</Text></View><View style={styles.tile}><Text style={styles.tileValue}>{Math.max(1, levels + 1)}</Text><Text style={styles.label}>Highest tray</Text></View></View>
      <Text style={styles.note}>{allTime > 0 ? 'Every clean tray is recorded here.' : 'Complete your first tray to start the record.'}</Text>
    </View>
  </SafeAreaView></LinearGradient>;
};
const styles = StyleSheet.create({ container: { flex: 1 }, safeArea: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: responsiveSpacing(20), maxWidth: 560, width: '100%', alignSelf: 'center' }, back: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceGlass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }, backText: { color: theme.colors.text.primary, fontSize: 25, fontWeight: '900' }, headerTitle: { color: theme.colors.text.primary, fontSize: responsiveFontSize(18), fontWeight: '900' }, spacer: { width: 46 }, content: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'center', padding: responsiveSpacing(20) }, kicker: { color: theme.colors.mint, fontSize: responsiveFontSize(13), fontWeight: '900' }, title: { color: theme.colors.text.primary, fontSize: responsiveFontSize(36), fontWeight: '900', marginTop: 6, marginBottom: responsiveSpacing(26) }, scoreCard: { minHeight: 150, borderRadius: theme.borderRadius.xl, backgroundColor: 'rgba(88,214,183,0.14)', borderWidth: 1, borderColor: 'rgba(88,214,183,0.32)', alignItems: 'center', justifyContent: 'center' }, label: { color: theme.colors.text.secondary, fontSize: responsiveFontSize(13), fontWeight: '800' }, score: { color: theme.colors.text.primary, fontSize: responsiveFontSize(42), fontWeight: '900', marginTop: 6 }, row: { flexDirection: 'row', gap: responsiveSpacing(12), marginTop: responsiveSpacing(12) }, tile: { flex: 1, minHeight: 108, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.surfaceGlass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }, tileValue: { color: theme.colors.text.primary, fontSize: responsiveFontSize(26), fontWeight: '900', marginBottom: 4 }, note: { color: theme.colors.text.secondary, fontSize: responsiveFontSize(14), fontWeight: '700', textAlign: 'center', marginTop: responsiveSpacing(22) } });
