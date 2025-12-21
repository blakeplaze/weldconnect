import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestConnection() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing...\n\n');

    try {
      // Test 1: Check env vars
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      let info = `ENV VARIABLES:\n`;
      info += `URL: ${url || 'MISSING'}\n`;
      info += `Key: ${key ? key.substring(0, 20) + '...' : 'MISSING'}\n\n`;
      setResult(info);

      if (!url || !key) {
        setResult(prev => prev + '\nERROR: Environment variables not set!\n');
        return;
      }

      // Test 2: Try a simple fetch
      info += 'Testing direct fetch...\n';
      setResult(info);

      const fetchResult = await fetch(`${url}/auth/v1/health`);
      info += `Fetch status: ${fetchResult.status}\n`;
      info += `Fetch OK: ${fetchResult.ok}\n\n`;
      setResult(info);

      // Test 3: Try Supabase client
      info += 'Testing Supabase client...\n';
      setResult(info);

      const { data, error } = await supabase.auth.signUp({
        email: `test${Date.now()}@example.com`,
        password: 'test123456'
      });

      if (error) {
        info += `Auth error: ${error.message}\n`;
        info += `Error details: ${JSON.stringify(error, null, 2)}\n`;
      } else {
        info += 'Signup succeeded!\n';
        info += `User ID: ${data.user?.id}\n`;
      }
      setResult(info);
    } catch (err: any) {
      setResult(prev => prev + `\nEXCEPTION: ${err.message}\n`);
      if (err.stack) {
        setResult(prev => prev + `Stack: ${err.stack.substring(0, 500)}\n`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connection Test</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={testConnection}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>

      {result ? (
        <View style={styles.resultContainer}>
          <Text style={styles.result}>{result}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
  },
  result: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
