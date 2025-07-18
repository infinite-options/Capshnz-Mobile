import * as Ably from "ably";

// ✅ DIRECTLY use your API key here
const ABLY_API_KEY = "uVw8ZQ.JeIy0w:oGVPDlf8XqW8GGYFkjpbMaxjGb7PFr0Go8xp7NMWB28";

let globalClient = null;
let channel = null;

const useAbly = (() => {
  return (channelId) => {
    const channelName = `BizBuz/${channelId}`;
    console.log("🔌 Connecting to Ably Channel:", channelName);

    if (!globalClient) {
      globalClient = new Ably.Realtime(ABLY_API_KEY); // ✅ no .Promise
    }

    if (!channel || channel.name !== channelName) {
      channel = globalClient.channels.get(channelName);
      channel.attach((err) => {
        if (err) console.error("❌ Channel attach error:", err);
        else console.log("✅ Channel attached:", channelName);
      });
    }

    const publish = async (message) => {
      console.log("📤 Publishing:", message);
      await channel.publish(message);
    };

    const subscribe = async (listener) => {
      console.log("📡 Subscribing to channel:", channelName);
      await channel.subscribe((msg) => {
        console.log("📥 Message received:", msg);
        listener(msg);
      });
    };

    const onMemberUpdate = async (callback) => {
      await channel.presence.subscribe("enter", () => {
        console.log("👤 New member entered");
        callback();
      });
    };

    const addMember = async (clientId, data) => {
      console.log("➕ Adding presence:", clientId, data);
      await channel.presence.enterClient(clientId, data);
    };

    const removeMember = async (clientId) => {
      console.log("➖ Removing presence:", clientId);
      await channel.presence.leaveClient(clientId);
    };

    const getMembers = async () => {
      const members = await channel.presence.get();
      console.log("👥 Current members:", members);
      return members;
    };

    const unSubscribe = () => {
      console.log("🛑 Unsubscribing...");
      channel.presence.unsubscribe();
      channel.unsubscribe();
    };

    return {
      publish,
      subscribe,
      addMember,
      removeMember,
      getMembers,
      onMemberUpdate,
      unSubscribe,
    };
  };
})();

export default useAbly;
