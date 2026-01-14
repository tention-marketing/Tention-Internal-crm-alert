import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import axios from "axios";

/* ================= CONFIG ================= */
const WATCH_CHANNEL_ID = "1456326124412862575";
const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

/* ================ VALIDATION ============== */
if (!DISCORD_TOKEN) {
  console.error("❌ Missing DISCORD_TOKEN");
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error("❌ Missing N8N_WEBHOOK_URL");
  process.exit(1);
}

/* ================= DISCORD ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // needed for nicknames
  ],
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: "online",
    activities: [{ name: "Client alerts" }],
  });
});

/* ================= HELPERS ================= */
function extractField(lines, field) {
  const line = lines.find((l) =>
    l.toLowerCase().startsWith(field.toLowerCase())
  );
  if (!line) return null;
  return line.split(":").slice(1).join(":").trim();
}

/**
 * ✅ Resolves Discord mentions to a clean display name
 * - Uses server nickname first
 * - Removes "@"
 * - Safe fallbacks
 */
function resolveESName(value, message) {
  if (!value) return null;

  let name = value;

  // Replace Discord mention with display name
  name = name.replace(/<@!?(\d+)>/g, (_, id) => {
    const member = message.guild.members.cache.get(id);
    if (!member) return "";

    return (
      member.displayName ||        // Server nickname
      member.user.globalName ||    // Discord display name
      member.user.username
    );
  });

  // Remove leading @ if user typed "@Taiwo"
  name = name.replace(/^@/, "").trim();

  return name || null;
}

/* ================= LISTENER ================ */
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (message.channel.id !== WATCH_CHANNEL_ID) return;

    // Case-insensitive detection
    if (!message.content.toLowerCase().startsWith("new client alert")) return;

    const lines = message.content
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const payload = {
      alertType: "NEW CLIENT ALERT",
      name: extractField(lines, "Name"),
      website: extractField(lines, "Website"),
      intakeForm: extractField(lines, "Intake Form"),
      onboardingDoc: extractField(lines, "Onboarding Doc"),
      esAssigned: resolveESName(extractField(lines, "ES Assigned"), message),
      contactPerson: extractField(lines, "Contact Person"),
      servicePackage: extractField(lines, "Service Package"),
      timezone: extractField(lines, "Timezone"),
      leadES: resolveESName(extractField(lines, "Lead ES"), message),
      channelSource: extractField(lines, "Channel"),
      signupPlatform: extractField(lines, "Signup Platform"),
      feedbackLoop: extractField(lines, "Feedback Loop"),

      discord: {
        channelId: message.channel.id,
        channelName: message.channel.name,
        author: message.author.username,
        createdAt: message.createdAt.toISOString(),
        messageId: message.id,
        messageUrl: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
      },
    };

    await axios.post(WEBHOOK_URL, payload);
    console.log(`✅ Sent alert for ${payload.clientName}`);
  } catch (error) {
    console.error("❌ Failed to send webhook", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
});

/* ================= START =================== */
client.login(DISCORD_TOKEN);
