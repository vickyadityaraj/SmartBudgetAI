const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer for file uploads in Task 4 (RAG)
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep the original extension
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only .pdf and .txt files are allowed'));
    }
  }
});

// Helper to spawn Python script and parse output
function runPythonScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const pythonPath = 'python';
    const scriptPath = path.join(__dirname, '..', 'ai_service', scriptName);
    
    console.log(`Spawning Python process: ${pythonPath} ${scriptPath} ${args.join(' ')}`);
    
    const child = spawn(pythonPath, [scriptPath, ...args]);
    
    let stdoutData = '';
    let stderrData = '';
    
    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });
    
    child.on('close', (code) => {
      console.log(`Python process closed with code ${code}`);
      
      const trimmedStdout = stdoutData.trim();
      
      if (code !== 0) {
        console.error(`Python script stderr: ${stderrData}`);
        console.error(`Python script stdout (on failure): ${trimmedStdout}`);
        try {
          // If the script outputs JSON error details
          const parsedErr = JSON.parse(trimmedStdout);
          return resolve(parsedErr);
        } catch (e) {
          return reject(new Error(stderrData || `Python script exited with code ${code}`));
        }
      }
      
      try {
        const parsed = JSON.parse(trimmedStdout);
        resolve(parsed);
      } catch (err) {
        console.error("Failed to parse Python script stdout:", trimmedStdout);
        reject(new Error("Failed to parse response from AI service: " + err.message));
      }
    });
  });
}

// Helper to check if API key is configured
router.get('/config-check', (req, res) => {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  res.json({
    groqConfigured: !!groqKey && groqKey !== '' && groqKey !== 'YOUR_GROQ_API_KEY_HERE',
    geminiConfigured: !!geminiKey && geminiKey !== '',
    openaiConfigured: !!openaiKey && openaiKey !== ''
  });
});

// Advisor Chat (Task 1: LLM Workflow)
router.post('/advisor-chat', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body' });
  }
  
  try {
    const result = await runPythonScript('advisor_chat.py', [prompt]);
    res.json(result);
  } catch (error) {
    console.error('Error running Advisor Chat:', error);
    res.status(500).json({ error: 'Failed to run AI Advisor Chat', details: error.message });
  }
});

// Insights Chain (Task 2: Prompt Chaining)
router.post('/insights-chain', async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Missing topic in request body' });
  }
  
  try {
    const result = await runPythonScript('insights_chain.py', [topic]);
    res.json(result);
  } catch (error) {
    console.error('Error running Insights Chain:', error);
    res.status(500).json({ error: 'Failed to run Insights Chaining', details: error.message });
  }
});

// Budget Agent (Task 3: Agentic AI)
router.post('/budget-agent', async (req, res) => {
  const { task } = req.body;
  if (!task) {
    return res.status(400).json({ error: 'Missing task description' });
  }
  
  try {
    const result = await runPythonScript('budget_agent.py', [task]);
    res.json(result);
  } catch (error) {
    console.error('Error running Budget Agent:', error);
    res.status(500).json({ error: 'Failed to run AI Budget Agent', details: error.message });
  }
});

// Document Analyzer (Task 4: RAG Q&A)
router.post('/doc-analyzer', upload.single('document'), async (req, res) => {
  const { query } = req.body;
  const file = req.file;
  
  if (!query) {
    return res.status(400).json({ error: 'Missing query in request body' });
  }
  
  if (!file) {
    return res.status(400).json({ error: 'Missing document file. Please upload a PDF or TXT file.' });
  }
  
  try {
    const result = await runPythonScript('doc_analyzer.py', [file.path, query]);
    
    // Clean up file after execution to keep disk clean
    fs.unlink(file.path, (err) => {
      if (err) console.error('Error cleaning up uploaded file:', file.path, err);
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error running Doc Analyzer:', error);
    
    // Attempt to clean up file if it exists
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    res.status(500).json({ error: 'Failed to run Document Analyzer', details: error.message });
  }
});

// =============================================================================
// CODING ASSIGNMENT 2: APPLIED AGENTIC AI ENDPOINTS
// =============================================================================

// 1. DocuSense Financial Reader (Assignment 2 - Task 1: Document RAG Agent)
router.post('/v2/document-intelligence', upload.single('document'), async (req, res) => {
  const { query, sampleDocName } = req.body;
  const file = req.file;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter in request' });
  }

  let targetPath = null;
  let isTempFile = false;

  if (file) {
    targetPath = file.path;
    isTempFile = true;
  } else if (sampleDocName) {
    // Check if user requested a preloaded sample document in the workspace
    const workspaceRoot = path.join(__dirname, '..', '..');
    const possibleSamplePath = path.join(workspaceRoot, sampleDocName);
    if (fs.existsSync(possibleSamplePath)) {
      targetPath = possibleSamplePath;
      isTempFile = false;
    } else {
      return res.status(404).json({ error: `Sample document '${sampleDocName}' not found in workspace.` });
    }
  } else {
    // Default fallback to SBI_Bank_Statement_Long.pdf if present
    const defaultSample = path.join(__dirname, '..', '..', 'SBI_Bank_Statement_Long.pdf');
    if (fs.existsSync(defaultSample)) {
      targetPath = defaultSample;
      isTempFile = false;
    } else {
      return res.status(400).json({ error: 'Please upload a document file (.pdf, .txt, .csv, .docx) or select a sample document.' });
    }
  }

  try {
    const result = await runPythonScript('document_intelligence.py', [targetPath, query]);
    
    if (isTempFile && fs.existsSync(targetPath)) {
      fs.unlink(targetPath, (err) => {
        if (err) console.error('Error cleaning up temp file:', targetPath, err);
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in Document Intelligence API:', error);
    if (isTempFile && targetPath && fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    res.status(500).json({ error: 'Failed to process document intelligence request', details: error.message });
  }
});

// 2. MarketPulse Deep Research Engine (Assignment 2 - Task 2: Search & Synthesis Agent)
router.post('/v2/market-research', async (req, res) => {
  const { topic, depth = 'comprehensive', focusAreas = 'Macroeconomic Drivers, Valuation, SWOT, Risk Factors' } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Missing topic in request body' });
  }

  try {
    const result = await runPythonScript('market_research.py', [topic, depth, focusAreas]);
    res.json(result);
  } catch (error) {
    console.error('Error in MarketPulse Research API:', error);
    res.status(500).json({ error: 'Failed to execute Market Research Agent', details: error.message });
  }
});

// 3. Sentinel Fraud & Threat Auditor (Assignment 2 - Task 3: Security Log Agent)
router.post('/v2/security-audit', async (req, res) => {
  const { logs } = req.body;
  if (!logs) {
    return res.status(400).json({ error: 'Missing security logs or alert payload in request body' });
  }

  try {
    const result = await runPythonScript('security_auditor.py', [logs]);
    res.json(result);
  } catch (error) {
    console.error('Error in Sentinel Security Audit API:', error);
    res.status(500).json({ error: 'Failed to execute Security Threat Auditor Agent', details: error.message });
  }
});

// 4. AlphaStrategist Multi-Agent Swarm (Assignment 2 - Task 4: Collaborative Agent Swarm)
router.post('/v2/multi-agent-swarm', async (req, res) => {
  const { task, userProfile = 'Monthly Income: ₹1,50,000; Monthly Expenses: ₹55,000; Savings: ₹4,00,000; Risk Profile: Balanced Growth' } = req.body;
  if (!task) {
    return res.status(400).json({ error: 'Missing task / financial goal description' });
  }

  try {
    const result = await runPythonScript('multi_agent_swarm.py', [task, userProfile]);
    res.json(result);
  } catch (error) {
    console.error('Error in AlphaStrategist Swarm API:', error);
    res.status(500).json({ error: 'Failed to execute Multi-Agent Swarm', details: error.message });
  }
});

module.exports = router;
