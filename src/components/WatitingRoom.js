import React, { useState, useContext, useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { handleApiError } from "../util/ApiHelper";
import { ErrorContext } from "../../App";
import useAbly from "../util/ably";
import { getApiImages, postCreateRounds,getGameImageForRound } from "../util/Api";
import { getDecks, selectDeck } from "../util/Api";
import {View, Text, Button, Image, TextInput, TouchableOpacity,StyleSheet, FlatList,Clipboard} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function WaitingRoom(){

  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  const [buttonText, setButtonText] = useState("Share with other players");
  const [lobby, setLobby] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const context = useContext(ErrorContext);
  const [decksInfo, setDecksInfo] = useState([]);

  const {
    publish,
    subscribe,
    onMemberUpdate,
    getMembers,
    addMember,
    unSubscribe,
    removeMember,
  } = useAbly(userData.gameCode);

  useEffect(() => {
    async function getDecksInfo() {
      const decksInfo = await getDecks(userData.playerUID);
      setDecksInfo(decksInfo);
    }
    getDecksInfo();
  }, [userData.playerUID]);

  function copyGameCodeButton() {
    Clipboard.setString(userData.gameCode);
    setButtonText("Copied!");
    setTimeout(() => {
      setButtonText("Share with other players");
    }, 4000);
  }

  function selectDeckButton() {
    navigation.navigate("SelectDeck", {...userData });
  }


  async function startGameButton() {
    try {
    //  console.log("start Game button",userData.gameCode,userData.roundNumber);
    

      setLoading(true);
    //  console.log(userData);
      let imageURL = "";
      if (userData.isApi) {
        const imageURLs = await getApiImages(userData);
        console.log("ALL ImageURLS: ",imageURLs);
        imageURL = await postCreateRounds(userData.gameCode, imageURLs, {
          timeout: 60000,
        });
       // console.log("\nAfter Post Create Rounds ", imageURL);
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
      console.log("imageURL:", imageURL);
    } catch (error) {
      console.log(error);
      handleApiError(error, startGameButton, context);
    } finally {
      setLoading(false);
    }
  }

  const destroyLobby = async () => {
    unSubscribe();
    removeMember(userData.playerUID);
  };

  const refreshLobby = async () => {
    const members = await getMembers();
    setLobby(members.map((member) => member.data));
  };

  const initializeLobby = async () => {
    await onMemberUpdate(refreshLobby);
    await addMember(userData.playerUID, { alias: userData.alias });
  //  console.log("Before Subscribe");
    await subscribe(async (event) => {
   //   console.log("Inside Subscribe");
      if (event.data.message === "Start Game") {
        const updatedUserData = {
          ...userData,
          numOfPlayers: event.data.numOfPlayers,
          isApi: event.data.isApi,
          deckTitle: event.data.deckTitle,
          deckUID: event.data.deckUID,
          gameUID: event.data.gameUID,
          numOfRounds: event.data.numOfRounds,
          roundTime: event.data.roundTime,
          imageURL: event.data.imageURL,
        };
        
        setUserData(updatedUserData);
      //  console.log('init lobby',updatedUserData);
       // await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));
      //  navigation.navigate("CaptionNew", {updatedUserData});
          navigation.navigate('CaptionNew', {...updatedUserData});
      }
    });
  };

  useEffect(() => {
    initializeLobby();
    return () => destroyLobby();
  }, []);

  return (
    <View style={styles.container}>
     
    <Image
        source={require('../assets/Polygon 1.svg')}
        style={styles.downwardPolygon}
    />
    <TextInput style={styles.input} editable={false}>Waiting for all Players . . .</TextInput>


    <View style={styles.container}>
    <FlatList
        data={lobby}
        keyExtractor={(item, index) => index.toString()}
        style={styles.lobbyList}
        contentContainerStyle={styles.lobbyContentContainer}
        renderItem={({ item }) => (
        <View style={styles.lobbyPlayer}>
            <View style={styles.playerIcon}>
            <Text style={styles.iconText}>⚫</Text>
            </View>
            <Text style={styles.playerAlias}>{item.alias}</Text>
        </View>
        )}
    />

          
    <View style={styles.container}>
    {userData.host && userData.deckSelected && (

      <TouchableOpacity onPress={selectDeckButton} style={styles.deck}>

        <Image
        /*
          source={{

            uri: userData.deckTitle === 'Google Photos'
              ? 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Google-Photos_icon_logo_%28May-September_2015%29.png'
              : userData.deckThumbnail_url || 'https://via.placeholder.com/150',
          }} */
          source={{

            uri: userData.deckTitle === 'Google Photos'
              ? 'https://openaccess-cdn.clevelandart.org/1964.351/1964.351_web.jpg'
              : userData.deckThumbnail_url,
          }}
          style={styles.deckImage}
          resizeMode="contain"
        />
        <Text style={styles.deckText}>{userData.deckTitle}</Text>
      </TouchableOpacity>
    )}
   </View>
</View>
    <TouchableOpacity
      style={styles.button}
      disabled={true} 
    >
    <Text style={styles.buttonText} editable={false}>Game Code: {userData.gameCode}</Text>
    </TouchableOpacity>


    <TouchableOpacity
      style={styles.button}
      onPress={copyGameCodeButton}
    >
    <Text style={styles.buttonText}>Share with other players</Text>
    </TouchableOpacity>

  {userData.host && !userData.deckSelected && (      
    <TouchableOpacity
      style={styles.button}
      onPress={selectDeckButton}
    >
        <Text style={styles.buttonText}>SelectDeck</Text>
    </TouchableOpacity> 
  )}

  {userData.host && userData.deckSelected && (      
    <TouchableOpacity
      style={styles.button}
      onPress={startGameButton}
    >
        <Text style={styles.buttonText}>Start Game</Text>
    </TouchableOpacity> 
  )}

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
},
header: {
width: "100%",
alignItems: "flex-end",
},

copyButton: {
width: '100%',
minHeight: 55,
backgroundColor: '#DC816A',
borderRadius: 40,
color: 'white',
fontSize: 24,
fontFamily: 'Grandstander',
fontWeight: '700',
marginBottom: 16,
textAlign: 'center',
paddingTop: 14,
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
polygon: {
position: 'absolute',
bottom: -32,
right: 60,
},
centeredView: {
justifyContent: "center",
alignItems: "center",
},
waitingText: {
fontSize: 24,
fontFamily: "Grandstander",
fontWeight: "700",
color: "black",
},
lobby: {
marginTop: 32,
width: "100%",
},
lobbyPlayer: {
display: "flex",
flexDirection: "row",
alignItems: "center",
marginBottom: 8,
},
lobbyPlayerText: {
fontSize: 25,
fontFamily: "Grandstander",
fontWeight: "700",
color: "white",
marginLeft: 10,
},
footer: {
justifyContent: "center",
alignItems: "center",
},
buttonContainer: {
marginTop: 20,
alignItems: "center",
},
gameCode: {
width: 330,
height: 55,
backgroundColor: "#DC816A",
borderRadius: 40,
color: "#FFF",
fontSize: 24,
fontFamily: "Grandstander",
fontWeight: "700",
textAlign: "center",
lineHeight: 55,
marginBottom: 16,
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
deckImage: {
width: 110, 
height: 110, 
borderRadius: 10, 
borderWidth: 1, 
borderColor: '#ddd', 
},
deckText: {
fontSize: 18, 
fontWeight: 'bold', 
color: '#333', 
textAlign: 'center', 
marginVertical: 10, 
},
});