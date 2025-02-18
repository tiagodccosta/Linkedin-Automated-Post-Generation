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
        content: "Give me one topic for a Professional and with a learning for my community Linkedin post. Im the CEO of a Healthtech startup called BloodFlow that its main goal is to use AI for automating blood test analysis and workflow with Artificial Inteligence."
      },
    ],
    max_tokens: 50,
  });

  const topic = topicOfPost.choices[0].message.content;
  console.log(topic);

  const postContentResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Write an engaging, professional and food for tought LinkedIn post about: ${topic}
                  

                  Be straight to the point to be too long.
                  `,
      },
    ],
    max_tokens: 500,
  });
  const content = postContentResponse.choices[0].message.content;
  console.log(content);

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
  

  const safePostContent = postContent.replace(/[\r\n]/g, '<br>');
  const postContentMarked = marked(safePostContent);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 10px;
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
        <div>
          ${postContentMarked}
        </div>
        <img src="${imageUrl}" alt="LinkedIn Post Image" />
      </body>
    </html>
  `;

  // Load the HTML content
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

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

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // WARNING: Only use this in development
  event.preventDefault();
  callback(true);
});

app.whenReady().then(() => {
  const { session } = require('electron');
  
  // Only in development!
  if (process.env.NODE_ENV === 'development') {
    session.defaultSession.setCertificateVerifyProc((request, callback) => {
      callback(0); // 0 means success
    });
  }
  
  main();
});
