"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, TrendingUp, Calendar, X, Share2, Check, LogOut, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
  const router = useRouter()
  const [swearWord, setSwearWord] = useState("")
  const [entries, setEntries] = useState<SwearEntry[]>([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [stats, setStats] = useState<SwearStats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    byWord: {},
    byDate: {},
  })

  useEffect(() => {
    checkLoginAndLoadEntries()
  }, [])

  async function checkLoginAndLoadEntries() {
    try {
      const loginResponse = await fetch("/api/login")
      const loginData = await loginResponse.json()

      if (!loginData.username) {
        router.push("/login")
        return
      }

      setUsername(loginData.username)
      await loadEntries()
    } catch (error) {
      console.error("Error checking login:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  async function loadEntries() {
    try {
      const response = await fetch("/api/entries")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
          return
        }
        throw new Error("Failed to load entries")
      }

      const data = await response.json()
      setEntries(data.entries || [])
      calculateStats(data.entries || [])
    } catch (error) {
      console.error("Error loading entries:", error)
    }
  }

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

  async function addSwear() {
    if (!swearWord.trim()) return

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word: swearWord.trim() }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
          return
        }
        throw new Error("Failed to add entry")
      }

      const data = await response.json()
      setEntries(data.entries)
      calculateStats(data.entries)
      setSwearWord("")
    } catch (error) {
      console.error("Error adding entry:", error)
      alert("Failed to add entry. Please try again.")
    }
  }

  async function deleteEntry(id: string) {
    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
          return
        }
        throw new Error("Failed to delete entry")
      }

      const data = await response.json()
      setEntries(data.entries)
      calculateStats(data.entries)
    } catch (error) {
      console.error("Error deleting entry:", error)
      alert("Failed to delete entry. Please try again.")
    }
  }

  async function clearAll() {
    if (!confirm("Are you sure you want to clear all entries?")) return

    try {
      const response = await fetch("/api/entries", {
        method: "DELETE",
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
          return
        }
        throw new Error("Failed to clear entries")
      }

      setEntries([])
      calculateStats([])
    } catch (error) {
      console.error("Error clearing entries:", error)
      alert("Failed to clear entries. Please try again.")
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

  async function handleLogout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/login");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Swear Jar</h1>
            <p className="text-muted-foreground">
              Track your swearing habits and see your progress over time
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight">Swear Jar</h1>
              {username && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {username}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Track your swearing habits and see your progress over time
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
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
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
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
