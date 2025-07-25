// api-worker.js

// export default () => {
    let timeoutID;
    /* eslint-disable-next-line no-restricted-globals */
      self.addEventListener("message", async (event) => {
        const postVoteCaptionURL = "https://bmarz6chil.execute-api.us-west-1.amazonaws.com/dev/api/v2/voteCaption";

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

              const response = await fetch(postVoteCaptionURL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });
          
              if (response.ok) {
                const data = await response.json();

                /* eslint-disable-next-line no-restricted-globals */
                self.postMessage(data.players_count);
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
          console.log("worker exited before api-call")
  
          if(timeoutID) {
            clearTimeout(timeoutID);
          }
                  /* eslint-disable-next-line no-restricted-globals */
                  self.close()
        }
      });      
    // };
  