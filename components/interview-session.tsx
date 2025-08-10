"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, Mic, MicOff, Eye, Clock, AlertTriangle, CheckCircle, Code, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InterviewChallenge {
  id: string
  type: "coding" | "system_design" | "ml_debugging" | "ethics" | "collaboration"
  title: string
  description: string
  problem_statement: string
  time_limit_minutes: number
  current_phase: number
  total_phases: number
  anti_cheat_elements: string[]
}

interface IntegrityFlag {
  type: "paste_detected" | "tab_switch" | "unusual_timing" | "inconsistent_explanation"
  severity: "low" | "medium" | "high"
  timestamp: Date
  description: string
}

export function InterviewSession() {
  const [challenge, setChallenge] = useState<InterviewChallenge | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [codeInput, setCodeInput] = useState("")
  const [explanation, setExplanation] = useState("")
  const [integrityFlags, setIntegrityFlags] = useState<IntegrityFlag[]>([])
  const [showSurpriseQuestion, setShowSurpriseQuestion] = useState(false)
  const [surpriseQuestion, setSurpriseQuestion] = useState("")
  const [isTabActive, setIsTabActive] = useState(true)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [pasteAttempts, setPasteAttempts] = useState(0)

  const codeInputRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // Mock interview challenge
  useEffect(() => {
    const mockChallenge: InterviewChallenge = {
      id: "session_" + Date.now(),
      type: "coding",
      title: "AI Model Optimization Challenge",
      description: "Optimize a neural network training pipeline for better performance",
      problem_statement: `
        You are given a PyTorch training loop that is running slowly. 
        The model is a ResNet-50 training on ImageNet data.
        
        Phase 1: Identify potential bottlenecks in the current implementation.
        Phase 2: Implement optimizations while explaining your reasoning.
        Phase 3: Handle a surprise requirement that will be revealed.
        
        Current code:
        \`\`\`python
        for epoch in range(num_epochs):
            for batch_idx, (data, target) in enumerate(train_loader):
                optimizer.zero_grad()
                output = model(data)
                loss = criterion(output, target)
                loss.backward()
                optimizer.step()
        \`\`\`
        
        Explain your approach as you code.
      `,
      time_limit_minutes: 45,
      current_phase: 1,
      total_phases: 3,
      anti_cheat_elements: [
        "Progressive revelation",
        "Real-time explanation required",
        "Surprise elements",
        "Code evolution tracking",
      ],
    }

    setChallenge(mockChallenge)
    setTimeRemaining(mockChallenge.time_limit_minutes * 60)
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeRemaining])

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      setIsTabActive(isVisible)

      if (!isVisible) {
        addIntegrityFlag({
          type: "tab_switch",
          severity: "medium",
          timestamp: new Date(),
          description: "Candidate switched away from interview tab",
        })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  // Paste detection
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.target === codeInputRef.current) {
        const pastedText = e.clipboardData?.getData("text") || ""
        if (pastedText.length > 50) {
          // Large paste detected
          setPasteAttempts((prev) => prev + 1)
          addIntegrityFlag({
            type: "paste_detected",
            severity: "high",
            timestamp: new Date(),
            description: `Large code paste detected (${pastedText.length} characters)`,
          })

          toast({
            title: "Paste Detected",
            description: "Large code pastes are flagged for review. Please type your solution.",
            variant: "destructive",
          })
        }
      }
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [toast])

  // Surprise question trigger
  useEffect(() => {
    if (challenge && timeRemaining === Math.floor(challenge.time_limit_minutes * 60 * 0.6)) {
      // Trigger surprise question at 60% time remaining
      setSurpriseQuestion("Quick question: What's the main bottleneck you've identified so far?")
      setShowSurpriseQuestion(true)
    }
  }, [timeRemaining, challenge])

  const addIntegrityFlag = (flag: IntegrityFlag) => {
    setIntegrityFlags((prev) => [...prev, flag])
  }

  const handleCodeChange = (value: string) => {
    setCodeInput(value)
    setLastActivity(Date.now())

    // Detect sudden large changes (potential cheating)
    if (value.length - codeInput.length > 100) {
      addIntegrityFlag({
        type: "unusual_timing",
        severity: "medium",
        timestamp: new Date(),
        description: "Sudden large code addition detected",
      })
    }
  }

  const handleExplanationChange = (value: string) => {
    setExplanation(value)

    // Simple coherence check (in production, this would use AI)
    if (value.length > 50 && codeInput.length < 10) {
      addIntegrityFlag({
        type: "inconsistent_explanation",
        severity: "low",
        timestamp: new Date(),
        description: "Explanation provided without corresponding code",
      })
    }
  }

  const startRecording = () => {
    setIsRecording(true)
    toast({
      title: "Recording Started",
      description: "Your voice explanation is now being recorded.",
    })
  }

  const stopRecording = () => {
    setIsRecording(false)
    toast({
      title: "Recording Stopped",
      description: "Voice recording has been saved.",
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getIntegrityScore = () => {
    const highFlags = integrityFlags.filter((f) => f.severity === "high").length
    const mediumFlags = integrityFlags.filter((f) => f.severity === "medium").length
    const lowFlags = integrityFlags.filter((f) => f.severity === "low").length

    const penalty = highFlags * 0.3 + mediumFlags * 0.15 + lowFlags * 0.05
    return Math.max(0, 1 - penalty)
  }

  if (!challenge) {
    return <div>Loading interview session...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <div>
            <h1 className="text-2xl font-bold">{challenge.title}</h1>
            <p className="text-muted-foreground">
              Phase {challenge.current_phase} of {challenge.total_phases}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={`font-mono text-lg ${timeRemaining < 300 ? "text-red-600" : ""}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <Badge variant={isTabActive ? "default" : "destructive"}>{isTabActive ? "Active" : "Tab Inactive"}</Badge>
            <Badge variant="outline">Integrity: {(getIntegrityScore() * 100).toFixed(0)}%</Badge>
          </div>
        </div>

        {/* Anti-cheat alerts */}
        {integrityFlags.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {integrityFlags.length} integrity flag(s) detected. Your session is being monitored.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Problem Statement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Problem Statement
              </CardTitle>
              <CardDescription>Read carefully - details will be revealed progressively</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded">{challenge.problem_statement}</pre>
              </div>
              <div className="mt-4">
                <Progress value={(challenge.current_phase / challenge.total_phases) * 100} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">
                  Phase {challenge.current_phase} of {challenge.total_phases} complete
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Code Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Your Solution
              </CardTitle>
              <CardDescription>Type your code here - large pastes will be flagged</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                ref={codeInputRef}
                placeholder="Start typing your solution..."
                value={codeInput}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{codeInput.length} characters</span>
                {pasteAttempts > 0 && <span className="text-red-600">{pasteAttempts} paste(s) detected</span>}
              </div>
            </CardContent>
          </Card>

          {/* Voice Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Explain Your Approach
              </CardTitle>
              <CardDescription>Describe your reasoning as you code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  size="sm"
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isRecording ? "Stop Recording" : "Start Voice Recording"}
                </Button>
                <Badge variant={isRecording ? "destructive" : "secondary"}>
                  {isRecording ? "Recording..." : "Not Recording"}
                </Badge>
              </div>

              <Textarea
                placeholder="Type your explanation here..."
                value={explanation}
                onChange={(e) => handleExplanationChange(e.target.value)}
                className="min-h-[200px]"
              />
            </CardContent>
          </Card>

          {/* Integrity Monitor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Session Monitoring
              </CardTitle>
              <CardDescription>Real-time integrity tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Integrity Score</span>
                <Badge variant={getIntegrityScore() > 0.8 ? "default" : "destructive"}>
                  {(getIntegrityScore() * 100).toFixed(0)}%
                </Badge>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Anti-Cheat Elements Active:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {challenge.anti_cheat_elements.map((element, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>{element}</span>
                    </div>
                  ))}
                </div>
              </div>

              {integrityFlags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-red-600">Flags Detected:</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {integrityFlags.slice(-3).map((flag, index) => (
                      <div key={index} className="text-xs p-2 bg-red-50 rounded border-l-2 border-red-200">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {flag.severity}
                          </Badge>
                          <span>{flag.description}</span>
                        </div>
                        <div className="text-gray-500 mt-1">{flag.timestamp.toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <Button variant="outline">
              <Camera className="mr-2 h-4 w-4" />
              Enable Camera
            </Button>
            <Button variant="outline">Request Help</Button>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline">Save Progress</Button>
            <Button>Next Phase</Button>
          </div>
        </div>
      </div>

      {/* Surprise Question Dialog */}
      <Dialog open={showSurpriseQuestion} onOpenChange={setShowSurpriseQuestion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Check-In</DialogTitle>
            <DialogDescription>This is a surprise question to verify your understanding</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">{surpriseQuestion}</p>
            <Textarea placeholder="Your answer..." className="min-h-[100px]" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSurpriseQuestion(false)}>
                Skip
              </Button>
              <Button onClick={() => setShowSurpriseQuestion(false)}>Submit Answer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
