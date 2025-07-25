import React, { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, TextInput,FlatList } from "react-native";
//import { useCookies } from "react-cookie";
import useAbly from "../util/ably";
import { getDecks, selectDeck } from "../util/Api";
import { ErrorContext } from "../../App";
import { handleApiError } from "../util/ApiHelper";
import CloseButton from "../assets/close-button.svg";
import Polygon from "../assets/Polygon 1.svg";




export default function SelectDeck() {
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  //const [cookies, setCookie] = useCookies(["userData"]);
  const [decksInfo, setDecksInfo] = useState([]);
  const { publish } = useAbly(userData.gameCode);
  const context = useContext(ErrorContext);



  useEffect(() => {
    async function getDecksInfo() {
      const decksInfo = await getDecks(userData.playerUID);
      setDecksInfo(decksInfo);
    }
    getDecksInfo();
  }, [userData.playerUID]);

  async function handleClick(deckTitle, deckUID, thumbnail_url) {
    try {
      //console.log(userData);
      //console.log(deckUID);
      await selectDeck(deckUID, userData.gameCode, userData.roundNumber); //check later 
      //console.log("after select deck");
      let isApi;
      if (deckTitle === "Google Photos") {
        await publish({ data: { message: "Deck Selected" } });
        navigation.navigate("GooglePhotos", { state: userData });
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
     // console.log("before func");
      const updatedUserData = {
        ...userData,
        isApi: isApi,
        deckSelected: true,
        deckTitle: deckTitle,
        deckUID: deckUID,
        deckThumbnail_url: thumbnail_url,
      };
      setUserData(updatedUserData);
      //console.log('select Deck updatedUserData');
     // console.log(updatedUserData);
      //setCookie("userData", updatedUserData, { path: "/" });
      if (deckTitle === "CNN Gallery") {
        navigation.navigate("CnnDeck", {...updatedUserData});
      } else {
       // console.log('Select Deck to Waiting room',updatedUserData);
        //navigation.navigate("WaitingRoom", {...updatedUserData});
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
 // console.log('Select Deck ....',userData);
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate("StartGame", { state: userData })}>
        <Image source={CloseButton} style={styles.closeButton} />
      </TouchableOpacity>
      <View style={styles.polygonContainer}>
        <Image source={Polygon} style={styles.polygon} />
        <TextInput
          style={styles.title}
          value="Select a Deck"
          editable={false}
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
});