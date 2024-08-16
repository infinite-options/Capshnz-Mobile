import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { handleApiError } from '../util/ApiHelper';
import { ErrorContext } from '../../App';
import { addUser, checkGameCode, joinGame } from '../util/Api';


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
         // console.log("Calling Add User from CreateNewGameButton")
          const playerInfo = await addUser(userData);
          const updatedUserData = {
            ...userData,
            roundNumber: 1,
            host: true,
            playerUID: playerInfo.user_uid,
          };
          navigation.navigate('ScoreType', { userData: updatedUserData });
        } catch (error) {
          handleApiError(error, createNewGameButton, context);
        } finally {
          setCreateLoading(false);
        }
      };
    
      const joinGameButton = async () => {
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
        navigation.navigate('Feedback', { userData });
      };
      console.log(' Joing Game Page');
      console.log(userData);
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
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.feedbackButton]}
          onPress={handleFeedback}
        >
          <Text style={styles.buttonText}>Provide Feedback</Text>
        </TouchableOpacity>
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
      },
      label: {
        fontSize: 18,
        marginBottom: 10,
      },
      input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        paddingHorizontal: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
        marginBottom: 10,
      },
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 20,
      },
      button: {
        height: 40,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        width: '45%',
      },
      buttonText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
      },
      joinButton: {
        backgroundColor: '#5cb85c',
      },
      feedbackButton: {
        backgroundColor: '#f0ad4e',
      },
      hostButton: {
        backgroundColor: '#0275d8',
      },
  });  
