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

/* ================= LISTENER ================ */
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (message.channel.id !== WATCH_CHANNEL_ID) return;
    if (!message.content.startsWith("New Client Alert!")) return;

    const lines = message.content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const payload = {
      alertType: "NEW CLIENT ALERT",
      name: extractField(lines, "Name"),
      website: extractField(lines, "Website"),
      intakeForm: extractField(lines, "Intake Form"),
      onboardingDoc: extractField(lines, "Onboarding Doc"),
      esAssigned: extractField(lines, "ES Assigned"),
      contactPerson: extractField(lines, "Contact Person"),
      servicePackage: extractField(lines, "Service Package"),
      timezone: extractField(lines, "Timezone"),
      leadES: extractField(lines, "Lead ES"),
      channelSource: extractField(lines, "Channel"),
      signupPlatform: extractField(lines, "Signup Platform"),
      feedbackloop: extractField(lines, "Feedback Loop"),


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
    console.log(`✅ Sent alert for ${payload.name}`);
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
