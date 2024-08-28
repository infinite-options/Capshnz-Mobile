import React, {createContext, useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { handleApiError } from '../util/ApiHelper';

import { addUser, checkGameCode, joinGame } from '../util/Api';

export const ErrorContext = createContext();

export default function JoinGame() {
    const navigation = useNavigation();
    const route = useRoute();
    const userData = route.params.userData;
    const [gameCode, setGameCode] = useState('');
    const [isCreateLoading, setCreateLoading] = useState(false);
    const [isJoinLoading, setJoinLoading] = useState(false);
    const context = useContext(ErrorContext);
   
    const handleGameCodeChange = (text) => {
        setGameCode(text);
      };
    
      const createNewGameButton = async () => {
        try {
          setCreateLoading(true);
         
          const playerInfo = await addUser(userData);
          const updatedUserData = {
            ...userData,
            roundNumber: 1,
            host: true,
            playerUID: playerInfo.user_uid,
          };
          //navigation.navigate('ScoreType', { userData: updatedUserData });
          navigation.navigate('ChooseScoring', { userData: updatedUserData });
        } catch (error) {
          handleApiError(error, createNewGameButton, context);
        } finally {
          setCreateLoading(false);
        }
      };
    
      const joinGameButton = async () => {
      
        if (!gameCode.trim()) {
          Alert.alert('Fill out this field');
          return; 
        }
        try {
          setJoinLoading(true);
          if (!(await checkGameCode(gameCode))) return;
          const updatedUserData = {
            ...userData,
            gameCode,
            roundNumber: 1,
            host: false,
          };
          try {
            await joinGame(updatedUserData);
          } catch (error) {
            if (error.response && error.response.status === 409)
              console.error(error);
            else throw error;
          }
          navigation.navigate('Waiting', { userData: updatedUserData });
        } catch (error) {
          handleApiError(error, joinGameButton, context);
        } finally {
          setJoinLoading(false);
        }
      };
    
      const handleFeedback = () => {
        //navigation.navigate('Feedback', { userData });
        navigation.navigate('Feedback', {...userData });
      };
     
    return (
<ScrollView contentContainerStyle={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.heading}>Welcome {userData.name}!</Text>
      </View>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Enter Game Code</Text>
        <TextInput
          style={[styles.input, styles.textInput]}
          value={gameCode}
          placeholder="Enter game code here..."
          onChangeText={handleGameCodeChange}
          keyboardType="numeric"
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.joinButton]}
            onPress={joinGameButton}
            disabled={isJoinLoading}
          >
            <Text style={styles.buttonText}>
              {isJoinLoading ? 'Joining...' : 'Join Game'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.formContainer}>
        <View style={styles.textContainer}>
            <Text style={styles.label}>Want to provide game feedback?</Text>
        </View>
        <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.feedbackButton]}
              onPress={handleFeedback}
            >
              <Text style={styles.buttonText}>Provide Feedback</Text>
            </TouchableOpacity>
        </View>
      </View>
      <View style={styles.formContainer}>
        <View style={styles.textContainer}>
            <Text style={styles.label}>Want to create your own game?</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.hostButton]}
            onPress={createNewGameButton}
            disabled={isCreateLoading}
          >
            <Text style={styles.buttonText}>
              {isCreateLoading ? 'Creating...' : 'Host a Game'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>  
    </ScrollView>
  );
};

    
const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#fff',
        paddingVertical: 20,
        paddingHorizontal: 10,
      },
      textContainer: {
        alignItems: 'center',
        marginVertical: 20,
      },
      heading: {
        fontSize: 24,
        fontWeight: 'bold',
      },
      formContainer: {
        marginVertical: 20,
        alignItems: 'left',
        paddingVertical: 50,
      },
      label: {
        fontSize: 18,
        marginBottom: 10,
      },
      input: {
        height: 40,
        width: "90%",
        borderColor: 'gray',
        borderWidth: 1,
        paddingHorizontal: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
        marginBottom: 10,
      },
      buttonContainer: {
        width: "100%",
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',

      },

      textContainer: {
        width: "100%",
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',

      },

      button: {
        height: 40,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        width: '40%',
      },
      buttonText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
      },
      joinButton: {
        backgroundColor: '#5cb85c',
        alignItems: 'center',
      },
      feedbackButton: {
        backgroundColor: '#f0ad4e',
      },
      hostButton: {
        backgroundColor: '#0275d8',
      },
      label: {
        fontSize: 15,
        fontFamily: 'Grandstander',
        fontWeight: '600',
        //color: 'white',
        marginBottom: 10,
      },
      spacing: {
        height: 20, 
      },
  });  
