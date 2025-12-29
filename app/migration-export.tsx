import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

const exportedData = require('../data-export.json');

export default function MigrationExport() {
  const router = useRouter();
  const [exportData, setExportData] = useState('');

  useEffect(() => {
    const jsonString = JSON.stringify(exportedData, null, 2);
    setExportData(jsonString);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Data Export</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          This is your exported data from the previous version. Select all text below and copy it to save locally.
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <TextInput
          style={styles.textArea}
          multiline
          editable={true}
          selectTextOnFocus={true}
          value={exportData}
          placeholder="Loading data..."
        />
      </ScrollView>

      <View style={styles.statsContainer}>
        {exportData && (
          <Text style={styles.statsText}>
            {(() => {
              try {
                const parsed = JSON.parse(exportData);
                return `Profiles: ${parsed.profiles?.length || 0} | Jobs: ${parsed.jobs?.length || 0} | Bids: ${parsed.bids?.length || 0} | Conversations: ${parsed.conversations?.length || 0} | Messages: ${parsed.messages?.length || 0} | Reviews: ${parsed.reviews?.length || 0}`;
              } catch {
                return 'Data loaded';
              }
            })()}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
  },
  scrollView: {
    flex: 1,
    margin: 16,
  },
  textArea: {
    backgroundColor: '#fff',
    padding: 16,
    fontSize: 12,
    fontFamily: 'monospace',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 400,
    textAlignVertical: 'top',
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
