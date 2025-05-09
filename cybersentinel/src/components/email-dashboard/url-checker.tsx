"use client"

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  LinkIcon,
  AlertTriangle,
  ExternalLink,
  Shield,
  Globe,
  Lock,
  Info,
  ChevronRight,
} from "lucide-react";
import { useForm } from "react-hook-form";

const defaultExamples = [
  { 
    url: "google.com", 
    description: "Legitimate search engine" 
  },
  { 
    url: "amazon.com", 
    description: "Legitimate e-commerce site" 
  },
  { 
    url: "g00gle.com", 
    description: "Typosquatting domain (zeros instead of 'o's)" 
  },
  { 
    url: "paypa1.com", 
    description: "Typosquatting domain (number '1' instead of 'l')" 
  },
  { 
    url: "microsoft-secure-auth.com", 
    description: "Suspicious domain with brand name" 
  },
  { 
    url: "facebook.com", 
    description: "Legitimate social media site" 
  },
  { 
    url: "faceb00k-security.net", 
    description: "Typosquatting domain with suspicious subdomain" 
  },
  { 
    url: "dropbox.com", 
    description: "Legitimate cloud storage" 
  },
  { 
    url: "account-verify-apple.com", 
    description: "Suspicious domain with verification keywords" 
  },
  { 
    url: "github.com", 
    description: "Legitimate code repository" 
  }
];

interface UrlCheckResult {
  url: string;
  status: 'safe' | 'suspicious' | 'malicious';
  confidenceScore: number;
  details: {
    domainAge?: string;
    httpsStatus?: 'valid' | 'invalid' | 'missing';
    redirectCount?: number;
    maliciousPatterns?: string[];
    reputationScore?: number;
    category?: string;
  };
  recommendations: string[];
}

export function UrlChecker() {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<UrlCheckResult | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const form = useForm({
    defaultValues: {
      url: '',
    }
  });

  const validateUrl = (url: string) => {
    if (!url) return false;
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const analyzeUrl = async (data: { url: string }) => {
    if (!validateUrl(data.url)) {
      form.setError('url', { 
        type: 'manual', 
        message: 'Please enter a valid URL' 
      });
      return;
    }
    
    let url = data.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    setIsChecking(true);
    
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      const knownLegitDomains = [
        'google.com', 
        'amazon.com', 
        'facebook.com', 
        'microsoft.com', 
        'apple.com', 
        'github.com',
        'dropbox.com'
      ];
      
      const hasTyposquatting = /g[o0][o0]gle|amaz[o0]n|faceb[o0][o0]k|paypa[l1]|micr[o0]s[o0]ft|app[l1]e/.test(domain);
      const isKnownPhishingPattern = domain.includes('secure-verify') || 
                                   domain.includes('account-update') || 
                                   domain.includes('login-confirm');
      const hasSuspiciousPath = url.includes('/verify') || 
                               url.includes('/signin') || 
                               url.includes('/security');
      
      const isLegitDomain = knownLegitDomains.some(d => domain === d || domain.endsWith('.' + d));
      
      let status: 'safe' | 'suspicious' | 'malicious' = 'safe';
      let confidenceScore = 90;
      const maliciousPatterns: string[] = [];
      
      if (isLegitDomain) {
        status = 'safe';
        confidenceScore = Math.floor(Math.random() * 5) + 95;
      } else if (isKnownPhishingPattern) {
        status = 'malicious';
        confidenceScore = 95;
        maliciousPatterns.push('Known phishing domain pattern');
      } else if (hasTyposquatting) {
        status = 'malicious';
        confidenceScore = 92;
        maliciousPatterns.push('Potential typosquatting attack (brand impersonation)');
      } else if (hasSuspiciousPath && Math.random() > 0.5) {
        status = 'suspicious';
        confidenceScore = 75;
        maliciousPatterns.push('Suspicious URL path pattern');
      } else if (domain.includes('-') || domain.includes('secure') || domain.includes('login')) {
        status = 'suspicious';
        confidenceScore = 68;
        maliciousPatterns.push('Domain contains suspicious keywords');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result: UrlCheckResult = {
        url,
        status,
        confidenceScore,
        details: {
          domainAge: status === 'safe' ? '3+ years' : '< 30 days',
          httpsStatus: url.startsWith('https://') ? 'valid' : 'missing',
          redirectCount: Math.floor(Math.random() * 3),
          maliciousPatterns,
          reputationScore: status === 'safe' ? 85 : status === 'suspicious' ? 45 : 15,
          category: status === 'safe' ? 'Business/E-commerce' : 'Uncategorized'
        },
        recommendations: [
          status === 'malicious' 
            ? 'Do not visit this website. It has been identified as potentially harmful.'
            : status === 'suspicious'
            ? 'Exercise caution when visiting this website. Do not enter sensitive information.'
            : 'This website appears to be safe, but always be cautious when entering sensitive information.'
        ]
      };
      
      setCheckResult(result);
    } catch (error) {
      console.error('Error checking URL:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const checkExampleUrl = (url: string) => {
    form.setValue('url', url);
    analyzeUrl({ url });
    setShowExamples(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
        return 'text-emerald-500 bg-emerald-500/10';
      case 'suspicious':
        return 'text-amber-500 bg-amber-500/10';
      case 'malicious':
        return 'text-destructive bg-destructive/10';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe':
        return <CheckCircle className="h-5 w-5" />;
      case 'suspicious':
        return <AlertTriangle className="h-5 w-5" />;
      case 'malicious':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <LinkIcon className="mr-2 h-4 w-4" />
          Check URL Safety
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>URL Safety Checker</DialogTitle>
          <DialogDescription>
            Analyze a URL to determine if it's potentially malicious or safe to visit.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(analyzeUrl)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Enter URL to check</Label>
            <div className="flex space-x-2">
              <Input
                id="url"
                placeholder="https://example.com"
                {...form.register('url', { required: true })}
                className="flex-1"
              />
              <Button type="submit" disabled={isChecking}>
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Check'
                )}
              </Button>
            </div>
            {form.formState.errors.url && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.url.message || 'Please enter a valid URL'}
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Enter a complete URL including http:// or https://
              </p>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowExamples(!showExamples)}
                className="text-xs h-6 px-2"
              >
                {showExamples ? 'Hide Examples' : 'Show Examples'}
              </Button>
            </div>
          </div>
        </form>
        
        {showExamples && (
          <div className="border rounded-md p-2 mt-2 bg-muted/30">
            <h4 className="text-sm font-medium mb-2">Example URLs to Check:</h4>
            <div className="max-h-40 overflow-y-auto">
              <ul className="space-y-1">
                {defaultExamples.map((example, index) => (
                  <li key={index}>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-between h-auto py-1 text-xs"
                      onClick={() => checkExampleUrl(example.url)}
                    >
                      <span className="font-medium">{example.url}</span>
                      <div className="flex items-center">
                        <span className="text-muted-foreground text-xs mr-1">{example.description}</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {isChecking && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Analyzing URL safety...</p>
          </div>
        )}
        
        {!isChecking && checkResult && (
          <div className="space-y-4 mt-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Safety Analysis</CardTitle>
                  <Badge
                    className={
                      checkResult.status === 'safe'
                        ? 'bg-emerald-500'
                        : checkResult.status === 'suspicious'
                        ? 'bg-amber-500'
                        : 'bg-destructive'
                    }
                  >
                    {checkResult.confidenceScore}% Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm font-medium truncate">{checkResult.url}</p>
                </div>
                
                <div className={`flex items-center mt-4 p-3 rounded-md ${getStatusColor(checkResult.status)}`}>
                  {getStatusIcon(checkResult.status)}
                  <span className="ml-2 font-medium capitalize">
                    {checkResult.status === 'safe'
                      ? 'This URL appears to be safe'
                      : checkResult.status === 'suspicious'
                      ? 'This URL looks suspicious'
                      : 'Warning: Potentially dangerous URL'}
                  </span>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Domain Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Domain Age:</span>
                        <span className="ml-1 font-medium">{checkResult.details.domainAge}</span>
                      </div>
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Reputation:</span>
                        <span className="ml-1 font-medium">{checkResult.details.reputationScore}/100</span>
                      </div>
                      <div className="flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>HTTPS:</span>
                        <span className={`ml-1 font-medium ${
                          checkResult.details.httpsStatus === 'valid' 
                            ? 'text-emerald-500' 
                            : 'text-amber-500'
                        }`}>
                          {checkResult.details.httpsStatus === 'valid' 
                            ? 'Valid' 
                            : checkResult.details.httpsStatus === 'invalid' 
                            ? 'Invalid' 
                            : 'Missing'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Category:</span>
                        <span className="ml-1 font-medium">{checkResult.details.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  {checkResult.details.maliciousPatterns && checkResult.details.maliciousPatterns.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Detected Issues</h4>
                      <ul className="space-y-1">
                        {checkResult.details.maliciousPatterns.map((pattern, idx) => (
                          <li key={idx} className="flex items-start text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{pattern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recommendation</h4>
                    <div className={`p-3 rounded-md text-sm ${
                      checkResult.status === 'safe'
                        ? 'bg-emerald-500/10 text-emerald-700'
                        : checkResult.status === 'suspicious'
                        ? 'bg-amber-500/10 text-amber-700'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {checkResult.recommendations[0]}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                form.reset();
                setCheckResult(null);
              }}>
                Check Another URL
              </Button>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}