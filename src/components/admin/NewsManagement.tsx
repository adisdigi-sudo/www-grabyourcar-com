import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, Newspaper, ExternalLink, Sparkles, Clock } from "lucide-react";
import { format } from "date-fns";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  source: string | null;
  source_url: string | null;
  author: string | null;
  image_url: string | null;
  is_featured: boolean | null;
  status: string;
  published_at: string | null;
  fetched_at: string;
}

export const NewsManagement = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch news
  const { data: news, isLoading, refetch } = useQuery({
    queryKey: ['adminNews', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('ai_news_cache')
        .select('*')
        .order('fetched_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NewsItem[];
    },
  });

  // Fetch new news mutation
  const handleFetchNews = async () => {
    toast.loading('Fetching latest auto news...', { id: 'fetch-news' });
    try {
      const { data, error } = await supabase.functions.invoke('auto-news', {
        body: { action: 'fetch' }
      });
      if (error) throw error;
      toast.success('News fetched successfully!', { id: 'fetch-news' });
      refetch();
    } catch (error) {
      toast.error('Failed to fetch news', { id: 'fetch-news' });
    }
  };

  // Stats
  const stats = {
    total: news?.length || 0,
    active: news?.filter(n => n.status === 'active').length || 0,
    featured: news?.filter(n => n.is_featured).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Auto News</h2>
          <p className="text-muted-foreground">
            Manage auto news and AI-generated content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleFetchNews}>
            <Sparkles className="h-4 w-4 mr-2" />
            Fetch Latest News
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.featured}</div>
            <p className="text-xs text-muted-foreground">Featured</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* News Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fetched</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : news && news.length > 0 ? (
                  news.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-[300px]">
                          <Newspaper className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="line-clamp-2 text-sm">{item.title}</span>
                          {item.is_featured && <Badge variant="secondary">Featured</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.source || 'AI Generated'}
                      </TableCell>
                      <TableCell>
                        <Badge className={item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(item.fetched_at), 'dd MMM, HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.source_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(item.source_url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No news articles found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
