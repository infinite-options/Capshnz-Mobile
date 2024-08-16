import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { checkEmailCode } from '../util/Api';
import { handleApiError } from '../util/ApiHelper';
//import { ErrorContext } from '../App';

export default function Confirmation() {
  const navigation = useNavigation();
  const route = useRoute();
  const userData = route.params;
  const [code, setCode] = useState("");
  const [valid, setValid] = useState(true);
  const context = useContext(ErrorContext);

  const handleChange = (text) => {
    setCode(text);
  };

  const submitButton = async () => {
    try {
      const status = await checkEmailCode(userData.playerUID, code);
      if (status.email_validated_status === "TRUE") {
        navigation.navigate("StartGame", { state: userData });
      } else {
        setValid(false);
        setTimeout(() => {
          setValid(true);
        }, 2500);
      }
    } catch (error) {
      handleApiError(error, submitButton, context);
    }
  };

  const handleEmailChange = () => {
    navigation.navigate("Home");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirmation Page</Text>
      <Text style={styles.subtitle}>Enter the 3 digit code sent to: {userData.email}</Text>
      {!valid && (
        <Text style={styles.error}>Invalid Code. Please Try Again.</Text>
      )}
      <View style={styles.codeInputContainer}>
        {[...Array(3)].map((_, index) => (
          <TextInput
            key={index}
            style={styles.codeInput}
            keyboardType="numeric"
            maxLength={1}
            onChangeText={(text) => handleChange(code.slice(0, index) + text + code.slice(index + 1))}
          />
        ))}
      </View>
      <TouchableOpacity style={styles.button} onPress={submitButton}>
        <Text style={styles.buttonText}>Enter</Text>
      </TouchableOpacity>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have access to {userData.email}?</Text>
        <TouchableOpacity style={styles.footerButton} onPress={handleEmailChange}>
          <Text style={styles.footerButtonText}>Enter a different email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 18,
    marginTop: 20,
  },
  error: {
    fontSize: 18,
    color: 'red',
    marginTop: 20,
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  codeInput: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    margin: 4,
    padding: 0,
    width: 40,
    height: 46,
    fontSize: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 6,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
  },
  footer: {
    marginTop: 100,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 18,
    marginBottom: 10,
  },
  footerButton: {
    backgroundColor: 'orange',
    padding: 10,
    borderRadius: 6,
  },
  footerButtonText: {
    color: 'white',
    fontSize: 18,
  },
}); 