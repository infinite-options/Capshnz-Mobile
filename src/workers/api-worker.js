// api-worker.js
// eslint-disable-next-line import/no-anonymous-default-export
// export default () => {
  let timeoutID;
  /* eslint-disable-next-line no-restricted-globals */
  self.addEventListener("message", async (event) => {
      const submitCaptionURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/submitCaption";

      if(event.data[0] === "start-timeout") {   
        let caption = event.data[3];
          let userData = event.data[1];
          let remainingTime = event.data[2];
          remainingTime *=1000;

          timeoutID = setTimeout(async () => {
          try {
            const payload = {
              caption: caption,
              user_uid: userData.playerUID,
              game_code: userData.gameCode,
              round_number: userData.roundNumber.toString(),
            };

            const response = await fetch(submitCaptionURL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });
        
            if (response.ok) {
              const data = await response.json();
              // console.log("api call was successful", localStorage.getItem("user-caption"))
              // localStorage.removeItem("user-caption")
              // console.log("after delere", localStorage.getItem("user-caption"))
              /* eslint-disable-next-line no-restricted-globals */
              self.postMessage(["mesg from post", userData]);
              /* eslint-disable-next-line no-restricted-globals */
              
            } else {
              console.error("Fetch request error:", response.statusText);
        /* eslint-disable-next-line no-restricted-globals */
        self.postMessage(0); // Handle the error as needed
            }
          } catch (error) {
            console.error("Fetch request error:", error);
        /* eslint-disable-next-line no-restricted-globals */
        self.postMessage(0); // Handle the error as needed
      } },remainingTime);
    
      }
      else if( event.data === "exit"){
        console.log("jere",timeoutID)

        if(timeoutID) {
          clearTimeout(timeoutID);
          console.log("jere",timeoutID)
        }
                /* eslint-disable-next-line no-restricted-globals */
                self.close()

      }
    });

    /* eslint-disable-next-line no-restricted-globals */
    // self.onmessage = (event) =>{
    //   console.log("on line 70 event on here",event)
    // }
        // };
