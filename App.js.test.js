import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Purchases from 'react-native-purchases';

// ============================================================================
// CONFIG
// ============================================================================

const BACKEND_URL = 'https://sauc-e-backend-production.up.railway.app';
const REVENUECAT_PUBLIC_KEY = 'appl_gNFmOHvscXhhhoQWpgDvVPQeLZm'; // Public key, safe
const FREE_CHECK_LIMIT = 5;

const BBQE = () => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [email, setEmail] = useState('');
  const [threatResult, setThreatResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState(null);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    const initTimer = setTimeout(() => {
      initializePurchases();
    }, 500);

    return () => clearTimeout(initTimer);
  }, []);

  async function initializePurchases() {
    try {
      await Purchases.configure({
        apiKey: REVENUECAT_PUBLIC_KEY,
      });
      const cid = await checkSubscriptionStatus();
      await syncUsageCount(cid);
      console.log('RevenueCat initialized');
    } catch (error) {
      console.error('RevenueCat init error:', error);
    }
  }

  async function syncUsageCount(cid) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/bbqe/usage-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: cid || 'anonymous' }),
      });

      if (response.ok) {
        const data = await response.json();
        setCheckCount(data.usageCount || 0);
      }
    } catch (error) {
      console.log('Usage sync skipped:', error.message);
    }
  }

  async function checkSubscriptionStatus() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const cid = customerInfo.originalAppUserId;
      setCustomerId(cid);

      if (customerInfo.entitlements.active['premium']) {
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }

      return cid;
    } catch (error) {
      console.error('Subscription check error:', error);
      return null;
    }
  }

  // ============================================================================
  // CHECK EMAIL THREAT (Calls backend, NOT RapidAPI directly)
  // ============================================================================

  async function handleCheckEmail() {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setLoading(true);

    try {
      // TEMP: fixed test ID so all devices share the same limit during QA
      const effectiveId = 'TEST-USER-001';

      const response = await fetch(`${BACKEND_URL}/api/bbqe/check-threat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: effectiveId,
          email: email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 403) {
          Alert.alert('Limit Reached', 'Upgrade to Premium for unlimited checks', [
            { text: 'Upgrade', onPress: handleSubscribe },
            { text: 'Cancel', onPress: () => {} },
          ]);
          return;
        }

        throw new Error(errorData.error || 'Failed to check email');
      }

      const data = await response.json();
      setThreatResult(data);
      setCheckCount(checkCount + 1);
      setEmail('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process check');
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  async function handleSubscribe() {
    try {
      const offerings = await Purchases.getOfferings();

      if (offerings.current && offerings.current.availablePackages.length > 0) {
        const package_ = offerings.current.availablePackages[0];

        try {
          const { customerInfo } = await Purchases.purchasePackage(package_);
          if (customerInfo.entitlements.active['premium']) {
            setIsSubscribed(true);
            Alert.alert('Success', 'You are now subscribed!');
          }
        } catch (e) {
          if (!e.userCancelled) {
            Alert.alert('Error', 'Failed to complete purchase');
          }
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>BBQE</Text>
          <Text style={styles.subtitle}>Signal Detection from Noise</Text>
          <Text style={styles.philosophy}>Safety = Quality / Quantity</Text>
        </View>

        {!isSubscribed && (
          <TouchableOpacity style={styles.upgradeButton} onPress={handleSubscribe}>
            <Text style={styles.upgradeText}>
              Premium · {Math.max(0, FREE_CHECK_LIMIT - checkCount)} free left
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Check Your Email</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter an email address..."
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TouchableOpacity
          style={[styles.checkButton, loading && styles.checkButtonDisabled]}
          onPress={handleCheckEmail}
          disabled={loading}
        >
          <Text style={styles.checkButtonText}>
            {loading ? 'Checking...' : 'Check Email'}
          </Text>
        </TouchableOpacity>

        {threatResult && (
          <View
            style={[
              styles.resultBox,
              threatResult.isBreach ? styles.resultDanger : styles.resultSafe,
            ]}
          >
            <Text style={styles.resultTitle}>
              {threatResult.isBreach ? '⚠️ Breach Detected' : '✅ No Breach Found'}
            </Text>

            {threatResult.isBreach ? (
              <>
                <Text style={styles.resultText}>
                  Found in {threatResult.breachCount} breach
                  {threatResult.breachCount !== 1 ? 'es' : ''}:
                </Text>
                {threatResult.sources &&
                  threatResult.sources.map((source, idx) => (
                    <Text key={idx} style={styles.sourceText}>
                      • {source}
                    </Text>
                  ))}
              </>
            ) : (
              <Text style={styles.resultText}>
                This email was not found in any known breaches.
              </Text>
            )}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How BBQE Works</Text>
          <Text style={styles.infoText}>
            BBQE checks your email against 9 public threat databases including VirusTotal, MITRE ATT&CK, and Abuse.ch. Results are cached and updated every 30 minutes.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Runs on BBQE Sauce 🔥 🍖</Text>
          <Text style={styles.footerSmall}>BBQE is for Safety</Text>
          <Text style={styles.footerSmall}>Sample: CATSUP (Learning) • RELISH (Feelings)</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 4,
  },
  philosophy: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  upgradeButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignSelf: 'center',
    marginVertical: 16,
  },
  upgradeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginTop: 24,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#333',
    color: 'white',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 12,
    minHeight: 50,
  },
  checkButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  checkButtonDisabled: {
    opacity: 0.6,
  },
  checkButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  resultBox: {
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
  },
  resultDanger: {
    backgroundColor: '#3a2a2a',
    borderLeftColor: '#FF6B6B',
  },
  resultSafe: {
    backgroundColor: '#2a3a2a',
    borderLeftColor: '#4CAF50',
  },
  resultTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: 'white',
    fontSize: 16,
  },
  resultText: {
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 8,
  },
  sourceText: {
    color: '#aaa',
    lineHeight: 18,
    marginLeft: 8,
  },
  infoBox: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  infoTitle: {
    color: '#FF6B6B',
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    color: '#ccc',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSmall: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
});

export default BBQE;
