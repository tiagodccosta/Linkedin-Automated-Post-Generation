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
        content: `
                  You are a thought leader and CEO of BloodFlow, a HealthTech startup that uses AI to automate blood test analysis and clinical workflows.  

                  Suggest a compelling and insightful topic for a LinkedIn post that:  
                  - Highlights the real-world impact of AI in healthcare.  
                  - Discusses efficiency improvements in workflows (e.g., AI reducing workload by 40%).  
                  - Explores AI integration into LIMS, EHRs, or clinical automation.
                  - Explaing the integration of AI and automation for genetic testing and clinical trials in pharmaceutical settings.
                  - Covers advancements like using LLMs to automate blood test and genetic test translations.  
                  - Is relevant and thought-provoking for healthcare professionals, lab managers, and AI enthusiasts.  

                  Return only the topic title, without extra explanations.
              `
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
        content: `
                  "Write a concise, impactful, and engaging LinkedIn post about: '${topic}'.

                  - Start with an attention-grabbing statement or question.
                  - Highlight a key insight or real-world example showing how this topic is affecting healthcare today (e.g., AI integration in LIMS/EHRs, improving lab workflow efficiency, benefits in clinical trials).
                  - Focus on the tangible benefits of AI in healthcare (e.g., saving time, reducing costs, improving patient outcomes, eliminating manual & adminstrative work, benefits as well for clinical trials).
                  - Use a professional and inspiring tone that feels authoritative yet accessible.
                  - Keep it under 150 words.
                  - End with a thought-provoking question or call-to-action that encourages conversation about the future impact of AI in healthcare."
                  `,
      },
    ],
    max_tokens: 500,
  });
  const content = postContentResponse.choices[0].message.content;
  console.log(content);

  const imagePostResponse = await openai.images.generate({
    model: "dall-e-3",
    prompt: `Create a professional, LinkedIn-style illustration representing the following topic: "${topic}".  
              - The design should be modern and with high level.
              - Should be suitable for a LinkedIn business post on more of a marketing setting.  
              - No text in the image.  
            `,
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
