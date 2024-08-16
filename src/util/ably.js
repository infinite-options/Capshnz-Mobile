import * as Ably from "ably";
import { REACT_APP_ABLY_API_KEY } from '@env';


const ABLY_API_KEY = REACT_APP_ABLY_API_KEY;
console.log("ably key: ", ABLY_API_KEY);

const useAbly = (() => {
  let channel = null;

  return (channelId) => {
    const setChannelId = async (channelId) => {
      const channelName = `BizBuz/${channelId}`;
      if (!channel || channel.name !== channelName) {
        const ablyClient = new Ably.Realtime(ABLY_API_KEY);
        //const ablyClient = new Ably.Realtime.Promise(ABLY_API_KEY);
        channel = ablyClient.channels.get(channelName);
        await channel.attach();
      }
    };

    if (channelId) {
      setChannelId(channelId);
    }

    const publish = async (message) => {
      console.log("in ably publish: ", message)
      await channel.publish(message);
    
    };

    const getMembers = async () => {
      //console.log('ABLY KEY--',ABLY_API_KEY);
      return await channel.presence.get();
    };

    const addMember = async (clientId, data) => {
      await channel.presence.enterClient(clientId, data);
    };

    const removeMember = async (clientId) => {
      await channel.presence.leaveClient(clientId);
    };

    const onMemberUpdate = async (callback) => {
      await channel.presence.subscribe("enter", callback);
    };
/*
    const subscribe = async (listener) => {
      try {
        console.log("inside subscribe func");
        await channel.subscribe(listener);
        console.log("after listener ");
      } catch (error) {
        console.error("Error in subscribe:", error);
      } 
    };
*/

const subscribe = async (listener) => {
  try {
    // console.log("inside subscribe func",channel.state);
    if (channel.state !== 'attached') {
      // console.log("attaching channel...");
      await channel.attach();
      // console.log("channel attached");
    }
    // console.log("subscribing to channel...");
    const subscribePromise = channel.subscribe(listener);
    
    // Add a timeout for subscription
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Subscription timed out")), 10000)
    );

    await Promise.race([subscribePromise, timeoutPromise]);
    // console.log("after listener");
  } catch (error) {
    console.error("Error in subscribe:", error);
  }
};

    const unSubscribe = () => {
      channel.presence.unsubscribe();
      channel.unsubscribe();
    };

    const detach = async () => {
      await channel.detach();
      await channel.release();
    };

    return {
      setChannelId,
      publish,
      subscribe,
      addMember,
      removeMember,
      getMembers,
      onMemberUpdate,
      unSubscribe,
      detach,
    };
  };
})();

export default useAbly;
