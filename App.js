import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions
} from 'react-native';

export default function App() {
  const [input, setInput] = useState('');
  const { width } = useWindowDimensions();

  return (
    <ImageBackground
      source={require('./assets/landing-new.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.wrapper}>
        <View style={[styles.overlay, { width: width > 500 ? 500 : '90%' }]}>
          {/* Welcome speech bubble */}
          <Image source={require('./assets/polygon-upward-white.png')} style={styles.pointer} />
          <Text style={styles.bubble}>Welcome to Capshnz</Text>

          {/* Email bubble */}
          <Image source={require('./assets/polygon-upward-white.png')} style={styles.pointer} />
          <TextInput
            style={styles.bubbleInput}
            value={input}
            onChangeText={setInput}
            placeholder="you@example.com"
            placeholderTextColor="#555"
          />

          {/* Enter button with pointer */}
          <Image source={require('./assets/polygon-downwards-white.png')} style={styles.pointerDown} />
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Enter</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            By pressing Enter you agree to let us use cookies to improve game performance
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  wrapper: {
    flex: 1,
    justifyContent: 'center',  // Vertical center
    alignItems: 'center',      // Horizontal center
  },
  overlay: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pointer: {
    width: 40,
    height: 25,
    resizeMode: 'contain',
    marginBottom: -10,
  },
  pointerDown: {
    width: 40,
    height: 25,
    resizeMode: 'contain',
    marginTop: 10,
    marginBottom: -12,
  },
  bubble: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '600',
    overflow: 'hidden',
    textAlign: 'center',
    width: '100%',
    maxWidth: 400,
  },
  bubbleInput: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    fontSize: 16,
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#5E9E94',
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
    width: '100%',
    maxWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    color: 'white',
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
