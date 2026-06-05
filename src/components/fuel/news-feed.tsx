'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Newspaper,
  Bookmark,
  BookmarkCheck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Lightbulb,
  Globe,
  ShieldCheck,
  Zap,
  ExternalLink,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useFuelStore } from '@/store/fuel-store';

type NewsCategory = 'epra' | 'market' | 'industry' | 'tips';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  date: string;
  summary: string;
  category: NewsCategory;
  bookmarked: boolean;
}

const CRUDE_DATA = [
  { date: 'Feb 24', price: 76.2 },
  { date: 'Feb 25', price: 77.1 },
  { date: 'Feb 26', price: 75.8 },
  { date: 'Feb 27', price: 78.3 },
  { date: 'Feb 28', price: 79.1 },
  { date: 'Mar 01', price: 80.5 },
  { date: 'Mar 02', price: 78.9 },
  { date: 'Mar 03', price: 79.6 },
  { date: 'Mar 04', price: 81.2 },
  { date: 'Mar 05', price: 80.1 },
];

const TIPS = [
  'Regularly calibrate your pumps to avoid EPRA penalties.',
  'Track dipstick readings before and after every delivery.',
  'Keep M-PESA float above Ksh 50,000 during peak hours.',
  'Maintain a 5% fuel buffer stock for emergency demand.',
  'Review shift variances daily — any gap > 1% needs investigation.',
  'Display EPRA-compliant price boards at pump entrance.',
  'Train attendants on proper nozzle handling to reduce spillage.',
  'Schedule tank cleaning every 6 months per KEBS standards.',
];

const CATEGORY_CONFIG: Record<NewsCategory, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  epra: { label: 'EPRA Updates', color: 'text-green-400', bg: 'bg-green-500/20', icon: <ShieldCheck className="size-3.5" /> },
  market: { label: 'Market Prices', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: <TrendingUp className="size-3.5" /> },
  industry: { label: 'Industry News', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: <Globe className="size-3.5" /> },
  tips: { label: 'Station Tips', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: <Lightbulb className="size-3.5" /> },
};

const chartConfig = {
  price: { label: 'Brent Crude ($)', color: '#f59e0b' },
};

export function NewsFeed() {
  const token = useAuthStore((s) => s.token);
  const currentStation = useStationStore((s) => s.currentStation);
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'all'>('all');
  const [tipIndex, setTipIndex] = useState(0);

  // ─── Fetch news from settings or show empty state ────────────────────────

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try to fetch news articles stored as settings
      if (token && currentStation?.id) {
        const res = await fetch(`/api/settings?stationId=${currentStation.id}&category=news`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.data?.settings && data.data.settings.length > 0) {
          const mapped: NewsArticle[] = data.data.settings.map((s: { id: string; key: string; value: string; createdAt?: string }) => {
            let parsed: Record<string, unknown> = {};
            try { parsed = JSON.parse(s.value); } catch { /* not JSON */ }
            return {
              id: s.id,
              title: (parsed.title as string) || s.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
              source: (parsed.source as string) || 'FuelPro',
              date: (parsed.date as string) || (s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
              summary: (parsed.summary as string) || s.value,
              category: ((parsed.category as string) || 'industry') as NewsCategory,
              bookmarked: false,
            };
          });
          setArticles(mapped);
        } else {
          setArticles([]);
        }
      } else {
        setArticles([]);
      }
    } catch {
      setError('Failed to load news. Please try again.');
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentStation]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const filteredArticles = useMemo(() => {
    if (activeCategory === 'all') return articles;
    return articles.filter((a) => a.category === activeCategory);
  }, [articles, activeCategory]);

  const bookmarkedCount = articles.filter((a) => a.bookmarked).length;

  const toggleBookmark = (id: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, bookmarked: !a.bookmarked } : a))
    );
  };

  const nextTip = () => {
    setTipIndex((prev) => (prev + 1) % TIPS.length);
  };

  return (
    <div className="space-y-6">
      {/* ── Market Watch ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-amber-400" />
              Crude Oil Price Trend
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Brent Crude (USD/barrel) - Last 10 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-48 w-full">
              <AreaChart data={CRUDE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis domain={[74, 84]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="price" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Exchange Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="size-5 text-green-400" />
                <div>
                  <div className="text-xl font-bold">129.50</div>
                  <div className="text-xs text-green-400 flex items-center gap-1">
                    <TrendingUp className="size-3" />
                    KES/USD
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Current Pump Prices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">PMS</span>
                <span className="text-sm font-semibold text-amber-400">Ksh {pmsPrice.toFixed(2)}/L</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">AGO</span>
                <span className="text-sm font-semibold text-amber-400">Ksh {agoPrice.toFixed(2)}/L</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1">
                <BookmarkCheck className="size-3" />
                Bookmarked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{bookmarkedCount}</div>
              <div className="text-xs text-slate-400">Saved articles</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Quick Tips ──────────────────────────────────────────────────── */}
      <Card className="bg-amber-500/10 border-amber-500/30 text-white">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Lightbulb className="size-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Station Tip #{tipIndex + 1}</h4>
              <p className="text-sm text-slate-300">{TIPS[tipIndex]}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={nextTip} className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 shrink-0">
              <Zap className="size-3.5 mr-1" />
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── News Feed ──────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Newspaper className="size-4 text-amber-400" />
              News & Updates
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white" onClick={fetchNews}>
              <RefreshCw className="size-3 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as NewsCategory | 'all')}>
            <TabsList className="bg-slate-700/50 mb-4">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">All</TabsTrigger>
              <TabsTrigger value="epra" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">EPRA</TabsTrigger>
              <TabsTrigger value="market" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">Market</TabsTrigger>
              <TabsTrigger value="industry" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">Industry</TabsTrigger>
              <TabsTrigger value="tips" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">Tips</TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 text-amber-400 animate-spin" />
                <span className="ml-2 text-slate-400 text-sm">Loading news...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <TrendingDown className="size-8 text-red-400 mx-auto mb-2" />
                <div className="text-sm text-red-300">{error}</div>
                <Button variant="outline" size="sm" className="mt-3 border-slate-600 text-slate-300" onClick={fetchNews}>
                  <RefreshCw className="size-3 mr-1" /> Retry
                </Button>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <Newspaper className="size-12 text-slate-600 mx-auto mb-3" />
                <div className="font-medium text-slate-400">No news articles yet</div>
                <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  News articles will appear here when added through the settings panel. 
                  Stay tuned for EPRA updates, market prices, and industry news from Kenya and East Africa.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArticles.map((article) => {
                  const catConfig = CATEGORY_CONFIG[article.category];
                  return (
                    <div
                      key={article.id}
                      className="p-4 rounded-xl border bg-slate-700/20 border-slate-700/50 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={`${catConfig.bg} ${catConfig.color} border border-current/20 text-[10px] px-1.5 py-0 flex items-center gap-1`}>
                          {catConfig.icon}
                          {catConfig.label}
                        </Badge>
                        <button
                          onClick={() => toggleBookmark(article.id)}
                          className="text-slate-500 hover:text-amber-400 transition-colors"
                        >
                          {article.bookmarked ? <BookmarkCheck className="size-4 text-amber-400" /> : <Bookmark className="size-4" />}
                        </button>
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1.5 leading-snug">{article.title}</h3>
                      <p className="text-xs text-slate-400 mb-3 line-clamp-2">{article.summary}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="size-3" />
                          {article.date} · {article.source}
                        </div>
                        <button className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5">
                          Read <ExternalLink className="size-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
