const express = require('express');
const bodyParser = require('body-parser');
const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Editor = require('@reactive-video/builder');
const { pathToFileURL } = require('url');
const { Configuration, OpenAIApi } = require("openai");
const { edit, readVideoMetadata } = Editor();
const app = express();
app.use(bodyParser.json());


const PORT = process.env.PORT || 3000;

// Initialize OpenAI configuration
const configuration = new Configuration({
  
});
const openai = new OpenAIApi(configuration);

function extractReactCode(text) {
    const startToken = "```jsx";
    const endToken = "```";

    const startIndex = text.indexOf(startToken);
    const endIndex = text.indexOf(endToken, startIndex + startToken.length);

    // If both markers are found
    if (startIndex !== -1 && endIndex !== -1) {
        return text.substring(startIndex + startToken.length, endIndex).trim();
    }
    return null;
}

app.post('/createReactiveVideo', async (req, res) => {
    try {
 const userPrompt = req.body.prompt;  // Extract prompt from request body

        if (!userPrompt) {
            return res.status(400).send("Error: prompt is required in the request body.");
        }
const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          "role": "system",
          "content": "You are a video designer. You design videos for businesses using React and the 'reactive-video' library.Do not Add image and video urls if you have not been given.Your task is to provide React code for a video design based on the following template:\n" +
          "import React from 'react';\n" +
          "import { Image, Segment, Video, useVideo } from 'reactive-video';\n\n" +
          "export default () => {\n" +
          "  const { currentFrame, currentTime, durationFrames, durationTime } = useVideo();\n\n" +
          "  return (\n" +
          "    <>\n" +
          "      <Segment duration={30}><div style={{/* Design what you think is best */}}></div></Segment>\n" +
          "      <Segment start={30} duration={30}><div style={{/* Design what you think is best */}}></div></Segment>\n" +
          "      <Segment start={60}><Segment start={-100}><div style={{/* Design what you think is best */}}></div></Segment></Segment>\n" +
          "    </>\n" +
          "  );\n" +
          "};"
        },
        {
          "role": "user",
          "content": userPrompt
        }
      ]
    });


   const newContent = response.data.choices[0].message.content;
  const cleancode = extractReactCode(newContent);
console.log(cleancode)
    fs.writeFileSync('MyVideo.js', newContent);
    console.log("MyVideo.js content updated successfully!");
        const outputVideoName = `${uuidv4()}.mov`;
        const pathtovideo = `./${outputVideoName}`;

        const editor = Editor({
            ffmpegPath: 'ffmpeg',
            ffprobePath: 'ffprobe',
            devMode: true,
        });

        const width = 1280;
        const height = 720;
        const fps = 25;
        const durationFrames = 90;
console.log("Starting video creation...");
        await edit({
            reactVideo: 'MyVideo.js',
            outPath: pathtovideo,
output: outputVideoName,
            width,
            height,
            fps,
            durationFrames,
            userData: { videoUri: "ssss" }
        });

console.log("Starting video finished");

const fileExists = fs.existsSync(`./${outputVideoName}`);
console.log(`File ${outputVideoName} exists: ${fileExists}`);

        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(outputVideoName);
        const videoBuffer = fs.readFileSync(`./${outputVideoName}`);
        await blockBlobClient.upload(videoBuffer, videoBuffer.length);

        fs.unlinkSync(`./${outputVideoName}`);

        res.json({ link: blockBlobClient.url });
    } catch (error) {
        res.status(500).send(`Error creating video: ${error.message}`);
    }
});

app.get('/createVideo', async (req, res) => {
    try {
        const editly = (await import('editly')).default;
        const videoName = `${uuidv4()}.mp4`;

        const editSpec = {
            outPath: `./${videoName}`,
            width: 640,
            height: 360,
            fps: 25,
            clips: [{
                layers: [
                    { type: 'title', text: 'Hello from Editly!' }
                ]
            }]
        };

        await editly(editSpec);

        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(videoName);
        const videoBuffer = fs.readFileSync(`./${videoName}`);
        await blockBlobClient.upload(videoBuffer, videoBuffer.length);

        fs.unlinkSync(`./${videoName}`);

        res.json({ link: blockBlobClient.url });
    } catch (error) {
        res.status(500).send(`Error creating video: ${error.message}`);
    }
});

app.get('/connect', (req, res) => {
    res.send('Hi');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
