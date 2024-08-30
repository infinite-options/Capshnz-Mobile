import React, { useState } from 'react';
import { StyleSheet,ImageBackground, Text, View, TextInput, Button, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute,useFocusEffect } from '@react-navigation/native';
import { addUser } from '../util/Api';

export default function EnterName() {
    const navigation = useNavigation();
    const route = useRoute();
    const{userData}= route.params;

    const [name, setName] = useState('');
    const [alias, setAlias] = useState('');
    const [prevName, setPrevName] = useState('');
    const [prevAlias, setPrevAlias] = useState('');

    useFocusEffect(
      React.useCallback(() => {
          navigation.setOptions({ headerShown: false });
      }, [navigation])
    );
    
    const handleNameChange = (text) => {
        setName(text);
      };
    
      const handleAliasChange = (text) => {
        setAlias(text);
      };
    
      const hasAnyNameChanged = () => {

       // const { prevName, prevAlias } = userData;
        if (prevName !== name || prevAlias !== alias) 
        {
            return true;
        }  
        else
        {
            
            return false;
        }  
        
      };
    
      const handleSubmit = async (event) => {
        try {
        //  event.preventDefault();
        
          const updatedUserData = {
            ...userData,
            name,
            alias,
          };
          
  
          if (hasAnyNameChanged()) {
            try {
              
                const response = await addUser(updatedUserData);
              } catch (error) {
                console.error('Error adding user:');

              }
          }

         
          if (userData.user_code === "TRUE"){

            navigation.navigate("StartGame", {...updatedUserData});
          }  
          else {
            navigation.navigate("VerificationOtp", {...updatedUserData});
          }
        } catch (err) {
          console.error(err);
        }
      };

    return (
     <ImageBackground
        source={require('../assets/landing-new.png')}
        style={styles.backgroundImage}
      >
        <View style={styles.centered}>

            
            <TextInput style={styles.header} editable={false}>Welcome to Capshnz!</TextInput>
            <Image
              source={require('../assets/polygon-downwards-white.png')}
              style={styles.downwardPolygonLeft}
             />
            <TextInput
                style={styles.input}
                value={name}
                placeholder="Enter name here..."
                onChangeText={handleNameChange}
            />
            <Image
                      source={require('../assets/polygon-downwards-white.png')}
                      style={styles.downwardPolygonRight}
              />

              <Image
                      source={require('../assets/polygon-upward-white.png')}
                      style={styles.upwardPolygonLeft}
              />
            <TextInput
                style={styles.input}
                value={alias}
                placeholder="Enter screen name here..."
                onChangeText={handleAliasChange}
            />
            

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
          
          >
            <Text style={styles.buttonText}>
              {"Enter"}
            </Text>
          </TouchableOpacity>

        
        </View>
      </ImageBackground>
    );
};

    
const styles = StyleSheet.create({

    backgroundImage: {
        flex: 1,
        resizeMode: 'cover', 
        justifyContent: 'center',
      },
      overlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.5)', 
      },

    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
      },
      centered: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
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
    downwardPolygonLeft: {
      marginTop: -10,
      width: 50, 
      height: 50, 
      right: 100,
      bottom: 10,
    },
  downwardPolygonRight: {
      marginTop: -10,
      width: 50, 
      height: 50, 
      right: -80,
      bottom: 10,
    },
    upwardPolygonLeft: {
      marginTop: -10,
      width: 50, 
      height: 50, 
      right: 100,
      bottom: -30,
    },
      header: {
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
      downwardPolygon: {
        marginTop: -10,
        width: 50, 
        height: 50, 
      },

      upwardPolygon: {
        marginBottom: -10,
        width: 50, 
        height: 50, 
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
  });  
