import React, { useState, useContext, useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { handleApiError } from "../util/ApiHelper";
import { ErrorContext } from "../../App";
import useAbly from "../util/ably";
import { getApiImages, postCreateRounds, getDecks } from "../util/Api";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Clipboard,
} from "react-native";

export default function WaitingRoom() {
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
    navigation.navigate("SelectDeck", { ...userData });
  }

  async function startGameButton() {
    try {
      setLoading(true);
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
      console.log(error);
      if (context?.setShow) handleApiError(error, startGameButton, context);
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
    console.log("📡 Refreshed Lobby Members:", members);
    setLobby(members.map((member) => member.data || { alias: "Unknown" }));
  };

  const initializeLobby = async () => {
    console.log("🧠 userData at WaitingRoom:", userData); // debug line

    const fallbackAlias = userData.alias || `Player-${userData.playerUID?.slice(-4) || "anon"}`;

    await onMemberUpdate(refreshLobby);

    await addMember(userData.playerUID, {
      alias: fallbackAlias,
    });

    await refreshLobby(); // ensures all users show up

    await publish({ data: { type: "player-joined" } });

    await subscribe(async (event) => {
      const data = event.data;

      if (data.message === "Start Game") {
        const updatedUserData = {
          ...userData,
          numOfPlayers: data.numOfPlayers,
          isApi: data.isApi,
          deckTitle: data.deckTitle,
          deckUID: data.deckUID,
          gameUID: data.gameUID,
          numOfRounds: data.numOfRounds,
          roundTime: data.roundTime,
          imageURL: data.imageURL,
        };
        setUserData(updatedUserData);
        navigation.navigate("CaptionNew", { ...updatedUserData });
      }

      if (data.type === "player-joined") {
        refreshLobby(); // refresh on join broadcast
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
        source={require("../assets/Polygon 1.svg")}
        style={styles.downwardPolygon}
      />

      <Text style={styles.input}>Waiting for all Players . . .</Text>

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
                source={{
                  uri:
                    userData.deckTitle === "Google Photos"
                      ? "https://openaccess-cdn.clevelandart.org/1964.351/1964.351_web.jpg"
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

      <TouchableOpacity style={styles.button} disabled={true}>
        <Text style={styles.buttonText}>Game Code: {userData.gameCode}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={copyGameCodeButton}>
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>

      {userData.host && !userData.deckSelected && (
        <TouchableOpacity style={styles.button} onPress={selectDeckButton}>
          <Text style={styles.buttonText}>Select Deck</Text>
        </TouchableOpacity>
      )}

      {userData.host && userData.deckSelected && (
        <TouchableOpacity style={styles.button} onPress={startGameButton}>
          <Text style={styles.buttonText}>Start Game</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flex: 1,
    alignItems: "center",
    backgroundColor: "#CBDFBD",
    padding: 16,
  },
  input: {
    width: "80%",
    height: 60,
    backgroundColor: "white",
    borderRadius: 30,
    fontSize: 26,
    fontFamily: "Arial",
    fontWeight: "normal",
    textAlign: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
    paddingTop: 15,
    overflow: 'hidden',
  },
  lobbyPlayer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  playerIcon: {
    marginRight: 8,
  },
  iconText: {
    fontSize: 18,
  },
  playerAlias: {
    fontSize: 20,
    fontFamily: "Arial",
    fontWeight: "normal",
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
    fontFamily: "Arial",
    fontWeight: "normal",
  },
  deckImage: {
    width: 110,
    height: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  deckText: {
    fontSize: 18,
    fontWeight: "normal",
    color: "#333",
    textAlign: "center",
    marginVertical: 10,
  },
});
