const OpenAI = require("openai");
const { app, BrowserWindow, ipcMain } = require("electron");
const { config } = require("dotenv");
const { marked } = require("marked");
config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateLinkedinPost() {
  const topicOfPost = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "Suggest a trending topic related to stuff like SaMD in healthcare, AI in healthcare, The efficiencies that AI can have in healthcare and workflows. All this type of topics. You can be creative.",
      },
    ],
    max_tokens: 150,
  });

  const topic = topicOfPost.choices[0].message.content;

  const postContentResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Write an engaging LinkedIn post about: ${topic}`,
      },
    ],
    max_tokens: 300,
  });
  const content = postContentResponse.choices[0].message.content;

  const imagePostResponse = await openai.images.generate({
    model: "dall-e-3",
    prompt: `Create a professional LinkedIn-style image for a post about: ${topic}`,
    size: "1024x1024",
  });
  const image = imagePostResponse.data[0].url;

  return { topic, content, image };
}

function createWindow(postContent, imageUrl) {
  const win = new BrowserWindow({
    width: 600,
    height: 800,
    webPreferences: {
      nodeIntegration: false,  // More secure approach
      contextIsolation: true  // For better security
    },
  });

  const postContentMarked = marked(postContent);

  // Log the marked content for debugging
  console.log(postContentMarked);

  // Embed both the post content and the image in the HTML
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Generated LinkedIn Post</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h1 {
            color: #0077B5; /* LinkedIn blue */
          }
          img {
            max-width: 100%;
            height: auto;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Generated LinkedIn Post</h1>
        <div>
          ${postContentMarked}
        </div>
        <img src="${imageUrl}" alt="LinkedIn Post Image" />
      </body>
    </html>
  `;

  // Load the HTML content
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  // Open Developer Tools for better debugging
  win.webContents.openDevTools();

  ipcMain.once("regeneratePost", async () => {
    win.close();
    main();
  });
}

async function generatePost() {
  const { topic, content, image } = await generateLinkedinPost();
  return { postContent: content, imageUrl: image };
}

async function main() {
  const { postContent, imageUrl } = await generatePost();
  createWindow(postContent, imageUrl);
}

app.whenReady().then(async () => {
  try {
    main();
  } catch (error) {
    console.error("Failed to start application:", error);
  }
});
