import React, { createContext,useState, useContext, useEffect } from "react";
import { useNavigation, useRoute ,useFocusEffect} from "@react-navigation/native";
import { handleApiError } from "../util/ApiHelper";
import  useAbly from "../util/ably";
import { getDecks, selectDeck } from "../util/Api";
import {View, Text, Button, Image, TextInput, TouchableOpacity,StyleSheet, FlatList} from "react-native";


export default function ChooseroundToWaitingRoom(){


  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  const [buttonText, setButtonText] = useState("Share with other players");
  const [lobby, setLobby] = useState([]);
  const [isLoading, setLoading] = useState(false);

  const [decksInfo, setDecksInfo] = useState([]);
  const [channelName,setChannelName]= useState("");

  useFocusEffect(
    React.useCallback(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation])
  );
  
    const {
      publish,
      subscribe,
      onMemberUpdate,
      getMembers,
      addMember,
      unSubscribe,
      removeMember,
      getChannel,
      channel,
    } = useAbly(userData.gameCode);
  


    useEffect(() => {
      refreshLobby();
      console.log("Channel in WaitingRoom:", channel.connectionManager.lastActivity);
    }, []);



    const refreshLobby = async () => {
      try{
        await onMemberUpdate(refreshLobby);
        const channel = await getChannel();
        setChannelName(channel);
        console.log(channel);
      }
      catch{
        console.log("Error in ably call getChannel")
      }
    };

    function waitingRoomButton() {
      navigation.navigate("WaitingRoom", {...userData });
    }
  
  
    async function startGameButton() {
      try {
    
        let imageURL = "";
        if (userData.isApi) {
          const imageURLs = await getApiImages(userData);
          imageURL = await postCreateRounds(userData.gameCode, imageURLs, {
            timeout: 60000,
          });
        }
        
        await publish({
          data: {
            message: "Start Game",
            numOfPlayers: lobby.length,
            isApi: userData.isApi,
            deckTitle: userData.deckTitle,
            deckUID: userData.deckUID,
            gameUID: userData.gameUID,
            numOfRounds: userData.numOfRounds,
            roundTime: userData.roundTime,
            imageURL: imageURL,
          },
          timeout: 60000,
        });
      } catch (error) {
        handleApiError(error, startGameButton, context);
      } finally {
        setLoading(false);
      }
    }
  
  
    return (

        <View style={styles.container}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.navigate("StartGame", userData)}
          >
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
      
          <TextInput style={styles.input} editable={false}>
            Waiting for all Players . . .
          </TextInput>
          
          <Image
            source={require('../assets/polygon-downwards-white.png')}
            style={styles.downwardPolygonRight}
          />
      
          <View style={styles.container}>
          <Text style={styles.emptyMessage}>Channel name is "{channelName}"</Text>
          <Text style={styles.emptyMessage}>Last actvity is "{channel.connectionManager.lastActivity}"</Text>
          </View>

          <TouchableOpacity
        style={styles.button}
        onPress={waitingRoomButton}
      >
          <Text style={styles.buttonText}>WaitingRoom</Text>
      </TouchableOpacity> 

        </View>
      
      );
  };
  
  const styles = StyleSheet.create({
  container: {
    display: "flex",
    flex: 1,
    alignItems: "center",
    backgroundColor: "#CBDFBD",
    padding: 16,
    paddingTop: 50,
    marginTop: 20,
  },
  
  input: {
  width: '80%',
  height: 60,
  backgroundColor: 'white',
  borderRadius: 40,
  fontSize: 26,
  fontFamily: 'Grandstander',
  fontWeight: '500',
  textAlign: 'center',
  marginVertical: 10,
  paddingHorizontal: 20,
  },
  closeButton: {
  width: 24,
  height: 24,
  position: 'absolute',
  top: 20,
  right: 20,
  },
  downwardPolygonRight: {
    marginTop: -10,
    width: 50, 
    height: 50, 
    right: -80,
    bottom: 10,
  },
  emptyMessage: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: "black",

  },

  button: {
    width: 330,
    height: 55,
    backgroundColor: "#DC816A",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    },
    buttonText: {
      color: "white",
      fontSize: 24,
      fontFamily: "Grandstander",
      fontWeight: "700",
      },

  });