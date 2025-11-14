"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, TrendingUp, Calendar, X, Share2, Check } from "lucide-react"
import { useQueryState } from "nuqs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, CartesianGrid, LineChart, Line } from "recharts"

interface SwearEntry {
  id: string
  word: string
  timestamp: number
  date: string
}

interface SwearStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  byWord: Record<string, number>
  byDate: Record<string, number>
}

export default function Home() {
  const [swearWord, setSwearWord] = useState("")
  const [entries, setEntries] = useState<SwearEntry[]>([])
  const [copied, setCopied] = useState(false)
  const initialized = useRef(false)
  const [dataParam, setDataParam] = useQueryState("data", {
    defaultValue: "",
    parse: (value) => {
      try {
        if (!value) return ""
        const decoded = decodeURIComponent(value)
        const decompressed = atob(decoded)
        return decompressed
      } catch {
        return ""
      }
    },
    serialize: (value) => {
      if (!value) return ""
      try {
        const compressed = btoa(value)
        return encodeURIComponent(compressed)
      } catch {
        return ""
      }
    },
  })
  const [stats, setStats] = useState<SwearStats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    byWord: {},
    byDate: {},
  })

  function updateEntries(newEntries: SwearEntry[]) {
    setEntries(newEntries)
    calculateStats(newEntries)
    
    const jsonString = JSON.stringify(newEntries)
    setDataParam(jsonString)
    
    localStorage.setItem("swearjar-entries", jsonString)
  }

  useEffect(() => {
    if (initialized.current) return
    
    let loadedEntries: SwearEntry[] = []
    
    if (dataParam) {
      try {
        loadedEntries = JSON.parse(dataParam) as SwearEntry[]
        initialized.current = true
      } catch {
        loadedEntries = []
      }
    } else {
      const stored = localStorage.getItem("swearjar-entries")
      if (stored) {
        try {
          loadedEntries = JSON.parse(stored) as SwearEntry[]
          const jsonString = JSON.stringify(loadedEntries)
          setDataParam(jsonString)
          initialized.current = true
        } catch {
          loadedEntries = []
        }
      }
    }
    
    if (loadedEntries.length > 0) {
      setEntries(loadedEntries)
      calculateStats(loadedEntries)
    } else {
      initialized.current = true
    }
  }, [dataParam, setDataParam])

  function calculateStats(entriesList: SwearEntry[]) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const newStats: SwearStats = {
      total: entriesList.length,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      byWord: {},
      byDate: {},
    }

    entriesList.forEach((entry) => {
      const entryDate = new Date(entry.timestamp)
      
      if (entryDate >= today) newStats.today++
      if (entryDate >= weekAgo) newStats.thisWeek++
      if (entryDate >= monthAgo) newStats.thisMonth++

      newStats.byWord[entry.word] = (newStats.byWord[entry.word] || 0) + 1
      
      const dateKey = entry.date
      newStats.byDate[dateKey] = (newStats.byDate[dateKey] || 0) + 1
    })

    setStats(newStats)
  }

  function addSwear() {
    if (!swearWord.trim()) return

    const newEntry: SwearEntry = {
      id: Date.now().toString(),
      word: swearWord.trim().toLowerCase(),
      timestamp: Date.now(),
      date: new Date().toISOString().split("T")[0],
    }

    const updated = [newEntry, ...entries]
    updateEntries(updated)
    setSwearWord("")
  }

  function deleteEntry(id: string) {
    const updated = entries.filter((e) => e.id !== id)
    updateEntries(updated)
  }

  function clearAll() {
    if (confirm("Are you sure you want to clear all entries?")) {
      updateEntries([])
      localStorage.removeItem("swearjar-entries")
    }
  }

  function copyUrl() {
    const url = window.location.href
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch(() => {
          fallbackCopyTextToClipboard(url)
        })
    } else {
      fallbackCopyTextToClipboard(url)
    }
  }

  function fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    textArea.style.top = "-999999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      const successful = document.execCommand("copy")
      if (successful) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        promptCopyFallback(text)
      }
    } catch (err) {
      promptCopyFallback(text)
    } finally {
      document.body.removeChild(textArea)
    }
  }

  function promptCopyFallback(text: string) {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "50%"
    textArea.style.top = "50%"
    textArea.style.transform = "translate(-50%, -50%)"
    textArea.style.zIndex = "9999"
    textArea.style.padding = "10px"
    textArea.style.border = "2px solid"
    textArea.style.borderRadius = "4px"
    document.body.appendChild(textArea)
    textArea.select()
    
    alert("Please copy the URL manually:\n\n" + text)
    document.body.removeChild(textArea)
  }

  const topWords = Object.entries(stats.byWord)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }))

  const chartData = Object.entries(stats.byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    }))

  const barChartConfig = {
    count: {
      label: "Swears",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  const lineChartConfig = {
    count: {
      label: "Swears",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Swear Jar</h1>
            <p className="text-muted-foreground">
              Track your swearing habits and see your progress over time
            </p>
          </div>
          {entries.length > 0 && (
            <Button variant="outline" onClick={copyUrl}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share URL
                </>
              )}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Swear</CardTitle>
            <CardDescription>Enter a word to add to your swear jar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="swear-input">Swear Word</Label>
                <Input
                  id="swear-input"
                  placeholder="Enter a word..."
                  value={swearWord}
                  onChange={(e) => setSwearWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSwear()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addSwear} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time swears</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground">Swears today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Words</CardTitle>
              <CardDescription>Most frequently used words</CardDescription>
            </CardHeader>
            <CardContent>
              {topWords.length > 0 ? (
                <ChartContainer config={barChartConfig}>
                  <BarChart accessibilityLayer data={topWords}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="word"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar dataKey="count" fill="var(--color-count)" radius={8} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last 7 Days</CardTitle>
              <CardDescription>Daily swear count trend</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer config={lineChartConfig}>
                  <LineChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-count)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Entries</CardTitle>
                <CardDescription>Your latest swear jar entries</CardDescription>
              </div>
              {entries.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {entries.length > 0 ? (
              <div className="space-y-2">
                {entries.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{entry.word}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {entries.length > 10 && (
                  <p className="pt-2 text-center text-sm text-muted-foreground">
                    Showing 10 of {entries.length} entries
                  </p>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No entries yet. Start tracking your swears!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
