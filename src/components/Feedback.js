import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addFeedback } from '../util/Api'; 

export default function Feedback() {
  const [feedback, setFeedback] = useState('');
  const navigation = useNavigation();
  const route = useRoute();
  const userData = route.params;

  const handleFeedbackChange = (text) => {
    setFeedback(text);
  };

  const handleSubmit = async () => {
    if (feedback.trim() === '') {
      Alert.alert('Fill out this field');
      return; 
    }

    try {
      await addFeedback(userData, feedback);
      await addFeedback(userData, feedback);
      Alert.alert('Success', 'Feedback submitted successfully!');
      navigation.navigate('JoinGame', { userData });
    // navigation.push('StartGame', { userData });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'There was an error submitting your feedback.');
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.headerText}>Tell us what you think</Text>
      </View>
      <View style={styles.row}>
        <TextInput
          style={styles.textInput}
          value={feedback}
          onChangeText={handleFeedbackChange}
          placeholder="Enter feedback here..."
          multiline
          numberOfLines={4}
        />
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, feedback.trim() === '' ? styles.buttonDisabled : null]}
          onPress={handleSubmit}
      
          >
          <Text style={styles.buttonText}>Enter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  row: {
    marginVertical: 10,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  textInput: {
    height: 100,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
