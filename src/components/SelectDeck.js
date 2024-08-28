import React, { createContext,useState, useEffect, useContext } from "react";
import { useNavigation, useRoute ,useFocusEffect} from "@react-navigation/native";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, TextInput,FlatList } from "react-native";
import useAbly from "../util/ably";
import { getDecks, selectDeck } from "../util/Api";
import { handleApiError } from "../util/ApiHelper";
import CloseButton from "../assets/close-button.svg";
import Polygon from "../assets/Polygon 1.svg";

export const ErrorContext = createContext();

export default function SelectDeck() {
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  const [decksInfo, setDecksInfo] = useState([]);
  const { publish } = useAbly(userData.gameCode);
  const context = useContext(ErrorContext);

  useFocusEffect(
    React.useCallback(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation])
  );

  useEffect(() => {
    async function getDecksInfo() {
      const decksInfo = await getDecks(userData.playerUID);
      setDecksInfo(decksInfo);
    }
    getDecksInfo();
  }, [userData.playerUID]);

  async function handleClick(deckTitle, deckUID, thumbnail_url) {
    try {


      await selectDeck(deckUID, userData.gameCode, userData.roundNumber); //check later 
      let isApi;

      if (deckTitle === "Google Photos") {
       
       try {
         await publish({ data: { message: "Deck Selected" } });
        } catch (error) {
          console.error('Publish failed:', error);
        }
        navigation.navigate("GooglePhotos", {...userData });
        return;

      } else if (
        deckTitle === "Cleveland Gallery" ||
        deckTitle === "Chicago Gallery" ||
        deckTitle === "Giphy Gallery" ||
        deckTitle === "Harvard Gallery" ||
        deckTitle === "CNN Gallery"
      ) {
        isApi = true;
      } else {
        isApi = false;
      }
      const updatedUserData = {
        ...userData,
        isApi: isApi,
        deckSelected: true,
        deckTitle: deckTitle,
        deckUID: deckUID,
        deckThumbnail_url: thumbnail_url,
      };
      setUserData(updatedUserData);
      if (deckTitle === "CNN Gallery") {
        navigation.navigate("CnnDeck", {...updatedUserData});
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "WaitingRoom", params: {...updatedUserData} }],
        });
      }
    } catch (error) {
      handleApiError(
        error,
        () => handleClick(deckTitle, deckUID, thumbnail_url),
        context
      );
    }
  }
  return (
    <View style={styles.container}>

     
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.navigate("StartGame", {...userData })}>
            <Text style={styles.closeButtonText}>X</Text>

          </TouchableOpacity>

      <View style={styles.polygonContainer}>
      <Text> </Text>
        <Image source={Polygon} style={styles.polygon} />
        <TextInput
          style={styles.title}
          value="Select a Deck"
          editable={false}
        />
        <Image
        source={require('../assets/polygon-downwards-white.png')}
        style={styles.downwardPolygonRight}
        />
      </View>
      <View style={styles.deckContainer}>
        <FlatList
          data={decksInfo.filter(deck => deck.user_uid !== "PRIVATE")}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.deck} onPress={() => handleClick(item.deck_title, item.deck_uid, item.deck_thumbnail_url)}>
              <Image source={{ uri: item.deck_thumbnail_url }} style={styles.deckImage} />
              <Text style={styles.deckText}>{item.deck_title}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) => index.toString()}
          numColumns={2}
          olumnWrapperStyle={styles.columnWrapper}
        />
      </View>

      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    minHeight: "100vh",
    backgroundColor: "#C8DAD8",
    padding: 20,
  },
  closeButton: {
    position: "absolute",
    right: 5,
    top: 5,
    width: 30,
    height: 30,
  },
  closeButtonText: {
    fontSize: 24,
    color: "black",
    alignContent: 'center',

  },
 
  polygonContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  polygon: {
    position: "absolute",
    bottom: -32,
    right: 80,
  },
  title: {
    width: 350,
    height: 64,
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 6,
    paddingBottom: 6,
    color: "black",
    fontSize: 24,
    fontFamily: "Grandstander",
    fontWeight: "700",
    textAlign: "center",
  },
  deckContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: "100%", 

  },
  deck: {
    width: "45%", 
    margin: 10,
    alignItems: "center",
  },
  deckImage: {
    width: 110,
    height: 110,
    borderRadius: 20,
    marginTop: 30,
  },
  deckText: {
    fontFamily: "Grandstander",
    fontWeight: "700",
    fontSize: 13,
    color: "white",
    marginTop: 5,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  downwardPolygonRight: {
    marginTop: -10,
    width: 50, 
    height: 50, 
    right: -80,
    bottom: 10,
  },

});