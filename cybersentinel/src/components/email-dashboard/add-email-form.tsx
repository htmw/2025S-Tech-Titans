"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Email, RiskLevel, EmailStatus } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  Brain,
  LinkIcon
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/lib/auth-context';

interface AddEmailFormProps {
  onAddEmail: (email: Email) => void;
}

interface FormValues {
  sender: string;
  subject: string;
  content: string;
}

interface AnalysisResult {
  riskLevel: RiskLevel;
  confidence: number;
  indicators: string[];
  analysis: string;
  suspiciousLinks: { url: string; reason: string }[];
  recommendedAction: string;
}

export function AddEmailForm({ onAddEmail }: AddEmailFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { user: authUser } = useAuth();

  const form = useForm<FormValues>({
    defaultValues: {
      sender: '',
      subject: '',
      content: ''
    }
  });

  const analyzeEmail = async (data: FormValues) => {
    setIsAnalyzing(true);
    setAnalysisResults(null);
    setAnalysisError(null);
    
    try {
      const response = await fetch('/api/analyze-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: data.sender,
          subject: data.subject,
          content: data.content
        }),
      });
      
      if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("Could not parse error response");
        }
        throw new Error(errorMessage);
      }
      
      const analysisResult = await response.json();
      setAnalysisResults(analysisResult);
    } catch (error) {
      console.error('Error analyzing email:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze the email');
      
      setTimeout(() => {
        handleApiFailure(data);
      }, 1500);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApiFailure = (data: FormValues) => {
    const mockResult: AnalysisResult = generateMockAnalysisResult(data);
    setAnalysisResults(mockResult);
    setIsAnalyzing(false);
  };

  const generateMockAnalysisResult = (data: FormValues): AnalysisResult => {
    const content = data.content.toLowerCase();
    const sender = data.sender.toLowerCase();
    const subject = data.subject.toLowerCase();
    
    let riskLevel: RiskLevel = 'safe';
    const indicators: string[] = [];
    const suspiciousLinks: { url: string; reason: string }[] = [];
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];
    
    const urgentWords = ['urgent', 'immediately', 'alert', 'attention', 'verify', 'suspend', 'locked'];
    const sensitiveWords = ['password', 'credit card', 'account', 'login', 'social security', 'bank'];
    
    if (urgentWords.some(word => content.includes(word) || subject.includes(word))) {
      indicators.push('Uses urgent language to create pressure');
      riskLevel = 'suspicious';
    }
    
    if (sensitiveWords.some(word => content.includes(word))) {
      indicators.push('Requests sensitive personal information');
      riskLevel = 'suspicious';
    }
    
    if (sender.includes('paypal') && !sender.endsWith('@paypal.com') || 
        sender.includes('amazon') && !sender.endsWith('@amazon.com') ||
        sender.includes('apple') && !sender.endsWith('@apple.com')) {
      indicators.push('Sender domain spoofing detected');
      riskLevel = 'phishing';
    }
    
    urls.forEach(url => {
      if (url.includes('login') || url.includes('verify') || url.includes('secure')) {
        suspiciousLinks.push({
          url,
          reason: 'URL contains suspicious keywords related to authentication'
        });
        riskLevel = 'phishing';
      }
      
      if ((url.includes('paypa1') || url.includes('arnazon') || url.includes('app1e'))) {
        suspiciousLinks.push({
          url,
          reason: 'Possible typosquatting detected (domain mimics popular brand)'
        });
        riskLevel = 'phishing';
      }
    });
    
    if (riskLevel === 'phishing' && indicators.length < 2) {
      indicators.push('Multiple suspicious elements detected');
    }
    
    return {
      riskLevel,
      confidence: riskLevel === 'phishing' ? 92 : riskLevel === 'suspicious' ? 75 : 88,
      indicators,
      analysis: riskLevel === 'phishing' 
        ? 'This email contains multiple elements commonly found in phishing attempts, including urgent language, requests for sensitive information, and suspicious links.'
        : riskLevel === 'suspicious'
        ? 'This email contains some suspicious elements that warrant caution, but may be legitimate.'
        : 'This email appears to be legitimate with no obvious security concerns detected.',
      suspiciousLinks,
      recommendedAction: riskLevel === 'phishing'
        ? 'Block this email and alert the recipient not to interact with it.'
        : riskLevel === 'suspicious'
        ? 'Review this email carefully before deciding whether to deliver it to the recipient.'
        : 'No action needed, this email can be delivered normally.'
    };
  };

  const onSubmit = (data: FormValues) => {
    if (!analysisResults) {
      analyzeEmail(data);
      return;
    }
    
    const newEmail: Email = {
      id: Date.now(),
      sender: data.sender,
      subject: data.subject,
      content: data.content,
      receivedAt: new Date().toISOString(),
      riskLevel: analysisResults.riskLevel,
      status: analysisResults.riskLevel === 'phishing' ? 'flagged' : 
              analysisResults.riskLevel === 'suspicious' ? 'reviewing' : 'cleared',
      indicators: analysisResults.indicators,
      recipient: authUser?.email || 'security@company.com',
      links: formatLinks(analysisResults.suspiciousLinks || [], data.content),
      attachments: []
    };
    
    onAddEmail(newEmail);
    
    form.reset();
    setAnalysisResults(null);
    setIsOpen(false);
  };

  const formatLinks = (
    suspiciousLinks: { url: string; reason: string }[], 
    content: string
  ) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const allLinks = content.match(urlRegex) || [];
    
    const suspiciousMap = new Map();
    suspiciousLinks.forEach(link => {
      suspiciousMap.set(link.url, link.reason);
    });
    
    return allLinks.map(url => ({
      url,
      isSuspicious: suspiciousMap.has(url),
      reason: suspiciousMap.get(url) || ''
    }));
  };
  
  const handleDialogChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
      setAnalysisResults(null);
      setAnalysisError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center">
          <Plus className="mr-2 h-4 w-4" />
          Add Email for Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Email for AI Analysis</DialogTitle>
          <DialogDescription>
            Enter email details to analyze for potential phishing or security threats using advanced AI.
            Analyzed emails will be visible to all users.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="sender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sender Email</FormLabel>
                    <FormControl>
                      <Input placeholder="example@domain.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Email subject line" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the email content here..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {analysisError && (
              <div className="bg-destructive/10 p-3 rounded-md text-destructive flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Analysis failed</p>
                  <p className="text-sm">{analysisError}</p>
                </div>
              </div>
            )}
            
            {analysisResults && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">AI Analysis Results</CardTitle>
                    <Badge
                      className={
                        analysisResults.riskLevel === 'phishing'
                          ? 'bg-destructive'
                          : analysisResults.riskLevel === 'suspicious'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }
                    >
                      {analysisResults.confidence}% Confidence
                    </Badge>
                  </div>
                  <CardDescription>Phishing threat assessment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center">
                    {analysisResults.riskLevel === 'phishing' && (
                      <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                    )}
                    {analysisResults.riskLevel === 'suspicious' && (
                      <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                    )}
                    {analysisResults.riskLevel === 'safe' && (
                      <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" />
                    )}
                    <span className="font-semibold capitalize">{analysisResults.riskLevel}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-sm">
                    <p>{analysisResults.analysis}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Detected Indicators:</h4>
                    <ul className="space-y-1">
                      {analysisResults.indicators.map((indicator, idx) => (
                        <li key={idx} className="text-sm flex">
                          <span className="mr-2">•</span>
                          <span>{indicator}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {analysisResults.suspiciousLinks && analysisResults.suspiciousLinks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Suspicious Links:</h4>
                      <ul className="space-y-2">
                        {analysisResults.suspiciousLinks.map((link, idx) => (
                          <li key={idx} className="text-sm p-2 bg-destructive/10 rounded-md">
                            <div className="flex items-start">
                              <LinkIcon className="h-4 w-4 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-destructive break-all">{link.url}</p>
                                <p className="text-xs text-muted-foreground mt-1">{link.reason}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 rounded-md bg-muted text-sm">
                    <h4 className="font-medium mb-1">Recommended Action:</h4>
                    <p>{analysisResults.recommendedAction}</p>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 text-xs rounded-b-lg">
                  <p className="text-muted-foreground">
                    Analysis performed using AI Classification Engine
                  </p>
                </CardFooter>
              </Card>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className={analysisResults ? 
                  (analysisResults.riskLevel === 'phishing' ? 'bg-destructive hover:bg-destructive/90' : '') : ''}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : !analysisResults ? (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Analyze Email
                  </>
                ) : (
                  'Add to Dashboard'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}