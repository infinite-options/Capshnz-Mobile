import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity,Image, Button } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { handleApiError } from '../util/ApiHelper';
import { addUser, checkGameCode, joinGame } from '../util/Api'; 
import Polygon from '../assets/Polygon 3.svg'; 
import { ErrorContext } from '../../App'; 

export default function StartGame() {
  const navigation = useNavigation();
  const route = useRoute();
  const userData = route.params; 
  const [gameCode, setGameCode] = useState('');
  const [isCreateLoading, setCreateLoading] = useState(false);
  const [isJoinLoading, setJoinLoading] = useState(false);
 const context = useContext(ErrorContext); 
 

  const handleGameCodeChange = (text) => {
    setGameCode(text);
  };
  

  const createNewGameButton = async (event) => {
//const createNewGameButton = () => {
    try {

      console.log("submit");
      setCreateLoading(true);
      //console.log("Calling Add User from CreateNewGameButton")
     const playerInfo = await addUser(userData);
      console.log("after payload")
      const updatedUserData = {
        ...userData,
        roundNumber: 1,
        host: true,
        playerUID: playerInfo.user_uid,
      };
     console.log(updatedUserData);
      navigation.navigate('ChooseScoring', { userData: updatedUserData });

    } catch (error) {
      handleApiError(error, createNewGameButton, context);
    } finally {
      setCreateLoading(false);
    }
  };

  const joinGameButton = async (event) => {
   
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
        console.log("joining game"); 
        console.log(updatedUserData);
        await joinGame(updatedUserData);
      } catch (error) {
        if (error.response && error.response.status === 409)
          console.error("Error:", error);
        else throw error;
      }
     // navigation.navigate("WaitingRoom", {updatedUserData });
     
     console.log('start game');
     console.log(updatedUserData);
  
     navigation.navigate("WaitingRoom", {...updatedUserData});
    } catch (error) {
        handleApiError(error, joinGameButton, context);
    } finally {
        setJoinLoading(false);
    }
  };

  const handleFeedback = () => {
    console.log("feed back");
    navigation.navigate('Feedback', {...userData });
  };

  return (
<View style={styles.container}>
        <Text style={styles.header}>
          Welcome {'\n'}
          {userData.name}!
        </Text>
                <Text style={styles.label}>
          Enter Game Code
        </Text>
        <TextInput
          style={styles.input}
          value={gameCode}
          onChangeText={handleGameCodeChange}
          placeholder="Enter game code here..."
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={styles.button}
          disabled={isJoinLoading}
          onPress={(joinGameButton)}
        >
          <Text style={styles.buttonText}>
            {isJoinLoading ? "Joining..." : "Join Game"}
          </Text>

        </TouchableOpacity>
        <View style={[styles.row, { marginTop: 30 }]}>

            <Text style={styles.label}>Want to provide game feedback?</Text>
            <Image
            source={require('../assets/Polygon 3.png')}
            style={styles.upwardPolygonLeft}
            />
            <TouchableOpacity
                style={styles.button}
                onPress={handleFeedback}
              >
              <Text style={styles.buttonText}>Provide Feedback</Text>

              
            </TouchableOpacity>
        </View>
        <View style={[styles.row, { marginTop: 30 }]}>
         <Text style={styles.label}>Want to create your own game?</Text>
         {/*
         <Button title="Host a Game" onPress={createNewGameButton} />
        */}
          <Image
          source={require('../assets/Polygon 3.png')}
          style={styles.upwardPolygonLeft}
          />
         <TouchableOpacity
            style={styles.button}
            onPress={createNewGameButton}
          
          >
            
            <Text style={styles.buttonText}>
              {isCreateLoading ? "Creating..." : "Host a Game"}
            </Text>
          </TouchableOpacity>
        
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(241, 205, 92, 0.73)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  row: {
    width: 380,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginBottom: 20,
  },
  header: {
    fontSize: 40,
    fontFamily: 'Grandstander',
    fontWeight: '800',
    textAlign: 'center',
    color: 'white',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 24,
    fontFamily: 'Grandstander',
    fontWeight: '600',
    color: 'white',
    marginBottom: 10,
  },
  input: {
    width: '80%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 40,
    paddingHorizontal: 20,
    fontSize: 23,
    fontFamily: 'Grandstander',
    fontWeight: '500',
    marginBottom: 20,
  },
  button: {
    width: '50%',
    height: 50,
    backgroundColor: '#46C3A6',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,

  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Grandstander',
    fontWeight: '600',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  createGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upwardPolygonLeft: {
    marginTop: -10,
    width: 50, 
    height: 50, 
    right: 30,
    bottom: -50,
  },
  polygon: {
    position: 'relative',
    top: 2,
    left: -30,
  },
});


