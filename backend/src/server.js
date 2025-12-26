require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.post('/api/ocr', upload.single('file'), async (req, res) => {
  try {
    const { provider, modelName } = req.body;
    const fileBuffer = req.file.buffer;
    const base64Data = fileBuffer.toString('base64');

    let extractedText = '';

    if (provider === 'Anthropic') {
      const message = await anthropic.messages.create({
        model: modelName || 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data
              }
            },
            {
              type: 'text',
              text: 'กรุณาสกัดข้อความทั้งหมดจากเอกสาร PDF นี้'
            }
          ]
        }]
      });

      extractedText = message.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

    } else if (provider === 'OpenAI') {
      const pdfData = await pdfParse(fileBuffer);
      extractedText = pdfData.text;
    }

    res.json({
      success: true,
      text: extractedText,
      length: extractedText.length
    });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { provider, modelName, messages, knowledgeContext, systemPrompt } = req.body;
    let aiResponse = '';

    if (provider === 'Anthropic') {
      const userMessage = messages[messages.length - 1].content;
      
      const message = await anthropic.messages.create({
        model: modelName || 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Knowledge Base:\n${knowledgeContext}\n\nQuestion: ${userMessage}\n\n${systemPrompt}`
        }]
      });

      aiResponse = message.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

    } else if (provider === 'OpenAI') {
      const userMessage = messages[messages.length - 1].content;

      const completion = await openai.chat.completions.create({
        model: modelName || 'gpt-4o',
        messages: [
          { role: 'system', content: `Knowledge: ${knowledgeContext}\n${systemPrompt}` },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 2000
      });

      aiResponse = completion.choices[0].message.content;
    }

    res.json({ success: true, response: aiResponse });

  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

module.exports = app;