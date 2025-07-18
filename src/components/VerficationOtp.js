import React, { useContext, useState } from 'react';
import { View, Text, TextInput, Image, ImageBackground, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { checkEmailCode } from '../util/Api'; // Assuming this is your API function
import { handleApiError } from '../util/ApiHelper'; // Assuming this is your error handler
import PolygonWhiteDownward from '../assets/polygon-downwards-white.svg'; // Adjust this based on your SVG component
import PolygonGreyUpward from '../assets/polygon-upward-grey.svg'; // Adjust this based on your SVG component
import { ErrorContext } from '../../App';

export default function VerificationOtp() {
  const navigation = useNavigation();
  const route = useRoute();
  const userData = route.params; 
  const [code, setCode] = useState('');
  const [valid, setValid] = useState(true); 
  const context = useContext(ErrorContext);



  const handleChange = (code) => {
    setCode(code);
  };
  console.log(userData);
  const handleSubmit = async () => {
    try {

      const status = await checkEmailCode(userData.playerUID, code); 
      console.log("OTP screen");
      console.log(userData);
     // status.email_validated_status = 'TRUE'; // Remove code later 
      if (status.email_validated_status === 'TRUE') {
        navigation.navigate('StartGame', { ...userData });
      } else {
        setValid(false);
        setTimeout(() => {
          setValid(true);
        }, 5000);
      }
    } catch (error) {
      handleApiError(error, handleSubmit, context); 
    }
  };

  const handleEmailChange = () => {
    navigation.navigate('/');
  };

  console.log('Verification OTP');
  console.log(userData);

  return (
    <ImageBackground
    source={require('../assets/landing-new.png')}
    style={styles.backgroundImage}
  >
 <View style={styles.centered}>

      <Image
          source={require('../assets/polygon-downwards-white.svg')}
          style={styles.downwardPolygon}
      />
      <TextInput style={styles.header} editable={false}>Welcome to Capshnz!</TextInput>
      <Image
          source={require('../assets/polygon-downwards-white.svg')}
          style={styles.downwardPolygon}
      />
      <TextInput style={styles.codeInputLabel}  editable={false}>Enter 3 digit code</TextInput>
        <TextInput
          style={[styles.input, !valid && styles.inputInvalid]}
          value={code}
          placeholder="123"
          onChangeText={handleChange}
          keyboardType="numeric"
        />
        {!valid && <Text style={styles.invalidText}>Invalid Code. Please Try Again.</Text>}
     
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Enter</Text>
      </TouchableOpacity>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          A 3 digit code has been sent to your email. Please check your email and enter the code above.
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
  container: {
    flex: 1,
    backgroundColor: '#5E9E94',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    marginLeft: -223,
    marginTop: -10,
  },
  inputContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  greyUpwardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  greyUpward: {
    marginLeft: 20,
    marginBottom: -10,
  },
  codeInputLabel: {
    width: '90%',
    height: 61,
    backgroundColor: '#B5BBD3',
    borderRadius: 40,
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
   // textAlignVertical: 'center',
    fontFamily: 'Grandstander', 
    marginVertical: 10,
    paddingHorizontal: 20,
  },

  input: {
    width: '90%',
    height: 123,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 6,
    fontSize: 32,
    textAlign: 'center',
    marginTop: 16,
    fontFamily: 'Grandstander', 
  },
  inputInvalid: {
    borderColor: 'red',
  },
  invalidText: {
    color: 'red',
    fontSize: 16,
    marginTop: 8,
    fontFamily: 'Grandstander', 
  },
  button: {
    width: 218,
    height: 54,
    backgroundColor: '#5E9E94',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Grandstander', 
  },
  infoContainer: {
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'Grandstander',
  },
});

