import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  FileText, 
  Search, 
  ShieldAlert, 
  Users, 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  ArrowRight, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  Server, 
  ExternalLink,
  Layers,
  Activity,
  Cpu,
  RefreshCw,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { agenticAiApi } from '@/services/api';
import { toast } from 'sonner';

export const AgenticIntelligence: React.FC = () => {
  // System config state
  const [config, setConfig] = useState({
    groqConfigured: true,
    geminiConfigured: false,
    openaiConfigured: false
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Module 1: DocuSense Financial Reader (Document RAG Agent)
  // ---------------------------------------------------------------------------
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selectedSampleDoc, setSelectedSampleDoc] = useState('SBI_Bank_Statement_Long.pdf');
  const [docQuery, setDocQuery] = useState('Extract account holder name, statement period, total debits, total credits, and closing balance.');
  const [docLoading, setDocLoading] = useState(false);
  const [docResult, setDocResult] = useState<any>(null);

  // ---------------------------------------------------------------------------
  // Module 2: MarketPulse Deep Research Engine (Search & Synthesis Agent)
  // ---------------------------------------------------------------------------
  const [researchTopic, setResearchTopic] = useState('Impact of RBI Repo Rate changes on Fixed Deposits vs Equity Mutual Funds in India');
  const [researchDepth, setResearchDepth] = useState('comprehensive');
  const [researchFocus, setResearchFocus] = useState('Macro Drivers, Comparative Yields, SWOT Matrix, Asset Allocation');
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchResult, setResearchResult] = useState<any>(null);

  // ---------------------------------------------------------------------------
  // Module 3: Sentinel Fraud & Threat Auditor (Security Log Agent)
  // ---------------------------------------------------------------------------
  const sampleLogScenarios: Record<string, string> = {
    velocity_fraud: `2025-08-01 02:14:03 AUTH_FAIL user=admin ip=194.26.29.102 mfa_bypass_attempt=true geo=Lagos_NG
2025-08-01 02:14:05 AUTH_FAIL user=admin ip=194.26.29.102 geo=Lagos_NG
2025-08-01 02:14:09 AUTH_SUCCESS user=admin ip=194.26.29.102 role_escalation=super_admin session_token_hijack_flag=true
2025-08-01 02:14:15 BENEFICIARY_ADD name=OffshoreHoldings account=ACC_OFFSHORE_992 ip=194.26.29.102
2025-08-01 02:14:22 TRANSFER_INIT amount=499999 currency=INR from=ACC_84920 to=ACC_OFFSHORE_992 velocity_threshold_exceeded=true
2025-08-01 02:14:30 TRANSFER_INIT amount=499999 currency=INR from=ACC_84920 to=ACC_OFFSHORE_992 velocity_threshold_exceeded=true`,
    geo_impossible: `2025-08-01 10:15:00 LOGIN_SUCCESS user=rajesh.sharma ip=103.21.124.5 geo=Mumbai_IN device=MacBookPro
2025-08-01 10:22:14 LOGIN_SUCCESS user=rajesh.sharma ip=185.220.101.44 geo=Frankfurt_DE device=TorExitNode
2025-08-01 10:23:00 PASSWORD_RESET_REQUEST user=rajesh.sharma method=SMS_BYPASS_ATTEMPT
2025-08-01 10:24:10 CARD_LIMIT_INCREASE user=rajesh.sharma old_limit=100000 new_limit=1000000 status=APPROVED_ANOMALOUS`,
    privilege_tampering: `2025-08-01 14:00:12 DB_QUERY executed_by=app_readonly query="ALTER USER teller_04 WITH SUPERUSER;"
2025-08-01 14:01:05 API_KEY_GENERATE user=teller_04 scope=admin:all_vaults
2025-08-01 14:02:40 EXPORT_RECORDS collection=user_kyc_pan_cards count=25000 status=STREAMING_EXTERNAL_IP`,
    clean_baseline: `2025-08-01 09:00:00 PAYROLL_EXECUTION batch=JULY_SALARY_01 count=140 total=7450000 status=COMPLETED_SUCCESS
2025-08-01 09:05:12 TAX_DEDUCTION_TDS amount=850000 govt_portal_ack=ACK_ITD_89384729 status=RECONCILED
2025-08-01 09:10:00 VENDOR_SETTLEMENT ref=INV_AWS_CLOUD amount=142300 status=CLEARED_NORMAL`
  };

  const [selectedScenario, setSelectedScenario] = useState('velocity_fraud');
  const [securityLogs, setSecurityLogs] = useState(sampleLogScenarios['velocity_fraud']);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityResult, setSecurityResult] = useState<any>(null);

  // ---------------------------------------------------------------------------
  // Module 4: AlphaStrategist Multi-Agent Swarm (Collaborative Swarm System)
  // ---------------------------------------------------------------------------
  const [swarmGoal, setSwarmGoal] = useState('Build an aggressive equity compounding strategy to accumulate ₹50 Lakhs for a home down payment in 5 years');
  const [userProfileText, setUserProfileText] = useState('Monthly Income: ₹2,00,000; Monthly Savings: ₹80,000; Existing Emergency Reserve: ₹5,00,000 in liquid funds; Risk Appetite: Moderate-Aggressive (willing to handle 20% equity drawdown)');
  const [swarmLoading, setSwarmLoading] = useState(false);
  const [swarmResult, setSwarmResult] = useState<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingConfig(true);
      try {
        const res = await agenticAiApi.configCheck();
        if (res.data) setConfig(res.data);
      } catch (e) {
        // Fallback
        setConfig({ groqConfigured: true, geminiConfigured: false, openaiConfigured: false });
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // 1. DocuSense Handler
  const handleRunDocuSense = async () => {
    if (!docQuery.trim()) {
      toast.error('Please enter a query for document intelligence.');
      return;
    }
    setDocLoading(true);
    setDocResult(null);
    try {
      const formData = new FormData();
      formData.append('query', docQuery);
      if (docFile) {
        formData.append('document', docFile);
      } else if (selectedSampleDoc) {
        formData.append('sampleDocName', selectedSampleDoc);
      }
      const res = await agenticAiApi.runDocuSense(formData);
      setDocResult(res.data);
      toast.success('DocuSense extraction complete!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to process document query.');
    } finally {
      setDocLoading(false);
    }
  };

  // 2. MarketPulse Research Handler
  const handleRunMarketResearch = async () => {
    if (!researchTopic.trim()) {
      toast.error('Please enter a market research topic.');
      return;
    }
    setResearchLoading(true);
    setResearchResult(null);
    try {
      const res = await agenticAiApi.runMarketResearch({
        topic: researchTopic,
        depth: researchDepth,
        focusAreas: researchFocus
      });
      setResearchResult(res.data);
      toast.success('Market research dossier generated!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to execute Market Research Agent.');
    } finally {
      setResearchLoading(false);
    }
  };

  // 3. Sentinel Security Audit Handler
  const handleRunSecurityAudit = async () => {
    if (!securityLogs.trim()) {
      toast.error('Please enter security or transaction logs to audit.');
      return;
    }
    setSecurityLoading(true);
    setSecurityResult(null);
    try {
      const res = await agenticAiApi.runSecurityAudit({ logs: securityLogs });
      setSecurityResult(res.data);
      toast.success('Sentinel Threat Audit complete!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to execute Security Auditor Agent.');
    } finally {
      setSecurityLoading(false);
    }
  };

  // 4. AlphaStrategist Swarm Handler
  const handleRunSwarm = async () => {
    if (!swarmGoal.trim()) {
      toast.error('Please provide a financial planning objective.');
      return;
    }
    setSwarmLoading(true);
    setSwarmResult(null);
    try {
      const res = await agenticAiApi.runMultiAgentSwarm({
        task: swarmGoal,
        userProfile: userProfileText
      });
      setSwarmResult(res.data);
      toast.success('AlphaStrategist Swarm consensus reached!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to run Multi-Agent Swarm.');
    } finally {
      setSwarmLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card border rounded-xl p-6 shadow-sm gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">Assignment 2</Badge>
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Bot size={13} className="text-primary" /> Autonomous Agentic Financial Intelligence
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 font-sans">Assignment 2</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            Autonomous agentic workflows: Semantic Document RAG, Deep Market Research, Security & Fraud Auditing, and Multi-Agent Collaborative Orchestration.
          </p>
        </div>

        {/* System Integration Status Panel */}
        <div className="flex flex-col gap-2 bg-muted/40 p-3.5 rounded-lg border text-xs min-w-[240px]">
          <div className="font-semibold flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5"><Server size={14} /> Agentic AI Engine</span>
            <span className="text-[10px] text-emerald-500 font-mono">v2.0 Active</span>
          </div>
          <div className="space-y-1.5 mt-1">
            <div className="flex justify-between items-center">
              <span>Groq LLM Pipeline:</span>
              {config.groqConfigured ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px]">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5 text-[10px]">Unconfigured</Badge>
              )}
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Autonomous Agents:</span>
              <span className="font-mono text-[11px] text-primary">4 Modules Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="docu-sense" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1.5 bg-muted/70 border rounded-lg gap-1">
          <TabsTrigger value="docu-sense" className="py-2.5 flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText size={16} className="text-blue-500" />
            <div className="text-left">
              <div className="font-medium text-xs sm:text-sm">DocuSense Reader</div>
              <div className="text-[10px] text-muted-foreground hidden sm:block">Document RAG Agent</div>
            </div>
          </TabsTrigger>

          <TabsTrigger value="market-pulse" className="py-2.5 flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Search size={16} className="text-emerald-500" />
            <div className="text-left">
              <div className="font-medium text-xs sm:text-sm">MarketPulse Research</div>
              <div className="text-[10px] text-muted-foreground hidden sm:block">Search & Report Agent</div>
            </div>
          </TabsTrigger>

          <TabsTrigger value="sentinel-audit" className="py-2.5 flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ShieldAlert size={16} className="text-rose-500" />
            <div className="text-left">
              <div className="font-medium text-xs sm:text-sm">Sentinel Auditor</div>
              <div className="text-[10px] text-muted-foreground hidden sm:block">Security & Fraud Threat Agent</div>
            </div>
          </TabsTrigger>

          <TabsTrigger value="alpha-swarm" className="py-2.5 flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users size={16} className="text-purple-500" />
            <div className="text-left">
              <div className="font-medium text-xs sm:text-sm">AlphaStrategist Swarm</div>
              <div className="text-[10px] text-muted-foreground hidden sm:block">Collaborative Multi-Agent</div>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* =================================================================== */}
        {/* MODULE 1: DocuSense Financial Reader (Document RAG Agent)            */}
        {/* =================================================================== */}
        <TabsContent value="docu-sense" className="mt-4 space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="text-blue-500" size={20} /> DocuSense Financial Reader
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Autonomous document comprehension agent with semantic chunking, BM25 retrieval, and verified citation grounding.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-500 bg-blue-500/5">RAG Agent</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload or Sample Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Select Preloaded Workspace Document:</label>
                  <Select value={selectedSampleDoc} onValueChange={(val) => { setSelectedSampleDoc(val); setDocFile(null); }}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Choose a document" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SBI_Bank_Statement_Long.pdf">📄 SBI_Bank_Statement_Long.pdf (49 Pages, Official Bank Statement)</SelectItem>
                      <SelectItem value="sbi_mock_statement_testing.csv">📊 sbi_mock_statement_testing.csv (Ledger CSV)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Or Upload Your Own Document (.pdf, .txt, .csv, .docx):</label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      accept=".pdf,.txt,.csv,.docx,.md" 
                      className="text-xs cursor-pointer" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setDocFile(e.target.files[0]);
                          setSelectedSampleDoc('');
                        }
                      }} 
                    />
                    {docFile && (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setDocFile(null)}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preset Query Prompts */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground font-medium">Quick Financial Queries:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Extract account holder, statement period, total debits, total credits & closing balance.",
                    "List all UPI debits greater than ₹2,000 and calculate the average spend.",
                    "What are the security terms, fraud disclaimer rules, and customer liability windows?",
                    "Summarize recurring utility & merchant debit patterns."
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDocQuery(preset)}
                      className="text-[11px] bg-muted hover:bg-primary/10 hover:text-primary px-2.5 py-1 rounded-md border text-left transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Query Textarea */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">User Query for the Agent:</label>
                <Textarea 
                  value={docQuery} 
                  onChange={(e) => setDocQuery(e.target.value)} 
                  placeholder="Enter any question regarding the uploaded financial document..."
                  className="text-sm min-h-[75px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  onClick={handleRunDocuSense} 
                  disabled={docLoading}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {docLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                  {docLoading ? 'Analyzing Document Context...' : 'Run DocuSense Agent'}
                </Button>
              </div>

              {/* Results */}
              {docResult && (
                <div className="mt-4 space-y-4 border rounded-lg p-5 bg-card animate-fade-in">
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <FileCheck className="text-emerald-500" size={18} />
                      <span className="font-semibold text-sm">{docResult.document_name}</span>
                      <Badge variant="outline" className="text-xs font-mono">{docResult.document_pages} Pages</Badge>
                      <Badge variant="outline" className="text-xs font-mono">{docResult.total_chunks_indexed} Chunks Indexed</Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs gap-1.5"
                      onClick={() => copyToClipboard(docResult.answer, 'doc_answer')}
                    >
                      {copiedId === 'doc_answer' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      {copiedId === 'doc_answer' ? 'Copied' : 'Copy Answer'}
                    </Button>
                  </div>

                  {/* Grounded Answer Markdown */}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line bg-muted/20 p-4 rounded-lg border">
                    {docResult.answer}
                  </div>

                  {/* Evidence Citations */}
                  {docResult.citations && docResult.citations.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500" /> Verified Evidence Citations
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {docResult.citations.map((cite: any, i: number) => (
                          <div key={i} className="p-3 bg-muted/40 rounded-md border text-xs space-y-1">
                            <div className="flex justify-between items-center font-medium">
                              <span className="text-primary font-mono">{cite.source_id} (Page {cite.page})</span>
                              <Badge variant="secondary" className="text-[10px]">Score: {cite.relevance_score}</Badge>
                            </div>
                            <p className="text-muted-foreground text-[11px] line-clamp-3 font-mono">{cite.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================================================== */}
        {/* MODULE 2: MarketPulse Deep Research Engine (Search & Synthesis Agent)*/}
        {/* =================================================================== */}
        <TabsContent value="market-pulse" className="mt-4 space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="text-emerald-500" size={20} /> MarketPulse Deep Research Engine
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Autonomous web search & financial intelligence agent that synthesizes structured reports with verifiable citations and SWOT metrics.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5">Research Agent</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground font-medium">Select Research Dossier Topic:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Impact of RBI Repo Rate changes on Fixed Deposits vs Equity Mutual Funds in India",
                    "India Union Budget 2024 New Tax Slabs vs Old Regime for Tech Professionals",
                    "Artificial Intelligence Semiconductor Capex & Enterprise Software Valuation 2025-2030",
                    "Sovereign Gold Bonds vs Gold ETFs vs Physical Gold in High Inflation Regimes"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setResearchTopic(preset)}
                      className="text-[11px] bg-muted hover:bg-emerald-500/10 hover:text-emerald-600 px-2.5 py-1 rounded-md border text-left transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Research Topic / Sector / Asset:</label>
                  <Input 
                    value={researchTopic} 
                    onChange={(e) => setResearchTopic(e.target.value)} 
                    placeholder="Enter market topic, company, asset class, or policy..." 
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Synthesis Depth:</label>
                  <Select value={researchDepth} onValueChange={setResearchDepth}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select depth" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprehensive">Comprehensive Institutional Dossier</SelectItem>
                      <SelectItem value="executive_brief">Executive Briefing (Action Focused)</SelectItem>
                      <SelectItem value="quantitative">Quantitative Risk & Valuation Focus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  onClick={handleRunMarketResearch} 
                  disabled={researchLoading}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {researchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {researchLoading ? 'Conducting Deep Research & Fact Synthesis...' : 'Generate Research Dossier'}
                </Button>
              </div>

              {/* Research Dossier Output */}
              {researchResult && (
                <div className="mt-4 space-y-4 border rounded-lg p-5 bg-card animate-fade-in">
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-emerald-500" size={18} />
                      <span className="font-semibold text-sm">Institutional Research Dossier</span>
                      <Badge variant="outline" className="text-xs font-mono">{researchResult.search_sources_queried} Sources Cross-Examined</Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs gap-1.5"
                      onClick={() => copyToClipboard(researchResult.report_markdown, 'research_report')}
                    >
                      {copiedId === 'research_report' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      {copiedId === 'research_report' ? 'Copied' : 'Copy Full Dossier'}
                    </Button>
                  </div>

                  {/* Markdown Report */}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line bg-muted/20 p-5 rounded-lg border">
                    {researchResult.report_markdown}
                  </div>

                  {/* Reference Sources Badges */}
                  {researchResult.references && (
                    <div className="space-y-2 pt-2 border-t">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ExternalLink size={13} className="text-emerald-500" /> Primary Bibliographic References
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        {researchResult.references.map((ref: any) => (
                          <div key={ref.id} className="p-3 bg-muted/40 rounded-md border text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-emerald-600 font-mono">Ref [{ref.id}]</span>
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">{ref.status}</Badge>
                            </div>
                            <div className="font-medium line-clamp-1">{ref.title}</div>
                            <div className="text-muted-foreground text-[10px]">{ref.publisher} • {ref.type}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================================================== */}
        {/* MODULE 3: Sentinel Fraud & Threat Auditor (Security Log Agent)      */}
        {/* =================================================================== */}
        <TabsContent value="sentinel-audit" className="mt-4 space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldAlert className="text-rose-500" size={20} /> Sentinel Fraud & Threat Auditor
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Autonomous cyber and financial fraud audit agent that scans logs, identifies threat vectors, classifies severity, and generates mitigation playbooks.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-rose-500/30 text-rose-500 bg-rose-500/5">Security Agent</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scenario selector */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground font-medium">Load Security Incident Scenario:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'velocity_fraud', label: '🚨 Velocity Drain & High-Frequency Transfers', color: 'text-rose-600 border-rose-500/20' },
                    { id: 'geo_impossible', label: '🌐 Impossible Travel & MFA Bypass Flood', color: 'text-amber-600 border-amber-500/20' },
                    { id: 'privilege_tampering', label: '⚡ DB Privilege Escalation & KYC Exfiltration', color: 'text-purple-600 border-purple-500/20' },
                    { id: 'clean_baseline', label: '✅ Normal Corporate Payroll & Reconciled TDS', color: 'text-emerald-600 border-emerald-500/20' }
                  ].map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => {
                        setSelectedScenario(sc.id);
                        setSecurityLogs(sampleLogScenarios[sc.id]);
                      }}
                      className={`text-[11px] px-3 py-1.5 rounded-md border font-medium transition-all ${
                        selectedScenario === sc.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Raw Financial / Authentication / API Security Logs:</label>
                <Textarea 
                  value={securityLogs} 
                  onChange={(e) => setSecurityLogs(e.target.value)} 
                  placeholder="Paste timestamped security log stream or fraud alerts..."
                  className="font-mono text-xs min-h-[140px] bg-slate-950 text-slate-100 border-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  onClick={handleRunSecurityAudit} 
                  disabled={securityLoading}
                  className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {securityLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                  {securityLoading ? 'Auditing Threat Patterns & Severity...' : 'Run Sentinel Threat Audit'}
                </Button>
              </div>

              {/* Audit Report */}
              {securityResult && (
                <div className="mt-4 space-y-4 border rounded-lg p-5 bg-card animate-fade-in">
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Threat Audit Findings</span>
                      <Badge className={
                        securityResult.severity_level === 'CRITICAL' ? 'bg-rose-500 text-white' :
                        securityResult.severity_level === 'HIGH' ? 'bg-amber-500 text-white' :
                        'bg-emerald-500 text-white'
                      }>
                        Severity: {securityResult.severity_level}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono">{securityResult.remediation_status}</Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs gap-1.5"
                      onClick={() => copyToClipboard(securityResult.audit_report_markdown, 'security_report')}
                    >
                      {copiedId === 'security_report' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      {copiedId === 'security_report' ? 'Copied' : 'Copy Audit Report'}
                    </Button>
                  </div>

                  {/* Markdown Audit */}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line bg-muted/20 p-5 rounded-lg border">
                    {securityResult.audit_report_markdown}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================================================== */}
        {/* MODULE 4: AlphaStrategist Multi-Agent Swarm (Collaborative System)  */}
        {/* =================================================================== */}
        <TabsContent value="alpha-swarm" className="mt-4 space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="text-purple-500" size={20} /> AlphaStrategist Multi-Agent Swarm
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    3 specialized autonomous agents collaborating sequentially (Research $\rightarrow$ Quantitative Risk $\rightarrow$ Executive Strategy) to generate masterplans.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-purple-500/30 text-purple-500 bg-purple-500/5">Collaborative Swarm</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Architecture Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-muted/30 border rounded-lg">
                <div className="flex items-center gap-3 p-2.5 bg-card border rounded-md shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">1</div>
                  <div>
                    <div className="font-semibold text-xs text-blue-600">Market Intelligence Agent</div>
                    <div className="text-[10px] text-muted-foreground">Scans macroeconomic data & yields</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 bg-card border rounded-md shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">2</div>
                  <div>
                    <div className="font-semibold text-xs text-amber-600">Quantitative Risk Analyst</div>
                    <div className="text-[10px] text-muted-foreground">Models drawdowns & stress tests</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 bg-card border rounded-md shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs">3</div>
                  <div>
                    <div className="font-semibold text-xs text-purple-600">Executive Strategy Synthesizer</div>
                    <div className="text-[10px] text-muted-foreground">Consolidates phased masterplan</div>
                  </div>
                </div>
              </div>

              {/* Goal & Profile Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Financial Goal & Milestone Target:</label>
                  <Textarea 
                    value={swarmGoal} 
                    onChange={(e) => setSwarmGoal(e.target.value)} 
                    placeholder="Describe your financial goal..." 
                    className="text-xs min-h-[90px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">User Financial Profile & Constraints:</label>
                  <Textarea 
                    value={userProfileText} 
                    onChange={(e) => setUserProfileText(e.target.value)} 
                    placeholder="Enter monthly income, savings rate, emergency reserve, risk profile..." 
                    className="text-xs min-h-[90px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  onClick={handleRunSwarm} 
                  disabled={swarmLoading}
                  className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {swarmLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {swarmLoading ? 'Orchestrating 3-Agent Collaborative Pipeline...' : 'Deploy Multi-Agent Swarm'}
                </Button>
              </div>

              {/* Swarm Result */}
              {swarmResult && (
                <div className="mt-4 space-y-5 border rounded-lg p-5 bg-card animate-fade-in">
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="text-purple-500" size={18} />
                      <span className="font-semibold text-sm">AlphaStrategist Swarm Execution Consensus</span>
                      <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">3 Agents Handover Complete</Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs gap-1.5"
                      onClick={() => copyToClipboard(swarmResult.final_consensus_report, 'swarm_masterplan')}
                    >
                      {copiedId === 'swarm_masterplan' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      {copiedId === 'swarm_masterplan' ? 'Copied' : 'Copy Masterplan'}
                    </Button>
                  </div>

                  {/* Swarm Collaboration Timeline */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity size={13} className="text-purple-500" /> Inter-Agent Handover Trace
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {swarmResult.swarm_timeline?.map((step: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted/40 rounded-lg border space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="font-mono text-[10px]">{step.agent_id}</Badge>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">{step.status}</Badge>
                          </div>
                          <div className="font-semibold text-xs">{step.agent_name}</div>
                          <div className="text-[11px] text-muted-foreground">{step.role}</div>
                          <div className="text-[10px] text-purple-600 font-mono flex items-center gap-1">
                            <ArrowRight size={10} /> Handed to {step.handover_target}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Masterplan Markdown */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileCheck size={13} className="text-purple-500" /> Final Unified Financial Masterplan
                    </h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line bg-muted/20 p-5 rounded-lg border">
                      {swarmResult.final_consensus_report}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgenticIntelligence;
