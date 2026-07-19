import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Bot, 
  Workflow, 
  Cpu, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  Play, 
  FileCode,
  Terminal,
  Server,
  Layers,
  Download
} from 'lucide-react';
import { aiApi } from '@/services/api';
import { toast } from 'sonner';

const SmartAdvisor: React.FC = () => {
  const [config, setConfig] = useState<{ groqConfigured: boolean; geminiConfigured: boolean; openaiConfigured: boolean }>({
    groqConfigured: false,
    geminiConfigured: false,
    openaiConfigured: false
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Advisor Chat State
  const [advisorPrompt, setAdvisorPrompt] = useState('How can I start building an emergency fund with a tight monthly budget?');
  const [advisorResult, setAdvisorResult] = useState<any>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // Insights Chain State
  const [insightsOverview, setInsightsOverview] = useState(
    'Monthly Income: $3,200. Expenses: Rent $1,200, Food $400, Utilities $250, Subscriptions $100, Dining out $350. Goal: Save $500/month for a vacation.'
  );
  const [insightsResult, setInsightsResult] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Budget Planner Agent State
  const [budgetTask, setBudgetTask] = useState(
    'Analyze a monthly budget of $4,500 using the 50/30/20 rule, and calculate what the total savings grow to in 2 years at 6% compound interest compounded monthly.'
  );
  const [budgetResult, setBudgetResult] = useState<any>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);

  // Document Analyzer State
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docQuery, setDocQuery] = useState('What are the primary rules for smart budgeting and tracking expenses?');
  const [docResult, setDocResult] = useState<any>(null);
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await aiApi.configCheck();
      setConfig(res.data);
    } catch (err) {
      console.error('Failed to fetch AI configuration:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleRunAdvisorChat = async () => {
    if (!advisorPrompt.trim()) {
      toast.error('Please enter a query.');
      return;
    }
    try {
      setAdvisorLoading(true);
      setAdvisorResult(null);
      const res = await aiApi.runAdvisorChat(advisorPrompt);
      if (res.data.error) {
        toast.error(res.data.message || 'Error occurred');
        setAdvisorResult(res.data);
      } else {
        setAdvisorResult(res.data);
        toast.success('Advisor query completed!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.details || err.message || 'Execution failed');
    } finally {
      setAdvisorLoading(false);
    }
  };

  const handleRunInsightsChain = async () => {
    if (!insightsOverview.trim()) {
      toast.error('Please provide a financial overview.');
      return;
    }
    try {
      setInsightsLoading(true);
      setInsightsResult(null);
      const res = await aiApi.runInsightsChain(insightsOverview);
      if (res.data.error) {
        toast.error(res.data.message || 'Error occurred');
        setInsightsResult(res.data);
      } else {
        setInsightsResult(res.data);
        toast.success('Insights generated successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.details || err.message || 'Execution failed');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleRunBudgetAgent = async () => {
    if (!budgetTask.trim()) {
      toast.error('Please describe a task.');
      return;
    }
    try {
      setBudgetLoading(true);
      setBudgetResult(null);
      const res = await aiApi.runBudgetAgent(budgetTask);
      if (res.data.error) {
        toast.error(res.data.message || 'Error occurred');
        setBudgetResult(res.data);
      } else {
        setBudgetResult(res.data);
        toast.success('AI budget planning complete!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.details || err.message || 'Execution failed');
    } finally {
      setBudgetLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' && ext !== 'txt') {
        toast.error('Only .pdf and .txt files are supported.');
        setDocFile(null);
        e.target.value = '';
        return;
      }
      setDocFile(selectedFile);
    }
  };

  const handleRunDocAnalyzer = async () => {
    if (!docFile) {
      toast.error('Please upload a document file (.pdf or .txt).');
      return;
    }
    if (!docQuery.trim()) {
      toast.error('Please enter a question.');
      return;
    }

    try {
      setDocLoading(true);
      setDocResult(null);
      
      const formData = new FormData();
      formData.append('document', docFile);
      formData.append('query', docQuery);

      const res = await aiApi.runDocAnalyzer(formData);
      if (res.data.error) {
        toast.error(res.data.message || 'Error occurred');
        setDocResult(res.data);
      } else {
        setDocResult(res.data);
        toast.success('Document analysis completed!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.details || err.message || 'Execution failed');
    } finally {
      setDocLoading(false);
    }
  };

  const hasApiKey = config.groqConfigured || config.geminiConfigured || config.openaiConfigured;

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card border rounded-lg p-6 shadow-sm gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary">Smart Advisor</Badge>
            <span className="text-xs text-muted-foreground font-medium">Personal Finance Copilot</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 font-sans">Smart Advisor</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Optimize your budget and accelerate savings. Consult the AI advisor, generate instant insights, calculate compounding models, and audit financial records.
          </p>
        </div>
        
        {/* API Status Panel */}
        <div className="flex flex-col gap-2 bg-muted/40 p-3 rounded-lg border text-xs min-w-[220px]">
          <div className="font-semibold flex items-center gap-1.5 text-muted-foreground">
            <Server size={14} /> System Integration
          </div>
          {loadingConfig ? (
            <div className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Connecting...</div>
          ) : (
            <div className="space-y-1 mt-1">
              <div className="flex justify-between items-center">
                <span>Groq API Key:</span>
                {config.groqConfigured ? (
                  <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px]">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5 text-[10px]">Inactive</Badge>
                )}
              </div>
              <div className="flex justify-between items-center text-muted-foreground/70">
                <span>Gemini Core:</span>
                {config.geminiConfigured ? (
                  <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] scale-90">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5 text-[10px] scale-90">Inactive</Badge>
                )}
              </div>
              <div className="flex justify-between items-center text-muted-foreground/70">
                <span>GPT Engine:</span>
                {config.openaiConfigured ? (
                  <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] scale-90">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5 text-[10px] scale-90">Inactive</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warning Alert if Keys Missing */}
      {!loadingConfig && !hasApiKey && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Groq API Key Required</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            To enable the Smart Advisor modules, please add your <code className="bg-muted px-1 py-0.5 rounded font-mono">GROQ_API_KEY</code> in the project's root <code className="font-mono">.env</code> file, then restart the backend server.
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Panel Navigation */}
      <Tabs defaultValue="advisor" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted border">
          <TabsTrigger value="advisor" className="py-2.5 flex items-center justify-center gap-1.5 data-[state=active]:bg-background">
            <Brain size={16} />
            <span className="hidden sm:inline">AI Financial Advisor</span>
            <span className="sm:hidden">Advisor</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="py-2.5 flex items-center justify-center gap-1.5 data-[state=active]:bg-background">
            <Workflow size={16} />
            <span className="hidden sm:inline">Insights Generator</span>
            <span className="sm:hidden">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="budget-planner" className="py-2.5 flex items-center justify-center gap-1.5 data-[state=active]:bg-background">
            <Cpu size={16} />
            <span className="hidden sm:inline">AI Budget Planner</span>
            <span className="sm:hidden">Budget Agent</span>
          </TabsTrigger>
          <TabsTrigger value="doc-analyzer" className="py-2.5 flex items-center justify-center gap-1.5 data-[state=active]:bg-background">
            <FileText size={16} />
            <span className="hidden sm:inline">Document Q&A</span>
            <span className="sm:hidden">Doc QA</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Financial Advisor */}
        <TabsContent value="advisor" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Brain className="text-primary" /> AI Financial Advisor
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Ask any budgeting, savings, or investing questions to get tailored advice from the AI model.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">What is on your mind?</label>
                <Textarea 
                  placeholder="Ask a question about personal finance or saving money..." 
                  value={advisorPrompt} 
                  onChange={(e) => setAdvisorPrompt(e.target.value)}
                  className="min-h-[100px] resize-none"
                  disabled={advisorLoading}
                />
              </div>

              {/* Executor Block */}
              <div className="bg-muted/40 border rounded-lg p-3 text-xs flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FileCode size={14} className="text-primary" /> Active Module:
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono">advisor_chat.py</code>
                </span>
                <Button 
                  onClick={handleRunAdvisorChat} 
                  disabled={advisorLoading} 
                  size="sm"
                  className="gap-1.5 shadow-sm font-semibold"
                >
                  {advisorLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Consulting Advisor...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Ask Advisor
                    </>
                  )}
                </Button>
              </div>

              {/* Result Block */}
              {advisorResult && (
                <div className="space-y-2 mt-4 animate-fade-in">
                  <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Terminal size={14} /> Analysis Response
                  </div>
                  
                  {advisorResult.error ? (
                    <div className="bg-destructive/10 border border-destructive/20 rounded p-4 text-xs font-mono text-destructive">
                      {JSON.stringify(advisorResult, null, 2)}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Card className="border border-primary/10 bg-primary/[0.01]">
                        <CardHeader className="py-2.5 border-b bg-muted/30">
                          <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                            <Sparkles size={12} /> Advisor Recommendation
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                          {advisorResult.response}
                        </CardContent>
                      </Card>
                      
                      <details className="group border rounded-lg overflow-hidden bg-muted/20">
                        <summary className="cursor-pointer select-none py-2 px-3 text-xs font-mono text-muted-foreground hover:bg-muted/30 list-none flex justify-between items-center">
                          <span>▸ Inspect Raw JSON Metadata</span>
                          <span className="text-[10px] hidden group-open:inline">Hide</span>
                          <span className="text-[10px] group-open:hidden">Inspect</span>
                        </summary>
                        <pre className="p-3 text-[11px] font-mono border-t bg-muted/40 overflow-x-auto">
                          {JSON.stringify(advisorResult, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Insights Generator */}
        <TabsContent value="insights" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Workflow className="text-primary" /> Smart Insights Generator
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Generate instant breakdowns, specific action items, and personal financial reflection topics.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Provide Your Income & Expenditure Details</label>
                <Textarea 
                  placeholder="Detail your monthly income, fixed costs, variable spending, and savings goals..." 
                  value={insightsOverview} 
                  onChange={(e) => setInsightsOverview(e.target.value)}
                  disabled={insightsLoading}
                  className="min-h-[90px] resize-none"
                />
              </div>

              {/* Executor Block */}
              <div className="bg-muted/40 border rounded-lg p-3 text-xs flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FileCode size={14} className="text-primary" /> Active Module:
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono">insights_chain.py</code>
                </span>
                <Button 
                  onClick={handleRunInsightsChain} 
                  disabled={insightsLoading} 
                  size="sm"
                  className="gap-1.5 shadow-sm font-semibold"
                >
                  {insightsLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating Insights...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Generate Insights
                    </>
                  )}
                </Button>
              </div>

              {/* Timeline Output */}
              {insightsResult && (
                <div className="space-y-4 mt-4 animate-fade-in">
                  <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Layers size={14} /> Analysis Pipelines
                  </div>
                  
                  {insightsResult.error ? (
                    <div className="bg-destructive/10 border border-destructive/20 rounded p-4 text-xs font-mono text-destructive">
                      {JSON.stringify(insightsResult, null, 2)}
                    </div>
                  ) : (
                    <div className="space-y-6 relative pl-6 border-l-2 border-primary/20 mt-2">
                      {insightsResult.steps.map((step: any, idx: number) => (
                        <div key={idx} className="relative space-y-2">
                          <span className="absolute -left-[31px] top-0.5 bg-primary text-primary-foreground font-mono font-bold text-[10px] w-[20px] h-[20px] rounded-full flex items-center justify-center border-4 border-background">
                            {step.step}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold tracking-tight">{step.title}</h4>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-muted">Pipeline {step.step}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 border rounded-lg overflow-hidden bg-card shadow-sm">
                            <div className="md:col-span-2 bg-muted/20 p-3 border-r text-xs space-y-1">
                              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Input Parameters</span>
                              <p className="font-mono text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">{step.prompt}</p>
                            </div>
                            
                            <div className="md:col-span-3 p-3 text-xs leading-relaxed space-y-1">
                              <span className="font-semibold text-primary uppercase tracking-wider text-[9px] flex items-center gap-0.5">
                                <Sparkles size={10} /> Output Analysis
                              </span>
                              <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                {step.output}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <details className="group border rounded-lg overflow-hidden bg-muted/20">
                        <summary className="cursor-pointer select-none py-2 px-3 text-xs font-mono text-muted-foreground hover:bg-muted/30 list-none flex justify-between items-center">
                          <span>▸ Inspect Raw JSON Metadata</span>
                          <span className="text-[10px] hidden group-open:inline">Hide</span>
                          <span className="text-[10px] group-open:hidden">Inspect</span>
                        </summary>
                        <pre className="p-3 text-[11px] font-mono border-t bg-muted/40 overflow-x-auto">
                          {JSON.stringify(insightsResult, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Agent Budget Planner */}
        <TabsContent value="budget-planner" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Cpu className="text-primary" /> AI Agent Budget Planner
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  An intelligent planning engine that coordinates formulas, budgeting guidelines, and compounding interest projections automatically.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Describe your budgeting planning scenario</label>
                <Textarea 
                  placeholder="E.g., Plan a budget recommendation for $4,500 monthly income and calculate the savings growth..." 
                  value={budgetTask} 
                  onChange={(e) => setBudgetTask(e.target.value)}
                  disabled={budgetLoading}
                  className="min-h-[85px] resize-none"
                />
              </div>

              {/* Executor Block */}
              <div className="bg-muted/40 border rounded-lg p-3 text-xs flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FileCode size={14} className="text-primary" /> Active Module:
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono">budget_agent.py</code>
                </span>
                <Button 
                  onClick={handleRunBudgetAgent} 
                  disabled={budgetLoading} 
                  size="sm"
                  className="gap-1.5 shadow-sm font-semibold"
                >
                  {budgetLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Agent Planning...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Launch Planner
                    </>
                  )}
                </Button>
              </div>

              {/* Agent execution log tree */}
              {budgetResult && (
                <div className="space-y-4 mt-4 animate-fade-in">
                  {budgetResult.error ? (
                    <div className="bg-destructive/10 border border-destructive/20 rounded p-4 text-xs font-mono text-destructive">
                      {JSON.stringify(budgetResult, null, 2)}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Plan created by agent */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <Layers size={14} /> 1. Execution Steps Programmed by AI
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {budgetResult.plan.map((step: any, idx: number) => (
                            <Card key={idx} className="border bg-muted/15 shadow-sm">
                              <CardContent className="p-3 text-xs space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <Badge className="text-[9px] py-0 px-1.5">Step {step.step_number}</Badge>
                                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/20 text-primary uppercase font-mono">{step.tool}</Badge>
                                </div>
                                <p className="font-semibold leading-tight text-foreground/80">{step.description}</p>
                                <div className="text-[10px] text-muted-foreground border-t pt-1 font-mono">
                                  Arg: <span className="text-muted-foreground/85 truncate block">{step.tool_input}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Tool logs */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <Terminal size={14} /> 2. Process Logs & Tool Calculations
                        </div>
                        <div className="bg-slate-950 dark:bg-slate-900 border text-slate-200 rounded-lg p-3.5 font-mono text-xs space-y-2.5 overflow-x-auto shadow-inner">
                          {budgetResult.execution.map((log: any, idx: number) => (
                            <div key={idx} className="border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                              <div className="text-emerald-400 flex items-center gap-1.5 text-[11px] font-semibold">
                                <span className="text-slate-500 font-bold">Step {log.step}:</span> 
                                Executing tool '{log.tool}'
                              </div>
                              <div className="text-slate-400 pl-4 mt-0.5">Input: <span className="text-slate-300">{log.input}</span></div>
                              <div className="text-slate-300 pl-4 mt-0.5 flex items-start gap-1">
                                <span className="text-slate-500">Output:</span>
                                <span className="text-cyan-300 whitespace-pre-wrap">{log.output}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Synthesized Response */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <Sparkles size={14} /> 3. Final Synthesized Output
                        </div>
                        <Card className="border border-emerald-500/25 bg-emerald-500/[0.01]">
                          <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                            {budgetResult.final_output}
                          </CardContent>
                        </Card>
                      </div>

                      <details className="group border rounded-lg overflow-hidden bg-muted/20">
                        <summary className="cursor-pointer select-none py-2 px-3 text-xs font-mono text-muted-foreground hover:bg-muted/30 list-none flex justify-between items-center">
                          <span>▸ Inspect Raw JSON Metadata</span>
                          <span className="text-[10px] hidden group-open:inline">Hide</span>
                          <span className="text-[10px] group-open:hidden">Inspect</span>
                        </summary>
                        <pre className="p-3 text-[11px] font-mono border-t bg-muted/40 overflow-x-auto">
                          {JSON.stringify(budgetResult, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Analyzer (RAG) */}
        <TabsContent value="doc-analyzer" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="text-primary" /> Document & Bank Statement Analyzer
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Upload bank statements, policy sheets, or budgeting documents (PDF/TXT) and search context for grounded answers.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File upload */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground block">Upload Reference PDF or TXT Document</label>
                  <div className="border border-dashed rounded-lg p-5 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/30 transition duration-200 relative min-h-[110px]">
                    <Input 
                      type="file" 
                      accept=".pdf,.txt" 
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      disabled={docLoading}
                    />
                    <Download size={24} className="text-muted-foreground mb-1.5" />
                    <span className="text-xs font-semibold text-center leading-normal">
                      {docFile ? docFile.name : "Click to select or drag document here"}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">Supports PDF or TXT up to 10MB</span>
                  </div>
                </div>

                {/* Query Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground block">What question do you have about the document?</label>
                  <Textarea 
                    placeholder="E.g., What are the terms of payment? / Analyze my expenditure items..." 
                    value={docQuery} 
                    onChange={(e) => setDocQuery(e.target.value)}
                    disabled={docLoading}
                    className="min-h-[110px] resize-none"
                  />
                </div>
              </div>

              {/* Executor Block */}
              <div className="bg-muted/40 border rounded-lg p-3 text-xs flex justify-between items-center mt-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FileCode size={14} className="text-primary" /> Active Module:
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono">doc_analyzer.py</code>
                </span>
                <Button 
                  onClick={handleRunDocAnalyzer} 
                  disabled={docLoading || !docFile} 
                  size="sm"
                  className="gap-1.5 shadow-sm font-semibold"
                >
                  {docLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Retrieving Context & Generating...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Analyze Document
                    </>
                  )}
                </Button>
              </div>

              {/* RAG Output Layout */}
              {docResult && (
                <div className="space-y-4 mt-4 animate-fade-in">
                  {docResult.error ? (
                    <div className="bg-destructive/10 border border-destructive/20 rounded p-4 text-xs font-mono text-destructive">
                      {JSON.stringify(docResult, null, 2)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Context chunks column */}
                      <div className="md:col-span-2 space-y-2">
                        <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <Layers size={14} /> Match Results (Retrieved Text Segments)
                        </div>
                        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                          {docResult.retrieved_context_chunks.map((chunk: string, idx: number) => (
                            <div key={idx} className="border p-2.5 rounded bg-muted/30 text-[11px] leading-relaxed relative shadow-sm">
                              <Badge variant="outline" className="text-[9px] py-0 px-1 absolute right-2 top-2">Segment {idx + 1}</Badge>
                              <div className="font-mono text-muted-foreground mt-2.5 whitespace-pre-wrap">{chunk}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Grounded LLM Response column */}
                      <div className="md:col-span-3 space-y-2">
                        <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <Sparkles size={14} /> Grounded Answer Response
                        </div>
                        <Card className="border border-primary/20 bg-primary/[0.01] min-h-[250px] shadow-sm">
                          <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                            {docResult.answer}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Collapsible raw json */}
                      <div className="col-span-1 md:col-span-5">
                        <details className="group border rounded-lg overflow-hidden bg-muted/20">
                          <summary className="cursor-pointer select-none py-2 px-3 text-xs font-mono text-muted-foreground hover:bg-muted/30 list-none flex justify-between items-center">
                            <span>▸ Inspect Raw JSON Metadata</span>
                            <span className="text-[10px] hidden group-open:inline">Hide</span>
                            <span className="text-[10px] group-open:hidden">Inspect</span>
                          </summary>
                          <pre className="p-3 text-[11px] font-mono border-t bg-muted/40 overflow-x-auto">
                            {JSON.stringify(docResult, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartAdvisor;
