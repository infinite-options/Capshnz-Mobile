import React, { useContext, useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
//import { useCookies } from 'react-cookie';
import { getApiImages, postCreateRounds } from '../util/Api';
import useAbly from '../util/ably';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Clipboard,
  Button,
  ActivityIndicator,
} from 'react-native';
import { handleApiError } from '../util/ApiHelper';
import { ErrorContext } from '../../App';

export default function Waiting() {
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  //const [cookies, setCookie] = useCookies(['userData']);
  const {
    publish,
    subscribe,
    onMemberUpdate,
    getMembers,
    addMember,
    unSubscribe,
    removeMember,
  } = useAbly(userData.gameCode);
  const [buttonText, setButtonText] = useState('Share with other players');
  const [lobby, setLobby] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const context = useContext(ErrorContext);

  function copyGameCodeButton() {
    Clipboard.setString(userData.gameCode);
    setButtonText('Copied!');
    setTimeout(() => {
      setButtonText('Share with other players');
    }, 2000);
  }

  function selectDeckButton() {
    navigation.navigate('SelectDeck', { state: userData });
  }

  async function startGameButton() {
    try {
      setLoading(true);
      let imageURL = '';
      if (userData.isApi) {
        const imageURLs = await getApiImages(userData);
        imageURL = await postCreateRounds(userData.gameCode, imageURLs);
      }
      await publish({
        data: {
          message: 'Start Game',
          numOfPlayers: lobby.length,
          isApi: userData.isApi,
          deckTitle: userData.deckTitle,
          deckUID: userData.deckUID,
          gameUID: userData.gameUID,
          numOfRounds: userData.numOfRounds,
          roundTime: userData.roundTime,
          imageURL: imageURL,
        },
      });
    } catch (error) {
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
    await subscribe(async (event) => {
      if (event.data.message === 'Start Game') {
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
        setCookie('userData', updatedUserData, { path: '/' });
        navigation.navigate('Caption', { state: updatedUserData });
      }
    });
  };

  useEffect(() => {
    initializeLobby();
    return () => destroyLobby();
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.navigate('GameRules')}
        style={styles.gameRulesButton}
      >
        <Text style={styles.gameRulesText}>Game Rules</Text>
      </TouchableOpacity>
      <Text style={styles.waitingText}>Waiting for all players to join</Text>
      <FlatList
        data={lobby}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.lobbyPlayer}>
            <Text style={styles.playerIcon}>⚫</Text>
            <Text style={styles.playerAlias}>{item.alias}</Text>
          </View>
        )}
        style={styles.lobbyList}
      />
      <Text style={styles.gameCode}>Game Code: {userData.gameCode}</Text>
      <TouchableOpacity onPress={copyGameCodeButton} style={styles.shareButton}>
        <Text style={styles.shareButtonText}>{buttonText}</Text>
      </TouchableOpacity>
      {userData.host && !userData.deckSelected && (
        <TouchableOpacity
          onPress={selectDeckButton}
          style={styles.selectDeckButton}
        >
          <Text style={styles.selectDeckButtonText}>Select Deck</Text>
        </TouchableOpacity>
      )}
      {userData.host && userData.deckSelected && (
        <TouchableOpacity
          onPress={startGameButton}
          style={styles.startGameButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.startGameButtonText}>Start Game</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CBDFBD',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  gameRulesButton: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  gameRulesText: {
    fontSize: 16,
    color: '#000',
    textDecorationLine: 'underline',
  },
  waitingText: {
    fontSize: 24,
    marginVertical: 16,
  },
  lobbyList: {
    width: '100%',
  },
  lobbyPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerIcon: {
    fontSize: 24,
    color: 'purple',
    marginRight: 10,
  },
  playerAlias: {
    fontSize: 25,
    color: 'white',
    fontFamily: 'Grandstander',
    fontWeight: '700',
  },
  gameCode: {
    fontSize: 18,
    marginVertical: 16,
    textAlign: 'center',
    width: 330,
    height: 55,
    backgroundColor: '#DC816A',
    borderRadius: 40,
    padding: 10,
    color: '#FFF',
    fontFamily: 'Grandstander',
    fontWeight: '700',
  },
  shareButton: {
    width: 330,
    height: 55,
    backgroundColor: '#DC816A',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Grandstander',
    fontWeight: '700',
  },
  selectDeckButton: {
    width: 330,
    height: 55,
    backgroundColor: '#DC816A',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  selectDeckButtonText: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Grandstander',
    fontWeight: '700',
  },
  startGameButton: {
    width: 330,
    height: 55,
    backgroundColor: '#71CAA3',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  startGameButtonText: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Grandstander',
    fontWeight: '700',
  },
});
