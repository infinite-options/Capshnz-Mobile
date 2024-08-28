import * as Ably from "ably";

const ABLY_API_KEY = process.env.EXPO_PUBLIC_ABLY_API_KEY;

const useAbly = (() => {
  let channel = null;

  return (channelId) => {
    const setChannelId = async (channelId) => {
      const channelName = `BizBuz/${channelId}`;
      if (!channel || channel.name !== channelName) {
        const ablyClient = new Ably.Realtime(ABLY_API_KEY);
        channel = ablyClient.channels.get(channelName);
        await channel.attach();
      }
    };

    if (channelId) {
      setChannelId(channelId);
    }

    const publish = async (message) => {

      await channel.publish(message);
    
    };

    const getMembers = async () => {

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


const subscribe = async (listener) => {
  try {

    if (channel.state !== 'attached') {
      await channel.attach();
    }

    const subscribePromise = channel.subscribe(listener);
    
    // Add a timeout for subscription
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Subscription timed out")), 10000)
    );
    await Promise.race([subscribePromise, timeoutPromise]);
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



