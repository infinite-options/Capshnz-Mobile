import React, { useState } from "react";
import { useNavigation,useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text, View, ImageBackground, TextInput, Button, TouchableOpacity, Image } from 'react-native';
import { addUserByEmail } from "../util/Api";


export default function Landing() {
    const [isInvalid, setInvalid] = useState(false);
    const [email, setEmail] = useState("");
    const [cookies, setCookie] = useState(["email"]);
    const [cookiesUsed, setCookiesUsed] = useState(false);
    const navigation = useNavigation();

    const handleEmailChange = (inputEmail) => {
    setEmail(inputEmail);
    const testEmail = /[\w\d]{1,}@[\w\d]{1,}.[\w\d]{1,}/;
    if (!testEmail.test(inputEmail.toLowerCase())) {
        setInvalid(true);
    }
    else {
        setInvalid(false);
    }
    
    };

    useFocusEffect(
      React.useCallback(() => {
          navigation.setOptions({ headerShown: false });
      }, [navigation])
    );

    const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isInvalid) {

        try {
           
           
        const res = await addUserByEmail(email);
       // setCookie("email", email, { path: "/" });
        const userData = {
            ...res,
            email: email,
            playerUID: res.user_uid,
        };
        navigation.navigate("EnterName", {userData });
        
        } catch (err) {
        console.error(err);
        }
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
              style={[styles.input, isInvalid && styles.inputInvalid]}
                value={email}
                placeholder="Enter email here..."
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            <Image
                      source={require('../assets/polygon-downwards-white.png')}
                      style={styles.downwardPolygonRight}
              />
              {isInvalid && (
                  <Text style={styles.errorText}>Please provide a valid email.</Text>
              )}
              

              <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
          
          >
            <Text style={styles.buttonText}>
              {"Enter"}
            </Text>
          </TouchableOpacity>

              {/* <Text style={styles.link} onPress={() => navigation.navigate('GameRules')}>
                <Text style={styles.linkIcon}>ℹ️</Text> Game Rules
            </Text>         */}
          </View>
        <View style={styles.agreementContainer}>
          <Text style={styles.agreement}>
                By pressing Enter you agree to let us use cookies to improve game performance
              </Text>
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
    centered: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    overlay: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'rgba(0,0,0,0.5)', 
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
    label: {
      fontSize: 16,
      marginBottom: 10,
      color: 'white',
      fontFamily: "Grandstander",
      fontWeight: "400",
      
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
    inputInvalid: {
      borderColor: 'red',
    },
    errorText: {
      color: 'red',
      marginBottom: 10,
      fontFamily: "Grandstander",
      fontSize: 16,
    },
    agreement: {
      textAlign: 'center',
      marginBottom: 20,
      color: 'white',
      fontFamily: "Grandstander",
      fontSize: 16,
    },
    agreementContainer: {
      fontWeight: '400',
    },
    link: {
      color: 'blue',
      textAlign: 'center',
      marginTop: 20,
      fontFamily: "Grandstander",
       fontSize: 16,
    },
    linkIcon: {
      fontSize: 18,
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
